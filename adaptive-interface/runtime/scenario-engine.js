// Scenario engine: pure functions over PlaceModel + InterventionCatalogue.
// GIS calculates, rules constrain: nothing here guesses, calls a model or touches the DOM.
//
//   source ──applyCorrections──▶ baseline ──applyInterventions──▶ scenario
//
// Inputs are never mutated; every function returns new objects.
import { ev, unknown, isKnown, clone } from "./evidence.js";

// ---------- Corrections: "Does this look right?"

// correction = { id, element_id, property: "surface" | "presence" | "area_m2" | "count", value, reason }
//            | { id, action: "add-element", element: { id, type, label, layout, surface?, area_m2?, count? }, reason }
export function applyCorrections(source, corrections = []) {
  const place = clone(source);
  const errors = [];
  for (const correction of corrections) {
    if (correction.action === "add-element") {
      const spec = correction.element || {};
      if (!spec.id || place.elements.some(element => element.id === spec.id)) {
        errors.push(`Correction ${correction.id}: element id missing or already used`);
        continue;
      }
      const corrected = value => ev(value, value === null || value === undefined ? "unknown" : "user-corrected", { replaces: null, reason: correction.reason || "" });
      place.elements.push({
        id: spec.id, type: spec.type, label: spec.label || spec.type, layout: spec.layout || {}, origin: "correction",
        presence: corrected(true),
        surface: spec.type === "tree" ? ev(null, "not-applicable") : corrected(spec.surface ?? null),
        area_m2: spec.type === "tree" ? ev(null, "not-applicable") : corrected(spec.area_m2 ?? null),
        ...(spec.count !== undefined ? { count: corrected(spec.count) } : {})
      });
      continue;
    }
    const element = place.elements.find(item => item.id === correction.element_id);
    if (!element) {
      errors.push(`Correction ${correction.id}: element "${correction.element_id}" not found`);
      continue;
    }
    if (!["surface", "presence", "area_m2", "count"].includes(correction.property)) {
      errors.push(`Correction ${correction.id}: property "${correction.property}" cannot be corrected`);
      continue;
    }
    const original = element[correction.property] ?? ev(null, "unknown");
    // Keep the very first source value if a property is corrected twice.
    const replaces = original.state === "user-corrected" ? original.replaces : original;
    element[correction.property] = correction.value === null
      ? ev(null, "unknown", { replaces, reason: correction.reason || "", corrected: true })
      : ev(correction.value, "user-corrected", { replaces, reason: correction.reason || "" });
  }
  return { place, errors };
}

// ---------- Intervention status (candidate / requires-investigation / excluded / not-applicable)

function contextResult(place, rule) {
  const value = place.context?.[rule.context_key];
  if (!isKnown(value)) return { result: "unknown", value: value ?? unknown("not provided") };
  if (Array.isArray(rule.fail_if_in) && rule.fail_if_in.includes(value.value)) return { result: "fail", value };
  if (Array.isArray(rule.pass_if_in) && !rule.pass_if_in.includes(value.value)) return { result: "fail", value };
  return { result: "pass", value };
}

export function eligibleTargets(place, intervention) {
  const surfaces = intervention.target.surfaces;
  return place.elements.filter(element =>
    element.presence?.value === true &&
    !element.fixed &&
    intervention.target.types.includes(element.type) &&
    (!surfaces || (isKnown(element.surface) && surfaces.includes(element.surface.value))));
}

export function evaluateIntervention(place, intervention) {
  const targets = eligibleTargets(place, intervention);
  const requirements = intervention.requirements.map(rule => ({ id: rule.id, label: rule.label, ...contextResult(place, rule) }));
  const checks = intervention.checks.map(rule => {
    const outcome = contextResult(place, rule);
    return { id: rule.id, label: rule.label, ...outcome, result: outcome.result === "unknown" ? "unknown" : outcome.result === "fail" ? "fail" : "known" };
  });
  let status = "candidate";
  let reason = "All requirements and checks are known and pass.";
  if (!targets.length) {
    status = "not-applicable";
    reason = `No ${intervention.target.types.join(" / ")} element${intervention.target.surfaces ? ` with ${intervention.target.surfaces.join(" / ")} surface` : ""} in this place.`;
  } else if (requirements.some(item => item.result === "fail") || checks.some(item => item.result === "fail")) {
    status = "excluded";
    reason = [...requirements, ...checks].filter(item => item.result === "fail").map(item => item.label).join("; ");
  } else if ([...requirements, ...checks].some(item => item.result === "unknown")) {
    status = "requires-investigation";
    reason = `Unknown: ${[...requirements, ...checks].filter(item => item.result === "unknown").map(item => item.label).join(", ")}.`;
  }
  return { id: intervention.id, status, reason, eligible_targets: targets.map(element => element.id), requirements, checks };
}

export function evaluateCatalogue(place, catalogue) {
  return catalogue.interventions.map(intervention => evaluateIntervention(place, intervention));
}

// ---------- Transforms

function paramValue(intervention, name, overrides) {
  const param = intervention.params?.[name];
  if (!param) return null;
  return { value: overrides?.[name] ?? param.default, note: param.note || "" };
}

// Applies one intervention to one target element. Returns { place, error } and never mutates its input.
export function applyIntervention(place, intervention, { targetId, params } = {}) {
  const evaluation = evaluateIntervention(place, intervention);
  if (evaluation.status === "not-applicable" || evaluation.status === "excluded") {
    return { place, error: `${intervention.label}: ${evaluation.status} (${evaluation.reason})` };
  }
  const id = targetId || evaluation.eligible_targets[0];
  if (!evaluation.eligible_targets.includes(id)) return { place, error: `${intervention.label}: "${id}" is not an eligible target` };

  const next = clone(place);
  const target = next.elements.find(element => element.id === id);
  const tag = `intervention:${intervention.id}`;
  const serial = next.elements.filter(element => element.origin === tag).length + 1;
  const assumptions = [];
  let carved = null;

  for (const op of intervention.transform) {
    if (op.when_target_type && op.when_target_type !== target.type) continue;
    if (op.op === "set-surface") {
      target.surface = ev(op.to, "derived", { method: tag, replaces: target.surface });
    } else if (op.op === "carve") {
      const area = paramValue(intervention, op.area_param, params);
      if (!isKnown(target.area_m2)) return { place, error: `${intervention.label}: area of "${target.label}" is unknown. Correct it first.` };
      if (area.value > target.area_m2.value) return { place, error: `${intervention.label}: ${area.value} m² is more than "${target.label}" has (${target.area_m2.value} m²)` };
      assumptions.push({ text: `${area.value} m² design area (${area.note})`, affects: ["sealed_area_m2", "permeable_area_m2", "planted_area_m2"] });
      target.area_m2 = ev(target.area_m2.value - area.value, "derived", { method: tag, replaces: target.area_m2 });
      carved = area.value;
      next.elements.push({
        id: `${intervention.id}-${serial}-${op.new_element.type}`, type: op.new_element.type, label: op.new_element.label,
        tags: op.new_element.tags || [], layout: { ...target.layout, inserted_from: target.id }, origin: tag,
        presence: ev(true, "assumed", { method: tag }),
        surface: ev(op.new_element.surface, "assumed", { method: tag }),
        area_m2: ev(area.value, "assumed", { method: tag, note: area.note })
      });
    } else if (op.op === "add") {
      next.elements.push({
        id: `${intervention.id}-${serial}-${op.new_element.type}`, type: op.new_element.type, label: op.new_element.label,
        tags: op.new_element.tags || [], layout: { ...target.layout, inserted_from: target.id }, origin: tag,
        presence: ev(true, "assumed", { method: tag }),
        surface: ev(null, "not-applicable"), area_m2: ev(null, "not-applicable")
      });
    } else if (op.op === "reduce-count") {
      const per = paramValue(intervention, op.area_per_unit_param, params);
      if (carved === null || !per) continue;
      if (!isKnown(target.count)) {
        target.count = ev(null, "unknown", { replaces: target.count, note: "count was unknown before the change" });
        continue;
      }
      const removed = Math.min(target.count.value, Math.ceil(carved / per.value));
      assumptions.push({ text: `${per.value} m² per ${target.type === "parking" ? "parking bay" : "unit"} (${per.note})`, affects: ["parking_spaces"] });
      target.count = ev(target.count.value - removed, "derived", { method: tag, replaces: target.count });
    }
  }
  next.applied = [...(next.applied || []), { intervention_id: intervention.id, target_id: id, status: evaluation.status, assumptions }];
  return { place: next, error: null };
}

export function applyInterventions(baseline, catalogue, applied = []) {
  let place = baseline;
  const errors = [];
  for (const step of applied) {
    const intervention = catalogue.interventions.find(item => item.id === step.intervention_id);
    if (!intervention) {
      errors.push(`Unknown intervention "${step.intervention_id}"`);
      continue;
    }
    const result = applyIntervention(place, intervention, { targetId: step.target_id, params: step.params });
    if (result.error) errors.push(result.error);
    place = result.place;
  }
  return { place, errors };
}

// ---------- Effects: geometry only

export const METRICS = [
  { id: "sealed_area_m2", label: "Sealed area", unit: "m²", contributes: el => el.surface?.value === "sealed" ? "area" : null, needs: ["surface", "area_m2"] },
  { id: "permeable_area_m2", label: "Permeable area", unit: "m²", contributes: el => el.surface?.value === "permeable" ? "area" : null, needs: ["surface", "area_m2"] },
  { id: "planted_area_m2", label: "Planted area", unit: "m²", contributes: el => el.surface?.value === "planted" ? "area" : null, needs: ["surface", "area_m2"] },
  { id: "parking_spaces", label: "Parking spaces", unit: "", contributes: el => el.type === "parking" ? "count" : null, needs: ["count"] },
  { id: "tree_count", label: "Trees", unit: "", contributes: el => el.type === "tree" ? "one" : null, needs: [] }
];

// What a sponge-city effect would need but this prototype deliberately does not calculate.
export const NOT_MODELLED = [
  { id: "runoff_reduction", label: "Runoff reduction", note: "Needs a hydraulic model and a design rain event." },
  { id: "storage_volume", label: "Storage volume", note: "Needs substrate, depth and engineering design." },
  { id: "infiltration_rate", label: "Infiltration rate", note: "Needs soil tests on site." },
  { id: "cooling", label: "Cooling effect", note: "Needs a microclimate model; not inferred from area." }
];

function contribution(element, metric) {
  const kind = metric.contributes(element);
  if (element.presence?.value !== true && element.presence?.state !== "unknown") return { value: 0 };
  if (element.presence?.state === "unknown") return kind || element.surface?.state === "unknown" ? { unknown: `presence of ${element.label} unknown` } : { value: 0 };
  if (metric.needs.includes("surface") && element.surface?.state === "unknown" && element.area_m2?.state !== "not-applicable") return { unknown: `surface of ${element.label} unknown` };
  if (!kind) return { value: 0 };
  if (kind === "one") return { value: 1 };
  const field = kind === "area" ? element.area_m2 : element.count;
  return isKnown(field) ? { value: field.value } : { unknown: `${kind === "area" ? "area" : "count"} of ${element.label} unknown` };
}

export function measure(place, metric) {
  let value = 0;
  const unknowns = [];
  for (const element of place.elements) {
    const part = contribution(element, metric);
    if (part.unknown) unknowns.push(part.unknown); else value += part.value;
  }
  return unknowns.length
    ? { value: null, state: "unknown", known_part: value, note: unknowns.join("; ") }
    : { value, state: "derived" };
}

// Effects compare baseline and scenario per metric. The change is computed from the elements that
// actually differ, so unknowns elsewhere in the place cancel out instead of hiding the change.
export function computeEffects(baseline, scenario) {
  const before = new Map(baseline.elements.map(element => [element.id, element]));
  const after = new Map(scenario.elements.map(element => [element.id, element]));
  const touched = [...new Set([...before.keys(), ...after.keys()])]
    .filter(id => JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)));
  const assumptions = (scenario.applied || []).flatMap(step => step.assumptions);

  return METRICS.map(metric => {
    let delta = 0;
    const unknowns = [];
    for (const id of touched) {
      for (const [element, sign] of [[after.get(id), 1], [before.get(id), -1]]) {
        if (!element) continue;
        const part = contribution(element, metric);
        if (part.unknown) unknowns.push(part.unknown); else delta += sign * part.value;
      }
    }
    return {
      id: metric.id, label: metric.label, unit: metric.unit,
      baseline: measure(baseline, metric),
      scenario: measure(scenario, metric),
      change: unknowns.length ? { value: null, state: "unknown", note: unknowns.join("; ") } : { value: delta, state: "derived", assumptions: delta ? [...new Set(assumptions.filter(item => item.affects.includes(metric.id)).map(item => item.text))] : [] }
    };
  });
}

// ---------- Unknowns the renderer must show

export function collectUnknowns(place) {
  const out = [];
  for (const [key, value] of Object.entries(place.context || {})) {
    if (!isKnown(value) && value.state !== "not-applicable") out.push({ scope: "context", key, label: value.label || key, note: value.note || "" });
  }
  for (const element of place.elements) {
    for (const key of ["presence", "surface", "area_m2", "count"]) {
      if (element[key]?.state === "unknown") out.push({ scope: "element", key: `${element.id}.${key}`, label: `${element.label}: ${key.replace("_m2", "")}`, note: element[key].note || "" });
    }
  }
  for (const item of NOT_MODELLED) out.push({ scope: "effect", key: item.id, label: item.label, note: item.note });
  return out;
}
