# Open data and APIs for the Sponge City / Adaptive Interface

Status: research, 3 October 2026. Every dataset id, endpoint, field and licence below was checked by a live API call on that date unless marked *unverified*. Design principles for using these sources stay in [`adaptive-interface/DATA.md`](../adaptive-interface/DATA.md); this file is the verified catalogue behind it.

North-star charter and Basel scorecard: [DATA-CHARTER.md](DATA-CHARTER.md). How to fill the gaps listed below (deduce, detect, synthesise, measure, ask), with three pilots on live data: [GAP-FILLING.md](GAP-FILLING.md).

## Summary

- **Four Basel-Stadt access points carry almost everything:** the open-data portal **data.bs.ch** (364 datasets, Opendatasoft API), the geoportal's **WMS / WFS** (1,976 WMS layers, 592 WFS feature types), a **STAC download API** (98 collections) and the **geodata shop** for heavy rasters.
- **Federal sources** (geo.admin.ch, swisstopo, BAFU, MeteoSwiss) fill in terrain, 3D buildings, overland flow and weather. opendata.swiss mostly mirrors these, plus other cantons.
- **The single most useful find is Basel's own sponge suitability layer**, *Schwammstadt-Eignung nach Tagesverkehr* (`SETV`). It rates 6,519 street segments as *geeignet* (suitable), *Eignung zu prüfen* (to be checked) or *nicht geeignet* (not suitable), from modelled 2023 daily traffic. It is downloadable and CC BY 4.0.
- **The cadastral land cover** (`100477`, *Bodenbedeckung*) already separates sidewalk, road, traffic island, tram area, building, garden and water. That is close to a one-to-one source for PlaceModel element types and surfaces.
- **Not open, so these stay `unknown` in the PlaceModel:**
  - the sewer / drainage network and the general drainage plan (GEP, *Generelle Entwässerungsplanung*);
  - underground utilities;
  - on-street parking bay geometry;
  - soil permeability;
  - tree pit sizes;
  - roof load capacity.

  This matches the state engine's honest-unknown design: these keys need a data partner, not an inference.

## How to call each source

| Source | Pattern (tested) | Notes |
|---|---|---|
| data.bs.ch | `GET https://data.bs.ch/api/explore/v2.1/catalog/datasets/{id}/records?where=within_distance(geo_point_2d, geom'POINT(7.5741 47.5735)', 50m)&limit=100` | Opendatasoft Explore v2.1: `select`, `group_by` and spatial `where` work. Bulk: `/exports/{geojson,csv,parquet,fgb,shp,…}`. Catalogue: `/catalog/datasets?limit=100&offset=…` |
| Basel WMS | `https://wms.geo.bs.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=…&QUERY_LAYERS=…&CRS=EPSG:2056&BBOX=…&INFO_FORMAT=application/json` | Point queries return attributes for vector layers (e.g. `SETV`, `FGSK`). Raster layers (climate analysis) return no values |
| Basel WFS | `https://wfs.geo.bs.ch/?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ms:{Type}&BBOX=…&OUTPUTFORMAT=geojson` | Type names are `ms:`-prefixed (e.g. `ms:AK_KatasterDerBelastetenStandorte`) |
| Basel STAC | `https://api.geo.bs.ch/stac/v1/collections` · `https://api.geo.bs.ch/stac/v1/download/{ID}/latest/{gpkg,geojson,csv,shp,fgb,gdb}` | Returns a zip; CRS84 GeoJSON inside. CC-BY-4.0 |
| Basel geodata shop | `http://shop.geo.bs.ch/` | Terrain/surface models, orthophotos and other heavy products not in STAC |
| geo.admin.ch | STAC `https://data.geo.admin.ch/api/stac/v0.9/collections/{id}/items` · search `https://api3.geo.admin.ch/rest/services/api/SearchServer?type=layers&searchText=…` | 513 federal collections. The STAC metadata says "proprietary", but federal geodata is free under the OGD terms with attribution (*verify per product before shipping*) |
| opendata.swiss | `https://ckan.opendata.swiss/api/3/action/package_search?q=…` | `opendata.swiss/api/…` answers 403 to curl's default user agent and redirects to `ckan.opendata.swiss` for browser agents |
| OpenStreetMap | Overpass API | *Unverified*: Overpass did not respond from this session (connection reset / timeout) |

## Sources by PlaceModel need

### Elements and surfaces (the base scene)

| Need | Source | Id / endpoint | What is there | Fit |
|---|---|---|---|---|
| Building, sidewalk, road, tram, traffic island, garden, water polygons | Cadastral land cover (Grundbuch- und Vermessungsamt) | data.bs.ch `100477`; WFS `ms:BS_Bodenbedeckungen_*`; STAC `AVBE` | 49,595 polygons; field `bodenbedeckungsart`, e.g. `befestigt.Trottoir` 2,579, `befestigt.Strasse_Weg` 2,166, `befestigt.Verkehrsinsel` 928, `befestigt.Bahn.Tramareal` 30, `Gebaeude.Gebaeude` 30,008, `humusiert.Gartenanlage.*`, `Gewaesser.*`. Updated 2026-08-20. CC BY 4.0 | **Primary.** Map to PlaceModel types and surface classes (`befestigt` → sealed, `humusiert`/`bestockt` → planted) as `observed` |
| Parcel and public/private boundary | Parcels; public-realm (Allmend) parcels | `100201` (24,427, `egrid`, `grundstuecksart`); WFS `ms:OR_OeffentlicherRaum_Allmend`, `ms:OG_Allmendparzellen_*` | Daily updates | `context.ownership`, governance path |
| Street segments | Strassen und Wege | `100250`; STAC `STWE` | 7,553 segments: hierarchy, category, speed, regime, **owner** | Street type / owner per segment |
| Parking | On-street parking counts | `100329` (Amt für Mobilität) | 7,817 records with **counts but no geometry**: street, `anzahl_parkfelder`, type (Blue zone 19,952 spaces, paid 2,119, …) | `parking.count` as `derived` per street; the bay geometry is a gap |
| Parking (special) | Parkierung | STAC `PRKG` | Points only: disabled, charging, taxi, park-and-ride (P+R), car parks, coaches | Constraints (an accessible bay cannot simply go) |
| Building attributes | Federal building register (GWR); building addresses | `100230` (`egid`, year built, area, class); `100259` | Daily | Building age/type for the roof context |

### Trees and canopy

| Need | Source | Id | Content | Fit |
|---|---|---|---|---|
| Trees | Tree cadastre (Stadtgärtnerei, Riehen) | `100052` | 32,378 points: species, age, planting year, protection status, street. Daily | `tree` elements, `observed`. **No pit size**, so `vegetation.pit` stays unknown (as the model already assumes) |
| Felling / replacement | Fäll- und Baumersatzliste | `100054` | Protected trees to be felled and replaced within 6 months, with reason | Timing windows for a tree pit or trench |
| Canopy | Tree canopy cover (LiDAR) | `100357` | GeoTIFF/PNG for 2012, 2021, 2024 (`data-bs.ch/stata/stadtgaertnerei/baumkronenbedeckung/…`) | Canopy for shade, kept separate from tree points |
| Invasive species | Invasive neophytes | `100043` | 6,982 records | Planting constraints (minor) |

### Context keys the intervention requirements read

| `context.*` key | Best open source | Status |
|---|---|---|
| `groundwater_protection_zone` | Groundwater protection zones `100292` (S1/S2/S3 `typ`) and protection areas `100291`; STAC `GWSK` | **Available.** Intersect with the selection: rain gardens are excluded in S1/S2 |
| `infiltration_capacity` | No permeability map. Screening proxies: soil map soil depth `ms:BD_Bodenkarte_Gruendigkeit*` (WFS); groundwater level `100164` (~80 stations, hourly) and 10-year statistics `100180`; highest-groundwater contours `ms:GN_IsohypseHoechsthochwasser`; borehole register `100182` / STAC `BOHA`; federal hydrogeology `ch.bafu.hydrogeologische-karte_100` | **Partial**: screening evidence, never `observed` capacity |
| contamination (proposed new key) | Contaminated sites register `ms:AK_KatasterDerBelastetenStandorte` (WFS; site type, status, link to the register extract) | **Available.** Strong exclusion signal for infiltration; not yet a context key in our model |
| `utilities` | Survey pipelines `AVRO` / `ms:BS_Rohrleitungen_Rohrleitung` (large pipelines only), IWB district-heating area `IWBF` | **Not open** at street scale; stays `unknown` |
| `slope` | Basel DTM 2024 25 cm (WMS hillshade, data via shop), DTM 2012 2 m grid; contours 1 m `ms:HK_Nebenhoehenlinien`; swissALTI3D 0.5 m (STAC `ch.swisstopo.swissalti3d`) | **Available**, needs processing |
| `ownership` | Parcels `100201` and public-realm parcels | **Available** |
| `roof_load_capacity` | none | **Not open.** Proxies only: GWR building year/class, swissBUILDINGS3D 3.0 (STAC) |
| `road_runoff_quality` | Traffic: `SETV` DTV classes, average daily traffic `100199`, counts `100006` | **Proxy** (traffic load) |
| traffic suitability (proposed new key) | **`SETV`** sponge suitability by traffic | **Available.** Could gate street interventions: `nicht geeignet` → excluded, `Eignung zu prüfen` → requires investigation |

### Routing (where water goes)

| Need | Source | Status |
|---|---|---|
| Sewer network, gullies, downpipes | Not found on data.bs.ch, WMS/WFS, STAC or opendata.swiss. Only the wastewater-plant catchment `100336` (13 polygons) | **Gap.** Ask Tiefbauamt / Amt für Umwelt und Energie (GEP). Routing stays `unknown` or demo-`assumed`, as built |
| Overland flow | BAFU overland-flow hazard map (*Gefährdungskarte Oberflächenabfluss*), Basel-Stadt item `gefaehrdungskarte-oberflaechenabfluss_bs` (gdb.zip) via federal STAC | **Available**; modelled, nationally simplified, "without verification in the field": screening only |
| Culverted streams | Gewässernetz `100261`, culverts (*Eindolungen*) `100262` | Available (context) |
| River flood hazard | Hazard map *Prozess Wasser* and HQ30/100/300 intensities (WFS `ms:NG_*`, levels like `mittel`); BAFU warning levels `100244` | Available (context) |

### Roofs

| Need | Source | Fit |
|---|---|---|
| Roof per building | Solar register `100382` (34,955 roofs: potentials per building) and roof edges `100383` | Roof inventory; the potentials are model values, not roof type |
| Roof shape | swissBUILDINGS3D 3.0 Beta (STAC `ch.swisstopo.swissbuildings3d_3_0`) | Flat vs pitched, to screen for green roofs (*verify the attributes*) |
| Heritage constraint | Heritage-preservation roof survey (WMS/WFS `ms:HD_*`); listed-buildings inventory `ISWB`; protected townscapes `ISOS`; monument register `DMVS` | Can exclude a green roof or roof garden |

### Heat and climate context

| Need | Source | Fit |
|---|---|---|
| Urban climate analysis | WMS `KL_HumanbioklimaSituation` (PET), `KL_Waermeinseleffekt` (UHI, K), `KL_Lufttemperatur`, `KL_Kaltluftvolumenstrom(dichte)`, all also as `_2030`; day 14:00 / night 04:00 | Visual context. **Raster values are not returned by GetFeatureInfo**; raw grids via the shop |
| Heat focus areas | **Fokusgebiete Stadtklimakonzept** STAC `FGSK` (976 polygons: `Fokus` 49, `Verbessern` 88, `Erhalten` 107, rest) | **Prioritisation**, downloadable |
| Street-level sensors | Smart Climate `100009` (hourly air temperature + 1 h / 24 h / 48 h rain, **raw, not quality-checked**; meteoblue) and stations `100082` (198) | Scenario context and monitoring, labelled raw |
| Reference station | MeteoSwiss SwissMetNet Basel/Binningen `BAS` (STAC `ch.meteoschweiz.ogd-smn`, 10-min/hourly/daily CSV), NBCN daily `100254`, weather summary `100227` | Calibrated reference |
| Heavy-rain events | MeteoSwiss radar precipitation `ogd-radar-precip` (CombiPrecip; **only the last 14 days**), gridded analyses `ogd-surface-derived-grid`, climate scenarios `ogd-climate-scenarios-ch2025(-grid)` | Real events and future scenarios behind `heavy-rain` / `hot-drought` |
| Drinking fountains | `100008` (305) | Heat-relief amenity (minor) |

### Planning, timing and governance

| Need | Source |
|---|---|
| Zoning | Zoning plan `NPBA` (STAC), overlays `100234`, special building rules / development plans `BPBS`, structure plan `RPLK`, planning zones `PZBA` |
| Site developments | Arealentwicklungen `AREA` (e.g. VoltaNord) |
| Works that open the street | Public-realm permits `100018` (150,799, daily), construction sites `100335`, building notices `100366`, public building projects `100402` |
| Water space | Gewässerraum `GWAR` |

### Monitoring (after building something)

| Need | Source |
|---|---|
| Groundwater response | Groundwater level `100164` (hourly), temperature `100179`, long-term statistics `100180`/`100181`, quality `100067` |
| Rivers | Rhine `100089`, Birs `100236`, Wiese `100235` (BAFU, 5-min, **CC0**), forecasts `100271`/`100272` |
| Air temperature near a site | Smart Climate `100009` (raw) |

## Licences

- **data.bs.ch:** mostly CC BY 4.0. Some say "CC BY 4.0 + OpenStreetMap" (the map background). IWB and BVB datasets allow free use with attribution, but commercial use needs permission. BAFU hydrology is CC0.
- **OpenStreetMap:** Basel-Stadt allows its CC BY 4.0 datasets to be incorporated into OpenStreetMap (waiver of 22 August 2024, Grundbuch- und Vermessungsamt: [PDF](https://data-bs.ch/stata/dataspot/permalinks/20240822-osm-vektordaten.pdf)). Values derived from city data, such as parking positions, can therefore be contributed back to OSM.
- **Basel STAC:** CC-BY-4.0. WMS: attribution «Quelle: Geodaten Kanton Basel-Stadt».
- **Federal geodata:** free under the federal open-government-data (OGD) terms, with attribution. The STAC `license: proprietary` is a generic value; check the product page before shipping. MeteoSwiss OGD collections are CC-BY.

## Recommended first `BaselPlaceProvider` (no code yet)

For a selection `(lon, lat, radius)`, all through open APIs:

1. Land cover `100477` within the radius → PlaceModel elements and surface classes, `observed`, with `area_m2` from geometry.
2. Trees `100052` → `tree` elements (pit unknown).
3. Groundwater protection zones `100292` → `context.groundwater_protection_zone`.
4. Parking counts `100329` for the streets in view → `parking.count` (`derived`); bay geometry stays unknown.
5. Parcels `100201` → `context.ownership`.
6. `SETV` and `FGSK` → shown as context; propose them as new context keys before using them in requirements.
7. Everything else stays `unknown` with a note naming the missing source: `utilities`, `infiltration_capacity`, routing.

## Open questions for data partners

1. Sewer network / GEP geometry for Basel (Tiefbauamt): the biggest gap for routing and sewer-load tendencies.
2. On-street parking bay geometry behind `100329` (Amt für Mobilität).
3. Raw grids of the urban climate analysis and the 25 cm DTM: licence and access via the shop.
4. Street-tree pit dimensions (Stadtgärtnerei): would make `vegetation.pit` observed.
5. Any infiltration / permeability map for Basel-Stadt (Amt für Umwelt und Energie).
6. Utility corridors at street scale, even coarse (IWB / Tiefbauamt).
