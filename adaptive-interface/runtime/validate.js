// Lightweight runtime validation of the two data contracts.
// Mirrors contracts/place-model.schema.json and contracts/intervention-catalog.schema.json,
// plus rules JSON Schema cannot express (unknown never carries a value, ids unique, refs resolve).
import { EVIDENCE_STATES, ELEMENT_TYPES, SURFACES, MECHANISMS, LEVEL_VALUES, TREE_PITS, PLACEMENT_SURFACES, PLACEMENT_MODES } from "./evidence.js";

export const PLACE_SCHEMA_VERSION = "adaptive-place/0.1";
export const CATALOGUE_SCHEMA_VERSION = "intervention-catalog/0.1";
const TRANSFORM_OPS = ["carve", "set-surface", "add", "reduce-count"];

function checkEvidence(value, path, errors, { allowMissing = false } = {}) {
  if (value === undefined) {
    if (!allowMissing) errors.push(`${path}: missing evidence value`);
    return;
  }
  if (!value || typeof value !== "object" || !("state" in value) || !("value" in value)) {
    errors.push(`${path}: must be { value, state }`);
    return;
  }
  if (!EVIDENCE_STATES.includes(value.state)) errors.push(`${path}: invalid state "${value.state}"`);
  if ((value.state === "unknown" || value.state === "not-applicable") && value.value !== null) {
    errors.push(`${path}: ${value.state} must carry value null, got ${JSON.stringify(value.value)}`);
  }
  if (value.state !== "unknown" && value.state !== "not-applicable" && value.value === null) {
    errors.push(`${path}: state ${value.state} needs a value (use "unknown" instead)`);
  }
  if (value.state === "user-corrected" && !("replaces" in value)) errors.push(`${path}: user-corrected value must keep "replaces"`);
}

export function validatePlaceModel(place) {
  const errors = [];
  if (!place || typeof place !== "object") return ["place: not an object"];
  if (place.schema_version !== PLACE_SCHEMA_VERSION) errors.push(`schema_version must be ${PLACE_SCHEMA_VERSION}`);
  if (!place.place_id) errors.push("place_id missing");
  if (!place.label) errors.push("label missing");
  const sel = place.selection;
  if (!sel || !Number.isFinite(sel.lon) || !Number.isFinite(sel.lat) || !Number.isFinite(sel.radius_m)) errors.push("selection must have numeric lon, lat, radius_m");
  if (!Array.isArray(place.elements)) errors.push("elements must be an array");
  if (!place.context || typeof place.context !== "object") errors.push("context must be an object");
  if (!Array.isArray(place.provenance) || !place.provenance.length) errors.push("provenance must list at least one source");
  const sourceIds = new Set((place.provenance || []).map(item => item.id));
  const ids = new Set();
  for (const [i, element] of (place.elements || []).entries()) {
    const path = `elements[${i}]${element?.id ? `(${element.id})` : ""}`;
    if (!element.id) errors.push(`${path}: id missing`);
    if (ids.has(element.id)) errors.push(`${path}: duplicate id`);
    ids.add(element.id);
    if (!ELEMENT_TYPES.includes(element.type)) errors.push(`${path}: invalid type "${element.type}"`);
    for (const key of ["presence", "surface", "area_m2"]) checkEvidence(element[key], `${path}.${key}`, errors);
    checkEvidence(element.count, `${path}.count`, errors, { allowMissing: true });
    checkSemantics(element, path, errors);
    if (element.surface && element.surface.value !== null && !SURFACES.includes(element.surface.value)) errors.push(`${path}.surface: invalid surface "${element.surface.value}"`);
    if (element.area_m2?.value !== null && element.area_m2?.value !== undefined && !(element.area_m2.value >= 0)) errors.push(`${path}.area_m2: must be ≥ 0`);
    for (const key of ["presence", "surface", "area_m2", "count"]) {
      const sid = element[key]?.source_id;
      if (sid && !sourceIds.has(sid)) errors.push(`${path}.${key}: source_id "${sid}" not in provenance`);
    }
  }
  for (const [key, value] of Object.entries(place.context || {})) checkEvidence(value, `context.${key}`, errors);
  // Optional routing evidence. Absent = unknown routing; an edge must never claim to be unknown.
  if (place.routing !== undefined) {
    const nodes = new Set([...ids, ...(place.routing?.nodes || []).map(node => node.id)]);
    for (const [i, edge] of (place.routing?.connections || []).entries()) {
      const path = `routing.connections[${i}]`;
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) errors.push(`${path}: ${edge.from}→${edge.to} must join elements or routing nodes`);
      if (!EVIDENCE_STATES.includes(edge.state) || ["unknown", "not-applicable"].includes(edge.state)) errors.push(`${path}: state must be a known evidence state (leave unknown edges out)`);
    }
  }
  return errors;
}

export function validateCatalogue(catalogue) {
  const errors = [];
  if (!catalogue || typeof catalogue !== "object") return ["catalogue: not an object"];
  if (catalogue.schema_version !== CATALOGUE_SCHEMA_VERSION) errors.push(`schema_version must be ${CATALOGUE_SCHEMA_VERSION}`);
  if (!catalogue.catalogue_id) errors.push("catalogue_id missing");
  if (!Array.isArray(catalogue.interventions) || !catalogue.interventions.length) errors.push("interventions must be a non-empty array");
  const ids = new Set();
  for (const [i, item] of (catalogue.interventions || []).entries()) {
    const path = `interventions[${i}]${item?.id ? `(${item.id})` : ""}`;
    if (!item.id) errors.push(`${path}: id missing`);
    if (ids.has(item.id)) errors.push(`${path}: duplicate id`);
    ids.add(item.id);
    for (const key of ["label", "summary"]) if (!item[key]) errors.push(`${path}: ${key} missing`);
    if (!Array.isArray(item.mechanisms) || item.mechanisms.some(m => !MECHANISMS.includes(m))) errors.push(`${path}: mechanisms must be from ${MECHANISMS.join(", ")}`);
    if (!item.target || !Array.isArray(item.target.types) || !item.target.types.every(t => ELEMENT_TYPES.includes(t))) errors.push(`${path}: target.types must be element types`);
    if (!Array.isArray(item.requirements)) errors.push(`${path}: requirements must be an array`);
    if (!Array.isArray(item.checks)) errors.push(`${path}: checks must be an array`);
    if (!Array.isArray(item.transform) || !item.transform.length) errors.push(`${path}: transform must be a non-empty array`);
    for (const op of item.transform || []) if (!TRANSFORM_OPS.includes(op.op)) errors.push(`${path}: unknown transform op "${op.op}"`);
    for (const [name, param] of Object.entries(item.params || {})) {
      if (!Number.isFinite(param.default)) errors.push(`${path}.params.${name}: default must be a number`);
      if (param.state !== "assumed") errors.push(`${path}.params.${name}: design parameters are "assumed"`);
    }
    if (!Array.isArray(item.sources)) errors.push(`${path}: sources must be an array`);
  }
  return errors;
}

// ---------- StateModel 0.2, scenarios, intervention knowledge 0.1

export const STATE_VERSION = "adaptive-state/0.2";
export const KNOWLEDGE_SCHEMA_VERSION = "intervention-knowledge/0.1";
const CONNECTION_MODES = ["surface-runoff", "roof-drainage", "pipe", "overflow"];
const KNOWLEDGE_FIELDS = ["id", "label", "category", "description", "mechanisms", "applies_to", "state_changes", "requirements", "constraints", "basel_examples", "sources", "notes"];
// Things that belong to renderers or to the internal executor, never to researcher-facing knowledge.
export const FORBIDDEN_KNOWLEDGE_FIELDS = ["layout", "band", "svg", "x", "y", "color", "colour", "icon", "stage", "position", "transform", "operations", "op", "target", "params"];

// Placement provenance and tree pit: optional, typed, unknown allowed. Shared by PlaceModel and StateModel.
function checkSemantics(element, path, errors) {
  const known = value => value && !["unknown", "not-applicable"].includes(value.state);
  if (element.placement !== undefined) {
    const { surface, mode } = element.placement || {};
    checkEvidence(surface, `${path}.placement.surface`, errors);
    checkEvidence(mode, `${path}.placement.mode`, errors);
    if (known(surface) && !PLACEMENT_SURFACES.includes(surface.value)) errors.push(`${path}.placement.surface: one of ${PLACEMENT_SURFACES.join(", ")}`);
    if (known(mode) && !PLACEMENT_MODES.includes(mode.value)) errors.push(`${path}.placement.mode: one of ${PLACEMENT_MODES.join(", ")}`);
  }
  const pit = element.vegetation?.pit ?? element.pit;
  if (pit !== undefined) {
    if (element.type !== "tree") errors.push(`${path}: only trees have a pit`);
    checkEvidence(pit, `${path}.pit`, errors);
    if (known(pit) && !TREE_PITS.includes(pit.value)) errors.push(`${path}.pit: one of ${TREE_PITS.join(", ")}`);
  }
}

export function validateStateModel(state) {
  const errors = [];
  if (!state || typeof state !== "object") return ["state: not an object"];
  if (state.schema_version !== STATE_VERSION) errors.push(`schema_version must be ${STATE_VERSION}`);
  if (!Array.isArray(state.elements)) return [...errors, "elements must be an array"];
  if (!Array.isArray(state.connections)) errors.push("connections must be an array");
  if (!state.routing || !EVIDENCE_STATES.includes(state.routing.state)) errors.push("routing.state must be an evidence state");
  const ids = new Set();
  for (const [i, element] of state.elements.entries()) {
    const path = `elements[${i}](${element.id})`;
    if (ids.has(element.id)) errors.push(`${path}: duplicate id`);
    ids.add(element.id);
    if (!["area", "point", "network"].includes(element.kind)) errors.push(`${path}: kind must be area, point or network`);
    checkEvidence(element.presence, `${path}.presence`, errors);
    if (element.kind === "network") continue;
    checkEvidence(element.surface?.class, `${path}.surface.class`, errors);
    for (const group of ["surface", "subsurface", "vegetation"]) {
      for (const [key, value] of Object.entries(element[group] || {})) {
        if (key === "rooted_in") continue;
        checkEvidence(value, `${path}.${group}.${key}`, errors);
      }
    }
    checkSemantics(element, path, errors);
  }
  for (const [i, edge] of (state.connections || []).entries()) {
    const path = `connections[${i}](${edge.from}→${edge.to})`;
    if (!ids.has(edge.from)) errors.push(`${path}: from "${edge.from}" is not an element`);
    if (!ids.has(edge.to)) errors.push(`${path}: to "${edge.to}" is not an element`);
    if (!CONNECTION_MODES.includes(edge.mode)) errors.push(`${path}: mode must be one of ${CONNECTION_MODES.join(", ")}`);
    if (!EVIDENCE_STATES.includes(edge.state) || edge.state === "unknown" || edge.state === "not-applicable") errors.push(`${path}: a connection is evidence; unknown routing is the absence of an edge`);
  }
  return errors;
}

export function validateScenario(scenario) {
  const errors = [];
  if (!scenario?.id) errors.push("scenario id missing");
  if (!scenario?.rain && !scenario?.heat) errors.push(`${scenario?.id}: needs rain or heat conditions`);
  if (scenario?.rain && !LEVEL_VALUES.includes(scenario.rain.intensity)) errors.push(`${scenario.id}.rain.intensity: qualitative level required`);
  if (scenario?.heat && !LEVEL_VALUES.includes(scenario.heat.solar_exposure)) errors.push(`${scenario.id}.heat.solar_exposure: qualitative level required`);
  if (scenario?.heat && !["low", "normal", "high"].includes(scenario.heat.soil_moisture)) errors.push(`${scenario.id}.heat.soil_moisture: low, normal or high`);
  return errors;
}

export function validateKnowledge(catalogue) {
  const errors = [];
  if (!catalogue || typeof catalogue !== "object") return ["knowledge: not an object"];
  if (catalogue.schema_version !== KNOWLEDGE_SCHEMA_VERSION) errors.push(`schema_version must be ${KNOWLEDGE_SCHEMA_VERSION}`);
  if (!Array.isArray(catalogue.interventions) || !catalogue.interventions.length) errors.push("interventions must be a non-empty array");
  const ids = new Set();
  for (const [i, item] of (catalogue.interventions || []).entries()) {
    const path = `interventions[${i}]${item?.id ? `(${item.id})` : ""}`;
    if (!item.id) errors.push(`${path}: id missing`);
    if (ids.has(item.id)) errors.push(`${path}: duplicate id`);
    ids.add(item.id);
    for (const key of ["label", "category", "description"]) if (!item[key]) errors.push(`${path}: ${key} missing`);
    for (const key of Object.keys(item)) {
      if (FORBIDDEN_KNOWLEDGE_FIELDS.includes(key)) errors.push(`${path}: "${key}" is a renderer/execution field, not knowledge`);
      else if (!KNOWLEDGE_FIELDS.includes(key)) errors.push(`${path}: unknown field "${key}"`);
    }
    if (!Array.isArray(item.mechanisms) || item.mechanisms.some(m => !MECHANISMS.includes(m))) errors.push(`${path}: mechanisms must be from ${MECHANISMS.join(", ")}`);
    if (!item.applies_to || !Array.isArray(item.applies_to.element_types) || !item.applies_to.element_types.every(t => ELEMENT_TYPES.includes(t))) errors.push(`${path}: applies_to.element_types must be element types`);
    for (const rule of item.requirements || []) if (!rule.label) errors.push(`${path}: every requirement needs a label`);
    for (const key of ["requirements", "constraints", "basel_examples", "sources"]) if (!Array.isArray(item[key])) errors.push(`${path}: ${key} must be an array`);
  }
  return errors;
}
