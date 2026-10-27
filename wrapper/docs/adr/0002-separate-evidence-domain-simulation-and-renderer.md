# ADR 0002: Separate evidence, domain, simulation and renderer

- Status: Accepted
- Date: 2026-10-03

## Context

Early visual prototypes mixed intervention choices, calculations and drawing code. That makes a compelling animation quick to create, but makes real-data integration unsafe: changing the visual can change the model, and API values can become unexplained visual assumptions.

## Decision

Use explicit layers:

```text
CandidateSiteContext
→ StreetScenario
→ InterventionPlan
→ WorldState
→ SimulationSnapshot
→ Renderer
```

- Evidence adapters own source normalization and provenance.
- The scenario owns zones, surfaces, assets and water topology.
- Interventions are deterministic patches.
- Simulation is a pure calculation over typed inputs.
- The renderer is a projection and never mutates or calculates domain state.

## Consequences

- Site data can populate contracts without binding the product to one API.
- Tests can verify topology and conservation without starting a browser.
- React/SVG, canvas, 3D or exported media can share the same world state.
- More types and adapters are required, but uncertainty and ownership remain inspectable.
