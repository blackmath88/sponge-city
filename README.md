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
- [Open the standalone prototype](prototype/evidence-atlas.html): search verified facts, boundaries, open questions, actors and next actions without an AI service.

## Run the evidence atlas

Open `prototype/evidence-atlas.html` directly, or run:

```bash
make run
```

Then visit <http://127.0.0.1:4173>. Edit the canonical records in `data/evidence-atlas.json`; `make build` regenerates the standalone file, `make validate` checks references and IDs, and `make smoke` exercises search, route selection and brief generation.

## Basel situation map

Open `prototype/basel-map.html` directly (or `make run`, then <http://127.0.0.1:4173/prototype/basel-map.html>). One map, layers grouped by **need, possibility, observations, planning and unknown**, each labelled observed, modelled, derived, planning or unknown:

- **Need:** Basel climate analysis (night air temperature, daytime heat stress, 2030 scenario; relative colours only, as the service publishes no values), Stadtklimakonzept heat focus areas, and the federal surface-runoff hazard map (hidden beyond 1:12,500 as BAFU requires).
- **Possibility:** all 32,378 register trees (colour by age, setting or genus) and 3D buildings with generalised swisstopo heights.
- **Observations and planning:** meteoblue stations with live refresh; VoltaNord development-plan perimeters.
- **Unknown:** soil water, infiltration, utilities and ownership are listed but never drawn.

Click any empty spot for the **place lens**: it reads every layer at that point (heat focus class from Basel's WMS, runoff class from the official tile colour, trees within 25 m, nearest station, planning perimeter) and exports a `place-profile/draft-0` JSON in which unknowns stay unknown. Keys: `/` search, `3` 3D view, `T` control-room theme, `L` lens at map centre, `Esc` close. The URL keeps view, layers, theme and selection, so any state can be shared as a link.

Interaction patterns are adapted from Berlin's [Baumblick](docs/PRECEDENT-QTREES-BERLIN.md) and from public "god's eye view" globes (layer registry, provenance per layer, shareable state); no code is copied. Environmental and planning layers only: no cameras, vehicles or people tracking.

Trees, stations and plans come from a committed snapshot in `data/basel-map.json` (data.bs.ch, CC BY 4.0); `make fetch` refreshes it. Heat, runoff and basemaps load live from geo.bs.ch, geo.admin.ch and swisstopo («Quelle: Geodaten Kanton Basel-Stadt», © BAFU, © swisstopo). `make smoke` tests the map logic.

## Working principle

**GIS calculates. Rules constrain. AI explains.**

Separate **need**, **possibility** and **potential effect**. A place with high risk is not automatically a feasible intervention site. Unknown soil, utilities, ownership or available space remain explicit unknowns.

## Initial scope

Explore one Basel neighbourhood, identify a small set of candidate sites, and examine one real location in depth. Connect that spatial evidence to the responsible institutions, decision gates and public influence routes. This is screening-level decision support; detailed engineering and quantified performance require further investigation.

Current repository state: concept and research documentation plus a first standalone evidence-atlas prototype and structured seed dataset. No spatial data pipeline, verified site assessment or hydrological model yet.
