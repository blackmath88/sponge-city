import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  addPlacement,
  removePlacement,
  isEmpty,
  STATE_VERSION,
  EVIDENCE,
  type StudioState,
  type OperationResult,
} from "../src/studio/state.ts";
import { BASELINE } from "../src/studio/layout.ts";

/** Snapshot helper: unfrozen deep copy for before/after comparison. */
function snapshot(state: StudioState): unknown {
  return structuredClone(state);
}

function ok<T>(result: OperationResult<T>): T {
  assert.equal(result.ok, true, `expected ok, got error: ${result.ok ? "" : result.error}`);
  return result.value;
}

// ============================================================================
// createState
// ============================================================================

test("state: createState creates valid initial state", () => {
  const state = createState("test-place");
  assert.equal(state.version, STATE_VERSION);
  assert.equal(state.version, 1);
  assert.equal(state.evidence, EVIDENCE);
  assert.equal(state.evidence, "illustrative");
  assert.equal(state.placeId, "test-place");
  assert.deepEqual(state.baseline, BASELINE);
  assert.equal(state.proposals.A.id, "A");
  assert.equal(state.proposals.B.id, "B");
  assert.equal(state.proposals.A.placements.length, 0);
  assert.equal(state.proposals.B.placements.length, 0);
  assert.equal(isEmpty(state.proposals.A), true);
  assert.equal(isEmpty(state.proposals.B), true);
});

test("state: createState accepts null placeId", () => {
  const state = createState(null);
  assert.equal(state.placeId, null);
});

test("state: baseline is the same frozen reference across states", () => {
  const state1 = createState("place1");
  const state2 = createState("place2");
  assert.equal(state1.baseline, state2.baseline);
  assert.equal(state1.baseline, BASELINE);
  assert.equal(Object.isFrozen(state1.baseline), true);
  assert.equal(Object.isFrozen(state1.baseline.bands), true);
  assert.equal(Object.isFrozen(state1.baseline.slots), true);
});

// ============================================================================
// isEmpty
// ============================================================================

test("state: isEmpty is false for a proposal with placements", () => {
  const state = ok(
    addPlacement(createState("test"), "A", "parkierung-1", "tree-trench")
  );
  assert.equal(isEmpty(state.proposals.A), false);
  assert.equal(isEmpty(state.proposals.B), true);
});

// ============================================================================
// addPlacement
// ============================================================================

test("state: addPlacement adds a valid placement", () => {
  const state = createState("test");
  const result = addPlacement(state, "A", "parkierung-1", "tree-trench");

  const value = ok(result);
  assert.notEqual(value, state);
  assert.equal(value.proposals.A.placements.length, 1);
  assert.equal(value.proposals.A.placements[0].slotId, "parkierung-1");
  assert.equal(value.proposals.A.placements[0].kind, "tree-trench");
  // B unchanged
  assert.equal(value.proposals.B.placements.length, 0);
});

test("state: addPlacement keeps placements sorted by slotId", () => {
  let state = ok(addPlacement(createState("test"), "A", "parkierung-3", "tree-trench"));
  state = ok(addPlacement(state, "A", "parkierung-1", "tree-trench"));
  state = ok(addPlacement(state, "A", "gehweg-nord-2", "rain-garden"));

  const slotIds = state.proposals.A.placements.map((p) => p.slotId);
  assert.deepEqual(slotIds, ["gehweg-nord-2", "parkierung-1", "parkierung-3"]);
});

test("state: addPlacement fails for duplicate slot", () => {
  const state = ok(
    addPlacement(createState("test"), "A", "parkierung-1", "tree-trench")
  );
  const result = addPlacement(state, "A", "parkierung-1", "rain-garden");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("already has placement"));
});

test("state: addPlacement allows the same slot in both proposals independently", () => {
  let state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  state = ok(addPlacement(state, "B", "parkierung-1", "depave"));
  assert.equal(state.proposals.A.placements[0].kind, "tree-trench");
  assert.equal(state.proposals.B.placements[0].kind, "depave");
});

test("state: addPlacement fails for unknown slot", () => {
  const result = addPlacement(createState("test"), "A", "unknown-slot", "tree-trench");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("Unknown slot"));
});

test("state: addPlacement fails for disallowed kind", () => {
  const result = addPlacement(createState("test"), "A", "fahrbahn-1", "tree-trench");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("not allowed"));
});

// ============================================================================
// removePlacement
// ============================================================================

test("state: removePlacement removes an existing placement", () => {
  const state = ok(
    addPlacement(createState("test"), "A", "parkierung-1", "tree-trench")
  );
  const result = removePlacement(state, "A", "parkierung-1");
  const value = ok(result);
  assert.equal(value.proposals.A.placements.length, 0);
  // Original state still has the placement
  assert.equal(state.proposals.A.placements.length, 1);
});

test("state: removePlacement fails for missing placement", () => {
  const result = removePlacement(createState("test"), "A", "parkierung-1");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("No placement found"));
});

test("state: removePlacement fails for unknown slot", () => {
  const result = removePlacement(createState("test"), "A", "unknown-slot");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("Unknown slot"));
});

// ============================================================================
// input immutability
// ============================================================================

test("state: failed operations never mutate the input state", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  const before = snapshot(state);

  const failures = [
    addPlacement(state, "A", "unknown-slot", "tree-trench"),
    addPlacement(state, "A", "fahrbahn-1", "tree-trench"),
    addPlacement(state, "A", "parkierung-1", "rain-garden"),
    removePlacement(state, "A", "parkierung-2"),
    removePlacement(state, "A", "unknown-slot"),
  ];
  for (const failure of failures) {
    assert.equal(failure.ok, false);
  }
  assert.deepEqual(state, before);
});

test("state: successful operations never mutate the input state", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  const before = snapshot(state);

  ok(addPlacement(state, "B", "parkierung-2", "depave"));
  ok(removePlacement(state, "A", "parkierung-1"));
  assert.deepEqual(state, before);
});
