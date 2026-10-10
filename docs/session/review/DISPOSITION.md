# Disposition of the independent review (candidate cf64561e74cc)

Reviews: R1 (code/UX/boundaries/bilingual, Opus 5.5) and R2 (evidence validity, Sonnet), both read-only on the exact commit. Neither found a blocker. R2 verified 86/86 city-profile quotes verbatim on their cited pages. Every finding below was fixed unless marked **deferred**; the fixes are in the commits after cf64561 and are checked by `make smoke` and `make browser`.

## R1 — code, UX, boundaries, bilingual
| Finding | Disposition |
|---|---|
| M1 focus lost on re-render; `#view` live region | Fixed. Focus is remembered by id/data-attribute and restored; `#view` is no longer `aria-live`; a separate polite status line announces the step and city; the map keeps the old view while it reloads. Browser check "keyboard focus survives a re-render". |
| M2 table held only 25 objects per layer; claims overstated | Fixed. Table is paged (50 per page) and reaches every object; keyboard help shown under the map; `map_aria` text corrected. Unit and browser tests. |
| M3 Basel charter guidance in other cities' briefs and links | Fixed. The brief uses the measurement chain and actors only for Basel; other cities use their own matrix cell; the map links to the city matrix instead of Basel's chain; cells with nothing outstanding are context, not "unresolved". Brief test now covers every layer of every city and checks display names. |
| M4 browser/unit checks that cannot fail | Fixed. Real layer toggle, share button, paging, explicit sealing-layer brief, a reduced-motion check with a control run, axe missing now fails, bilingual ranking/"not measured"/"city-wide" guards. |
| m1 `not_checked` gap crashed; no map error path | Fixed (`checked ?? []`, try/catch with localized error, unit test). |
| m2 English layer metadata in German UI undeclared | Declared in the legacy list (`docs/BILINGUAL-JOURNEY.md`). **Not translated.** |
| m3 selection in compare panel lost on link | Fixed. |
| m4 compare note understated the rule | Fixed (origin and data date added). |
| m5 access status shown as evidence class | Fixed. An open dataset is "open", never "observed"; only absent evidence is "unknown". |
| m6 "(nothing outstanding)" under unresolved | Fixed (see M3). |
| m7 English fatal error in German UI | Fixed. |
| m8 map blocked page scroll on phones | Fixed (`touch-action: pan-y pinch-zoom`; touch does not drag-pan; buttons remain). |
| m9 weak extent guard (±0.5°) | Fixed (10 % of the city extent, minimum 0.02°). |
| m10 stale docs | Fixed (ledger, "eleven steps", browser coverage). |

## R2 — evidence validity
| Finding | Disposition |
|---|---|
| M1 Engelgasse stated a 2016 announcement as completed (and sealed-trees figure) | Fixed in `data/sponge-facts.json` (claim reworded; sealed-trees recomputed 9,046 / about 72 %), practice cases, Basel profile, SPONGE-FACTS.md; the verification record keeps the originally checked text. |
| M2 effect-row `access: not_open` / `derivable: no` unsupported | Fixed to `unknown`. |
| M3 sewer/Zürich access inconsistent | Fixed (`not_open`). |
| m1 Berlin 48 Mio m³ not in a quote; omitted 0.5 Mio m³ wastewater | Fixed (quote and text). |
| m2 `zurich.measurement.04` unsourced | Fixed (two sources, quotes verified by the coordinator against the live pages). |
| m3–m10 matrix states (canopy, heat, Berlin sealing, Berlin green roofs, Basel basis, Copenhagen pluvial layer and sewer citation, Zürich green-roof basis) | Fixed. m9 (`pluvial/basel` cites no gap record): **deferred**. |
| m11 Zürich bbox not reproducible | Fixed (bounds of the Stadtkreise polygons). |
| m12 flood-report period mismatch | Fixed (noted in the entry). |
| m13 974 vs 976 features; m14 "Andet tagkonstruktion" class | Fixed (limitations state both). |
| `berlin.context.01` "including water bodies" parenthetical; `berlin.measurement.01` "32,000 street areas" | Reworded to what the quote supports / removed. |
| m15 thin quotes; m16 scope `unspecified` for cantonal items, `origin: unknown` for an estimate | **Deferred.** |
| Not checked by R2 | The self-computed Zürich sealing percentages (28.6 / 4.7 / 1.1 %), Basel area percentages, the four unreachable Basel sources, all `no_public_evidence_found` searches except two. These remain unverified and are labelled as the project's own computation or as unverified. |

## R3 — focused re-review of the fixes (Opus 5.5, on cd8b222)
0 blocker, 1 major, 10 minor; `make smoke` and the browser suite passed. All fixed afterwards: MA1 (a brief for a layer without `measure_topic` carried the canopy cell: matrix row now chosen by featured indicator or theme, with a test), paging focus at the ends (aria-disabled), page of the selected object and marked row, page announcements, half-corrected matrix cells, the two tree counts reconciled in a visible note, `sponge-facts.json` formatting restored (3 changed lines, `updated` bumped), missing tests (Markdown guard, resolved cells, extent pad, effect row), goto focus target, stale map view (inert while loading, stale clicks ignored), Engelgasse source quote now the verbatim release sentence. The fixes after R3 have not had a second independent review; this is reported as outstanding.

## R4 / R5 / R6 (acceptance slice, 2026-10-10 evening)
- **R4** (Opus, post-R3 delta at d74342a8935c): 0 blocker, 1 major (view stayed inert after leaving the map during a load), 6 minor. Fixed in 5f6eaee (inert reset, focus not pulled back, loading cue only when loading, row mark and page follow a pick, retrieval dates, wording).
- **R6** (Opus, delta d74342a..5f6eaee): R4 6 of 7 fixed, 1 partly; 0 blocker, 0 major, 4 minor, **open at the time of R6, since closed by the author (not independently reviewed)**: Engelgasse `origin` (now `unknown`), literal retrieval dates (now derived from the verification record), focus on BODY while a city loads (now anchored on the status line), two fixes unpinned (now pinned by browser checks), catch clearing `inert` before its token check (now inside the token guard).
- **R5** (Sonnet, independent recomputation of the Zürich sealing share from a pinned WFS download): REPRODUCED. See `zurich-recompute/report.md`.

## Follow-up after R6 (this session continuation)
- Engelgasse `origin` is now `unknown` (announcement, completion unverified); retrieval dates in `data/cities/basel.json` are derived from `data/verification/basel-claims.json` (later date only where a check reached the source; every source carries its verification verdict, and unchecked or unreachable sources are flagged in the UI). Checked by `tests/provenance.test.mjs`.
- Focus keeps an anchor (status line) while a city loads; the stale-token catch no longer clears `inert`; browser checks now pin the no-"loading"-on-cached-paging and selection-opens-its-page behaviour.
- These changes have not had an independent review (R6 covered 5f6eaee).

## Session 3 closure of deferred items (author-tested only; not independently reviewed)
- R2 m9 (`pluvial/basel` cited nothing): the cell now links the recorded Basel flood-hazard gap (and every cell links the gaps its pack records; a test enforces it).
- Thin or unchecked evidence is flagged on the cells: absence of public evidence = "search not independently repeated"; unknown = "not researched"; Zürich sealing = own computation; Zürich canopy = raster not computed; Basel sealing percentages = not independently recomputed; Zürich sewer = conflicting figures.
- Basel claim records carry `independent_recheck`: basel-sealed partial (counts only), sealed-trees sampled (9,046 not reproduced), hot days / Engelgasse / VoltaNord re-checked, all others including the four unreachable sources not re-checked.
- Still open: R2 m15 (thin quotes), m16 (scope/origin labels for cantonal items), Zürich canopy raster, no independent review after 5f6eaee.
- R2 m15 partly closed: the thin quotes of `zurich.interventions.06`, `zurich.interventions.01` (second) and `zurich.access.01` (licence) now carry full verbatim sentences, machine-checked against the live pages on 2026-10-10; `copenhagen.access.01` (a listing page) and the ClimateADAPT/terms-of-use reference remain thin.

## Session 3 continuation 2 (author-tested only; not independently reviewed)
- R2 m16 closed: a `canton` scope exists; `zurich.context.01`, `zurich.context.02` and `zurich.measurement.03` use it and render "Canton, not the city". The Copenhagen 7–9 % estimate keeps `origin: unknown` with a visible note (the report calls it an estimate, method not stated; no stronger class is claimed).
- Thin evidence is labelled, not strengthened: `copenhagen.access.01` (facet text of a listing page) and the `zurich.access.01` terms reference carry a "Thin evidence" note. The second Copenhagen listing quote was replaced by a fuller verbatim dataset sentence read from the live listing. The ClimateADAPT quotes are full sentences and stay.
- Counts: 33 browser checks, 68 node tests in `tests/*.test.mjs`; `make smoke` passes. Tested SHA `109321d` covered the matrix/flag work; `c801bb7` was data-only (Zürich quotes); this checkpoint supersedes both.

## Session 3 continuation 3 (author-tested only; not independently reviewed)
- **Repository-local reproducibility** (`scripts/recompute-basel-trees.mjs`, `data/verification/reproducibility.json`, `tests/reproducibility.test.mjs`): from the pinned Data Charter snapshot (12,504 trees, fetched 2026-10-03) the count *without a mapped planted polygon* reproduces exactly: 9,132 (73.03 %), polygon-area quartiles 202 / 371 / 787 m². This reconciles the Data Charter / measure-step figure; it is **not** the paved-polygon count.
- **Not reproducible locally and recorded as gaps:** the 9,046 (about 72 %) trees in befestigt polygons, the Basel area percentages (16.56 / 28.48 / 45.04 %), and the hot-day counts. Missing input: full Bodenbedeckung (100477; the repository holds a 1,138-polygon window only) and the daily series of dataset 100254. No replacement data was fetched and no claim was upgraded; each gap names source URL, date, expected computation and author-only status and is shown on the practice cards.
- These recomputations are author-run; they are not an independent review.

## Author self-audit of 5f6eaee..8b22429 (NOT an independent review)
Foreground, same author, one pass (about 20 minutes). Coverage: the diff of `journey/app.mjs`, `mapbrief.mjs`, `mapview.mjs`, `views.mjs`, `cities.mjs`, the new scripts and tests; headless-Chromium probes for all 13 gap links (each lands on its gap, highlighted and focused), an abandoned gap-link load, summary-level evidence flags, brief JSON vs Markdown consistency for all 18 drawable layers in both languages.
- **Finding 1 (reproduced, fixed):** a gap link abandoned during a map load left `gapFocus` set, so returning to the map later highlighted and focused an unrelated gap. Fixed (reset when the step is not the map). Mutation check: removing the fix fails the new browser check.
- **Finding 2 (reproduced, fixed):** unchecked, unreachable and thin-quote flags were inside collapsed `<details>`, so they were not visible without opening the source. A flag marker is now on the collapsed source line. Mutation check: removing it fails `tests/provenance.test.mjs`.
- No defect found in: brief JSON/Markdown flags and gaps (now pinned by a test), gap-link landing, bilingual parity of the new strings (existing key-parity and marker tests), selected-page state (R6 behaviour re-run in the browser suite).
- **Not covered:** real assistive technology, Firefox/Safari, touch, slow real networks beyond artificial route delays, concurrent rapid city switches beyond the existing checks, the reproducibility display on the measure step beyond one indicator, and everything the independent reviewers did not see. Still no independent review after `5f6eaee`.
