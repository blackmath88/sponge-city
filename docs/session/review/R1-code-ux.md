# R1: Independent read-only review (code, boundaries, bilingual, UX/a11y)

- **Commit under review:** `cf64561e74cc73d1ec38667c220ef707673ecf17` (branch `blackmath88/review-R1`; `git rev-parse HEAD`)
- **Reviewer:** dispatched worker task_9c4e0244d103 (Claude Opus 5.5). I did not write this code.
- **Method:**
  - Read every file in scope.
  - Ran `make smoke` (exit 0) and `node scripts/browser-acceptance.mjs`, which reported 30/30 passed.
  - Ran three probes from my scratchpad, without editing any tracked file:
    - a Node probe of `validateLayerPack` and `mapView`;
    - a Node generator for the Berlin and Zürich map briefs;
    - a headless-Chromium probe of focus and selection behaviour.
- **Working tree:** `git status` was still clean after the build. The build regenerates the tracked `site/` byte-identically.

**Totals:** 0 blocker · 4 major · 10 minor

---

## Major

### M1. Keyboard focus is lost on almost every interaction, and the whole view is one live region
- **Where:**
  - `journey/app.mjs:97` (`view.innerHTML = html`)
  - `journey/app.mjs:120,124` (`renderMap` replaces `#view` twice)
  - `journey/app.mjs:49` (`$('steps').innerHTML` on every render)
  - `journey/page.html:22` (`<section id="view" … aria-live="polite">`)
- **Failure scenario (reproduced in headless Chromium):**
  1. A keyboard user focuses the layer checkbox `basel.trees.01` and presses Space. `document.activeElement` becomes `BODY`.
  2. The same happens after Enter on "Tabelle" (`data-map-mode`) and after Enter on a step button.
  3. Each time, the user has to tab again from the top of the page: header, language switch, the 11 steps, then the toolbar.
  4. Because `#view` is `aria-live="polite"`, each re-render also queues the whole new view for announcement: toolbar, legends, layer list and inspect panel. With "Wird geladen …" first, that happens twice per toggle.
- **Fix:**
  - Before re-rendering, remember the focused control by a stable selector (`data-layer-toggle`, `data-map-mode`, `data-map-city`, `data-stage`, `#map-compare`), and restore focus to it afterwards.
  - Better: update only the map panel and legends on a layer toggle.
  - Remove `aria-live` from `#view`. Announce only short status text through a dedicated `role="status"` element, for example "Ebene eingeblendet", the loading state, or the inspect title.

### M2. The "accessible table alternative" holds only the first 25 objects per layer, and the claims overstate it
- **Where:**
  - `journey/mapview.mjs:88` (`features.slice(0, 25)`)
  - `journey/mapview.mjs:13-18`: SVG paths are not focusable, and `svg role="img"` makes them presentational.
  - Claims:
    - `journey/content/ui.json:144/425` `map_aria`: "Dieselben Daten stehen in der Tabellenansicht"
    - `docs/session/LEDGER.md:55`: "every drawn feature is also in an accessible table"
    - `README.md:25`: "an accessible table view"
- **Failure scenario:**
  - The default Basel map draws 1138 sealing polygons and 307 trees. The table offers 53 "Inspect" buttons in total (25 + 25 + 3; counted in the browser probe).
  - Keyboard and screen-reader users cannot select any other object, so they cannot inspect it or export a brief for it.
  - The map itself only supports pan and zoom from the keyboard.
  - The aria-label tells screen-reader users that the same data is in the table, which is false.
- **Fix:** do one of the following, and in either case correct the three texts:
  - Paginate the table, or add a filter, so that every drawn object can be reached.
  - Or keep the cap, and change `map_aria` and the docs to say "first 25 objects per layer; full data in the source file", with a link to the GeoJSON.
- **Also:** the keyboard shortcuts (`+`, `-`, `0`, arrow keys) are not documented anywhere in the UI.

### M3. Basel-specific charter guidance appears in Berlin and Zürich map briefs that state "only {city} sources"
- **Where:**
  - `journey/mapbrief.mjs:6,17,23,49`: `related_indicator`, `next_action` and `actors` come from `journey/content/measurements.json`. That file is the Basel charter: its English `actual`/`ask` text is pinned to `data-charter.json`, and `m_lead` says "was in Basel vorliegt".
  - `journey/mapview.mjs:80`: the `map_to_measure` link.
- **Failure scenario (generated with the real data):**
  - A `berlin.sealing.01` brief lists under "Nächste Schritte": "Rechnen: Bodenbedeckung pro statistischem Block aggregieren…". That is Basel's next step. Berlin already publishes the sealing share per block.
  - The same brief ends with "Diese Notiz enthält nur Quellen aus Berlin".
  - The same happens for `zurich.sealing.01`, where the city's own matrix cell says nothing is outstanding.
  - "Zur Messgrösse →" from a Berlin or Zürich object opens the Basel measurement chain with Basel's status and sources.
  - The risk is latent and grows: `actors` appends `indicator.ask`, which names Basel offices ("Stadtgärtnerei", "Tiefbauamt, AUE"). Today no non-Basel layer carries such a `measure_topic`, but adding one would put Basel authorities into a Zürich brief as the "Zuständige".
- **Why the tests miss it:**
  - `tests/map-brief.test.mjs:23,28` checks for other cities only as lowercase id prefixes (`"basel."`), never as names in prose.
  - It also picks the first non-boundary layer per city. For Zürich that is `heat`, which has no `measure_topic`.
- **Fix:**
  - In `mapBriefRecord` and `mapBriefMarkdown`, include the `measurements` indicator text only when `pack.city === 'basel'`. Otherwise use the city's own matrix cell (`note`, `needs`) and the generic `mb_next_generic`.
  - Label the measure link as "Basel-Messkette" for other cities, or hide it.
  - In the brief test, check against the other cities' display names, and include the `sealing-fraction` layer of every city.

### M4. Several browser and unit checks cannot fail, or do not test what their names claim
- **`scripts/browser-acceptance.mjs:191-195`, "reduced motion is respected (no animation or smooth scroll)":**
  - It asserts only `!/smooth/` on `scroll-behavior`. The computed `animationName` and `transitionDuration` are read but never asserted.
  - `journey/style.css` never sets `scroll-behavior: smooth`. The only `scroll-behavior`, `transition` and `animation` declarations are inside the `prefers-reduced-motion` rule (style.css:59).
  - So the check passes even if that rule is deleted. It cannot fail.
- **`browser-acceptance.mjs:157-181`, "map: city switch, **layer toggle**, … **share link restore**, compare":**
  - No layer is ever toggled.
  - "Share link" is `page.url()`; the `#map-share` button is never pressed.
  - `drawn > 0 || gaps > 0` at line 164 counts `.layers li`, which exists whenever a city has any layer, so that branch cannot fail.
  - `keyboard.press('Tab')` at line 180 is not followed by an assertion.
- **`browser-acceptance.mjs:197-208`, Zürich brief "no other city":**
  - It passes only because the first `[data-f]` in the DOM is the boundary layer, since boundaries are drawn first.
  - Selecting `zurich.sealing.01` would fail `!/basel/i`, because matrix cell `sealing.zurich` reads "Not comparable … with Basel".
  - So the assertion either is mis-specified (that cell note is legitimate) or tests nothing. Decide which, and pin the selected layer explicitly.
- **`browser-acceptance.mjs:242-243`:** the axe check is skipped silently when `axe-core` cannot be resolved. The summary still prints "N/N passed". Count a missing axe-core as a failure, or print "SKIPPED".
- **`tests/journey-bilingual.test.mjs:162`:**
  - `doesNotMatch(html, /\b(ranking|score|best)\b:/i)` requires a trailing colon, so it effectively never fails.
  - The ranking guard in `journey/cities.mjs:72` checks only `text.en`.
- **`tests/journey-bilingual.test.mjs:139-140`:**
  - The "not measured" and "project phrased as city-wide" guards run on English text only.
  - They match one spelling only, so `citywide` slips through.
  - German "nicht gemessen", "stadtweit" and "flächendeckend" are never checked.
- **Fix:** add real assertions:
  - Toggle a checkbox and assert that `data-layer-group` appears or disappears.
  - Assert `transitionDuration === '0s'` on a transitioned element, and add a non-reduced-motion control run.
  - Remove `.layers li` from the gap check.
  - Make the regex guards bilingual.

---

## Minor

1. **A gap with `state: 'not_checked'` crashes the map, and the map step has no error path.**
   - `journey/map.mjs:55` allows a `not_checked` gap without `checked[]`, but `journey/mapview.mjs:57` calls `g.checked.map`.
   - Probe: `validateLayerPack` returned `[]`, then `mapView` threw "Cannot read properties of undefined (reading 'map')".
   - `renderMap` (`app.mjs:118-126`) has no try/catch, so the step stays on "Wird geladen …" with an unhandled rejection.
   - No shipped pack triggers this today.
   - Fix: use `(g.checked ?? [])` and wrap `renderMap` in try/catch that shows the localized `map_layer_failed`.
2. **English layer metadata appears in the German map UI and briefs, but is not on the declared legacy list.**
   - `docs/BILINGUAL-JOURNEY.md` declares only layer `method`, property names and values, and source titles.
   - Shown untranslated in DE (`mapview.mjs:54,72-74,85`; `mapbrief.mjs:41-42`):
     - `temporal`, for example "Biotope mapping state 2020; Open Data record dated …"
     - `unit`, for example "% sealed share of block area"
     - `spatial_scale`
     - Berlin `coverage`, which is DE and EN concatenated with " / ".
   - Fix: make these fields `{de,en}`, or add them to the declared list.
3. **A selection in compare panel B is lost on the shared link.**
   - `map.mjs:83` accepts `sel` only for primary-city layers.
   - Probe: clicking a Berlin object in compare mode wrote `sel=berlin.boundary.01:0`. After reload the inspect panel was empty.
   - Fix: also accept `knownB` ids, or write `sel2`.
4. **`map_compare_note` (`ui.json:185/466`) understates the rule.** It names method, unit and scale. `comparableLayers` (`map.mjs:165`) also requires origin and reference date, which matches what `docs/BILINGUAL-JOURNEY.md` says. Add "Herkunft und Datenstand" / "origin and reference date".
5. **The measure view derives the evidence class from access status.**
   - `views.mjs:104` with `clsOf` at `:83`: `open` produces the chip "Beobachtet (gemessen oder erhoben)".
   - Access is not evidence class. An openly published modelled or regulatory dataset would be shown as observed.
   - Today's 8 indicators are probably fine (land cover, rainfall). However, `tests/journey-bilingual.test.mjs:124` asserts this mapping, so the behaviour is locked in.
   - Fix: take the class from charter data, not from the access status.
6. **The brief lists `(nichts offen)` under "Offene Prüfungen".** `mapbrief.mjs:46`: for example, the `sealing.zurich` row reads "… (nichts offen)" inside the unresolved-checks section. Omit cells with empty `needs`, or move them to a separate context line.
7. **The fatal-error state shows an English message in the German UI.** `app.mjs:177` writes `error.message` ("Could not load content/…") into the place panel while the rest of the UI is German. Show a localized message, and keep the path in the console.
8. **The map blocks page scrolling on phones.** `style.css:41` sets `.mapsvg{touch-action:none; max-height:70vh}` at full width. On a 390 px phone, a vertical swipe that starts on the map pans the map instead of scrolling the page. Use `touch-action: pan-y` and pan only on a two-finger gesture, or after the map is activated.
9. **Weak city-extent guard.** The guard in `map.mjs:42-44` uses a fixed ±0.5° pad, about 35–55 km. It catches another city's data, as intended, but would accept a neighbouring municipality's data under the city's label. A tighter pad, or a check against the city's boundary layer, would strengthen it.
10. **PR-facing docs are stale or overstated.**
    - `docs/session/LEDGER.md:49-50` still lists Z2 and L as "running", although `d195e44` integrated them. The C row says "in progress".
    - `docs/BILINGUAL-JOURNEY.md:3` says "nine steps", but the table and `modules.json` have 11.
    - The "Browser coverage" paragraph claims reduced-motion and map-interaction coverage that M4 shows is not really tested.
    - `README.md:25` and `LEDGER.md:55` overstate the table (see M2).

---

## Verified OK (what I actually checked)
- **Build and tests:**
  - `make smoke` passes: all node suites, `validate-atlas` and the module checks.
  - `make build` reproduces the committed `site/` with no diff.
  - The browser suite passes 30/30 with no page errors. That is not proof of the behaviours listed under M4.
- **City isolation of geometry (real data):**
  - `tests/city-data.test.mjs:21-35` runs `validateLayerPack` with the real GeoJSON keyed by `layer.file`, so the extent check runs on every shipped snapshot.
  - Id prefixes must match the folder, as must `pack.city`.
  - A cross-city shared-coordinate check exists.
  - The SVG panels draw only their own pack's layers (`mapview.mjs:25`). The geo cache is keyed by city-prefixed ids. `parseMapState` drops layers and selections that are unknown or foreign to the city.
- **Evidence classes:**
  - Layer `origin` is restricted to observed, derived, modelled and assumed, and is shown on every legend, layer row, inspect panel and brief.
  - A test rejects modelled methods labelled observed.
  - Unknown legend values render grey as "Andere Klasse", not as a match.
  - `no_public_evidence_found` requires `origin: unknown`. Its UI label is "Öffentlich nichts gefunden (heisst nicht: nicht gemessen)". No profile or matrix text claims "not measured" for a search gap; the hits I found all say "das heisst nicht, dass nicht gemessen wird".
- **Comparison:**
  - City measures require quantity, unit, method, scale and **period**, all non-empty (`cities.mjs:14`).
  - Map layers require theme, unit, method, scale, origin and temporal.
  - The Basel/Berlin sealing pair is reported not comparable, with reasons.
  - I found no ranking or score in the matrix, profiles or map. Legend colours are stated to be per-layer only.
- **Screening boundary:** `map_screening` appears in every inspect panel and brief. `site-verification` is always an unresolved check. The brief status is `requires-investigation`, and the boundaries include "cannot clear an authority gate". Investigation exports carry `engineering_recommendation: false`.
- **Synthetic Street Lab:**
  - `exportJson` and `exportMarkdown` contain no Street Lab parameters; a test greps for synthetic markers.
  - The Street Lab handoff carries `classification: 'illustrative'` and no geometry.
  - Street Lab edits stay per place (browser check).
- **Project examples:** in the profiles, project-scope entries carry explicit "kein stadtweites Ergebnis" / "not a city-wide result" wording in both languages. I spot-checked the Berlin and Zürich entries.
- **Bilingual content:**
  - `ui.json` has 279/279 keys with parity, no empty values and no ß. Identical DE/EN values are only legitimate cognates (Status, Zoom, Situation).
  - No "du"/"dein" forms; «Sie» is used consistently in the strings I read.
  - Every dynamic key family resolves for the real data: matrix `ex_`/`ac_`/`dv_`/`need_`/`cls_`, profile `sc_`/`st_`, layer `theme_`/`cls_`, charter `status_`, practice `ev_`, verification `ver_`/`ct_`.
  - `fill_` is read only for indicators with a proxy, and those all have a fill status.
  - Source titles, quotations (`<blockquote lang=…>`) and stable ids are passed through untranslated.
- **Language state:** the order is `?lang`, then `localStorage`, then `de`. Unknown values fall back to `de`. `<html lang>` is set, and `lang` travels to embedded modules (unit and browser tests).
- **Escaping:** every interpolated data string in `views.mjs`, `mapview.mjs` and `startview.mjs` goes through `esc()`. The only `innerHTML` written from `ui()` is `data-i18n` static text, which comes from the repository's own dictionary.
- **Accessibility basics present:**
  - skip link
  - `:focus-visible` outlines, including on `.mapsvg`
  - 44 px zoom buttons with aria-labels
  - `aria-pressed` on toggles
  - a `role="alert"` layer-failure message
  - `role="status"` on the share note
  - a reduced-motion CSS rule
  - no horizontal overflow at 390 px (browser check)
  - axe reports no serious or critical violations on the native steps
