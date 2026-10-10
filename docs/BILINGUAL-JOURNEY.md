# Bilingual learning-and-decision journey

German (default) and English. One path through nine steps in the Decision Canvas (`journey/`):

| # | Step | Kind | What it does | Source of content |
|---|------|------|--------------|-------------------|
| 01 | Start / Einstieg | native | Three doors into the same journey: a city, a question, an intervention | `journey/startview.mjs` |
| 02 | Understand / Verstehen | native | Five mechanisms × three situations, a schematic street section that highlights where a mechanism acts, linked interventions and the evidence that would show it | `journey/content/concept.json` |
| 03 | From practice / Aus der Praxis | native | Twelve sourced cases by scope; verification verdict, claim type and implementation status per case | `journey/content/practice.json`, `data/verification/basel-claims.json(.de.json)` |
| 04 | Measure / Messen | native | Eight indicators as a six-step chain (question → needed evidence → available evidence → defensible analysis → potential action → later monitoring), other cities, map links | `journey/content/measurements.json`, `data/indicator-matrix.json` |
| 05 | Evidence / Datenlage | embedded | Data Charter map (25 indicators, layers, gap research), Basel | `wrapper/data-charter-map/` |
| 06 | Compare cities / Städte vergleichen | native | Four profiles, six dimensions, measure pairs (comparable or not, with reasons), seven common indicators × four cities | `data/cities/*.json`, `data/indicator-matrix.json` |
| 07 | Map / Karte | native | City-aware map of licensed snapshots, side-by-side comparison, inspect, table view, share link, brief export | `data/maps/<city>/` |
| 08 | Inspect a place / Ort ansehen | embedded | Street X-Ray for Kanonengasse (computed) or Klybeck (illustrative) | `wrapper/street-xray/` |
| 09 | Observe / Beobachten | embedded | Rain Walk, device-local, per-place storage | `wrapper/street-workspace/public/rain-walk/` |
| 10 | Explore / Erkunden | embedded | Street Lab on a **synthetic** street; the place is context only; edits survive a language switch (sessionStorage per place, marked synthetic) | `wrapper/street-workspace/` |
| 11 | Next investigation / Nächste Untersuchung | native | Unresolved gates, gatekeepers, next actions; JSON and Markdown export (Basel place) | `journey/export.mjs` |

The map also exports an investigation brief for one selected object (`journey/mapbrief.mjs`): city, language, source identities and licences, evidence class, unresolved checks (always including site verification), responsible actors, next actions. A brief cannot clear an authority gate.

## Language contract

Shareable state: `?stage=…&lang=…&place=…` for the journey, plus `city`, `layers`, `compare`, `layers2`, `sel` (layer:index) and `mapview=table` for the map. Active language = `?lang=de|en`, else `localStorage['sponge.lang']`, else `de`. The journey sets `<html lang>`, persists the choice, appends `lang` to every embedded module URL and posts `{type:'sponge-lang', lang}` to the frame on a live switch. The frame is not reloaded by a language change (identity ignores `lang`); only an exception is Street Lab, whose `site=` handoff text is localized and therefore reloads, with its edits restored from sessionStorage. Stable machine IDs, source titles, URLs and original quotations are never translated. German uses Swiss spelling (`ss`, never `ß`). A missing translation renders as a visible `[de:key]`/`[en?]` marker, and the checks fail on it.

## Evidence classes

Observed, derived, modelled, assumed and unknown stay distinct everywhere. A gap in public evidence is `no_public_evidence_found`, never "not measured". A measure is *comparable* across cities only when quantity, unit, method, spatial scale and period match exactly; layers likewise on theme, unit, method, scale, origin and reference date (`journey/cities.mjs`).

## Adding things

- **A string:** add the key to both languages in `journey/content/ui.json`. The checks fail if only one exists or if a view uses an undefined key.
- **A featured indicator:** add an entry to `journey/content/measurements.json`. Its English `desirable`/`actual`/`proxy`/`ask` text must equal the Data Charter text (a check enforces this), so the translation can never silently drift from the source.
- **A city:** write `data/cities/<id>.json` following [CITY-PROFILE.md](CITY-PROFILE.md). Every `found` entry needs a source URL, retrieval date and verbatim quote. `make smoke` validates it. See [CITY-SELECTION.md](CITY-SELECTION.md) for the rubric.
- **The Basel profile** is generated: `node scripts/build-basel-profile.mjs` (and `--check`).

## Consolidation record (PR #2, #3, #4, #5)

- **Foundation:** PR #4 head `3aeca87`. Pinned because `make smoke` passes there; PR #5's head fails smoke in its own Weavr mission test (expects five tasks, the plan now has `sponge-v2-R`). That mismatch is inside the gated V2 Mission and was not repaired.
- **PR #2 (Sponge Street explainer)** and **PR #3 (adaptive interface)**: already migrated into #4 by path (`wrapper/prototypes/sponge-street/`, `adaptive-interface/`), not by Git ancestry. Nothing further was merged. No second engine was added: the adaptive state engine remains the learning model linked from the references; Street Lab remains the water-learning model.
- **PR #5:** used for architectural guidance only (Charter → Gap → Place → Action; Stage 2/3 field names). Its files are not part of this branch.
- **Reused:** Data Charter and atlas data, sponge facts, catalogue vocabulary, Street X-Ray profiles, Rain Walk, Street Lab, connected case, the Decision Canvas shell.
- **Deferred:** a real PlaceProvider for a surveyed segment; Andy's Tellplatz adapter; observation import with independent verification; the Weavr-governed delivery of V2 stages. Archives and Andy's attribution (`contributions/andy/`, `archive/`) are untouched.

## Untranslated legacy surfaces (outside the delivered journey, or residual)

Reported honestly; none blocks the journey:
- **Linked references, English only:** Evidence atlas, situation map, intervention catalogue page (`catalogue.html`), adaptive state-engine demo, solutions hub. The reference links are labelled "(Englisch)" in German.
- **Residual English inside translated surfaces:** machine enumerations such as access states (`site-check-required`, `operator-held`) in the place export; measure-definition terms in city profiles (labelled "source terms"); source titles, dataset names, tree species, station names, WFS typenames and layer `method` text; property names and values in the map inspector (raw source fields); the raw JSON panel and thrown engine errors in Street Lab; observation notes typed by users; `docs/` research documents. Verification evidence is translated for the Basel claims; evidence for city profile quotes stays in the source language by design.
- **Source-language limits:** Danish (Copenhagen) and German (Berlin, Zürich) quotations stay verbatim.
- **Register:** the shell, Rain Walk and Street Lab now address the reader with «Sie».
- **Browser coverage:** `make browser` drives headless Chromium: both languages on every step, live DE→EN→DE inside all four embedded modules (no reload), place and observation survival, Street Lab edit survival, map interactions and failure state, exports, keyboard, reduced motion, axe contrast, mobile overflow. Not tested: Safari/Firefox, real touch devices, screen readers.

