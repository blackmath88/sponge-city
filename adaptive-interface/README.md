# Adaptive Interface

Status: working concept, 3 October 2026.

## Thesis

The educational sponge-city interface should become the visual grammar for understanding **real places**.

The user first learns the interventions in a simplified street scene. Later they choose a real place in Basel and the system translates available spatial evidence into the **same interface**, adapted to that place.

The product is not a digital twin and it should not pretend to know more than the data supports.

> **Learn the principle → choose a place → see the place through the same visual language → edit the interpretation → test interventions → understand effects and unknowns.**

## Core interaction

```text
EDUCATIONAL UI
generic street / square / block
        ↓
MAP
choose a real place in Basel
        ↓
PLACE COMPILER
spatial evidence → semantic scene
        ↓
ADAPTIVE INTERFACE
same visual language, shaped by the selected place
        ↓
CORRECT
user fixes missing or wrong elements
        ↓
INTERVENE
depave / trees / rain garden / permeable parking / etc.
        ↓
COMPARE
today ↔ scenario
        ↓
EFFECTS + UNCERTAINTY
what changes, what is estimated, what is still unknown
```

## Why “adaptive interface”

The map is not the final interface.

A normal GIS experience exposes layers, legends, geometries and attributes. This concept translates those into a human-scale scene:

- this is the street;
- this is where buildings, pavement, parking, trees and green space are;
- these surfaces are sealed or permeable;
- this is what we know about heat, slope, runoff or infiltration;
- these interventions could be explored;
- these constraints are known;
- these important constraints are unknown.

The visual language stays consistent between education and real-place exploration.

## Key architectural idea

Do **not** render directly from raw GIS.

Compile spatial evidence into a typed semantic place model first:

```text
official GIS
+ OpenStreetMap
+ terrain
+ climate / runoff context
+ manual correction
        ↓
SEMANTIC PLACE MODEL
        ↓
renderer
        ↓
educational-style street / block interface
```

Illustrative structure:

```json
{
  "schema_version": "adaptive-place/draft-0",
  "place_id": "example",
  "boundary": null,
  "elements": [
    {"type": "building", "geometry_ref": "…"},
    {"type": "road", "surface": "sealed", "geometry_ref": "…"},
    {"type": "parking", "surface": "sealed", "geometry_ref": "…"},
    {"type": "vegetation", "geometry_ref": "…"},
    {"type": "tree", "geometry_ref": "…"}
  ],
  "context": {
    "slope": {"state": "derived", "value": null},
    "heat": {"state": "modelled", "value": null},
    "infiltration": {"state": "unknown", "value": null},
    "utilities": {"state": "unknown", "value": null}
  }
}
```

## Evidence states are part of the UX

Every important value should preserve how it was obtained.

Suggested states:

- **observed** — directly present in an authoritative source;
- **modelled** — provided by an external model;
- **derived** — calculated from source data;
- **assumed** — explicit default or design assumption;
- **user-corrected** — changed by the user from the generated interpretation;
- **unknown** — not available;
- **not applicable**.

Unknown must never silently become zero, safe or feasible.

## “Does this look right?”

Automatic reconstruction will be imperfect.

That should become part of the interface instead of being hidden.

After selecting a place:

> **We think this place looks like this. Does it look right?**

Possible corrections:

- add / remove a tree;
- add / remove parking;
- change a surface type;
- adjust a boundary;
- mark an entrance;
- identify a use that the source data does not capture;
- lock an area that cannot be changed.

This converts imperfect city data into an assisted interpretation workflow.

## Intervention model

Interventions should be semantic transformations, not decorative objects.

Example:

```text
PERMEABLE PARKING

look for
  parking polygon
  sealed surface

check
  geometry
  traffic / load constraints
  infiltration context
  groundwater context
  ownership
  utilities

transform
  sealed → permeable

report
  converted area
  retained / removed parking
  potential infiltration area
  unresolved constraints
```

Another:

```text
CONNECTED TREE / RAIN GARDEN

look for
  sufficient contiguous surface
  canopy gap
  adjacent runoff source

check
  terrain
  infiltration
  ownership
  utilities
  access requirements

transform
  sealed → planted / storage area
  add tree / canopy scenario
  connect contributing surface

report
  area transformed
  tree count
  contributing catchment
  qualitative mechanisms
  unresolved constraints
```

The compiler can remain deterministic. AI may help explain the resulting structured evidence, but should not invent geometry, feasibility or effects.

## Effects ladder

### Level A — geometry

Credible immediately:

- sealed area removed;
- permeable area added;
- planted area added;
- parking spaces changed;
- trees added;
- canopy footprint changed where explicitly modelled.

### Level B — transparent estimates

Possible with stated assumptions:

- connected catchment;
- storage volume;
- projected canopy;
- runoff retained for a stated design event.

### Level C — engineering / environmental models

Later integrations could model:

- runoff volume;
- peak discharge;
- infiltration;
- evapotranspiration;
- thermal effects.

These should not be faked for the first prototype.

## Relationship to the existing Decision Canvas

The existing Decision Canvas asks:

- where is intervention needed?
- what is possible?
- what effects might matter?

Adaptive Interface adds a complementary interaction layer:

> **What does that mean here, in a place I recognise, using the same language I just learned?**

It can consume the same evidence model and intervention ontology.

## Current orchestration strategy

The current integration contract is documented in [ORCHESTRATION.md](ORCHESTRATION.md). The near-term goal is not to finish the frontend or Basel data layer, but to connect **disposable basic modules** behind stable interfaces so the parallel teams can swap in their real work later.

## North-star sentence

> **Learn what a sponge city is. Then see what it could mean for your street.**

---

## Implementation: orchestration prototype

Status: runnable with mocks, 3 October 2026. **Every module is a mock**; the point is the seams, not the content.

```text
selection ─▶ PlaceProvider ─▶ PlaceModel 0.1 ─▶ (corrections) ─▶ placeToState ─▶ baselineState ──┐
                                                                                                 │  + Scenario ─▶ Effect Engine ─▶ effects ─┐
             Intervention Knowledge ─▶ compiler ─▶ state operations ─▶ applyStateOperations ─▶ scenarioState ─┘                          ├─▶ effectDelta ─▶ Renderer
             (legacy 0.1 catalogue ─▶ compatibility adapter ─▶ same operations)                                                         ┘
```

**A place has a state. An intervention changes that state. Effects emerge from the resulting state under a scenario.** The state engine slice is described in [STATE-ENGINE.md](STATE-ENGINE.md).

Run it: `make run`, then open <http://127.0.0.1:4173/adaptive-interface/demo/> (ES modules do not load from `file://`). `?renderer=text` swaps in a second renderer. From the Situation Map, the place lens has **Open in Sponge View**.

Test it: `make test-adaptive` (also part of `make smoke`). No dependencies.

### Who gives what

| Team | Delivers | Contract | Replaces |
|---|---|---|---|
| **Data / API** | `{ async getPlace(selection) }` returning a `PlaceModel` | [`contracts/place-model.schema.json`](contracts/place-model.schema.json) | `modules/mock-place-provider.js` + `examples/demo-place.json` |
| **Basel research** | Intervention knowledge (JSON): what, why, mechanisms, requirements, constraints, examples, sources. No operations, no layout | [`contracts/intervention-knowledge.schema.json`](contracts/intervention-knowledge.schema.json) | `catalogues/intervention-knowledge.json` (the 0.1 `examples/demo-interventions.json` still works via `?catalogue=legacy`) |
| **Frontend** | `{ render(view), connect?(actions) }` | [`contracts/renderer-contract.md`](contracts/renderer-contract.md) | `modules/mock-renderer.js` |
| **Situation Map** | A URL with `lat`, `lon`, `radius` | [`contracts/handoff.md`](contracts/handoff.md) | — (link already in the place lens) |
| **Orchestration** | Connects them, validates, keeps state | `runtime/orchestrator.js` | — |

Assembly is one call, in [`demo/demo.js`](demo/demo.js), the only file that names implementations:

```js
const app = new AdaptiveInterfaceOrchestrator({ placeProvider, interventionProvider, renderer, surfaces, scenarios, routingAssumptions });
await app.load(selection);
```

### Files

| Path | Role | Mock? |
|---|---|---|
| `contracts/place-model.schema.json` | PlaceModel `adaptive-place/0.1` | contract |
| `contracts/intervention-catalog.schema.json` | Catalogue `intervention-catalog/0.1` | contract |
| `contracts/renderer-contract.md` | View model `adaptive-view/0.2` (0.1 fields kept) and actions | contract |
| `contracts/state-model.schema.json` | StateModel `adaptive-state/0.2` (internal) | contract |
| `contracts/scenario.schema.json` | Scenario catalogue | contract |
| `contracts/effect-result.schema.json` | EffectResult + EffectDelta | contract |
| `contracts/intervention-knowledge.schema.json` | Researcher-facing knowledge `intervention-knowledge/0.1` | contract |
| `catalogues/surfaces.json` | Surface archetypes, qualitative defaults (assumed) | prototype data |
| `catalogues/scenarios.json` | heavy-rain, hot-day, hot-drought | prototype data |
| `catalogues/intervention-knowledge.json` | Six interventions as knowledge records | **mock** |
| `runtime/place-to-state.js` | PlaceModel 0.1 ⇄ StateModel adapter | stable |
| `runtime/state-graph.js` | Water-routing graph helpers | stable |
| `runtime/state-ops.js` | `applyStateOperations`: the one execution path | stable |
| `runtime/intervention-compiler.js` | Knowledge + state + target → operations (recipes, design assumptions) | prototype |
| `runtime/legacy-catalogue-adapter.js` | 0.1 catalogue → the same operations | compatibility |
| `runtime/interventions.js` | One interface over both catalogue formats | stable |
| `runtime/effect-engine.js` | Qualitative effects with drivers, comparison | V0 rules |
| `modules/street-slice-adapter.js` | State + effects + scenario → Street Slice visual state | seam |
| `examples/demo-routing.json` | Demo-only drainage assumptions, every edge `assumed` | **fixture** |
| `contracts/handoff.md` | Situation Map → Adaptive Interface URL | contract |
| `runtime/evidence.js` | Evidence states and vocabularies | stable |
| `runtime/validate.js` | Runtime checks of both data contracts | stable |
| `runtime/scenario-engine.js` | Corrections, PR #3 intervention API (now on the state path), geometry metrics, unknowns | stable |
| `runtime/orchestrator.js` | Wires modules, owns state, never imports a mock | stable |
| `runtime/selection.js` | Parses and builds the handoff URL | stable |
| `modules/mock-place-provider.js` | Returns the demo fixture for any selection | **mock** |
| `modules/mock-intervention-provider.js` | Serves a catalogue object | **mock** |
| `modules/mock-renderer.js` | Neutral schematic renderer | **mock, disposable** |
| `modules/text-renderer.js` | Second renderer proving the swap | **mock** |
| `examples/demo-place.json` | Invented Basel-like street, labelled as such | **fixture** |
| `examples/demo-interventions.json` | Depave, permeable parking, tree + rain garden; rules marked `placeholder` | **fixture** |
| `demo/` | Composition root and page | demo |
| `tests/adaptive-interface.test.mjs` | Architectural invariants (PR #3) | test |
| `tests/state-engine.test.mjs` | State → intervention → effects invariants | test |

### Rules the engine enforces

- **Three layers.** `source` (provider, frozen) → `baseline` = source + corrections (TODAY) → `scenario` = baseline + interventions. Applying an intervention never touches the baseline; `resetScenario()` restores it; `resetAll()` drops corrections.
- **Corrections are evidence.** A correction becomes `state: "user-corrected"` with `replaces` holding the original value. "Not sure" is recorded as unknown.
- **Unknown stays unknown.** The validator rejects an unknown with a value. Totals become `unknown` (with the known part shown) while any relevant surface is unknown. Effects are computed from changed elements only, so a known change still shows.
- **Status, not feasibility.** Each intervention is `candidate`, `requires-investigation`, `excluded` or `not-applicable` from the PlaceModel's context and the catalogue's rules. With unknown utilities, nothing is ever a candidate.
- **Geometry effects** (0.1). Sealed, permeable and planted area, parking spaces and trees. Design areas are `assumed` and shown next to the effect.
- **Qualitative effects** (state engine). Runoff, sewer load, storage, infiltration, soil water, shade, evapotranspiration and surface heating as low / medium / high / unknown, each with drivers. No score, no °C, no runoff %, no rates: those stay listed as **not modelled**.
- **Routing is evidence.** Without `place.routing` drainage is unknown; the demo injects `examples/demo-routing.json` explicitly, every edge `assumed`.
- **No AI in the loop.** Nothing in `runtime/` calls a model.
