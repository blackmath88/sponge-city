import test from "node:test";
import assert from "node:assert/strict";
import { createState, addPlacement, type StudioState } from "../src/studio/state.ts";
import { serialize } from "../src/studio/serialize.ts";
import {
  load,
  save,
  clear,
  loadOrCreate,
  sessionStorageOrNull,
  KEY_PREFIX,
  type StudioStorage,
} from "../src/studio/storage.ts";

// Fake in-memory storage for testing
function createFakeStorage(): { storage: Record<string, string>; impl: StudioStorage } {
  const storage: Record<string, string> = {};
  const impl: StudioStorage = {
    getItem(key: string): string | null {
      return storage[key] ?? null;
    },
    setItem(key: string, value: string): void {
      storage[key] = value;
    },
    removeItem(key: string): void {
      delete storage[key];
    },
  };
  return { storage, impl };
}

// Null storage
const nullStorage: StudioStorage = null;

// Throwing storage
function createThrowingStorage(): StudioStorage {
  return {
    getItem(): never { throw new Error("getItem throws"); },
    setItem(): never { throw new Error("setItem throws"); },
    removeItem(): never { throw new Error("removeItem throws"); },
  };
}

// ============================================================================
// STORAGE API TESTS
// ============================================================================

test("storage: KEY_PREFIX is correct", () => {
  assert.equal(KEY_PREFIX, "sponge.studio.v1:");
});

test("storage: sessionStorageOrNull with empty window has no sessionStorage property", () => {
  const storage = sessionStorageOrNull({});
  // Empty window has no sessionStorage - should return null or the global sessionStorage if available
  assert.ok(storage === null || typeof storage === "object");
});

// ============================================================================
// TESTS WITH FAKE IN-MEMORY STORAGE
// ============================================================================

test("storage: save and load with fake storage", () => {
  const { storage, impl } = createFakeStorage();
  const state = createState("test-place");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  const stateWithData = r.value;

  const saved = save(impl, stateWithData);
  assert.equal(saved, true);

  const loaded = load(impl, "test-place");
  assert.notEqual(loaded, null);
  assert.equal(loaded!.proposals.A.placements.length, 1);
  assert.equal(loaded!.proposals.A.placements[0].slotId, "parkierung-1");
});

test("storage: save with null storage returns false", () => {
  const state = createState("test");
  const saved = save(nullStorage, state);
  assert.equal(saved, false);
});

test("storage: load with null storage returns null", () => {
  const loaded = load(nullStorage, "test");
  assert.equal(loaded, null);
});

test("storage: clear with null storage does nothing", () => {
  // Should not throw
  clear(nullStorage, "test");
});

test("storage: loadOrCreate with null storage creates new state", () => {
  const state = loadOrCreate(nullStorage, "test");
  assert.equal(state.version, 1);
  assert.equal(state.placeId, "test");
  assert.equal(state.proposals.A.placements.length, 0);
});

test("storage: loadOrCreate with null storage and null placeId", () => {
  const state = loadOrCreate(nullStorage, null);
  assert.equal(state.placeId, null);
});

// ============================================================================
// TESTS WITH THROWING STORAGE
// ============================================================================

test("storage: load with throwing storage returns null", () => {
  const throwingStorage = createThrowingStorage();
  const loaded = load(throwingStorage, "test");
  assert.equal(loaded, null);
});

test("storage: save with throwing storage returns false", () => {
  const throwingStorage = createThrowingStorage();
  const state = createState("test");
  const saved = save(throwingStorage, state);
  assert.equal(saved, false);
});

test("storage: clear with throwing storage does nothing", () => {
  const throwingStorage = createThrowingStorage();
  // Should not throw
  clear(throwingStorage, "test");
});

test("storage: loadOrCreate with throwing storage creates new state", () => {
  const throwingStorage = createThrowingStorage();
  const state = loadOrCreate(throwingStorage, "test");
  assert.equal(state.version, 1);
  assert.equal(state.placeId, "test");
});

// ============================================================================
// EMPTY STATE TESTS
// ============================================================================

test("storage: save with empty state removes the key", () => {
  const { storage, impl } = createFakeStorage();
  const emptyState = createState("test");
  
  // Save empty state
  const saved = save(impl, emptyState);
  assert.equal(saved, true);
  
  // Key should be removed
  assert.equal("sponge.studio.v1:test" in storage, false);
});

test("storage: load with empty state key returns null", () => {
  const { impl } = createFakeStorage();
  const loaded = load(impl, "test");
  assert.equal(loaded, null);
  assert.equal(loadOrCreate(impl, "test").proposals.A.placements.length, 0);
});

// ============================================================================
// CORRUPT DATA TESTS
// ============================================================================

test("storage: load with corrupt data returns null and removes key", () => {
  const { storage, impl } = createFakeStorage();
  // Put corrupt data
  storage["sponge.studio.v1:test"] = "not valid json";
  
  const loaded = load(impl, "test");
  assert.equal(loaded, null);
  
  // Key should be removed
  assert.equal("sponge.studio.v1:test" in storage, false);
});

test("storage: load with wrong version returns null", () => {
  const { storage, impl } = createFakeStorage();
  storage["sponge.studio.v1:test"] = JSON.stringify({
    version: 999,
    evidence: "illustrative",
    placeId: "test",
    proposals: { A: { id: "A", placements: [] }, B: { id: "B", placements: [] } }
  });
  
  const loaded = load(impl, "test");
  assert.equal(loaded, null);
});

// ============================================================================
// KEY GENERATION TESTS
// ============================================================================

test("storage: key with null placeId uses synthetic-demo-street", () => {
  const { storage, impl } = createFakeStorage();
  const state = createState(null);
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  save(impl, r.value);
  
  assert.ok("sponge.studio.v1:synthetic-demo-street" in storage);
});

test("storage: key with empty string placeId uses synthetic-demo-street", () => {
  const { storage, impl } = createFakeStorage();
  const state = createState("");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  save(impl, r.value);
  
  assert.ok("sponge.studio.v1:synthetic-demo-street" in storage);
});

test("storage: key with whitespace placeId uses synthetic-demo-street", () => {
  const { storage, impl } = createFakeStorage();
  const state = createState("   ");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  save(impl, r.value);
  
  assert.ok("sponge.studio.v1:synthetic-demo-street" in storage);
});

test("storage: key with valid placeId uses trimmed value", () => {
  const { storage, impl } = createFakeStorage();
  const state = createState("  test-place  ");
  const r = addPlacement(state, "A", "parkierung-1", "tree-trench");
  assert.ok(r.ok);
  save(impl, r.value);
  
  assert.ok("sponge.studio.v1:test-place" in storage);
  assert.ok(!("sponge.studio.v1:  test-place  " in storage));
});
