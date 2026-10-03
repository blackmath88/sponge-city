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

async function assemble({ catalogue = knowledge, renderer = { views: [], render(view) { this.views.push(view); } }, routing = routingAssumptions } = {}) {
  const app = new AdaptiveInterfaceOrchestrator({
    placeProvider: createMockPlaceProvider(placeFixture),
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
  assert.deepEqual(stagesOf(last()).st, { roof: 0, pipe: 0, walk: 0, tree: 0, park: 0, road: 0, store: 0 }, "today: the grey street");
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
