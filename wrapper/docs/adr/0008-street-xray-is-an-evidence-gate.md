# ADR 0008: Street X-Ray is an evidence gate, not a recommendation engine

- Status: Accepted
- Date: 2026-10-04

## Context

The site-scoping map can surface a promising area, and the Street Lab can
explain how a sponge intervention changes an illustrative street system. A
plausible visual transition between the two can still imply facts that are not
available: street dimensions, surface flow, drainage connections, utilities,
soil permeability and buildable space.

## Decision

Add a wrapper-owned Street X-Ray step between scoping and simulation. It keeps
three visible layers separate:

- **known now**: observed or reproducibly derived context from named sources;
- **derived carefully**: typed, limited and visibly unvalidated hypotheses;
- **must ask or measure**: gated records and site checks that block the next
  decision.

The module may produce an Evidence Passport and a verification brief. It may
move an intervention from `requires-investigation` to `candidate` only as a UI
rehearsal when all blocking answers are marked verified. It must never treat
those toggles as acquired evidence.

The current `candidate-site-context.v1` handoff stays unchanged. Street X-Ray
passes only candidate identity, sources, directions, constraints and missing
questions into the illustrative Street Lab. Scenario geometry and inferred
claims do not cross that boundary.

## Consequences

- The demo gains a clear climax: open evidence stops at the underground line.
- Unknowns become actionable requests with a gatekeeper and unlock action.
- The team can add imagery or computer vision later without promoting model
  output to observed evidence.
- A real design recommendation remains out of scope until site-specific records
  and measurements are attached through a separately agreed contract.
