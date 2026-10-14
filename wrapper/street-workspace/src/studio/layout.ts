/**
 * Schematic street layout for the Studio.
 * This is a fixed, not-to-scale representation with bands and slots.
 * scale: "schematic" - no real geometry, no metres, no areas.
 */

/**
 * Intervention kinds - exactly the catalogue ids from intervention-knowledge.json
 */
export type InterventionKind = "tree-trench" | "rain-garden" | "depave";

export const SCALE = "schematic" as const;

/**
 * Band IDs for the schematic street.
 * These represent different sections of a typical street cross-section.
 */
export const BAND_IDS = [
  "gehweg-nord",
  "parkierung",
  "fahrbahn",
  "gehweg-sued",
] as const;

/**
 * Allowed intervention kinds per band.
 * Based on intervention-knowledge.json:
 * - sidewalk (gehweg-nord, gehweg-sued) → tree-trench, rain-garden, depave
 *   (these apply to element_types: ["sidewalk", "parking"])
 * - parking (parkierung) → tree-trench, rain-garden, depave
 *   (these apply to element_types: ["sidewalk", "parking"])
 * - road (fahrbahn) → none (no interventions apply to "road" element_type)
 */
export const ALLOWED_KINDS: Record<(typeof BAND_IDS)[number], readonly InterventionKind[]> = {
  "gehweg-nord": ["tree-trench", "rain-garden", "depave"],
  "parkierung": ["tree-trench", "rain-garden", "depave"],
  "fahrbahn": [],
  "gehweg-sued": ["tree-trench", "rain-garden", "depave"],
} as const;

/**
 * Slot IDs per band.
 * Each band has a small fixed number of slots with stable string IDs.
 * Format: {band}-{number}
 */
export const SLOTS_PER_BAND: Record<(typeof BAND_IDS)[number], readonly string[]> = {
  "gehweg-nord": ["gehweg-nord-1", "gehweg-nord-2", "gehweg-nord-3"],
  "parkierung": ["parkierung-1", "parkierung-2", "parkierung-3", "parkierung-4"],
  "fahrbahn": ["fahrbahn-1", "fahrbahn-2"],
  "gehweg-sued": ["gehweg-sued-1", "gehweg-sued-2", "gehweg-sued-3"],
} as const;

/**
 * All slot IDs in the layout, flattened.
 */
export const ALL_SLOT_IDS: readonly string[] = [
  ...SLOTS_PER_BAND["gehweg-nord"],
  ...SLOTS_PER_BAND["parkierung"],
  ...SLOTS_PER_BAND["fahrbahn"],
  ...SLOTS_PER_BAND["gehweg-sued"],
] as const;

/**
 * Get the band for a given slot ID.
 * Returns null if the slot is not found (should not happen with valid slots).
 */
export function getBandForSlot(slotId: string): (typeof BAND_IDS)[number] | null {
  for (const band of BAND_IDS) {
    if (SLOTS_PER_BAND[band].includes(slotId as string)) {
      return band;
    }
  }
  return null;
}

/**
 * Deterministic string comparison using code-point order.
 * Used instead of localeCompare for consistent sorting across all locales.
 */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Check if a kind is allowed in the band containing the given slot.
 * Returns false for unknown slots or disallowed kinds.
 */
export function isKindAllowedInSlot(slotId: string, kind: InterventionKind): boolean {
  const band = getBandForSlot(slotId);
  if (band === null) return false;
  return ALLOWED_KINDS[band].includes(kind);
}

/**
 * Baseline layout type - immutable definition of the street schematic.
 */
export interface Baseline {
  scale: typeof SCALE;
  bands: typeof BAND_IDS;
  slots: readonly string[];
}

/**
 * The fixed schematic baseline for all StudioState instances.
 * This is deep-frozen and identical for every state.
 */
export const BASELINE: Baseline = Object.freeze({
  scale: SCALE,
  bands: BAND_IDS,
  slots: ALL_SLOT_IDS,
});

// Deep freeze the nested arrays too
Object.freeze(BASELINE.bands);
Object.freeze(BASELINE.slots);
