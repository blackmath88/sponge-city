import test from "node:test";
import assert from "node:assert/strict";
import { DE } from "../public/rain-walk/i18n.mjs";

test("German uses the formal Sie: no du-forms in Rain Walk strings", () => {
  const banned = /\b(du|dein\w*|dir|dich|folge|achte|füge|gib|wähle|hilf|suche|schau|notiere|halte|bleib|fotografiere|vermeide|exportiere|beschreibe|erkläre|erkunde)\b/i;
  for (const [key, value] of Object.entries(DE as Record<string, string>)) {
    assert.ok(!banned.test(value), `de:${key} uses du-form: ${value}`);
    assert.ok(!value.includes("ß"), `de:${key} contains ß`);
  }
});
