# Adaptive Interface — State Model

Status: working architecture, 3 October 2026. Implemented as a first qualitative slice; see [STATE-ENGINE.md](STATE-ENGINE.md).

## Why this exists

The current prototype already has a PlaceModel and an InterventionCatalogue, but the deeper abstraction is:

> **A place has a state. An intervention changes that state. Effects depend on the resulting state under a scenario.**

The educational Street Slice already expresses this visually: different materials, underground layers, water routing, vegetation, shade, heat, sewer load and rain / sun conditions. The adaptive engine should formalise those concepts so the renderer can remain replaceable.

## Core equation

```text
State S0
  +
Scenario C
  ↓
Effect(S0, C)

Intervention I
  ↓

S1 = I(S0)
  +
Scenario C
  ↓
Effect(S1, C)

ΔEffect = Effect(S1, C) - Effect(S0, C)
```

The system should therefore distinguish four things:

1. **State Catalogue** — what physically exists and how it behaves.
2. **Intervention Catalogue** — operators that transform state.
3. **Scenario Catalogue** — external conditions such as rain, heat or drought.
4. **Effect Model** — derives mechanisms and outcomes from state + scenario.

## State is a vector, not a Sponge Score

Do not reduce a place to one "sponginess" number.

Two visually similar surfaces can behave very differently depending on:

- sealing;
- permeability;
- substrate;
- storage;
- compaction;
- moisture;
- vegetation;
- shade;
- runoff connection;
- groundwater constraints;
- utilities;
- traffic / use constraints.

A state should therefore be multi-dimensional.

## State layers

### 1. Spatial element

Examples:

- building;
- roof;
- sidewalk;
- road;
- tram;
- parking;
- tree;
- vegetation;
- rain garden;
- swale;
- sewer;
- gully;
- downpipe;
- curb;
- underground utility zone.

Each element has geometry / layout plus semantic properties.

### 2. Surface state

Suggested properties:

```text
material
sealed_fraction
permeability
roughness
depression_storage
albedo
vegetation_fraction
moisture_available
```

Example archetypes:

```text
asphalt
concrete
sealed paving
permeable paving
grass-joint paving
gravel
bare soil
planted soil
grass
tree bed
water
green roof
```

Archetypes are convenience presets. The engine should reason from properties.

### 3. Subsurface state

Suggested properties:

```text
soil_type
infiltration_capacity
storage_capacity
compaction
contamination
groundwater_depth
groundwater_constraint
rootable_volume
utility_conflict
```

This reflects the Street Slice distinction between surface/base, subsoil / utility zone and deeper Rhine gravel / groundwater.

### 4. Water-routing state

Water connections are first-class state.

Examples:

```text
roof → downpipe → sewer
road → gully → sewer
road → curb cut → rain garden
roof → downpipe → rain garden → overflow → sewer
parking → storage layer → soil
```

Represent these as typed graph edges.

Example:

```json
{
  "from": "road-east",
  "to": "gully-2",
  "medium": "rainwater",
  "mode": "surface-runoff"
}
```

Routing changes can matter even when material does not change.

### 5. Vegetation state

Suggested tree / planting properties:

```text
canopy_area
rootable_volume
soil_water_available
health
shade_fraction
evapotranspiration_potential
```

A tree's effect is not determined by presence alone.

### 6. Thermal state

Initially model drivers rather than claiming exact temperature.

Suggested properties:

```text
solar_exposure
shade_fraction
albedo
surface_moisture
vegetation_fraction
evapotranspiration_potential
```

The first engine can derive qualitative thermal tendencies from these.

## Evidence state remains orthogonal

Every property keeps provenance / evidence state:

- observed;
- modelled;
- derived;
- assumed;
- user-corrected;
- unknown;
- not-applicable.

Unknown never becomes zero, false, safe or feasible.

## Proposed StateModel 0.2

Illustrative:

```json
{
  "schema_version": "adaptive-state/0.2",
  "place_id": "demo",
  "elements": [
    {
      "id": "parking-east",
      "type": "parking",
      "geometry_ref": null,
      "use": "parking",
      "surface": {
        "material": {"value": "asphalt", "state": "observed"},
        "sealed_fraction": {"value": "high", "state": "derived"},
        "permeability": {"value": "low", "state": "derived"},
        "albedo": {"value": "medium-low", "state": "assumed"},
        "vegetation_fraction": {"value": "none", "state": "observed"}
      },
      "subsurface": {
        "infiltration_capacity": {"value": null, "state": "unknown"},
        "storage_capacity": {"value": "low", "state": "assumed"},
        "utility_conflict": {"value": null, "state": "unknown"}
      },
      "thermal": {
        "shade_fraction": {"value": "low", "state": "derived"},
        "evapotranspiration_potential": {"value": "none", "state": "derived"}
      }
    }
  ],
  "connections": [
    {
      "from": "parking-east",
      "to": "gully-2",
      "medium": "rainwater",
      "state": "observed"
    }
  ]
}
```

## Relationship to current PlaceModel

Do not throw away `adaptive-place/0.1`.

Treat it as the current transport / integration contract.

The StateModel can initially be compiled from the PlaceModel:

```text
PlaceModel 0.1
    ↓ state adapter
StateModel 0.2
    ↓ effect engine / interventions
Scenario State
    ↓ renderer adapter
Street Slice / future UI
```

This avoids blocking the data team while the deeper abstraction matures.

## Renderer relationship

The uploaded Street Slice should be treated as one renderer for state.

It currently encodes:

- material changes;
- underground changes;
- routing changes;
- tree growth / canopy;
- rain and sun conditions;
- sewer load;
- mechanisms;
- before / after narrative.

The adaptive renderer should consume state and effect output rather than stage numbers hardcoded into SVG visibility.

## Non-goals

Do not yet:

- claim exact cooling degrees;
- claim exact runoff reduction;
- calculate engineering dimensions;
- collapse state into one score;
- make the research team author UI-specific layout;
- make the data team author intervention transformations.
