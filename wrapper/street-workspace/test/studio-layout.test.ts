import test from "node:test";
import assert from "node:assert/strict";
import {
  SCALE,
  BAND_IDS,
  ALLOWED_KINDS,
  SLOTS_PER_BAND,
  ALL_SLOT_IDS,
  getBandForSlot,
  isKindAllowedInSlot,
  compareStrings,
  BASELINE,
  type InterventionKind,
} from "../src/studio/layout.ts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// LAYOUT TESTS
// ============================================================================

test("layout: SCALE is 'schematic'", () => {
  assert.equal(SCALE, "schematic");
});

test("layout: BAND_IDS contains expected bands", () => {
  assert.deepEqual(BAND_IDS, ["gehweg-nord", "parkierung", "fahrbahn", "gehweg-sued"]);
});

test("layout: SLOTS_PER_BAND has correct slots", () => {
  assert.deepEqual(SLOTS_PER_BAND["gehweg-nord"], ["gehweg-nord-1", "gehweg-nord-2", "gehweg-nord-3"]);
  assert.deepEqual(SLOTS_PER_BAND["parkierung"], ["parkierung-1", "parkierung-2", "parkierung-3", "parkierung-4"]);
  assert.deepEqual(SLOTS_PER_BAND["fahrbahn"], ["fahrbahn-1", "fahrbahn-2"]);
  assert.deepEqual(SLOTS_PER_BAND["gehweg-sued"], ["gehweg-sued-1", "gehweg-sued-2", "gehweg-sued-3"]);
});

test("layout: ALL_SLOT_IDS contains all slots", () => {
  assert.equal(ALL_SLOT_IDS.length, 3 + 4 + 2 + 3); // 12 total slots
  assert.ok(ALL_SLOT_IDS.includes("gehweg-nord-1"));
  assert.ok(ALL_SLOT_IDS.includes("parkierung-3"));
  assert.ok(ALL_SLOT_IDS.includes("fahrbahn-1"));
  assert.ok(ALL_SLOT_IDS.includes("gehweg-sued-3"));
});

test("layout: ALLOWED_KINDS per band - gehweg allows depave", () => {
  // All three kinds allowed in gehweg (sidewalk) per catalogue
  assert.deepEqual(ALLOWED_KINDS["gehweg-nord"], ["tree-trench", "rain-garden", "depave"]);
  assert.deepEqual(ALLOWED_KINDS["parkierung"], ["tree-trench", "rain-garden", "depave"]);
  assert.deepEqual(ALLOWED_KINDS["fahrbahn"], []);
  assert.deepEqual(ALLOWED_KINDS["gehweg-sued"], ["tree-trench", "rain-garden", "depave"]);
});

test("layout: getBandForSlot returns correct band", () => {
  assert.equal(getBandForSlot("gehweg-nord-1"), "gehweg-nord");
  assert.equal(getBandForSlot("parkierung-2"), "parkierung");
  assert.equal(getBandForSlot("fahrbahn-1"), "fahrbahn");
  assert.equal(getBandForSlot("gehweg-sued-3"), "gehweg-sued");
  assert.equal(getBandForSlot("unknown-slot"), null);
});

test("layout: isKindAllowedInSlot validates correctly", () => {
  // Valid combinations - gehweg now allows depave
  assert.equal(isKindAllowedInSlot("gehweg-nord-1", "tree-trench"), true);
  assert.equal(isKindAllowedInSlot("gehweg-nord-1", "rain-garden"), true);
  assert.equal(isKindAllowedInSlot("gehweg-nord-1", "depave"), true);
  assert.equal(isKindAllowedInSlot("parkierung-1", "tree-trench"), true);
  assert.equal(isKindAllowedInSlot("parkierung-1", "rain-garden"), true);
  assert.equal(isKindAllowedInSlot("parkierung-1", "depave"), true);

  // Invalid combinations
  assert.equal(isKindAllowedInSlot("fahrbahn-1", "tree-trench"), false);
  assert.equal(isKindAllowedInSlot("fahrbahn-1", "rain-garden"), false);
  assert.equal(isKindAllowedInSlot("fahrbahn-1", "depave"), false);

  // Unknown slot
  assert.equal(isKindAllowedInSlot("unknown-slot", "tree-trench"), false);
});

test("layout: BASELINE is deep-frozen and has correct structure", () => {
  assert.equal(BASELINE.scale, "schematic");
  assert.deepEqual(BASELINE.bands, BAND_IDS);
  assert.deepEqual(BASELINE.slots, ALL_SLOT_IDS);

  // Verify it's frozen
  assert.throws(() => {
    (BASELINE as any).scale = "real";
  }, /Cannot assign to read only property/);

  assert.throws(() => {
    (BASELINE.bands as any).push("new-band");
  }, /Cannot add property/);
});

test("layout: compareStrings provides deterministic ordering", () => {
  assert.equal(compareStrings("a", "b"), -1);
  assert.equal(compareStrings("b", "a"), 1);
  assert.equal(compareStrings("a", "a"), 0);
  assert.equal(compareStrings("parkierung-1", "parkierung-2"), -1);
  assert.equal(compareStrings("gehweg-nord-1", "gehweg-nord-10"), -1);
});

test("layout: catalogue element types match bands", () => {
  const cataloguePath = join(
    __dirname,
    "..",
    "..",
    "..",
    "adaptive-interface",
    "catalogues",
    "intervention-knowledge.json"
  );

  const catalogue = JSON.parse(readFileSync(cataloguePath, "utf8"));
  
  // Map band to element type
  const bandToElementType: Record<string, string> = {
    "gehweg-nord": "sidewalk",
    "gehweg-sued": "sidewalk",
    "parkierung": "parking",
    "fahrbahn": "road",
  };

  // For each intervention kind, check allowed bands match element_types
  const kinds: InterventionKind[] = ["tree-trench", "rain-garden", "depave"];
  for (const kind of kinds) {
    const intervention = catalogue.interventions.find((i: { id: string }) => i.id === kind);
    assert.ok(intervention, `Intervention ${kind} not found in catalogue`);
    const elementTypes = intervention.applies_to.element_types;
    
    for (const band of BAND_IDS) {
      const elementType = bandToElementType[band];
      const allowed = isKindAllowedInSlot(`${band}-1`, kind);
      const shouldAllow = elementTypes.includes(elementType);
      assert.equal(allowed, shouldAllow, 
        `Band ${band} (${elementType}) should ${shouldAllow ? '' : 'not '}allow ${kind}`);
    }
  }
});
