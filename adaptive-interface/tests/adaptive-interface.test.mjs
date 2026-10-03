// Architectural invariants of the adaptive-interface orchestration layer.
// Run: node --test adaptive-interface/tests/   (also part of `make smoke`)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AdaptiveInterfaceOrchestrator } from "../runtime/orchestrator.js";
import { validatePlaceModel, validateCatalogue } from "../runtime/validate.js";
import { applyCorrections, applyIntervention, computeEffects, evaluateIntervention, measure, METRICS } from "../runtime/scenario-engine.js";
import { parseSelection, handoffUrl } from "../runtime/selection.js";
import { createMockPlaceProvider } from "../modules/mock-place-provider.js";
import { createMockInterventionProvider } from "../modules/mock-intervention-provider.js";
import { renderText, createTextRenderer } from "../modules/text-renderer.js";

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const placeFixture = await json("../examples/demo-place.json");
const catalogueFixture = await json("../examples/demo-interventions.json");

// A renderer that only records what it was given.
const recordingRenderer = () => ({ views: [], render(view) { this.views.push(view); }, connect(actions) { this.actions = actions; } });

async function assemble({ renderer = recordingRenderer(), catalogue = catalogueFixture, place = placeFixture } = {}) {
  const app = new AdaptiveInterfaceOrchestrator({
    placeProvider: createMockPlaceProvider(place),
    interventionProvider: createMockInterventionProvider(catalogue),
    renderer
  });
  await app.load({ lon: 7.5741, lat: 47.5735, radius_m: 50, from: "test" });
  return { app, renderer, last: () => renderer.views[renderer.views.length - 1] };
}

const effect = (view, id) => view.effects.find(item => item.id === id);
const element = (place, id) => place.elements.find(item => item.id === id);

test("1. PlaceProvider returns a valid PlaceModel", async () => {
  const place = await createMockPlaceProvider(placeFixture).getPlace({ lon: 7.58, lat: 47.56, radius_m: 40 });
  assert.deepEqual(validatePlaceModel(place), []);
  assert.equal(place.schema_version, "adaptive-place/0.1");
  assert.equal(place.selection.radius_m, 40, "selection is echoed");
  assert.ok(place.provenance.some(item => item.kind === "demo-fixture"), "fixture is labelled as such");
  assert.deepEqual(validateCatalogue(catalogueFixture), []);
});

test("2. Unknown stays unknown: never zero, false, safe or feasible", async () => {
  const { last } = await assemble();
  const view = last();
  assert.equal(view.status, "ready");
  const tram = element(view.baseline, "tram");
  assert.equal(tram.surface.state, "unknown");
  assert.equal(tram.surface.value, null);
  // Tram surface unknown ⇒ sealed total unknown (not a number), with the known part reported separately.
  const sealed = effect(view, "sealed_area_m2").baseline;
  assert.equal(sealed.state, "unknown");
  assert.equal(sealed.value, null);
  assert.ok(sealed.known_part > 0);
  // Unknown checks keep every intervention at "requires-investigation", never "candidate".
  for (const item of view.interventions) assert.notEqual(item.status, "candidate", `${item.id} must not look feasible`);
  // Not-modelled effects are listed as unknown, not silently dropped.
  for (const id of ["runoff_reduction", "cooling", "infiltration_rate", "storage_volume"]) assert.ok(view.unknowns.some(item => item.key === id), id);
  // The validator rejects a provider that turns unknown into a value.
  const broken = JSON.parse(JSON.stringify(placeFixture));
  broken.context.utilities = { value: 0, state: "unknown" };
  assert.ok(validatePlaceModel(broken).some(error => error.includes("context.utilities")));
});

test("3. Baseline is unchanged when the scenario changes", async () => {
  const { app, last } = await assemble();
  const before = JSON.stringify(last().baseline);
  app.applyIntervention("permeable-parking");
  const view = last();
  assert.equal(JSON.stringify(view.baseline), before, "baseline identical");
  assert.equal(element(view.baseline, "parking-north").surface.value, "sealed");
  assert.equal(element(view.scenario, "parking-north").surface.value, "permeable");
  assert.equal(element(view.scenario, "parking-north").surface.replaces.value, "sealed", "scenario keeps what it replaced");
  assert.throws(() => { view.baseline.elements[0].label = "mutated"; }, TypeError, "baseline is frozen");
});

test("4. A user correction is marked user-corrected and keeps the source value", async () => {
  const { app, last } = await assemble();
  app.correct({ element_id: "tram", property: "surface", value: "planted", reason: "lawn track seen on site" });
  const view = last();
  const surface = element(view.baseline, "tram").surface;
  assert.equal(surface.state, "user-corrected");
  assert.equal(surface.value, "planted");
  assert.equal(surface.replaces.state, "unknown", "original evidence kept");
  assert.equal(element(view.source, "tram").surface.state, "unknown", "source untouched");
  // With the tram surface known, the sealed total becomes a derived number.
  assert.equal(effect(view, "sealed_area_m2").baseline.state, "derived");
  // Pure function behaves the same.
  const { place } = applyCorrections(placeFixture, [{ id: "x", element_id: "tree-3", property: "presence", value: true }]);
  assert.equal(element(place, "tree-3").presence.state, "user-corrected");
  assert.deepEqual(validatePlaceModel(place), []);
});

test("5. Reset restores the baseline", async () => {
  const { app, last } = await assemble();
  const baseline = JSON.stringify(last().baseline);
  app.applyIntervention("tree-rain-garden", { targetId: "sidewalk-south" });
  app.applyIntervention("depave", { targetId: "parking-north" });
  assert.notEqual(JSON.stringify(last().scenario), baseline);
  app.resetScenario();
  assert.equal(JSON.stringify(last().scenario), baseline);
  assert.ok(last().effects.every(item => item.change.value === 0));
  app.correct({ element_id: "tram", property: "surface", value: "sealed" });
  app.resetAll();
  assert.equal(JSON.stringify(last().baseline), baseline, "resetAll drops corrections too");
});

test("6. The intervention catalogue can be replaced", async () => {
  const replacement = {
    schema_version: "intervention-catalog/0.1",
    catalogue_id: "research-team-v0",
    label: "Replacement catalogue",
    interventions: [{
      id: "green-tram-track", label: "Green tram track", summary: "Plant the tram track bed.",
      mechanisms: ["ABSORB", "SWEAT"], target: { types: ["tram"], surfaces: ["sealed"] }, params: {},
      requirements: [], checks: [], transform: [{ op: "set-surface", to: "planted" }], sources: []
    }]
  };
  const { app, last } = await assemble({ catalogue: replacement });
  assert.deepEqual(last().interventions.map(item => item.id), ["green-tram-track"]);
  assert.equal(last().interventions[0].status, "not-applicable", "tram surface unknown ⇒ not a sealed target");
  app.correct({ element_id: "tram", property: "surface", value: "sealed" });
  assert.equal(last().interventions[0].status, "candidate", "no checks declared ⇒ candidate");
  app.applyIntervention("green-tram-track");
  assert.equal(effect(last(), "planted_area_m2").change.value, 360);
  assert.equal(effect(last(), "sealed_area_m2").change.value, -360);
});

test("7. The renderer can be replaced without changing orchestration", async () => {
  const target = { textContent: "" };
  const { app } = await assemble({ renderer: createTextRenderer(target) });
  assert.match(target.textContent, /ADAPTIVE VIEW · ready/);
  app.applyIntervention("permeable-parking");
  assert.match(target.textContent, /Permeable area\s+unknown →\s+unknown\s+Δ 132 \[derived\]/, "totals unknown (tram), change known");
  // The view model contains no Basel-specific source schema fields.
  const recorder = recordingRenderer();
  await assemble({ renderer: recorder });
  const text = JSON.stringify(recorder.views.at(-1));
  for (const leak of ["data.bs.ch", "wms", "baumart", "ba_baumnr", "geo_point_2d"]) assert.ok(!text.toLowerCase().includes(leak), leak);
  assert.equal(typeof renderText(recorder.views.at(-1)), "string");
  // The orchestrator refuses something that is not a renderer, instead of failing later.
  assert.throws(() => new AdaptiveInterfaceOrchestrator({ placeProvider: { getPlace() {} }, interventionProvider: { getCatalogue() {} }, renderer: {} }), TypeError);
});

test("8. Missing intervention ids and invalid targets fail gracefully", async () => {
  const { app, last } = await assemble();
  const before = JSON.stringify(last().scenario);
  app.applyIntervention("does-not-exist");
  assert.match(last().errors[0], /Unknown intervention "does-not-exist"/);
  assert.equal(JSON.stringify(last().scenario), before, "nothing changed");
  app.applyIntervention("depave", { targetId: "tram-stop" });
  assert.match(last().errors[0], /not an eligible target/, "fixed areas cannot be depaved");
  app.applyIntervention("depave", { targetId: "parking-north" });
  assert.deepEqual(last().errors, [], "a valid action clears the error");
});

test("Effects are geometry only and use assumed design areas", async () => {
  const { app, last } = await assemble();
  app.applyIntervention("tree-rain-garden", { targetId: "parking-north" });
  const view = last();
  assert.equal(effect(view, "sealed_area_m2").change.value, -12);
  assert.equal(effect(view, "planted_area_m2").change.value, 12);
  assert.equal(effect(view, "tree_count").change.value, 1);
  assert.equal(effect(view, "parking_spaces").change.value, -1);
  assert.ok(effect(view, "planted_area_m2").change.assumptions.some(text => text.includes("12 m²")));
  assert.deepEqual(effect(view, "tree_count").change.assumptions, [], "assumptions only where they apply");
  assert.ok(effect(view, "parking_spaces").change.assumptions.every(text => text.includes("parking bay")));
  const created = view.scenario.elements.filter(item => item.origin === "intervention:tree-rain-garden");
  assert.ok(created.every(item => item.presence.state === "assumed"), "scenario elements are assumed, not observed");
  assert.deepEqual(METRICS.map(m => m.id), ["sealed_area_m2", "permeable_area_m2", "planted_area_m2", "parking_spaces", "tree_count"], "no runoff, cooling or score metric");
});

test("Corrections change what interventions apply to", async () => {
  const { app, last } = await assemble();
  app.correct({ element_id: "parking-north", property: "surface", value: "permeable", reason: "already gravel" });
  assert.equal(last().interventions.find(item => item.id === "permeable-parking").status, "not-applicable");
  assert.equal(effect(last(), "permeable_area_m2").baseline.state, "unknown", "tram still unknown");
});

test("Unknown target area blocks carving instead of guessing", () => {
  const place = applyCorrections(placeFixture, [{ id: "c", element_id: "sidewalk-north", property: "area_m2", value: null }]).place;
  const depave = catalogueFixture.interventions.find(item => item.id === "depave");
  const result = applyIntervention(place, depave, { targetId: "sidewalk-north" });
  assert.match(result.error, /area of "Sidewalk, north" is unknown/);
  assert.equal(result.place, place);
});

test("Excluded when a requirement is known to fail", () => {
  const place = JSON.parse(JSON.stringify(placeFixture));
  place.context.groundwater_protection_zone = { value: "S2", state: "observed", source_id: "fixture:demo-street" };
  const evaluation = evaluateIntervention(place, catalogueFixture.interventions.find(item => item.id === "permeable-parking"));
  assert.equal(evaluation.status, "excluded");
});

test("Measure reports unknown presence honestly", () => {
  const trees = measure(placeFixture, METRICS.find(m => m.id === "tree_count"));
  assert.equal(trees.state, "unknown", "tree-3 presence unknown");
  assert.equal(trees.known_part, 2);
});

test("Situation Map handoff round-trips", () => {
  const url = handoffUrl("adaptive-interface/demo/index.html", { lon: 7.57412, lat: 47.57351, radius_m: 25, place_profile_id: "point-7.57412-47.57351" });
  const { selection, errors } = parseSelection(new URL(url, "http://x/").searchParams);
  assert.deepEqual(errors, []);
  assert.deepEqual(selection, { lon: 7.57412, lat: 47.57351, radius_m: 25, from: "situation-map", place_profile_id: "point-7.57412-47.57351" });
  assert.equal(parseSelection("lat=47.5&lon=7.5&radius=9999").selection.radius_m, 250, "radius clamped");
  assert.deepEqual(parseSelection("lat=abc&lon=7").selection, null);
  assert.equal(parseSelection("").selection, null, "no selection ⇒ caller falls back to the demo place");
});
