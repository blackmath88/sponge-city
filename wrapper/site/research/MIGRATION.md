# Migration manifest

Material brought into this group repository from the team's separate research repository.
The source repository was left unchanged.

| Field | Value |
| --- | --- |
| Source repository | [`blackmath88/the-spongesuad-hackamrhein`](https://github.com/blackmath88/the-spongesuad-hackamrhein) |
| Source branch | `main` |
| Source commit | [`51273960e54f730328383931665f2d95da33107c`](https://github.com/blackmath88/the-spongesuad-hackamrhein/tree/51273960e54f730328383931665f2d95da33107c) (2026-10-03 11:22 +02:00, Achim Imboden) |
| Imported | 2026-10-03, into `feature/site-wrapper` |
| Method | Verbatim file copies. No wording, status label or source link was changed. |

The `research-library` branch (commit `5464044`, open PR #2 in the source repository) carries the same `docs/` and `resources/` content as `main`; its other differences are an older Observatory layout that `main` superseded. Nothing additional was imported from it.

## Imported files

| Source path | Destination | Shown on the website |
| --- | --- | --- |
| `docs/README.md` | `research/source-repo/docs/README.md` | Sources & Research → library index |
| `docs/RESEARCH_METHOD.md` | `research/source-repo/docs/RESEARCH_METHOD.md` | Sources & Research → research method |
| `docs/DATA_AND_SOURCES.md` | `research/source-repo/docs/DATA_AND_SOURCES.md` | Sources & Research → data & sources |
| `docs/RESEARCH_BACKLOG.md` | `research/source-repo/docs/RESEARCH_BACKLOG.md` | Sources & Research → open questions |
| `docs/CHALLENGE_LANDSCAPE.md` | `research/source-repo/docs/CHALLENGE_LANDSCAPE.md` | Sources & Research → background |
| `docs/TECHNICAL_PATTERNS.md` | `research/source-repo/docs/TECHNICAL_PATTERNS.md` | Sources & Research → background |
| `resources/README.md` | `research/source-repo/resources/README.md` | (folder note) |
| `resources/catalog.yml` | `research/source-repo/resources/catalog.yml` | Sources & Research → resource catalogue table |
| `observatory/README.md` | `team/observatory/source/OBSERVATORY_README.md` | Team → planning records |
| `observatory/DAY_PLAN.md` | `team/observatory/source/DAY_PLAN.md` | Team → planning records |
| `observatory/TASK_PLANNER.md` | `team/observatory/source/TASK_PLANNER.md` | Team → planning records |
| `observatory/data/weekend.json` | `team/observatory/data/weekend.json` | Team → weekend plan (historical) |

## Adapted, not copied

| Source path | What happened |
| --- | --- |
| `observatory/site/index.html` | Its Day Plan view was re-implemented on the website's Team page with the shared styling. Its Observatory tab depends on a generated Observstory Project Map and snapshot, and its Task Planner reads the source repository's GitHub Issues. Neither exists for this group repository, so the Team page labels them unavailable and links to the source repository's own published Observatory instead. |

## Deliberately not imported

| Source path | Reason |
| --- | --- |
| `.github/workflows/observstory.yml` | Repository-specific automation and GitHub Pages deployment. |
| `.github/ISSUE_TEMPLATE/*` | Issue forms belong to the source repository's task process. |
| `AGENTS.md` | Agent instructions for the source repository. |
| `.observstory/coordination.json` | Coordination declarations (decisions D1–D3) were made for the source repository. They are linked from the Team page, not adopted here. |
| `observstory.config.json` | Lane configuration for the source repository's folder layout. |
| `README.md` | Source-repository introduction; its research links point to the files imported above. |

## Source-repository issues and pull requests

These stay in the source repository. Links, as recorded in its Observstory snapshot generated 2026-10-03 18:42 UTC:

- [PR #1 · Add shared research and resources library](https://github.com/blackmath88/the-spongesuad-hackamrhein/pull/1) (merged)
- [PR #2 · Research library](https://github.com/blackmath88/the-spongesuad-hackamrhein/pull/2) (open at snapshot time)
- [Issues](https://github.com/blackmath88/the-spongesuad-hackamrhein/issues): none open at snapshot time

## Group-repository material also shown in Sources & Research

These were already in this repository (Achim's `integration/spatial-journey` work, merged into `feature/site-wrapper`) and are rendered alongside the imports:

- `wrapper/data-charter-map/docs/DATA-CHARTER.md`, `DATA-SOURCES.md`, `GAP-FILLING.md`, `GATEKEEPERS.md`
- `wrapper/sponge-catalogue/docs/CATALOGUE.md`
- `wrapper/docs/TODO-DATA-GAP-TO-DECISION.md`, `PRODUCT_VISION.md`, `MVP.md`, `ARCHITECTURE.md`

## Group main relocation (4 October 2026)

Website source imported from `blackmath88/Hack-am-Rhein-2026-SpongeSquad`
branch `claude/laughing-tesla-xmtuec`, commit
`74826d744caaffc5aa25f160b682e0f44b10c739`, into `wrapper/site/`.
All paths above are now prefixed with `wrapper/site/` in the group repository.
Existing modules remain canonical in `wrapper/`; assembly copies them into an
ignored staging tree. The site-scoping app is an unchanged source snapshot from
that commit in `wrapper/site/basel-site-scoping-tool/` because group main has no
runnable copy. This is not a change to Andy's original folder. Replace this
snapshot or its build input explicitly when Andy provides the canonical app.
Rain Walk and references come from current group main and are preserved.
