# Independent recomputation: Zürich sealing share (zurich.context.05)

Pinned repo commit d74342a8935cdfa7bb7b883e3f406c262b414c29 (read-only; nothing in the checkout was modified).
Retrieved 2026-10-10. Author's script `scripts/maps/zurich.mjs` and its numbers were NOT used.

## Verdict: REPRODUCED
| claim | recomputed | |
|---|---|---|
| sealed 28.6 % | 28.5874 % (28.59) | ok |
| partly sealed 4.7 % | 4.6629 % (4.66) | ok |
| unknown 1.1 % | 1.1313 % (1.13) | ok |
| unsealed (not claimed) | 65.6183 % | |
| mapped area 91.79 km2 | 91.7929 km2 | ok |
| 96,178 polygons, 11 without geometry | 96,178 features, 11 null geometry | ok |
| city total 91.88 km2 | 9188.1 ha = 91.881 km2 (BEV580OD5803, "Gesamte Stadt", FlaecheT, 2020) | ok |

## 1. Source and pin
- The Open Data bulk links (GPKG format=10005 etc. at stadt-zuerich.ch/geodaten/download/...) return an HTML page (HTTP 200, text/html, 42 kB), not a file. So the WFS was used.
- WFS 1.1.0, typename `btk_2020`, `outputFormat=GeoJSON`, `srsName=EPSG:2056`, `sortBy=objectid`, startIndex/maxFeatures=5000, 2 s pause between requests.
- Requests: 20 data pages (HTTP 200 each; 19 x 5000 + 1178 = 96,178 features) plus 3 probe requests (hits count = 96178, 2-feature sample, capabilities) and 1 failed probe with WFS 2.0.0 parameters (service returned an HTML error page). About 25 requests, under the 50 limit.
- Per-request URL, status, feature count, bytes, sha256: `src/download_log.json`. sha256 of the concatenated 20 pages: `b9a068d83a0e4807ce917ef43a5f725c500ce4b36551fe90019baa7c404d8746`. Pages are in `src/pages/p00..p19.json`; objectid is unique 1..96178, so paging with sortBy lost or duplicated nothing.
- Official area: `src/official/BEV580OD5803.csv`, sha256 7fa53af7...e20a7.

## 2. Method
Toolchain: Python 3, shapely 2.2.0 (GEOS), numpy; installed into a venv in this folder (not installed system-wide).
- Method A: shapely polygon area (GEOS), per feature.
- Method B: exact signed ring areas with Python `Decimal` (50 digits) on the coordinates as published (outer ring minus holes), no floats.
- Cross-check: they agree to 2.2e-7 m2 per feature at most, so the area arithmetic is not an issue.
- Scripts: `download.py`, `analyze.py` (all metrics, ~12 min CPU, needs ~5 GB RAM), `phase2.py` (forest/water exclusion, cross-tab). Raw output: `results_raw.json`, `results_shares.json`.

## 3. Results
Features 96,178; null/empty geometry 11 (objectid 46521, 51938, 57512, 62423, 63717, 64575, 71205, 71577, 73835, 89762, 90565; of these 10 are `versiegelt`, 1 `teilweise`, so they are in the polygon counts but contribute 0 area). All other 96,167 are MultiPolygon, 18,811 interior rings (holes), 0 invalid geometries (GEOS `is_valid`).

| VERSIEGELUNG | features | area m2 (exact) | km2 | share |
|---|---|---|---|---|
| unversiegelt | 45,882 | 60,232,940.385 | 60.233 | 65.62 % |
| teilweise (value is spelled `teilweise`) | 10,383 | 4,280,249.753 | 4.280 | 4.66 % |
| versiegelt | 39,412 | 26,241,230.293 | 26.241 | 28.59 % |
| unbekannt | 501 | 1,038,482.368 | 1.038 | 1.13 % |
| null | 0 | 0 | 0 | 0 |
| total | 96,178 | 91,792,902.799 | 91.793 | 100 % |

No feature has a null VERSIEGELUNG; the class only holds the four values.

Forest and water identified by the biotope-type attribute `lrtyp1code`/`lrtyp1text`: 01 "Wälder" (21.405 km2) and 04 "Gewässer" (5.192 km2). Both are 100 % `unversiegelt`.

| basis | area km2 | versiegelt | teilweise | unbekannt | unversiegelt |
|---|---|---|---|---|---|
| all polygons | 91.793 | 28.59 | 4.66 | 1.13 | 65.62 |
| excl. forest (01) and water (04) | 65.196 | 40.25 | 6.57 | 1.59 | 51.59 |
| excl. forest only | 70.388 | 37.28 | 6.08 | 1.48 | 55.16 |

Where the classes sit (crosstab, `results_shares.json`): `versiegelt` is almost entirely in type 13 "Gebäude-, Verkehrs- und Industrieflächen" (26.241 of 26.241 km2; 13 total 30.505 km2). Type 12 "Siedlungen" (22.489 km2) has no `versiegelt` at all: 21.406 km2 unversiegelt, 1.083 km2 teilweise. Types 01, 02, 04, 05, 08, 09, 10, 11 are 100 % unversiegelt.

## 4. Traps
- CRS / axis order: coordinates are (E,N) = x 2,676,224 to 2,689,666, y 1,241,584 to 1,254,306. That is LV95 (EPSG:2056), the GeoJSON `crs` member says urn:ogc:def:crs:EPSG::2056, and the first-vertex values are plausible for Zürich (E ~2.68 M, N ~1.25 M). The GeoJSON's top-level `bbox` is in WGS84 degrees, which is only a header inconsistency. Planar areas in LV95 carry a small scale distortion (LV95 is conformal; at Zürich the factor is within a few ppm, so well below 0.01 %) and don't affect the rounding.
- Overlaps / duplicates: 0 duplicate geometries. 182 feature pairs overlap by more than 1e-3 m2, total overlap 4.82 m2. Sum of areas minus union area = 4.89 m2 (5e-8 of the area). Negligible; a union-based total would be 91,792,897.9 m2.
- Holes: handled (outer ring minus interior rings) in both methods. In addition, the union of all polygons has 71 parts and 2,699 holes of 222,903 m2 (0.223 km2): gaps in the mapping, mostly small enclaves.
- Coverage vs city: mapped 91.793 km2 vs official 91.881 km2 (2020 value; 91.881 in all years except 91.891 in 2019) = 0.088 km2 (0.1 %) less. So the map covers the city to within 0.1 %, not "exactly". I could not clip to the true municipal boundary (not offered here), so I cannot say whether part of the 0.088 gap is offset by polygons outside the border; the 0.223 km2 of internal holes suggest the mapped extent reaches slightly beyond some edges or the official figure is on another geometry basis. Effect on shares: at most ~0.1 pp.
- 'teilweise' added or not: the headline 28.6 is `versiegelt` only. Adding teilweise gives 33.25 % (all) or 46.82 % (excl. forest/water), so the entry's wording (4.7 % "reported separately") is right and it does not silently add them.
- Rounding: 28.5874 -> 28.6 (28.59 at 2 decimals); 4.6629 -> 4.7 (4.66); 1.1313 -> 1.1 (1.13); 91.7929 -> 91.79 and "rund 91,8". All consistent with the entry.
- Not checked: the 11 null-geometry features cannot add area as they have none (10 are versiegelt, so the true sealed area is slightly higher than 28.59 %; unknowable).

## 5. Is "sealed share of the city" defensible?
Partly, with care. The attribute is the publisher's classification of the biotope type ("Beeinträchtigung der natürlichen Bodenfunktion des Biotoptyps"), a categorical label per mapped polygon at ~+/-10 m accuracy, not a measured imperviousness. The data show it behaves like a land-cover class: all sealed area is in type 13 (buildings, traffic, industry) and none in "Siedlungen" (gardens, green space, which can include sealed paths and surfaces, mapped as unversiegelt or teilweise). Hence 28.6 % is "area mapped as sealed biotope type", which is a lower bound for physical sealing if partly sealed areas contain sealed surface (the 4.7 % and parts of type 12). The entry wording "By our computation ... 28.6 percent of the mapped city area ... is sealed ... (attribute Versiegelung)" with the "not an official statistic" caveat, the forest/water denominator note, and the separate partly-sealed share is defensible. Calling it "sealed share of the city" without these qualifiers would overstate precision. The denominator includes forest and water (26.6 km2, 29 %), so the share of the built-up/non-forest, non-water area is 40.25 % (46.8 % with teilweise). Recommend the entry state the 40.25 % figure or keep the denominator caveat prominent whenever it is compared with other cities.
