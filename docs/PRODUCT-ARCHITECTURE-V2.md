# Product Architecture V2 — Sponge City Evidence Standard

## Product thesis

The product is not primarily a map, a simulation, or a hackathon archive.

It is a reusable evidence framework for cities that:

1. defines what a city should know, measure, publish and monitor to plan as a sponge city;
2. exposes the gap between ideal evidence and the evidence actually available;
3. explains why gaps exist and how they can be closed;
4. turns available evidence into transparent, place-based intervention decisions;
5. supports monitoring after intervention so the system can learn.

Basel is the first reference implementation, not the product boundary.

## Two connected products

### 1. Sponge City Data Charter

The Charter answers:

> What evidence should a city possess if it wants to understand, plan and monitor itself as a sponge city?

It defines decision-relevant indicators across:

- climate and hazard;
- surface and sealing;
- blue-green infrastructure;
- soil and water;
- built environment;
- infrastructure;
- use and constraints;
- intervention history;
- monitoring and outcomes.

Each charter indicator should carry at least:

- stable ID;
- domain;
- question;
- why it matters;
- ideal measurement;
- expected spatial resolution;
- expected update frequency;
- minimum evidence quality;
- openness expectation;
- decision relevance;
- monitoring relevance;
- references.

The Charter is normative: it describes what a capable city evidence system should know.

### 2. Data-to-Action Framework

The analysis framework answers:

> Given the best evidence currently available, where should the city investigate or intervene, and what remains too uncertain to decide?

The pipeline is:

```text
raw city datasets
→ city adapters
→ normalized indicators
→ evidence quality
→ place profile
→ constraints + opportunities
→ action assessment
→ intervention / request / measurement / site visit
```

The output is not always an intervention. A correct result may be:

```text
WE DON'T KNOW YET
→ request utility data
→ measure infiltration
→ perform site visit
```

That is a product feature, not a failure.

## Canonical domain objects

### CharterIndicator

What a city ideally should know.

### CityEvidence

What one city actually has for a CharterIndicator.

Evidence state is one of:

- `open`
- `gated`
- `too_coarse`
- `stale`
- `derived`
- `not_collected`
- `site_measurement_required`
- `unknown`

Claim method remains explicit:

- observed;
- derived;
- inferred;
- modelled;
- assumed;
- unknown.

### DataGap

The difference between required and available evidence.

A DataGap records:

- why the gap exists;
- whether it can be opened;
- whether it can be derived;
- whether it must be newly measured;
- likely gatekeeper or authority;
- next action;
- comparison evidence from other cities.

### PlaceProfile

A place-scoped projection of city evidence.

Example:

```text
VoltaNord BP 226A

HEAT             observed
CANOPY           observed
LAND COVER       observed
RUNOFF           derived
SOIL             partial
INFILTRATION     missing
UTILITIES        missing
OWNERSHIP        partial
MAINTENANCE      missing
```

### ActionAssessment

A transparent intervention or investigation assessment containing:

- supporting evidence;
- contradicting evidence;
- missing critical evidence;
- constraints;
- confidence;
- next investigation;
- permitted decision level.

Avoid magic scores such as “83% suitable” unless there is a validated, explainable basis.

Prefer:

```text
RAIN GARDEN

Supporting evidence
✓ high imperviousness
✓ runoff concern
✓ sufficient surface opportunity

Constraints
! utilities unknown

Missing critical evidence
○ infiltration

Assessment
PROMISING — INVESTIGATE

Next action
Conduct infiltration test
```

## Product surfaces

### Charter

**What should a Sponge City know?**

A navigable evidence standard.

### Compare

**How do cities differ in what they know, publish and monitor?**

The comparison is diagnostic, not a leaderboard.

Questions include:

- does another city treat this indicator as routine public infrastructure data?
- is everybody missing it because it is intrinsically difficult?
- is Basel collecting it but not publishing it?
- do different cities use valid alternative proxies?

### City Gap

**What should this city know, what does it know, and what should happen next?**

For every gap, prefer an explicit next-action class:

- OPEN IT
- REQUEST IT
- DERIVE IT
- MEASURE IT
- SITE VISIT
- UNKNOWN

### Place

**What does the available evidence say about this street/site?**

This is where Situation Map, Evidence Atlas and place-scoped profiles become useful.

### Decision Canvas

**What could we do here, what supports it, what blocks it, and what still needs investigation?**

The Canvas should consume the same canonical objects rather than own hidden decision logic.

## City comparison

The initial comparison should be small and evidence-driven.

Start with:

- Basel;
- two comparator cities selected for source quality and mature sponge-city/open-data practice.

Do not start with ten cities.

The comparison should help refine the Charter:

- indicators routinely collected elsewhere become stronger Charter candidates;
- indicators nobody can supply may need to move from city-scale evidence to site-scale measurement;
- different valid proxies should be represented as alternative evidence methods, not forced into one schema.

## Reference implementation: Basel

Basel becomes:

```text
Charter
  ↓
Basel CityEvidence adapter
  ↓
Basel DataGap
  ↓
PlaceProfile
  ↓
ActionAssessment
```

VoltaNord BP 226A is the first vertical-slice candidate because it can combine real open evidence with visible monitoring and access gaps.

The slice should show:

- available tree / canopy evidence;
- climate and heat evidence;
- planning context;
- land cover / sealing evidence;
- runoff or hazard evidence where defensible;
- missing or gated soil / infiltration / utility / ownership / maintenance evidence;
- the exact next action needed to close each material gap;
- plausible interventions that remain explicitly conditional on those gaps.

## Relationship to existing repository work

Existing modules should be treated as projections or specialist engines around the canonical evidence model.

Likely reusable core:

- Situation Map / site scoping;
- Evidence Atlas / provenance / access gates;
- PlaceModel / place-profile concepts;
- Street X-Ray;
- Connected Case;
- intervention knowledge;
- qualitative state engine where it supports transparent action assessment;
- Data Charter material already present under `wrapper/data-charter-map/`.

Supporting modules:

- Street Slice / Sponge Street explainer;
- intervention visualizations;
- solution catalogue;
- water-learning simulation.

Out of MVP / archive:

- presentation-only hackathon shell;
- gamification as product center;
- Adaptive Interface as a competing product architecture;
- disconnected modules that cannot map to Charter → Gap → Place → Action.

## Product principles

- Evidence before decoration.
- Missing data is visible.
- Unknown is not zero.
- Observed is not derived.
- Derived is not inferred.
- Inference never silently becomes fact.
- Every claim carries provenance.
- Maps support decisions; they are not the product.
- AI may propose how to close a gap, but may not fabricate evidence.
- Human/site knowledge remains explicit.
- Basel-specific source plumbing must remain behind a city adapter.
- A second city must be implementable without rewriting the product core.

## Long-term lifecycle

The product should eventually close the loop:

```text
UNDERSTAND
→ DECIDE
→ INTERVENE
→ MONITOR
→ LEARN
→ UPDATE
```

The Charter therefore covers both planning evidence and post-intervention monitoring.

## North-star statement

> A reusable evidence framework that defines what cities need to know to become better sponge cities, exposes gaps in that evidence, and transforms available data into transparent place-based decisions and monitoring.
