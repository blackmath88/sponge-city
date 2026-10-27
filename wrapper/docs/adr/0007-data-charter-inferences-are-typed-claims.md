# ADR 0007: Data Charter inferences are typed claims; the site handoff stays closed to them

- Status: Accepted
- Date: 2026-10-03

## Context

ADR 0006 requires every derived or modelled claim to carry its method, source inputs, spatial and temporal resolution, validation, limitations and permitted use. The Data Charter map showed four inferred layers (tree planting context, depth to groundwater at stations, underground activity from permits, active or upcoming works), labelled "≈ inferred" with a method, but without the other fields. Some charter wording also overstated gaps ("no open real data", "real data exists but is not public").

The end-to-end journey hands a `CandidateArea` to the Street Lab through `integration/contracts/candidate-site-context.v1.schema.json`. That contract has no slot for typed evidence claims.

## Decision

1. Every inferred layer of the Data Charter has exactly one claim in `wrapper/data-charter-map/data/data-charter.json` (`claims[]`). Each claim states:
   - `evidence_class`: `derived` or `modelled`, never `observed`;
   - `method` and `inputs` (with https sources);
   - `spatial_resolution` and `temporal_resolution`;
   - `validation`;
   - `limitations`;
   - `permitted_use` from `explain`, `screen`, `prioritise`, `design`.
2. An unvalidated claim may only be used to `explain` or `screen`. All four current claims are `not validated`.
3. The map shows each claim's class, validation and permitted use beside the layer and in popups, with its limitations one click away. Real, inferred and missing data keep separate visual encodings.
4. `missing` means "no open data found in the reviewed Basel and federal sources". `restricted` means "expected to exist but not found as open data", and each restricted indicator states its existence basis as an assumption.
5. The smoke test enforces 1–4 and fails on any regression.
6. Charter claims do **not** enter the site handoff yet. `candidate-site-context.v1` stays unchanged.

## Proposed, not implemented: claims in a future handoff

If a candidate area should carry charter evidence into the Street Lab, a `candidate-site-context.v2` could add an optional `claims` array. Each entry would hold the claim fields above, plus the claim's value *at that site* and the requested use. The Street Lab adapter would then:

- reject claims whose `permitted_use` does not include the requested operation;
- render claims as evidence beside the scenario, never as street geometry, soil or drainage facts;
- keep `unknown` where no claim covers a needed input.

This touches `integration/`, Andy's site-scoping module (which produces the handoff) and the Street Lab (which consumes it). It needs agreement from those owners before any change.

## Consequences

- The charter can explore gap-filling methods while every inferred value says how far it may be trusted.
- Adding a new inferred layer now requires a complete claim, or the smoke test fails.
- The handoff stays narrow until the module owners agree on v2.
