// Compatibility adapter for intervention-catalog/0.1 (PR #3's executable prototype catalogue).
//
// It no longer executes anything itself: it compiles the 0.1 `transform` list into the same state
// operations the knowledge compiler emits, and runtime/state-ops.js applies them. New work should
// target intervention-knowledge/0.1; this file exists so the 0.1 catalogue keeps working.
import { isKnown, unknown } from "./evidence.js";
import { stateToPlace, archetypeFor } from "./place-to-state.js";
import { setSurfaceOp, carveOps, reduceCountOps, newElement, nextSerial } from "./state-ops.js";

// ---------- Status (candidate / requires-investigation / excluded / not-applicable), on PlaceModel 0.1

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

// ---------- Compile: 0.1 transform list → state operations

function paramValue(intervention, name, overrides) {
  const param = intervention.params?.[name];
  if (!param) return null;
  return { value: overrides?.[name] ?? param.default, note: param.note || "" };
}

export function compileLegacyIntervention(intervention, state, { targetId, params, surfaces = null } = {}) {
  const evaluation = evaluateIntervention(stateToPlace(state), intervention);
  if (evaluation.status === "not-applicable" || evaluation.status === "excluded") {
    return { error: `${intervention.label}: ${evaluation.status} (${evaluation.reason})` };
  }
  const id = targetId || evaluation.eligible_targets[0];
  if (!evaluation.eligible_targets.includes(id)) return { error: `${intervention.label}: "${id}" is not an eligible target` };

  const target = state.elements.find(element => element.id === id);
  const tag = `intervention:${intervention.id}`;
  const serial = nextSerial(state, tag);
  const operations = [];
  const assumptions = [];
  let carved = null;

  for (const op of intervention.transform) {
    if (op.when_target_type && op.when_target_type !== target.type) continue;
    if (op.op === "set-surface") {
      operations.push(setSurfaceOp(target, archetypeFor(target.type, op.to), op.to, tag, surfaces));
    } else if (op.op === "carve") {
      const area = paramValue(intervention, op.area_param, params);
      const spec = op.new_element;
      const result = carveOps(state, target, {
        area, tag, surfaces, id: `${intervention.id}-${serial}-${spec.type}`, type: spec.type, label: spec.label, tags: spec.tags || [], surfaceClass: spec.surface
      });
      if (result.error) return { error: `${intervention.label}: ${result.error}` };
      operations.push(...result.operations);
      assumptions.push(...result.assumptions);
      carved = area.value;
    } else if (op.op === "add") {
      const spec = op.new_element;
      operations.push({ op: "add-element", element: newElement(state, target, {
        id: `${intervention.id}-${serial}-${spec.type}`, type: spec.type, label: spec.label, tags: spec.tags || [], tag, surfaces,
        vegetation: spec.type === "tree" ? { canopy_area: { value: "low", state: "assumed", note: "young tree" } } : null
      }) });
    } else if (op.op === "reduce-count") {
      const per = paramValue(intervention, op.area_per_unit_param, params);
      if (carved === null || !per) continue;
      const result = reduceCountOps(target, carved, per, tag);
      operations.push(...result.operations);
      assumptions.push(...result.assumptions);
    }
  }
  return { operations, applied: { intervention_id: intervention.id, target_id: id, status: evaluation.status, assumptions } };
}
