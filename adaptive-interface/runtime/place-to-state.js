// placeToState: the compatibility layer between the data team's PlaceModel 0.1 and the StateModel 0.2.
// The data team keeps delivering PlaceModel 0.1; everything below is internal and may evolve.
//
// What the adapter adds, and how it labels it:
//   surface archetype      assumed  (PlaceModel only says sealed / permeable / planted)
//   sealed_fraction        derived  from the PlaceModel surface where that is known
//   other surface props    assumed  archetype defaults (catalogues/surfaces.json)
//   subsurface             copied from PlaceModel context (unknown stays unknown) or archetype defaults (assumed)
//   tree canopy            assumed  "medium" for an existing tree (no canopy data in 0.1)
//   water routing          observed if the PlaceModel carries `connections`, else assumed conventional drainage
import { ev, clone, isKnown } from "./evidence.js";
import { STATE_SCHEMA_VERSION, surfaceFromArchetype, archetypeById, edgeId } from "./state-model.js";

const ARCHETYPE_RULES = {
  sealed: { building: "sealed-roof", road: "asphalt", parking: "asphalt", tram: "asphalt", sidewalk: "sealed-paving", "fixed-area": "sealed-paving", default: "concrete" },
  permeable: { default: "permeable-paving" },
  planted: { tram: "grass", default: "planted-soil" },
  water: { default: "water" }
};
const SEALED_FROM_PLACE = { sealed: "high", permeable: "medium", planted: "none", water: "none" };
const DRAINED_TYPES = ["road", "parking", "sidewalk", "tram", "fixed-area", "unknown-area"];
const POINT_TYPES = ["tree", "entrance"];

const copyEvidence = (value, fallbackNote) => value ? clone(value) : ev(null, "unknown", { note: fallbackNote });
const archetypeFor = (type, surface) => {
  const rules = ARCHETYPE_RULES[surface];
  return rules ? rules[type] || rules.default : null;
};

function surfaceState(element, surfaces) {
  if (POINT_TYPES.includes(element.type) || element.surface?.state === "not-applicable") return null;
  if (!isKnown(element.surface)) return surfaceFromArchetype(surfaces, null);
  const archetypeId = archetypeFor(element.type, element.surface.value);
  const derivedSealed = ev(SEALED_FROM_PLACE[element.surface.value], "derived", { drivers: [`place:${element.id}.surface`], method: `PlaceModel surface "${element.surface.value}" (${element.surface.state})` });
  return surfaceFromArchetype(surfaces, archetypeId, { method: `assumed from PlaceModel surface "${element.surface.value}" + type ${element.type}`, derivedSealed });
}

function subsurfaceState(element, context, surfaces, surface) {
  if (element.type === "entrance") return null;
  const defaults = surface?.archetype?.value ? archetypeById(surfaces, surface.archetype.value).properties : null;
  const assumed = value => value ? ev(value, "assumed", { source_id: "catalogue:surfaces" }) : ev(null, "unknown");
  const roof = element.type === "building";
  return {
    infiltration_capacity: roof ? ev(null, "not-applicable", { note: "roof; water leaves through the downpipe" }) : copyEvidence(context.infiltration_capacity, "not in PlaceModel"),
    storage_capacity: element.type === "tree" ? ev("low", "assumed", { note: "grate-sized tree pit assumed" }) : assumed(defaults?.storage_capacity),
    rootable_volume: element.type === "tree" ? ev("low", "assumed", { note: "grate-sized tree pit assumed" }) : assumed(defaults?.rootable_volume),
    utility_conflict: copyEvidence(context.utilities, "not in PlaceModel"),
    groundwater_constraint: roof ? ev(null, "not-applicable") : copyEvidence(context.groundwater_protection_zone, "not in PlaceModel")
  };
}

function vegetationState(element, context, surface) {
  const soilWater = copyEvidence(context.soil_water, "no soil-water data");
  if (element.type === "tree") {
    return { canopy: element.presence?.value === false ? ev("none", "user-corrected", { replaces: null }) : ev("medium", "assumed", { note: "existing street tree; no canopy data in PlaceModel 0.1" }), soil_water_available: soilWater };
  }
  if (surface && ["high", "medium", "low"].includes(surface.vegetation_fraction?.value)) return { canopy: ev("none", "assumed"), soil_water_available: soilWater };
  return null;
}

function node(id, type, label, note) {
  return { id, type, label, origin: "adapter", presence: ev(true, "assumed", { note }), area_m2: ev(null, "not-applicable"), surface: null, subsurface: null, vegetation: null };
}

function assumedRouting(elements, place) {
  const nodes = [node("sewer", "sewer", "Combined sewer", "conventional drainage assumed"), node("ground", "ground", "Ground / subsoil", "always present")];
  const connections = [];
  const edge = (from, to, mode, note) => connections.push({ id: edgeId({ from, to }), from, to, medium: "rainwater", mode, state: "assumed", note });
  for (const element of elements) {
    if (element.presence?.value === false) continue;
    if (element.type === "building") {
      nodes.push(node(`downpipe:${element.id}`, "downpipe", `Downpipe, ${element.label}`, "assumed for every building"));
      edge(element.id, `downpipe:${element.id}`, "roof-runoff", "roof drains through a downpipe (assumed)");
      edge(`downpipe:${element.id}`, "sewer", "pipe", "downpipe connected to sewer (assumed)");
    } else if (DRAINED_TYPES.includes(element.type)) {
      const permeable = ["medium", "low", "none"].includes(element.surface?.sealed_fraction?.value) && element.surface.sealed_fraction.value !== "high";
      if (permeable) edge(element.id, "ground", "infiltration", "permeable surface infiltrates (assumed)");
      nodes.push(node(`gully:${element.id}`, "gully", `Gully, ${element.label}`, "assumed for every drained surface"));
      edge(element.id, `gully:${element.id}`, permeable ? "overflow" : "surface-runoff", "surface drains to a gully (assumed)");
      edge(`gully:${element.id}`, "sewer", "pipe", "gully connected to sewer (assumed)");
    } else if (element.surface && ["planted", "water"].includes(archetypeClass(element))) {
      edge(element.id, "ground", "infiltration", "planted surface infiltrates (assumed)");
    }
  }
  return { nodes, connections };
}

function archetypeClass(element) {
  const value = element.surface?.vegetation_fraction?.value;
  return ["high", "medium"].includes(value) ? "planted" : null;
}

export function placeToState(place, { surfaces } = {}) {
  if (!surfaces) throw new Error("placeToState needs the surface archetype catalogue");
  const context = place.context || {};
  const elements = place.elements.map(element => {
    const surface = surfaceState(element, surfaces);
    return {
      id: element.id, type: element.type, label: element.label,
      ...(element.layout ? { layout: clone(element.layout) } : {}),
      ...(element.origin ? { origin: element.origin } : {}),
      ...(element.fixed ? { fixed: true } : {}),
      ...(element.tags ? { tags: [...element.tags] } : {}),
      presence: clone(element.presence),
      area_m2: clone(element.area_m2),
      ...(element.count ? { count: clone(element.count) } : {}),
      surface,
      subsurface: subsurfaceState(element, context, surfaces, surface),
      vegetation: vegetationState(element, context, surface),
      thermal: surface ? { albedo: clone(surface.albedo), shade_fraction: ev(null, "unknown", { note: "no canopy geometry to intersect" }) } : null
    };
  });
  let nodes = [];
  let connections = [];
  if (Array.isArray(place.connections) && place.connections.length) {
    connections = place.connections.map(item => ({ medium: "rainwater", state: "observed", ...clone(item), id: edgeId(item) }));
    const known = new Set(elements.map(element => element.id));
    for (const id of new Set(connections.flatMap(item => [item.from, item.to]))) if (!known.has(id)) nodes.push(node(id, id.startsWith("sewer") ? "sewer" : id.startsWith("downpipe") ? "downpipe" : id === "ground" ? "ground" : "gully", id, "named in PlaceModel connections"));
  } else {
    ({ nodes, connections } = assumedRouting(elements, place));
  }
  return {
    schema_version: STATE_SCHEMA_VERSION,
    place_id: place.place_id,
    label: place.label,
    ...(place.fixture ? { fixture: true } : {}),
    ...(place.schematic ? { schematic: clone(place.schematic) } : {}),
    elements: [...elements, ...nodes],
    connections,
    context: clone(context),
    provenance: [...clone(place.provenance || []), { id: "adapter:place-to-state", kind: "adapter", label: "placeToState", note: "Archetypes, subsurface defaults, tree canopy and drainage routing are prototype assumptions unless the PlaceModel provides them." }]
  };
}
