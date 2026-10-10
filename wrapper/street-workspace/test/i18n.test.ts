import test from "node:test";
import assert from "node:assert/strict";
import {
  DICTIONARIES,
  assumptionTexts,
  errorText,
  materialLabel,
  nodeLabel,
  resolveLang,
  routingNote,
  translate,
  withLang,
  zoneLabel,
  type Lang,
} from "../src/i18n.ts";
import { createDemoStreet } from "../src/scenario.ts";
import { applyPlan } from "../src/interventions.ts";
import { DATA_READINESS, DESIGN_SOURCES, explainMechanisms } from "../src/knowledge.ts";

const store = (value: string | null) => ({ getItem: () => value });
const LANGS: Lang[] = ["de", "en"];

test("de and en dictionaries have identical keys and no empty values", () => {
  const en = Object.keys(DICTIONARIES.en).sort();
  const de = Object.keys(DICTIONARIES.de).sort();
  assert.deepEqual(de, en);
  for (const lang of LANGS)
    for (const [key, value] of Object.entries(DICTIONARIES[lang]))
      assert.ok(value.trim().length > 0, `${lang}:${key} is empty`);
});

test("German uses Swiss spelling (no eszett) and the same placeholders as English", () => {
  for (const [key, value] of Object.entries(DICTIONARIES.de)) {
    assert.ok(!value.includes("ß"), `de:${key} contains ß`);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    assert.equal(ph(value), ph(DICTIONARIES.en[key as keyof typeof DICTIONARIES.en]), key);
  }
});

test("language resolution: URL, then storage, then German; invalid falls back", () => {
  assert.equal(resolveLang("", null), "de");
  assert.equal(resolveLang("?lang=en", null), "en");
  assert.equal(resolveLang("?lang=de", store("en")), "de");
  assert.equal(resolveLang("", store("en")), "en");
  assert.equal(resolveLang("?lang=fr", null), "de");
  assert.equal(resolveLang("?lang=fr", store("xx")), "de");
  assert.equal(resolveLang("?lang=EN", null), "de");
  assert.equal(resolveLang("", { getItem: () => { throw new Error("blocked"); } }), "de");
});

test("withLang keeps lang and embedded when linking away", () => {
  assert.equal(withLang("./rain-walk/", "en", "?embedded=1&lang=de"), "./rain-walk/?embedded=1&lang=en");
  assert.equal(withLang("../x/?a=1", "de", ""), "../x/?lang=de");
});

test("every scenario, intervention and knowledge display string exists in both languages", () => {
  const baseline = createDemoStreet();
  const garden = applyPlan(baseline, { rainGarden: true, connected: true });
  for (const lang of LANGS) {
    for (const z of baseline.zones) {
      const label = zoneLabel(lang, z);
      if (lang === "de") assert.notEqual(label, z.label, `zone ${z.id} untranslated`);
    }
    for (const n of [...baseline.nodes, ...garden.nodes].filter((n) => n.kind !== "catchment")) {
      if (lang === "de") assert.notEqual(nodeLabel(lang, n), n.label, `node ${n.id} untranslated`);
    }
    for (const m of ["roof", "paving", "asphalt", "vegetated-soil"])
      assert.ok(materialLabel(lang, m).length > 0);
  }
  // English source strings are the dictionary's English values
  assert.deepEqual(assumptionTexts("en", baseline.evidence.assumptions), baseline.evidence.assumptions);
  assert.equal(routingNote("en", baseline.evidence.routing.note), baseline.evidence.routing.note);
  const de = assumptionTexts("de", baseline.evidence.assumptions);
  de.forEach((text, i) => assert.notEqual(text, baseline.evidence.assumptions[i]));
  assert.notEqual(routingNote("de", baseline.evidence.routing.note), baseline.evidence.routing.note);
  // knowledge
  DATA_READINESS.forEach((source, i) => {
    assert.equal(DICTIONARIES.en[`data.${i}.label` as "data.0.label"], source.label);
    assert.equal(DICTIONARIES.en[`data.${i}.detail` as "data.0.detail"], source.detail);
    assert.ok(DICTIONARIES.de[`data.${i}.label` as "data.0.label"]);
  });
  DESIGN_SOURCES.forEach((source, i) => {
    assert.equal(DICTIONARIES.en[`src.${i}.geography` as "src.0.geography"], source.geography);
    assert.ok(DICTIONARIES.de[`src.${i}.geography` as "src.0.geography"]);
  });
  // mechanisms: all plan variants differ between languages and keep ids/drivers/state
  for (const plan of [
    { rainGarden: false, connected: false },
    { rainGarden: true, connected: false },
    { rainGarden: true, connected: true },
  ]) {
    const world = applyPlan(baseline, plan);
    const en = explainMechanisms(plan, world, "en");
    const deClaims = explainMechanisms(plan, world, "de");
    assert.deepEqual(en, explainMechanisms(plan, world));
    en.forEach((claim, i) => {
      assert.equal(deClaims[i].id, claim.id);
      assert.equal(deClaims[i].state, claim.state);
      assert.deepEqual(deClaims[i].drivers, claim.drivers);
      assert.notEqual(deClaims[i].explanation, claim.explanation);
      assert.notEqual(deClaims[i].label, claim.label);
    });
  }
});

test("intervention errors keep their English text and localize for display", () => {
  const baseline = createDemoStreet();
  let message = "";
  try {
    applyPlan(baseline, { rainGarden: false, connected: true });
  } catch (e) {
    message = (e as Error).message;
    assert.equal(errorText("en", e), message);
    assert.notEqual(errorText("de", e), message);
  }
  assert.ok(message);
});

test("synthetic and illustrative labelling survives in both languages", () => {
  for (const lang of LANGS) {
    const d = DICTIONARIES[lang];
    assert.match(d["tag.version"], /llustrati/);
    assert.match(d["place.syntheticName"], /ynthetisch|ynthetic/);
    assert.match(d["assume.0"], /ynthetisch|ynthetic/);
    assert.match(d["diagram.caption"], /ILLUSTRATIV/);
    assert.match(d["place.contextOnly"], /Kontext|context/);
    assert.equal(translate(lang, "place.contextOnly", { district: "X" }).includes("X"), true);
  }
});
