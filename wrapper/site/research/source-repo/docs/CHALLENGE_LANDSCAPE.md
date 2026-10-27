# Challenge landscape

Neutral research notes collected while exploring Hack am Rhein. This file does **not** select a challenge or prescribe a solution.

## Life Sciences ecosystem

### What the brief appears to require

The useful problem is not simply "find organisations". The brief asks for decisions and actions rather than another directory.

### Useful framings

- **Matching and sequencing** — resources may be useful only at certain stages or after prerequisites are met.
- **Entity resolution** — registers, programme lists and investor directories may describe overlapping organisations with different identifiers.
- **Translation** — founders describe needs in one vocabulary; programmes describe eligibility in another.
- **Capability graph** — a company can be represented through required capabilities, available providers and blockers.

### Evidence/resources already found

- BaseLaunch — accelerator / funding / pharma network.
- Switzerland Innovation Park Basel Area — lab infrastructure, including BSL-1/BSL-2 space.
- Tech Park Basel — startup office/lab space.
- Zefix / Basel registers / investor directories are potentially relevant entity sources.

### Open questions

- Which ecosystem sources are structured enough to query or ingest?
- Which identifiers overlap across registers?
- How current are programme eligibility and deadline details?
- What can be represented as explicit prerequisites versus narrative guidance?

---

## Make Basel a Sponge

### What the brief appears to require

Heat and heavy-rain information already exist, but are read in different contexts. The missing value may be in **composition and action**, not another hazard map.

### Useful framings

- **Institutional fragmentation** — multiple offices/layers/standards do not naturally compose.
- **Spatial multi-criteria reasoning** — find places where multiple needs or opportunities overlap.
- **Workflow / approvals** — after identifying a place, interventions have dependencies, actors and process steps.
- **Opportunity timing** — interventions may become much more feasible when streets or infrastructure are already being rebuilt.
- **Scenario simulation** — compare the expected effect of different intervention packages, while keeping effect dimensions separate.

### Evidence/resources already found

A Basel-Stadt example coordinated sponge-city-style planting/unsealing with district-heating work. This makes planned works a potentially important layer: not only "where is need high?" but also "where is action unusually feasible now?"

Other city guidance found during research includes Bern, Zürich and Luzern material on root volume, water balance, infiltration and approvals. Those examples are useful references but are **not Basel rules**.

### Important modelling caution

Do not invent one opaque "sponge score" by adding incomparable quantities. Heat, runoff, shade, biodiversity, cost and implementation complexity should remain explicit dimensions unless a documented objective function is chosen.

### Open questions

- Are planned road, sewer, district-heating or tram works available as data?
- What intervention-effect models are defensible at hackathon scale?
- Which Basel-specific approval rules can be verified?
- Which effects can be simulated quantitatively and which should remain qualitative?
- What is the appropriate spatial resolution for heat/runoff/canopy layers?

---

## Too hot to handle — Basel at 38°

### Useful framings

- **Last-mile information** — help exists, but information and action are disconnected.
- **Coverage-gap detection** — identify areas where support/cool spaces are insufficient rather than identifying vulnerable individuals.
- **Triage / scheduling** — aggregated signals can support a care team's morning plan.
- **Channel translation** — warning → appropriate channel/message/language.
- **Privacy as architecture** — avoid collecting household/person-level data in the first place.

### Evidence/resources already found

Potentially composable layers include:

- heat / temperature;
- population by age and spatial unit;
- cool rooms;
- fountains;
- pedestrian routing;
- shade / canopy;
- opening hours;
- MeteoSwiss warning levels.

Several small open-source projects already explore shade-aware pedestrian routing, so a plain "cool/shady route" is useful prior art rather than automatically a distinctive contribution.

### Open questions

- What is the finest legitimate spatial unit for demographic aggregation?
- Do small counts introduce re-identification risk?
- Which cool-place records have reliable opening hours/accessibility?
- Can we measure "unsupported area" without turning area-level statistics into claims about individuals?

---

## From a Rhine signal to action

### Useful framings

- **Observability** — distinguish normal variation from signals that deserve action.
- **Decision under uncertainty** — operational actions have asymmetric costs.
- **Auditability** — the explanation and decision trace may matter as much as the recommendation.
- **Historical replay** — test rules against point-in-time historical evidence.
- **Abstention** — a river anomaly is not automatically evidence of factory impact.

### Verified findings from research

- Basel-Rheinhalle has high-frequency hydrological data.
- BAFU provides long historical series and contextual classification.
- Basel and Port of Switzerland expose related gauge information.
- Research did **not** establish a Basel-specific low-water operational threshold for the factory/supply-chain use case.

### Important modelling caution

A current low Rhine level is evidence about the river. It is **not yet evidence about a specific factory's supply path**. The causal/logistical link must be established or the system should say it cannot conclude.

### Open questions

- Which Basel/Upper Rhine levels actually constrain shipping operations?
- Can those constraints be connected to the supply route in the challenge?
- Which traffic/weather signals are independent pathways versus redundant proxies?
- How do we replay history without hindsight leakage?

---

## Cross-challenge patterns worth keeping in mind

These are **patterns**, not a commitment to one universal architecture.

### Evidence composition

All four challenges contain some version of:

```text
separate sources
→ typed facts
→ compatibility / constraints
→ decision or action
→ explanation / provenance
```

### Semantic compilation

Institutional prose may sometimes be transformed into typed records or candidate rules:

- programme eligibility;
- planning guidance;
- opening hours / service conditions;
- operational SOPs.

The model can help interpret language. Validation and execution should remain deterministic.

### Shared contract, specialised engines

The research suggests a useful common contract layer:

- FACT
- RULE
- CONSTRAINT
- DECISION
- TRACE

But the compute engines differ:

- graph/dependency reasoning;
- spatial overlay;
- optimisation;
- rule evaluation;
- historical replay.

Do not force these into one query language or one solver.
