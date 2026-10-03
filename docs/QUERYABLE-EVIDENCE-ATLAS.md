# Queryable evidence atlas

Status: first working prototype, 3 October 2026.

## Product premise

The group does not need another folder of reports. It needs a shared way to ask:

- What do we actually know?
- What is only an interpretation or proposal?
- What can VoltaNord validate—and what can it not validate?
- Who owns the evidence or the next decision?
- What is still missing, and what should we ask next?

The prototype in [`prototype/evidence-atlas.html`](../prototype/evidence-atlas.html) turns the first verified VoltaNord/ZHAW case into a guided, searchable evidence surface. It works as a standalone file without a server or AI service.

Run `make run` for a local preview. Edit `data/evidence-atlas.json`, then run `make validate` to rebuild the standalone file and check all source, entity and record references.

The decision map uses two independent axes:

| Intervention window | The actual decision |
|---|---|
| New development | What performance and space must be secured before the design is fixed? |
| Existing-infrastructure retrofit | Is the urgency or learning value high enough to intervene before normal renewal? |
| Planned renovation / renewal | How do we prevent like-for-like replacement and attach climate requirements to work already happening? |

Each is then split by **public, private or mixed ownership**. Public assets can be steered through direct investment, standards, procurement and asset management. Private assets depend on the exact legal or contractual basis plus incentives and advice. Mixed systems need explicit agreements on land, access, cost, liability and maintenance.

## Evidence architecture

The canonical data is [`data/evidence-atlas.json`](../data/evidence-atlas.json). Its schema is [`data/evidence-atlas.schema.json`](../data/evidence-atlas.schema.json).

The basic unit is a record, not a document. Each record carries:

- a plain-language question and answer;
- a status: **verified, inference, unknown, conflict, or proposal**;
- a precise scope statement;
- source and entity links;
- searchable tags and related records;
- optional ownership and timing for an action.

Sources, people, organisations, projects, places, datasets, indicators and decisions have stable IDs. This makes the information usable by a static interface now and by a database, API or retrieval system later.

The canonical dataset also contains a four-level evidence-maturity model: **screening data only → point tested → monitored → model calibrated**. Each level declares both what it can support and what it cannot. See [Monitoring and data stack](MONITORING-DATA-STACK.md) for the full architecture and evidence triage.

`decision_routes` stores the nine combinations of intervention window and ownership. Each route names the available levers, decision sequence, accountable role, evidence needed and a caution. They are currently proposals to test with Basel practitioners—not verified descriptions of legal authority.

## The critical claim ladder

Do not store “potential effect” as if it were one evidence state. Use four separate steps:

1. **Mechanism supported** — literature or precedent supports how an intervention can work.
2. **Site effect expected** — screening suggests the mechanism may matter at a candidate site.
3. **Site effect observed** — monitoring records what happened at an implemented site such as VoltaNord.
4. **Transferability assessed** — someone checks whether the observed result applies to another site and documents why.

VoltaNord is therefore best described as the primary empirical validation partner for its four published biophysical indicator areas—not as universal ground truth for every sponge-city claim.

## Query design

The first prototype uses deterministic text and tag matching. It supports guided questions and filters without inventing answers. A future natural-language layer should follow this sequence:

1. interpret the question into typed filters;
2. retrieve matching records and their source records;
3. compose an answer only from those records;
4. preserve status, scope, conflicts and unknowns;
5. cite the sources beside every material claim.

An LLM may explain retrieved records. It must not promote an inference to a fact, turn an unknown into “no”, or generalise a VoltaNord result to a different site.

For a Hack Apertus implementation, conventional software should own the atlas, filters, status rules, provenance and final query. Apertus has two bounded semantic jobs: translate a natural-language question into typed filters, and propose candidate evidence records from new unstructured material. A human or deterministic validator must accept those records before they become canonical.

## What the public check established

The official ZHAW monitoring page confirms the commissioning relationship, May 2026 start, four indicator areas and research team. A separate official ZHAW page establishes a 2024 predecessor design project for three Basel streets and says that a measurement concept should follow. The public pages make this a plausible design-to-monitoring chain, but do not prove that the final protocol implements the earlier concept.

The Basel-Stadt government bulletin confirms CHF 280,000 and a five-year scientific evaluation aimed at possible citywide application. The formal decision register identifies the authorisation as P251765, decided on 18 November 2025 under BVD leadership.

Four Basel datasets are now indexed as screening inputs: Smart Climate observations (100009), their station locations (100082), long-term groundwater statistics (100180) and land cover (100477). They can support context and prioritisation, but not a causal intervention-effect claim without protocol-linked field evidence.

The checked public pages do not expose the protocol, exact components and sites, baselines or controls, measurement methods and cadence, quality rules, raw-data access, reporting milestones, reuse rights or decision thresholds.

There is also a public metadata conflict: the project description says five years from May 2026, while the ZHAW research-group listing displays an end date in August 2034. The atlas retains both claims and marks the discrepancy for confirmation.

## Recommended group-access model

Use three layers, all backed by the same records:

1. **Guided view** for non-specialists: six common questions and short evidence cards.
2. **Search and filters** for working sessions: status, record type, actor and topic.
3. **Source/data view** for researchers: stable IDs, source URLs, scope, data dictionary and export.

The first shared governance action should be a short **VoltaNord learning agreement** between the working group, Stadtgärtnerei and ZHAW: who can access which data, when results appear, how caveats travel, which decisions the findings are meant to change, and who maintains the public indicator dictionary.

## Next build increment

- Replace the seed record set with protocol-level fields after the ZHAW/Stadtgärtnerei hand-off.
- Add the governance actors and decision gates already mapped in this repository.
- Connect a candidate-site claim from the Decision Canvas to its relevant VoltaNord indicator.
- Add fitness metadata for each screening dataset: resolution, currency, missingness, QA, licence and permitted decision use.
- Add a simple review workflow: proposed → reviewed → accepted/superseded.
- Publish as a small static site only after the group has agreed who maintains records and resolves conflicts.
