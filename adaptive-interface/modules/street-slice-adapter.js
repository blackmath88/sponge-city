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
    role: ROLE[element.type] || "other",
    label: element.label,
    material: element.surface.material?.value ?? null,
    material_state: element.surface.material?.state ?? "unknown",
    surface_class: pick(element.surface.class),
    present: element.presence,
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
    mechanisms
  };
}

// ---------- Sponge Street explainer stages (PR #2)
//
// The explainer keeps one stage index per track (its `state.st`). explainerStages() derives those
// indices from a toStreetSlice() result, so the existing artwork can be driven by state instead of
// by a frame number. Presentation only: it reads the slice, it does not touch effects.
// Stages the state model cannot express yet (Roof garden, Rain barrel, Bigger pit) are never
// returned; `stage: null` means the slice depends on unknown evidence (usually routing).
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

  // Follow drainage through network nodes (downpipe, gully) until it reaches planting or the sewer.
  const reachesPlanting = (id, seen = new Set()) => flows.some(flow => {
    if (flow.from !== id || flow.mode === "overflow" || seen.has(flow.to)) return false;
    if (flow.into === "planting") return true;
    seen.add(flow.to);
    return flow.into === "drain" && reachesPlanting(flow.to, seen);
  });

  const stage = (track, index, extra = {}) => ({ stage: index, label: index === null ? null : EXPLAINER_TRACKS[track][index], state: index === null ? "unknown" : "derived", ...extra });
  // Any / all over a set of segments: the explainer shows one street, so "some" lights the stage and says so.
  const some = (track, segments, test, onIndex, { needsRouting = false } = {}) => {
    if (!segments.length) return stage(track, 0, { note: "no such element in this place" });
    const results = segments.map(test);
    // An edge an intervention added is known even when the rest of the routing is not.
    if (needsRouting && routingUnknown && !results.some(Boolean)) return stage(track, null, { note: "drainage routing unknown" });
    if (results.some(result => result === null) && !results.some(Boolean)) return stage(track, null, { note: "depends on unknown evidence" });
    const hits = results.filter(Boolean).length;
    return stage(track, hits ? onIndex : 0, hits && hits < segments.length ? { partial: true } : {});
  };

  const gardens = byRole("rain-garden").map(segment => segment.element_id);
  const trenches = byRole("tree-trench").map(segment => segment.element_id);
  const joined = flows.some(flow => (gardens.includes(flow.from) && trenches.includes(flow.to)) || (trenches.includes(flow.from) && gardens.includes(flow.to)));
  const receivers = [...gardens, ...trenches];

  const stages = {
    roof: some("roof", byRole("building"), segment => segment.material === null ? null : segment.material === "green-roof", 1),
    pipe: some("pipe", byRole("building"), segment => reachesPlanting(segment.element_id), 2, { needsRouting: true }),
    walk: some("walk", byRole("sidewalk"), segment => segment.surface_class.value === null ? null : segment.surface_class.value !== "sealed", 1),
    tree: stage("tree", trenches.length ? 2 : 0),
    park: !gardens.length ? stage("park", 0)
      : joined ? stage("park", 2)
      : stage("park", 1, routingUnknown ? { note: "joined to trench? drainage routing unknown" } : {}),
    road: some("road", byRole("road"), segment => reachesPlanting(segment.element_id), 1, { needsRouting: true }),
    store: !receivers.length ? stage("store", 0)
      : flows.some(flow => receivers.includes(flow.from) && flow.mode === "overflow") ? stage("store", 1)
      : routingUnknown ? stage("store", null, { note: "drainage routing unknown" }) : stage("store", 0)
  };
  return { st: Object.fromEntries(Object.entries(stages).map(([track, value]) => [track, value.stage])), stages };
}
