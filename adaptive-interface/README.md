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

## North-star sentence

> **Learn what a sponge city is. Then see what it could mean for your street.**
