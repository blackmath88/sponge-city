> Historical hackathon document, preserved from the team repository. Current setup: [README](../../README.md) and [post-hackathon architecture](../../docs/POST-HACKATHON-ARCHITECTURE.md).

# Repository consolidation map

Canonical delivery: **andymucyo-ops/Hack-am-Rhein-2026-SpongeSquad main, wrapper/**.
Checked 4 October 2026. Source repositories and branches remain intact.

| Source | Pinned revision | Useful work | Destination / decision |
| --- | --- | --- | --- |
| Group repo main | c5c8731 | Full shared website, Lab, X-Ray, Rain Walk, references | Canonical wrapper modules retained |
| blackmath88/Hack-am-Rhein-2026-SpongeSquad claude/laughing-tesla-xmtuec | 74826d7 | Full journey, adapters, research/Team surfaces | Already imported into wrapper/site; no second copy |
| Same fork group/feature-site-wrapper | 2e71fb7 | Charter, catalogue, Lab v0.4, X-Ray, ADRs | Already consolidated |
| Same fork integration/spatial-journey | 7ea75bd | Parallel shell and modules | Superseded by consolidated website; retained in source history |
| Same fork feature/street-lab-ui and feature/structured-street-world | c35be0d / d6762e9 | Earlier Lab iterations | Superseded by current Lab |
| Same fork feature/sponge-street-explainer | 0b9ccf5 | Original explainer | Existing wrapper/prototypes/sponge-street |
| blackmath88/the-spongesuad-hackamrhein main | 5127396 | Research library, catalogue, historical weekend plan | Already in wrapper/site/research and wrapper/site/team |
| blackmath88/sponge-city main | 1626c8e | Evidence Atlas, situation map, decision/governance/monitoring research, QTrees precedent | wrapper/evidence-atlas; readable research pages and viewer routes |
| sponge-city feat/sponge-facts | 4a0ff1c | Structured sponge facts, generated documentation and pilot | Added to evidence-atlas data/docs/scripts; labels retained |
| sponge-city feat/data-charter-map | 99ee7f6 | Earlier Charter | Current wrapper/data-charter-map remains canonical |
| sponge-city feat/sponge-street-explainer | 3200bb2 | Alternative older standalone explainer | Retained in source; current wrapper prototype remains canonical |
| sponge-city feat/adaptive-interface-orchestration | ab4fe3c | Qualitative state engine, contracts, renderer demo | wrapper/experiments/adaptive-interface; explicitly experimental preview |
| sponge-city claude/lucid-bell-0m6sdz | 5f05ded | Earlier state engine implementation | Already incorporated by adaptive branch; no duplicate |
| sponge-city ccr-c43cde30-2iw2xj | 450a4ee | Earlier solution-hub restructuring | Main includes hub; no duplicate |

## Boundaries

The adaptive source PR [#3](https://github.com/blackmath88/sponge-city/pull/3)
remains open and marked “Do not merge yet.” Importing a labelled preview does not
merge or approve that PR, replace the canonical Lab, or validate mock inputs.
No source branch is deleted or rewritten. Source research status labels are
preserved, not freshly certified. No new Basel legal claims are introduced.

Site-scoping is a pinned source snapshot inside wrapper/site because group main
has no runnable Andy app. No existing path outside wrapper is changed.

## Website entry points

- UNDERSTAND and Sources & Research: Evidence Atlas, situation map, adaptive preview.
- Sources & Research: rendered governance, monitoring, ZHAW, QTrees and facts documents.
- Existing Lab and Rain Walk: unchanged working modules.

New research and experimental code is copied with its scripts and tests so it can
be rebuilt. The main app consumes these as independent viewers, not shared domain
state. Evidence-to-scenario integration remains an explicit future adapter.
