// The ONE execution path for interventions: State + operations → new State.
//
//   legacy catalogue (intervention-catalog/0.1) ─ legacy adapter ─┐
//                                                                 ├─▶ operations ─▶ applyStateOperations ─▶ new State
//   intervention knowledge (0.1) ─────────────── compiler ────────┘
//
// Operations are an internal, versionless format. Nobody outside runtime/ authors them.
//   { op: "set-surface",        target, surface: { class, material, ...properties }, subsurface? }
//   { op: "set-property",       target, path: "area_m2" | "count" | "<group>.<key>", value: evidence }
//   { op: "add-element",        element }                       (a full StateModel element)
//   { op: "add-connection",     edge }
//   { op: "remove-connection",  edge }
//   { op: "replace-connection", from: edge, to: edge }
import { ev, clone, isKnown } from "./evidence.js";
import { addConnection, removeConnection, replaceConnection, connectionsFrom } from "./state-graph.js";
import { archetypeState, elementToState } from "./place-to-state.js";

const APPLY = {
  "set-surface"(state, op) {
    const element = find(state, op.target);
    element.surface = clone(op.surface);
    if (op.subsurface) element.subsurface = { ...element.subsurface, ...clone(op.subsurface) };
  },
  "set-property"(state, op) {
    const element = find(state, op.target);
    const [group, key] = op.path.includes(".") ? op.path.split(".") : [null, op.path];
    if (group) element[group] = { ...(element[group] || {}), [key]: clone(op.value) };
    else element[key] = clone(op.value);
  },
  "add-element"(state, op) {
    if (state.elements.some(element => element.id === op.element.id)) throw new Error(`Element "${op.element.id}" already exists`);
    state.elements.push(clone(op.element));
  },
  "add-connection"(state, op) { state.connections = addConnection(state, clone(op.edge)).connections; },
  "remove-connection"(state, op) { state.connections = removeConnection(state, op.edge).connections; },
  "replace-connection"(state, op) { state.connections = replaceConnection(state, op.from, clone(op.to)).connections; }
};

function find(state, id) {
  const element = state.elements.find(item => item.id === id);
  if (!element) throw new Error(`No element "${id}" in state`);
  return element;
}

// Pure: never mutates `state`. Throws on an invalid operation (compilers only emit valid ones).
export function applyStateOperations(state, operations) {
  const next = clone(state);
  for (const op of operations) {
    const apply = APPLY[op.op];
    if (!apply) throw new Error(`Unknown state operation "${op.op}"`);
    apply(next, op);
  }
  return next;
}

// An executable = { operations, applied: { intervention_id, target_id, status, assumptions } }.
export function applyExecutable(state, executable) {
  const next = applyStateOperations(state, executable.operations);
  next.applied = [...(next.applied || []), clone(executable.applied)];
  return next;
}

// ---------- Operation builders shared by the legacy adapter and the knowledge compiler

export const nextSerial = (state, tag) => state.elements.filter(element => element.origin === tag).length + 1;

export function setSurfaceOp(target, archetypeId, surfaceClass, tag, surfaces, { surfaceOverrides = {}, subsurfaceOverrides = {} } = {}) {
  const defaults = archetypeState(archetypeId, surfaces, { method: tag });
  return {
    op: "set-surface",
    target: target.id,
    surface: {
      class: ev(surfaceClass, "derived", { method: tag, replaces: target.surface.class }),
      material: ev(archetypeId, "assumed", { method: tag, replaces: target.surface.material }),
      ...defaults.surface,
      ...surfaceOverrides
    },
    subsurface: { ...defaults.subsurface, ...subsurfaceOverrides }
  };
}

// A new element placed next to / inside its parent. Everything about it is assumed.
export function newElement(state, parent, { id, type, label, tags = [], tag, surfaceClass = null, area = null, archetype = null, surfaces, vegetation = null, surfaceOverrides, subsurfaceOverrides }) {
  const placeShape = {
    id, type, label, tags, layout: { ...(parent.layout || {}), inserted_from: parent.id }, origin: tag,
    presence: ev(true, "assumed", { method: tag }),
    surface: surfaceClass ? ev(surfaceClass, "assumed", { method: tag }) : ev(null, "not-applicable"),
    area_m2: area ? ev(area.value, "assumed", { method: tag, note: area.note }) : ev(null, "not-applicable")
  };
  return elementToState(placeShape, state.context, surfaces, { archetype, vegetation, surfaceOverrides, subsurfaceOverrides });
}

// Take `area` m² out of `target` for a new element. Returns { operations, assumptions, element } or { error }.
export function carveOps(state, target, { area, tag, ...spec }) {
  if (!isKnown(target.area_m2)) return { error: `area of "${target.label}" is unknown. Correct it first.` };
  if (area.value > target.area_m2.value) return { error: `${area.value} m² is more than "${target.label}" has (${target.area_m2.value} m²)` };
  const element = newElement(state, target, { ...spec, area, tag });
  return {
    element,
    operations: [
      { op: "set-property", target: target.id, path: "area_m2", value: ev(target.area_m2.value - area.value, "derived", { method: tag, replaces: target.area_m2 }) },
      { op: "add-element", element }
    ],
    assumptions: [{ text: `${area.value} m² design area (${area.note})`, affects: ["sealed_area_m2", "permeable_area_m2", "planted_area_m2"] }]
  };
}

// Units (e.g. parking bays) lost on a carved area.
export function reduceCountOps(target, carved, per, tag) {
  if (!isKnown(target.count)) {
    return { operations: [{ op: "set-property", target: target.id, path: "count", value: ev(null, "unknown", { replaces: target.count ?? null, note: "count was unknown before the change" }) }], assumptions: [] };
  }
  const removed = Math.min(target.count.value, Math.ceil(carved / per.value));
  return {
    operations: [{ op: "set-property", target: target.id, path: "count", value: ev(target.count.value - removed, "derived", { method: tag, replaces: target.count }) }],
    assumptions: [{ text: `${per.value} m² per ${target.type === "parking" ? "parking bay" : "unit"} (${per.note})`, affects: ["parking_spaces"] }]
  };
}

// Send everything `fromId` drains into `toId`. Existing edges are replaced (the first) or removed (the rest).
// Returns the operations and the old destinations, so callers can keep them as overflow.
export function redirectOps(state, fromId, toId, tag, note) {
  const edge = { from: fromId, to: toId, medium: "rainwater", mode: "surface-runoff", state: "assumed", method: tag, note };
  const existing = connectionsFrom(state, fromId).filter(item => item.to !== toId);
  if (!existing.length) return { operations: [{ op: "add-connection", edge }], previous: [] };
  return {
    operations: existing.map((old, i) => i === 0 ? { op: "replace-connection", from: old, to: edge } : { op: "remove-connection", edge: old }),
    previous: [...new Set(existing.map(item => item.to))]
  };
}
