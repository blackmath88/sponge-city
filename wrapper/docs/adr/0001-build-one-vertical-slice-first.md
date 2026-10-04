# ADR 0001: Build one end-to-end vertical slice first

- Status: Accepted
- Date: 2026-10-03

## Context

The team has parallel work on site scoping, frontend, explainers, presentation and the wrapper. Several prototypes contain useful ideas, but merging every capability would create integration work without proving the visitor journey.

## Decision

Build and protect one complete slice:

```text
select candidate
→ preserve evidence context
→ instantiate illustrative street
→ apply one rain-garden intervention
→ connect runoff
→ calculate one storm
→ explain before and after
```

New features must either strengthen this journey or wait.

## Consequences

- The MVP is demonstrable before it is comprehensive.
- One intervention can be tested deeply, including dependencies and reversibility.
- Other workstreams integrate through links and contracts rather than codebase-wide rewrites.
- Broad intervention catalogues, persistence and generic frameworks are deferred.
