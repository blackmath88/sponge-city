# City map layers (`sponge-city-layers/1`)

One folder per city: `data/maps/<city>/layers.json` plus bounded GeoJSON snapshots `data/maps/<city>/<layer-id>.geojson`. The map reads only these files; city-specific endpoints stay in the fetch scripts and in `source_url`. A layer is never shown under another city's label.

```jsonc
{
  "schema_version": "sponge-city-layers/1",
  "city": "zurich",
  "extent": {"bbox": [west, south, east, north], "source": "where the bbox comes from (e.g. official boundary dataset url)"},
  "layers": [{
    "id": "zurich.sealing.01",                      // stable, prefixed with the city id
    "theme": "sealing|green|trees|heat|flood-hazard|water|monitoring|boundary|other",
    "title": {"de": "…", "en": "…"},
    "kind": "geojson-snapshot|raster-service",       // raster-service = live tiles; needs "tiles" url template, shown with a failure state
    "file": "zurich.sealing.01.geojson",            // snapshot only; ≤ 400 KB, WGS84 lon/lat, simplified, minimal properties
    "tiles": null,
    "origin": "observed|derived|modelled|assumed",
    "method": "how the data were produced (source wording)",
    "unit": "…", "spatial_scale": "…", "temporal": "reference year / date of the data",
    "retrieved": "YYYY-MM-DD", "coverage": "what area/part of the city is covered",
    "publisher": "…", "licence": "…", "licence_url": "https://…", "source_url": "https://…", "attribution": "text to display",
    "limitations": {"de": "…", "en": "…"},          // screening, not site verified etc.
    "legend": {"type": "categorical|sequential|single", "items": [{"value": "…", "label": {"de":"…","en":"…"}, "color": "#rrggbb"}]},
    "properties_shown": ["property names that the click-inspect shows"],
    "measure_topic": "sealing|…|null"              // links to a measurement indicator in journey/content/measurements.json
  }],
  "gaps": [{"theme": "heat", "reason": {"de":"…","en":"…"}, "checked": ["urls tried, with outcome"]}]
}
```

Rules
- Only layers whose data you actually fetched and whose licence you read. Record the licence text/URL; if the licence is unclear, do not include the geometry — record a gap.
- Never invent geometry from narrative text. Never reuse another city's data. Simplify on the way in (script in `scripts/maps/`); keep the original coordinates' meaning.
- `origin` is what the publisher says (modelled hazard ≠ observed). Colour classes follow the publisher's classes where they exist; do not imply two cities' colours are equal measurements.
- A source that is blocked, unlicensed or too large is a `gaps` entry with the URL and outcome, not a failure of the whole city.
- German uses Swiss spelling (ss, never ß).
