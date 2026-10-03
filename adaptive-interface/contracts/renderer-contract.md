# Renderer contract (adaptive-view/0.1)

A renderer turns the orchestrator's view model into pixels. It is the frontend team's seam: the mock renderer in `modules/mock-renderer.js` is disposable, and the educational Sponge Street renderer should replace it wholesale.

## Interface

```js
const renderer = {
  connect(actions) { /* optional: keep the actions object for user input */ },
  render(view)     { /* required: draw the view model; called after every change */ }
};
```

`new AdaptiveInterfaceOrchestrator({ placeProvider, interventionProvider, renderer })` is all it takes. The orchestrator throws a `TypeError` if `render` is missing.

## What a renderer receives: `render(view)`

| Field | Type | Meaning |
|---|---|---|
| `contract` | `"adaptive-view/0.1"` | Version of this contract |
| `status` | `idle` · `loading` · `ready` · `error` | Lifecycle |
| `selection` | `{ lon, lat, radius_m, from, place_profile_id }` or `null` | What the user picked upstream |
| `source` | PlaceModel | Provider output, never changed |
| `baseline` | PlaceModel | **TODAY**: source + user corrections |
| `scenario` | PlaceModel | **SCENARIO**: baseline + applied interventions |
| `catalogue` | InterventionCatalogue | As provided |
| `interventions` | array | Per intervention: `id, label, summary, mechanisms, sources, status, reason, eligible_targets, requirements, checks, applied_count` |
| `applied` | array | `{ intervention_id, target_id, params }` in order |
| `activeIntervention` | id or `null` | Last applied |
| `corrections` | array | User corrections, in order |
| `effects` | array | Per metric: `{ id, label, unit, baseline, scenario, change }`, each an evidence value |
| `unknowns` | array | `{ scope: context·element·effect, key, label, note }` |
| `errors` | string[] | Show them; never swallow |

`source`, `baseline` and `scenario` are deep-frozen. Renderers read; they never mutate.

PlaceModel fields a renderer needs: `elements[].type` (semantic vocabulary), `surface`, `area_m2`, `presence`, `count`, `label`, `origin`, optional `layout` hints, and the `state` on every value. See `place-model.schema.json`.

## What a renderer may call: `actions`

| Action | Effect |
|---|---|
| `applyIntervention(id, { targetId, params })` | Adds a step to the scenario. Unknown id or ineligible target → message in `errors`, nothing changes |
| `correct({ element_id, property, value, reason })` | "Does this look right?" — `property` is `surface`, `presence`, `area_m2` or `count`; `value: null` means "not sure" (unknown). Recorded as `user-corrected` with `replaces` |
| `correct({ action: "add-element", element, reason })` | Adds an element the source missed (e.g. a tree) |
| `undoCorrection(id)` | Removes one correction |
| `resetScenario()` | SCENARIO = TODAY |
| `resetAll()` | Also drops corrections: TODAY = source |
| `load(selection)` | Loads another place |

A correction restarts the scenario, because interventions were chosen on the old interpretation.

## Rules for renderers

1. **No source knowledge.** No data.bs.ch ids, WMS layers, OSM tags or API field names. If a renderer needs something, add it to the PlaceModel.
2. **No calculations.** Effects, statuses and eligibility come from the view model. Layout maths for drawing is fine.
3. **Show evidence state.** Every value carries `state`: observed, modelled, derived, assumed, user-corrected, unknown, not-applicable. A renderer must make unknown visible and must not draw it as zero, sealed, safe or feasible.
4. **TODAY and SCENARIO side by side or toggled**, with changed elements distinguishable (`origin: "intervention:<id>"`, or compare by id).
5. **Effects are geometry only.** Show `change.assumptions` where present. Do not add cooling, runoff or storage numbers; they are listed in `unknowns` as not modelled.

## Mapping to the Sponge Street explainer

The explainer (`feat/sponge-street-explainer`) draws a cross-section with segments Building, Sidewalk (with tree), Parking, Road and Underground. An adapter renderer can map:

| PlaceModel | Explainer segment |
|---|---|
| `building` (+ `entrance`) | Building |
| `sidewalk`, `vegetation`, `tree`, `fixed-area` | Sidewalk + tree |
| `parking` | Parking bay |
| `road`, `tram` | Road |
| context `utilities`, `infiltration_capacity`, `soil_water` | Underground (as unknowns) |

Its stage ladders (e.g. parking: cars → rain garden → joined to trench) can be driven by `applied` and the catalogue, while its illustrative water shares stay inside the explainer and are never shown as place results.

## Proven replaceable

`modules/text-renderer.js` is a second renderer (plain text). `demo/index.html?renderer=text` swaps it in without touching the orchestrator, and test 7 does the same in Node.

---

## adaptive-view/0.2: state and effect payload

When the orchestrator is given `catalogues: { surfaces, scenarios }`, the view model is a **superset** of 0.1. Every 0.1 field keeps its meaning, so a 0.1 renderer still works.

| Field | Meaning |
|---|---|
| `mode` | `knowledge` (interventions compiled from `intervention-knowledge/0.1`) or `execution-0.1` (PR #3 catalogue) |
| `place` | The baseline PlaceModel (same object as `baseline`) |
| `baselineState`, `scenarioState` | StateModel `adaptive-state/0.2`, TODAY and SCENARIO, deep-frozen. New elements such as `rain-garden`, `tree-trench` or a new `tree` appear here, not in the PlaceModel |
| `scenario_id`, `scenarioDef`, `scenarios` | Selected scenario (`heavy-rain`, `hot-day`, `hot-drought`) and the list to choose from. The brief's `scenario` is named `scenarioDef` because `scenario` already means the scenario PlaceModel in 0.1 |
| `baselineEffects`, `scenarioEffects` | `adaptive-effects/0.1`: eight qualitative tendencies with drivers |
| `effectDelta` | Per tendency `{ before, after, direction: up / down / same / unknown / not-applicable }` |
| `interventions` | In knowledge mode also `kind`, `category`, `description`, `basel_examples`; `status` may be `no-recipe` |
| `effects` | Geometry (sealed / permeable / planted area, parking, trees), now computed from state in knowledge mode |
| `unknowns` | Adds `scope: "tendency"` for tendencies that depend on unknown evidence |

New action: `setScenario(id)`. Switching the scenario keeps interventions and corrections.

The renderer still calculates nothing: `effects`, `baselineEffects`, `scenarioEffects` and `effectDelta` are given. Test 9 in `tests/state-engine.test.mjs` checks this.

## Street Slice seam

`modules/street-slice-adapter.js` shows how the Street Slice / Sponge Street cross-section should be driven:

```text
current:  stage = 0..4 → show / hide SVG pieces
future:   stateToStreetSlice(scenarioState, scenarioEffects, scenarioDef) → visual tokens → renderer decides what to draw
```

It returns tokens, never coordinates:

| Token | From |
|---|---|
| `mode` rain / heat, `drought` | scenario |
| `building.roof` bare / green / mixed, `building.downpipe` to-sewer / to-receiver | roof archetype, roof routing |
| `sidewalk.surface`, `sidewalk.tree` grate-pit / trench | surface properties, tree-trench elements |
| `parking.surface`, `parking.rain_garden`, `parking.bays`, `parking.drains_to` | surface, carved receivers, count, routing |
| `road.kerb` to-drain / open-kerb | whether road runoff routes into a receiver (curb cut) |
| `underground.storage` none / trench / rain-garden / connected, `overflow`, `utilities`, `infiltration` | receivers, overflow edges, context evidence |
| `flows` | typed routing edges (for animated rain paths) |
| `overlays` | the eight effect tendencies (for water / heat overlays) |
| `mechanisms` ABSORB · STORE · SLOW · SWEAT · SHADE · COOL | state features and effects |

`explainerStages(visual)` maps the tokens back onto the explainer's existing stage names (Bare / Thin green, Grate pit / Sponge trench, Cars / Rain garden / Joined to trench, To the drain / Open kerb …), so its SVG artwork can be reused while the stage itself is derived from state. Its illustrative water percentages must not be shown for a real place.
