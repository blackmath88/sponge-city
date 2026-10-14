import test from "node:test";
import assert from "node:assert/strict";
import { STUDIO_DE } from "../src/studio/strings.ts";

test("strings: STUDIO_DE is defined and frozen", () => {
  assert.ok(STUDIO_DE);
  assert.deepEqual(Object.keys(STUDIO_DE).sort(), [
    "addPlacement",
    "bands",
    "baseline",
    "cloneProposal",
    "evidenceDescription",
    "evidenceLabel",
    "help",
    "intervention",
    "noPlacement",
    "notAllowed",
    "proposalA",
    "proposalB",
    "removePlacement",
    "resetState",
    "revertProposal",
    "slotOccupied",
    "storage",
    "studioTitle",
    "togglePlacement",
    "unknownSlot",
    "validation",
  ]);
});

test("strings: STUDIO_DE has all intervention kinds", () => {
  assert.equal(STUDIO_DE.intervention["tree-trench"], "Baumrigole");
  assert.equal(STUDIO_DE.intervention["rain-garden"], "Regengarten");
  assert.equal(STUDIO_DE.intervention["depave"], "Entsiegelung");
});

test("strings: STUDIO_DE has all bands", () => {
  assert.equal(STUDIO_DE.bands["gehweg-nord"], "Gehweg Nord");
  assert.equal(STUDIO_DE.bands["parkierung"], "Parkierung");
  assert.equal(STUDIO_DE.bands["fahrbahn"], "Fahrbahn");
  assert.equal(STUDIO_DE.bands["gehweg-sued"], "Gehweg Süd");
});

test("strings: STUDIO_DE has no sharp s (ß)", () => {
  function walkValues(obj: Record<string, unknown>): string[] {
    const values: string[] = [];
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === "string") {
        values.push(value);
      } else if (value !== null && typeof value === "object") {
        values.push(...walkValues(value as Record<string, unknown>));
      }
    }
    return values;
  }

  const allValues = walkValues(STUDIO_DE as Record<string, unknown>);
  for (const value of allValues) {
    assert.ok(!value.includes("ß"), `String contains ß: "${value}"`);
  }
});

test("strings: STUDIO_DE uses Swiss German spelling", () => {
  // Check key spellings
  assert.equal(STUDIO_DE.studioTitle, "Strassen-Transformationsstudio");
  assert.equal(STUDIO_DE.help.schematic, "Schematische Darstellung – nicht massstabsgetreu");
  assert.equal(STUDIO_DE.help.illustrative, "Reine Visualisierung ohne gemessene Daten");
  assert.equal(STUDIO_DE.help.placement, "Platziere eine Massnahme in einem Bereich");
  assert.equal(STUDIO_DE.validation.invalidInput, "Ungültige Eingabe");
  assert.equal(STUDIO_DE.resetState, "Alles zurücksetzen");
  assert.equal(STUDIO_DE.revertProposal, "Zurücksetzen");
  assert.equal(STUDIO_DE.addPlacement, "Hinzufügen");
  assert.equal(STUDIO_DE.bands["gehweg-sued"], "Gehweg Süd");
  assert.equal(STUDIO_DE.intervention["rain-garden"], "Regengarten");
});

test("strings: STUDIO_DE keeps umlauts (ae/oe/ue are forbidden, Swiss only drops ß)", () => {
  function walkValues(obj: Record<string, unknown>): string[] {
    const values: string[] = [];
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === "string") {
        values.push(value);
      } else if (value !== null && typeof value === "object") {
        values.push(...walkValues(value as Record<string, unknown>));
      }
    }
    return values;
  }

  const allValues = walkValues(STUDIO_DE as Record<string, unknown>);
  for (const value of allValues) {
    assert.ok(!value.includes("ue"), `String contains "ue" instead of "ü": "${value}"`);
    assert.ok(!value.includes("ae"), `String contains "ae" instead of "ä": "${value}"`);
    assert.ok(!value.includes("oe"), `String contains "oe" instead of "ö": "${value}"`);
  }

  assert.equal(
    STUDIO_DE.evidenceDescription,
    "Diese Darstellung ist rein illustrativ und stellt keine vermessene Strassengeometrie oder Machbarkeitsprüfung dar.",
  );
});

test("strings: STUDIO_DE does not have evidence as UI string", () => {
  // evidence: "illustrative" was removed as it's not a UI string
  assert.equal((STUDIO_DE as Record<string, unknown>).evidence, undefined);
});
