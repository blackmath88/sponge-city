# Renderer contract (adaptive-view/0.2, 0.1-compatible)

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
| `contract` | `"adaptive-view/0.2"` | Version of this contract. Every 0.1 field below is unchanged; 0.2 adds `adaptive` |
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
| `adaptive` | object or `null` | **0.2:** the state / effect payload below |

### `view.adaptive` (0.2)

The shape `renderer.render({...})` will take once the 0.1 fields retire. Nested so the 0.1 name `scenario` (the scenario *PlaceModel*) keeps its meaning.

| Field | Meaning |
|---|---|
| `place` | PlaceModel after corrections (= `baseline`) |
| `baselineState`, `scenarioState` | StateModel 0.2 before / after interventions (deep-frozen) |
| `scenario` | The external condition (`heavy-rain`, `hot-day`, `hot-drought`); `scenarios` lists them for a toggle |
| `baselineEffects`, `scenarioEffects` | EffectResult under that scenario (`contracts/effect-result.schema.json`) |
| `effectDelta` | Per effect: `before`, `after`, `direction`, `assessment` (improves / worsens / same / unknown), `local` element changes |
| `interventions`, `unknowns`, `errors` | As above; `unknowns` adds `routing` and `effect-result` scopes |

Renderers display these values; they never calculate them. `modules/street-slice-adapter.js` maps the payload to Street Slice visual state (materials, underground, routing, sewer, trees, mechanisms) without stages; `explainerStages(slice)` maps that onto the Sponge Street explainer's stage indices for reuse of its artwork. Intervention `status` may also be `no-recipe` (knowledge only): show it, offer no Apply.

`source`, `baseline` and `scenario` are deep-frozen. Renderers read; they never mutate.

PlaceModel fields a renderer needs: `elements[].type` (semantic vocabulary), `surface`, `area_m2`, `presence`, `count`, `label`, `origin`, optional `layout` hints, and the `state` on every value. See `place-model.schema.json`.

## What a renderer may call: `actions`

| Action | Effect |
|---|---|
| `applyIntervention(id, { targetId, params })` | Adds a step to the scenario. Unknown id or ineligible target → message in `errors`, nothing changes |
| `correct({ element_id, property, value, reason })` | "Does this look right?" — `property` is `surface`, `presence`, `area_m2` or `count`; `value: null` means "not sure" (unknown). Recorded as `user-corrected` with `replaces` |
| `correct({ action: "add-element", element, reason })` | Adds an element the source missed (e.g. a tree) |
| `undoCorrection(id)` | Removes one correction |
| `setScenario(id)` | Switch rain / heat scenario. Keeps place, corrections and interventions |
| `resetScenario()` | SCENARIO = TODAY |
| `resetAll()` | Also drops corrections: TODAY = source |
| `load(selection)` | Loads another place |

A correction restarts the scenario, because interventions were chosen on the old interpretation.

## Rules for renderers

1. **No source knowledge.** No data.bs.ch ids, WMS layers, OSM tags or API field names. If a renderer needs something, add it to the PlaceModel.
2. **No calculations.** Effects, statuses and eligibility come from the view model. Layout maths for drawing is fine.
3. **Show evidence state.** Every value carries `state`: observed, modelled, derived, assumed, user-corrected, unknown, not-applicable. A renderer must make unknown visible and must not draw it as zero, sealed, safe or feasible.
4. **TODAY and SCENARIO side by side or toggled**, with changed elements distinguishable (`origin: "intervention:<id>"`, or compare by id).
5. **No numbers we do not have.** `effects` are geometry; `adaptive` effects are qualitative levels with drivers. Show `change.assumptions` where present. Do not add cooling °C, runoff % or storage volumes; they stay listed in `unknowns` as not modelled.

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


## Explainer stages

`explainerStages(toStreetSlice(view.adaptive))` → `{ st, stages }`. `st[track]` is the explainer's stage index or **`null` = unknown** (never "no intervention"). `stages[track]` adds `label`, `state` (`derived` / `unknown`), `derived_from` (element ids), and when relevant `partial`, `mixed`, `unknown_elements`, `note`. Pure: reads the slice, mutates nothing, applies no recipe, calls nothing.

| Track | 0 | 1 | 2 | From (state fact) |
|---|---|---|---|---|
| roof | Bare | Thin green | Roof garden | building `surface.material`: `green-roof` → 1, `roof-garden` → 2, other known → 0, unknown → null |
| pipe | To sewer | Rain barrel | Feeds the tree | roof water traced through downpipe / gully nodes and rain barrels (a barrel's overflow is followed): reaches a planted receiver → 2, passes a barrel → 1; no edges and routing unknown → null |
| walk | Sealed | Open joints | | sidewalk surface class not sealed → 1 |
| tree | Grate pit | Bigger pit | Sponge trench | tree `rooted_in` a tree trench or `pit: trench` → 2, `pit: enlarged` → 1, `pit: standard` → 0, pit unknown → null |
| park | Cars | Rain garden | Joined to trench | only rain gardens whose `placement` is `{ surface: parking, mode: replaces }`; → 2 when such a garden shares an edge with a tree trench. Gardens elsewhere → 0 with a note; only unknown-placement gardens → null |
| road | To the drain | Open kerb | | road runoff reaches a planted receiver (curb cut) → 1; routing unknown → null |
| store | Nothing | Storage + overflow | | a rain garden or tree trench with an overflow edge → 1. Rain barrels never count |

**Several elements, one artwork stage.** The stage is the weakest non-zero level found (what is true wherever something changed). `partial: true` when other elements are below it or unknown; `mixed: true` (with a note) when some are above it, e.g. one extensive green roof and one roof garden shows *Thin green*, mixed. The stronger stage is never drawn for a mixed street. No element of that kind → 0 with a note.

**Why a sidewalk rain garden is not parking removal.** The parking artwork shows bays turned into a garden. Only `placement.surface = parking` with `mode = replaces` says that happened. A garden carved from the sidewalk keeps every bay; a provider garden without placement could be anywhere, so the track says unknown instead of claiming lost parking.

**Artwork limits that remain.** One stage per track: mixed or partial streets are flagged, not drawn. *Feeds the tree* through a barrel (barrel overflow into a trench) is a valid state but no current recipe produces it. *Roof garden* needs `params.roof_system: "intensive"`; the mock renderer has no control for it yet.
