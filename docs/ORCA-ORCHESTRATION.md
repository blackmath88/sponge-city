# Orca Orchestration — Multi-agent delivery for Sponge City V2

## Purpose

Orca is the orchestration/control plane for the Sponge City V2 work.

It does not replace specialist models. It decomposes work, chooses the right worker, packages context, checks evidence, records decisions and hands implementation tasks to the appropriate execution agent.

Target worker pool:

- **Nebu / Morrow / Qwen3-14B** — local analysis worker;
- **Perplexity Pro** — current external research and source discovery;
- **Claude** — deep synthesis, architecture review and adversarial critique;
- **Codex** — implementation, tests, Git and PR work;
- **Orca** — planner, router, evidence ledger and acceptance coordinator.

## Authority model

```text
Human
  ↓
Orca
  ├─ Nebu       local analysis
  ├─ Perplexity external research
  ├─ Claude     deep review / synthesis
  └─ Codex      code execution
       ↓
 tests / evidence / PR
```

No worker gains authority merely because it can produce an answer or edit code.

Orca owns:

- task decomposition;
- worker selection;
- context packaging;
- task dependencies;
- acceptance criteria;
- evidence aggregation;
- escalation;
- final work-state transitions.

Human retains authority over:

- strategic direction;
- destructive changes;
- cross-repo dependency changes;
- security/permission expansion;
- production deployment where approval is required.

## Worker roles

### Nebu / Morrow — local evidence worker

Use for:

- repository archaeology;
- reading large amounts of local context;
- module inventory;
- dataset/source extraction;
- schema population;
- classification;
- duplicate detection;
- first-pass Data Gap Matrix;
- comparison-table normalization;
- first-pass implementation planning.

Strengths:

- private/local;
- cheap;
- fast enough for broad analysis;
- already accepted on Qwen3-14B.

Do not use as sole authority for:

- final architecture;
- ambiguous product strategy;
- destructive cleanup;
- security decisions;
- unsupported factual research.

### Perplexity Pro — external research worker

Use for:

- current city datasets;
- official data portals;
- standards;
- city comparison evidence;
- programme/project documentation;
- source discovery;
- checking whether a dataset is actually public/gated/missing.

Preferred outputs:

- claim;
- source;
- publication/updated date;
- city;
- indicator mapping;
- quoted or paraphrased evidence;
- access status;
- confidence.

Perplexity should not decide the product architecture.

### Claude — architecture and critique worker

Use for:

- architecture sparring;
- reconciling PR #3 / PR #4;
- challenging hidden assumptions;
- reviewing contracts and boundaries;
- comparing alternative designs;
- finding inconsistencies across evidence and implementation plans;
- reviewing Codex changes before merge when risk is non-trivial.

Claude should return explicit:

- accepted assumptions;
- challenged assumptions;
- architecture risks;
- recommended changes;
- unresolved questions.

### Codex — implementation worker

Use for:

- code changes;
- schema implementation;
- migration;
- tests;
- build fixes;
- Git branches;
- PR creation;
- repository evidence.

Codex receives a bounded implementation packet, not a vague product request.

Required packet:

- objective;
- repo/branch;
- files/contracts involved;
- constraints;
- acceptance tests;
- evidence requirements;
- what not to change.

## Orca workflow

### Phase 1 — Frame

Orca translates the human goal into:

- decision question;
- deliverables;
- constraints;
- risk;
- expected evidence.

### Phase 2 — Decompose

Tasks are split into typed work units.

Example:

```json
{
  "task_id": "charter.basel.inventory",
  "type": "analysis",
  "objective": "Map Basel sources to Charter indicators",
  "worker": "nebu",
  "inputs": ["charter-v1", "basel-source-list"],
  "output_schema": "city-evidence-v1",
  "acceptance": [
    "every record references a CharterIndicator",
    "unknown remains unknown",
    "every claim has provenance"
  ]
}
```

### Phase 3 — Delegate

Orca selects a worker using a simple policy:

```text
large local reading/classification? → Nebu
current external facts/sources?     → Perplexity
architecture ambiguity/risk?        → Claude
code/test/repo mutation?            → Codex
```

### Phase 4 — Validate

Orca does not promote worker output automatically.

Validation may include:

- schema validation;
- provenance presence;
- contradiction detection;
- source verification;
- test execution;
- cross-worker review.

### Phase 5 — Synthesize

Orca combines accepted outputs into a canonical project state.

Rejected claims remain rejected; they are not silently rewritten.

### Phase 6 — Execute

Implementation packets go to Codex.

### Phase 7 — Accept

Orca verifies:

- tests;
- evidence;
- product constraints;
- no unexpected authority expansion;
- PR scope.

## Suggested task graph for Sponge City V2

```text
HUMAN VISION
    ↓
ORCA: frame V2
    ↓
┌──────────────────────────┬─────────────────────────┐
│ NEBU                     │ PERPLEXITY              │
│ repo archaeology         │ Charter research        │
│ PR3/PR4 module map       │ city source discovery   │
│ current data inventory   │ comparator evidence     │
└─────────────┬────────────┴─────────────┬───────────┘
              ↓                          ↓
              └──────── ORCA ────────────┘
                         ↓
                     CLAUDE
             architecture / critique
                         ↓
                       ORCA
                canonical build packet
                         ↓
                      CODEX
             schemas + first vertical slice
                         ↓
                    tests / PR
                         ↓
                       ORCA
                    acceptance
```

## First mission

### Mission: reconcile existing architecture

**Nebu**

Inventory PR #3 and PR #4 against:

- CharterIndicator;
- CityEvidence;
- DataGap;
- PlaceProfile;
- ActionAssessment.

Output:

- keep;
- adapt;
- archive;
- conflict;
- source path;
- evidence.

**Perplexity**

Research evidence frameworks and mature comparator-city data practices relevant to the initial Charter.

Focus on official sources.

Output:

- indicator;
- city;
- source;
- evidence type;
- public/gated;
- resolution/freshness if available;
- why it matters.

**Claude**

Review:

- Product Architecture V2;
- Build Plan V2;
- Nebu reconciliation;
- Perplexity research.

Answer:

- is the Charter normative enough without overclaiming?
- does the city adapter boundary generalize?
- which PR #3/#4 contracts are worth retaining?
- where are we mixing explanation, evidence and decision authority?
- what is the smallest coherent first implementation?

**Orca**

Resolve conflicts and produce one implementation packet.

**Codex**

Implement only Stage 1 kernel + narrow Basel/VoltaNord fixture.

## Worker result envelope

Every delegated result should include:

```json
{
  "task_id": "...",
  "worker": "nebu|perplexity|claude|codex",
  "status": "completed|partial|blocked|failed",
  "summary": "...",
  "artifacts": [],
  "claims": [],
  "evidence": [],
  "uncertainties": [],
  "recommended_next": []
}
```

## Evidence discipline

A useful distinction:

```text
worker suggestion
≠ accepted project fact
≠ source-backed evidence
≠ implementation state
```

Orca should explicitly promote information through these states.

For research:

```text
discovered
→ source-checked
→ mapped to Charter
→ accepted
```

For code:

```text
proposed
→ implemented
→ tested
→ reviewed
→ merged
```

## Budget / routing policy

Default:

1. local Nebu for large bounded analysis;
2. Perplexity for external retrieval;
3. Claude for difficult synthesis/review;
4. Codex only when the implementation packet is ready.

This avoids using expensive reasoning models for bulk reading or external search and prevents Codex from becoming the product architect by accident.

## UI / observability for Orca

Orca should expose:

- active mission;
- task graph;
- worker assigned to each task;
- status;
- evidence received;
- blocked dependencies;
- token / budget use where available;
- current canonical decision;
- next approval gate.

A useful visual vocabulary:

```text
WEAVING      task decomposition / synthesis
SCOUTING     external research
READING      local Nebu analysis
SPARRING     Claude critique
BUILDING     Codex implementation
VERIFYING    tests / evidence
BLOCKED      human or missing evidence
DONE         accepted result
```

## Guardrails

- No worker silently edits another repo.
- Nebu does not invent missing city evidence.
- Perplexity findings remain external evidence until accepted.
- Claude recommendations are advisory.
- Codex receives explicit repo scope and acceptance tests.
- Orca never treats model confidence as evidence quality.
- Unknown remains a valid outcome.
- Human approval is required before destructive or cross-boundary changes.

## Success condition

The orchestration is successful when:

> Orca can turn the Sponge City V2 vision into traceable research, local analysis, architecture review and implementation work without any single model needing the entire job or silently becoming the authority.
