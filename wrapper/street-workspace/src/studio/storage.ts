import { createState, type StudioState } from "./state.ts";
import { serialize, parse } from "./serialize.ts";

/**
 * Storage interface for the Studio.
 * Mirrors PR #6's edit-state pattern: injectable storage that may be null or throw.
 */
export type StudioStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined;

/**
 * Key prefix for sessionStorage
 */
export const KEY_PREFIX = "sponge.studio.v1:" as const;

/**
 * Get the storage key for a given placeId
 * If placeId is null, empty, or whitespace → use "synthetic-demo-street"
 */
function getKey(placeId: string | null): string {
  const trimmed = placeId?.trim() || "";
  const id = trimmed === "" ? "synthetic-demo-street" : trimmed;
  return `${KEY_PREFIX}${id}`;
}

/**
 * Get sessionStorage or null if not available.
 * Takes an optional window object for testing.
 */
export function sessionStorageOrNull(win?: { sessionStorage?: Storage }): Storage | null {
  try {
    const storage = win?.sessionStorage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (!storage) return null;
    // Test if it works
    const testKey = `__test_${Date.now()}`;
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Load state from storage
 * Returns null if storage is null/undefined, key doesn't exist, parsing fails, or storage throws
 */
export function load(storage: StudioStorage, placeId: string | null): StudioState | null {
  try {
    if (!storage || typeof storage.getItem !== "function") return null;

    const key = getKey(placeId);
    const raw = storage.getItem(key);
    
    if (raw === null || raw === undefined) {
      return null;
    }

    const state = parse(raw);
    if (!state) {
      // Invalid data, try to remove it
      try {
        storage.removeItem(key);
      } catch {
        // Ignore removal errors
      }
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Save state to storage
 * Returns false if storage is null/undefined or any operation throws.
 * If state is empty (both proposals have no placements), removes the key instead.
 */
export function save(storage: StudioStorage, state: StudioState): boolean {
  try {
    if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
      return false;
    }

    const key = getKey(state.placeId);
    
    // Check if state is empty (both proposals have no placements)
    const isEmpty = 
      state.proposals.A.placements.length === 0 && 
      state.proposals.B.placements.length === 0;
    
    if (isEmpty) {
      // Remove the key for empty state
      storage.removeItem(key);
      return true;
    }

    const serialized = serialize(state);
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear state from storage for a given placeId
 * Does nothing if storage is null/undefined or throws
 */
export function clear(storage: StudioStorage, placeId: string | null): void {
  try {
    if (!storage || typeof storage.removeItem !== "function") return;

    const key = getKey(placeId);
    storage.removeItem(key);
  } catch {
    // Silently ignore errors
  }
}

/**
 * Load state from storage or create new if not found
 * Returns empty state if storage is null/undefined or throws
 */
export function loadOrCreate(storage: StudioStorage, placeId: string | null): StudioState {
  const existing = load(storage, placeId);
  if (existing) {
    return existing;
  }
  return createState(placeId);
}
