// State adapter: PlaceModel 0.1 (the data team's contract) → StateModel 0.2 (the engine's view).
//
// The data/API side keeps delivering PlaceModel 0.1. This adapter adds what the engine needs:
//   - surface archetype + qualitative surface properties (all "assumed" defaults),
//   - per-element subsurface state (site context such as infiltration capacity, copied with its evidence),
//   - vegetation state for trees,
//   - the water-routing graph — ONLY from place.routing (provider evidence) or explicitly injected
//     routing assumptions (demo). Missing routing stays unknown; it never becomes a sewer connection.
//
// stateToPlace() projects a StateModel back to PlaceModel 0.1, so 0.1 renderers and geometry
// metrics keep working on states produced by interventions.
import { ev, clone, isKnown } from "./evidence.js";
import { NETWORK_TYPES } from "./state-graph.js";

export const STATE_SCHEMA_VERSION = "adaptive-state/0.2";
export const SURFACE_KEYS = ["sealed_fraction", "permeability", "vegetation_fraction", "depression_storage", "albedo"];
const SUBSURFACE_DEFAULT_KEYS = ["storage_capacity", "rootable_volume"];

// Place context key → per-element subsurface property. The evidence (including unknown) is copied as-is.
const CONTEXT_TO_SUBSURFACE = {
  infiltration_capacity: "infiltration_capacity",
  soil_water: "soil_water_available",
  utilities: "utility_conflict",
  groundwater_protection_zone: "groundwater_constraint"
};

// Which archetype stands in for a 0.1 surface class on a given element type. The choice is an assumption.
const ARCHETYPE_BY_CLASS = {
  sealed: { building: "sealed-roof", road: "asphalt", parking: "asphalt", tram: "concrete", "fixed-area": "concrete", "*": "sealed-paving" },
  permeable: { tram: "gravel", "*": "permeable-paving" },
  planted: { building: "green-roof", tram: "grass", "tree-trench": "tree-bed", "*": "planted-soil" },
  water: { "*": "water" }
};

export function archetypeFor(type, surfaceClass) {
  const table = ARCHETYPE_BY_CLASS[surfaceClass];
  return table ? (table[type] || table["*"]) : null;
}

export const findArchetype = (surfaces, id) => surfaces?.archetypes?.find(item => item.id === id) || null;

// Surface + subsurface defaults for an archetype. Values are "assumed"; unknown if there is no catalogue.
export function archetypeState(archetypeId, surfaces, extra = {}) {
  const archetype = findArchetype(surfaces, archetypeId);
  const from = { from: `archetype:${archetypeId}`, ...extra };
  const pick = (group, key) => archetype?.[group]?.[key] !== undefined
    ? ev(archetype[group][key], "assumed", from)
    : ev(null, "unknown", { note: surfaces ? `archetype "${archetypeId}" not in catalogue` : "no surface catalogue loaded" });
  return {
    surface: Object.fromEntries(SURFACE_KEYS.map(key => [key, pick("properties", key)])),
    subsurface: Object.fromEntries(SUBSURFACE_DEFAULT_KEYS.map(key => [key, pick("subsurface", key)]))
  };
}

function contextSubsurface(context, type) {
  const out = {};
  for (const [contextKey, key] of Object.entries(CONTEXT_TO_SUBSURFACE)) {
    if (type === "building") { out[key] = ev(null, "not-applicable", { note: "roof, not ground" }); continue; }
    const value = context?.[contextKey];
    out[key] = value ? { ...clone(value), from: `context.${contextKey}` } : ev(null, "unknown", { note: `context.${contextKey} not in PlaceModel` });
  }
  return out;
}

// One PlaceModel element → one StateModel element. `options.archetype` overrides the default choice.
export function elementToState(element, context, surfaces, { archetype = null, vegetation = null, surfaceOverrides = {}, subsurfaceOverrides = {} } = {}) {
  const { surface: surfaceClass, ...rest } = clone(element);
  const classEv = surfaceClass ?? ev(null, "unknown");
  if (classEv.state === "not-applicable") {
    const out = { ...rest, kind: "point", surface: { class: classEv } };
    if (element.type === "tree") {
      out.vegetation = {
        canopy_area: ev("medium", "assumed", { note: "established street tree; canopy not in the PlaceModel" }),
        health: ev(null, "unknown"),
        rooted_in: null,
        ...clone(vegetation || {})
      };
    }
    return out;
  }
  const archetypeId = archetype || (isKnown(classEv) ? archetypeFor(element.type, classEv.value) : null);
  const defaults = archetypeId
    ? archetypeState(archetypeId, surfaces)
    : { surface: Object.fromEntries(SURFACE_KEYS.map(key => [key, ev(null, "unknown", { note: "surface unknown" })])), subsurface: Object.fromEntries(SUBSURFACE_DEFAULT_KEYS.map(key => [key, ev(null, "unknown", { note: "surface unknown" })])) };
  return {
    ...rest,
    kind: "area",
    surface: {
      class: classEv,
      material: archetypeId ? ev(archetypeId, "assumed", { method: "archetype default for surface class" }) : ev(null, "unknown", { note: "surface unknown" }),
      ...defaults.surface,
      ...clone(surfaceOverrides)
    },
    subsurface: { ...contextSubsurface(context, element.type), ...defaults.subsurface, ...clone(subsurfaceOverrides) }
  };
}

function networkNode(node, state, extra = {}) {
  return { id: node.id, type: node.type, label: node.label || node.type, kind: "network", presence: ev(true, state, extra) };
}

// place.routing is optional in PlaceModel 0.1: { nodes: [{ id, type, label, state? }], connections: [{ from, to, mode, state, source_id? }] }
// routingAssumptions (examples/demo-routing.json) are injected by the composition root, never by default.
export function placeToState(place, { surfaces = null, routingAssumptions = null } = {}) {
  const { elements = [], context = {}, routing = null, applied = [], schema_version, place_id, label, ...meta } = clone(place);
  const stateElements = elements.map(element => elementToState(element, context, surfaces));
  const ids = new Set(stateElements.map(element => element.id));
  const connections = [];
  const sources = [];

  if (routing?.connections?.length) {
    for (const node of routing.nodes || []) {
      if (ids.has(node.id)) continue;
      stateElements.push(networkNode(node, node.state || "observed", node.source_id ? { source_id: node.source_id } : {}));
      ids.add(node.id);
    }
    for (const edge of routing.connections) connections.push({ medium: "rainwater", ...edge, state: edge.state || "observed", origin: "place" });
    sources.push("place");
  }
  if (routingAssumptions) {
    const tag = `assumption:${routingAssumptions.id || "routing"}`;
    const supplied = new Set(connections.map(edge => edge.from));
    for (const node of routingAssumptions.nodes || []) {
      if (ids.has(node.id)) continue;
      stateElements.push(networkNode(node, "assumed", { source_id: tag }));
      ids.add(node.id);
    }
    for (const edge of routingAssumptions.connections || []) {
      // Provider evidence wins; assumptions only fill elements the provider said nothing about.
      if (supplied.has(edge.from) || !ids.has(edge.from) || !ids.has(edge.to)) continue;
      connections.push({ medium: "rainwater", ...edge, state: "assumed", source_id: tag, origin: "assumption" });
    }
    sources.push("assumption");
  }
  const routingState = !sources.length
    ? { state: "unknown", sources: [], note: "The PlaceModel has no routing evidence: where water goes is unknown." }
    : { state: sources.includes("place") ? "observed" : "assumed", sources, note: sources.includes("assumption") ? routingAssumptions.note || "Routing assumptions injected for the demo." : "" };

  return {
    schema_version: STATE_SCHEMA_VERSION,
    place_id,
    label,
    meta,
    context,
    elements: stateElements,
    connections,
    routing: routingState,
    applied
  };
}

// StateModel → PlaceModel 0.1 projection (network nodes and state-only properties dropped).
export function stateToPlace(state) {
  const place = {
    schema_version: "adaptive-place/0.1",
    place_id: state.place_id,
    label: state.label,
    ...clone(state.meta),
    elements: state.elements.filter(element => element.kind !== "network").map(element => {
      const { kind, surface, subsurface, vegetation, ...rest } = element;
      return { ...clone(rest), surface: clone(surface.class) };
    }),
    context: clone(state.context)
  };
  if (state.routing.sources.includes("place")) {
    place.routing = {
      nodes: state.elements.filter(element => element.kind === "network").map(node => ({ id: node.id, type: node.type, label: node.label, state: node.presence.state })),
      connections: state.connections.filter(edge => edge.origin !== "assumption").map(({ origin, ...edge }) => clone(edge))
    };
  }
  if (state.applied.length) place.applied = clone(state.applied);
  return place;
}

export const isNetwork = element => element.kind === "network" || NETWORK_TYPES.includes(element.type);
