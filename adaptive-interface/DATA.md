# Adaptive Interface — Basel Data Strategy

Status: research-backed design direction. Exact field schemas, licences, endpoints and update cadences must be verified during implementation.

Verified dataset ids, endpoints, fields and licences (checked 3 October 2026): [docs/DATA-SOURCES.md](../docs/DATA-SOURCES.md).

## Principle

There is no single “sponge-city dataset”.

The place model should be compiled from multiple evidence layers, with provenance and uncertainty retained for each field.

The first reconstruction target is intentionally modest:

```text
buildings
sealed / unsealed surfaces
road / circulation space
parking
vegetation
trees
```

That is enough to produce a recognisable place and test the interaction model.

## High-value Basel sources

### 1. Bodenbedeckung / land cover

Basel-Stadt's cadastral land-cover data is the strongest candidate for the base scene.

Potential roles:

- buildings;
- paved areas;
- humus / vegetated areas;
- wooded areas;
- water;
- other surface classes.

Why it matters:

It can provide polygon-level evidence for the semantic scene without first relying on computer vision.

### 2. Parking areas

Basel publishes spatial parking data.

Potential roles:

- identify existing parking;
- represent parking explicitly in the scene;
- calculate geometric trade-offs;
- support transformations such as parking → permeable parking or parking → tree / rain-garden space.

Freshness and temporary construction states must remain visible limitations.

### 3. Tree cadastre

Potential roles:

- existing managed trees;
- tree location;
- species / attributes where available;
- comparison with canopy coverage.

Important limitation:

A municipal tree cadastre is not automatically a complete inventory of every tree visible from the street.

### 4. Tree canopy coverage

LiDAR-derived canopy coverage can support:

- current canopy footprint;
- historic comparison;
- shade context;
- scenario comparison when clearly marked as projected rather than observed.

Keep tree objects and canopy polygons conceptually separate.

### 5. Digital terrain model

Terrain can support derived values such as:

- slope;
- high / low side;
- local depressions;
- approximate flow direction;
- possible routing from sealed surfaces toward an intervention.

A simple terrain-derived flow indication is different from a calibrated hydraulic model and must be labelled accordingly.

### 6. Orthophotos / aerial imagery

Use primarily as:

- visual validation;
- user orientation;
- discrepancy detection;
- possible later computer-vision input.

Do not make imagery the primary reconstruction source if authoritative geometry is already available.

### 7. 3D city model

Potential later uses:

- building massing;
- urban canyon context;
- 3D or axonometric rendering;
- additional tree / terrain context.

Not necessary for the first vertical slice.

### 8. Climate analysis

Potential context layers:

- daytime thermal load;
- nighttime thermal context;
- air temperature;
- urban heat-island context;
- ventilation / air corridors.

These should shape context and prioritisation, not be converted into false parcel-scale certainty.

### 9. Infiltration / groundwater context

Potential roles:

- broad suitability context;
- groundwater constraints;
- warning states;
- intervention requirements.

Treat broad infiltration categories as screening evidence, not engineering approval.

### 10. Surface-runoff hazard / flow context

Potential roles:

- broader runoff exposure;
- screening;
- prioritisation;
- explanation of why water-sensitive design matters.

A national or coarse model must not be used to claim centimetre-level local flow paths.

For local flow experiments, use the high-resolution terrain model or better hydraulic data if available.

### 11. Cadastre / public-private boundary

Potential roles:

- public versus private realm;
- parcel boundaries;
- governance path;
- whether an intervention would require a different actor.

This connects Adaptive Interface with the project's governance / decision-process work.

### 12. Underground utilities

Potentially decisive for real feasibility but likely incomplete or restricted in public data.

Do not hide that limitation.

A useful interface can explicitly show:

```text
UNDERGROUND CONSTRAINTS

water             unknown
electricity       unknown
district heating  unknown
telecom           unknown

Detailed utility verification required.
```

## Additional source: OpenStreetMap

OSM can supplement official data with transport semantics:

- highway type;
- tram / rail;
- cycleway;
- lanes;
- crossing;
- bus / tram stops;
- parking tags;
- surface tags;
- street name.

Use it as complementary evidence, not as authoritative replacement for better local sources.

## Data fusion order

Suggested precedence:

```text
1. authoritative Basel geometry
2. authoritative Basel thematic datasets
3. derived calculations from those sources
4. OSM semantic enrichment
5. imagery for validation
6. explicit defaults / assumptions
7. user correction
```

Never silently overwrite a stronger source with a weaker one.

## Evidence record

Every compiled property should be able to answer:

- what source produced this?
- when?
- what spatial resolution / geometry?
- observed, modelled or derived?
- what transformation produced it?
- what limitation applies?
- has a user corrected it?

Illustrative:

```json
{
  "property": "surface_type",
  "value": "sealed",
  "state": "observed",
  "source_id": "bs-land-cover",
  "source_date": null,
  "method": "polygon intersection",
  "confidence": "high",
  "limitations": []
}
```

## Recommended first data spike

Test one Basel location with only:

1. land cover;
2. parking;
3. tree cadastre.

Optional fourth source:

4. OSM road semantics.

Success is not scientific completeness.

Success means:

> selecting a real place produces a recognisable semantic scene that can be rendered in the educational interface grammar.

Only after that should terrain, heat, canopy, infiltration and runoff be added.
