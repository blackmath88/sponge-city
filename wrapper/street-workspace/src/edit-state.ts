// Street Lab edit persistence. The user's synthetic-street edits survive a language reload
// (the journey shell reloads this frame on a language change because the `site=` handoff is localized).
// Scope: sessionStorage, keyed by place id. Never language-keyed, never exported as site evidence.
import type { InterventionPlan } from "./types.ts";

export const EDIT_KEY_PREFIX = "sponge.streetlab.edits.v1:";
export const SYNTHETIC_PLACE_ID = "synthetic-demo-street";

export const STORM_DEPTHS_MM = [10, 30, 60] as const;
export type StreetEdits = { plan: InterventionPlan; depthMm: number };
export type EditStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined;

export const editKey = (placeId?: string | null) =>
  EDIT_KEY_PREFIX + (placeId?.trim() || SYNTHETIC_PLACE_ID);

export const defaultEdits = (): StreetEdits => ({ plan: { rainGarden: false, connected: false }, depthMm: 30 });

/** Coerce untrusted stored data to valid edits, or null. A connection without a garden is invalid state. */
export function parseEdits(raw: unknown): StreetEdits | null {
  if (typeof raw !== "string") return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.evidence !== "synthetic" || data.version !== 1) return null;
  const p = data.plan;
  if (!p || typeof p.rainGarden !== "boolean" || typeof p.connected !== "boolean") return null;
  const depth = Number(data.depthMm);
  const depthMm = (STORM_DEPTHS_MM as readonly number[]).includes(depth) ? depth : defaultEdits().depthMm;
  return { plan: { rainGarden: p.rainGarden, connected: p.rainGarden && p.connected }, depthMm };
}

export function loadEdits(storage: EditStorage, placeId?: string | null): StreetEdits {
  try {
    return parseEdits(storage?.getItem(editKey(placeId))) ?? defaultEdits();
  } catch {
    return defaultEdits(); // storage blocked
  }
}

export function saveEdits(storage: EditStorage, placeId: string | null | undefined, edits: StreetEdits): boolean {
  try {
    if (!storage) return false;
    const unchanged = JSON.stringify(edits) === JSON.stringify(defaultEdits());
    if (unchanged) storage.removeItem(editKey(placeId));
    else
      storage.setItem(
        editKey(placeId),
        JSON.stringify({ version: 1, evidence: "synthetic", placeId: placeId || SYNTHETIC_PLACE_ID, ...edits }),
      );
    return true;
  } catch {
    return false;
  }
}

export function clearEdits(storage: EditStorage, placeId?: string | null): void {
  try {
    storage?.removeItem(editKey(placeId));
  } catch {
    /* ignore */
  }
}

export function sessionStorageOrNull(win: Window = window): Storage | null {
  try {
    return win.sessionStorage;
  } catch {
    return null;
  }
}
