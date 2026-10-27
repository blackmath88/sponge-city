// Street Slice adapter: adaptive-view/0.2 payload → visual state for the educational Street Slice.
//
// Today the Street Slice is driven by `stage = 0..4` and shows/hides hardcoded SVG pieces.
// This adapter is the seam that replaces the stage number with state:
//
//   StateModel + Scenario + EffectResult  →  toStreetSlice(...)  →  what to draw
//
// It is a mapping, not a model: it never calculates an effect, it only reads view.adaptive and
// decides presentation (which segment, which material texture, which flows, which chips light up).
// No SVG coordinates live here either; the renderer owns geometry.

const ROLE = {
  building: "building", sidewalk: "sidewalk", parking: "parking", road: "road", tram: "road",
  vegetation: "green", "rain-garden": "rain-garden", "tree-trench": "tree-trench", "fixed-area": "sidewalk", water: "water"
};

const MECHANISMS = {
  // mechanism: [mode it belongs to, effect ids that light it, levels that count]
  ABSORB: ["rain", ["infiltration_potential"]],
  STORE: ["rain", ["storage_potential"]],
  SLOW: ["rain", ["sewer_load_tendency"]],
  SWEAT: ["heat", ["evapotranspiration_potential"]],
  SHADE: ["heat", ["shade"]],
  COOL: ["heat", ["surface_heating_tendency"]]
};

const pick = result => result ? { value: result.value, state: result.state } : { value: null, state: "not-applicable" };

// Lit = some element reaches the mechanism's "good" level (derived); null = it depends on something unknown.
function mechanismState(effects, effectId, mechanism) {
  const effect = effects?.effects?.[effectId];
  if (!effect || effect.state === "not-applicable") return { lit: false, state: "not-applicable", where: [] };
  if (mechanism === "SHADE") return { lit: effect.state === "derived" ? effect.value !== "low" : null, state: effect.state, where: Object.keys(effect.by_element || {}) };
  const results = Object.entries(effect.by_element || {});
  const good = ({ value }) => mechanism === "COOL" ? value === "low" : value === "medium" || value === "high";
  const where = results.filter(([, result]) => result.state === "derived" && good(result)).map(([id]) => id);
  if (where.length) return { lit: true, state: "derived", where };
  if (results.some(([, result]) => result.state === "unknown")) return { lit: null, state: "unknown", where: [] };
  return { lit: false, state: "derived", where: [] };
}

// SLOW: water is routed through something that holds it before the sewer. Read from the routing graph.
function slowState(state) {
  const storing = new Set(state.elements.filter(element => ["rain-garden", "tree-trench"].includes(element.type) || element.tags?.includes("rain-garden")).map(element => element.id));
  const edges = state.connections.filter(edge => storing.has(edge.to) && edge.mode !== "overflow");
  return { lit: edges.length > 0, state: edges.length ? "derived" : state.routing.state === "unknown" ? "unknown" : "derived", where: edges.map(edge => edge.from) };
}

export function toStreetSlice(adaptive) {
  if (!adaptive) return null;
  const { scenarioState: state, baselineState, scenario, scenarioEffects, baselineEffects, effectDelta } = adaptive;
  const mode = scenario?.rain ? "rain" : scenario?.heat ? "heat" : null;
  const before = new Map(baselineState.elements.map(element => [element.id, JSON.stringify(element)]));
  const changed = element => before.get(element.id) !== JSON.stringify(element);

  const segments = state.elements.filter(element => element.kind === "area").map(element => ({
    element_id: element.id,
    // The 0.1 catalogue marks its rain garden as vegetation tagged "rain-garden" (a typed tag, not a label).
    role: element.tags?.includes("rain-garden") ? "rain-garden" : ROLE[element.type] || "other",
    label: element.label,
    material: element.surface.material?.value ?? null,
    material_state: element.surface.material?.state ?? "unknown",
    surface_class: pick(element.surface.class),
    present: element.presence,
    placement: element.placement ? { surface: pick(element.placement.surface), mode: pick(element.placement.mode) } : null,
    changed: changed(element),
    new: !before.has(element.id)
  }));

  const underground = {
    utilities: pick(state.context.utilities),
    infiltration: pick(state.context.infiltration_capacity),
    groundwater: pick(state.context.groundwater_protection_zone),
    storage: Object.entries(scenarioEffects?.effects?.storage_potential?.by_element || {})
      .filter(([, result]) => result.value === "medium" || result.value === "high")
      .map(([element_id, result]) => ({ element_id, level: result.value }))
  };

  const into = id => {
    const target = state.elements.find(element => element.id === id);
    if (!target) return "unknown";
    if (target.type === "sewer") return "sewer";
    if (target.type === "rain-barrel") return "barrel";
    if (target.kind === "network") return "drain";
    return ["rain-garden", "tree-trench", "vegetation"].includes(target.type) ? "planting" : "surface";
  };
  const routing = {
    state: state.routing.state,
    note: state.routing.note,
    flows: state.connections.map(edge => ({ from: edge.from, to: edge.to, mode: edge.mode, state: edge.state, into: into(edge.to), changed: !baselineState.connections.some(old => old.from === edge.from && old.to === edge.to) }))
  };

  const trees = state.elements.filter(element => element.type === "tree").map(element => ({
    element_id: element.id,
    canopy: pick(element.vegetation?.canopy_area),
    presence: pick(element.presence),
    rooted_in: element.vegetation?.rooted_in ?? null,
    pit: pick(element.vegetation?.pit),
    new: !before.has(element.id)
  }));

  // Building-scale storage at a downpipe. Not underground storage; no volume.
  const rain_barrels = state.elements.filter(element => element.type === "rain-barrel" && element.presence?.value !== false).map(element => ({
    element_id: element.id,
    placement: element.placement ? { surface: pick(element.placement.surface), mode: pick(element.placement.mode) } : null,
    receives_from: state.connections.filter(edge => edge.to === element.id).map(edge => edge.from),
    new: !before.has(element.id)
  }));

  const mechanisms = {};
  for (const [name, [belongs, [effectId]]] of Object.entries(MECHANISMS)) {
    if (mode !== belongs) { mechanisms[name] = { mode: belongs, today: null, scenario: null, relevant: false }; continue; }
    const today = name === "SLOW" ? slowState(baselineState) : mechanismState(baselineEffects, effectId, name);
    const next = name === "SLOW" ? slowState(state) : mechanismState(scenarioEffects, effectId, name);
    mechanisms[name] = { mode: belongs, relevant: true, today: today.lit, scenario: next.lit, state: next.state, where: next.where, driven_by: name === "SLOW" ? "routing" : effectId };
  }

  return {
    contract: "street-slice-visual/0.1",
    mode,
    scenario_id: scenario?.id ?? null,
    segments,
    underground,
    routing,
    sewer: { today: pick(baselineEffects?.effects?.sewer_load_tendency), scenario: pick(scenarioEffects?.effects?.sewer_load_tendency), assessment: effectDelta?.changes?.sewer_load_tendency?.assessment ?? null },
    trees,
    rain_barrels,
    mechanisms
  };
}

// ---------- Sponge Street explainer stages (PR #2)
//
// The explainer keeps one stage index per track (its `state.st`). explainerStages() derives those
// indices from a toStreetSlice() result, so the existing artwork can be driven by state instead of
// by a frame number. Presentation only: it reads the slice, it does not touch effects.
// Every stage is reachable from a canonical fact (roof material, routing through a rain barrel,
// tree pit, rain-garden placement). `stage: null` means the truth is unknown; it is never "no change".
export const EXPLAINER_TRACKS = {
  roof: ["Bare", "Thin green", "Roof garden"],
  pipe: ["To sewer", "Rain barrel", "Feeds the tree"],
  walk: ["Sealed", "Open joints"],
  tree: ["Grate pit", "Bigger pit", "Sponge trench"],
  park: ["Cars", "Rain garden", "Joined to trench"],
  road: ["To the drain", "Open kerb"],
  store: ["Nothing", "Storage + overflow"]
};

export function explainerStages(slice) {
  if (!slice) return null;
  const byRole = role => slice.segments.filter(segment => segment.role === role && segment.present?.value !== false);
  const flows = slice.routing.flows;
  const routingUnknown = slice.routing.state === "unknown";
  const barrels = new Set((slice.rain_barrels || []).map(barrel => barrel.element_id));
  const known = value => value && value.state !== "unknown" && value.state !== "not-applicable" && value.value !== null;

  // Follow roof / surface water through network nodes (downpipe, gully) and rain barrels. A barrel's
  // overflow is followed (that is how water leaves it); other overflows are not.
  function trace(id, seen = new Set([id])) {
    const out = { planting: false, barrel: false };
    for (const flow of flows) {
      if (flow.from !== id || seen.has(flow.to)) continue;
      if (flow.mode === "overflow" && !barrels.has(id)) continue;
      if (flow.into === "planting") { out.planting = true; continue; }
      if (flow.into === "drain" || flow.into === "barrel") {
        if (flow.into === "barrel") out.barrel = true;
        const next = trace(flow.to, new Set([...seen, flow.to]));
        out.planting ||= next.planting;
        out.barrel ||= next.barrel;
      }
    }
    return out;
  }
  const hasEdges = id => flows.some(flow => flow.from === id);

  // Per-element levels → one track stage. The stage is the weakest non-zero level that is true where
  // anything changed; `partial` = some elements are below it or unknown; `mixed` = some are above it
  // (the artwork has one stage per track, so the stronger claim is not drawn). No element ⇒ 0.
  function aggregate(track, items) {
    const levels = items.map(item => item.level);
    const ids = items.map(item => item.id);
    if (!items.length) return { stage: 0, label: EXPLAINER_TRACKS[track][0], state: "derived", derived_from: [], note: "no such element in this place" };
    const on = levels.filter(level => level !== null && level > 0);
    const unknownCount = levels.filter(level => level === null).length;
    if (!on.length) {
      if (unknownCount) return { stage: null, label: null, state: "unknown", derived_from: ids, note: items.find(item => item.level === null).why };
      return { stage: 0, label: EXPLAINER_TRACKS[track][0], state: "derived", derived_from: ids };
    }
    const stage = Math.min(...on);
    const out = { stage, label: EXPLAINER_TRACKS[track][stage], state: "derived", derived_from: items.filter(item => item.level !== null && item.level >= stage).map(item => item.id) };
    if (levels.some(level => level === null || level < stage)) out.partial = true;
    if (on.some(level => level > stage)) { out.mixed = true; out.note = `some elements reach "${EXPLAINER_TRACKS[track][Math.max(...on)]}"; the artwork shows the weaker stage`; }
    if (unknownCount) out.unknown_elements = unknownCount;
    return out;
  }

  const roofLevel = segment => !segment.material ? null : segment.material === "roof-garden" ? 2 : segment.material === "green-roof" ? 1 : 0;
  const buildings = byRole("building");
  const roof = aggregate("roof", buildings.map(segment => ({ id: segment.element_id, level: roofLevel(segment), why: "roof material unknown" })));

  const pipe = aggregate("pipe", buildings.map(segment => {
    const reach = trace(segment.element_id);
    if (reach.planting) return { id: segment.element_id, level: 2 };
    if (reach.barrel) return { id: segment.element_id, level: 1 };
    if (routingUnknown && !hasEdges(segment.element_id)) return { id: segment.element_id, level: null, why: "drainage routing unknown" };
    return { id: segment.element_id, level: 0 };
  }));

  const walk = aggregate("walk", byRole("sidewalk").map(segment => ({ id: segment.element_id, level: segment.surface_class.value === null ? null : segment.surface_class.value !== "sealed" ? 1 : 0, why: "sidewalk surface unknown" })));

  const treeLevel = tree => {
    if (tree.rooted_in && slice.segments.some(segment => segment.element_id === tree.rooted_in && segment.role === "tree-trench")) return 2;
    if (!known(tree.pit)) return null;
    return { trench: 2, enlarged: 1, standard: 0 }[tree.pit.value] ?? null;
  };
  const tree = aggregate("tree", slice.trees.filter(item => item.presence.value !== false).map(item => ({ id: item.element_id, level: treeLevel(item), why: "tree pit size unknown" })));

  // Parking track: only a rain garden whose placement says it REPLACES parking converts parking.
  // Sidewalk (or other) rain gardens leave the parking track alone; unknown placement stays unknown.
  const gardens = byRole("rain-garden");
  const trenches = byRole("tree-trench").map(segment => segment.element_id);
  const placementOf = segment => {
    const { surface, mode } = segment.placement || {};
    if (!known(surface) || !known(mode)) return "unknown";
    return surface.value === "parking" && mode.value === "replaces" ? "parking" : "other";
  };
  const parkingGardens = gardens.filter(segment => placementOf(segment) === "parking").map(segment => segment.element_id);
  const unknownGardens = gardens.filter(segment => placementOf(segment) === "unknown").map(segment => segment.element_id);
  const joined = parkingGardens.some(id => flows.some(flow => (flow.from === id && trenches.includes(flow.to)) || (trenches.includes(flow.from) && flow.to === id)));
  const park = parkingGardens.length
    ? { stage: joined ? 2 : 1, label: EXPLAINER_TRACKS.park[joined ? 2 : 1], state: "derived", derived_from: parkingGardens, ...(unknownGardens.length ? { unknown_elements: unknownGardens.length } : {}), ...(!joined && routingUnknown ? { note: "joined to trench? drainage routing unknown" } : {}) }
    : unknownGardens.length
      ? { stage: null, label: null, state: "unknown", derived_from: unknownGardens, note: "rain garden placement unknown: cannot say parking was converted" }
      : { stage: 0, label: EXPLAINER_TRACKS.park[0], state: "derived", derived_from: gardens.map(segment => segment.element_id), ...(gardens.length ? { note: "rain garden(s) not on parking; parking unchanged" } : {}) };

  const road = aggregate("road", byRole("road").map(segment => {
    if (trace(segment.element_id).planting) return { id: segment.element_id, level: 1 };
    if (routingUnknown) return { id: segment.element_id, level: null, why: "drainage routing unknown" };
    return { id: segment.element_id, level: 0 };
  }));

  // Underground storage only (rain garden / tree trench with an overflow). Rain barrels are not this track.
  const receivers = [...gardens.map(segment => segment.element_id), ...trenches];
  const overflowing = receivers.filter(id => flows.some(flow => flow.from === id && flow.mode === "overflow"));
  const store = !receivers.length ? { stage: 0, label: EXPLAINER_TRACKS.store[0], state: "derived", derived_from: [] }
    : overflowing.length ? { stage: 1, label: EXPLAINER_TRACKS.store[1], state: "derived", derived_from: overflowing }
    : routingUnknown ? { stage: null, label: null, state: "unknown", derived_from: receivers, note: "drainage routing unknown" }
    : { stage: 0, label: EXPLAINER_TRACKS.store[0], state: "derived", derived_from: receivers };

  const stages = { roof, pipe, walk, tree, park, road, store };
  return { st: Object.fromEntries(Object.entries(stages).map(([track, value]) => [track, value.stage])), stages };
}
