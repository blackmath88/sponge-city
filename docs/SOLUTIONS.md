# Solution model

The repository is one decision canvas made of several **solutions**. Each solution answers one question, reads the shared evidence and keeps unknowns visible. They are built into standalone pages in `site/`, listed on a hub at `site/index.html`.

```text
solutions/
  registry.json            order of solutions on the hub
  <id>/
    solution.json          manifest (the contract below)
    page.html              page source with data and style markers
    smoke.mjs              logic test, run by make smoke
    fetch.mjs              optional: refreshes the solution's data snapshot
    README.md
shared/
  tokens.css               light and dark design tokens, inlined into every page
  hub.html                 hub page source
data/                      shared datasets, one source of truth
site/                      built pages (committed, open with a double-click)
scripts/                   build, check, fetch, scaffold, serve
```

## Commands

| Command | What it does |
|---|---|
| `make new name=my-solution title="My solution"` | Scaffolds `solutions/my-solution/` and adds it to the registry |
| `make build` | Builds every page in `site/` and the hub |
| `make smoke` | Build, validate the atlas, check every manifest, run every solution's test |
| `make fetch` | Runs each solution's `fetch.mjs`, then `make smoke` |
| `make run` | Serves the repo at <http://127.0.0.1:4173> (hub at `/`) |

## Manifest contract (`solution.json`)

| Field | Rule |
|---|---|
| `id` | kebab-case, same as the folder |
| `title`, `question`, `summary` | One question per solution. The summary says what it shows and what it does not claim |
| `roles` | Place Profile roles it fills: `need`, `possibility`, `potential_effect`, plus `evidence` or `governance` |
| `status` | `idea`, `prototype` or `alpha` |
| `page` | Page source. Its `<style>` must contain `/*__SHARED_CSS__*/` |
| `embeds` | `{ "KEY": { "file": "data/…json", "pick": ["…"] } }`. The page must contain `/*__KEY__*/ null`; `pick` limits which top-level keys are embedded |
| `live_sources` | Every source fetched at runtime, with `name`, `url` and the exact `credit` line |
| `smoke` | Test that runs the page's pure logic (see existing solutions for the pattern) |
| `fetch` | Optional snapshot script, or `null` |
| `docs` | Related docs |

`make build` and `make smoke` fail if a manifest breaks the contract, a marker is missing, or a data file is absent.

## Conventions

- **Cite, don't copy.** Evidence lives in `data/evidence-atlas.json`. Solutions refer to its record and source IDs, so a correction there reaches every solution.
- **Kinds of evidence.** Label every value or layer as observed, modelled, derived, planning or unknown. Unknown never becomes zero.
- **Pure logic in its own script.** Put testable functions in a separate `<script id="…-logic">` so `smoke.mjs` can run them in Node without a browser.
- **Standalone pages.** No build tooling beyond `scripts/build.mjs`; external scripts only from cdnjs. Pages must open from the file system.
- **Credit and licence.** Name each live source in `live_sources` and in the page's attribution.
- **No surveillance layers.** Environmental, infrastructure and planning data only.

## Current solutions

| id | Question | Roles |
|---|---|---|
| `evidence-atlas` | What do we actually know about VoltaNord and Basel's sponge-city decisions, and what is still open? | evidence, governance |
| `situation-map` | What do we know about this place, and what don't we? | need, possibility |
| `sponge-street` | How does an old European street become a connected sponge, one intervention at a time? | possibility, potential_effect, governance |

Old links under `prototype/` redirect to `site/`.
