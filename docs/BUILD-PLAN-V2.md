# Build Plan V2 — Charter → Gap → Place → Action

## Build strategy

Do not build the whole vision at once.

The build is staged so every stage leaves behind a useful product and a stronger contract for the next stage.

## Stage 0 — Consolidate current work

Goal: one canonical product architecture.

Actions:

1. review PR #4 as the likely post-hackathon product foundation;
2. selectively salvage useful contracts / engines from PR #3;
3. map every surviving module to one of:
   - Charter
   - CityEvidence
   - DataGap
   - PlaceProfile
   - ActionAssessment
4. archive or demote modules with no role in the new architecture;
5. prevent parallel product architectures from becoming canonical.

Deliverables:

- this architecture document;
- this build plan;
- a repository map showing canonical owners;
- explicit decision on which open PR becomes the integration base.

Exit criterion:

> There is one product architecture and one canonical integration branch.

## Stage 1 — Charter Kernel

Goal: define what cities should know.

Create versioned contracts, for example:

```text
contracts/sponge-city-charter.v1.schema.json
contracts/charter-indicator.v1.schema.json
data/charter/indicators.json
```

Start with roughly 25–35 indicators.

Each indicator should include:

- ID;
- domain;
- question;
- rationale;
- ideal measurement;
- accepted proxy methods where appropriate;
- resolution expectation;
- freshness/update expectation;
- quality expectation;
- openness expectation;
- decision relevance;
- monitoring relevance;
- references.

Do not overfit the Charter to Basel's current datasets.

Exit criterion:

> A city can read the Charter without knowing anything about the Basel implementation.

## Stage 2 — Basel Evidence Profile

Goal: map Basel onto the Charter.

Create a Basel adapter / evidence inventory, for example:

```text
city-adapters/basel/
data/cities/basel/evidence.json
data/cities/basel/gaps.json
```

For each CharterIndicator record:

- dataset/source;
- authority;
- URL;
- coverage;
- spatial resolution;
- temporal resolution;
- freshness;
- access state;
- licence;
- method;
- confidence;
- limitations;
- status against the Charter.

Generate a DataGap result rather than hand-writing a narrative.

Gap next actions should use an enum such as:

- `open`
- `request`
- `derive`
- `measure`
- `site_visit`
- `unknown`

Exit criterion:

> The product can explain what Basel has, what it lacks, and the next action for every material gap.

## Stage 3 — Comparison Pilot

Goal: prove the Charter is portable and improve it through comparison.

Select two comparator cities based on source quality and relevance, not fame.

For each city:

- implement the same Charter mapping;
- preserve local terminology and source provenance;
- allow alternative evidence methods/proxies;
- do not force absent evidence into Basel-shaped fields.

Build a comparison surface that answers:

- what is routinely public elsewhere?
- what is usually gated?
- what is typically site-measured?
- what valid proxies are used?
- what should the Charter change as a result?

Exit criterion:

> At least three cities can be compared through the same Charter without rewriting the core model.

## Stage 4 — VoltaNord vertical slice

Goal: connect the normative Charter to a real place-based decision workflow.

Pipeline:

```text
Charter
→ Basel CityEvidence
→ VoltaNord PlaceProfile
→ DataGap
→ ActionAssessment
```

The slice should include:

### Known

Examples where defensible:

- heat/climate;
- trees/canopy;
- land cover/sealing;
- planning context;
- runoff/hazard.

### Derived

Only reproducible computations with provenance.

Examples might include:

- canopy deficit;
- sealing ratios;
- runoff exposure proxies.

### Missing / gated

Examples:

- infiltration;
- site soil conditions;
- underground utilities;
- ownership details;
- maintenance capacity;
- non-public project monitoring measurements.

### Gap-closing action

Every material gap gets an actionable next step:

- request authority data;
- derive from an approved source;
- field measurement;
- site visit;
- unresolved / research.

### Intervention assessment

Show intervention states such as:

- `candidate`
- `requires-investigation`
- `excluded`
- `not-applicable`

Do not convert the slice into an engineering recommendation.

Exit criterion:

> A user can move from “what should we know?” to “what do we know here?” to “what must happen next?” to “what interventions are worth investigating?”

## Stage 5 — Decision Framework

Goal: formalize how evidence supports actions.

Define an ActionAssessment contract that records:

- intervention;
- supporting evidence;
- conflicting evidence;
- hard constraints;
- unresolved checks;
- evidence level;
- permitted decision level;
- next investigation.

Reuse the qualitative state engine from PR #3 only where it can operate on explicit typed evidence and preserve unknowns.

Avoid hidden composite scores.

Exit criterion:

> Every intervention assessment can explain why it has its current state and what would change that state.

## Stage 6 — Portable City Adapter

Goal: make non-Basel adoption a first-class capability.

Define an adapter boundary similar to:

```text
getIndicatorEvidence(indicatorId)
getDataset(id)
getPlace(location)
getAuthority(ref)
```

Basel-specific APIs and field names stay behind the adapter.

A comparator city should be implementable under:

```text
city-adapters/<city>/
```

without changing the Charter kernel or UI contracts.

Exit criterion:

> Adding a second implementation city is an adapter/data task, not a product rewrite.

## MVP

The MVP should have four coherent surfaces:

### 1. Charter

What should a Sponge City know?

### 2. Basel Gap

What does Basel have, lack, gate or need to measure?

### 3. Compare

How do two comparator cities handle the same evidence needs?

### 4. VoltaNord

How does this evidence become a place-based investigation and action workflow?

Not MVP:

- gamification;
- full intervention catalogue;
- city-wide optimizer;
- dozens of cities;
- hidden AI scoring;
- complex 3D simulation;
- general-purpose chatbot;
- automated scraping without source review.

## Test strategy

At minimum test:

### Contract tests

- all CharterIndicators validate;
- all CityEvidence records reference valid CharterIndicators;
- all DataGap records preserve provenance;
- unknown values remain valid and are never silently coerced.

### Decision-boundary tests

- missing critical evidence cannot become `candidate` through a default value;
- inferred evidence remains typed as inferred;
- site-measurement-required cannot be silently satisfied by imagery;
- intervention assessment lists blockers and next actions.

### Portability tests

- Basel adapter does not leak Basel-specific raw fields into core contracts;
- a comparator fixture can use the same contracts.

### Provenance tests

- source URLs/IDs retained;
- derivation method retained;
- timestamps/freshness retained where available.

## Implementation order for Codex

The first implementation PR should be deliberately small:

1. add canonical schemas for CharterIndicator, CityEvidence, DataGap and PlaceProfile;
2. populate a small Charter fixture;
3. map a small Basel fixture;
4. generate one VoltaNord PlaceProfile;
5. render a basic Charter → Gap → Place flow;
6. prove unknown/gated/site-visit behavior in tests.

Do not redesign every existing screen in this PR.

## Decision gate before coding

Before Codex implementation begins, reconcile PR #3 and PR #4 against this plan and produce:

- reuse list;
- migration list;
- archive list;
- canonical contract ownership;
- chosen integration base.

That reconciliation is the next execution task.
