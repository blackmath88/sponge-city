# Sponge City — Basel Decision Canvas

Choose a Basel place. Inspect what is known, what can be computed and what still needs asking or measuring. Explore the mechanism of a sponge intervention, then leave with a concrete investigation record.

**GIS calculates. Rules constrain. AI explains.**

## Run

Requires Node 24 and npm. From the repository root:

```sh
make run
```

Open <http://127.0.0.1:4173/>. `make build` generates the static application in `site/`; `make smoke` builds it and checks the evidence, contracts, state engine, simulation and module handoffs. Missing Street Lab dependencies are installed from its pinned lockfile. No backend is needed for the application. `site/` can be published beneath a GitHub Pages project path.

## The journey (German default, English switch)

1. **Understand:** five mechanisms (retention, infiltration, storage, evaporation, shade) across heavy rain, heat and dry periods.
2. **From practice:** sourced cases, labelled city-wide, programme, single project or study from another setting.
3. **Measure:** per indicator, the question, desirable measurement, accepted proxy, what exists in Basel, what it cannot establish, next action and later monitoring.
4. **Evidence:** the Data Charter map.
5. **Compare cities:** Basel, Berlin and Copenhagen, with incompatible measures marked not comparable. No ranking.
6. **One Basel place:** Street X-Ray → Rain Walk → Street Lab (synthetic street, place as context only).
7. **Next investigation:** unresolved gates, gatekeepers and next actions as JSON and a readable report. Status stays `requires-investigation`.

See [Bilingual journey](docs/BILINGUAL-JOURNEY.md), [City profile contract](docs/CITY-PROFILE.md) and [Comparator selection](docs/CITY-SELECTION.md). Need, possibility and potential effect remain separate; a real place selection does not supply measured geometry or hydraulic parameters to a learning model.

## Modules and contracts

| Source | Role |
| --- | --- |
| `journey/` | Manifest, context adapters and replaceable Decision Canvas view |
| `data/`, `solutions/` | Canonical evidence atlas, situation map and sourced fact catalogue |
| `adaptive-interface/` | PlaceModel → StateModel → interventions → effects under a scenario; independent of the renderer |
| `wrapper/data-charter-map/` | 25-indicator charter, Basel snapshots, live layers and gap research |
| `wrapper/street-xray/` | Street evidence profiles and deterministic assessment rules |
| `wrapper/street-workspace/` | React/SVG Street Lab, conservation-tested illustrative water model and Rain Walk |
| `wrapper/sponge-catalogue/` | Intervention mechanisms, local precedents, gatekeepers and evidence access vocabulary |
| `wrapper/achim/connected-case/` | Reproducible Klybeck claim/gap/action graph with schema and source fingerprints |
| `wrapper/site/basel-site-scoping-tool/` | Preserved discovery snapshot and candidate fixture used by the connected case; illustrative rankings are not authoritative |
| `data/cities/` | Reusable city evidence profiles (Basel, Berlin, Copenhagen) |
| `journey/content/` | Bilingual concept, practice, measurement-to-decision and UI strings |
| `contributions/andy/` | Andy Nkunzimana's Tellplatz evidence audit and Landsat processing, preserved with attribution |
| `archive/` | Original ZIP snapshot and per-file hashes, before consolidation |

`wrapper/` paths are retained to preserve module imports and source identities. The shared team shell is no longer the application. Simon's bitmap interface, Bala's videos and the pitch/presentation are excluded from the active source and build.

## Architecture, provenance and research

- [Post-hackathon architecture](docs/POST-HACKATHON-ARCHITECTURE.md): boundaries, current integration and next seams.
- [Offboarding record and attribution](docs/OFFBOARDING.md): commits, archive, backbone choice and migration inventory.
- [Decision Canvas](docs/DECISION-CANVAS.md): product direction.
- [Governance and measurement](docs/GOVERNANCE-AND-MEASUREMENT.md): responsible institutions and public influence routes.
- [Queryable evidence atlas](docs/QUERYABLE-EVIDENCE-ATLAS.md), [monitoring/data stack](docs/MONITORING-DATA-STACK.md), [research](docs/RESEARCH.md).
- [Sponge facts](docs/SPONGE-FACTS.md), [data sources](docs/DATA-SOURCES.md), [gap filling](docs/GAP-FILLING.md).

## Current boundary

The application connects evidence and investigation workflows. It is screening-level decision support, not a verified site assessment, real-site hydrological model or construction recommendation. The adaptive demo and Street Lab retain explicit synthetic inputs. Rain Walk review is local and unauthenticated; reports do not clear authority gates or change simulation parameters. Andy's Tellplatz measurements are retained as a separate evidence contribution and are not transferred to another place.

The team repository and its website remain unchanged. This consolidation is isolated on `feat/post-hackathon-consolidation`; merging and deployment are separate actions.
