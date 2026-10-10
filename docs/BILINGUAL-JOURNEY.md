# Bilingual learning-and-decision journey

German (default) and English. One path through nine steps in the Decision Canvas (`journey/`):

| # | Step | Kind | What it does | Source of content |
|---|------|------|--------------|-------------------|
| 01 | Understand / Verstehen | native | Five mechanisms (retention, infiltration, storage, evaporation, shade) × three situations (heavy rain, heat, dry period), each linked to interventions and the evidence that would show it | `journey/content/concept.json` |
| 02 | From practice / Aus der Praxis | native | Twelve sourced cases, filterable by scope (city-wide, programme, single project, study from another setting) | `journey/content/practice.json` → `data/sponge-facts.json` |
| 03 | Measure / Messen | native | Eight featured indicators: question, why, desirable measurement, accepted proxy, what exists in Basel, what it supports, what it cannot establish, next action, later monitoring | `journey/content/measurements.json` → Data Charter |
| 04 | Evidence / Datenlage | embedded | Data Charter map (25 indicators, layers, gap research) | `wrapper/data-charter-map/` |
| 05 | Compare cities / Städte vergleichen | native | Basel, Berlin, Copenhagen across six dimensions; measure pairs flagged comparable or not | `data/cities/*.json` |
| 06 | Inspect a place / Ort ansehen | embedded | Street X-Ray for Kanonengasse (computed) or Klybeck (illustrative) | `wrapper/street-xray/` |
| 07 | Observe / Beobachten | embedded | Rain Walk, device-local, per-place storage | `wrapper/street-workspace/public/rain-walk/` |
| 08 | Explore / Erkunden | embedded | Street Lab on a **synthetic** street; the place is context only | `wrapper/street-workspace/` |
| 09 | Next investigation / Nächste Untersuchung | native | Unresolved gates with gatekeepers and next actions; JSON and readable Markdown export | `journey/export.mjs` |

## Language contract

Active language = `?lang=de|en`, else `localStorage['sponge.lang']`, else `de`. The journey sets `<html lang>`, persists the choice, appends `lang` to every embedded module URL and posts `{type:'sponge-lang', lang}` to the frame on a live switch. Stable machine IDs, source titles, URLs and original quotations are never translated. German uses Swiss spelling (`ss`, never `ß`). A missing translation renders as a visible `[de:key]`/`[en?]` marker, and the checks fail on it.

## Evidence classes

Observed, derived, modelled, assumed and unknown stay distinct everywhere. A gap in public evidence is `no_public_evidence_found`, never "not measured". A measure is *comparable* across cities only when quantity, unit, method and spatial scale match exactly (`journey/cities.mjs`).

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
