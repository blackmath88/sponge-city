<!-- BEGIN public-repo-header -->
<div align="center">

# Sponge City — Evidence to Investigation

<a href="https://github.com/blackmath88/sponge-city"><img alt="Primary language: HTML" src="https://img.shields.io/badge/language-HTML-526078?style=flat"></a>
<a href="https://github.com/blackmath88/sponge-city/tree/main/docs"><img alt="Documentation" src="https://img.shields.io/badge/docs-guide-16796f?style=flat"></a>
<a href="https://github.com/blackmath88/sponge-city/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/blackmath88/sponge-city?style=flat&amp;color=737373"></a>

</div>
<!-- END public-repo-header -->

**Understand a sponge city. Investigate a place. Explore alternatives. Leave with a defensible next question.**

Sponge City is an evidence and learning workspace for urban rainwater, heat and vegetation. It grew out of Hack am Rhein 2026 and now connects a German/English journey, evidence from **Basel, Berlin, Copenhagen and Zürich**, maps, Basel place profiles and an illustrative Street Lab.

**GIS calculates. Rules constrain. AI explains.** Observed, derived, modelled, illustrative and unknown information must remain distinguishable. Unknown is not zero.

## Where we are — 27 October 2026

`main` is the integrated product baseline. Start here rather than choosing among feature branches. The project is a working research/learning prototype; its strongest capability is explaining evidence and missing information before a decision.

| Capability | Current state |
| --- | --- |
| DE/EN learning journey | Working: mechanisms, sourced practice, measurement questions and investigation exports |
| Four-city comparison | Working: seven-indicator matrix; incompatible quantities, methods, scales or periods are explicitly not comparable; no city ranking |
| City-aware map | Working: 19 bounded snapshot layers, provenance, gap notices, side-by-side views, paged table alternative and share links |
| Basel place investigation | Working for existing Kanonengasse / Klybeck contexts: Street X-Ray, local Rain Walk observations and next-investigation handoff |
| Street Lab | Working educational React/SVG street and conservation-tested water model with synthetic inputs |
| Street Transformation Studio | **Foundation only:** immutable A/B proposal state, intervention placement rules, serialization and session storage; no editor or user-facing entry yet |
| Opportunity Explorer | Planned: one real Basel place, need/possibility/mechanism distinctions and investigation candidates ([#9](https://github.com/blackmath88/sponge-city/issues/9)) |
| Rainfall Scenario Playground | Planned composition of existing learning model and typed scenario inputs ([#10](https://github.com/blackmath88/sponge-city/issues/10)) |
| Portable V2 evidence standard | Separate architecture/orchestration proposal in [PR #5](https://github.com/blackmath88/sponge-city/pull/5); not adopted by this integration |

This is screening and investigation support. Real-place selection does not supply surveyed geometry, soil properties, utilities, drainage connectivity, permissions or calibrated hydraulic inputs. Synthetic interventions and water outputs do not establish site suitability or predicted cooling/flood benefits.

## Run it

Requires **Node 24 and npm**. From the repository root:

```sh
make run
```

Open <http://127.0.0.1:4173/>. The application needs no backend. Observations and edits are browser-local, not a shared reviewed record.

| Command | Purpose |
| --- | --- |
| `make build` | Build the static application into `site/`; install Street Lab dependencies from its lockfile if missing |
| `make smoke` | Build, typecheck, validate evidence/contracts and run consolidated deterministic suites |
| `make browser` | Existing real-browser acceptance suite; requires Playwright and Chromium |

For a different browser installation, set `PLAYWRIGHT_DIR` to the directory from which `require('playwright')` resolves and `CHROMIUM` to the executable path. See [the acceptance script](scripts/browser-acceptance.mjs). Deploying the static output is a separate action; this integration does not publish a website.

## What to open

Follow **Start → Understand → From practice → Measure → Evidence → Compare cities → Map → Inspect a place → Observe → Explore → Next investigation**. German is the default; use the English switch without abandoning the selected context.

The map shows available evidence and its gaps. A Basel place then provides context for inspection and observation. The Street Lab explains mechanisms on a synthetic street. The final JSON/Markdown investigation brief carries place identity, source fingerprints, open questions and unresolved gates.

## Where we go next

The existing [roadmap #7](https://github.com/blackmath88/sponge-city/issues/7) is **Understand → Investigate → Transform → Evaluate**. Recommended delivery order:

1. **Finish one Studio journey.** Put the existing A/B state behind an accessible schematic editor; allow tree trenches, rain gardens and depaving, with DE/EN text, clear illustrative labels and an exported proposal. Connect it to the existing journey before adding more modules.
2. **Ground that journey in one Basel place.** Build the Opportunity Explorer around existing evidence and explicit unknowns. Separate need, physical/institutional possibility and potential mechanisms; preserve exact place/source identity into Studio.
3. **Compose rainfall learning deliberately.** Reuse the Street Lab model through an opt-in typed adapter; expose assumptions and unsupported inputs. Preserve conservation and suppress real-site quantitative claims when parameters are missing.
4. **Strengthen evidence and release confidence.** Reproduce missing Basel calculations from pinned inputs, resolve unreachable/thin sources, and extend browser/accessibility verification before claiming broader readiness.

These are sequencing recommendations and existing backlog items, not new mission dispatches. The [integration gate #11](https://github.com/blackmath88/sponge-city/issues/11) remains applicable to the future combined feature journey.

## Evidence and verification limits

- Basel's 9,132 trees without a mapped planting polygon reproduce from the pinned snapshot. The different 9,046 paved-polygon claim, area percentages and hot-day counts lack the complete reproducible inputs in this repository; flags remain visible.
- Zürich's 28.6% sealing figure is a project calculation of sealed **biotope types**, including forest/water in its denominator, not an official sealing statistic interchangeable with the other cities.
- Maps are bounded snapshots/windows. Absent layers are documented gaps, not evidence that a phenomenon is absent.
- Consolidation verification: `make smoke` passes **258 Node tests** plus module/data checks and the build/typecheck. A fresh browser run was blocked because Chromium is unavailable and its download failed in this environment. The existing PR #6 record reports 38/38 Chromium checks on its product code; that is historical evidence, not a new run on this combined tree. Safari, Firefox, screen readers and physical touch devices remain unverified.

See [reproducibility records](data/verification/reproducibility.json), [review disposition](docs/session/review/DISPOSITION.md) and the [consolidation record](docs/CONSOLIDATION-2026-10-27.md).

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
| `data/cities/` | Reusable city evidence profiles (Basel, Berlin, Copenhagen, Zürich) |
| `journey/content/` | Bilingual concept, practice, measurement-to-decision and UI strings |
| `contributions/andy/` | Andy Nkunzimana's Tellplatz evidence audit and Landsat processing, preserved with attribution |
| `archive/` | Original ZIP snapshot and per-file hashes, before consolidation |

`wrapper/` paths are retained to preserve module imports and source identities. The shared team shell is no longer the application. Simon's bitmap interface, Bala's videos and the pitch/presentation are excluded from the active source and build.


## Architecture and deeper reading

- [Post-hackathon architecture](docs/POST-HACKATHON-ARCHITECTURE.md) and [Decision Canvas](docs/DECISION-CANVAS.md): current boundaries and product thesis.
- [Bilingual journey](docs/BILINGUAL-JOURNEY.md), [city profiles](docs/CITY-PROFILE.md), [map layers](docs/MAP-LAYERS.md): current integration contracts.
- [Offboarding and attribution](docs/OFFBOARDING.md): preserved team contributions and source/archive identities.
- [Governance and measurement](docs/GOVERNANCE-AND-MEASUREMENT.md), [evidence atlas](docs/QUERYABLE-EVIDENCE-ATLAS.md), [monitoring/data stack](docs/MONITORING-DATA-STACK.md).
- [Sourced facts](docs/SPONGE-FACTS.md), [source inventory](wrapper/data-charter-map/docs/DATA-SOURCES.md), [gap filling](wrapper/data-charter-map/docs/GAP-FILLING.md).

The qualitative adaptive state/effect engine and the illustrative water model are distinct. Studio adds proposal state, not another effects engine. Andy Nkunzimana's Tellplatz evidence stays separately attributed; its measurements are not transferred into another street. Historical documents describe earlier phases; the status and links above identify the current product baseline.
