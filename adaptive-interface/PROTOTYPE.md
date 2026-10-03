# Adaptive Interface — Prototype Plan

> **Status:** the orchestration layer, contracts and a mock vertical slice (Prototype 0 with a hand-authored fixture, plus correction mode and the three interventions) are implemented. See *Implementation* in [README.md](README.md). Data, catalogue and renderer are mocks awaiting the three teams.

## Goal

Prove one vertical slice:

> **Click a real Basel place → compile available evidence → render a recognisable editable place → apply a small set of sponge interventions → compare before and after.**

Do not solve city-wide engineering feasibility in the first prototype.

## Prototype 0 — hand-authored bridge

Before data integration, encode one real Basel location manually in the semantic scene schema.

Purpose:

- prove that the educational renderer can represent a real place;
- define which semantic elements the renderer actually needs;
- avoid designing a data pipeline before the UI contract is known.

Deliverable:

```text
one real location
→ hand-authored place.json
→ educational renderer
→ TODAY / SPONGE comparison
```

## Prototype 1 — automatic current state

Map interaction:

1. open Basel map;
2. click a location or street segment;
3. create an analysis window;
4. fetch / intersect available sources;
5. compile a place model;
6. render the adaptive scene.

Minimum evidence:

- buildings / land cover;
- sealed and unsealed surfaces;
- parking;
- trees.

Potential enrichment:

- OSM street semantics.

Acceptance:

- the selected place is recognisable;
- provenance can be inspected;
- missing data remains visibly missing;
- the UI does not imply engineering feasibility.

## Prototype 2 — correction mode

Add:

> **Does this look right?**

Editable semantic elements:

- trees;
- parking;
- surface type;
- boundaries;
- entrances / access;
- protected or fixed areas.

Record corrections separately from source observations:

```json
{
  "state": "user-corrected",
  "replaces": "evidence-id",
  "reason": "tree visible on site but absent from source"
}
```

The corrected scenario should never silently rewrite the original source evidence.

## Prototype 3 — three interventions

Start with transformations that are easy to understand geometrically.

### A. Depave

Input:
sealed polygon.

Output:
sealed area ↓
permeable / planted area ↑

### B. Permeable parking

Input:
parking geometry.

Output:
sealed parking area ↓
permeable parking area ↑
parking count retained where possible.

### C. Tree + rain-garden element

Input:
candidate surface.

Output:
planted / storage area ↑
tree count ↑
sealed area ↓
qualitative mechanisms: store / absorb / shade / sweat.

For each intervention, show:

- what changed geometrically;
- which effects are direct geometry calculations;
- which effects are estimates;
- which required checks remain unknown.

## Prototype 4 — environmental context

Add individually rather than all at once:

1. canopy;
2. terrain / slope;
3. heat;
4. infiltration;
5. broad runoff context.

Each source should change either:

- the scene;
- intervention compatibility;
- the explanation;
- or the prioritisation.

Do not add a layer merely because it exists.

## Renderer contract

The renderer should consume semantic objects, not GIS-specific fields.

Example vocabulary:

```text
building
sidewalk
road
tram
parking
tree
canopy
vegetation
water
entrance
fixed-area
unknown-area
```

Surface properties:

```text
sealed
permeable
planted
water
unknown
```

This keeps the renderer independent from Basel source schemas and enables future reuse elsewhere.

## Suggested internal pipeline

```text
MAP CLICK
   ↓
analysis boundary
   ↓
source adapters
   ↓
normalised geometries
   ↓
evidence records
   ↓
place compiler
   ↓
adaptive-place.json
   ↓
renderer
   ↓
user corrections
   ↓
scenario transformations
   ↓
metrics + explanation
```

## Suggested modules

```text
adaptive-interface/
  README.md
  DATA.md
  PROTOTYPE.md

future implementation:

  schema/
    adaptive-place.schema.json
    intervention.schema.json

  adapters/
    basel-land-cover.*
    basel-parking.*
    basel-trees.*
    osm.*

  compiler/
    place-compiler.*

  interventions/
    depave.*
    permeable-parking.*
    tree-rain-garden.*

  renderer/
    ...

  examples/
    <real-basel-place>.json
```

Implementation location can later move into the repo's existing `solutions/` contract once the concept becomes a runnable solution.

## Important non-goals

For the first hackathon slice:

- no city-wide “Sponge Score”;
- no claim that a candidate is construction-ready;
- no invented utility information;
- no fake cooling degrees;
- no fake runoff percentages;
- no LLM deciding geometry or feasibility;
- no requirement for photorealistic rendering;
- no need to automate every Basel location before showing the idea.

## Why this is feasible as a hackathon prototype

The hardest conceptual problem is not hydrological simulation.

It is proving that heterogeneous city data can be translated into an understandable spatial language.

A compelling demo can therefore be deliberately asymmetric:

```text
educational interface      polished
real-place compilation     partial but real
correction workflow        explicit
interventions              only 3
effects                     mostly geometric
uncertainty                 first-class
```

That is enough to demonstrate the larger vision without overstating what the data can support.

## Immediate next technical spike

Choose one recognisable Basel street or block and answer one question:

> **Can land-cover + parking + tree evidence be compiled into a semantic scene that visually resembles the place?**

If yes, continue toward arbitrary map selection.

If no, identify exactly what semantic information is missing and add the smallest additional source needed.
