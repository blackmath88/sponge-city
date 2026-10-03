# Adaptive Interface — State Engine (implemented slice)

Status: implemented on PR #3, 3 October 2026. Design docs: [STATE-MODEL.md](STATE-MODEL.md), [EFFECT-MODEL.md](EFFECT-MODEL.md), [INTERVENTION-MODEL.md](INTERVENTION-MODEL.md), [BUILD-PLAN-STATE-ENGINE.md](BUILD-PLAN-STATE-ENGINE.md).

> **STATE → INTERVENTION → NEW STATE → EFFECTS UNDER SCENARIO**

```js
const sourceState = placeToState(placeModel, { surfaces, routingAssumptions });   // runtime/place-to-state.js
const before      = evaluateState(sourceState, scenario);                          // runtime/effect-engine.js
const executable  = compileIntervention(knowledge, sourceState, targetId, { surfaces }); // runtime/intervention-compiler.js
const nextState   = applyStateOperations(sourceState, executable.operations);      // runtime/state-ops.js
const after       = evaluateState(nextState, scenario);
const comparison  = compareEffects(before, after);
```

All pure; `sourceState` is never mutated. Baseline (the place), scenario (rain / heat) and interventions are three separate inputs.

## Contracts

| Contract | Who writes it | File |
|---|---|---|
| PlaceModel `adaptive-place/0.1` | Data / API | `contracts/place-model.schema.json` (unchanged, plus optional `routing` and the types `rain-garden`, `tree-trench`) |
| StateModel `adaptive-state/0.2` | nobody: `placeToState` builds it | `contracts/state-model.schema.json` |
| Scenario catalogue | engine team | `contracts/scenario.schema.json`, `catalogues/scenarios.json` |
| EffectResult / EffectDelta | effect engine | `contracts/effect-result.schema.json` |
| Intervention knowledge `0.1` | Basel research | `contracts/intervention-knowledge.schema.json`, `catalogues/intervention-knowledge.json` |
| Surface archetypes | engine team | `catalogues/surfaces.json` |

## Routing: three cases, never confused

| Case | Where it comes from | Edge state |
|---|---|---|
| Real / derived routing | `place.routing` in the PlaceModel (future data) | whatever the provider says (`observed`, `modelled`, `derived`…) |
| Unknown routing | nothing given | **no edges**, `state.routing.state = "unknown"`; sewer load stays unknown |
| Demo assumptions | `examples/demo-routing.json`, passed explicitly by `demo/demo.js` | always `assumed`, `origin: "assumption"` |

`placeToState` never turns missing routing into sewer connections. Provider edges win over assumptions.

## One execution path

```text
intervention-knowledge/0.1 ── intervention-compiler.js ──┐
                                                          ├─▶ state operations ─▶ applyStateOperations() ─▶ new State
intervention-catalog/0.1  ── legacy-catalogue-adapter.js ┘   (set-surface, set-property, add-element,
                                                               add/remove/replace-connection)
```

Geometry (areas, parking counts), surfaces, routing and vegetation are all state, changed only by operations. The 0.1 catalogue is a compatibility input; `scenario-engine.applyIntervention` (PR #3 API) now runs PlaceModel → State → operations → State → PlaceModel. Researchers never write operations: recipes and design assumptions (20 m² depave, 12.5 m² per bay, 10 m² trench…) live in the compiler and are reported as `assumed`.

Compiled today: depave, permeable parking, curb cut (routing only, needs a rain garden or tree trench first), tree trench / Baumrigole (substrate + young tree + paving drains in + overflow to old drain), rain garden, green roof. A knowledge record without a recipe is listed as not executable yet.

## Effects (V0 rules)

Values `low | medium | high`; `unknown` and `not-applicable` carry `value: null`. Water effects apply under rain, heat effects under heat; the rest are `not-applicable`.

| Effect | Per element, from |
|---|---|
| runoff_tendency | `surface.sealed_fraction`, `surface.permeability` |
| sewer_load_tendency | own runoff, then the routing graph to a `sewer` node; each storing element on the way lowers it one level; no edges ⇒ unknown |
| storage_potential | `surface.depression_storage`, `subsurface.storage_capacity` |
| infiltration_potential | `surface.permeability`, `subsurface.infiltration_capacity` (unknown ⇒ unknown) |
| soil_water_availability | scenario `soil_moisture`, raised by runoff inflow or high storage; trees use the bed they are `rooted_in` |
| evapotranspiration_potential | vegetation / canopy capped by soil water |
| surface_heating_tendency | albedo, or evapotranspiration for planted surfaces |
| shade | tree canopy classes (place level: 0–1 low, 2–5 medium, 6+ high; placeholder thresholds) |

Place-level values are area-weighted over elements. Unknown inputs are bracketed as low and high: if both give the same level the result is `derived` (with `unknown_inputs`), otherwise it stays `unknown`. Every result keeps `drivers` and `by_element`, and `compareEffects` lists the local changes, so per-element effects can be shown later without changing the model.

## Street Slice

`modules/street-slice-adapter.js` turns `view.adaptive` into what the Street Slice draws, replacing `stage = 0..4`:

| Street Slice concept | Driven by |
|---|---|
| surface materials | `segments[].material` (archetype) per element role |
| underground layers, utilities, groundwater | `underground` (context evidence, storage by element) |
| sewer | `sewer` (sewer-load effect today / scenario) |
| rain routing | `routing.flows` (typed edges, changed ones flagged) |
| tree trench, permeable parking, roofs / gardens | element types and archetypes in `segments` and `trees` |
| rain vs heat | `mode` from the scenario |
| ABSORB / STORE / SLOW / SWEAT / SHADE / COOL | `mechanisms`: lit from effects (SLOW from routing), `null` when it depends on an unknown |

It maps; it does not calculate effects, and it has no coordinates. The SVG renderer stays free to draw a fixed schematic.

## Not done on purpose

No Sponge Score, no °C, no runoff %, no infiltration rates, no LLM, no Basel API fields in the engine, no layout in knowledge.
