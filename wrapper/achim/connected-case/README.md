# Connected case v1

A machine-readable connection layer for Achim's modular Sponge City work. It shows how independent modules exchange **evidence and provenance** without merging into one application, using the existing Klybeck example.

This is infrastructure, not UI. An information-design layer can read `generated/klybeck-edge.case.json` and link claims, gaps, gatekeepers and actions by their stable IDs.

## Commands

Requires Node 22.6+ (the Site Scoping candidate list is TypeScript, so Node runs with `--experimental-strip-types`). No dependencies and no `npm install`.

```sh
cd wrapper/achim/connected-case
npm run build   # regenerate generated/klybeck-edge.case.json
npm run check   # fail if the generated file is stale or invalid
npm test        # contract and evidence-safety tests
```

If a source module changes, `npm test` fails with "stale". Run `npm run build`, review the diff and commit it.

## Files

| Path | Purpose |
| --- | --- |
| `contracts/connected-case.v1.schema.json` | JSON Schema (2020-12) for the case |
| `data/klybeck-edge.input.json` | Curation only: which source claims to use, their stable IDs, stage text, gaps, gatekeepers and actions. It holds no site values except the 2.4 m strip width, which the build checks against Street X-Ray's method text |
| `generated/klybeck-edge.case.json` | Deterministic build output. Do not edit by hand |
| `scripts/build-case.mjs` | Source adapters, rule enforcement and a small built-in schema validator |
| `tests/connected-case.test.mjs` | `node:test` suite |

The output folder is `generated/`, not `dist/`. `wrapper/.gitignore` ignores `dist/`, and `wrapper/scripts/website.mjs` drops every `dist` path when it stages the website, so a `dist/` file could be neither committed nor published.

## Source modules (read-only)

| Source ID | File | What it contributes |
| --- | --- | --- |
| `source:site-scoping-areas` | `wrapper/site/basel-site-scoping-tool/src/data/areas.ts` | Candidate identity, coordinates, screening hypothesis, missing-data list. The 0–1 indicator scores are **not** carried |
| `source:candidate-site-contract` | `wrapper/site/integration/contracts/candidate-site-context.v1.schema.json` | Rule that coordinates are identity context only |
| `source:data-charter` | `wrapper/data-charter-map/data/data-charter.json` | Evidence classes and permitted uses |
| `source:street-xray` | `wrapper/street-xray/data/street-evidence-profile.v0.json` | Claims, gates, segment, footprint and the 20 mm scenario (the calculation stays there) |
| `source:sponge-catalogue` | `wrapper/sponge-catalogue/data/catalogue.json` | Access-state vocabulary, gatekeepers, the rain-garden action and its Basel precedent |
| `source:rain-walk` | `wrapper/street-workspace/public/rain-walk/evidence.mjs` | Observation kinds and review states for the field-observation plan |
| `source:street-lab` | `wrapper/street-workspace/README.md` | An illustrative model of a synthetic street. It explains, never validates |

Each source is pinned by `sha256` in the output. The build calculates nothing new. It does re-check that 160 m × 2.4 m = 384 m² and that 20 mm × 384 m² = 7.68 m³, and stops if the sources disagree.

## Shape of the case

- **`claims[]`** (`claim:*`): each one answers *what is claimed* (`statement`, `value`), *what kind of evidence it is* (`evidence_state`: known · derived · assumed · modelled · restricted · missing), *where it came from* (`provenance`: source module, locator, original source, URL, method), *how it was validated* (`validation`), *what it may be used for* (`permitted_use`), *what its limits are* (`limitations`), *its access state* (`access_state`) and *its current state* (`state`). Restricted and missing claims point to a `gap_id`.
- **`gaps[]`** (`gap:*`): each has its gatekeepers, its next actions and what it blocks.
- **`gatekeepers[]`** (`gatekeeper:*`): who can unlock missing evidence, mostly taken from the Sponge Catalogue.
- **`actions[]`** (`action:*`): proposed next steps. Each says what it would establish and what it cannot establish.
- **`stages[]`** (`stage:N-key`), in order: candidate signal → evidence classification → evidence gate → field-observation plan → intervention candidate → illustrative scenario → bounded decision. Each stage names its module and role, and lists the claims, gaps and actions it shows.
- **`decision`**: always `requires-investigation`, and lists the states it cannot reach.
- **`summary`**: entry points for the information design: why investigate, what is known, what is assumed, what is missing or restricted, what field observation could establish, what the scenario can and cannot show, and the next decision.

Unknown values are always `{ "kind": "unknown", "amount": null, "reason": "…" }`.

## Rules enforced

Rules are enforced by the schema, by `enforceRules()` in the build, and by the tests:

- Unknown never becomes zero. No numeric zero appears anywhere in the case, and the build refuses a zero from a source.
- Missing or restricted evidence never becomes safe or suitable. It has no permitted use and always opens a gap.
- Evidence stays separate from assumptions. Assumed and modelled claims may only explain or screen; `summary.known` cannot list them.
- Every claim carries provenance, validation and at least one limitation.
- Every gap has a gatekeeper and a next action that resolves it, and every ID reference resolves.
- The 7.68 m³ figure is rain falling on an assumed footprint. Labels that suggest retention, storage, capacity or performance are rejected.
- Street Lab is `illustration-only` on a synthetic street. Rain Walk contributes a plan; `collected_observations` must be empty in v1.
- The decision stays `requires-investigation`. A `state` or `status` of recommended, approved, suitable, safe or feasible is rejected anywhere in the case, and `engineering_recommendation` is `false`.
- Output is deterministic: no timestamps, fixed ordering.

Roles: GIS and source modules calculate, rules constrain, and AI or presentation layers may explain. None of them may upgrade an evidence state.

## Later shared changes (not made here)

This branch only touches `wrapper/achim/**`. Two shared files would need to change, and their owners should make those changes:

1. **Publish the JSON.** In `wrapper/site/integration/routes.json`, extend the `achim-bucket` module's `files`:
   ```json
   "files": ["index.html", "connected-case/generated/klybeck-edge.case.json", "connected-case/contracts/connected-case.v1.schema.json"]
   ```
   This serves them at `achim/connected-case/generated/klybeck-edge.case.json`.
2. **Run these tests in `npm test`.** In `wrapper/site/scripts/test-all.mjs`, add:
   ```js
   ['Achim connected case', node, ['--experimental-strip-types', '--no-warnings', '--test', 'tests/connected-case.test.mjs'], 'wrapper/achim/connected-case'],
   ```
