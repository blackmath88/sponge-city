# Adaptive Interface — Build Plan: State → Intervention → Effect → Renderer

Status: proposed next implementation slice. **Implemented on `feat/adaptive-interface-orchestration` (PR #3)**: phases 1–6 in code, phase 7 as the Street Slice adapter seam (`modules/street-slice-adapter.js`), phase 8 works with the mock provider. See [STATE-ENGINE.md](STATE-ENGINE.md).

## Objective

Refactor the orchestration prototype so the conceptual centre becomes:

```text
PlaceModel
   ↓
State Adapter
   ↓
StateModel
 + Scenario
   ↓
Effect Engine
   ↑
Intervention Adapter
   ↑
Intervention Knowledge
   ↓
New State
   ↓
Effect Comparison
   ↓
Renderer
```

Do this without breaking the existing PR #3 integration seams.

## Phase 1 — add the deeper model beside 0.1

Do not delete the current contracts.

Add:

```text
adaptive-interface/contracts/
  state-model.schema.json
  scenario.schema.json
  effect-result.schema.json
  intervention-knowledge.schema.json
```

Add adapters:

```text
adaptive-interface/runtime/
  place-to-state.js
  intervention-compiler.js
  effect-engine.js
```

The existing `PlaceProvider` remains valid.

## Phase 2 — surface archetype catalogue

Add a small catalogue:

```text
adaptive-interface/catalogues/
  surfaces.json
```

Initial archetypes:

- asphalt;
- concrete;
- sealed-paving;
- gravel;
- permeable-paving;
- grass-joint-paving;
- planted-soil;
- grass;
- tree-bed;
- green-roof;
- water.

Each defines qualitative default properties.

Example:

```json
{
  "id": "asphalt",
  "properties": {
    "sealed_fraction": "high",
    "permeability": "low",
    "vegetation_fraction": "none",
    "depression_storage": "low",
    "albedo": "medium-low"
  }
}
```

These are prototype defaults and must be marked assumed unless replaced by evidence.

## Phase 3 — routing graph

Extend state with typed `connections`.

Support at least:

- runoff;
- downpipe;
- sewer;
- overflow.

Add helpers:

```js
connectionsFrom(state, elementId)
connectionsTo(state, elementId)
replaceConnection(state, oldEdge, newEdge)
```

This enables curb-cut and downpipe-disconnection interventions.

## Phase 4 — scenarios

Add:

```text
adaptive-interface/catalogues/scenarios.json
```

Initial:

- heavy-rain;
- hot-day;
- hot-drought.

The existing Street Slice rain / heat toggle maps directly to these.

## Phase 5 — qualitative effect engine

Implement pure rules.

Suggested output dimensions:

```text
runoff_tendency
sewer_load_tendency
storage_potential
infiltration_potential
soil_water_availability
shade
evapotranspiration_potential
surface_heating_tendency
```

Values:

```text
low
medium
high
unknown
not-applicable
```

Every derived effect should return drivers.

Example:

```js
{
  value: "high",
  state: "derived",
  drivers: [
    "road-east.surface.sealed_fraction",
    "connection:road-east→gully-2"
  ]
}
```

## Phase 6 — split intervention knowledge from execution

Keep current executable intervention catalogue working.

Add:

```text
adaptive-interface/catalogues/intervention-knowledge.json
```

The compiler converts knowledge records plus a small mapping library into execution transformations.

For the first slice support:

- depave;
- permeable parking;
- curb cut;
- tree trench;
- green roof;
- rain garden.

## Phase 7 — adapt Street Slice renderer

Use the uploaded Street Slice as visual reference.

Do not copy its stage logic unchanged.

Create a renderer adapter that maps:

```text
StateModel → visual elements
EffectResult → water / heat overlays
Scenario → rain / heat mode
Intervention application → state differences
```

The SVG can remain schematic and initially fixed-layout.

Replace:

```js
state.stage = 0..4
```

with:

```js
render(stateModel, effectResult, scenario)
```

The visual template can still use the existing SVG assets and aesthetic.

## Phase 8 — preserve adaptive path

Once the state engine works with the mock place:

```text
real PlaceProvider
→ PlaceModel
→ State Adapter
→ same engine
→ same renderer
```

This is the point where the API team's real data can start replacing mock state.

## Suggested code

### state engine entry point

```js
export function evaluateState(state, scenario) {
  return {
    schema_version: "adaptive-effects/0.1",
    scenario_id: scenario.id,
    effects: {
      runoff_tendency: evaluateRunoff(state, scenario),
      sewer_load_tendency: evaluateSewerLoad(state, scenario),
      storage_potential: evaluateStorage(state, scenario),
      infiltration_potential: evaluateInfiltration(state, scenario),
      shade: evaluateShade(state, scenario),
      evapotranspiration_potential: evaluateEvapotranspiration(state, scenario),
      surface_heating_tendency: evaluateSurfaceHeating(state, scenario)
    }
  };
}
```

### intervention flow

```js
const sourceState = placeToState(placeModel);

const before = evaluateState(sourceState, scenario);

const executable = compileIntervention(
  interventionKnowledge,
  sourceState,
  targetId
);

const nextState = applyStateOperations(sourceState, executable.operations);

const after = evaluateState(nextState, scenario);

const comparison = compareEffects(before, after);
```

### renderer contract evolution

```js
renderer.render({
  place,
  baselineState,
  scenarioState,
  scenario,
  baselineEffects,
  scenarioEffects,
  effectDelta,
  interventions,
  unknowns,
  errors
});
```

## Test plan

Add tests proving:

1. asphalt + sewer connection produces high runoff tendency under heavy rain;
2. changing only routing can change sewer-load tendency;
3. permeable surface with unknown infiltration leaves infiltration effect unknown;
4. planted + moist state increases evapotranspiration potential;
5. tree canopy changes shade under hot-day scenario;
6. hot-drought scenario can reduce evapotranspiration relative to hot-day;
7. intervention knowledge can compile to an executable operation;
8. researcher-facing knowledge schema contains no renderer fields;
9. renderer receives effects but does not calculate them;
10. old PlaceProvider / PR #3 demo still works through the state adapter.

## Guardrails

- Do not add exact scientific numbers unless backed by a source/model.
- Keep qualitative rules visible and testable.
- Keep every assumption marked assumed.
- Do not put renderer layout in intervention knowledge.
- Do not put Basel API fields in the state engine.
- Do not make real-data integration a prerequisite for the engine demo.
