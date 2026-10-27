import type { Proposal, ProposalId, StudioState } from "./state.ts";

/**
 * Deep freeze a StudioState and all its nested objects/arrays.
 * Ensures complete immutability.
 */
export function freezeState(state: StudioState): StudioState {
  // Deep freeze placements arrays and placement objects
  const frozenProposals: Record<ProposalId, Proposal> = {
    A: {
      id: "A",
      placements: Object.freeze([...state.proposals.A.placements].map((p) => Object.freeze({ ...p }))),
    },
    B: {
      id: "B",
      placements: Object.freeze([...state.proposals.B.placements].map((p) => Object.freeze({ ...p }))),
    },
  };

  Object.freeze(frozenProposals.A);
  Object.freeze(frozenProposals.B);
  Object.freeze(frozenProposals);

  return Object.freeze({
    version: state.version,
    evidence: state.evidence,
    placeId: state.placeId,
    baseline: state.baseline,
    proposals: frozenProposals,
  });
}
