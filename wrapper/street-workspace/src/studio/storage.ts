import { createState, type StudioState } from "./state.ts";
import { serialize, parse } from "./serialize.ts";

/**
 * Key prefix for sessionStorage
 */
export const KEY_PREFIX = "sponge.studio.v1:" as const;

/**
 * Get the storage key for a given placeId
 * If placeId is null, use "synthetic-demo-street"
 */
function getKey(placeId: string | null): string {
  return `${KEY_PREFIX}${placeId ?? "synthetic-demo-street"}`;
}

/**
 * Get sessionStorage or null if not available
 * This mirrors the defensive style of PR #6's edit-state
 */
export function sessionStorageOrNull(): Storage | null {
  try {
    // Try to access sessionStorage
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    // Test if it works
    const testKey = `__test_${Date.now()}`;
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Load state from sessionStorage
 * Returns null if storage is not available, key doesn't exist, or parsing fails
 */
export function load(placeId: string | null): StudioState | null {
  const storage = sessionStorageOrNull();
  if (!storage) return null;

  const key = getKey(placeId);
  const raw = storage.getItem(key);
  
  if (raw === null) {
    return null;
  }

  const state = parse(raw);
  if (!state) {
    // Invalid data, remove it
    storage.removeItem(key);
    return null;
  }

  return state;
}

/**
 * Save state to sessionStorage
 * If state is empty (both proposals have no placements), removes the key instead
 */
export function save(state: StudioState): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;

  const key = getKey(state.placeId);
  
  // Check if state is empty (both proposals have no placements)
  const isEmpty = 
    state.proposals.A.placements.length === 0 && 
    state.proposals.B.placements.length === 0;
  
  if (isEmpty) {
    // Remove the key for empty state
    storage.removeItem(key);
    return;
  }

  const serialized = serialize(state);
  try {
    storage.setItem(key, serialized);
  } catch {
    // If saving fails (e.g., quota exceeded), silently fail
    // This mirrors the defensive style - storage may throw
  }
}

/**
 * Clear state from sessionStorage for a given placeId
 */
export function clear(placeId: string | null): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;

  const key = getKey(placeId);
  storage.removeItem(key);
}

/**
 * Initialize state from sessionStorage or create new if not found
 */
export function loadOrCreate(placeId: string | null): StudioState {
  const existing = load(placeId);
  if (existing) {
    return existing;
  }
  return createState(placeId);
}
