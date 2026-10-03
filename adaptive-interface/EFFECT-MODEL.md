# Adaptive Interface — Scenario and Effect Model

Status: working architecture, 3 October 2026. Implemented as a first qualitative slice; see *State engine* in [README.md](README.md).

## Purpose

Effects are not properties of interventions by themselves.

They emerge from:

```text
STATE + EXTERNAL SCENARIO
```

A permeable surface may behave differently when dry, saturated or constrained by the substrate below. A tree's cooling contribution depends on canopy, solar exposure and water availability.

## Scenario catalogue

Start with simple scenario archetypes.

### Heavy rain

```json
{
  "id": "heavy-rain",
  "rain": {
    "intensity": "high",
    "duration": "short",
    "antecedent_moisture": "normal"
  },
  "heat": null
}
```

### Hot summer day

```json
{
  "id": "hot-day",
  "rain": null,
  "heat": {
    "solar_exposure": "high",
    "air_temperature": "high",
    "drought_stress": "normal"
  }
}
```

### Hot drought

Same heat scenario with low soil-water availability.

The first implementation can use qualitative enums. Later models may replace them with measured or modelled values.

## Process layer

Internally distinguish processes from outcomes.

### Water processes

- intercept;
- route;
- infiltrate;
- store;
- detain;
- slow;
- evaporate;
- transpire;
- reuse;
- overflow.

### Thermal processes

- shade;
- reflect;
- evaporate;
- transpire;
- reduce solar loading.

## Public-facing mechanism vocabulary

The educational UI may continue to use:

- ABSORB;
- STORE;
- SLOW;
- SWEAT;
- SHADE;
- COOL.

These are explanatory labels, not the scientific schema.

## Outcome vocabulary

Initial outcomes:

### Water

- runoff tendency;
- runoff peak tendency;
- sewer load tendency;
- local storage potential;
- infiltration potential;
- soil-water availability;
- groundwater recharge potential.

### Heat

- surface-heating tendency;
- shade;
- evapotranspirative-cooling potential;
- thermal-comfort tendency.

### Ecology / co-benefits

- rootable soil volume;
- vegetation;
- canopy;
- habitat potential.

Do not quantify an outcome unless the input evidence and model support it.

## Engine levels

### V0 — qualitative rule engine

Example:

```text
IF surface.sealed_fraction = high
AND routing → sewer
THEN runoff_tendency = high
```

```text
IF surface.permeability = high
AND subsurface.infiltration_capacity != low
THEN infiltration_potential +=
```

```text
IF vegetation present
AND soil_water_available != low
THEN evapotranspiration_potential +=
```

```text
IF tree.canopy_area high
AND solar_exposure high
THEN shade_effect high
```

### V1 — simple water balance

Later:

```text
rainfall
- interception
- infiltration
- storage change
- evapotranspiration
= runoff
```

All assumptions must be explicit.

### V2 — specialist models

Possible later integrations:

- EPA SWMM / green-infrastructure modelling;
- calibrated hydrological models;
- thermal / microclimate models.

The state and renderer contracts should survive model upgrades.

## Effect result

Illustrative:

```json
{
  "scenario_id": "heavy-rain",
  "effects": {
    "runoff_tendency": {
      "value": "high",
      "state": "derived",
      "drivers": [
        "road-east.surface.sealed_fraction",
        "connection-road-gully"
      ]
    },
    "sewer_load_tendency": {
      "value": "high",
      "state": "derived"
    },
    "infiltration_potential": {
      "value": null,
      "state": "unknown",
      "reason": "subsurface infiltration capacity unknown"
    }
  }
}
```

## Comparison

The adaptive UI compares:

```text
Effect(S0, scenario)
        vs
Effect(S1, scenario)
```

The delta should support three confidence levels:

- defensible direct geometry;
- qualitative derived effect;
- unknown / not modelled.

Never replace unknown with a positive intervention claim.
