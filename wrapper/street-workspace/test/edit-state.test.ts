import test from "node:test";
import assert from "node:assert/strict";
import { clearEdits, defaultEdits, editKey, loadEdits, parseEdits, saveEdits } from "../src/edit-state.ts";
import { DICTIONARIES } from "../src/i18n.ts";

const memory = () => {
  const m = new Map<string, string>();
  return Object.assign(
    { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) },
    { m },
  );
};
const edits = { plan: { rainGarden: true, connected: true }, depthMm: 60 };

test("edits round-trip per place and survive a reload (second load, same storage)", () => {
  const s = memory();
  assert.ok(saveEdits(s, "site-a", edits));
  assert.deepEqual(loadEdits(s, "site-a"), edits);
  assert.deepEqual(loadEdits(s, "site-b"), defaultEdits(), "other place is untouched");
  assert.deepEqual(loadEdits(s, undefined), defaultEdits(), "synthetic street is its own key");
});

test("stored record is language-independent and marked synthetic", () => {
  const s = memory();
  saveEdits(s, "site-a", edits);
  const key = editKey("site-a");
  assert.equal(key, "sponge.streetlab.edits.v1:site-a", "key has place id only, no language");
  const rec = JSON.parse(s.m.get(key)!);
  assert.equal(rec.evidence, "synthetic");
  assert.equal(parseEdits(JSON.stringify({ ...rec, evidence: "observed" })), null);
});

test("default state removes the record; clearEdits removes it", () => {
  const s = memory();
  saveEdits(s, "x", edits);
  saveEdits(s, "x", defaultEdits());
  assert.equal(s.m.size, 0);
  saveEdits(s, "x", edits);
  clearEdits(s, "x");
  assert.equal(s.m.size, 0);
});

test("corrupt, hostile or inconsistent data falls back safely", () => {
  assert.equal(parseEdits("not json"), null);
  assert.equal(parseEdits(null), null);
  assert.equal(parseEdits(JSON.stringify({ version: 1, evidence: "synthetic", plan: { rainGarden: "yes", connected: false }, depthMm: 30 })), null);
  const bad = parseEdits(JSON.stringify({ version: 1, evidence: "synthetic", plan: { rainGarden: false, connected: true }, depthMm: 999 }))!;
  assert.deepEqual(bad, defaultEdits(), "connection without garden is dropped; unknown depth reset");
});

test("blocked storage never throws", () => {
  const blocked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  assert.deepEqual(loadEdits(blocked, "x"), defaultEdits());
  assert.equal(saveEdits(blocked, "x", edits), false);
  assert.equal(saveEdits(null, "x", edits), false);
  assert.doesNotThrow(() => clearEdits(blocked, "x"));
});

test("German uses the formal Sie: no du-forms in Street Lab strings", () => {
  const banned = /\b(du|dein\w*|dir|dich|folge|achte|füge|gib|wähle|öffne|starte|beginne|verschiebe|gestalte|erkunde)\b/i;
  for (const [key, value] of Object.entries(DICTIONARIES.de))
    assert.ok(!banned.test(value), `de:${key} uses du-form: ${value}`);
});
