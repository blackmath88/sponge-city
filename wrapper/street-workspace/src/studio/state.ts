import { BASELINE, type Baseline, type InterventionKind, isKindAllowedInSlot } from "./layout.ts";

/**
 * Proposal IDs - only A and B are valid
 */
export type ProposalId = "A" | "B";

/**
 * A placement of an intervention in a specific slot
 */
export interface Placement {
  slotId: string;
  kind: InterventionKind;
}

/**
 * A proposal with placements sorted by slotId
 */
export interface Proposal {
  id: ProposalId;
  placements: readonly Placement[];
}

/**
 * The version of the StudioState schema
 */
export const STATE_VERSION = 1 as const;

/**
 * Evidence level - fixed to "illustrative" for all StudioState
 */
export type Evidence = "illustrative";

export const EVIDENCE: Evidence = "illustrative";

/**
 * The complete StudioState
 * - version: always 1
 * - evidence: always "illustrative"
 * - placeId: opaque identifier, null for synthetic/demo
 * - baseline: deep-frozen, identical for every state
 * - proposals: record of A and B proposals
 */
export interface StudioState {
  version: typeof STATE_VERSION;
  evidence: Evidence;
  placeId: string | null;
  baseline: Baseline;
  proposals: Record<ProposalId, Proposal>;
}

/**
 * Result type for operations that can fail
 */
export type OperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Create a new StudioState with the given placeId
 * Proposals A and B start empty (no placements)
 */
export function createState(placeId: string | null): StudioState {
  const proposals: Record<ProposalId, Proposal> = {
    A: { id: "A", placements: Object.freeze([]) },
    B: { id: "B", placements: Object.freeze([]) },
  };
  
  return Object.freeze({
    version: STATE_VERSION,
    evidence: EVIDENCE,
    placeId,
    baseline: BASELINE,
    proposals: Object.freeze(proposals),
  });
}

/**
 * Check if a proposal is empty (no placements)
 */
export function isEmpty(proposal: Proposal): boolean {
  return proposal.placements.length === 0;
}

/**
 * Sort placements by slotId for deterministic ordering
 */
function sortPlacements(placements: readonly Placement[]): readonly Placement[] {
  return Object.freeze([...placements].sort((a, b) => a.slotId.localeCompare(b.slotId)));
}

/**
 * Deep clone a proposal (no shared references)
 */
function deepCloneProposal(proposal: Proposal): Proposal {
  return {
    id: proposal.id,
    placements: Object.freeze([...proposal.placements].map((p) => ({ ...p }))),
  };
}

/**
 * Create a new state with a placement added to the specified proposal
 * Returns error if slot is unknown or kind is not allowed in that slot's band
 */
export function addPlacement(
  state: StudioState,
  proposalId: ProposalId,
  slotId: string,
  kind: InterventionKind
): OperationResult<StudioState> {
  // Validate slot exists
  if (!BASELINE.slots.includes(slotId)) {
    return { ok: false, error: `Unknown slot: ${slotId}` };
  }

  // Validate kind is allowed in this slot's band
  if (!isKindAllowedInSlot(slotId, kind)) {
    return { ok: false, error: `Kind ${kind} not allowed in slot ${slotId}` };
  }

  // Check if slot already has a placement in this proposal
  const proposal = state.proposals[proposalId];
  const existing = proposal.placements.find((p) => p.slotId === slotId);
  if (existing) {
    return { ok: false, error: `Slot ${slotId} already has placement ${existing.kind} in proposal ${proposalId}` };
  }

  const newPlacement: Placement = { slotId, kind };
  const newPlacements = sortPlacements([...proposal.placements, newPlacement]);

  return {
    ok: true,
    value: Object.freeze({
      ...state,
      proposals: {
        ...state.proposals,
        [proposalId]: {
          id: proposalId,
          placements: newPlacements,
        },
      },
    }),
  };
}

/**
 * Create a new state with a placement removed from the specified proposal
 * Returns error if slot is unknown or has no placement
 */
export function removePlacement(
  state: StudioState,
  proposalId: ProposalId,
  slotId: string
): OperationResult<StudioState> {
  // Validate slot exists
  if (!BASELINE.slots.includes(slotId)) {
    return { ok: false, error: `Unknown slot: ${slotId}` };
  }

  const proposal = state.proposals[proposalId];
  const existingIndex = proposal.placements.findIndex((p) => p.slotId === slotId);
  if (existingIndex === -1) {
    return { ok: false, error: `No placement found for slot ${slotId} in proposal ${proposalId}` };
  }

  const newPlacements = Object.freeze(
    [...proposal.placements].filter((_, i) => i !== existingIndex)
  );

  return {
    ok: true,
    value: Object.freeze({
      ...state,
      proposals: {
        ...state.proposals,
        [proposalId]: {
          id: proposalId,
          placements: newPlacements,
        },
      },
    }),
  };
}

/**
 * Toggle a placement in the specified proposal:
 * - If slot is empty: add the placement
 * - If slot has the same kind: remove it
 * - If slot has a different kind: replace it with the new kind
 * Returns error if slot is unknown or kind is not allowed
 */
export function togglePlacement(
  state: StudioState,
  proposalId: ProposalId,
  slotId: string,
  kind: InterventionKind
): OperationResult<StudioState> {
  // Validate slot exists
  if (!BASELINE.slots.includes(slotId)) {
    return { ok: false, error: `Unknown slot: ${slotId}` };
  }

  // Validate kind is allowed in this slot's band
  if (!isKindAllowedInSlot(slotId, kind)) {
    return { ok: false, error: `Kind ${kind} not allowed in slot ${slotId}` };
  }

  const proposal = state.proposals[proposalId];
  const existing = proposal.placements.find((p) => p.slotId === slotId);

  if (!existing) {
    // Slot is empty, add the placement
    return addPlacement(state, proposalId, slotId, kind);
  }

  if (existing.kind === kind) {
    // Same kind, remove it
    return removePlacement(state, proposalId, slotId);
  }

  // Different kind, replace it
  const newPlacements = [...proposal.placements].map((p) =>
    p.slotId === slotId ? { slotId, kind } : p
  );

  return {
    ok: true,
    value: Object.freeze({
      ...state,
      proposals: {
        ...state.proposals,
        [proposalId]: {
          id: proposalId,
          placements: sortPlacements(Object.freeze(newPlacements)),
        },
      },
    }),
  };
}

/**
 * Clone a proposal to another proposal ID
 * A and B are fully isolated (no shared array/object references)
 */
export function cloneProposal(
  state: StudioState,
  from: ProposalId,
  to: ProposalId
): StudioState {
  if (from === to) return state;

  return Object.freeze({
    ...state,
    proposals: {
      ...state.proposals,
      [to]: deepCloneProposal(state.proposals[from]),
    },
  });
}

/**
 * Revert a proposal to baseline (empty state, matching the baseline)
 */
export function revertProposal(state: StudioState, id: ProposalId): StudioState {
  return Object.freeze({
    ...state,
    proposals: {
      ...state.proposals,
      [id]: { id, placements: Object.freeze([]) },
    },
  });
}

/**
 * Reset the entire state to baseline (both proposals empty)
 */
export function resetState(state: StudioState): StudioState {
  return createState(state.placeId);
}

/**
 * Get the difference from baseline for a proposal
 * Returns a list of added placements in deterministic order (sorted by slotId)
 */
export function diffFromBaseline(proposal: Proposal): readonly Placement[] {
  // Baseline has no placements, so all placements in the proposal are additions
  return Object.freeze([...proposal.placements].sort((a, b) => a.slotId.localeCompare(b.slotId)));
}

/**
 * Type guard to check if a value is a valid StudioState
 */
export function isStudioState(value: unknown): value is StudioState {
  if (value === null || typeof value !== "object") return false;
  const state = value as Partial<StudioState>;
  return (
    state.version === STATE_VERSION &&
    state.evidence === EVIDENCE &&
    typeof state.placeId === "string" || state.placeId === null &&
    state.baseline !== undefined &&
    state.proposals !== undefined &&
    state.proposals.A !== undefined &&
    state.proposals.B !== undefined
  );
}
