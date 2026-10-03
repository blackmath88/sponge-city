# Sponge City — Basel Decision Canvas

Hack am Rhein 2026 · **Make Basel a Sponge**

Turn overlapping heat, surface-runoff and urban-form evidence into specific places where an intervention could offer several benefits, with visible evidence and unresolved questions.

## Start here

- [Decision Canvas concept](docs/DECISION-CANVAS.md): product thesis, scale, interaction and computational architecture.
- [Sponge-city research and technical landscape](docs/RESEARCH.md): planning foundations, candidate open-source precedents and reuse strategy.
- [Governance and measurement](docs/GOVERNANCE-AND-MEASUREMENT.md): the second map—how Basel decides, who can influence it, which evidence is missing and how outcomes could be measured.
- [Queryable evidence atlas](docs/QUERYABLE-EVIDENCE-ATLAS.md): evidence model, claim ladder and group-access design, seeded with the VoltaNord/ZHAW monitoring case.
- [Monitoring and data stack](docs/MONITORING-DATA-STACK.md): verified 2024→2026 Basel evidence chain, usable open data, maturity ladder and research-dump triage.
- [ZHAW / VoltaNord public-source check](docs/ZHAW-SOURCES.md): what code, data and method material is (not) public, with licences and a contact recommendation.
- [Precedent: QTrees / Baumblick Berlin](docs/PRECEDENT-QTREES-BERLIN.md): open street-tree soil-water schema, model and status classes (MIT), with limits on transfer.
- [Solution model](docs/SOLUTIONS.md): how solutions plug into one canvas, the manifest contract and `make new`.
- **[Open the solutions hub](site/index.html)**: every solution, its question, roles and data.

## Solutions

Everything you open lives in `site/` and is built from `solutions/`. Open `site/index.html` directly, or run `make run` and visit <http://127.0.0.1:4173>.

| Solution | Question | Source |
|---|---|---|
| [Evidence atlas](site/evidence-atlas.html) | What do we actually know about VoltaNord and Basel's sponge-city decisions, and what is still open? | [solutions/evidence-atlas](solutions/evidence-atlas) |
| [Basel situation map](site/situation-map.html) | What do we know about this place, and what don't we? | [solutions/situation-map](solutions/situation-map) |
| [Sponge Street](site/sponge-street.html) | How does an old European street become a connected sponge, one intervention at a time? | [solutions/sponge-street](solutions/sponge-street) |

Add one with `make new name=my-solution`; the contract is in [docs/SOLUTIONS.md](docs/SOLUTIONS.md). `make smoke` builds, validates the atlas and runs every solution's test; `make fetch` refreshes data snapshots. Shared evidence lives in `data/evidence-atlas.json`, so edit records there, not inside a solution.

## Working principle

**GIS calculates. Rules constrain. AI explains.**

Separate **need**, **possibility** and **potential effect**. A place with high risk is not automatically a feasible intervention site. Unknown soil, utilities, ownership or available space remain explicit unknowns.

## Initial scope

Explore one Basel neighbourhood, identify a small set of candidate sites, and examine one real location in depth. Connect that spatial evidence to the responsible institutions, decision gates and public influence routes. This is screening-level decision support; detailed engineering and quantified performance require further investigation.

Current repository state: concept and research documentation, three solutions (evidence atlas, situation map, sponge street), and a Basel open-data snapshot. No verified site assessment or hydrological model yet.
