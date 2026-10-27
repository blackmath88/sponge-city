# R6: Focused read-only re-review of the post-R4 delta

- **Commit under review:** `5f6eaee5415288f02b53dfc3a92c1f674fd00712`, checked with `git rev-parse HEAD`. Branch `blackmath88/review-R6`.
- **Delta:** `git diff d74342a..HEAD`, 6 files:
  - `journey/app.mjs`
  - `scripts/browser-acceptance.mjs`
  - `scripts/build-basel-profile.mjs`
  - `data/cities/basel.json`
  - `journey/content/practice.json`
  - `docs/session/review/R4-post-r3.md`
- **Reviewer:** dispatched worker task_39dfb8070464 (Claude Opus 5.5). This is a read-only review: no tracked file was modified (`git status` is clean). Probes ran from the scratchpad.
- **Input:** `docs/session/review/R4-post-r3.md`, which holds R4-MA1 and minors 1–6.
- **Method:**
  - Read the whole delta.
  - **Headless-Chromium probe:** playwright from `PLAYWRIGHT_DIR`, `/usr/bin/chromium --no-sandbox`, run against `scripts/serve.mjs`. It sets `page.route` delays (1.5–2.5 s), aborts, and HTTP 500 responses on city geojson. A MutationObserver on `#live` records every announcement.
  - **Regeneration:** ran `scripts/build-basel-profile.mjs` on a `git archive HEAD` copy and diffed the output against HEAD.

## Runs (exact)
- **`make smoke`:** exit 0. 11 suites (40 + 28 + 14 + 12 + 13 + 14 + 2 + 18 + 5 + 7 + 4 = 157 tests), each with `fail 0`. The log ends "All consolidated module checks passed."
- **`PLAYWRIGHT_DIR=/home/achim/accessibility-observatory-pilot/pr20-7ea6f41/ node scripts/browser-acceptance.mjs`:** **32/32 browser checks passed**, exit 0. This includes the extended "table paging … stale clicks are ignored while loading" check, which now also covers the step change during a load, respected focus and the row mark on pick.
- **Profile regeneration** from HEAD sources produces a `data/cities/basel.json` that is **byte-identical** to the committed file.

**Totals:** 0 blocker · 0 major · 4 minor (2 of them test or brittleness nits)

---

## Major
None.

## Minor

1. **Engelgasse `origin` is still `observed`.** This is the remainder of R4 minor 6 and R3 minor 9.
   - **Where:** `data/cities/basel.json:185`, generated from `scripts/build-basel-profile.mjs`.
   - The text already carries the caveat "In 2016 Basel announced … Completion is not verified".
   - The structured field still says `observed`, so any consumer that filters on `origin` will treat an unverified announcement as an observation.
   - The schema already uses `unknown` (15 entries), so `unknown` would fit.
2. **The retrieval dates are hard-coded literals, not derived from the evidence.**
   - **Where:** `scripts/build-basel-profile.mjs:17-18`. Line 17 sets `const retrieved = '2026-10-03'`. Line 18 forces `retrieved: '2026-10-10'` for every `SOURCE_QUOTES` entry.
   - The values are correct today. Against `503a66e`, the only `basel.json` difference is Engelgasse (text, quote, `retrieved: 2026-10-10`). All 7 repository statements and `provenance.snapshot` are back to 2026-10-03.
   - The risk is future drift: a later verified quote would be stamped 2026-10-10 whatever its real date. `provenance.snapshot` is now also tied to this literal.
   - **Fix:** take the date from `data/verification/basel-claims.json`, or store it in each `SOURCE_QUOTES` entry.
3. **Focus still drops to `BODY` while a real load is pending.** This is the residual of R4 minor 1, part 1.
   - **Where:** `journey/app.mjs:135`. Setting `inert` on `#view` blurs the focused button.
   - **Probe:** Enter on a delayed "Berlin" button leaves `activeElement` = `BODY` during the load. When the user stays put, focus correctly returns to the Berlin button afterwards.
   - The part R4 asked to fix (do not pull focus back when the user has moved on) is fixed.
   - The blur is inherent to the `inert` approach. It is acceptable, but a screen-reader user gets no focus anchor for 1–2 s.
   - **Optional:** move focus to the `#view` container (`tabindex=-1`) or to the status line before inerting.
4. **Tests and defensive code (nit):**
   - **(a)** No browser check pins R4 minor 2 (no "Wird geladen …" on cached paging) or R4 minor 4 (a later selection opens its page). Both work in the probe, but reverting either fix would still pass 32/32.
   - **(b)** The `catch` at `journey/app.mjs:141` clears `inert` and `aria-busy` before its `token === mapToken` test. A stale render that threw would un-inert the view during a newer pending load.
     - I found this unreachable today: `loadGeo` swallows fetch errors, and `mapView` runs only for the current token.
     - **Fix:** move the reset inside the token guard.

### Regression hunt: checked and not a problem
- **`inert` and `aria-busy` lifecycle in `journey/app.mjs` (lines 76, 135, 139, 141), on every path:**
  - **Step change during a load (R4-MA1 repro):**
    - On the concept step after the load: `inert=false`, no `aria-busy`. All 8 controls can be focused.
    - The practice step that follows is also clean.
  - **Leave the map and come back while the old load is pending:** the view shows the loading text without `inert`. The stale token returns, then Berlin renders, ending with `inert=false`.
  - **Language switch during a load:** `renderInner` resets the flags. The new `renderMap` re-inerts them (Berlin is still uncached) and clears them on completion.
  - **Stale tokens:** a newer render clears the flags. The early return at `:137` cannot leave them set: on a step change `renderInner` cleared them, and on the map step the current token clears them.
  - **Errors** (geojson aborted, HTTP 500): `loadGeo` caches `null`. The map renders with the per-layer error notice `.maperror` ("Ebene konnte nicht geladen werden: …"), `inert=false` and no `aria-busy`. The failed layer counts as cached, so later paging does not loop "loading".
  - **Layer kinds:** all 18 layers are `geojson-snapshot`, so the `!geoCache.has(id)` test cannot stay true forever for a layer kind that is never cached.
- **Focus-restore condition** (`:140`, `!a || a===body || view.contains(a)`):
  - When the user stays, focus returns to the Berlin button.
  - When focus moved to the EN button during the load, it stays there.
  - After a step change, focus stays on the step button.
  - Cached paging (Enter on "Weiter"): focus stays on "Weiter" across two presses.
- **Loading cue only when loading:**
  - Cached paging gives `#live` = `["Seite 2 von 7"]`, then `"Seite 3 von 7"`. There is no "Wird geladen …" and `inert` is never set.
  - On a real load, "Wird geladen …" comes first, then "Berlin · Karte".
- **`showInspect` row marking** (`:144`):
  - Picking row 50 on page 2 gives exactly one `tr.sel-row[aria-current=true]` (row 50).
  - Re-picking row 51 moves the mark: only row 51's `TR` carries `aria-current`. The other `aria-current` elements are the step buttons with `="step"`, which is unaffected.
  - The `[data-pick]` selector matches only table buttons, so `closest('tr')` is sound.
- **Table page follows the selection in `pickFeature`** (`:145`):
  - Open `sel=…:280` → "Seite 6 von 7". Page back → page 5. Switch to the map and pick object 10 (SVG click) → URL `sel=basel.trees.01:10`.
  - Back in the table: "Seite 1 von 7" with row 10 marked.
  - The page is set only after the city guard, so a stale pick does not alter it.
- **`journey/content/practice.json:52-53`:** the EN text "paved (befestigt)" and the DE text "Flächen der Klasse befestigt" now match the evidence (`basel-claims.json:36`: "9,046 trees … in befestigt.* polygons").
- **`scripts/browser-acceptance.mjs:205`:** the assertion now requires `/Seite 7 von 7/` with no `|| /Basel/` fallback, so it can fail.

---

## Per-finding verdicts (R4)

| R4 id | Verdict | Evidence |
|---|---|---|
| **MA1** `#view` stays inert and `aria-busy` after a step change during a load | **Fixed** | `app.mjs:76` resets the flags in `renderInner`. Probe with Berlin delayed 2 s, then a click on "concept": `inert=false`, no `aria-busy`, 8/8 controls focusable, and the practice step is clean. A new browser check covers it (Zürich delayed 1.5 s, step change, then the flags and focus are asserted). Return-to-map, language-switch and abort/500 paths are also clean. |
| 1 focus pulled back after a load / BODY during the load | **Fixed** (pull-back). The BODY residual remains (minor 3). | Probe: focus moved to EN during the load stays on EN. When the user stays, focus returns to Berlin. A browser check was added. `activeElement` is still `BODY` during the load. |
| 2 "Wird geladen …" on every page step | **Fixed** | `app.mjs:135` gates on an uncached id. Probe: `#live` = "Seite 2 von 7", then "Seite 3 von 7", with no loading cue and no `inert`. No test pins it (minor 4a). |
| 3 row not marked on pick | **Fixed** | `app.mjs:144`. Probe: row 50 is marked at once, and a re-pick moves the mark to 51. A browser check was added. |
| 4 later selection does not open its page | **Fixed** | `app.mjs:145`. Probe: the page goes 6 → 5, then a map pick of object 10 makes the table show "Seite 1 von 7" with row 10 marked. No test pins it (minor 4a). |
| 5 page-announcement assertion cannot fail | **Fixed** | `browser-acceptance.mjs:205`: `/Basel/` fallback removed; the check passes. |
| 6 provenance drift (dates / Engelgasse origin / "paved or built") | **Partly fixed** | Fixed: the 7 repository-statement dates and `provenance.snapshot` are back to 2026-10-03, Engelgasse alone carries 2026-10-10, regeneration is byte-identical, and the wording is "paved (befestigt)" in EN and DE. Not fixed: Engelgasse `origin: observed` (minor 1). The dates are literals (minor 2). |

**Count:** 6 fixed (MA1, 1, 2, 3, 4, 5), 1 partly fixed (6), 0 not fixed. The new findings are 0 blocker, 0 major and 4 minor.

## Route limitations
- Only headless Chromium. I did not test real screen readers (NVDA, VoiceOver), Firefox, Safari or touch devices. Live-region and blur behaviour is inferred from the DOM and the `#live` MutationObserver.
- Loading was simulated with artificial `page.route` delays (1.5–2.5 s), aborts and HTTP 500 responses. Real network timing and partial responses were not exercised.
- I did not run mutation testing on the browser suite. The "no test pins it" statements are from reading the code, not from reverting the fixes.
- I did not re-fetch any source. The 2026-10-03 and 2026-10-10 dates were checked against git history (`503a66e`) and the code comment, not against bs.ch.
- The probe and `browser-acceptance.mjs` ran concurrently on different ports. Both passed.

## RESULT
- `make smoke`: exit 0, 157 tests, fail 0.
- `node scripts/browser-acceptance.mjs`: 32/32 checks passed, exit 0.
- R4: 6 of 7 fixed, 1 partly fixed.
- New findings: 0 blocker, 0 major, 4 minor.
