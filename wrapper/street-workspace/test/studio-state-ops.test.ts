import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  addPlacement,
  togglePlacement,
  cloneProposal,
  revertProposal,
  resetState,
  diffFromBaseline,
  type StudioState,
  type OperationResult,
  type Proposal,
} from "../src/studio/state.ts";

function ok<T>(result: OperationResult<T>): T {
  assert.equal(result.ok, true, `expected ok, got error: ${result.ok ? "" : result.error}`);
  return result.value;
}

function stateWithA(): StudioState {
  let state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  state = ok(addPlacement(state, "A", "parkierung-2", "rain-garden"));
  return state;
}

/** Assert a state and all its nested parts are deep-frozen. */
function assertDeepFrozen(state: StudioState): void {
  assert.equal(Object.isFrozen(state), true, "state not frozen");
  assert.equal(Object.isFrozen(state.proposals), true, "proposals not frozen");
  assert.equal(Object.isFrozen(state.proposals.A), true, "proposal A not frozen");
  assert.equal(Object.isFrozen(state.proposals.B), true, "proposal B not frozen");
  for (const id of ["A", "B"] as const) {
    assert.equal(Object.isFrozen(state.proposals[id].placements), true, `placements ${id} not frozen`);
    for (const p of state.proposals[id].placements) {
      assert.equal(Object.isFrozen(p), true, `placement ${id}/${p.slotId} not frozen`);
    }
  }
}

// ============================================================================
// togglePlacement
// ============================================================================

test("toggle: adds when the slot is empty", () => {
  const result = togglePlacement(createState("test"), "A", "parkierung-1", "tree-trench");
  const value = ok(result);
  assert.equal(value.proposals.A.placements.length, 1);
  assert.equal(value.proposals.A.placements[0].kind, "tree-trench");
});

test("toggle: removes when the slot has the same kind", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  const value = ok(togglePlacement(state, "A", "parkierung-1", "tree-trench"));
  assert.equal(value.proposals.A.placements.length, 0);
  // Input unchanged
  assert.equal(state.proposals.A.placements.length, 1);
});

test("toggle: replaces when the slot has a different kind", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  const value = ok(togglePlacement(state, "A", "parkierung-1", "rain-garden"));
  assert.equal(value.proposals.A.placements.length, 1);
  assert.equal(value.proposals.A.placements[0].kind, "rain-garden");
  assert.equal(value.proposals.A.placements[0].slotId, "parkierung-1");
});

test("toggle: fails for unknown slot", () => {
  const result = togglePlacement(createState("test"), "A", "unknown-slot", "tree-trench");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("Unknown slot"));
});

test("toggle: fails for disallowed kind", () => {
  const result = togglePlacement(createState("test"), "A", "fahrbahn-1", "depave");
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("not allowed"));
});

// ============================================================================
// cloneProposal
// ============================================================================

test("clone: A to B copies all placements without shared references", () => {
  const state = stateWithA();
  const cloned = cloneProposal(state, "A", "B");

  assert.equal(cloned.proposals.B.placements.length, 2);
  assert.deepEqual(cloned.proposals.B.placements, state.proposals.A.placements);
  assert.notEqual(cloned.proposals.B.placements, state.proposals.A.placements);
  for (let i = 0; i < 2; i++) {
    assert.notEqual(cloned.proposals.B.placements[i], state.proposals.A.placements[i]);
  }
  // Source proposal unchanged
  assert.equal(state.proposals.A.placements.length, 2);
  assert.equal(cloned.proposals.A.placements.length, 2);
});

test("clone: same id is a no-op returning the same state", () => {
  const state = stateWithA();
  const cloned = cloneProposal(state, "A", "A");
  assert.equal(cloned, state);
});

test("clone: toggling in B after clone A->B leaves A unchanged", () => {
  const cloned = cloneProposal(stateWithA(), "A", "B");
  const edited = ok(togglePlacement(cloned, "B", "parkierung-1", "tree-trench")); // remove
  assert.equal(edited.proposals.B.placements.length, 1);
  assert.equal(edited.proposals.A.placements.length, 2);
  assert.deepEqual(edited.proposals.A.placements, cloned.proposals.A.placements);
});

test("clone: toggling in A after clone A->B leaves B unchanged", () => {
  const cloned = cloneProposal(stateWithA(), "A", "B");
  const edited = ok(togglePlacement(cloned, "A", "parkierung-1", "rain-garden")); // replace
  assert.equal(edited.proposals.A.placements.length, 2);
  assert.equal(edited.proposals.A.placements[0].kind, "rain-garden");
  assert.equal(edited.proposals.B.placements.length, 2);
  assert.equal(edited.proposals.B.placements[0].kind, "tree-trench");
});

// ============================================================================
// revertProposal / resetState
// ============================================================================

test("revert: clears only the reverted proposal", () => {
  let state = stateWithA();
  state = ok(addPlacement(state, "B", "parkierung-4", "depave"));

  const reverted = revertProposal(state, "A");
  assert.equal(reverted.proposals.A.placements.length, 0);
  assert.equal(reverted.proposals.B.placements.length, 1);
  // Input unchanged
  assert.equal(state.proposals.A.placements.length, 2);
});

test("revert: revert of B leaves A untouched", () => {
  let state = stateWithA();
  state = ok(addPlacement(state, "B", "gehweg-sued-1", "rain-garden"));

  const reverted = revertProposal(state, "B");
  assert.equal(reverted.proposals.B.placements.length, 0);
  assert.deepEqual(reverted.proposals.A.placements, state.proposals.A.placements);
});

test("reset: clears both proposals and keeps placeId", () => {
  let state = stateWithA();
  state = ok(addPlacement(state, "B", "parkierung-3", "depave"));

  const reset = resetState(state);
  assert.equal(reset.proposals.A.placements.length, 0);
  assert.equal(reset.proposals.B.placements.length, 0);
  assert.equal(reset.placeId, "test");
  // Input unchanged
  assert.equal(state.proposals.A.placements.length, 2);
  assert.equal(state.proposals.B.placements.length, 1);
});

// ============================================================================
// diffFromBaseline
// ============================================================================

test("diff: empty proposal has an empty diff", () => {
  const diff = diffFromBaseline(createState("test").proposals.A);
  assert.equal(diff.length, 0);
});

test("diff: returns added placements in deterministic slotId order", () => {
  let state = ok(addPlacement(createState("test"), "A", "parkierung-3", "tree-trench"));
  state = ok(addPlacement(state, "A", "gehweg-sued-1", "rain-garden"));
  state = ok(addPlacement(state, "A", "parkierung-1", "depave"));

  const diff = diffFromBaseline(state.proposals.A);
  assert.deepEqual(
    diff.map((p) => p.slotId),
    ["gehweg-sued-1", "parkierung-1", "parkierung-3"]
  );
  assert.deepEqual(diff[1], { slotId: "parkierung-1", kind: "depave" });
});

test("diff: is stable across repeated calls (deterministic order)", () => {
  let state = ok(addPlacement(createState("test"), "A", "parkierung-2", "tree-trench"));
  state = ok(addPlacement(state, "A", "parkierung-1", "rain-garden"));
  const proposal: Proposal = state.proposals.A;

  const first = diffFromBaseline(proposal).map((p) => `${p.slotId}:${p.kind}`);
  const second = diffFromBaseline(proposal).map((p) => `${p.slotId}:${p.kind}`);
  assert.deepEqual(first, second);
  assert.deepEqual(first, ["parkierung-1:rain-garden", "parkierung-2:tree-trench"]);
});

// ============================================================================
// deep freeze of results
// ============================================================================

test("freeze: results are deep-frozen after add", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  assertDeepFrozen(state);
});

test("freeze: results are deep-frozen after toggle add/replace", () => {
  const added = ok(togglePlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  assertDeepFrozen(added);
  const replaced = ok(togglePlacement(added, "A", "parkierung-1", "depave"));
  assertDeepFrozen(replaced);
});

test("freeze: results are deep-frozen after clone", () => {
  assertDeepFrozen(cloneProposal(stateWithA(), "A", "B"));
});

test("freeze: results are deep-frozen after revert and reset", () => {
  const state = stateWithA();
  assertDeepFrozen(revertProposal(state, "A"));
  assertDeepFrozen(revertProposal(state, "B"));
  assertDeepFrozen(resetState(state));
});

test("freeze: frozen state rejects mutation attempts", () => {
  const state = ok(addPlacement(createState("test"), "A", "parkierung-1", "tree-trench"));
  assert.throws(() => {
    (state.proposals.A.placements[0] as { slotId?: string }).slotId = "hacked";
  }, TypeError);
  assert.throws(() => {
    (state.proposals.A.placements as unknown as string[]).push("x");
  }, TypeError);
});
