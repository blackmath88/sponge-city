# Adaptive Interface — Orchestration Context

Status: working integration contract, 3 October 2026.

> **Implemented:** the runnable prototype for this contract lives in `contracts/`, `runtime/`, `modules/`, `demo/` and `tests/`. See *Implementation* in [README.md](README.md). Names map as follows: `AdaptiveInterface` = `AdaptiveInterfaceOrchestrator`; `app.open()` = `app.load()`; `interventionProvider.getInterventions(place)` and `getCatalogue()` are both accepted; the scenario engine is optional (`scenarioEngine`, defaults to `runtime/scenario-engine.js`), whose functions are `applyIntervention`, `applyCorrections`, `computeEffects`, and reset is `resetScenario()` / `resetAll()` on the orchestrator.

## Why this exists

Three parallel workstreams are moving at different speeds:

1. **Frontend / educational UI** — the visual language for teaching sponge-city interventions.
2. **Data / API** — Basel spatial data, place reconstruction and evidence retrieval.
3. **Basel sponge-city intelligence** — what Basel has already done, is planning, and which interventions / constraints matter.

The Adaptive Interface is the orchestration layer between them.

The individual parts are intentionally not considered stable yet. The architecture must therefore make every major module replaceable.

## Product vision

```text
EDUCATIONAL UI
learn interventions in a generic scene
        ↓
BASEL SITUATION MAP
God's-eye evidence view
        ↓
PLACE LENS
select a real location
        ↓
PLACE MODEL
semantic interpretation of that location
        ↓
ADAPTIVE INTERFACE
same visual grammar, adapted to the place
        ↓
USER CORRECTION
"Does this look right?"
        ↓
INTERVENTIONS
        ↓
TODAY ↔ SCENARIO
        ↓
EFFECTS + UNKNOWNS
```

The Situation Map is the upstream selection and evidence interface. Do not build a second map for Adaptive Interface.

## Integration principle

Build **basic disposable modules** on both sides of every interface.

The purpose of the first implementation is not fidelity. It is to prove that modules can be swapped independently.

```text
mock UI                 → final educational renderer
mock place provider     → real Basel API / place compiler
mock intervention data  → Basel-intel catalogue
```

The orchestration should remain stable while those modules change.

## Stable seams

### 1. Place Provider

Responsibility:

> Given a place selection, return a semantic `PlaceModel`.

Conceptual API:

```js
placeProvider.getPlace(selection)
```

The provider may initially return a fixture. Later it may compose Basel GIS, OSM, terrain and other sources.

The renderer must not know where the data came from.

### 2. Place Model

The `PlaceModel` is the shared language between data and UI.

Minimum concept:

```json
{
  "schema_version": "adaptive-place/0.1",
  "place_id": "demo-place",
  "label": "Demo Basel street",
  "selection": {
    "lon": 0,
    "lat": 0,
    "radius_m": 50
  },
  "elements": [],
  "context": {},
  "provenance": []
}
```

Suggested element vocabulary:

- building
- road
- sidewalk
- parking
- tree
- vegetation
- water
- tram
- entrance
- fixed-area
- unknown-area

Suggested surface values:

- sealed
- permeable
- planted
- water
- unknown

Suggested evidence states:

- observed
- modelled
- derived
- assumed
- user-corrected
- unknown
- not-applicable

Unknown must never silently become zero, false, safe or feasible.

### 3. Intervention Provider

Responsibility:

> Return a catalogue of possible interventions and their requirements, checks, transformations and explanatory metadata.

Conceptual API:

```js
interventionProvider.getInterventions(place)
```

Initial mock catalogue:

- depave
- permeable parking
- tree + rain garden

The final catalogue can later be replaced with the Basel research team's work.

### 4. Scenario Engine

Responsibility:

- keep baseline and scenario separate;
- apply semantic transformations;
- apply user corrections without rewriting source evidence;
- derive simple defensible metrics;
- reset to baseline.

Conceptual API:

```js
scenarioEngine.apply(baseline, intervention)
scenarioEngine.correct(scenario, correction)
scenarioEngine.compare(baseline, scenario)
scenarioEngine.reset(baseline)
```

### 5. Renderer

Responsibility:

> Render the semantic state. It does not fetch Basel data and does not own calculations.

Conceptual API:

```js
renderer.render({
  baseline,
  scenario,
  catalogue,
  activeIntervention,
  comparison,
  errors
})
```

The first renderer should be intentionally basic and replaceable.

The frontend team should later be able to swap in the educational visual language without changing the orchestration.

## Basic UI modules for the first shell

The first UI only needs enough fidelity to exercise the contracts:

- **Place header** — what place is loaded?
- **Scene renderer** — schematic building / sidewalk / parking / road / trees.
- **Today / Scenario toggle**.
- **Intervention controls**.
- **Effects panel** — geometry-based differences only.
- **Evidence / Unknowns panel**.
- **Correction control** — one or two simple "Does this look right?" edits.

Example:

```text
┌──────────────────────────────────────┐
│ Demo Basel street                    │
├──────────────────────────────────────┤
│ building sidewalk parking road       │
│   ███      ░░░      ▣▣▣   =====     │
├──────────────────────────────────────┤
│ TODAY                 SCENARIO       │
│ sealed 420 m²          375 m²        │
│ trees 3                5             │
├──────────────────────────────────────┤
│ [Depave] [Parking] [Rain garden]     │
├──────────────────────────────────────┤
│ ✓ trees observed                     │
│ ? utilities unknown                  │
│ ? infiltration unknown               │
└──────────────────────────────────────┘
```

This UI is scaffolding, not the final design.

## Basic data modules for the first shell

The mock data should be just rich enough to exercise the system:

```js
{
  id: "parking-1",
  type: "parking",
  surface: "sealed",
  area_m2: 80,
  spaces: 5,
  evidence: "observed"
}
```

Context can contain simple evidence-aware values:

```js
{
  heat: { state: "modelled", value: "high" },
  utilities: { state: "unknown", value: null },
  infiltration: { state: "unknown", value: null }
}
```

Effects initially stay geometric:

- sealed area removed;
- permeable area added;
- planted area added;
- parking spaces changed;
- trees added.

Do not invent cooling degrees, runoff reductions, infiltration rates or engineering feasibility.

## Orchestrator

The central assembly should be deliberately boring:

```js
const app = new AdaptiveInterface({
  placeProvider,
  interventionProvider,
  scenarioEngine,
  renderer
});

await app.open(selection);
```

The orchestrator owns state transitions and wiring.

It must not know:

- Basel API response schemas;
- MapLibre internals;
- final frontend styling;
- research-source document structure.

## Situation Map handoff

The current Situation Map already provides the God's-eye view and Place Lens.

Adaptive Interface should accept a small place selection contract, for example:

```text
lat
lon
radius
optional place-profile reference / serialized selection
```

Later the Situation Map can expose:

> **Open in Sponge View**

The handoff should remain small enough that either the existing Place Profile or a future richer geometry provider can satisfy it.

## Team contract

### Data / API

> Give the orchestrator a valid `PlaceModel`.

### Basel intelligence

> Give the orchestrator an `InterventionCatalogue`.

### Frontend

> Give the orchestrator a renderer for `PlaceModel + Scenario`.

### Orchestration

> Connect them without making any one team's implementation a dependency of another.

## First acceptance demo

Using mocks only:

1. load a demo place;
2. render its semantic scene;
3. show known and unknown evidence;
4. make one user correction;
5. apply one of three interventions;
6. compare baseline and scenario;
7. show geometry-based effects;
8. reset;
9. demonstrate that provider, catalogue and renderer can each be swapped independently.

The success criterion is **replaceability**, not polish.
