# R4: Independent read-only review of the post-R3 delta

- **Commit under review:** `d74342a8935cdfa7bb7b883e3f406c262b414c29` (`git rev-parse HEAD` verified, branch `blackmath88/review-R4`). Delta: `git diff cd8b222..HEAD`, 16 files.
- **Reviewer:** dispatched worker task_d1dcf1b73a07 (Claude Opus 5.5). I wrote neither the code nor the fixes. No tracked file was modified (`git status` clean). All probes and mutations ran in my scratchpad, on a `git archive HEAD` copy.
- **Inputs:** `docs/session/review/R3-focused.md` (MA1, minors 1–10), `docs/session/review/DISPOSITION.md` (the R3 section), and the delta.
- **Method:**
  - Read the whole delta.
  - **Node probe:** map brief (record and DE Markdown) for every drawable layer of all 4 cities.
  - **Headless-Chromium probe** (playwright from `PLAYWRIGHT_DIR`, `/usr/bin/chromium --no-sandbox`) against `scripts/serve.mjs`: loading or inert states, paging, focus, selection and goto.
  - **Mutation runs:** each fix reverted, then `tests/map-brief`, `tests/map` and `tests/city-data` run (baseline 37/37).
  - **Regeneration:** `scripts/facts-doc.mjs` and `scripts/build-basel-profile.mjs` run on the copy and diffed against HEAD.

## Runs (exact)

- `make smoke` → **exit 0**. Every suite reports `fail 0`, with 40 + 28 + 14 + 12 + 13 + 14 + 2 + … tests. The log ends "All consolidated module checks passed."
- `PLAYWRIGHT_DIR=/home/achim/accessibility-observatory-pilot/pr20-7ea6f41/ node scripts/browser-acceptance.mjs` → **32/32 browser checks passed, exit 0**, including the new check "table paging: … stale clicks are ignored while loading".

**Totals (new findings in the delta):** 0 blocker · 1 major · 6 minor

---

## Major

### R4-MA1. If you leave the map step while a layer or city is loading, `#view` stays `inert` and `aria-busy` for every later step
- **Where:** `journey/app.mjs:131` sets `$('view').inert = true` and `aria-busy="true"` whenever a `.mapview` already exists.
  - The flags are reset only at `:137` (successful map render) and `:139` (catch).
  - The early return at `:136` (`if (token !== mapToken || stage.kind!=='map') return;`) does not reset them.
  - `renderInner()` (`:75-107`) writes the other steps into the same `#view`, but it never touches `inert`.
- **Probe:**
  - Berlin snapshots are delayed by 2 s. On `?stage=map&city=basel`, click "Berlin" (`#view.inert === true`, as intended). Within the delay, click step "concept" in the step bar, which is outside `#view` and stays clickable.
  - After 3 s: `view.inert = true` and `aria-busy = true` on the concept step.
  - None of its 8 controls can be focused (`focus()` → false) or clicked, and the whole content is hidden from assistive technology.
  - Going on to "practice" still gives `inert = true`. The content area stays dead until the user returns to the map and a render completes, or reloads the page.
  - Mobile or slow networks make this realistic: the first load of each city's snapshots is a real fetch.
- **Why the tests miss it:** the new browser check only covers the stay-on-map path (`inert` true during the load, false after it).
- **Fix:** in `renderInner()` (or at the top of the non-map branch), reset `view.inert = false; view.removeAttribute('aria-busy')`. Or reset in `renderMap` before the early return whenever `stage.kind !== 'map'`. Add a browser check: delay a city load, change step, assert `#view.inert === false` and that a control in the new step can be focused.

## Minor

1. **Focus is still pulled back after a load, and it drops to `BODY` during the load.** The R3 minor 10 fix asked to skip `restoreFocus` when the user had moved on; this part was not implemented.
   - **Where:** `app.mjs:127`, `:131`, `:138`.
   - **Probe:**
     - Enter on "Berlin" (delayed): right after Enter, `document.activeElement` is `BODY`, because inerting the ancestor blurs the button.
     - The user then moves focus to the "EN" language button. After the load, focus is moved back to the Berlin city button.
   - **Fix:** before `restoreFocus(focusAt)`, skip it unless `document.activeElement` is `body` or inside `#view`.
2. **"Wird geladen …" is announced on every page step, layer toggle and mode switch, even when nothing loads.**
   - **Where:** `:131` runs whenever a `.mapview` exists, so it also runs on cached paging.
   - **Probe:** the `#live` sequence for one "Weiter" press was `["Wird geladen …","Seite 2 von 7"]`. Each press also inerts the view and blurs then re-focuses the button, which a screen reader may re-announce.
   - **Fix:** inert and announce only when `need` contains an id that is not in `geoCache`.
3. **A selected row is not marked when it is picked in the table.** The row mark appears only after the next full re-render.
   - **Where:** `showInspect` (`:142`) refreshes only the inspect panel and the SVG `.sel`.
   - **Probe:** picking row 50 on page 2 gives `tr.sel-row` = none. After a reload the page and mark are correct ("Seite 2 von 7", row 50 marked).
   - **Fix:** in `showInspect`, also move `aria-current` and `.sel-row` to the `tr` of the picked `data-pick`.
4. **The page of a selection made later is not opened.**
   - **Where:** `:128`. The jump applies only while `tablePages[layer] === undefined`.
   - **Probe:** open `sel=…:280` (page 6, correct), page back to 5, switch to map mode, click object 10, switch back to table. The table shows "Seite 5 von 7" and no marked row is visible.
   - **Fix:** record the page whenever `sel` changes (in `pickFeature`), or jump whenever `sel` is not on the current page.
5. **The browser assertion for the page announcement cannot fail.**
   - **Where:** `scripts/browser-acceptance.mjs:205`: `/Seite 7 von 7/.test(live) || /Basel/.test(live)`. The fallback announcement "Basel · Karte" always matches.
   - The announcement itself works (probe: `#live` = "Seite 2 von 7", and "Seite 1 von 7" after Prev).
   - **Fix:** drop the `|| /Basel/` alternative.
6. **Data provenance drift from regenerating the profile.**
   - `scripts/build-basel-profile.mjs:17` sets `retrieved = facts.updated`. Bumping `sponge-facts.json` `updated` to 2026-10-10 therefore re-dated all 7 `repository-statement` sources in `data/cities/basel.json` (lines 49, 72, 102, 125, 148, 171, 217) to `retrieved: 2026-10-10`, although `provenance.refetched_in_this_session` is `false` and none was re-fetched.
   - Only the Engelgasse quote was verified on 2026-10-10.
   - Smaller points:
     - `basel.interventions.engelgasse` keeps `origin: observed` for a 2016 announcement whose completion is "not verified". The other half of R3 minor 9 is not done.
     - The new `status_note_en` in `journey/content/practice.json:51` says 9,046 trees are "inside polygons classed as paved or built". The verification evidence (`data/verification/basel-claims.json:36`) counts `befestigt.*` polygons only, not buildings.
   - **Fix:**
     - Keep each source's own retrieval date: take it from the verification record, or keep 2026-10-03 for sources that were not re-fetched.
     - Set the Engelgasse origin to `announced`/`unknown`, or add a caveat.
     - Say "paved (befestigt)".

### Checked and not a problem
- **MA1 lookup** (`mapbrief.mjs:5-12`):
  - Every layer of all 4 cities now resolves to its own theme row. Boundary and Copenhagen `water` layers carry no cell.
  - Every matrix cell's `layers` list agrees with `THEME_ROW`.
  - No brief cites a foreign cell.
  - Gaps are matched by layer theme or row id, and no shipped gap has a row-only theme.
  - Caveat: the test duplicates `THEME_ROW`, so the `matrixRowFor(...)?.id` assertion is tautological for non-sealing layers. The independent part is the cell-id assertion on `context` and `unresolved_checks`, and that part is what fails under the revert.
- **`pickFeature` city guard** (`:143`): a synthetic click on a Basel polygon during a Berlin load (dispatched directly, bypassing `inert`) is ignored, and the URL keeps no `sel`. Layer ids are city-prefixed, so `split('.')[0]` is sound. Compare-side picks pass.
- **`renderMap` early return on a stale token:** `inert` is cleared by the newer render. The only gap is the step-change path (R4-MA1).
- **Paging with `aria-disabled`:** Enter on the disabled Prev or Next is a no-op, and focus stays on it (probe at both ends). The selector in the existing browser check was updated.
- **Goto heading focus:** from the Berlin inspect "Zur Messgrössen-Matrix" link and the Basel "measure" link, focus lands on `H2#place-title`, and the stage changes. `tabindex=-1` stays on the heading, which is harmless. The `#place-title:focus{outline:none}` rule hides the focus ring on a programmatic target only.
- **Data edits:**
  - The indicator-matrix edits (Basel note and `needs: []`, Berlin sealing `needs: []`, Berlin green-roofs `scale: city-wide`) pass `tests/city-data.test.mjs`. They are consistent with the cells' `basis` and `layers`.
  - `sponge-facts.json` differs from `cf64561e74cc` by exactly 3 lines (`updated` plus the two claims; `git diff --stat` gives 3+/3−, with and without `-w`).
  - Regenerating `docs/SPONGE-FACTS.md` and `data/cities/basel.json` from HEAD sources gives byte-identical output.
  - The Engelgasse `SOURCE_QUOTES` sentence equals the R3-cited release sentence. `quote_basis: source-verbatim`, `quote_lang: de`.
- **Status note rendering:** `views.mjs:80` renders `status_note_*` on the practice card (`data-status-note`). The browser step check for practice passes in DE and EN with no `ß` and no markers.

---

## Per-finding verdicts (R3)

| R3 id | Verdict | Evidence |
|---|---|---|
| **MA1** canopy cell in all null-topic briefs | **Fixed** | Node probe: every layer gets its own row (trees→canopy, heat→heat, green→green-roofs, flood-hazard→pluvial; boundary/water→none). **Mutation:** restoring the old `featured_indicator === measure_topic` lookup → **11 failing tests**. |
| 1 focus lost at first/last page | **Fixed** | `aria-disabled` and a click guard. Probe: focus stays on Next at page 7 and on Prev at page 1. Covered by the new browser check. New side effect: focus blurs to BODY during real loads (R4 minor 1). |
| 2 selected object's page / row mark / link | **Partly fixed** | A shared `sel` link opens the right page with the row marked (probe and browser check). The page after a reload follows `sel`. Not fixed: the row is not marked on pick (R4 minor 3), and a later selection does not move the page (R4 minor 4). |
| 3 page changes not announced | **Fixed** (the test is weak) | Probe: `#live` = "Seite n von m" after each step. It is preceded by a spurious "Wird geladen …" (R4 minor 2). The browser assertion cannot fail (R4 minor 5). |
| 4 matrix cells half-corrected | **Fixed** | `sealing/basel`: note "Computed from the survey classes", `needs: []`. `sealing/berlin`: `needs: []`. `green-roofs/berlin`: `scale: city-wide`. Not pinned by any test: reverting all three still passes 37/37. |
| 5 two tree counts unreconciled | **Fixed (practice card)** | A visible status note names both definitions and points to `basel-claims.json`. Residual: "paved or built" vs. the evidence's `befestigt.*` only (R4 minor 6). The measure step, Data Charter and catalogue still state 9,132 without a cross-reference. The 9,046 computation has no repository script (unchanged). |
| 6 `sponge-facts.json` re-indented / `updated` | **Fixed** | 3 changed lines vs `cf64561e74cc`. `updated` is 2026-10-10. The regenerated `SPONGE-FACTS.md` is identical. Side effect on `basel.json` retrieval dates (R4 minor 6). |
| 7a Markdown indicator guard untested | **Fixed** | **Mutation:** a non-Basel `indicator` in `mapBriefMarkdown` → 2 failures (`berlin.sealing.01`, `zurich.sealing.01`). |
| 7b record `needs.length` guard untested | **Fixed** | **Mutation:** `cell ?` instead of `cell && cell.needs.length ?` → 10 failures. |
| 7c extent pad untested | **Fixed** | **Mutation:** `pad = 0.5` → 1 failure (the new 0.08°-outside fixture). |
| 7d effect cells untested | **Fixed** | **Mutation:** `effect/basel` set to `not_open`/`no` → 1 failure. |
| 8 matrix link focus | **Fixed** (focus). The anchor to the row was not added, which is acceptable. | Probe: focus lands on `H2#place-title`. |
| 9 Engelgasse quote / origin | **Partly fixed** | The quote is now the verbatim German release sentence (`source-verbatim`). `origin: observed` is unchanged. |
| 10 stale view interactive / focus pulled back | **Partly fixed, with a regression** | Stale clicks are blocked (`inert` plus the `pickFeature` guard, probe). There is a loading cue in `#live`. Not fixed: focus is still pulled back (R4 minor 1). **Regression:** `inert` sticks when the step changes during a load (R4-MA1). |

**Count:** 9 fixed (MA1, 1, 3, 4, 5, 6, 7a–d counted as one, 8), 3 partly fixed (2, 9, 10), 0 not fixed. The new findings are 1 major and 6 minor.

## Route limitations (what I could not check)
- Real screen readers (NVDA, VoiceOver), Firefox, Safari and real touch devices. Live-region and blur behaviour was inferred from the DOM in headless Chromium.
- I did not re-fetch any source. The Engelgasse sentence was compared against R3 and the verification record, not against bs.ch. The 9,046 recomputation was not reproduced (no script).
- The browser-suite mutations were not run, so for example I did not revert `aria-disabled` to `disabled` and re-run the new browser check. Only the node suites were mutated.
- The loading regression was reproduced with an artificial 2 s route delay. Its real-world frequency depends on network latency.

## RESULT
- `make smoke`: exit 0, all suites fail 0.
- `node scripts/browser-acceptance.mjs`: **32/32 browser checks passed**, exit 0 (axe resolved and ran). Note: the suite passes despite R4-MA1 because no check changes step during a pending load.
