# Hack am Rhein offboarding — 4 October 2026

## Source pin and preservation

- Team source: `andymucyo-ops/Hack-am-Rhein-2026-SpongeSquad`, commit `e502e0356adaa4a9e9c2929d4611ce34f88df1d5`.
- Destination before import: `blackmath88/sponge-city`, commit `1626c8e4bdd9c8859ba73002faf7f40db0b276c8`.
- Original ZIP: [`archive/sponge-city-hackathon-offboard-2026-10-04.zip`](../archive/sponge-city-hackathon-offboard-2026-10-04.zip).
- ZIP SHA-256: `0ea672f57a58fd95420d1afebea6140d1c044c2452e52898d31c7bbaad07017e`.
- [`archive/offboard-manifest.json`](../archive/offboard-manifest.json) records 344 original paths, byte lengths and hashes. The ZIP contains an identical manifest and a Git bundle of **all** pre-offboarding destination refs, including unmerged feature work.

The ZIP precedes consolidation. It preserves Achim's wrapper as it existed, including historical integration dependencies, plus Andy's committed data, processing scripts, tests and static backend evidence. Historical dependencies inside the ZIP are archival; they do not enter the active build. The team repository was read only; no branches, files, PRs, settings or deployment were changed there.

## Backbone decision

**Keep Achim's typed evidence and state backbone. Retain Andy's stronger bounded evidence extraction as an adapter.**

| Component | Decision | Reason |
| --- | --- | --- |
| Evidence atlas, fact catalogue and Data Charter | Canonical | Typed claims, evidence/access classes, sources, permitted uses and explicit missingness |
| PlaceModel → StateModel → Scenario → Effect Engine | Canonical engine seam | Deterministic state operations, renderer independence and explicit routing evidence |
| Street X-Ray / Kanonengasse engine | Canonical site screening | Computed profile, reproducible source transformations and gates tied to missing evidence |
| Connected Case | Canonical integration evidence | Stable claim/gap/action IDs and deterministic source fingerprints |
| Street Lab | Learning model | Conservation-tested, synthetic geometry; it explains mechanisms rather than estimating a real site's performance |
| Andy's Tellplatz AOI, access audit and Landsat extraction | Retained, separately attributed | Real data handling, QA masking, calibration, source/scene provenance and honest rejection of unusable evidence |
| Andy's frontend-derived scenario backend | Archive only | Intervention reductions in mm/°C are game estimates coupled to the excluded UI, not site-calibrated hydrology |
| Historical site-scoping snapshot | Preserved discovery adapter | Source registry and candidate identity are useful; fixture scores remain illustrative |

Andy Nkunzimana authored the retained Tellplatz evidence work. Source commits include `436d84f` (access audit), `edb1c56` (Landsat audit), `fc4812e` (intervention evidence metadata) and `1737eb3` (observed heatwave baseline). Full author history remains in the original team repository. All public dataset/provider credits remain in the retained data, catalogue and audit documents. Attribution is not a claim that the contributor owns the underlying public datasets.

## Migration map

| Team path | Destination | Treatment |
| --- | --- | --- |
| `wrapper/evidence-atlas/{data,docs,solutions,scripts,shared,prototype}` | Same roots in `sponge-city` | Upgrade the original atlas in place; avoid a second canonical copy |
| `wrapper/experiments/adaptive-interface/` | `adaptive-interface/` | Restore executable state-engine work to its established destination path |
| `wrapper/{street-workspace,street-xray,data-charter-map,sponge-catalogue,prototypes,docs}` | Same paths | Preserve modules, tests, source IDs and research |
| `wrapper/achim/connected-case/` | Same path | Preserve the contract and deterministic case; rebuild fingerprints after intentional Rain Walk additions |
| `wrapper/site/{basel-site-scoping-tool,integration/contracts,research}` | Same paths | Preserve candidate identity seam and source research; do not republish owner buckets |
| `data/`, `scripts/`, `tests/` from Andy lane | `contributions/andy/` | Preserve bytes and relative data-script paths |
| Shared wrapper/product shell, Achim's pitch UI | ZIP | Replace the presentation composition with a place-centred Decision Canvas |
| Simon's `frontend/` and all nested copies | ZIP only where historical wrapper dependencies existed | Excluded from active source/build |
| Bala's videos and presentation-story | Not imported to active source | Team originals remain intact |

The new UI uses the selected street profile directly. Geometry and scores are deliberately absent from the candidate handoff. Observation storage is keyed by place ID, begins empty for a selected place, and exports investigation identity separately from unverified visual observations. Original generic demo storage remains available under its old key.

## Governance inspection

The canonical `blackmath88/weavr/docs/CHATGPT-OPERATING-CONTRACT.md` was read before writes. The destination has no current Observstory/Observatory configuration, `.weavr` ingress or project/mission identity. The team wrapper's weekend planner is a historical hackathon schedule, not live governed authority. No Weavr read tool was exposed for current mission state. No mission was created or dispatched, no need was waived, and no scope or authority was changed. Repo work is isolated on a reviewable branch; no merge or release is included.

## Preserved limitations

- Site geometry does not yet compile into the Street Lab's hydraulic graph.
- The adaptive engine still uses an explicit fixture in its learning demo.
- Shared observation review and authority verification are not implemented.
- Andy's scientific refreshes need optional Python packages and external sources; a source test expects `heat_grid_results.json`, which was not committed. The missing file is not fabricated.
- Exact utilities, infiltration, overflow, ownership and maintenance must be resolved through their evidence owners.

## Product integration supplement

Achim's later `product/` shell and manifests were outside `wrapper/`. Their nine source files and tests are preserved byte-for-byte in [`archive/product-integration-source-2026-10-04.zip`](../archive/product-integration-source-2026-10-04.zip), with a source-commit/per-file manifest. Contributor snapshots, Simon/Andy UI copies and media are excluded from this supplement. Its SHA-256 is `9ed7e00c26a26eeefe032554ded2cc929ce2906f7dfc65838b6ef1f24c099ac1`.

## Verification

- `make smoke`: 84 automated tests plus atlas/fact/charter/catalogue/profile/explainer validation passed.
- Desktop (1440 px) and mobile (390 px): navigation, place switching, observation separation, catalogue and investigation download checked in Chromium; no browser errors, no shell overflow.
- Andy processing: 19 tests passed. Two fixture-dependent original tests cannot run because the source repo omits `data/processed/audit/heat_grid_results.json` and `data/raw_data/heat/basel_stadt_waermeinseleffekt_current_epsg2056.gpkg`. The complete original suite exposes those omissions; the available algorithmic tests pass when those two fixture checks are deselected.
