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

Focused re-review of the changed areas: see `docs/session/review/R3-focused.md` if present; otherwise it is reported as outstanding in the PR.
