# Sponge City — Basel Decision Canvas

Hack am Rhein 2026 · **Make Basel a Sponge**

Turn overlapping heat, surface-runoff and urban-form evidence into specific places where an intervention could offer several benefits, with visible evidence and unresolved questions.

## Start here

- [Decision Canvas concept](docs/DECISION-CANVAS.md): product thesis, scale, interaction and computational architecture.
- [Sponge-city research and technical landscape](docs/RESEARCH.md): planning foundations, candidate open-source precedents and reuse strategy.
- [Governance and measurement](docs/GOVERNANCE-AND-MEASUREMENT.md): the second map—how Basel decides, who can influence it, which evidence is missing and how outcomes could be measured.
- [Queryable evidence atlas](docs/QUERYABLE-EVIDENCE-ATLAS.md): evidence model, claim ladder and group-access design, seeded with the VoltaNord/ZHAW monitoring case.
- [ZHAW / VoltaNord public-source check](docs/ZHAW-SOURCES.md): what code, data and method material is (not) public, with licences and a contact recommendation.
- [Precedent: QTrees / Baumblick Berlin](docs/PRECEDENT-QTREES-BERLIN.md): open street-tree soil-water schema, model and status classes (MIT), with limits on transfer.
- [Open the standalone prototype](prototype/evidence-atlas.html): search verified facts, boundaries, open questions, actors and next actions without an AI service.

## Run the evidence atlas

Open `prototype/evidence-atlas.html` directly, or run:

```bash
make run
```

Then visit <http://127.0.0.1:4173>. Edit the canonical records in `data/evidence-atlas.json`; `make build` regenerates the standalone file, `make validate` checks references and IDs, and `make smoke` exercises search, route selection and brief generation.

## Basel tree map

Open `prototype/basel-map.html` directly (or `make run`, then <http://127.0.0.1:4173/prototype/basel-map.html>). It shows all 32,378 trees in the Basel and Riehen tree register on swisstopo base maps, coloured by age, setting or genus, with active meteoblue climate stations and the VoltaNord development-plan perimeter. Each tree card lists register facts, the nearest station's air temperature and rainfall (refreshable live) and an explicit **unknown** for soil water: Basel publishes no soil-water sensor data, so the map shows no water status. The interaction patterns are adapted from Berlin's [Baumblick](docs/PRECEDENT-QTREES-BERLIN.md) (MIT); no Baumblick code is copied.

Data is a committed snapshot in `data/basel-map.json` (data.bs.ch, CC BY 4.0). `make fetch` refreshes it and re-runs the checks; `make smoke` also tests the map logic.

## Working principle

**GIS calculates. Rules constrain. AI explains.**

Separate **need**, **possibility** and **potential effect**. A place with high risk is not automatically a feasible intervention site. Unknown soil, utilities, ownership or available space remain explicit unknowns.

## Initial scope

Explore one Basel neighbourhood, identify a small set of candidate sites, and examine one real location in depth. Connect that spatial evidence to the responsible institutions, decision gates and public influence routes. This is screening-level decision support; detailed engineering and quantified performance require further investigation.

Current repository state: concept and research documentation plus a first standalone evidence-atlas prototype and structured seed dataset. No spatial data pipeline, verified site assessment or hydrological model yet.
