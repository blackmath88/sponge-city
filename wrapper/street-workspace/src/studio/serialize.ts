import {
  EVIDENCE,
  STATE_VERSION,
  type StudioState,
  type ProposalId,
  type Placement,
} from "./state.ts";
import { freezeState } from "./freeze.ts";
import { BASELINE, isKindAllowedInSlot, ALL_SLOT_IDS, compareStrings } from "./layout.ts";

/**
 * Serialize a StudioState to a JSON string.
 * - Stable key order
 * - Sorted placements by slotId
 * - Baseline is NOT serialized (it is regenerated on parse)
 * - Byte-identical for equal states
 */
export function serialize(state: StudioState): string {
  const { baseline, ...rest } = state;
  
  // Sort proposals by id (A, B)
  const sortedProposals: Record<ProposalId, { id: ProposalId; placements: readonly Placement[] }> = {
    A: { id: "A", placements: [...state.proposals.A.placements].sort((a, b) => compareStrings(a.slotId, b.slotId)) },
    B: { id: "B", placements: [...state.proposals.B.placements].sort((a, b) => compareStrings(a.slotId, b.slotId)) },
  };

  const serialized = {
    version: rest.version,
    evidence: rest.evidence,
    placeId: rest.placeId,
    proposals: sortedProposals,
  };

  // Stringify with stable key order
  return JSON.stringify(serialized);
}

/**
 * Parse a serialized string back to a StudioState.
 * Treats input as untrusted:
 * - Wrong version → null
 * - Evidence ≠ "illustrative" → null
 * - Unknown slot → drop invalid placements (or return null - we chose to drop)
 * - Disallowed kind → drop invalid placements
 * - Duplicate slot → drop invalid placements
 * - Non-JSON → null
 */
export function parse(raw: unknown): StudioState | null {
  // Check if it's a string
  if (typeof raw !== "string") {
    return null;
  }

  // Try to parse as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // Check it's an object
  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // Validate version
  if (obj.version !== STATE_VERSION) {
    return null;
  }

  // Validate evidence
  if (obj.evidence !== EVIDENCE) {
    return null;
  }

  // Validate placeId
  if (typeof obj.placeId !== "string" && obj.placeId !== null) {
    return null;
  }

  // Validate proposals
  if (obj.proposals === undefined || obj.proposals === null || typeof obj.proposals !== "object") {
    return null;
  }

  const proposals = obj.proposals as Record<string, unknown>;
  const proposalIds: ProposalId[] = ["A", "B"];

  // Build validated proposals
  const validatedProposals: Record<ProposalId, { id: ProposalId; placements: readonly Placement[] }> = {
    A: { id: "A", placements: Object.freeze([]) },
    B: { id: "B", placements: Object.freeze([]) },
  };

  for (const proposalId of proposalIds) {
    const propData = proposals[proposalId];
    if (propData === undefined || propData === null || typeof propData !== "object") {
      continue; // Leave as empty
    }

    const propObj = propData as Record<string, unknown>;
    const placementsRaw = propObj.placements;
    
    if (!Array.isArray(placementsRaw)) {
      continue; // Leave as empty
    }

    // Validate and filter placements
    const validPlacements: Placement[] = [];
    const seenSlots = new Set<string>();

    for (const placementRaw of placementsRaw) {
      if (placementRaw === null || typeof placementRaw !== "object") {
        continue;
      }

      const placement = placementRaw as Record<string, unknown>;
      const slotId = placement.slotId;
      const kind = placement.kind;

      // Validate slotId is a known slot
      if (typeof slotId !== "string" || !ALL_SLOT_IDS.includes(slotId)) {
        continue; // Drop invalid
      }

      // Validate kind
      if (typeof kind !== "string") {
        continue; // Drop invalid
      }

      // Check if kind is allowed in this slot
      // We need to check the type at runtime
      const allowedKinds = ["tree-trench", "rain-garden", "depave"] as const;
      if (!allowedKinds.includes(kind as typeof allowedKinds[number])) {
        continue; // Drop invalid
      }

      // Check if kind is allowed in the slot's band
      if (!isKindAllowedInSlot(slotId, kind as "tree-trench" | "rain-garden" | "depave")) {
        continue; // Drop invalid
      }

      // Check for duplicates
      if (seenSlots.has(slotId)) {
        continue; // Drop duplicate
      }
      seenSlots.add(slotId);

      validPlacements.push({ slotId, kind: kind as "tree-trench" | "rain-garden" | "depave" });
    }

    // Sort by slotId for determinism
    validPlacements.sort((a, b) => compareStrings(a.slotId, b.slotId));
    validatedProposals[proposalId] = {
      id: proposalId,
      placements: Object.freeze(validPlacements),
    };
  }

  const builtState: StudioState = {
    version: STATE_VERSION,
    evidence: EVIDENCE,
    placeId: obj.placeId as string | null,
    baseline: BASELINE,
    proposals: Object.freeze(validatedProposals),
  };

  return freezeState(builtState);
}
