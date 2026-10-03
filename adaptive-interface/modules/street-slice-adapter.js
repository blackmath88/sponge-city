// Street Slice adapter seam: StateModel + EffectResult + Scenario → semantic visual state for a
// cross-section renderer (the Sponge Street explainer, PR #2, or the uploaded Street Slice).
//
// It replaces "stage = 0..4 → show/hide SVG pieces" with "state → what to draw". It returns tokens,
// never coordinates: the renderer owns layout. Pure function; no calculations of effects (it reads them).
import { connectionsFrom, connectionsTo, elementById, RECEIVER_TYPES } from "../runtime/state-model.js";

const present = el => el.presence?.value === true;
const ofType = (state, type) => state.elements.filter(el => el.type === type && present(el));
const surfaceToken = el => {
  if (!el.surface || el.surface.sealed_fraction?.state === "unknown") return "unknown";
  if (["medium", "high"].includes(el.surface.vegetation_fraction?.value)) return "planted";
  return el.surface.sealed_fraction?.value === "high" ? "sealed" : "permeable";
};
const mix = tokens => { const set = [...new Set(tokens)]; return set.length === 0 ? "none" : set.length === 1 ? set[0] : "mixed"; };
const level = effect => effect?.state === "derived" ? effect.value : effect?.state || "unknown";

function routeTarget(state, el) {
  const out = connectionsFrom(state, el.id).filter(edge => edge.mode !== "infiltration");
  const receiver = out.map(edge => elementById(state, edge.to)).find(node => node && RECEIVER_TYPES.includes(node.type));
  if (receiver) return receiver.type;
  return out.some(edge => edge.mode === "overflow") ? "overflow-to-sewer" : out.length ? "sewer" : "unknown";
}

export function stateToStreetSlice(state, effectResult, scenario) {
  const e = effectResult?.effects || {};
  const buildings = ofType(state, "building");
  const sidewalks = ofType(state, "sidewalk");
  const parking = ofType(state, "parking");
  const roads = ofType(state, "road");
  const trees = state.elements.filter(el => el.type === "tree" && present(el));
  const trenches = ofType(state, "tree-trench");
  const gardens = ofType(state, "rain-garden");
  const downpipes = buildings.flatMap(b => connectionsFrom(state, b.id).filter(edge => ["roof-runoff", "overflow"].includes(edge.mode)));

  const visual = {
    schema: "street-slice-visual/0.1",
    mode: scenario?.rain ? "rain" : "heat",
    drought: scenario?.heat?.drought_stress === "high",
    building: {
      roof: mix(buildings.map(b => b.surface?.archetype?.value === "green-roof" ? "green" : "bare")),
      downpipe: mix(downpipes.map(edge => RECEIVER_TYPES.includes(elementById(state, edge.to)?.type) ? "to-receiver" : "to-sewer"))
    },
    sidewalk: {
      surface: mix(sidewalks.map(surfaceToken)),
      tree: trenches.length ? "trench" : trees.length ? "grate-pit" : "none",
      trees: trees.length
    },
    parking: {
      surface: mix(parking.map(surfaceToken)),
      rain_garden: gardens.some(g => parking.some(p => g.layout?.inserted_from === p.id)),
      bays: parking.every(p => p.count?.state && p.count.state !== "unknown") ? parking.reduce((n, p) => n + (p.count?.value || 0), 0) : null,
      drains_to: mix(parking.map(p => routeTarget(state, p)))
    },
    road: {
      kerb: roads.some(r => connectionsFrom(state, r.id).some(edge => RECEIVER_TYPES.includes(elementById(state, edge.to)?.type))) ? "open-kerb" : "to-drain"
    },
    underground: {
      storage: trenches.length && gardens.length ? "connected" : trenches.length ? "trench" : gardens.length ? "rain-garden" : "none",
      overflow: [...trenches, ...gardens].some(r => connectionsFrom(state, r.id).some(edge => edge.mode === "overflow")),
      utilities: state.context?.utilities?.state === "unknown" ? "unknown" : "known",
      infiltration: state.context?.infiltration_capacity?.state === "unknown" ? "unknown" : state.context?.infiltration_capacity?.value
    },
    flows: state.connections
      .filter(edge => edge.mode !== "pipe")
      .map(edge => ({ from: elementById(state, edge.from)?.type, to: elementById(state, edge.to)?.type, mode: edge.mode, assumed: edge.state === "assumed" })),
    overlays: {
      runoff: level(e.runoff_tendency), sewer_load: level(e.sewer_load_tendency), storage: level(e.storage_potential),
      infiltration: level(e.infiltration_potential), soil_water: level(e.soil_water_availability),
      shade: level(e.shade), evapotranspiration: level(e.evapotranspiration_potential), surface_heating: level(e.surface_heating_tendency)
    }
  };

  // Explanatory mechanism labels, from state features and effects, not from a stage number.
  const mechanisms = new Set();
  if (state.connections.some(edge => edge.mode === "infiltration" && present(elementById(state, edge.from) || {}))) mechanisms.add("ABSORB");
  if (trenches.length || gardens.length || buildings.some(b => b.surface?.archetype?.value === "green-roof")) mechanisms.add("STORE");
  if (visual.road.kerb === "open-kerb" || parking.some(p => surfaceToken(p) === "permeable")) mechanisms.add("SLOW");
  if (["medium", "high"].includes(visual.overlays.evapotranspiration)) mechanisms.add("SWEAT");
  if (["medium", "high"].includes(visual.overlays.shade)) mechanisms.add("SHADE");
  if (visual.mode === "heat" && (mechanisms.has("SHADE") || mechanisms.has("SWEAT"))) mechanisms.add("COOL");
  visual.mechanisms = [...mechanisms];
  return visual;
}

// The explainer's stage names, for a renderer that wants to reuse its artwork. Derived from state, never stored.
export function explainerStages(visual) {
  return {
    roof: visual.building.roof === "green" ? "Thin green" : visual.building.roof === "mixed" ? "Thin green (some roofs)" : "Bare",
    pipe: visual.building.downpipe === "to-receiver" ? "Feeds the tree" : visual.building.downpipe === "mixed" ? "Feeds the tree (some)" : "To sewer",
    walk: visual.sidewalk.surface === "sealed" ? "Sealed" : "Open joints",
    tree: visual.sidewalk.tree === "trench" ? "Sponge trench" : "Grate pit",
    park: visual.parking.rain_garden ? (visual.underground.storage === "connected" ? "Joined to trench" : "Rain garden") : "Cars",
    road: visual.road.kerb === "open-kerb" ? "Open kerb" : "To the drain",
    store: visual.underground.overflow ? "Storage + overflow" : "Nothing"
  };
}
