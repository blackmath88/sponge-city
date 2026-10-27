import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assess, buildProfile, scenarios, validateProfile, STATES } from "../src/profile.js";

const street = JSON.parse(readFileSync(new URL("../data/demo-street.json", import.meta.url)));
const catalogue = JSON.parse(readFileSync(new URL("../../../sponge-catalogue/data/catalogue.json", import.meta.url)));
const charter = JSON.parse(readFileSync(new URL("../../../data-charter-map/data/data-charter.json", import.meta.url)));
const fresh = () => buildProfile(street);
const state = (p, answers) => Object.fromEntries(assess(p, answers).map((a) => [a.id, a.state]));

test("the demo profile is valid", () => {
  assert.deepEqual(validateProfile(fresh()), []);
});

test("unknown never becomes zero, safe or suitable", () => {
  for (const stand_in of [0, "none", "clear", false]) {
    const p = fresh();
    p.fields.find((f) => f.key === "utilities").value = stand_in;
    assert.match(validateProfile(p).join(), /utilities: unknown must have value null/);
  }
  const p = fresh();
  p.fields.find((f) => f.key === "sealed_corridor_m2").value = null;
  assert.match(validateProfile(p).join(), /missing value must be typed unknown/);
});

test("an unknown input gives an unknown scenario, not zero", () => {
  const p = fresh();
  Object.assign(p.fields.find((f) => f.key === "sealed_corridor_m2"), { value: null, evidence: "unknown", next_action: "x" });
  const runoff = scenarios(p).find((s) => s.key === "runoff_m3");
  assert.equal(runoff.value, null);
  assert.equal(runoff.evidence, "unknown");
});

test("unvalidated evidence may only explain or screen", () => {
  const p = fresh();
  p.fields.find((f) => f.key === "works_near").permitted_use.push("design");
  assert.match(validateProfile(p).join(), /only explain or screen/);
});

test("with no gatekeeper answers nothing that digs is a candidate", () => {
  const s = state(fresh());
  for (const id of ["tree-trench", "infiltrating-rain-garden", "lined-bioretention", "unseal-and-plant"]) assert.equal(s[id], "requires-investigation");
  assert.equal(s["no-dig-cooling"], "candidate");
});

test("a utility conflict with shallow lines excludes digging but keeps the no-dig future", () => {
  const s = state(fresh(), { utilities: "conflict", utility_depth: "shallow" });
  assert.deepEqual([s["tree-trench"], s["unseal-and-plant"], s["no-dig-cooling"]], ["excluded", "excluded", "candidate"]);
});

test("clear utilities and an allowed overflow make a tree trench a candidate; infiltration stays open", () => {
  const s = state(fresh(), { utilities: "clear", overflow_route: "allowed" });
  assert.equal(s["tree-trench"], "candidate");
  assert.equal(s["lined-bioretention"], "candidate");
  assert.equal(s["infiltrating-rain-garden"], "requires-investigation");
});

test("deep lines under a conflict still allow shallow work", () => {
  const s = state(fresh(), { utilities: "conflict", utility_depth: "deep" });
  assert.equal(s["tree-trench"], "excluded");
  assert.equal(s["unseal-and-plant"], "candidate");
});

test("an observed S1/S2 protection zone excludes infiltration whatever the answers", () => {
  const p = fresh();
  p.fields.find((f) => f.key === "protection_zone").value = "S2a";
  assert.equal(state(p, { utilities: "clear", infiltration: "ok" })["infiltrating-rain-garden"], "excluded");
});

test("answers outside the declared outcomes are rejected", () => {
  assert.throws(() => assess(fresh(), { utilities: "probably fine" }), /Unknown answer/);
});

test("every state is a declared state", () => {
  for (const a of assess(fresh())) assert.ok(STATES.includes(a.state));
});

test("gatekeepers, access states and claims exist in the catalogue and charter", () => {
  const claims = new Set(charter.claims.map((c) => c.id));
  for (const f of fresh().fields) {
    assert.ok(catalogue.access_states[f.access], `${f.key}: access ${f.access}`);
    for (const g of f.gatekeepers ?? []) assert.ok(catalogue.gatekeepers[g], `${f.key}: gatekeeper ${g}`);
    if (f.claim) assert.ok(claims.has(f.claim), `${f.key}: claim ${f.claim}`);
  }
});

test("the page fixture keeps the page's evidence rules and maps every check to a declared outcome", async () => {
  const { OUTCOMES } = await import("../src/profile.js");
  const page = JSON.parse(readFileSync(new URL("../data/kanonengasse.page.json", import.meta.url)));
  for (const c of page.claims) {
    if (c.evidence_class === "unknown") {
      assert.deepEqual(c.permitted_use, [], c.id);
      assert.ok(c.unlock_action && c.decision_blocked && c.gatekeeper, c.id);
    } else assert.ok(!c.permitted_use.includes("design"), c.id);
  }
  for (const id of page.intervention.blocking_claims) {
    assert.ok(page.claims.some((c) => c.id === id), id);
    assert.deepEqual(page.engine.checks[id].options, OUTCOMES[page.engine.checks[id].fact]);
  }
});

test("assessFacts gives the page the same answer as assess", async () => {
  const { assessFacts } = await import("../src/profile.js");
  const p = fresh();
  const answers = { utilities: "clear", overflow_route: "allowed" };
  assert.deepEqual(assessFacts({ protection_zone: "none" }, answers), assess(p, answers));
});
