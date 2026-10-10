# City evidence profile (`sponge-city-profile/1`)

A reusable, source-pinned profile of how a city does sponge-city work. One file per city in `data/cities/<id>.json`. Basel is built from repository evidence; comparators from primary sources.

```jsonc
{
  "schema_version": "sponge-city-profile/1",
  "id": "berlin", "role": "home|comparator",
  "name": {"de": "Berlin", "en": "Berlin"}, "country": "DE",
  "selection": {"rationale": {"de": "…", "en": "…"}, "contrast": {"de": "…", "en": "…"}},
  "entries": [ Entry, … ]
}
```

Entry:
```jsonc
{
  "id": "berlin.measurement.01",              // stable machine id, never translated
  "dimension": "context|interventions|measurement|access|outcomes|transfer",
  "text": {"de": "…", "en": "…"},             // one claim, ≤ 2 sentences
  "origin": "observed|modelled|derived|assumed|unknown",
  "scope": "project|programme|city-wide|unspecified",
  "evidence_state": "found|no_public_evidence_found|unknown",
  "measure": null | {                          // only for quantitative/measured claims
    "quantity": "…", "unit": "…", "method": "…", "spatial_scale": "…", "period": "…"
  },
  "sources": [{"title": "original title", "url": "https://…", "publisher": "…",
               "retrieved": "2026-10-10", "quote": "verbatim, original language", "quote_lang": "de|en|da"}]
}
```

Rules
- `no_public_evidence_found` ≠ not measured. Never write "not measured" unless a source says so; then use `origin:"observed"` with that source.
- `evidence_state:"found"` requires ≥1 source with url, retrieved date and a verbatim quote. `unknown` entries have no invented text beyond the question being open.
- `scope:"project"` examples must not be phrased as city-wide results.
- Two `measure` blocks are comparable only if quantity, unit, method and spatial_scale all match exactly; otherwise rendered "not comparable".
- Plain-text only in `text`; German uses Swiss spelling (ss, never ß). Keep source titles and quotes in the original language.
- No scores, rankings or invented figures.
