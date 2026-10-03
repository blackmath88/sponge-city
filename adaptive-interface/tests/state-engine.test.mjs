// STATE → INTERVENTION → NEW STATE → EFFECTS UNDER SCENARIO.
// Run: node --test adaptive-interface/tests/state-engine.test.mjs   (also part of `make smoke`)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AdaptiveInterfaceOrchestrator } from "../runtime/orchestrator.js";
import { placeToState, stateToPlace } from "../runtime/place-to-state.js";
import { evaluateState, compareEffects } from "../runtime/effect-engine.js";
import { compileIntervention } from "../runtime/intervention-compiler.js";
import { applyStateOperations, applyExecutable } from "../runtime/state-ops.js";
import { connectionsFrom, connectionsTo, replaceConnection } from "../runtime/state-graph.js";
import { validateStateModel, validateKnowledge, validateScenario, validatePlaceModel, FORBIDDEN_KNOWLEDGE_FIELDS } from "../runtime/validate.js";
import { createMockPlaceProvider } from "../modules/mock-place-provider.js";
import { createMockInterventionProvider } from "../modules/mock-intervention-provider.js";
import { createMockRenderer } from "../modules/mock-renderer.js";
import { createTextRenderer } from "../modules/text-renderer.js";
import { toStreetSlice, explainerStages, EXPLAINER_TRACKS } from "../modules/street-slice-adapter.js";

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const text = async path => readFile(new URL(path, import.meta.url), "utf8");
const placeFixture = await json("../examples/demo-place.json");
const legacyCatalogue = await json("../examples/demo-interventions.json");
const routingAssumptions = await json("../examples/demo-routing.json");
const surfaces = await json("../catalogues/surfaces.json");
const scenarioCatalogue = await json("../catalogues/scenarios.json");
const knowledge = await json("../catalogues/intervention-knowledge.json");
const scenario = id => scenarioCatalogue.scenarios.find(item => item.id === id);
const record = id => knowledge.interventions.find(item => item.id === id);
const effect = (result, id) => result.effects[id];

// A tiny hand-built PlaceModel: one road, optionally a rain garden, trees, routing.
function miniPlace({ elements = [], routing } = {}) {
  const o = (value, state = "observed") => ({ value, state, source_id: "t" });
  return {
    schema_version: "adaptive-place/0.1", place_id: "mini", label: "Mini", selection: { lon: 7.5, lat: 47.5, radius_m: 20 },
    elements: [
      { id: "road", type: "road", label: "Road", presence: o(true), surface: o("sealed"), area_m2: o(100) },
      ...elements
    ],
    context: { infiltration_capacity: { value: null, state: "unknown" } },
    provenance: [{ id: "t", kind: "test", label: "test" }],
    ...(routing ? { routing } : {})
  };
}
const sewerRouting = {
  nodes: [{ id: "gully", type: "gully" }, { id: "sewer", type: "sewer" }],
  connections: [{ from: "road", to: "gully", mode: "surface-runoff", state: "observed" }, { from: "gully", to: "sewer", mode: "pipe", state: "observed" }]
};
const tree = (id, canopy = "medium") => ({ id, type: "tree", label: id, presence: { value: true, state: "observed" }, surface: { value: null, state: "not-applicable" }, area_m2: { value: null, state: "not-applicable" }, canopy });

async function assemble({ catalogue = knowledge, renderer = { views: [], render(view) { this.views.push(view); } }, routing = routingAssumptions, place = placeFixture } = {}) {
  const app = new AdaptiveInterfaceOrchestrator({
    placeProvider: createMockPlaceProvider(place),
    interventionProvider: createMockInterventionProvider(catalogue),
    renderer, surfaces, scenarios: scenarioCatalogue, routingAssumptions: routing
  });
  await app.load({ lon: 7.5741, lat: 47.5735, radius_m: 50 });
  return { app, renderer, last: () => renderer.views.at(-1) };
}

test("S1. asphalt + sewer connection → high runoff and sewer load under heavy rain", () => {
  const state = placeToState(miniPlace({ routing: sewerRouting }), { surfaces });
  assert.deepEqual(validateStateModel(state), []);
  assert.equal(state.elements.find(item => item.id === "road").surface.material.value, "asphalt");
  const result = evaluateState(state, scenario("heavy-rain"));
  assert.equal(effect(result, "runoff_tendency").value, "high");
  assert.equal(effect(result, "runoff_tendency").state, "derived");
  assert.ok(effect(result, "runoff_tendency").drivers.includes("road.surface.sealed_fraction"));
  assert.equal(effect(result, "sewer_load_tendency").value, "high");
  assert.ok(effect(result, "sewer_load_tendency").drivers.includes("connection:road→gully"), "drivers name the routing edge");
  assert.equal(effect(result, "shade").state, "not-applicable", "heat effects are not claimed under rain");
});

test("S2. changing ONLY water routing changes sewer-load tendency", () => {
  const garden = { id: "garden", type: "rain-garden", label: "Rain garden", presence: { value: true, state: "observed" }, surface: { value: "planted", state: "observed" }, area_m2: { value: 10, state: "observed" } };
  const routing = { nodes: sewerRouting.nodes, connections: [...sewerRouting.connections, { from: "garden", to: "gully", mode: "overflow", state: "observed" }] };
  const before = placeToState(miniPlace({ elements: [garden], routing }), { surfaces });
  const edge = connectionsFrom(before, "road")[0];
  const after = replaceConnection(before, edge, { ...edge, to: "garden" });
  assert.deepEqual(after.elements, before.elements, "no material or element changed");
  assert.deepEqual(connectionsTo(after, "garden").map(edge => edge.from), ["road"]);
  const rain = scenario("heavy-rain");
  const b = evaluateState(before, rain);
  const a = evaluateState(after, rain);
  assert.equal(effect(b, "runoff_tendency").value, effect(a, "runoff_tendency").value, "runoff from the surface is unchanged");
  assert.equal(effect(b, "sewer_load_tendency").value, "high");
  assert.equal(effect(a, "sewer_load_tendency").value, "medium");
  const delta = compareEffects(b, a);
  assert.equal(delta.changes.sewer_load_tendency.assessment, "improves");
  assert.deepEqual(delta.changes.sewer_load_tendency.local.map(item => item.element_id), ["road"]);
});

test("S3. permeable surface + unknown infiltration → infiltration stays unknown", () => {
  const place = miniPlace();
  place.elements[0] = { ...place.elements[0], type: "parking", surface: { value: "permeable", state: "observed" } };
  const state = placeToState(place, { surfaces });
  const result = evaluateState(state, scenario("heavy-rain"));
  assert.equal(effect(result, "infiltration_potential").state, "unknown");
  assert.equal(effect(result, "infiltration_potential").value, null, "unknown never carries a value");
  assert.match(effect(result, "infiltration_potential").by_element.road.reason, /infiltration capacity/);
  // No routing in the PlaceModel ⇒ sewer load unknown, not "goes to the sewer".
  assert.equal(state.routing.state, "unknown");
  assert.deepEqual(state.connections, []);
});

test("S4. planted + moist state increases evapotranspiration potential", () => {
  const hot = scenario("hot-day");
  const sealed = evaluateState(placeToState(miniPlace(), { surfaces }), hot);
  const plantedPlace = miniPlace();
  plantedPlace.elements[0] = { ...plantedPlace.elements[0], type: "vegetation", surface: { value: "planted", state: "observed" } };
  const planted = evaluateState(placeToState(plantedPlace, { surfaces }), hot);
  assert.equal(effect(sealed, "evapotranspiration_potential").value, "low");
  assert.equal(effect(planted, "evapotranspiration_potential").value, "medium");
  // Same planting, but it also receives runoff (moister) → higher still.
  const moistPlace = miniPlace({ elements: [{ ...plantedPlace.elements[0], id: "bed" }], routing: { nodes: [], connections: [{ from: "road", to: "bed", mode: "surface-runoff", state: "observed" }] } });
  const moist = evaluateState(placeToState(moistPlace, { surfaces }), hot);
  assert.equal(effect(moist, "evapotranspiration_potential").by_element.bed.value, "high");
  assert.ok(effect(moist, "evapotranspiration_potential").by_element.bed.drivers.includes("connection:road→bed"));
});

test("S5. more tree canopy increases shade on a hot day", () => {
  const hot = scenario("hot-day");
  const shade = trees => {
    const state = placeToState(miniPlace({ elements: trees }), { surfaces });
    for (const element of state.elements) if (element.type === "tree") element.vegetation.canopy_area = { value: trees.find(t => t.id === element.id).canopy, state: "assumed" };
    return effect(evaluateState(state, hot), "shade");
  };
  assert.equal(shade([]).value, "low");
  assert.equal(shade([tree("t1", "low")]).value, "low");
  assert.equal(shade([tree("t1")]).value, "medium");
  assert.equal(shade([tree("t1", "high"), tree("t2", "high")]).value, "high");
});

test("S6. hot-drought reduces evapotranspiration relative to hot-day", () => {
  const place = miniPlace();
  place.elements[0] = { ...place.elements[0], type: "vegetation", surface: { value: "planted", state: "observed" } };
  const state = placeToState(place, { surfaces });
  const day = evaluateState(state, scenario("hot-day"));
  const drought = evaluateState(state, scenario("hot-drought"));
  assert.equal(effect(day, "evapotranspiration_potential").value, "medium");
  assert.equal(effect(drought, "evapotranspiration_potential").value, "low");
  assert.equal(effect(drought, "soil_water_availability").value, "low");
  assert.ok(effect(drought, "soil_water_availability").drivers.includes("scenario:hot-drought.heat.soil_moisture"));
  for (const item of scenarioCatalogue.scenarios) assert.deepEqual(validateScenario(item), [], item.id);
});

test("S7. intervention knowledge compiles into executable state operations", () => {
  const state = placeToState(placeFixture, { surfaces, routingAssumptions });
  const source = JSON.stringify(state);
  const depave = compileIntervention(record("depave"), state, "parking-north", { surfaces });
  assert.equal(depave.error, undefined);
  assert.deepEqual(depave.operations.map(op => op.op), ["set-property", "add-element", "set-property"]);
  const garden = compileIntervention(record("rain-garden"), state, "parking-north", { surfaces });
  assert.deepEqual(garden.operations.map(op => op.op), ["set-property", "add-element", "replace-connection", "add-connection", "set-property"]);
  const next = applyExecutable(state, garden);
  assert.equal(JSON.stringify(state), source, "source state is never mutated");
  assert.deepEqual(validateStateModel(next), []);
  const newGarden = next.elements.find(item => item.type === "rain-garden");
  assert.equal(newGarden.presence.state, "assumed");
  assert.equal(newGarden.surface.depression_storage.value, "high");
  assert.deepEqual(connectionsFrom(next, "parking-north").map(edge => edge.to), [newGarden.id]);
  assert.deepEqual(connectionsFrom(next, newGarden.id).map(edge => [edge.to, edge.mode]), [["gully-north", "overflow"]]);
  // Curb cut is pure routing: needs a receiver, changes no material.
  assert.match(compileIntervention(record("curb-cut"), state, "road").error, /Needs a rain-garden or tree-trench/);
  const cut = compileIntervention(record("curb-cut"), next, "road", { surfaces });
  assert.ok(cut.operations.every(op => op.op.endsWith("connection")), "routing only");
  const afterCut = applyStateOperations(next, cut.operations);
  assert.equal(JSON.stringify(afterCut.elements), JSON.stringify(next.elements));
  assert.match(compileIntervention(record("curb-cut"), next, "parking-north").error, /already drains into/, "no duplicate edges");
  // A knowledge record with no recipe is listed but not executable.
  assert.match(compileIntervention({ ...record("depave"), id: "cistern", label: "Cistern" }, state, "parking-north").error, /knowledge only/);
});

test("S8. researcher-facing knowledge has no renderer, layout or execution fields", async () => {
  assert.deepEqual(validateKnowledge(knowledge), []);
  const schema = await json("../contracts/intervention-knowledge.schema.json");
  const fields = Object.keys(schema.$defs.record.properties);
  for (const forbidden of FORBIDDEN_KNOWLEDGE_FIELDS) assert.ok(!fields.includes(forbidden), forbidden);
  assert.equal(schema.$defs.record.additionalProperties, false);
  const raw = JSON.stringify(knowledge);
  for (const leak of ["\"layout\"", "\"band\"", "\"transform\"", "\"carve\"", "\"set-surface\"", "\"reduce-count\"", "svg"]) assert.ok(!raw.includes(leak), leak);
  const withLayout = { ...knowledge, interventions: [{ ...knowledge.interventions[0], layout: { band: 2 } }] };
  assert.ok(validateKnowledge(withLayout).some(error => error.includes("renderer/execution field")));
});

test("S9. the renderer receives effects but does not calculate them", async () => {
  const { app, last } = await assemble();
  const view = last();
  assert.equal(view.contract, "adaptive-view/0.2");
  for (const key of ["place", "baselineState", "scenarioState", "scenario", "baselineEffects", "scenarioEffects", "effectDelta", "interventions", "unknowns", "errors"]) assert.ok(key in view.adaptive, key);
  assert.equal(view.adaptive.scenarioEffects.schema_version, "adaptive-effects/0.1");
  app.applyIntervention("rain-garden", { targetId: "parking-north" });
  assert.equal(last().adaptive.effectDelta.changes.sewer_load_tendency.local.find(item => item.element_id === "parking-north").after.value, "medium");
  app.setScenario("hot-day");
  assert.equal(last().adaptive.scenario.id, "hot-day");
  assert.equal(last().applied.length, 1, "switching scenario keeps the interventions");
  for (const file of ["../modules/mock-renderer.js", "../modules/text-renderer.js", "../modules/street-slice-adapter.js"]) {
    const source = await text(file);
    assert.ok(!/effect-engine|evaluateState|compareEffects|scenario-engine|place-to-state/.test(source), `${file} must not compute effects`);
  }
  const slice = toStreetSlice(last().adaptive);
  assert.equal(slice.mode, "heat");
  assert.equal(slice.mechanisms.ABSORB.relevant, false, "rain mechanisms are off on a hot day");
  assert.equal(slice.mechanisms.SWEAT.scenario, true);
  assert.ok(slice.segments.some(item => item.role === "rain-garden" && item.new));
  assert.equal(slice.routing.state, "assumed");
});

test("S10. PlaceProvider integration still works through placeToState; routing is never invented", async () => {
  const place = await createMockPlaceProvider(placeFixture).getPlace({ lon: 7.58, lat: 47.56, radius_m: 40 });
  assert.deepEqual(validatePlaceModel(place), []);
  const bare = placeToState(place, { surfaces });
  assert.deepEqual(validateStateModel(bare), []);
  assert.equal(bare.routing.state, "unknown");
  assert.deepEqual(bare.connections, [], "no PlaceModel routing + no assumptions ⇒ no edges");
  assert.equal(evaluateState(bare, scenario("heavy-rain")).effects.sewer_load_tendency.state, "unknown");
  const demo = placeToState(place, { surfaces, routingAssumptions });
  assert.equal(demo.routing.state, "assumed");
  assert.ok(demo.connections.length && demo.connections.every(edge => edge.state === "assumed" && edge.origin === "assumption"));
  // Provider evidence wins over assumptions, and keeps its own state.
  const withRouting = { ...place, routing: { nodes: [{ id: "drain-x", type: "sewer" }], connections: [{ from: "road", to: "drain-x", mode: "surface-runoff", state: "observed", source_id: "fixture:demo-street" }] } };
  assert.deepEqual(validatePlaceModel(withRouting), []);
  const mixed = placeToState(withRouting, { surfaces, routingAssumptions });
  assert.deepEqual(connectionsFrom(mixed, "road").map(edge => [edge.to, edge.state]), [["drain-x", "observed"]]);
  // Unknown stays unknown through the adapter, and the projection back is lossless.
  assert.equal(bare.elements.find(item => item.id === "tram").surface.material.state, "unknown");
  assert.equal(bare.elements.find(item => item.id === "road").subsurface.infiltration_capacity.state, "unknown");
  assert.deepEqual(stateToPlace(bare), place);
  // The legacy 0.1 catalogue runs on the same state path.
  const { last } = await assemble({ catalogue: legacyCatalogue });
  assert.ok(last().adaptive.scenarioEffects);
});

test("S11. the demo composition still runs (mock renderer + text renderer)", async () => {
  const handlers = {};
  const root = { innerHTML: "", addEventListener(type, fn) { handlers[type] = fn; }, querySelector: () => null };
  const { app } = await assemble({ renderer: createMockRenderer(root) });
  assert.match(root.innerHTML, /Effects under a scenario/);
  assert.match(root.innerHTML, /data-scenario="hot-day"/);
  handlers.click({ target: { closest: () => ({ dataset: { scenario: "hot-drought" } }) } });
  assert.match(root.innerHTML, /aria-pressed="true">Hot day in a drought/);
  app.applyIntervention("tree-trench", { targetId: "sidewalk-south" });
  assert.match(root.innerHTML, /Tree trench/);
  const target = { textContent: "" };
  await assemble({ renderer: createTextRenderer(target) });
  assert.match(target.textContent, /EFFECTS UNDER HEAVY RAIN/);
  for (const file of ["../demo/demo.js", "../demo/index.html"]) assert.ok((await text(file)).length);
  assert.match(await text("../demo/demo.js"), /catalogues\/intervention-knowledge\.json/);
});

test("No sponge score, no °C, no runoff %, no rates in effect output", async () => {
  const { app, last } = await assemble();
  app.applyIntervention("green-roof", { targetId: "building-north" });
  for (const id of scenarioCatalogue.scenarios.map(item => item.id)) {
    app.setScenario(id);
    const out = JSON.stringify(last().adaptive.scenarioEffects);
    assert.ok(!/score|°C|percent|mm\/h|"value":\d/.test(out), id);
    for (const result of Object.values(last().adaptive.scenarioEffects.effects)) {
      assert.ok([null, "low", "medium", "high"].includes(result.value));
      if (result.state !== "derived") assert.equal(result.value, null);
    }
  }
});

test("S12. explainer stages are derived from state, and stay unknown where routing is unknown", async () => {
  const stagesOf = view => explainerStages(toStreetSlice(view.adaptive));
  const { app, last } = await assemble();
  // The fixture's trees do not say how big their pits are, so the tree track is unknown (null), not "Grate pit".
  assert.deepEqual(stagesOf(last()).st, { roof: 0, pipe: 0, walk: 0, tree: null, park: 0, road: 0, store: 0 }, "today: the grey street");
  app.applyIntervention("green-roof", { targetId: "building-north" });
  app.applyIntervention("rain-garden", { targetId: "parking-north" });
  app.applyIntervention("tree-trench", { targetId: "sidewalk-north" });
  app.applyIntervention("curb-cut", { targetId: "road" });
  const { st, stages } = stagesOf(last());
  assert.deepEqual(st, { roof: 1, pipe: 0, walk: 0, tree: 2, park: 1, road: 1, store: 1 });
  assert.equal(stages.roof.partial, true, "one of two roofs is green");
  for (const [track, value] of Object.entries(stages)) assert.equal(value.label, EXPLAINER_TRACKS[track][value.stage], track);

  // Without routing evidence the routing-dependent tracks are unknown, not "To sewer".
  const bare = await assemble({ routing: null });
  const unknown = stagesOf(bare.last());
  assert.equal(unknown.st.pipe, null);
  assert.equal(unknown.st.road, null);
  assert.equal(unknown.stages.pipe.state, "unknown");
  assert.equal(unknown.st.roof, 0, "material tracks do not depend on routing");
  // An edge added by an intervention is known even when the rest is not.
  bare.app.applyIntervention("rain-garden", { targetId: "parking-north" });
  bare.app.applyIntervention("curb-cut", { targetId: "road" });
  assert.equal(stagesOf(bare.last()).st.road, 1);
});

test("S13. a knowledge record without a recipe is listed as no-recipe and cannot be applied", async () => {
  const extra = { ...record("rain-garden"), id: "rainwater-harvesting", label: "Rainwater harvesting", category: "reuse", basel_examples: [], sources: [] };
  assert.deepEqual(validateKnowledge({ ...knowledge, interventions: [...knowledge.interventions, extra] }), []);
  const handlers = {};
  const root = { innerHTML: "", addEventListener(type, fn) { handlers[type] = fn; }, querySelector: () => null };
  const { app, last } = await assemble({ catalogue: { ...knowledge, interventions: [...knowledge.interventions, extra] }, renderer: createMockRenderer(root) });
  const item = app.viewModel().interventions.find(entry => entry.id === "rainwater-harvesting");
  assert.equal(item.status, "no-recipe");
  assert.match(item.reason, /no executable recipe/);
  assert.match(root.innerHTML, /data-state="no-recipe"/);
  assert.ok(!root.innerHTML.includes('data-apply="rainwater-harvesting"'), "no Apply button without a recipe");
  app.applyIntervention("rainwater-harvesting", { targetId: "parking-north" });
  assert.equal(app.viewModel().applied.length, 0);
  assert.ok(app.viewModel().errors.some(error => /no executable recipe/.test(error)));
  assert.ok(knowledge.interventions.every(entry => app.viewModel().interventions.find(i => i.id === entry.id).status !== "no-recipe"), "all shipped records have recipes");
  void last;
});

test("S14. Basel examples and sources are links, not placeholders", () => {
  for (const entry of knowledge.interventions) {
    for (const link of [...entry.basel_examples, ...entry.sources]) {
      assert.match(link.url || "", /^https:\/\//, `${entry.id}: ${link.label}`);
      assert.ok(!/placeholder|to be confirmed/i.test(`${link.label} ${link.note || ""}`), `${entry.id}: ${link.label}`);
    }
  }
  assert.ok(record("curb-cut").sources.length >= 1, "curb cut is sourced");
  assert.match(record("green-roof").basel_examples[0].label, /§ 72 BPG/);
});

// ---------- Placement provenance, roof systems, rain barrels, tree pits (S15–S24)

const stagesOf = view => explainerStages(toStreetSlice(view.adaptive));
// Synthetic fixture edits, for tests only (not researched Basel data).
const withElements = (edit) => ({ ...placeFixture, elements: placeFixture.elements.map(element => edit(structuredClone(element)) ?? element) });
const extraElement = element => ({ ...placeFixture, elements: [...placeFixture.elements, element] });
const observed = value => ({ value, state: "observed", source_id: "fixture:demo-street" });
// Synthetic knowledge record so the compiler's rain-barrel recipe can be exercised. NOT a catalogue entry.
const syntheticBarrel = { id: "rain-barrel", label: "Rain barrel (test fixture)", category: "reuse", description: "Synthetic test record.", mechanisms: ["STORE"], applies_to: { element_types: ["building"] }, requirements: [], constraints: [], basel_examples: [], sources: [] };

test("S15. a rain garden that replaces parking activates the parking track", async () => {
  const { app, last } = await assemble();
  app.applyIntervention("rain-garden", { targetId: "parking-north" });
  const garden = last().adaptive.scenarioState.elements.find(element => element.type === "rain-garden");
  assert.deepEqual([garden.placement.surface.value, garden.placement.mode.value], ["parking", "replaces"]);
  const segment = toStreetSlice(last().adaptive).segments.find(item => item.element_id === garden.id);
  assert.equal(segment.placement.surface.value, "parking");
  const { st, stages } = stagesOf(last());
  assert.equal(st.park, 1);
  assert.deepEqual(stages.park.derived_from, [garden.id]);
  app.applyIntervention("tree-trench", { targetId: "parking-north" });
  assert.equal(stagesOf(last()).st.park, 2, "a trench on the same parking overflows into the garden: joined");
});

test("S16. a sidewalk rain garden does not activate the parking track", async () => {
  const { app, last } = await assemble();
  app.applyIntervention("rain-garden", { targetId: "sidewalk-north" });
  const { st, stages } = stagesOf(last());
  assert.equal(st.park, 0, "parking was not converted");
  assert.match(stages.park.note, /not on parking/);
  assert.equal(st.store, 1, "it is still storage with an overflow");
});

test("S17. a rain garden with unknown (legacy) placement is unknown, not a parking conversion", async () => {
  const place = extraElement({ id: "garden-legacy", type: "rain-garden", label: "Rain garden (provider, no placement)", presence: observed(true), surface: observed("planted"), area_m2: observed(12) });
  assert.deepEqual(validatePlaceModel(place), []);
  const { last } = await assemble({ place });
  assert.equal(last().adaptive.baselineState.elements.find(item => item.id === "garden-legacy").placement, undefined, "missing placement stays missing");
  const { st, stages } = stagesOf(last());
  assert.equal(st.park, null);
  assert.equal(stages.park.state, "unknown");
  assert.match(stages.park.note, /placement unknown/);
  // The legacy 0.1 catalogue's rain garden (vegetation tagged rain-garden) carries placement through the same recipe path.
  const legacy = await assemble({ catalogue: legacyCatalogue });
  legacy.app.applyIntervention("tree-rain-garden", { targetId: "parking-north" });
  assert.equal(stagesOf(legacy.last()).st.park, 1);
  const legacySidewalk = await assemble({ catalogue: legacyCatalogue });
  legacySidewalk.app.applyIntervention("tree-rain-garden", { targetId: "sidewalk-north" });
  assert.equal(stagesOf(legacySidewalk.last()).st.park, 0);
  // A provider that does say where it is gets used, and an invalid value is rejected.
  const placed = extraElement({ id: "garden-p", type: "rain-garden", label: "Rain garden", presence: observed(true), surface: observed("planted"), area_m2: observed(12), placement: { surface: observed("parking"), mode: observed("replaces") } });
  assert.equal(stagesOf((await assemble({ place: placed })).last()).st.park, 1);
  const bad = extraElement({ id: "garden-b", type: "rain-garden", label: "Rain garden", presence: observed(true), surface: observed("planted"), area_m2: observed(12), placement: { surface: observed("carpark"), mode: observed("replaces") } });
  assert.ok(validatePlaceModel(bad).some(error => /placement.surface/.test(error)));
});

test("S18. a roof garden (intensive) reaches the Roof garden stage; roof_system is validated", async () => {
  const { app, last } = await assemble();
  app.applyIntervention("green-roof", { targetId: "building-north", params: { roof_system: "intensive" } });
  app.applyIntervention("green-roof", { targetId: "building-south", params: { roof_system: "intensive" } });
  assert.equal(last().adaptive.scenarioState.elements.find(item => item.id === "building-north").surface.material.value, "roof-garden");
  const { st, stages } = stagesOf(last());
  assert.equal(st.roof, 2);
  assert.equal(stages.roof.label, "Roof garden");
  const before = last().applied.length;
  app.applyIntervention("green-roof", { targetId: "building-north", params: { roof_system: "sky-forest" } });
  assert.equal(last().applied.length, before);
});

test("S19. a rain barrel reaches the Rain barrel downpipe stage, and is not underground storage", async () => {
  const catalogue = { ...knowledge, interventions: [...knowledge.interventions, syntheticBarrel] };
  const { app, last } = await assemble({ catalogue });
  const sewerBefore = last().adaptive.scenarioEffects.effects.sewer_load_tendency.value;
  app.applyIntervention("rain-barrel", { targetId: "building-north" });
  const slice = toStreetSlice(last().adaptive);
  assert.equal(slice.rain_barrels.length, 1);
  assert.deepEqual(slice.rain_barrels[0].receives_from, ["downpipe-north"]);
  assert.deepEqual([slice.rain_barrels[0].placement.surface.value, slice.rain_barrels[0].placement.mode.value], ["roof", "adjacent"]);
  const { st, stages } = explainerStages(slice);
  assert.equal(st.pipe, 1);
  assert.equal(stages.pipe.partial, true, "only one of two buildings");
  assert.equal(st.store, 0, "a barrel is not underground storage");
  assert.equal(last().adaptive.scenarioEffects.effects.sewer_load_tendency.value, sewerBefore, "no barrel volume or attenuation is claimed");
  // Without routing the barrel exists, but what feeds it is unknown.
  const bare = await assemble({ catalogue, routing: null });
  bare.app.applyIntervention("rain-barrel", { targetId: "building-north" });
  const unknown = toStreetSlice(bare.last().adaptive);
  assert.deepEqual(unknown.rain_barrels[0].receives_from, []);
  assert.equal(explainerStages(unknown).st.pipe, null);
});

test("S20. an enlarged tree pit reaches Bigger pit", async () => {
  const place = withElements(element => { if (element.type === "tree") { element.pit = observed("standard"); return element; } });
  const { app, last } = await assemble({ place });
  assert.equal(record("enlarged-tree-pit").applies_to.element_types[0], "tree");
  app.applyIntervention("enlarged-tree-pit", { targetId: "tree-1" });
  assert.equal(last().adaptive.scenarioState.elements.find(item => item.id === "tree-1").vegetation.pit.value, "enlarged");
  const { st, stages } = stagesOf(last());
  assert.equal(st.tree, 1);
  assert.equal(stages.tree.label, "Bigger pit");
  assert.equal(stages.tree.partial, true, "two trees keep standard pits");
});

test("S21. standard tree pits do not claim Bigger pit; unknown pits stay unknown", async () => {
  const place = withElements(element => { if (element.type === "tree") { element.pit = observed("standard"); return element; } });
  assert.equal(stagesOf((await assemble({ place })).last()).st.tree, 0);
  assert.equal(stagesOf((await assemble()).last()).st.tree, null, "fixture trees have no pit evidence");
  const bad = withElements(element => { if (element.id === "tree-1") { element.pit = observed("huge"); return element; } });
  assert.ok(validatePlaceModel(bad).some(error => /pit/.test(error)));
});

test("S22. mixed roof states stay partial and honest", async () => {
  const roofs = async (north, south, place) => {
    const { app, last } = await assemble(place ? { place } : {});
    for (const [id, system] of [["building-north", north], ["building-south", south]]) if (system) app.applyIntervention("green-roof", { targetId: id, params: { roof_system: system } });
    return stagesOf(last()).stages.roof;
  };
  assert.deepEqual([(await roofs()).stage, (await roofs()).partial], [0, undefined], "all unchanged");
  const some = await roofs("extensive");
  assert.deepEqual([some.stage, some.partial], [1, true], "some standard green roofs");
  const all = await roofs("extensive", "extensive");
  assert.deepEqual([all.stage, all.partial, all.mixed], [1, undefined, undefined], "all standard");
  const mixed = await roofs("extensive", "intensive");
  assert.deepEqual([mixed.stage, mixed.mixed], [1, true], "standard + roof garden: the weaker stage, flagged mixed");
  assert.match(mixed.note, /Roof garden/);
  const gardens = await roofs("intensive", "intensive");
  assert.deepEqual([gardens.stage, gardens.partial, gardens.mixed], [2, undefined, undefined], "all roof gardens");
  const unknownPlace = withElements(element => { if (element.type === "building") { element.surface = { value: null, state: "unknown" }; return element; } });
  const unknown = await roofs(null, null, unknownPlace);
  assert.deepEqual([unknown.stage, unknown.state], [null, "unknown"], "unknown roof material is not 'Bare'");
});

test("S23. the shipped catalogue still validates; every record is executable; no-recipe still fails", async () => {
  assert.deepEqual(validateKnowledge(knowledge), []);
  for (const id of ["depave", "permeable-parking", "curb-cut", "tree-trench", "rain-garden", "green-roof", "enlarged-tree-pit"]) assert.ok(record(id), id);
  const { app } = await assemble();
  for (const item of app.viewModel().interventions) assert.notEqual(item.status, "no-recipe", item.id);
  assert.ok(!knowledge.interventions.some(item => item.id === "rain-barrel"), "no unsourced rain-barrel record is shipped");
  const { app: withExtra } = await assemble({ catalogue: { ...knowledge, interventions: [...knowledge.interventions, { ...syntheticBarrel, id: "cistern" }] } });
  assert.equal(withExtra.viewModel().interventions.find(item => item.id === "cistern").status, "no-recipe");
  withExtra.applyIntervention("cistern", { targetId: "building-north" });
  assert.ok(withExtra.viewModel().errors.some(error => /no executable recipe/.test(error)));
});

test("S24. recipe → state → PlaceModel → state round-trip keeps placement, roof system and tree pit", async () => {
  const place = withElements(element => { if (element.type === "tree") { element.pit = observed("standard"); return element; } });
  const state = placeToState(place, { surfaces, routingAssumptions });
  const steps = [["rain-garden", "parking-north", null], ["green-roof", "building-north", { roof_system: "intensive" }], ["enlarged-tree-pit", "tree-2", null]];
  let next = state;
  for (const [id, target, params] of steps) {
    const executable = compileIntervention(record(id), next, target, { params, surfaces });
    assert.ok(!executable.error, executable.error);
    next = applyExecutable(next, executable);
  }
  assert.deepEqual(validateStateModel(next), []);
  const back = placeToState(stateToPlace(next), { surfaces, routingAssumptions });
  const garden = back.elements.find(item => item.type === "rain-garden");
  assert.deepEqual([garden.placement.surface.value, garden.placement.mode.value], ["parking", "replaces"]);
  assert.equal(back.elements.find(item => item.id === "building-north").surface.material.value, "roof-garden");
  assert.equal(back.elements.find(item => item.id === "tree-2").vegetation.pit.value, "enlarged");
  assert.equal(back.elements.find(item => item.id === "tree-1").vegetation.pit.value, "standard");
  assert.deepEqual(validatePlaceModel(stateToPlace(next)), []);
});
