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

// ---------- intervention-knowledge/0.1 (researcher-facing)

export const KNOWLEDGE_SCHEMA_VERSION = "intervention-knowledge/0.1";
export const KNOWLEDGE_CATEGORIES = ["surface", "routing", "storage-infiltration", "vegetation", "reuse"];
// Keys that belong to renderers or to the internal execution DSL, never to research records.
export const FORBIDDEN_KNOWLEDGE_KEYS = ["layout", "band", "svg", "x", "y", "width", "height", "color", "colour", "style", "icon", "render", "renderer", "stage", "transform", "operations", "op", "ops", "params", "target"];
const KNOWLEDGE_KEYS = ["id", "label", "category", "description", "mechanisms", "applies_to", "requirements", "constraints", "basel_examples", "sources", "note"];
const STATE_ELEMENT_TYPES = [...ELEMENT_TYPES, "rain-garden", "tree-trench", "gully", "downpipe", "sewer", "ground"];

function findForbidden(value, path, found) {
  if (Array.isArray(value)) value.forEach((item, i) => findForbidden(item, `${path}[${i}]`, found));
  else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      if (FORBIDDEN_KNOWLEDGE_KEYS.includes(key)) found.push(`${path}.${key}`);
      findForbidden(inner, `${path}.${key}`, found);
    }
  }
  return found;
}

export function validateKnowledge(knowledge) {
  const errors = [];
  if (!knowledge || typeof knowledge !== "object") return ["knowledge: not an object"];
  if (knowledge.schema_version !== KNOWLEDGE_SCHEMA_VERSION) errors.push(`schema_version must be ${KNOWLEDGE_SCHEMA_VERSION}`);
  if (!Array.isArray(knowledge.interventions) || !knowledge.interventions.length) errors.push("interventions must be a non-empty array");
  const ids = new Set();
  for (const [i, item] of (knowledge.interventions || []).entries()) {
    const path = `interventions[${i}]${item?.id ? `(${item.id})` : ""}`;
    if (!/^[a-z0-9-]+$/.test(item.id || "")) errors.push(`${path}: id must be kebab-case`);
    if (ids.has(item.id)) errors.push(`${path}: duplicate id`);
    ids.add(item.id);
    for (const key of ["label", "description"]) if (!item[key]) errors.push(`${path}: ${key} missing`);
    if (!KNOWLEDGE_CATEGORIES.includes(item.category)) errors.push(`${path}: category must be one of ${KNOWLEDGE_CATEGORIES.join(", ")}`);
    if (!Array.isArray(item.mechanisms) || item.mechanisms.some(m => !MECHANISMS.includes(m))) errors.push(`${path}: mechanisms must be from ${MECHANISMS.join(", ")}`);
    if (!Array.isArray(item.applies_to) || !item.applies_to.length || item.applies_to.some(t => !STATE_ELEMENT_TYPES.includes(t))) errors.push(`${path}: applies_to must list element types`);
    for (const key of ["requirements", "constraints"]) {
      if (!Array.isArray(item[key])) errors.push(`${path}: ${key} must be an array`);
      for (const rule of item[key] || []) if (!rule.id || !rule.label) errors.push(`${path}.${key}: each needs id and label`);
    }
    for (const key of ["basel_examples", "sources"]) if (!Array.isArray(item[key])) errors.push(`${path}: ${key} must be an array`);
    for (const key of Object.keys(item)) if (!KNOWLEDGE_KEYS.includes(key)) errors.push(`${path}: unexpected field "${key}"`);
    for (const hit of findForbidden(item, path, [])) errors.push(`${hit}: renderer / execution field not allowed in knowledge`);
  }
  return errors;
}

// ---------- adaptive-state/0.2 (internal; light checks used in tests)

export function validateState(state) {
  const errors = [];
  if (state?.schema_version !== "adaptive-state/0.2") errors.push("schema_version must be adaptive-state/0.2");
  const ids = new Set(state.elements.map(el => el.id));
  for (const el of state.elements) {
    if (!STATE_ELEMENT_TYPES.includes(el.type)) errors.push(`${el.id}: invalid type ${el.type}`);
    checkEvidence(el.presence, `${el.id}.presence`, errors);
    checkEvidence(el.area_m2, `${el.id}.area_m2`, errors);
    for (const group of ["surface", "subsurface", "vegetation", "thermal"]) {
      for (const [key, value] of Object.entries(el[group] || {})) checkEvidence(value, `${el.id}.${group}.${key}`, errors);
    }
  }
  for (const edge of state.connections) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push(`connection ${edge.from}→${edge.to}: unknown endpoint`);
    if (!["surface-runoff", "roof-runoff", "pipe", "overflow", "infiltration"].includes(edge.mode)) errors.push(`connection ${edge.from}→${edge.to}: invalid mode ${edge.mode}`);
  }
  return errors;
}
