// Water-routing graph over a StateModel. Connections are typed edges:
//
//   { from, to, medium: "rainwater", mode: "surface-runoff" | "roof-drainage" | "pipe" | "overflow", state, ... }
//
// Routing is state: a curb cut changes these edges without changing any surface material.
// All helpers are pure; the ones that "change" the graph return a new state.

export const NETWORK_TYPES = ["gully", "downpipe", "sewer", "overflow"];

export const edgeLabel = edge => `connection:${edge.from}→${edge.to}`;

const matches = (edge, query) => edge.from === query.from && edge.to === query.to && (!query.mode || edge.mode === query.mode);

export const connectionsFrom = (state, elementId) => (state.connections || []).filter(edge => edge.from === elementId);

export const connectionsTo = (state, elementId) => (state.connections || []).filter(edge => edge.to === elementId);

export function addConnection(state, edge) {
  return { ...state, connections: [...(state.connections || []), edge] };
}

export function removeConnection(state, edge) {
  const index = (state.connections || []).findIndex(item => matches(item, edge));
  if (index < 0) throw new Error(`No connection ${edge.from}→${edge.to} to remove`);
  return { ...state, connections: state.connections.filter((_, i) => i !== index) };
}

export function replaceConnection(state, oldEdge, newEdge) {
  const index = (state.connections || []).findIndex(item => matches(item, oldEdge));
  if (index < 0) throw new Error(`No connection ${oldEdge.from}→${oldEdge.to} to replace`);
  return { ...state, connections: state.connections.map((item, i) => i === index ? newEdge : item) };
}
