// Intervention compiler: researcher-facing knowledge (intervention-knowledge/0.1) + a target in the StateModel
// → executable state operations (intervention-execution/0.2, internal).
//
// Researchers describe WHAT an intervention is and needs. The recipe library below says HOW it changes state.
// A knowledge record without a recipe is kept and listed, but cannot be applied yet ("no-recipe").
import { ev, isKnown } from "./evidence.js";
import { elementById, connectionsFrom, surfaceFromArchetype, archetypeById, RECEIVER_TYPES } from "./state-model.js";

export const EXECUTION_SCHEMA_VERSION = "intervention-execution/0.2";
const PARKING_BAY_M2 = { value: 12.5, note: "one parking bay ≈ 12.5 m² (assumed)" };

const sealedHigh = el => el.surface?.sealed_fraction?.value === "high";
const nextId = (state, base) => { let n = 1; while (elementById(state, `${base}-${n}`)) n += 1; return `${base}-${n}`; };
const gullyEdge = (state, el) => connectionsFrom(state, el.id).find(edge => ["surface-runoff", "overflow"].includes(edge.mode) && elementById(state, edge.to)?.type === "gully");
const fromContext = (state, key) => state.context?.[key] ? JSON.parse(JSON.stringify(state.context[key])) : ev(null, "unknown");

function groundSubsurface(state, surfaces, archetypeId) {
  const p = archetypeById(surfaces, archetypeId).properties;
  return {
    infiltration_capacity: fromContext(state, "infiltration_capacity"),
    storage_capacity: ev(p.storage_capacity, "assumed", { source_id: "catalogue:surfaces" }),
    rootable_volume: ev(p.rootable_volume, "assumed", { source_id: "catalogue:surfaces" }),
    utility_conflict: fromContext(state, "utilities"),
    groundwater_constraint: fromContext(state, "groundwater_protection_zone")
  };
}

function plantedElement(state, surfaces, { id, type, label, archetype, target }) {
  return {
    id, type, label, layout: { ...(target.layout || {}), inserted_from: target.id },
    surface: surfaceFromArchetype(surfaces, archetype),
    subsurface: groundSubsurface(state, surfaces, archetype),
    vegetation: { canopy: ev("none", "assumed"), soil_water_available: fromContext(state, "soil_water") }
  };
}

function bayLoss(target, area, assumptions) {
  if (target.type !== "parking") return [];
  assumptions.push(PARKING_BAY_M2.note);
  return [{ op: "adjust-count", target: target.id, by: -Math.ceil(area / PARKING_BAY_M2.value) }];
}

// Carve part of a sealed surface into a receiver, route the rest of the surface into it, overflow to the sewer.
function receiverRecipe({ type, label, archetype, area, withTree }) {
  return {
    eligible: el => sealedHigh(el) && isKnown(el.area_m2) ? true : `needs a sealed surface with known area`,
    compile(state, target, surfaces) {
      const assumptions = [`${area} m² design area (assumed)`];
      const id = nextId(state, type);
      const operations = [
        { op: "split-element", target: target.id, area_m2: Math.min(area, target.area_m2.value), element: plantedElement(state, surfaces, { id, type, label, archetype, target }) },
        { op: "add-connection", edge: { from: id, to: "ground", mode: "infiltration" } },
        { op: "add-connection", edge: { from: id, to: "sewer", mode: "overflow" } }
      ];
      const drain = gullyEdge(state, target);
      if (drain) operations.push({ op: "replace-connection", from: drain.from, to: drain.to, edge: { from: target.id, to: id, mode: "surface-runoff" } });
      if (withTree) {
        assumptions.push("young tree: canopy low (assumed)");
        operations.push({ op: "add-element", element: {
          id: nextId(state, "tree-new"), type: "tree", label: "New tree (scenario)", layout: { ...(target.layout || {}), inserted_from: target.id },
          area_m2: ev(null, "not-applicable"), surface: null,
          subsurface: { ...groundSubsurface(state, surfaces, "tree-bed"), storage_capacity: ev("high", "assumed", { note: "roots in the trench" }) },
          vegetation: { canopy: ev("low", "assumed", { note: "young tree" }), soil_water_available: fromContext(state, "soil_water") }
        } });
      }
      operations.push(...bayLoss(target, area, assumptions));
      return { operations, assumptions };
    }
  };
}

export const RECIPES = {
  "depave": {
    eligible: el => sealedHigh(el) && isKnown(el.area_m2) ? true : "needs a sealed surface with known area",
    compile(state, target, surfaces) {
      const area = Math.min(20, target.area_m2.value);
      const assumptions = [`${area} m² design area (assumed)`];
      const id = nextId(state, "depaved");
      return {
        operations: [
          { op: "split-element", target: target.id, area_m2: area, element: plantedElement(state, surfaces, { id, type: "vegetation", label: "Depaved planting bed", archetype: "planted-soil", target }) },
          { op: "add-connection", edge: { from: id, to: "ground", mode: "infiltration" } },
          ...bayLoss(target, area, assumptions)
        ],
        assumptions
      };
    }
  },
  "permeable-parking": {
    eligible: el => el.type === "parking" && sealedHigh(el) ? true : "needs sealed parking",
    compile(state, target) {
      const drain = gullyEdge(state, target);
      return {
        operations: [
          { op: "set-surface", target: target.id, archetype: "permeable-paving" },
          { op: "add-connection", edge: { from: target.id, to: "ground", mode: "infiltration" } },
          ...(drain ? [{ op: "replace-connection", from: drain.from, to: drain.to, edge: { from: drain.from, to: drain.to, mode: "overflow" } }] : [])
        ],
        assumptions: ["permeable paving properties from the surface catalogue (assumed)"]
      };
    }
  },
  "curb-cut": {
    eligible: (el, state) => {
      if (!gullyEdge(state, el)) return "needs a surface that drains to a gully";
      return receiversFor(state, el).length ? true : "needs a rain garden or tree trench to receive the water";
    },
    compile(state, target) {
      const receiver = receiversFor(state, target)[0];
      const drain = gullyEdge(state, target);
      return {
        operations: [{ op: "replace-connection", from: drain.from, to: drain.to, edge: { from: target.id, to: receiver.id, mode: "surface-runoff" } }],
        assumptions: [`runoff of ${target.label} reaches ${receiver.label} through the opening (assumed)`]
      };
    }
  },
  "tree-trench": receiverRecipe({ type: "tree-trench", label: "Tree trench (Baumrigole)", archetype: "tree-bed", area: 12, withTree: true }),
  "rain-garden": receiverRecipe({ type: "rain-garden", label: "Rain garden", archetype: "planted-soil", area: 12, withTree: false }),
  "green-roof": {
    eligible: el => el.type === "building" && el.surface?.archetype?.value !== "green-roof" ? true : "needs a building without a green roof",
    compile(state, target) {
      const downpipe = connectionsFrom(state, target.id).find(edge => edge.mode === "roof-runoff");
      return {
        operations: [
          { op: "set-surface", target: target.id, archetype: "green-roof" },
          { op: "set-property", target: target.id, path: "subsurface.storage_capacity", value: "medium", state: "assumed" },
          ...(downpipe ? [{ op: "replace-connection", from: downpipe.from, to: downpipe.to, edge: { from: downpipe.from, to: downpipe.to, mode: "overflow" } }] : [])
        ],
        assumptions: ["green-roof build-up from the surface catalogue (assumed); roof structure not checked"]
      };
    }
  }
};

// Receivers carved from this element first, then any receiver in the place.
function receiversFor(state, el) {
  const receivers = state.elements.filter(item => RECEIVER_TYPES.includes(item.type) && item.presence?.value !== false);
  return [...receivers.filter(item => item.layout?.inserted_from === el.id), ...receivers.filter(item => item.layout?.inserted_from !== el.id)];
}

function evidenceCheck(state, rule) {
  if (!rule.evidence) return { id: rule.id, label: rule.label, result: "to-verify" };
  const [scope, key] = rule.evidence.split(".");
  const value = scope === "context" ? state.context?.[key] : null;
  if (!isKnown(value)) return { id: rule.id, label: rule.label, evidence: rule.evidence, result: "unknown" };
  if (Array.isArray(rule.exclude_if) && rule.exclude_if.includes(value.value)) return { id: rule.id, label: rule.label, evidence: rule.evidence, result: "fail", value: value.value };
  return { id: rule.id, label: rule.label, evidence: rule.evidence, result: "known", value: value.value };
}

export function eligibleTargets(knowledge, state) {
  const recipe = RECIPES[knowledge.id];
  const reasons = new Set();
  const targets = state.elements.filter(el => {
    if (el.presence?.value !== true || el.fixed || !knowledge.applies_to.includes(el.type)) return false;
    if (!recipe) return true;
    const ok = recipe.eligible(el, state);
    if (ok !== true) reasons.add(ok);
    return ok === true;
  });
  return { targets, reasons: [...reasons] };
}

export function evaluateKnowledge(knowledge, state) {
  const { targets, reasons } = eligibleTargets(knowledge, state);
  const requirements = knowledge.requirements.map(rule => evidenceCheck(state, rule));
  const constraints = knowledge.constraints.map(rule => evidenceCheck(state, rule));
  let status;
  let reason;
  if (!RECIPES[knowledge.id]) { status = "no-recipe"; reason = "Knowledge recorded; no executable recipe yet."; }
  else if (!targets.length) { status = "not-applicable"; reason = `No suitable ${knowledge.applies_to.join(" / ")}${reasons.length ? `: ${reasons.join("; ")}` : ""}.`; }
  else if ([...requirements, ...constraints].some(item => item.result === "fail")) { status = "excluded"; reason = [...requirements, ...constraints].filter(item => item.result === "fail").map(item => item.label).join("; "); }
  else if (requirements.some(item => item.result !== "known") || constraints.some(item => item.result === "unknown")) {
    status = "requires-investigation";
    reason = `To clarify: ${[...requirements.filter(item => item.result !== "known"), ...constraints.filter(item => item.result === "unknown")].map(item => item.label).join(", ")}.`;
  } else { status = "candidate"; reason = "All linked evidence is known and passes."; }
  return { id: knowledge.id, status, reason, eligible_targets: targets.map(el => el.id), requirements, constraints };
}

export function compileIntervention(knowledge, state, targetId, { surfaces } = {}) {
  const evaluation = evaluateKnowledge(knowledge, state);
  const base = { schema_version: EXECUTION_SCHEMA_VERSION, intervention_id: knowledge.id, status: evaluation.status, reason: evaluation.reason, operations: [], assumptions: [] };
  if (["no-recipe", "not-applicable", "excluded"].includes(evaluation.status)) return { ...base, target_id: targetId || null, error: `${knowledge.label}: ${evaluation.status} (${evaluation.reason})` };
  const id = targetId || evaluation.eligible_targets[0];
  if (!evaluation.eligible_targets.includes(id)) return { ...base, target_id: id, error: `${knowledge.label}: "${id}" is not a suitable target` };
  const compiled = RECIPES[knowledge.id].compile(state, elementById(state, id), surfaces);
  return { ...base, target_id: id, operations: compiled.operations, assumptions: compiled.assumptions, error: null };
}
