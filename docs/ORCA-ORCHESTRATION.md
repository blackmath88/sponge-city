# Weavr → Orca execution — Multi-agent delivery for Sponge City V2

## Purpose

Weavr is the semantic control plane for Sponge City V2. Orca is its local execution substrate.

Weavr creates and governs the Mission: it owns authority, scope, routing policy, independent verification, Proof and Decision. Orca materializes the workspace and represents the execution attempt as a Run, Tasks and Dispatches; it launches workers and manages their lifecycle. A worker result is evidence returned to Weavr, never a canonical research conclusion merely because Orca reports the Dispatch complete.

Target worker pool:

- **Nebu / Morrow / Qwen3-14B** — local analysis worker;
- **Perplexity Pro** — current external research and source discovery;
- **Claude** — deep synthesis, architecture review and adversarial critique;
- **Codex** — implementation, tests, Git and PR work;
- **Weavr** — Mission owner, semantic router, independent verifier, evidence promoter and Decision authority;
- **Orca** — workspace, Run, Task, Dispatch, agent-launch and worker-lifecycle substrate.

## Authority model

```text
Human
  ↓
Weavr
  Mission · authority · scope · routing · verification · Proof · Decision
  ↓
Orca
  workspace · Run · Task · Dispatch · worker lifecycle · agent launch
  ├─ Nebu       local analysis
  ├─ Perplexity external research
  ├─ Claude     deep review / synthesis
  └─ Codex      code execution
       ↓
 tests / evidence / PR
```

No worker gains authority merely because it can produce an answer or edit code. `worker_done` proves only that an execution attempt settled; it does not prove a claim, satisfy Mission acceptance, or authorize integration.

Weavr owns:

- Mission intent and outcome;
- authority and bounded scope;
- semantic routing and provider legality;
- independent verification;
- accepted/rejected claims and unresolved questions;
- canonical Proof and Decision;
- permission to release the implementation gate.

Orca owns:

- workspace materialization;
- Run, Task and Dispatch records;
- dependency mechanics for the projected task graph;
- agent launch;
- worker status, transcript and lifecycle;
- execution provenance such as Run, Task, Dispatch, worktree and effective provider IDs.

The Mission definition and its canonical decisions do not move into Orca. Weavr projects a bounded task graph into Orca and observes execution evidence without treating Orca as a research database.

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

## Weavr-governed execution workflow

### Phase 1 — Frame in Weavr

Weavr translates the human goal into:

- decision question;
- deliverables;
- constraints;
- risk;
- expected evidence.

### Phase 2 — Decompose in Weavr, project into Orca

Weavr splits work into typed work units. Orca receives the execution projection and enforces dependency mechanics; the Weavr Mission remains canonical.

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

### Phase 3 — Route in Weavr, dispatch through Orca

Weavr selects an eligible worker using a simple policy. Orca launches the requested worker and records the Dispatch:

```text
large local reading/classification? → Nebu
current external facts/sources?     → Perplexity
architecture ambiguity/risk?        → Claude
code/test/repo mutation?            → Codex
```

### Phase 4 — Validate in Weavr

Weavr does not promote worker output automatically. Orca completion is runtime evidence only.

Validation may include:

- schema validation;
- provenance presence;
- contradiction detection;
- source verification;
- test execution;
- cross-worker review.

### Phase 5 — Synthesize in Weavr

Weavr combines independently verified outputs into canonical project state.

Rejected claims remain rejected; they are not silently rewritten.

### Phase 6 — Execute through Orca

Implementation packets go to Codex.

### Phase 7 — Prove and decide in Weavr

Weavr independently verifies:

- tests;
- evidence;
- product constraints;
- no unexpected authority expansion;
- PR scope.

## Suggested task graph for Sponge City V2

```text
HUMAN VISION
    ↓
WEAVR: frame V2 Mission
    ↓
┌──────────────────────────┬─────────────────────────┐
│ NEBU                     │ PERPLEXITY              │
│ repo archaeology         │ Charter research        │
│ PR3/PR4 module map       │ city source discovery   │
│ current data inventory   │ comparator evidence     │
└─────────────┬────────────┴─────────────┬───────────┘
              ↓                          ↓
              └── ORCA execution evidence ┘
                         ↓
                     CLAUDE
             architecture / critique
                         ↓
                       WEAVR
                canonical build packet
                         ↓
                       ORCA
                   Codex Dispatch
                         ↓
                      CODEX
             schemas + first vertical slice
                         ↓
                    tests / PR
                         ↓
                       WEAVR
                 Proof / Decision
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

**Weavr**

Independently verify worker evidence, resolve conflicts and produce one canonical implementation packet. Record accepted claims, rejected claims and unresolved questions explicitly.

**Codex — gated**

Implement only Stage 1 kernel + narrow Basel/VoltaNord fixture, and only after the human accepts Weavr Task D. Until then Task E exists as a dependency-blocked Orca Task and must not be dispatched.

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

Weavr should explicitly promote information through these states. Orca may display the state projection but does not perform the semantic promotion.

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

## UI / observability using existing Weavr and Orca surfaces

Do not build a third dashboard. Use the Weavr Mission surface for semantic state, evidence review, Proof and Decision. Use the Orca Run/Task/Dispatch surfaces for execution status and worker lifecycle. Together they should expose:

- active mission;
- task graph;
- worker assigned to each task;
- status;
- evidence received;
- blocked dependencies;
- token / budget use where available;
- current canonical decision from Weavr, never inferred from Orca Task state;
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
- Weavr never treats model confidence or Orca completion as evidence quality.
- Unknown remains a valid outcome.
- Human approval is required before destructive or cross-boundary changes.

## Success condition

The orchestration is successful when:

> Weavr can turn the Sponge City V2 vision into a governed Mission, project its work into traceable Orca execution, independently verify returned evidence, and make Proof/Decision transitions without any runtime silently becoming the authority.

## First live projection

The portable Mission and typed task graph are committed at:

- `.weavr/missions/sponge-city-v2-reconciliation.json`;
- `.weavr/plans/sponge-city-v2-reconciliation.tasks.json`;
- `.weavr/schemas/worker-result-envelope.v1.schema.json`.

The live Orca projection is Run `run_79dab8a8e83e`. Task A completed with a partial live Morrow result. Task B is honestly blocked because no callable Perplexity adapter exists. Tasks C and D therefore remain pending, and Task E remains undispatched behind Task D plus an explicit human acceptance gate.
