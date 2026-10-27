import test from "node:test";
import assert from "node:assert/strict";
import { createState, addPlacement, STATE_VERSION, EVIDENCE } from "../src/studio/state.ts";
import { BASELINE } from "../src/studio/layout.ts";
import { serialize, parse } from "../src/studio/serialize.ts";

test("serialize: serialize produces valid JSON", () => {
  const state = createState("test");
  const serialized = serialize(state);
  const parsed = JSON.parse(serialized);
  assert.ok(parsed);
  assert.equal(parsed.version, STATE_VERSION);
  assert.equal(parsed.evidence, EVIDENCE);
  assert.equal(parsed.placeId, "test");
  assert.deepEqual(Object.keys(parsed.proposals), ["A", "B"]);
});

test("serialize: serialize omits baseline", () => {
  const state = createState("test");
  const serialized = serialize(state);
  assert.ok(!serialized.includes("baseline"));
});

test("serialize: serialize/parse round-trip", () => {
  const state = createState("test");
  let result = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.equal(result.ok, true);
  let stateWithA = result.value;
  result = addPlacement(stateWithA, "A", "gehweg-nord-1", "rain-garden");
  assert.equal(result.ok, true);
  const stateWithTwo = result.value;
  result = addPlacement(stateWithTwo, "B", "parkierung-2", "depave");
  assert.equal(result.ok, true);
  const finalState = result.value;
  const serialized = serialize(finalState);
  const parsed = parse(serialized);
  assert.notEqual(parsed, null);
  assert.equal(parsed!.version, finalState.version);
  assert.equal(parsed!.evidence, finalState.evidence);
  assert.equal(parsed!.placeId, finalState.placeId);
  assert.deepEqual(parsed!.baseline, finalState.baseline);
  assert.equal(parsed!.proposals.A.placements.length, 2);
  assert.equal(parsed!.proposals.B.placements.length, 1);
  assert.deepEqual(parsed, finalState);
});

test("serialize: byte-identical for equal states", () => {
  const state1 = createState("test");
  let result = addPlacement(state1, "A", "parkierung-1", "tree-trench");
  assert.equal(result.ok, true);
  const state1a = result.value;
  const state2 = createState("test");
  result = addPlacement(state2, "A", "parkierung-1", "tree-trench");
  assert.equal(result.ok, true);
  const state2a = result.value;
  const serialized1 = serialize(state1a);
  const serialized2 = serialize(state2a);
  assert.equal(serialized1, serialized2);
});

test("serialize: parse rejects wrong version", () => {
  const bad = JSON.stringify({ version: 2, evidence: "illustrative", placeId: "test", proposals: { A: { id: "A", placements: [] }, B: { id: "B", placements: [] } } });
  const parsed = parse(bad);
  assert.equal(parsed, null);
});

test("serialize: parse rejects wrong evidence", () => {
  const bad = JSON.stringify({ version: 1, evidence: "measured", placeId: "test", proposals: { A: { id: "A", placements: [] }, B: { id: "B", placements: [] } } });
  const parsed = parse(bad);
  assert.equal(parsed, null);
});

test("serialize: parse rejects non-JSON", () => {
  const parsed = parse("not json");
  assert.equal(parsed, null);
});

test("serialize: parse rejects non-string input", () => {
  assert.equal(parse(null), null);
  assert.equal(parse(undefined), null);
  assert.equal(parse(123), null);
  assert.equal(parse({}), null);
});

test("serialize: parse drops unknown slots", () => {
  const bad = JSON.stringify({
    version: 1,
    evidence: "illustrative",
    placeId: "test",
    proposals: {
      A: { id: "A", placements: [{ slotId: "unknown-slot", kind: "tree-trench" }] },
      B: { id: "B", placements: [] }
    }
  });
  const parsed = parse(bad);
  assert.notEqual(parsed, null);
  assert.equal(parsed!.proposals.A.placements.length, 0);
});

test("serialize: parse drops disallowed kinds", () => {
  const bad = JSON.stringify({
    version: 1,
    evidence: "illustrative",
    placeId: "test",
    proposals: {
      A: { id: "A", placements: [{ slotId: "fahrbahn-1", kind: "tree-trench" }] },
      B: { id: "B", placements: [] }
    }
  });
  const parsed = parse(bad);
  assert.notEqual(parsed, null);
  assert.equal(parsed!.proposals.A.placements.length, 0);
});

test("serialize: parse drops duplicate slots", () => {
  const bad = JSON.stringify({
    version: 1,
    evidence: "illustrative",
    placeId: "test",
    proposals: {
      A: { id: "A", placements: [
        { slotId: "parkierung-1", kind: "tree-trench" },
        { slotId: "parkierung-1", kind: "rain-garden" }
      ] },
      B: { id: "B", placements: [] }
    }
  });
  const parsed = parse(bad);
  assert.notEqual(parsed, null);
  assert.equal(parsed!.proposals.A.placements.length, 1);
  assert.equal(parsed!.proposals.A.placements[0].slotId, "parkierung-1");
  assert.equal(parsed!.proposals.A.placements[0].kind, "tree-trench");
});

test("serialize: parse handles partial/malformed proposals", () => {
  const bad = JSON.stringify({
    version: 1,
    evidence: "illustrative",
    placeId: "test",
    proposals: {
      A: { id: "A" },
      B: { id: "B", placements: [] }
    }
  });
  const parsed = parse(bad);
  assert.notEqual(parsed, null);
  assert.equal(parsed!.proposals.A.placements.length, 0);
  assert.equal(parsed!.proposals.B.placements.length, 0);
});

test("serialize: parsed state is deep-frozen", () => {
  const state = createState("test");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  const serialized = serialize(r.value);
  const parsed = parse(serialized);
  assert.notEqual(parsed, null);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed!.proposals));
  assert.ok(Object.isFrozen(parsed!.proposals.A));
  assert.ok(Object.isFrozen(parsed!.proposals.A.placements));
  if (parsed!.proposals.A.placements.length > 0) {
    assert.ok(Object.isFrozen(parsed!.proposals.A.placements[0]));
  }
});

test("serialize: serialized output contains only version as number", () => {
  const state = createState("test");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  const serialized = serialize(r.value);
  const parsedJson = JSON.parse(serialized);
  
  // Walk the object and find all numbers
  function findNumbers(obj: unknown, path: string = ""): string[] {
    const numbers: string[] = [];
    if (typeof obj === "number") {
      numbers.push(path || "root");
    } else if (obj !== null && typeof obj === "object") {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        const value = (obj as Record<string, unknown>)[key];
        numbers.push(...findNumbers(value, path ? `${path}.${key}` : key));
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        numbers.push(...findNumbers(obj[i], `${path}[${i}]`));
      }
    }
    return numbers;
  }
  
  const numberPaths = findNumbers(parsedJson);
  // Should only have version at the root
  assert.deepEqual(numberPaths, ["version"]);
});

test("serialize: determinism with code-point compare", () => {
  const state = createState("test");
  // Use valid slots that will test code-point ordering
  const r1 = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r1.ok, r1.error);
  const r2 = addPlacement(r1.value, "A", "parkierung-3", "tree-trench");
  assert.ok(r2.ok, r2.error);
  const r3 = addPlacement(r2.value, "A", "parkierung-2", "tree-trench");
  assert.ok(r3.ok, r3.error);
  const serialized = serialize(r3.value);
  const parsed = JSON.parse(serialized);
  // Code-point order: parkierung-1, parkierung-2, parkierung-3
  const slotIds = parsed.proposals.A.placements.map((p: { slotId: string }) => p.slotId);
  // Verify they are sorted (code-point order)
  assert.deepEqual(slotIds, ["parkierung-1", "parkierung-2", "parkierung-3"]);
});
