import test from "node:test";
import assert from "node:assert/strict";
import { createDemoStreet } from "../src/scenario.ts";
import { applyPlan } from "../src/interventions.ts";
import { simulate, validateWorld } from "../src/simulation.ts";
import { parseSiteHandoff } from "../src/site-context.ts";
import { explainMechanisms } from "../src/knowledge.ts";
const baseline = createDemoStreet();
const storm = { depthMm: 30, durationMinutes: 30 };
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const final = (garden: boolean, connected: boolean) =>
  simulate(applyPlan(baseline, { rainGarden: garden, connected }), storm).at(
    -1,
  )!;

test("sealed street routes all 54 m³ to sewer", () => {
  const s = final(false, false);
  close(s.rainM3, 54);
  close(s.sewerM3, 54);
  close(s.storedM3, 0);
  close(s.infiltratedM3, 0);
});
test("isolated garden only receives local rain; connected garden captures upstream water and overflows", () => {
  const isolated = final(true, false),
    connected = final(true, true);
  close(isolated.storedM3 + isolated.infiltratedM3, 3.6);
  close(isolated.sewerM3, 50.4);
  close(connected.storedM3, 12);
  close(connected.infiltratedM3, 2);
  close(connected.sewerM3, 40);
  close(connected.edgeVolumes["garden-overflow"], 40);
});
test("mass is conserved at every frame under dry, small and extreme storms", () => {
  for (const depthMm of [0, 1, 10, 30, 60, 1000])
    for (const durationMinutes of [0.5, 1, 30, 60])
      for (const plan of [
        { rainGarden: false, connected: false },
        { rainGarden: true, connected: false },
        { rainGarden: true, connected: true },
      ]) {
        for (const s of simulate(applyPlan(baseline, plan), {
          depthMm,
          durationMinutes,
        })) {
          close(s.balanceErrorM3, 0);
          assert.ok(s.storedM3 >= 0 && s.storedM3 <= 12);
          assert.ok(s.infiltratedM3 >= 0 && s.sewerM3 >= 0);
        }
      }
});
test("baseline is immutable, compilation is deterministic, removal restores baseline", () => {
  const copy = structuredClone(baseline),
    plan = { rainGarden: true, connected: true };
  const a = applyPlan(baseline, plan),
    b = applyPlan(baseline, plan);
  assert.deepEqual(a, b);
  assert.deepEqual(baseline, copy);
  assert.deepEqual(
    applyPlan(baseline, { rainGarden: false, connected: false }),
    copy,
  );
  assert.equal(a.zones.find((z) => z.id === "zone-2")!.kind, "parking");
  assert.equal(a.zones.find((z) => z.id === "zone-2")!.parkingSpaces, 0);
  assert.throws(() => applyPlan(a, plan), /baseline/);
});
test("connections require a garden; disconnect restores bypass flow", () => {
  assert.throws(
    () => applyPlan(baseline, { rainGarden: false, connected: true }),
    /requires/,
  );
  const world = applyPlan(baseline, { rainGarden: true, connected: false });
  assert.equal(
    world.connections.find((e) => e.id === "runoff-outlet")!.to,
    "drain",
  );
  close(simulate(world, storm).at(-1)!.edgeVolumes["garden-overflow"], 0);
});
test("invalid graph references, cycles, duplicate IDs and ambiguous splits fail loudly", () => {
  const missing = structuredClone(baseline);
  missing.connections[0].to = "absent";
  assert.throws(() => validateWorld(missing), /endpoint/);
  const cycle = structuredClone(baseline);
  cycle.connections.find((e) => e.id === "drain-outlet")!.to = "runoff";
  assert.throws(() => validateWorld(cycle), /Cycles/);
  const duplicate = structuredClone(baseline);
  duplicate.nodes.push(duplicate.nodes[0]);
  assert.throws(() => validateWorld(duplicate), /Duplicate/);
  const split = structuredClone(baseline);
  split.connections.push({
    id: "extra",
    from: "runoff",
    to: "sewer",
    kind: "flow",
  });
  assert.throws(() => validateWorld(split), /one flow/);
});
test("zero storage and infiltration sends all water through overflow", () => {
  const world = applyPlan(baseline, { rainGarden: true, connected: true });
  const garden = world.nodes.find((n) => n.kind === "storage")!;
  if (garden.kind !== "storage") throw Error("Missing storage");
  garden.capacityM3 = 0;
  garden.infiltrationM3PerHour = 0;
  const s = simulate(world, storm).at(-1)!;
  close(s.sewerM3, 54);
  close(s.infiltratedM3, 0);
  close(s.storedM3, 0);
});
test("invalid event input and capacities are rejected", () => {
  for (const event of [
    { depthMm: -1, durationMinutes: 30 },
    { depthMm: NaN, durationMinutes: 30 },
    { depthMm: 30, durationMinutes: 0 },
    { depthMm: 30, durationMinutes: Infinity },
  ])
    assert.throws(() => simulate(baseline, event), /storm/);
  const world = applyPlan(baseline, { rainGarden: true, connected: true });
  const node = world.nodes.find((n) => n.kind === "storage")!;
  if (node.kind === "storage") node.capacityM3 = -1;
  assert.throws(() => simulate(world, storm), /storage/);
});
test("site context does not become geometry or change simulation", () => {
  const site = {
    id: "example",
    name: "Candidate",
    district: "Basel",
    coordinates: [47.56, 7.59] as [number, number],
    indicators: { sources: ["dataset"], missingData: ["soil"] },
    constraints: ["ownership unknown"],
    directions: ["rain garden"],
  };
  const linked = createDemoStreet(site);
  assert.deepEqual(linked.zones, baseline.zones);
  assert.deepEqual(simulate(linked, storm), simulate(baseline, storm));
  assert.deepEqual(linked.evidence.site, site);
  site.indicators.sources.push("later");
  assert.equal(linked.evidence.site!.indicators.sources.length, 1);
});

test("routing remains an explicit assumption and mechanisms name their drivers", () => {
  assert.equal(baseline.evidence.routing.state, "assumed");
  const isolated = explainMechanisms({ rainGarden: true, connected: false }, baseline);
  assert.equal(isolated.find((claim) => claim.id === "store")!.active, true);
  assert.equal(isolated.find((claim) => claim.id === "slow")!.active, false);
  const connected = explainMechanisms(
    { rainGarden: true, connected: true },
    applyPlan(baseline, { rainGarden: true, connected: true }),
  );
  const slow = connected.find((claim) => claim.id === "slow")!;
  assert.equal(slow.active, true);
  assert.equal(slow.state, "illustrative");
  assert.deepEqual(slow.drivers, ["runoff-outlet → garden", "garden-overflow → drain"]);
});

test("versioned site handoff is validated and preserves unicode", () => {
  const payload = {
    version: 1,
    site: {
      id: "GUN",
      name: "Gundeldinger Feld & environs",
      district: "Gundeldingen",
      coordinates: [7.594, 47.54],
      indicators: { sources: ["Baumkataster Zürich/Basel"], missingData: ["Boden"] },
      constraints: ["Ownership unknown"],
      directions: ["Rain garden"],
    },
    provenance: {
      classification: "illustrative",
      source: "Basel Site Scoping Tool",
      note: "Identity context only",
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  assert.deepEqual(parseSiteHandoff(`?site=${encoded}`), {
    site: payload.site,
    provenance: payload.provenance,
  });
  assert.equal(parseSiteHandoff("?site=not-json"), undefined);
  assert.equal(parseSiteHandoff("?site="), undefined);
});
