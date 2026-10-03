// StateModel (adaptive-state/0.2): helpers for the routing graph and the internal state operations.
// Pure functions; inputs are never mutated. The operation vocabulary is INTERNAL (intervention-execution/0.2):
// researchers never author it — runtime/intervention-compiler.js generates it from knowledge records.
import { ev, clone, isKnown } from "./evidence.js";

export const STATE_SCHEMA_VERSION = "adaptive-state/0.2";
export const INFRASTRUCTURE_TYPES = ["gully", "downpipe", "sewer", "ground"];
export const RECEIVER_TYPES = ["rain-garden", "tree-trench"];
export const CONNECTION_MODES = ["surface-runoff", "roof-runoff", "pipe", "overflow", "infiltration"];

export const edgeId = edge => `${edge.from}→${edge.to}`;

export function elementById(state, id) {
  return state.elements.find(element => element.id === id);
}

export function connectionsFrom(state, elementId) {
  return state.connections.filter(edge => edge.from === elementId);
}

export function connectionsTo(state, elementId) {
  return state.connections.filter(edge => edge.to === elementId);
}

// Follow edges downstream (breadth-first). Returns every reachable path as a list of edges.
export function downstreamPaths(state, elementId, maxDepth = 8) {
  const paths = [];
  const walk = (node, path, seen) => {
    const out = connectionsFrom(state, node).filter(edge => !seen.has(edge.to));
    if (!out.length || path.length >= maxDepth) {
      if (path.length) paths.push(path);
      return;
    }
    for (const edge of out) walk(edge.to, [...path, edge], new Set([...seen, edge.to]));
  };
  walk(elementId, [], new Set([elementId]));
  return paths;
}

export function replaceConnection(state, oldEdge, newEdge) {
  const next = clone(state);
  const index = next.connections.findIndex(edge => edge.from === oldEdge.from && edge.to === oldEdge.to);
  if (index === -1) return { state, error: `Connection ${edgeId(oldEdge)} not found` };
  next.connections[index] = { medium: "rainwater", ...newEdge, id: edgeId(newEdge), replaces: edgeId(oldEdge) };
  return { state: next, error: null };
}

// ---------- Surface archetypes

export function archetypeById(surfaces, id) {
  return surfaces.archetypes.find(item => item.id === id) || null;
}

// Surface properties from an archetype. Defaults are "assumed"; sealed_fraction may be "derived" from stronger evidence.
export function surfaceFromArchetype(surfaces, archetypeId, { archetypeState = "assumed", method, derivedSealed = null } = {}) {
  const archetype = archetypeById(surfaces, archetypeId);
  if (!archetype) {
    return {
      archetype: ev(null, "unknown", { note: archetypeId ? `unknown archetype ${archetypeId}` : "surface unknown" }),
      sealed_fraction: ev(null, "unknown"), permeability: ev(null, "unknown"), vegetation_fraction: ev(null, "unknown"),
      depression_storage: ev(null, "unknown"), albedo: ev(null, "unknown")
    };
  }
  const p = archetype.properties;
  const assumed = value => ev(value, "assumed", { source_id: "catalogue:surfaces" });
  return {
    archetype: ev(archetype.id, archetypeState, method ? { method } : {}),
    sealed_fraction: derivedSealed || assumed(p.sealed_fraction),
    permeability: assumed(p.permeability),
    vegetation_fraction: assumed(p.vegetation_fraction),
    depression_storage: assumed(p.depression_storage),
    albedo: assumed(p.albedo)
  };
}

// ---------- Internal state operations (intervention-execution/0.2)
//
//   set-surface        { target, archetype }                     material change, defaults assumed
//   set-property       { target, path, value, state? }            e.g. "subsurface.storage_capacity"
//   split-element      { target, area_m2, element }               carve part of an element into a new one
//   add-element        { element }
//   add-connection     { edge }
//   remove-connection  { from, to }
//   replace-connection { from, to, edge }                         routing change without material change
//   adjust-count       { target, by }                             e.g. parking spaces

export function applyStateOperations(state, operations, { surfaces, origin = "intervention" } = {}) {
  let next = clone(state);
  const errors = [];
  const tag = { method: origin };
  for (const op of operations) {
    const target = op.target ? elementById(next, op.target) : null;
    if (op.target && !target) { errors.push(`${op.op}: element "${op.target}" not found`); continue; }
    switch (op.op) {
      case "set-surface": {
        if (!surfaces) { errors.push("set-surface needs the surface catalogue"); break; }
        const before = target.surface;
        target.surface = surfaceFromArchetype(surfaces, op.archetype, tag);
        target.surface.archetype.replaces = before.archetype;
        break;
      }
      case "set-property": {
        const [group, key] = op.path.split(".");
        target[group] = target[group] || {};
        target[group][key] = ev(op.value, op.state || "assumed", { ...tag, replaces: target[group][key] ?? null });
        break;
      }
      case "split-element": {
        if (!isKnown(target.area_m2)) { errors.push(`split-element: area of "${target.label}" is unknown`); break; }
        if (op.area_m2 > target.area_m2.value) { errors.push(`split-element: ${op.area_m2} m² exceeds "${target.label}" (${target.area_m2.value} m²)`); break; }
        target.area_m2 = ev(target.area_m2.value - op.area_m2, "derived", { ...tag, replaces: target.area_m2 });
        next.elements.push(withOrigin({ layout: { ...target.layout, inserted_from: target.id }, ...op.element, area_m2: ev(op.area_m2, "assumed", { ...tag, note: "design area" }) }, origin));
        break;
      }
      case "add-element":
        if (elementById(next, op.element.id)) { errors.push(`add-element: "${op.element.id}" already exists`); break; }
        next.elements.push(withOrigin(op.element, origin));
        break;
      case "add-connection":
        if (next.connections.some(edge => edge.from === op.edge.from && edge.to === op.edge.to)) break;
        next.connections.push({ medium: "rainwater", state: "assumed", ...op.edge, id: edgeId(op.edge), origin });
        break;
      case "remove-connection":
        next.connections = next.connections.filter(edge => !(edge.from === op.from && edge.to === op.to));
        break;
      case "replace-connection": {
        const result = replaceConnection(next, { from: op.from, to: op.to }, { state: "assumed", origin, ...op.edge });
        if (result.error) errors.push(`replace-connection: ${result.error}`); else next = result.state;
        break;
      }
      case "adjust-count":
        if (!isKnown(target.count)) { target.count = ev(null, "unknown", { replaces: target.count ?? null, note: "count unknown before the change" }); break; }
        target.count = ev(Math.max(0, target.count.value + op.by), "derived", { ...tag, replaces: target.count });
        break;
      default:
        errors.push(`Unknown state operation "${op.op}"`);
    }
  }
  return { state: next, errors };
}

function withOrigin(element, origin) {
  return { origin, presence: ev(true, "assumed", { method: origin }), ...element };
}
