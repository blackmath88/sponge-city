# Sponge Street workspace

A structural vertical slice for SpongeSquad: one synthetic street, one rain garden, explicit water connections, and a conserved water balance. React owns controls; TypeScript owns the world and simulation; an accessible SVG component renders the results. No bitmap swaps, game loop or external art are required.

## Run

Requires Node 22.18+ (tested with Node 24) and npm.

```sh
cd street-workspace
npm ci
npm run dev
```

Open the local URL printed by Vite. Build with `npm run build`; run model checks with `npm test`.

## A 60-second demo

1. Run rain on the sealed street. All water reaches the sewer.
2. Add a rain garden. It receives only rain on its own footprint; street runoff bypasses it.
3. Connect street runoff and run rain again. Storage fills, infiltration goes to soil, and overflow goes to the drain.
4. Compare baseline at the same storm minute. Scrub the timeline to inspect changes.
5. Click a zone or use the zone buttons to inspect its identity, material, area and parking count. Reset restores the original scenario.

The default storm is 30 mm over 30 minutes on 1,800 m². Its final balances are:

| State            | Rain | Stored | Infiltrated | Sewer |
| ---------------- | ---: | -----: | ----------: | ----: |
| Sealed           | 54.0 |    0.0 |         0.0 |  54.0 |
| Isolated garden  | 54.0 |    1.6 |         2.0 |  50.4 |
| Connected garden | 54.0 |   12.0 |         2.0 |  40.0 |

All volumes are m³. These are illustrative assumptions, not calibrated Basel performance. Stored water is the amount remaining at the end of the event, not a permanent reduction. No post-storm drain-down is simulated.

## Where changes belong

| File                   | Responsibility                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| `src/types.ts`         | Zones, surfaces, assets, hydrological nodes, edges, plans and snapshots    |
| `src/scenario.ts`      | Six rectangular zones and baseline drainage graph; metric geometry         |
| `src/interventions.ts` | Pure baseline → plan → world transformation; dependency check              |
| `src/simulation.ts`    | Graph validation, topological routing and one-minute water balances        |
| `src/StreetDiagram.tsx` | React/SVG projection: geometry, assets, arrows, water and selection events |
| `src/main.tsx`         | React controls, playback, comparison, inspector and model boundaries       |
| `test/model.test.ts`   | Conservation, connectivity, overflow, invalid graphs and evidence boundary |

This is a concrete case, not a generic city engine. The rain-garden compiler deliberately targets the demo parking strip. Add the second intervention only after testing this interaction with people.

## Boundaries with the other work

### Andy's site scoping

Inspected `andymucyo-ops/Hack-am-Rhein-2026-SpongeSquad`, `feature/hot-spot-map`, commit `ae0f8fc3cc44d380ee2e5b44e00e95f9b546eb6b` on 2026-10-03. `CandidateSiteContext` is a structural subset of the existing `CandidateArea` type. The factory accepts that context and preserves sources, missing evidence and constraints:

```ts
const scenario = createDemoStreet(candidateArea);
```

On `integration/spatial-journey`, Andy's map snapshot is copied into `data/site-scoping-tool/` and its **Explore in Street Lab** action sends a versioned candidate payload to this app. Street Lab validates the payload and displays the selected identity, evidence leads and unknowns. It does not turn area indicators into site geometry, soil permeability or drainage facts; the same synthetic scenario and parameters are used with or without a selected site. Andy's source branch remains unchanged.

### Achim's Sponge Street explainer

The original `prototypes/sponge-street` is retained unchanged. This slice implements the meaning of `park:1` (rain garden) and `road:1` (open kerb, requiring a garden). It does **not** reuse the explainer's percentage deltas: applying those on top of routed water would double-count effects. Its twelve-state ladder and other tracks remain in the explainer.

### Phaser v5 exploration

Reviewed `basel-sponge-phaser-v5.zip`: it proved the value of animated weather and an explorable street. The MVP now uses React/SVG because the product is an explanatory, evidence-bearing interface rather than a game loop. The typed world and simulation remain renderer-independent; see `wrapper/docs/adr/0003-use-react-svg-for-the-mvp-renderer.md`.

## Simulation contract

- Each catchment contributes `areaM2 × depthMm / 1000` over the event.
- Catchment and conveyance nodes have exactly one flow outlet. Storage nodes have infiltration-to-soil and overflow outlets. Soil and sewer are sinks.
- Graphs must be acyclic; missing references, duplicate IDs and ambiguous splits are rejected.
- Every minute, available storage water infiltrates up to the rate allowance, then excess above capacity overflows. Node processing follows graph order.
- At every snapshot: `rain = stored + infiltrated + sewer` within floating-point tolerance.
- Edge volumes are cumulative throughput, **not** additive water destinations. An animated dashed line only indicates that an edge was active in the current step; animation speed is not a physical measurement.
- Rectangles are in metres. Screen projection is separate. Assets reference their hydrological node; selection never mutates simulation state.
- One 120 m² strip changes material and loses three illustrative parking spaces. Its spatial zone retains its original identity/type; the intervention does not rename the zone into an asset.
- Baseline and intervention plans are immutable inputs. Recompilation from baseline makes removal/reset exact.

Uniform rain, no evaporation, no travel time, no sewer capacity limit, no groundwater or soil saturation and no heat model. Storms reset to empty storage. Site ownership stays unknown. These limits are visible in the UI.

## Deliberately deferred

Real-site geometry, further intervention tracks, ownership/decision pathways, engineered hydrology, art assets and deployment. None is implied by the illustrative model.

## Verification on 2026-10-03

- Ten model tests pass, including conservation across 72 event/configuration combinations and candidate-handoff validation.
- TypeScript check and Vite production build pass. The MVP has no Phaser runtime dependency; the Street Lab bundle is about 210 kB / 67 kB gzip.
- Existing Sponge Street smoke test passes unchanged.
- The earlier Phaser version passed desktop and mobile Chromium interaction checks. The React/SVG replacement is typechecked and build-tested; final desktop/mobile visual QA should be repeated before the demo.
- No deployment or real-site calibration is claimed.

## UI slice 2

The design controls now sit above the street on desktop and mobile. Changing a design pauses playback but preserves the selected minute, so the effect can be compared at the same point in the storm. Pause/continue, rewind and a complete-storm shortcut make playback explicit. Reset returns to minute zero.

Two labelled water-balance bars compare the sealed street and the current design at the same minute. The original end-of-storm table remains separately labelled. Catchment links can be revealed on demand; the selected zone and the active drainage route are readable outside the canvas. Roof details, cars and planting are drawn from the existing zone/surface state without bitmap assets or model changes.

The SVG remains a scaled schematic on small screens; the HTML route summary and zone controls provide readable alternatives. Keyboard zone selection and reduced-motion behaviour are part of the renderer contract.

## Rain Walk / Street Evidence Passport

From Street Lab, follow **Rain Walk · collect street evidence** or open
`/rain-walk/` on the same Vite server. `npm ci && npm run dev` starts the app;
`npm run build` includes the standalone module in `dist/rain-walk/`.
The future wrapper can link/embed this directory without coupling to React.

The module lives in `public/rain-walk/` (no new dependencies): four English/German
field prompts, ten synthetic clues, observation capture with optional local photo,
review queue with reasons and append-only history, evidence passport, JSON and
text field-check exports. Browser localStorage is device-local, not a shared queue;
storage errors are surfaced and export remains available. Reset asks for confirmation.

Source (`demo` / `community`) and review outcome are separate. Accepted demo clues
never count as community evidence. Rejected clues remain in the export audit trail.
Review is by a local unauthenticated user, not an authority. No visual observation
modifies geometry or simulation. No actual street, measured areas, rainfall/runoff
ranges or field images are invented. The 120 m layout is schematic; choosing and
surveying a real segment, shared review, site-bound records and scenario adapters
remain future work. Photos (max 1 MB each) are local and included in JSON export.

Demo: review one synthetic clue, mark another uncertain/rejected, add an observation,
open the passport, export the field-check brief. `npm test` includes provenance and
review-history regression tests. Rain Walk concept: user-supplied campaign brief,
4 October 2026; independently implemented without external fAIr code.
