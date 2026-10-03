// Lightweight runtime validation of the two data contracts.
// Mirrors contracts/place-model.schema.json and contracts/intervention-catalog.schema.json,
// plus rules JSON Schema cannot express (unknown never carries a value, ids unique, refs resolve).
import { EVIDENCE_STATES, ELEMENT_TYPES, SURFACES, MECHANISMS } from "./evidence.js";

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
    if (element.surface && element.surface.value !== null && !SURFACES.includes(element.surface.value)) errors.push(`${path}.surface: invalid surface "${element.surface.value}"`);
    if (element.area_m2?.value !== null && element.area_m2?.value !== undefined && !(element.area_m2.value >= 0)) errors.push(`${path}.area_m2: must be ≥ 0`);
    for (const key of ["presence", "surface", "area_m2", "count"]) {
      const sid = element[key]?.source_id;
      if (sid && !sourceIds.has(sid)) errors.push(`${path}.${key}: source_id "${sid}" not in provenance`);
    }
  }
  for (const [key, value] of Object.entries(place.context || {})) checkEvidence(value, `context.${key}`, errors);
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
