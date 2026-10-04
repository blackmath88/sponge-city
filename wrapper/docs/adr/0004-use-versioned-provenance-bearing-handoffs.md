# ADR 0004: Use versioned, provenance-bearing handoffs

- Status: Accepted
- Date: 2026-10-03

## Context

Site scoping and Street Lab are separate applications and workstreams. Passing an untyped object or importing another app's internal model would couple releases and make it easy to interpret provisional values as site facts.

## Decision

Exchange a small `CandidateSiteHandoffV1` envelope containing:

- schema version;
- stable candidate identity;
- coordinates for context;
- evidence source labels;
- missing data;
- constraints and intervention directions;
- an explicit `illustrative` provenance classification and boundary note.

Street Lab validates and size-bounds the payload. It works without one and rejects malformed or unknown versions. Candidate context never changes street geometry or simulation parameters.

## Consequences

- Links are shareable and require no backend for the MVP.
- Both workstreams can evolve internally while the contract stays stable.
- The payload is context, not authoritative site state.
- A future `StreetScenarioSeed` contract can add verified geometry without weakening or silently widening V1.
