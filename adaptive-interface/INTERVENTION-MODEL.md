# Adaptive Interface — Intervention Model

Status: working architecture, 3 October 2026. Implemented as a first qualitative slice; see *State engine* in [README.md](README.md).

## Core idea

An intervention is an operator over State.

It is not:

- a finished visual stage;
- an effect;
- a research paragraph;
- a construction approval.

Conceptually:

```text
I : State → State
```

## Separate knowledge from execution

The Basel research / intel stream should describe intervention knowledge.

The engine should compile that knowledge into executable state transformations.

```text
Intervention Knowledge
  what it is
  why it is used
  mechanisms
  requirements
  constraints
  evidence / Basel examples
         ↓
Adapter / Compiler
         ↓
Executable Transformation
         ↓
State change
```

Do not require researchers to write low-level transformation DSL.

## Intervention taxonomy

### Surface

- depave;
- permeable pavement;
- grass / grid paving;
- planted surface;
- reflective / cooler surface where relevant.

### Routing

- curb cut;
- open channel;
- downpipe disconnection;
- redirect street runoff;
- connect runoff to tree trench / rain garden.

### Storage / infiltration

- rain garden;
- bioretention;
- tree trench / Baumrigole;
- infiltration trench;
- underground gravel storage;
- detention area;
- temporary surface storage;
- cistern.

### Vegetation

- tree planting;
- larger tree pit;
- connected tree trench;
- planting bed;
- vegetated swale;
- green roof;
- green wall.

### Reuse

- rain barrel;
- cistern;
- irrigation reuse.

## Knowledge record

Suggested researcher-facing record:

```json
{
  "id": "permeable-parking",
  "label": "Permeable parking",
  "category": "surface",
  "description": "Replace sealed parking surface with a permeable system while retaining parking use where feasible.",
  "mechanisms": ["ABSORB", "STORE", "SLOW"],
  "requirements": [
    "suitable traffic load",
    "acceptable water quality",
    "suitable subgrade / drainage strategy"
  ],
  "constraints": [
    "groundwater",
    "contamination",
    "maintenance / clogging"
  ],
  "basel_examples": [],
  "sources": []
}
```

## Executable transformation

The runtime adapter may compile the above into:

```json
{
  "target": {
    "type": "parking",
    "surface.material": ["asphalt", "sealed-paving"]
  },
  "operations": [
    {
      "op": "replace-surface-archetype",
      "with": "permeable-parking"
    }
  ]
}
```

The exact execution DSL is internal and may change.

## Examples

### Depave

```text
target:
  sealed surface

state change:
  sealed_fraction ↓
  permeability ↑
  vegetation / soil exposure optional

possible processes:
  infiltrate
  evaporate / transpire if planted
```

### Curb cut

```text
target:
  road edge + adjacent receiving element

state change:
  remove / modify routing edge:
    road → gully / sewer

  add routing edge:
    road → rain garden / tree trench

important:
  no material change is required
```

### Tree trench / Baumrigole

```text
state change:
  rootable_volume ↑
  storage_capacity ↑
  soil_water_available ↑
  runoff connection optionally added
  tree canopy may change over time

effects are scenario-dependent.
```

### Green roof

```text
state change:
  roof surface archetype
  storage ↑
  vegetation ↑
  evapotranspiration potential ↑
  runoff routing / overflow remains explicit
```

## Intervention status

Keep:

- candidate;
- requires-investigation;
- excluded;
- not-applicable.

But status is about compatibility, not outcome magnitude.

## Current PR compatibility

The current `intervention-catalog/0.1` can remain as the executable prototype catalogue.

Add the researcher-facing knowledge layer above it rather than breaking the prototype immediately.

Target evolution:

```text
intervention-knowledge/0.1
      ↓ compiler
intervention-execution/0.2
      ↓
scenario engine
```
