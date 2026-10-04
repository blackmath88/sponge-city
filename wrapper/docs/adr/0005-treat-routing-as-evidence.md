# ADR 0005: Treat routing as evidence and preserve unknowns

- Status: Accepted
- Date: 2026-10-03

## Context

The explainer needs connections to show why a rain garden alone is different from a rain garden fed by street runoff. Basel open data can provide many surface and context inputs, but the reviewed research did not find an open street-scale sewer, gully or downpipe network. A candidate location, a sealed-surface score or nearby infrastructure is not evidence of a particular drainage path.

If the application silently invents connections, its clearest visual statement becomes its least defensible claim.

## Decision

Routing is first-class evidence. Each scenario records routing as `observed`, `assumed` or `unknown` with a note.

- The MVP street keeps its useful demo connections, explicitly marked `assumed`.
- Candidate handoffs never create or alter routing.
- Effects that depend on a route inherit that route's evidence state.
- Missing routing in a future real-data scenario remains `unknown`; the adapter must not synthesize it from proximity or general indicators.
- The renderer displays the evidence state next to mechanism claims.

## Consequences

The demo remains understandable while its claim boundary is visible. A future Basel provider can replace assumptions incrementally without changing the renderer or intervention contract. Some effects will remain unknown until a data partner supplies drainage evidence; that is an accurate result, not a runtime failure.

## Origin

This decision adopts the most important epistemic rule from `blackmath88/sponge-city` pull request 3 without importing its broader prototype engine.
