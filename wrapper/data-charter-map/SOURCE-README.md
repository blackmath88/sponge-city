# Sponge City Data Charter

What data a city needs for sponge-city planning and evaluation (the north star), what Basel publishes, and what we infer meanwhile.

- Charter (single source): `data/data-charter.json`, readable in [docs/DATA-CHARTER.md](docs/DATA-CHARTER.md)
- Map snapshot: `data/charter-map.json`, refreshed by `fetch.mjs` (`make fetch`)
- Live layers: geo.bs.ch WMS («Quelle: Geodaten Kanton Basel-Stadt»), BAFU overland flow (geo.admin.ch), swisstopo base map

Evidence rule on the map and in the data: **real** (published by an authority, as published; filled markers, solid layers) · **official model** (an authority's own model, published) · **≈ inferred** (derived by us; hollow rings, method always shown) · **missing** (amber hatch over the canton). Real and inferred values never share a field.
