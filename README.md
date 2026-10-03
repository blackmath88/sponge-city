# Sponge City — Basel Decision Canvas

Hack am Rhein 2026 · **Make Basel a Sponge**

Turn overlapping heat, surface-runoff and urban-form evidence into specific places where an intervention could offer several benefits, with visible evidence and unresolved questions.

## Start here

- [Decision Canvas concept](docs/DECISION-CANVAS.md): product thesis, scale, interaction and computational architecture.
- [Sponge-city research and technical landscape](docs/RESEARCH.md): planning foundations, candidate open-source precedents and reuse strategy.
- [Governance and measurement](docs/GOVERNANCE-AND-MEASUREMENT.md): the second map—how Basel decides, who can influence it, which evidence is missing and how outcomes could be measured.
- [Queryable evidence atlas](docs/QUERYABLE-EVIDENCE-ATLAS.md): evidence model, claim ladder and group-access design, seeded with the VoltaNord/ZHAW monitoring case.
- [ZHAW / VoltaNord public-source check](docs/ZHAW-SOURCES.md): what code, data and method material is (not) public, with licences and a contact recommendation.
- [Open the standalone prototype](prototype/evidence-atlas.html): search verified facts, boundaries, open questions, actors and next actions without an AI service.

## Run the evidence atlas

Open `prototype/evidence-atlas.html` directly, or run:

```bash
make run
```

Then visit <http://127.0.0.1:4173>. Edit the canonical records in `data/evidence-atlas.json`; `make build` regenerates the standalone file, `make validate` checks references and IDs, and `make smoke` exercises search, route selection and brief generation.

## Working principle

**GIS calculates. Rules constrain. AI explains.**

Separate **need**, **possibility** and **potential effect**. A place with high risk is not automatically a feasible intervention site. Unknown soil, utilities, ownership or available space remain explicit unknowns.

## Initial scope

Explore one Basel neighbourhood, identify a small set of candidate sites, and examine one real location in depth. Connect that spatial evidence to the responsible institutions, decision gates and public influence routes. This is screening-level decision support; detailed engineering and quantified performance require further investigation.

Current repository state: concept and research documentation plus a first standalone evidence-atlas prototype and structured seed dataset. No spatial data pipeline, verified site assessment or hydrological model yet.
