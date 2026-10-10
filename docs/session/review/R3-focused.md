# R3: Focused independent re-review of the R1/R2 fixes (read-only)

- **Commit under review:** `cd8b222161409d3a122a00017d95d8aaf112c076` (`git rev-parse HEAD`, branch `blackmath88/review-R3`). The delta is `cf64561e74cc..HEAD`: 29 files.
- **Reviewer:** dispatched worker task_881b9c3d85ee (Claude Opus 5.5). I wrote neither the code nor the fixes. No tracked file was modified, and `git status` was clean after the runs.
- **Inputs:** `docs/session/review/R1-code-ux.md`, `R2-evidence.md`, `DISPOSITION.md`, and the delta.
- **Method:**
  - Read the whole code and data delta.
  - **Mutation runs.** I made a `git archive HEAD` copy in my scratchpad and copied the gitignored `site/assets` into it. Each fix was then reverted one at a time, and the node test suites were run against each revert (baseline 62/62 pass).
  - **Headless-Chromium probe:** paging, cross-page selection, compare-panel share link, and focus after city, language and compare changes.
  - **Node probe:** map briefs for the non-sealing layers of all cities.
  - **Re-fetched sources (curl, 2026-10-10):** the two new `zurich.measurement.04` quotes and the added `berlin.context.02` quote.
- **Runs:**
  - `make smoke`: **exit 0**. All suites pass, including the consolidated module checks.
  - `PLAYWRIGHT_DIR=/home/achim/accessibility-observatory-pilot/pr20-7ea6f41/ node scripts/browser-acceptance.mjs`: **31/31 browser checks passed**, exit 0. axe-core resolved and ran.

**Totals:** 0 blocker · 1 major · 10 minor

---

## Major

### MA1. Every map brief for a layer without a `measure_topic` carries the *canopy* matrix cell of that city
- **Where:** `journey/mapbrief.mjs:8` and `:32`: `row = matrix.indicators.find(i => i.featured_indicator === layer.measure_topic)`.
- **The bug:**
  - `measure_topic` is `null` on every layer except the three sealing layers.
  - In `data/indicator-matrix.json`, `featured_indicator` is `null` for canopy, heat, pluvial and green-roofs.
  - `null === null`, so `find` returns the first such row: **canopy**.
  - The gap filter at `:10` and `:35` (`g.theme === row.id`) would also pull a city's canopy gaps into unrelated briefs. This is latent: no shipped pack has a gap with theme `canopy`.
- **Failure scenario (generated with the shipped data; probe output):**
  - A `zurich.heat.01` brief (DE) has a section "Stand der Daten (nichts offen)" that reads "`canopy.zurich`: Kronenfläche per Laserscan alle vier Jahre; Rückgang seit 2014 berichtet." That cell is unrelated to a heat-planning layer.
  - `berlin.heat.01` → `unresolved_checks` includes `canopy.berlin` (needs: request).
  - `copenhagen.cloudburst-basins.01` → unresolved `canopy.copenhagen`.
  - `basel.trees.01` → context `canopy` (here it happens to be roughly right).
  - Every boundary layer brief also gets the canopy cell.
  - The bug predates the delta (the lookup is unchanged). However, the M3 fix added a "Stand der Daten" section, which now shows the wrong cell as context, and `DISPOSITION.md` M3 claims "other cities use their own matrix cell".
- **Why the tests miss it:** `tests/map-brief.test.mjs` never checks that the cell id in `context` or `unresolved_checks` belongs to the layer's own theme.
  - In my mutation run, the faithful revert of the "(nichts offen)" fix failed only on *boundary/trees/heat* layers. That is how this showed up.
- **Fix:**
  - `const row = layer.measure_topic ? matrix.indicators.find(i => i.featured_indicator === layer.measure_topic) : matrix.indicators.find(i => i.id === THEME_TO_ROW[layer.theme]) ?? null;`. Map trees→canopy, heat→heat, pluvial→pluvial, green→green-roofs, boundary→none. Apply the same change in both functions; better, compute it once in a helper.
  - Add a test: for every layer, every `${row}.${city}` id in the brief must be the row of the layer's theme, and boundary layers must carry no matrix cell.

## Minor

1. **Focus is lost when paging reaches the first or last page.**
   - **Where:** `journey/app.mjs:71` (`restoreFocus`) together with `journey/mapview.mjs:93` (the `disabled` attribute on Prev/Next).
   - **Probe:** Basel trees, 307 rows over 7 pages. With keyboard focus on "Weiter", Enter keeps focus on pages 2–6. After the step to page 7 the button is `disabled`, `focus()` is a no-op, and `document.activeElement` is `BODY`. The same happens with "Zurück" on reaching page 1.
   - **Fix:** if the restored target is disabled, focus the sibling nav button. Or use `aria-disabled="true"` and ignore the click, instead of `disabled`.
2. **A selected object on another page is not shown in the table, and the page is not part of the link.**
   - **Probe:**
     - `…&layers=basel.trees.01&sel=basel.trees.01:280&mapview=table` opens on "Seite 1 von 7". The inspect panel shows the object, but its row is not visible, and no row is marked as selected anywhere in the table.
     - Picking row 120 on page 3 and reloading the shared URL comes back on page 1.
   - **Fix:** when `sel` is set, open the page that contains it (`floor(index/50)`). Mark the row with `aria-current`/`.sel`.
3. **Page changes are not announced.**
   - `announce()` (`app.mjs:134`) always says "‹Stadt› · Karte". The per-table `role="status"` span (`mapview.mjs:93`) is re-created on each render, so screen readers do not announce the new "Seite n von m".
   - **Fix:** announce the page text through `#live` after a paging action.
4. **Matrix cells only half-corrected.**
   - `sealing/basel` now has `basis: observed`, but its note still begins "Derived from the cadastral land cover". `needs: ['site_visit']` is still unexplained (R2 m7).
   - `sealing/berlin` is now `open`/`derivable: yes` with a note saying the licence is stated, but `needs` is still `['request']`. So the Berlin sealing brief lists it under "Offene Prüfungen … (Daten anfragen)" with nothing to request.
   - `green-roofs/berlin` still has `scale: programme` although it cites the 2020 city-wide inventory layer (R2 m6, second half).
   - **Fix:** align the notes and needs, and set the scale to city-wide (inventory) or split the cell.
5. **Two numbers for the same street trees, without reconciliation.**
   - The corrected practice card, fact and Basel profile say **9,046 (≈72 %) in sealed polygons**, citing a recomputation from the verification run. No repository script reproduces it, yet the evidence class is `basel-data` ("computed by us").
   - The measure step (`journey/content/measurements.json:241-242`), the Data Charter and the catalogue still say **9,132 "without a mapped planted polygon"**. The catalogue (`wrapper/sponge-catalogue/data/catalogue.json:472`) explicitly adds "This does not mean sealed paving and does not reveal pit size".
   - The practice claim still infers pit size ("probably too small to be mapped"). Both figures are correct under their own definitions, but a reader of steps 03 and 04 sees 72 % / 9,046 against 9,132 with no explanation.
   - **Fix:** add one sentence that names the two definitions, and point to `data/verification/basel-claims.json` as the source of 9,046. Or add the computation script.
6. **`data/sponge-facts.json` was re-indented.** 688 changed lines for 2 real changes (`git diff -w --stat` shows 2 lines). `"updated"` still reads `2026-10-03` although two claims changed on 2026-10-10.
   - **Fix:** keep the original indentation, and bump `updated`.
7. **Test gaps: these reverts all passed the full suite.**
   - (a) Reverting only the Markdown-side `indicator` guard (`mapbrief.mjs:34`). Basel's sealing `next_action` would then appear in Berlin and Zürich Markdown briefs. The test checks only names and the JSON record.
   - (b) Reverting the JSON record's `cell.needs.length` guard (`mapbrief.mjs:22`). A resolved cell would come back into `unresolved_checks`.
   - (c) Restoring the ±0.5° extent pad (R1 m9).
   - (d) Restoring the effect-row `not_open/no` cells (R2 M2).
   - **Fix:** assert the generic next step for non-Basel Markdown. Assert that no record `unresolved_checks` entry has a cell with empty `needs`. Add a fixture coordinate about 0.1° outside the bbox. Optionally add a matrix rule: `exists: unknown|no_public_evidence_found` ⇒ `access ≠ not_open` unless an entry shows closure.
8. **The new non-Basel "Zur Messgrössen-Matrix der Städte" link** (`mapview.mjs:80`) opens the generic matrix step, not the city or indicator. Focus then lands on `BODY` (probe). This is acceptable, but a focus target (the step heading) and an anchor for the row would help keyboard users.
9. **`basel.interventions.engelgasse`** (`data/cities/basel.json:179-197`) is now worded correctly, but has two problems:
   - It keeps `origin: observed` for what is a 2016 announcement.
   - Its only `quote` is the repository's own sentence (`quote_basis: repository-statement`). The release sentence is already recorded in the verification evidence: «Zum Abschluss der Bauarbeiten wird die Stadtgärtnerei in den fünfzig neuen und grosszügigen Baumrabatten je einen Jungbaum anpflanzen.»
   - **Fix:** use that sentence as the source quote, and reconsider the origin.

10. **The stale map view stays interactive during a reload, and focus is pulled back afterwards.**
    - **Where:** `journey/app.mjs:127-134`. `focusAt` is captured before the `await` and restored after it. The old `.mapview` is kept (the M1 change) with no loading or busy cue, and its handlers still change `mapState`.
    - **Probe:** Berlin snapshots were delayed by 2.5 s. I pressed Enter on "Berlin" and, while the Basel map was still shown, clicked a Basel sealing polygon, then tabbed to "Zürich".
      - Result: URL `?city=berlin&layers=berlin.boundary.01,berlin.sealing.01&sel=basel.sealing.01:0`.
      - After the load, the Berlin map sits next to a Basel inspect panel (`selRecord()` reads the live `mapState`).
      - Focus was moved back from "Zürich" to "Berlin".
      - After a reload, the selection is silently dropped.
      - The exported brief stays Basel-isolated, because it uses the selection's own city.
    - **Fix:**
      - Mark the old view `inert` and `aria-busy="true"` while loading, and show the loading text in `#live`.
      - Skip `restoreFocus` if `document.activeElement` changed since `focusAt` was taken.
      - Ignore `pickFeature` when the layer's city is neither `mapState.city` nor `mapState.compare`.

### Checked and not a problem
- **`renderMap` try/catch** (`app.mjs:135`). `loadGeo` already swallows fetch errors (`app.mjs:117`), so the catch is reached only by a synchronous `mapView` throw after the `stage.kind==='map'` and token guard. It therefore cannot overwrite another step's view. The token check prevents stale renders.
  - Side effect: while a reload is pending, the old map stays visible and interactive with no busy state. The token guards the render only, not the stale handlers (see minor 10).
- **`focusKey` selectors** with special characters:
  - Stale elements: see minor 10. Ids go through `CSS.escape`. Attribute values escape `"` but not `\`. No shipped id or data value contains a backslash or newline, so this is fine in practice.
  - Focus was restored correctly after the layer toggle, mode, step, city button, language button and compare select (probe and browser check).
  - `preventScroll: true`; `scrollY` stayed constant over 10 paging steps.
  - One edge case: a focused `<svg>` has only `data-fit/-w/-h`, which change on a city switch. No re-render is triggered from the svg, so the impact is nil.
- **Paging logic:**
  - Clamping works (unit test, and the mutation fails).
  - `data-pick` uses the global index across pages, so picks are correct on every page.
  - The `split(/:(-?\d+)$/)` parse works for ids that contain dots.
  - `tablePages` is keyed by city-prefixed layer ids, so it is safe in compare mode.
- **Compare-panel `sel`:** the probe clicked a Berlin object with Zürich primary and reloaded the link. The inspect panel was restored, the object was highlighted, and the brief was `city: berlin` with no Zürich mention.
- **`views.mjs` measure chain:**
  - Open → chip `open`, partial → chip `partial`, both with "Evidenzklasse je Datensatz: siehe Quelle". Missing/restricted → `unknown`.
  - `.chip.open` is styled. Reverting `clsOf`, or restoring the old chip code, fails the bilingual test.
- **Data edits:**
  - No `ß` in any added non-quote text.
  - The Swiss spelling in the new DE strings is consistent (vergrössern, grösseren, Massstab).
  - The new Zürich bbox equals the shipped boundary snapshot bounds, `8.44802 47.32022 8.62545 47.43467`, to the snapshot's precision.
  - Matrix references all resolve, and `tests/city-data.test.mjs` passes.
  - `berlin.context.01`: the new parenthetical ("about a third each is buildings, unbuilt sealed area and streets") is supported verbatim by its existing quote.
- **Quote re-fetches** (all HTTP 200, 2026-10-10):
  - `zurich.measurement.04` / stadt-zuerich.ch 201203a: "Das wissenschaftliche Monitoring der Massnahmen wird durch die Zürcher Hochschule für Angewandte Wissenschaften (ZHAW) bis 2024 sichergestellt." **verbatim**.
  - `zurich.measurement.04` / zhaw.ch/de/forschung/projekt/72564: "Projektstatus abgeschlossen, 06/2020 - 07/2025" **verbatim** (whitespace-normalised). The page lists no publications, only an SRF item, so "no public evaluation found" still holds.
  - `berlin.context.02` added fragment: "Insgesamt werden durch das Trennentwässerungssystem rund 48 Mio. m³ Regenwasser pro Jahr in die Gewässer eingeleitet." **verbatim**.
  - The "0,5 Mio. m³ Schmutzwasser" figure added to the text is on the page ("ca. 5,5 Mio. m³ Regenwasser und 0,5 Mio. m³ Schmutzwasser pro Jahr unbehandelt").
- **Claims in `README.md` and `docs/BILINGUAL-JOURNEY.md`:**
  - "31 checks" = 31 result lines, and the run prints 31/31. There are 20 `check(` call sites; the loops expand them to 31.
  - "eleven steps" is gone from the stale spot.
  - The legacy list now declares `method`, `unit`, `spatial_scale`, `temporal` and `coverage` (line 48).
  - **"Every object is listed in the table view"** (`map_keys` and `map_aria`; `LEDGER.md:57` "every drawn feature is also in an accessible table") is **true for the objects of switched-on layers**, via paging. Objects of layers that are off are not listed, which matches "drawn". It is accurate, subject to minors 1–2.

---

## Verified fixed (per finding id)

The disposition is "Fixed" unless noted. The **Proof** column says how I checked it: a failing mutation, a probe, a re-fetch, or code reading.

### R1

| Id | Verdict | Proof |
|---|---|---|
| M1 focus / live region | **Fixed** (edges: minors 1 and 10) | Browser check plus my probe. `#view` has no `aria-live`; `#live` is `role=status`. |
| M2 table cap | **Fixed** (edges: minors 2–3) | Mutation PAGE=25 or no clamp fails the `map.test` paging test. The probe reached all 7 pages / 307 rows. `map_aria` and `map_keys` corrected. |
| M3 Basel guidance in other briefs | **Fixed for the Basel charter text**: JSON-record revert fails `berlin.sealing.01` and `zurich.sealing.01`; names are checked; the inspect link is Basel-only (mutation fails). **Not fully fixed:** see MA1 (the wrong cell for non-sealing layers) and minor 7a (the Markdown-side guard is untested). | Mutations and node probe. |
| M4 checks that cannot fail | **Fixed** | A real toggle, share button and paging are present. Reduced motion asserts the rule plus a `0s` transition with a control run. axe missing → failure. The DE/EN ranking, "stadtweit" and "nicht gemessen" guards each fail on an injected violation (mutations). |
| m1 `checked` crash | **Fixed** | `?? []` mutation fails the new test. The try/catch was reviewed (see above). |
| m2 English layer metadata | **Declared, not translated** (as disposed) | `BILINGUAL-JOURNEY.md:48` |
| m3 compare `sel` | **Fixed** | Unit mutation fails; browser probe restores the selection. |
| m4 compare note | **Fixed** | `ui.json` DE/EN now name origin and data date. |
| m5 access ≠ evidence class | **Fixed** | Two mutations fail the test. |
| m6 "(nichts offen)" | **Fixed** in Markdown (faithful revert fails). The JSON-record guard is untested (minor 7b). Note: for non-sealing layers the context shown is the wrong cell (MA1). | Mutations. |
| m7 English fatal error | **Fixed** | `app.mjs:188-189` |
| m8 touch scroll | **Changed as disposed**. Not tested on a real touch device. With `pan-y pinch-zoom`, a pinch zooms the page, not the map, and one-finger horizontal pan of the map is gone; the buttons remain. | Code reading. |
| m9 extent guard | **Fixed in code, untested** (minor 7c) | `map.mjs:42` |
| m10 stale docs | **Fixed** | 31/31 matches the docs. |

### R2

| Id | Verdict | Proof |
|---|---|---|
| M1 Engelgasse | **Fixed** in `sponge-facts.json`, `practice.json`, `basel.json`, `SPONGE-FACTS.md` and the verification record (which keeps `claim_text_checked`). The provenance-pin test fails if `practice.json` drifts (mutation). Residual: minor 9. | Mutation and reading. |
| M1 sealed-trees | **Fixed** (9,046 / ≈72 %, median removed, causal clause softened to "probably"). Residual: minor 5. | Reading. |
| M2 effect cells | **Fixed**: all four are now `access: unknown`, `derivable: unknown`. Not pinned by a test (minor 7d). | Reading and mutation. |
| M3 sewer/zurich | **Fixed** (`not_open`) | Reading. |
| m1 Berlin 48 Mio / 0.5 Mio | **Fixed**; quote re-fetched verbatim. | Re-fetch. |
| m2 `zurich.measurement.04` sources | **Fixed**; both quotes re-fetched verbatim. | Re-fetch. |
| m3 canopy/zurich | **Fixed** (`derivable: unknown`) | Reading. |
| m4 heat/zurich | **Fixed** (`partial`, plus a note on the discontinuation) | Reading. |
| m5 sealing/berlin | **Fixed** (open, licence named). Residual: `needs: request` (minor 4). | Reading. |
| m6 green-roofs/berlin | **Partly fixed**: basis `derived`, note split. `scale: programme` remains (minor 4). | Reading. |
| m7 sealing/basel | **Partly fixed**: basis observed, but the note still says "Derived"; needs unexplained (minor 4). | Reading. |
| m8 pluvial/copenhagen | **Fixed** (layer dropped, note explicit) | Reading. |
| m9 sewer/copenhagen | **Fixed** (cites `copenhagen.transfer.01`). pluvial/basel **deferred** as disposed. | Reading. |
| m10 green-roofs/zurich | **Fixed** (basis unknown) | Reading. |
| m11 Zürich bbox | **Fixed**: equals the boundary snapshot bounds. | Computation. |
| m12 flood-report period | **Fixed** (DE/EN note) | Reading. |
| m13 974/976, m14 "Andet tagkonstruktion" | **Fixed** (limitations DE/EN) | Reading. |
| `berlin.context.01` parenthetical, `berlin.measurement.01` "32,000" | **Fixed**: the new wording is supported by the existing quote; "32,000" is removed. | Reading. |
| m15, m16 | **Deferred** (as disposed) | n/a |

## What I did not check
- Real touch devices, Safari/Firefox and screen readers. Live-region behaviour was inferred from the DOM only.
- The 9,046 recomputation itself (taken from the verification record).
- Sources other than the three re-fetched ones.
- The `.mapsvg` reduced-motion styles beyond what the browser check covers.
