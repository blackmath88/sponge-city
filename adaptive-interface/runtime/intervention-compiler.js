// Intervention compiler: researcher-facing knowledge (intervention-knowledge/0.1) + State + target
// → executable state operations (applied by runtime/state-ops.js).
//
// Knowledge records say WHAT an intervention is, WHY, and what it NEEDS. HOW it changes state lives
// here, in RECIPES, together with the design assumptions (areas, bay sizes) it has to make.
// A knowledge record without a recipe is still listed, as "knowledge only — not executable yet".
import { ev, isKnown } from "./evidence.js";
import { connectionsFrom } from "./state-graph.js";
import { setSurfaceOp, carveOps, reduceCountOps, newElement, redirectOps, nextSerial } from "./state-ops.js";

// Design assumptions. Always reported as "assumed" in the applied step.
const DESIGN = {
  depave: { area_m2: { default: 20, note: "design choice for the scenario" } },
  "tree-trench": { area_m2: { default: 10, note: "trench footprint, design choice" } },
  "rain-garden": { area_m2: { default: 12, note: "design choice for the scenario" } },
  parking_bay_m2: { default: 12.5, note: "one parking bay ≈ 12.5 m²" }
};

const design = (id, name, params) => {
  const spec = DESIGN[id]?.[name] || DESIGN[name];
  return { value: params?.[name] ?? spec.default, note: spec.note };
};

const lookup = (state, key) => {
  const [group, name] = key.split(".");
  return group === "context" ? state.context?.[name] : undefined;
};

// ---------- Targets and status

export function knowledgeTargets(state, record) {
  const { element_types: types = [], surface_classes: classes = null } = record.applies_to || {};
  return state.elements.filter(element =>
    element.kind === "area" && element.presence?.value === true && !element.fixed && types.includes(element.type) &&
    (!classes || (isKnown(element.surface.class) && classes.includes(element.surface.class.value))));
}

const receivers = (state, record) => state.elements.filter(element =>
  (record.applies_to?.receives_into || []).includes(element.type) && element.presence?.value === true);

export function assessKnowledge(record, state) {
  const executable = Boolean(RECIPES[record.id]);
  let targets = knowledgeTargets(state, record);
  const requirements = (record.requirements || []).map(rule => {
    if (!rule.state_key) return { label: rule.label, result: "unknown", note: "no state key: needs expert review" };
    const value = lookup(state, rule.state_key);
    if (!isKnown(value)) return { label: rule.label, state_key: rule.state_key, result: "unknown", value: value ?? ev(null, "unknown", { note: "not provided" }) };
    if ((rule.excluded_when || []).includes(value.value)) return { label: rule.label, state_key: rule.state_key, result: "fail", value };
    return { label: rule.label, state_key: rule.state_key, result: "pass", value };
  });
  let status = "candidate";
  let reason = "All requirements are known and pass.";
  const needsReceiver = (record.applies_to?.receives_into || []).length > 0;
  if (!targets.length) {
    status = "not-applicable";
    reason = `No ${(record.applies_to?.element_types || []).join(" / ")} element${record.applies_to?.surface_classes ? ` with ${record.applies_to.surface_classes.join(" / ")} surface` : ""} in this place.`;
  } else if (needsReceiver && !receivers(state, record).length) {
    status = "not-applicable";
    reason = `Needs a ${record.applies_to.receives_into.join(" or ")} to receive the water. Add one first.`;
    targets = [];
  } else if (requirements.some(item => item.result === "fail")) {
    status = "excluded";
    reason = requirements.filter(item => item.result === "fail").map(item => item.label).join("; ");
  } else if (requirements.some(item => item.result === "unknown")) {
    status = "requires-investigation";
    reason = `Unknown: ${requirements.filter(item => item.result === "unknown").map(item => item.label).join(", ")}.`;
  }
  // Knowledge without a recipe stays visible, but cannot be applied: say so instead of offering targets.
  if (!executable) {
    reason = `Knowledge only: no executable recipe yet. ${status === "candidate" ? "" : `Would be ${status}: ${reason}`}`.trim();
    status = "no-recipe";
  }
  return { id: record.id, status, reason, eligible_targets: targets.map(element => element.id), requirements, checks: [], executable };
}

// ---------- Recipes: knowledge id → (state, target, context) → { operations, assumptions } | { error }

function carveAndConnect(ctx, { type, label, surfaceClass, archetype, surfaceOverrides, withTree }) {
  const { state, target, tag, serial, record, params, surfaces } = ctx;
  const area = design(record.id, "area_m2", params);
  const carve = carveOps(state, target, { area, tag, surfaces, id: `${record.id}-${serial}-${type}`, type, label, surfaceClass, archetype, surfaceOverrides });
  if (carve.error) return carve;
  const operations = [...carve.operations];
  const assumptions = [...carve.assumptions];
  if (withTree) {
    operations.push({ op: "add-element", element: newElement(state, target, {
      id: `${record.id}-${serial}-tree`, type: "tree", label: "New tree (scenario)", tag, surfaces,
      vegetation: { canopy_area: ev("low", "assumed", { note: "young tree; canopy grows over years" }), rooted_in: carve.element.id }
    }) });
  }
  // The remaining paving drains into the new element; its old drain becomes the overflow.
  const redirect = redirectOps(state, target.id, carve.element.id, tag, "design assumption: surrounding paving drains here");
  operations.push(...redirect.operations);
  for (const to of redirect.previous) operations.push({ op: "add-connection", edge: { from: carve.element.id, to, medium: "rainwater", mode: "overflow", state: "assumed", method: tag } });
  if (connectionsFrom(state, target.id).length) assumptions.push({ text: `${target.label} drains into the ${label.toLowerCase()}; overflow to the existing drain`, affects: ["routing"] });
  else assumptions.push({ text: `${target.label} drains into the ${label.toLowerCase()}; where it overflows is unknown`, affects: ["routing"] });
  if (target.type === "parking") {
    const count = reduceCountOps(target, area.value, design(record.id, "parking_bay_m2", params), tag);
    operations.push(...count.operations);
    assumptions.push(...count.assumptions);
  }
  return { operations, assumptions };
}

const RECIPES = {
  depave(ctx) {
    const { state, target, tag, serial, record, params, surfaces } = ctx;
    const area = design(record.id, "area_m2", params);
    const carve = carveOps(state, target, { area, tag, surfaces, id: `${record.id}-${serial}-vegetation`, type: "vegetation", label: "Depaved planting bed", surfaceClass: "planted", archetype: "planted-soil" });
    if (carve.error) return carve;
    const operations = [...carve.operations];
    const assumptions = [...carve.assumptions];
    if (target.type === "parking") {
      const count = reduceCountOps(target, area.value, design(record.id, "parking_bay_m2", params), tag);
      operations.push(...count.operations);
      assumptions.push(...count.assumptions);
    }
    return { operations, assumptions };
  },
  "permeable-parking"({ target, tag, surfaces }) {
    return { operations: [setSurfaceOp(target, "permeable-paving", "permeable", tag, surfaces)], assumptions: [] };
  },
  "green-roof"({ target, tag, surfaces }) {
    return { operations: [setSurfaceOp(target, "green-roof", "planted", tag, surfaces)], assumptions: [{ text: "roof drainage stays connected to the downpipe", affects: ["routing"] }] };
  },
  "rain-garden"(ctx) {
    return carveAndConnect(ctx, {
      type: "rain-garden", label: "Rain garden", surfaceClass: "planted", archetype: "planted-soil",
      surfaceOverrides: { depression_storage: ev("high", "assumed", { method: ctx.tag, note: "shallow planted depression" }) }
    });
  },
  "tree-trench"(ctx) {
    return carveAndConnect(ctx, { type: "tree-trench", label: "Tree trench", surfaceClass: "planted", archetype: "tree-bed", withTree: true });
  },
  "curb-cut"({ state, target, tag, record, params }) {
    const options = receivers(state, record);
    const receiver = options.find(element => element.id === params?.receiver_id) || options[0];
    if (!receiver) return { error: `needs a ${record.applies_to.receives_into.join(" or ")} to receive the water. Add one first.` };
    const current = connectionsFrom(state, target.id);
    if (current.length && current.every(edge => edge.to === receiver.id)) return { error: `${target.label} already drains into ${receiver.label}` };
    const redirect = redirectOps(state, target.id, receiver.id, tag, "curb cut");
    return {
      operations: redirect.operations,
      assumptions: [{ text: `all runoff from ${target.label} is redirected into ${receiver.label} (the real share depends on slope)`, affects: ["routing"] }]
    };
  }
};

export const COMPILABLE = Object.keys(RECIPES);

// knowledge record + state + target → { operations, applied } | { error }
export function compileIntervention(record, state, targetId, { params = null, surfaces = null } = {}) {
  if (!RECIPES[record.id]) return { error: `${record.label}: knowledge only, no executable recipe yet` };
  const assessment = assessKnowledge(record, state);
  if (assessment.status === "not-applicable" || assessment.status === "excluded") return { error: `${record.label}: ${assessment.status} (${assessment.reason})` };
  const id = targetId || assessment.eligible_targets[0];
  if (!assessment.eligible_targets.includes(id)) return { error: `${record.label}: "${id}" is not an eligible target` };
  const target = state.elements.find(element => element.id === id);
  const tag = `intervention:${record.id}`;
  const result = RECIPES[record.id]({ state, target, tag, serial: nextSerial(state, tag), record, params, surfaces });
  if (result.error) return { error: `${record.label}: ${result.error}` };
  return {
    intervention_id: record.id,
    target_id: id,
    operations: result.operations,
    applied: { intervention_id: record.id, target_id: id, status: assessment.status, assumptions: result.assumptions }
  };
}
