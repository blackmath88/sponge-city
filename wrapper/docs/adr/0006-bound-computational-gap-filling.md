# ADR 0006: Bound computational gap filling by evidence class and permitted use

- Status: Accepted
- Date: 2026-10-03

## Context

Open Basel data covers many useful surfaces and contextual constraints but omits several inputs needed for sponge-city decisions: drainage topology, utilities, infiltration capacity, parking geometry, tree-pit dimensions and roof load capacity. Compute and AI can reduce some gaps through deterministic derivation, proxy inference, object detection or synthetic modelling.

An estimate becomes dangerous when presentation silently promotes it to an observed fact or uses it for a decision beyond its validation.

## Decision

Gap-filling outputs remain typed evidence claims:

- `observed`: published or directly measured;
- `derived`: deterministically calculated from named observed inputs;
- `modelled`: produced by an explicit statistical, computer-vision or physical model;
- `assumed`: introduced only for a declared scenario;
- `unknown`: no defensible evidence is available.

Every derived or modelled claim must preserve its method, source inputs, spatial and temporal resolution, validation, limitations and permitted use. Permitted use is one of `explain`, `screen`, `prioritise` or `design`; stronger uses require stronger validation. Inference may narrow an unknown or supply a screening signal. It never upgrades itself to observed evidence.

## Consequences

- The Data Charter map can explore creative gap-filling methods without becoming an engineering recommendation.
- Candidate-site adapters can reject claims whose permitted use is weaker than the requested operation.
- The interface must keep authority-published, officially modelled, inferred and missing information visually distinct.
- Some gaps remain unknown until a city, data partner or field measurement supplies evidence.

## Origin

The port under `wrapper/data-charter-map` preserves Claude's `feat/data-charter-map` work from `blackmath88/sponge-city`, with integration-specific corrections to the tree planting-context and works-window claims.
