// State → intervention → effect layer. Run: node --test adaptive-interface/tests/   (part of `make smoke`)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ev } from "../runtime/evidence.js";
import { placeToState } from "../runtime/place-to-state.js";
import { evaluateState, compareEffects, EFFECT_KEYS } from "../runtime/effect-engine.js";
import { applyStateOperations, connectionsFrom, connectionsTo, replaceConnection, surfaceFromArchetype } from "../runtime/state-model.js";
import { compileIntervention, evaluateKnowledge, RECIPES } from "../runtime/intervention-compiler.js";
import { validateKnowledge, validateState, FORBIDDEN_KNOWLEDGE_KEYS } from "../runtime/validate.js";
import { AdaptiveInterfaceOrchestrator } from "../runtime/orchestrator.js";
import { createMockPlaceProvider } from "../modules/mock-place-provider.js";
import { createMockKnowledgeProvider } from "../modules/mock-knowledge-provider.js";
import { createMockInterventionProvider } from "../modules/mock-intervention-provider.js";
import { createTextRenderer, renderText } from "../modules/text-renderer.js";
import { stateToStreetSlice, explainerStages } from "../modules/street-slice-adapter.js";

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const place = await json("../examples/demo-place.json");
const knowledge = await json("../catalogues/intervention-knowledge.json");
const surfaces = await json("../catalogues/surfaces.json");
const scenarios = await json("../catalogues/scenarios.json");
const catalogue = await json("../examples/demo-interventions.json");
const S = id => scenarios.scenarios.find(item => item.id === id);
const K = id => knowledge.interventions.find(item => item.id === id);

// ---------- small synthetic states

const ground = (archetype, overrides = {}) => ({
  infiltration_capacity: overrides.infiltration ?? ev(null, "unknown"),
  storage_capacity: ev(overrides.storage ?? surfaces.archetypes.find(a => a.id === archetype).properties.storage_capacity, "assumed"),
  rootable_volume: ev("low", "assumed"), utility_conflict: ev(null, "unknown"), groundwater_constraint: ev(null, "unknown")
});
const surfaceEl = (id, type, archetype, area, extra = {}) => ({
  id, type, label: id, presence: ev(true, "observed"), area_m2: ev(area, "observed"),
  surface: surfaceFromArchetype(surfaces, archetype), subsurface: ground(archetype, extra), vegetation: null, ...extra.fields
});
const nodeEl = (id, type) => ({ id, type, label: id, presence: ev(true, "assumed"), area_m2: ev(null, "not-applicable"), surface: null, subsurface: null, vegetation: null });
const treeEl = (id, canopy) => ({ id, type: "tree", label: id, presence: ev(true, "observed"), area_m2: ev(null, "not-applicable"), surface: null, subsurface: null, vegetation: { canopy: ev(canopy, "assumed"), soil_water_available: ev(null, "unknown") } });
const edge = (from, to, mode) => ({ id: `${from}→${to}`, from, to, medium: "rainwater", mode, state: "assumed" });
const stateOf = (elements, connections) => ({ schema_version: "adaptive-state/0.2", place_id: "t", label: "t", elements: [...elements, nodeEl("sewer", "sewer"), nodeEl("ground", "ground")], connections, context: {}, provenance: [{ id: "test", kind: "test", label: "test" }] });

const asphaltStreet = () => stateOf(
  [surfaceEl("road-east", "road", "asphalt", 400), nodeEl("gully-2", "gully")],
  [edge("road-east", "gully-2", "surface-runoff"), edge("gully-2", "sewer", "pipe")]
);

// ---------- 1–6: effect rules

test("1. asphalt + sewer connection → high runoff tendency in heavy-rain", () => {
  const { effects } = evaluateState(asphaltStreet(), S("heavy-rain"));
  assert.equal(effects.runoff_tendency.value, "high");
  assert.equal(effects.runoff_tendency.state, "derived");
  assert.ok(effects.runoff_tendency.drivers.includes("road-east.surface.sealed_fraction"));
  assert.equal(effects.sewer_load_tendency.value, "high");
  assert.ok(effects.sewer_load_tendency.drivers.includes("connection:road-east→gully-2"));
  assert.equal(evaluateState(asphaltStreet(), S("hot-day")).effects.runoff_tendency.state, "not-applicable", "no rain, no runoff claim");
});

test("2. changing only water routing changes sewer-load tendency", () => {
  const base = asphaltStreet();
  base.elements.push(surfaceEl("garden", "rain-garden", "tree-bed", 30));
  base.connections.push(edge("garden", "sewer", "overflow"));
  const rerouted = replaceConnection(base, { from: "road-east", to: "gully-2" }, { from: "road-east", to: "garden", mode: "surface-runoff" }).state;
  assert.deepEqual(rerouted.elements, base.elements, "no element or material changed");
  const before = evaluateState(base, S("heavy-rain")).effects;
  const after = evaluateState(rerouted, S("heavy-rain")).effects;
  assert.equal(after.runoff_tendency.value, before.runoff_tendency.value, "runoff generation unchanged");
  assert.equal(before.sewer_load_tendency.value, "high");
  assert.equal(after.sewer_load_tendency.value, "low", "high-storage receiver in the path lowers sewer load");
  assert.deepEqual(connectionsTo(rerouted, "garden").map(e => e.from), ["road-east"]);
  assert.deepEqual(connectionsFrom(base, "road-east").map(e => e.to), ["gully-2"], "input untouched");
});

test("3. permeable surface + unknown infiltration → infiltration stays unknown", () => {
  const unknownSoil = stateOf([surfaceEl("lot", "parking", "permeable-paving", 200)], [edge("lot", "ground", "infiltration")]);
  const result = evaluateState(unknownSoil, S("heavy-rain")).effects.infiltration_potential;
  assert.equal(result.state, "unknown");
  assert.equal(result.value, null);
  assert.match(result.reason, /lot\.subsurface\.infiltration_capacity/);
  const knownSoil = stateOf([surfaceEl("lot", "parking", "permeable-paving", 200, { infiltration: ev("high", "observed") })], []);
  assert.equal(evaluateState(knownSoil, S("heavy-rain")).effects.infiltration_potential.state, "derived", "known soil gives a derived result");
});

test("4. planted / moist state increases evapotranspiration potential", () => {
  const sealed = stateOf([surfaceEl("plaza", "sidewalk", "sealed-paving", 300)], []);
  const planted = stateOf([surfaceEl("plaza", "sidewalk", "sealed-paving", 200), surfaceEl("bed", "vegetation", "planted-soil", 100, { fields: { vegetation: { canopy: ev("none", "assumed"), soil_water_available: ev(null, "unknown") } } })], []);
  const a = evaluateState(sealed, S("hot-day")).effects.evapotranspiration_potential;
  const b = evaluateState(planted, S("hot-day")).effects.evapotranspiration_potential;
  assert.equal(a.value, "low");
  assert.equal(b.value, "medium");
  const fed = structuredClone(planted);
  fed.connections.push(edge("plaza", "bed", "surface-runoff"));
  assert.equal(evaluateState(fed, S("hot-day")).effects.soil_water_availability.value, "high", "runoff routed into planting raises soil water");
});

test("5. more tree canopy increases shade in hot-day", () => {
  const few = stateOf([surfaceEl("street", "road", "asphalt", 800), treeEl("t1", "low")], []);
  const many = stateOf([surfaceEl("street", "road", "asphalt", 800), treeEl("t1", "high"), treeEl("t2", "high")], []);
  const a = evaluateState(few, S("hot-day")).effects.shade;
  const b = evaluateState(many, S("hot-day")).effects.shade;
  assert.equal(a.value, "low");
  assert.equal(b.value, "high");
  assert.equal(compareEffects(evaluateState(few, S("hot-day")), evaluateState(many, S("hot-day"))).changes.shade.direction, "up");
  assert.equal(evaluateState(many, S("heavy-rain")).effects.shade.state, "not-applicable");
});

test("6. hot-drought reduces evapotranspiration relative to hot-day", () => {
  const green = stateOf([surfaceEl("bed", "vegetation", "planted-soil", 100, { fields: { vegetation: { canopy: ev("none", "assumed"), soil_water_available: ev(null, "unknown") } } }), surfaceEl("walk", "sidewalk", "sealed-paving", 100), treeEl("t1", "medium")], []);
  const day = evaluateState(green, S("hot-day")).effects;
  const drought = evaluateState(green, S("hot-drought")).effects;
  assert.equal(day.evapotranspiration_potential.value, "medium");
  assert.equal(drought.evapotranspiration_potential.value, "low");
  assert.equal(drought.soil_water_availability.value, "low");
});

test("Effect values are qualitative only, with drivers or a reason", () => {
  for (const id of ["heavy-rain", "hot-day", "hot-drought"]) {
    const { effects } = evaluateState(placeToState(place, { surfaces }), S(id));
    assert.deepEqual(Object.keys(effects).sort(), [...EFFECT_KEYS].sort());
    for (const [key, r] of Object.entries(effects)) {
      assert.ok(["low", "medium", "high", null].includes(r.value), `${key}: ${r.value}`);
      assert.ok(["derived", "unknown", "not-applicable"].includes(r.state));
      if (r.state === "derived") assert.ok(Array.isArray(r.drivers) && r.rule, key);
      if (r.state !== "derived") assert.equal(r.value, null, `${key} ${r.state} must not carry a value`);
      if (r.state === "unknown") assert.ok(r.reason, key);
    }
  }
});

// ---------- 7–8: knowledge and compiler

test("7. intervention knowledge compiles into executable state operations", () => {
  const source = placeToState(place, { surfaces });
  const frozen = JSON.stringify(source);
  const internal = ["set-surface", "set-property", "split-element", "add-element", "add-connection", "remove-connection", "replace-connection", "adjust-count"];
  for (const [id, target] of [["depave", "sidewalk-north"], ["permeable-parking", "parking-north"], ["tree-trench", "sidewalk-south"], ["rain-garden", "parking-north"], ["green-roof", "building-north"]]) {
    const exec = compileIntervention(K(id), source, target, { surfaces });
    assert.equal(exec.error, null, id);
    assert.equal(exec.schema_version, "intervention-execution/0.2");
    assert.ok(exec.operations.length && exec.operations.every(op => internal.includes(op.op)), id);
    const { state, errors } = applyStateOperations(source, exec.operations, { surfaces });
    assert.deepEqual(errors, [], id);
    assert.deepEqual(validateState(state), [], id);
  }
  assert.equal(JSON.stringify(source), frozen, "source state never mutated");
  // Curb cut is pure routing: not applicable without a receiver, a single replace-connection with one.
  assert.equal(evaluateKnowledge(K("curb-cut"), source).status, "not-applicable");
  const withGarden = applyStateOperations(source, compileIntervention(K("rain-garden"), source, "parking-north", { surfaces }).operations, { surfaces }).state;
  const cut = compileIntervention(K("curb-cut"), withGarden, "road", { surfaces });
  assert.deepEqual(cut.operations.map(op => op.op), ["replace-connection"]);
  const routed = applyStateOperations(withGarden, cut.operations, { surfaces }).state;
  assert.equal(JSON.stringify(routed.elements), JSON.stringify(withGarden.elements), "curb cut changes no material");
  // A record without a recipe is kept but not executable.
  const draft = { ...K("depave"), id: "swale", label: "Vegetated swale" };
  assert.equal(evaluateKnowledge(draft, source).status, "no-recipe");
  assert.match(compileIntervention(draft, source, null, { surfaces }).error, /no executable recipe/);
  assert.equal(compileIntervention(K("permeable-parking"), source, "road", { surfaces }).error.includes("not a suitable target"), true);
});

test("8. researcher-facing knowledge has no renderer, layout or execution fields", async () => {
  assert.deepEqual(validateKnowledge(knowledge), []);
  const schema = await json("../contracts/intervention-knowledge.schema.json");
  const record = schema.$defs.intervention;
  assert.equal(record.additionalProperties, false);
  for (const key of Object.keys(record.properties)) assert.ok(!FORBIDDEN_KNOWLEDGE_KEYS.includes(key), key);
  const text = JSON.stringify(knowledge);
  for (const key of ["layout", "band", "svg", "transform", "operations", "split-element", "carve", "reduce-count", "set-surface"]) assert.ok(!text.includes(`"${key}"`), key);
  const tainted = structuredClone(knowledge);
  tainted.interventions[0].layout = { band: 2 };
  tainted.interventions[1].transform = [{ op: "carve" }];
  const errors = validateKnowledge(tainted);
  assert.ok(errors.some(e => e.includes("layout")) && errors.some(e => e.includes("transform")));
  for (const id of ["depave", "permeable-parking", "curb-cut", "tree-trench", "rain-garden", "green-roof"]) assert.ok(K(id) && RECIPES[id], id);
});

// ---------- 9–11: renderer, compatibility, demo

async function assemble({ renderer, legacy = false } = {}) {
  let last;
  const recorder = renderer || { render(view) { last = view; } };
  const app = new AdaptiveInterfaceOrchestrator({
    placeProvider: createMockPlaceProvider(place),
    ...(legacy ? { interventionProvider: createMockInterventionProvider(catalogue) } : { knowledgeProvider: createMockKnowledgeProvider(knowledge) }),
    catalogues: { surfaces, scenarios },
    renderer: recorder
  });
  await app.load({ lon: 7.5741, lat: 47.5735, radius_m: 50 });
  return { app, view: () => last };
}

test("9. the renderer receives effects but does not calculate them", async () => {
  for (const file of ["../modules/mock-renderer.js", "../modules/text-renderer.js", "../modules/street-slice-adapter.js"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(!/effect-engine|evaluateState|compareEffects|scenario-engine|computeEffects/.test(source), `${file} must not compute effects`);
  }
  const { view } = await assemble();
  const doctored = structuredClone(view());
  doctored.scenarioEffects.effects.runoff_tendency = { value: "low", state: "derived", drivers: [] };
  doctored.effectDelta.changes.runoff_tendency.direction = "down";
  assert.match(renderText(doctored), /runoff_tendency\s+high →\s+low\s+down/, "renderer shows what it is given");
});

test("10. the PR #3 PlaceProvider works unchanged through placeToState", async () => {
  const { app, view } = await assemble();
  const v = view();
  assert.equal(v.contract, "adaptive-view/0.2");
  assert.equal(v.mode, "knowledge");
  assert.deepEqual(validateState(v.baselineState), []);
  for (const el of place.elements) assert.ok(v.baselineState.elements.some(s => s.id === el.id), el.id);
  const tram = v.baselineState.elements.find(el => el.id === "tram");
  assert.equal(tram.surface.archetype.state, "unknown", "unknown PlaceModel surface stays unknown in state");
  assert.equal(tram.surface.sealed_fraction.value, null);
  const parking = v.baselineState.elements.find(el => el.id === "parking-north");
  assert.equal(parking.surface.sealed_fraction.state, "derived", "derived from the PlaceModel surface");
  assert.equal(parking.surface.albedo.state, "assumed", "archetype defaults are assumed");
  assert.ok(v.baselineState.connections.every(edge => edge.state === "assumed"), "0.1 has no routing → assumed drainage");
  // A provider that adds routing gets it used as observed.
  const routed = structuredClone(place);
  routed.connections = [{ from: "road", to: "gully-a", mode: "surface-runoff" }, { from: "gully-a", to: "sewer", mode: "pipe" }];
  const state = placeToState(routed, { surfaces });
  assert.ok(state.connections.every(edge => edge.state === "observed"));
  assert.deepEqual(validateState(state), []);
  // Corrections still flow through: correcting the tram makes the state know its surface.
  app.correct({ element_id: "tram", property: "surface", value: "planted", reason: "lawn track" });
  assert.equal(view().baselineState.elements.find(el => el.id === "tram").surface.archetype.value, "grass");
  assert.throws(() => { view().baselineState.elements[0].label = "x"; }, TypeError, "state is frozen");
});

test("11. the demo composition still runs in both paths", async () => {
  const demo = await readFile(new URL("../demo/demo.js", import.meta.url), "utf8");
  for (const [, path] of demo.matchAll(/from "(\.\.\/[^"]+)"/g)) await readFile(new URL(path.replace("../", "../"), new URL("../demo/", import.meta.url)));
  for (const legacy of [false, true]) {
    const target = { textContent: "" };
    const { app } = await assemble({ renderer: createTextRenderer(target), legacy });
    assert.match(target.textContent, /ADAPTIVE VIEW · ready/);
    app.applyIntervention(legacy ? "tree-rain-garden" : "rain-garden", { targetId: "parking-north" });
    assert.match(target.textContent, /Parking spaces\s+10 →\s+9\s+Δ -1/, legacy ? "PR #3 path" : "knowledge path");
    assert.match(target.textContent, /TENDENCIES \(heavy-rain/);
    app.setScenario("hot-day");
    assert.match(target.textContent, /TENDENCIES \(hot-day/);
    app.resetScenario();
    assert.match(target.textContent, /Parking spaces\s+10 →\s+10/);
  }
});

test("Knowledge path end to end: interventions change state, effects follow", async () => {
  const { app, view } = await assemble();
  const before = view().baselineEffects.effects;
  assert.equal(before.sewer_load_tendency.value, "high");
  app.applyIntervention("rain-garden", { targetId: "parking-north" });
  assert.equal(view().interventions.find(i => i.id === "curb-cut").status, "requires-investigation", "receiver now exists");
  app.applyIntervention("curb-cut", { targetId: "road" });
  app.applyIntervention("tree-trench", { targetId: "sidewalk-south" });
  assert.equal(view().effectDelta.changes.sewer_load_tendency.direction, "same", "the two 900 m² roofs still dominate sewer load");
  app.applyIntervention("green-roof", { targetId: "building-north" });
  const v = view();
  assert.deepEqual(v.errors, []);
  assert.equal(v.effectDelta.changes.sewer_load_tendency.direction, "down");
  assert.equal(v.effectDelta.changes.storage_potential.direction, "unknown", "tram surface unknown keeps storage unknown");
  assert.equal(JSON.stringify(v.baselineEffects.effects), JSON.stringify(before), "baseline effects unchanged");
  assert.ok(v.unknowns.some(u => u.scope === "tendency"), "unknown tendencies are listed");
  app.applyIntervention("nonexistent");
  assert.match(view().errors[0], /Unknown intervention/);
  app.resetScenario();
  assert.equal(view().scenarioState, view().baselineState, "reset restores baseline state");
});

test("Street Slice seam: visual tokens come from state, not stage numbers", async () => {
  const { app, view } = await assemble();
  const tokens = () => stateToStreetSlice(view().scenarioState, view().scenarioEffects, view().scenarioDef);
  const start = tokens();
  assert.equal(start.mode, "rain");
  assert.equal(start.parking.surface, "sealed");
  assert.equal(start.road.kerb, "to-drain");
  assert.ok(!JSON.stringify(start).includes("stage"), "no stage numbers");
  app.applyIntervention("permeable-parking", { targetId: "parking-north" });
  assert.equal(tokens().parking.surface, "permeable");
  assert.equal(explainerStages(tokens()).park, "Cars", "permeable paving keeps the cars");
  app.resetScenario();
  app.applyIntervention("rain-garden", { targetId: "parking-north" });
  app.applyIntervention("curb-cut", { targetId: "road" });
  const t = tokens();
  assert.equal(t.road.kerb, "open-kerb");
  assert.equal(explainerStages(t).park, "Rain garden");
  assert.ok(t.mechanisms.includes("STORE") && t.mechanisms.includes("SLOW"));
  app.applyIntervention("green-roof", { targetId: "building-north" });
  assert.equal(explainerStages(tokens()).roof, "Thin green (some roofs)", "one of two roofs is green");
  assert.equal(explainerStages(tokens()).pipe, "To sewer", "a green roof still overflows to the sewer");
  app.setScenario("hot-drought");
  assert.equal(tokens().mode, "heat");
  assert.equal(tokens().drought, true);
});
