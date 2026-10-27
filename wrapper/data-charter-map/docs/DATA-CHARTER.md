# Sponge City Data Charter

Status: draft, 3 October 2026. Machine-readable source: [`data/data-charter.json`](../data/data-charter.json). Map: this wrapper module (`npm run dev --prefix wrapper/data-charter-map`). The indicator tables below are generated from the JSON, and the smoke test checks that they agree.

## Why a charter

Sponge-city measures (unsealing, rain gardens, tree trenches, green roofs, curb cuts) are decided street by street, but their effect depends on data that is often not public: where the water goes, what lies underground, how much room trees have. This charter states the **north star**: the data a city should hold, keep current and publish so that sponge-city principles can be planned, evaluated and monitored in public. It then scores Basel against it.

## What exists already

No open-data charter for sponge cities was found. The closest references, which this charter builds on:

- **[GB/T 51345-2018 海绵城市建设评价标准 / Assessment standard for sponge city construction effect (China, MOHURD; approval draft)](https://cctc.cn/Portals/0/2020/NewFolder/《海绵城市建设评价标准》报批稿.pdf)**: Seven assessment items (5.1–5.7): annual runoff volume capture, source-reduction effectiveness, road ponding and waterlogging, urban water bodies, natural ecological pattern and shorelines, groundwater depth trend, urban heat island mitigation. Clause 3.0.4: assessment rests on at least one year of continuous monitoring of typical projects, the pipe network and water bodies, plus field checks and modelling.
- **[Water Sensitive Cities Index (CRC for Water Sensitive Cities, Australia)](https://watersensitivecities.org.au/water-sensitive-cities-index-tool)**: 34 indicators in 7 goals, scored 1–5 in a workshop; used by more than 70 cities.
- **[VSA guideline Abwasserbewirtschaftung bei Regenwetter (2019) and the GEP](https://www.vs.ch/de/web/sen/regenwasserbewirtschaftung-in-stadtischen-gebieten)**: The municipal general drainage plan (GEP) must define where infiltration is possible; infiltration map, groundwater and protection maps and the contaminated-sites register are its inputs.
- **[WaterML-UD, FAIR metadata for urban drainage observations (Eawag)](https://www.eawag.ch/en/department/sww/projects/waterml-ud)**: How monitoring data from drainage systems should be described to be reusable.
- **[Berlin Umweltatlas: sealing, water balance (ABIMO) and green roofs](https://www.berlin.de/umweltatlas/wasser/wasserhaushalt/2022/einleitung/)**: A city that publishes sealing, a block-level water balance and a green-roof inventory as open maps.
- **[Copenhagen Cloudburst Management Plan (2012)](https://climate-adapt.eea.europa.eu/en/metadata/case-studies/the-economics-of-managing-heavy-rains-and-stormwater-in-copenhagen-2013-the-cloudburst-management-plan/)**: Catchment-based plan built on a calibrated city-wide hydraulic model.

What we took from them:
- From China's standard: **what to evaluate**, and the rule that evaluation needs at least a year of monitoring.
- From the WSC Index: **a scored benchmark**.
- From the VSA guideline and the GEP: **the Swiss data inputs for infiltration decisions**.
- From WaterML-UD: **how monitoring data should be described**.
- From Berlin and Copenhagen: **what publishing it looks like**.

## The evidence rule

Real and inferred data are kept apart everywhere: in this charter, in the JSON (separate `basel` and `fill` fields) and on the map.

| Class | Meaning | On the map |
|---|---|---|
| **Real** | Published by an authority, used as published (observed data, or an authority's own official model) | Filled markers, solid layers; official models tagged |
| **≈ Inferred** | Derived by us from real data; the method is always named | Hollow rings, titles start with ≈ |
| **Missing** | No open data found in the reviewed Basel and federal sources (`missing`), or expected to exist but not found as open data (`restricted`, an assumption) | Amber hatch over the whole canton, with the ask |

Basel's real status per indicator:

- `open`: Real data, openly downloadable or queryable, close to the north star
- `partial`: Real open data exists but falls short of the north star (resolution, coverage, format or only as a map image)
- `restricted`: Expected to exist but not openly available; not found as open data in the reviewed Basel and federal sources. The basis for expecting it is stated per indicator and is an assumption, not a verified fact
- `missing`: No open data found in the reviewed Basel and federal sources

Inference status:

- `run`: Inferred by us in a pilot on live open data; shown on the map as inferred, never as real
- `proposed`: A known indirect, detection or synthesis method; not run yet
- `none`: No credible inference route; it has to be measured or published

## Basel today

Of **25 indicators**:
- 8 open;
- 8 partial;
- 2 restricted;
- 7 missing.

Inferences: 4 were run in our pilots (shown on the map), 7 are proposed, and 3 can only be measured or published.

### Surfaces and sealing

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `land-cover` | Land cover and sealing | Polygons of every sealed and unsealed surface (roofs, roads, sidewalks, parking, planted), ≤ 1 m, updated yearly, open vector download and API. | Cadastral land cover: 49,595 polygons with classes such as sidewalk, road, traffic island, tram area, building, garden, water. CC BY 4.0, updated 2026-08-20. Sources: [data.bs.ch 100477 Bodenbedeckung](https://data.bs.ch/explore/dataset/100477/) | open | — | — |
| `sealing-fraction` | Sealed share per block or catchment | Sealed fraction per block and per drainage catchment, yearly, as the basis of a water balance (runoff, infiltration, evaporation). | No published sealed-share or water-balance layer. The inputs are open (land cover, statistical blocks). | missing | **proposed** (deduce): Aggregate land-cover classes per statistical block (100040); a water balance like Berlin's ABIMO could follow. *Confidence: high for sealed share, it is arithmetic on real polygons.* | — |
| `roofs` | Roof form, green roofs and load capacity | Per building: roof form and slope, existing green-roof area and type, heritage constraints, structural reserve for a green roof; open, updated with building permits. | Open: solar register per roof (model values) and heritage roof survey (WMS/WFS). Not found: an inventory of existing green roofs, roof load capacity. Sources: [data.bs.ch 100382 Solarkataster](https://data.bs.ch/explore/dataset/100382/); [geo.bs.ch Dachflächenkataster Denkmalpflege](https://wms.geo.bs.ch/) | partial | **proposed** (detect): Green-roof detection from orthophotos (Berlin method; NDVI needs near-infrared, which SWISSIMAGE RS has but not for free). Flat roofs from swissBUILDINGS3D plus the § 72 BPG obligation give a prior. Load capacity has no remote proxy. *Confidence: medium for green roofs, none for load capacity.* | Publish the green-roof inventory if one exists (Kanton Basel-Stadt). |
| `parking` | On-street parking geometry | Every on-street parking bay as a polygon with type and count, updated with traffic orders; open. | Counts per street section and type (7,817 records) are open, but without geometry. Special parking (disabled, charging, taxi) is open as points. Sources: [data.bs.ch 100329 Parkflächen](https://data.bs.ch/explore/dataset/100329/); [geo.bs.ch STAC PRKG](https://api.geo.bs.ch/stac/v1/collections/PRKG) | partial | **proposed** (deduce): Spread the per-street counts along the road edges (land cover + street segments), or detect bays in aerial imagery (DLR method); OSM parking:* tags where mapped. *Confidence: medium.* | Publish the geometry behind 100329 (Amt für Mobilität). |

### Ground and groundwater

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `infiltration` | Infiltration capacity | An infiltration suitability map (as the GEP requires) with measured permeability where available, at parcel or street scale, open. | No open infiltration map or permeability data found. Related open inputs: soil depth classes, boreholes, groundwater levels, protection zones, contaminated sites. | missing | **proposed** (deduce): Combine depth to groundwater, borehole stratigraphy, soil depth and exclusions (protection zones S1/S2, contaminated sites); validate with citizen-science infiltration tests. *Confidence: low to medium: screening only.* | Publish the GEP infiltration map (Amt für Umwelt und Energie). |
| `groundwater-depth` | Depth to groundwater | A continuous map of depth to groundwater (mean and high levels) plus live levels, yearly trend. | Real and open at about 80 monitoring stations (hourly levels, 10-year statistics); no continuous depth map. Sources: [data.bs.ch 100164 Wasserstand Grundwasser](https://data.bs.ch/explore/dataset/100164/); [data.bs.ch 100180 langjährige Statistiken](https://data.bs.ch/explore/dataset/100180/) | partial | **run** (deduce): Terrain height minus the 10-year maximum level gives the shallowest depth to groundwater per station: 0.8 m to 20.8 m, median 9.8 m across 81 stations. Not interpolated between stations. *Confidence: high at stations, none between them.* | — |
| `protection` | Groundwater protection and contaminated sites | Protection zones and contaminated-sites register as open vectors, kept current. | Groundwater protection zones and areas, and the register of contaminated sites, are open (data.bs.ch, WMS/WFS). Sources: [data.bs.ch 100292 Grundwasserschutzzonen](https://data.bs.ch/explore/dataset/100292/); [geo.bs.ch Kataster der belasteten Standorte (WFS)](https://wfs.geo.bs.ch/) | open | — | — |
| `soil` | Soil type and depth | Soil map with texture, depth and compaction for open and sealed ground, open. | Soil map with depth classes is open as WMS/WFS, mainly for unsealed areas; little about the ground under streets. Sources: [geo.bs.ch Bodenkarte](https://wms.geo.bs.ch/) | partial | **proposed** (deduce): Borehole profiles (Bohrkataster) for material under sealed ground. *Confidence: low.* | — |
| `utilities` | Underground utilities | At least a utility-corridor density per street segment (no exact positions), open; positions available to planners. | Not found as open data in the reviewed sources (assumed: a utility cadastre is expected to exist for Basel-Stadt). Open: large pipelines only, district-heating area. Sources: [geo.bs.ch STAC AVRO, IWBF](https://api.geo.bs.ch/stac/v1/collections) | restricted | **run** (deduce): Permit trail: works permits whose text names utility, sewer, district-heating, water, gas, electricity or house-connection work (7,032 construction-site and excavation permits on the map; 7,557 utility-works records on 666 streets in the wider pilot). Shows activity, not the network. *Confidence: medium as a density signal; no positions.* | Publish a corridor-density class per street segment (IWB, Tiefbauamt). |

### Drainage and rain

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `sewer-network` | Sewer and drainage network (GEP) | Pipes, manholes, gullies, combined or separate system, overflows, catchments, with the GEP; open, at least as a simplified network. | Not found in the reviewed open Basel and federal sources (assumed: a general drainage plan, GEP, is expected to exist under the VSA guideline). Only the wastewater-plant catchment (13 polygons) is open. Sources: [data.bs.ch 100336 Einzugsgebiet ARA](https://data.bs.ch/explore/dataset/100336/) | restricted | **proposed** (synthesise): SWMManywhere or the Eawag sewer generator from streets, terrain and buildings; checked against the 96 streets with sewer-works permits. *Confidence: low: a plausible network, never the real one.* | Publish gully points and a combined/separate flag per street segment (Tiefbauamt, AUE). |
| `gullies` | Gullies and inlets | Every street gully and inlet as a point with its connection, open. | No open gully data found. | missing | **proposed** (detect): Detection in street-level photos (Mapillary manhole class, published storm-drain detectors) or true orthophotos; OSM manhole=drain. *Confidence: medium where imagery exists.* | Part of the sewer-network ask. |
| `overland-flow` | Overland flow and ponding | Pluvial flood hazard from a calibrated city model, plus recorded ponding and flooding events. | Federal overland-flow hazard map (modelled, simplified, not field-verified) and cantonal river flood hazard maps are open. No open record of flooding events in streets. Sources: [BAFU Gefährdungskarte Oberflächenabfluss](https://map.geo.admin.ch/?layers=ch.bafu.gefaehrdungskarte-oberflaechenabfluss); [geo.bs.ch Naturgefahren](https://wms.geo.bs.ch/) | partial | — | Publish recorded flooding and ponding events. |
| `rainfall` | Rainfall at high resolution | Rain gauges and radar at ≤ 10 minutes and ≤ 1 km, long records for design storms and event analysis. | MeteoSwiss Basel/Binningen station (10-minute data, long records), radar precipitation (last 14 days), climate scenarios CH2025; city sensors with hourly rain (raw). Sources: [MeteoSwiss open data (STAC)](https://data.geo.admin.ch/api/stac/v0.9/collections/ch.meteoschweiz.ogd-smn); [data.bs.ch 100009 Smart Climate](https://data.bs.ch/explore/dataset/100009/) | open | — | — |
| `network-monitoring` | Flow and overflow monitoring in the network | Flows, levels and combined-sewer overflow events at key points, open in a FAIR format (e.g. WaterML-UD). | No open sewer flow or overflow data found. | missing | **none** (measure): Has to be measured and published by the operator. *Confidence: n/a.* | Publish overflow events and flows (sewer and treatment-plant operators). |
| `receiving-waters` | Rivers and receiving waters | Levels, flows and quality of rivers and streams, live and open. | Rhine, Birs and Wiese levels and flows every 5 minutes (BAFU, CC0), Rhine monitoring station, surface-water analyses. Sources: [data.bs.ch 100089 Rhein](https://data.bs.ch/explore/dataset/100089/) | open | — | — |

### Trees and vegetation

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `trees` | Tree inventory | Every public tree with species, age, size and condition, updated continuously, open. | Tree cadastre: 32,378 trees (12,504 street trees) with species, years at site, protection status; daily updates. Sources: [data.bs.ch 100052 Baumkataster](https://data.bs.ch/explore/dataset/100052/) | open | — | — |
| `tree-pits` | Tree pit and root space | Per tree: pit area and volume, substrate, connected trench or not. | The tree cadastre has no pit size or root-space field. | missing | **run** (deduce): Intersect street-tree points with mapped planted land-cover polygons. 3,372 points lie inside a mapped planted polygon; 9,132 have no mapped planted polygon at the point. This classifies planting context, not pit dimensions. *Confidence: medium for mapped planting context; none for an individual pit's dimensions.* | Add a pit-area field to the tree cadastre (Stadtgärtnerei). |
| `canopy` | Canopy cover over time | LiDAR canopy every 3 years or better, open. | LiDAR canopy cover for 2012, 2021 and 2024 (0.5 m, GeoTIFF). Sources: [data.bs.ch 100357 Baumkronenbedeckung](https://data.bs.ch/explore/dataset/100357/) | open | — | — |
| `soil-moisture` | Soil moisture and tree water stress | Soil-moisture sensors at representative trees and sponge measures, live and open (as in Berlin's QTrees). | No open soil-moisture or tree-stress sensor data found. | missing | **none** (measure): Has to be measured. *Confidence: n/a.* | — |

### Heat

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `climate-analysis` | Urban climate analysis | Heat stress, heat-island and cold-air maps for today and scenarios, as open grids. | Climate analysis 2019 and 2030 (PET, heat island, air temperature, cold air) open as map images; the grids are in the geodata shop. Sources: [geo.bs.ch Stadtklima (WMS)](https://wms.geo.bs.ch/) | partial | — | Publish the climate-analysis grids as open GeoTIFFs. |
| `street-temperature` | Street-level temperature | Calibrated air and surface temperature sensors across street types, live and open. | About 200 city sensors with hourly air temperature, open but raw (not quality-checked). Sources: [data.bs.ch 100009 / 100082 Smart Climate](https://data.bs.ch/explore/dataset/100082/) | partial | — | — |

### Priorities, ownership and timing

| Id | Indicator | North star | Basel today (real) | Status | Inference (not real data) | Open-data ask |
|---|---|---|---|---|---|---|
| `priorities` | Suitability and priority areas | Published suitability of streets for sponge measures and priority areas for heat and water. | Sponge suitability by daily traffic for 6,519 street segments, and heat focus areas from the city climate concept. Sources: [geo.bs.ch STAC SETV](https://api.geo.bs.ch/stac/v1/collections/SETV); [geo.bs.ch STAC FGSK](https://api.geo.bs.ch/stac/v1/collections/FGSK) | open | — | — |
| `ownership` | Ownership and public realm | Parcels and public-realm boundaries, open. | Parcels with EGRID and public-realm (Allmend) parcels are open. Sources: [data.bs.ch 100201 Parzellen](https://data.bs.ch/explore/dataset/100201/) | open | — | — |
| `works-calendar` | Works calendar | Planned street and utility works per segment, years ahead, open, so sponge measures can join them. | Public-ground permits (150,799, daily) and construction sites are open; no multi-year coordinated works plan is published. Sources: [data.bs.ch 100018 Allmendbewilligungen](https://data.bs.ch/explore/dataset/100018/); [data.bs.ch 100335 Baustellen](https://data.bs.ch/explore/dataset/100335/) | partial | **run** (deduce): Permits with an end date from today onwards identify active or upcoming permitted works. *Confidence: high for the permit dates shown; this is not a coordinated future works plan.* | Publish the coordinated multi-year works plan. |
| `measures-registry` | Registry of built sponge measures and their performance | Every built measure (rain garden, tree trench, depaving, green roof) with location, design, date and monitored effect, open. | No open registry found; only 64 permit texts mention unsealing or infiltration. | missing | **none** (ask): Has to be recorded by the city. *Confidence: n/a.* | Start an open registry of sponge measures (Stadtgärtnerei, Tiefbauamt). |

## Inference claims

Each inferred map layer carries a typed claim ([ADR 0006](../../docs/adr/0006-bound-computational-gap-filling.md), [ADR 0007](../../docs/adr/0007-data-charter-inferences-are-typed-claims.md)). None is validated yet, so each may only be used to **explain** or **screen**, never to prioritise or design. The smoke test enforces this.

| Claim | Layer | Class | Method | Inputs | Resolution | Validation | Permitted use | Limitations |
|---|---|---|---|---|---|---|---|---|
| `tree-planting-context`: Whether a street-tree point lies inside a mapped planted land-cover polygon. | `i-pits` | derived | Point-in-polygon test of street-tree points (ba_gruppe 'Strassenbäume') against land-cover polygons of classes humusiert* and bestockt*. | [data.bs.ch 100052 Baumkataster](https://data.bs.ch/explore/dataset/100052/); [data.bs.ch 100477 Bodenbedeckung](https://data.bs.ch/explore/dataset/100477/) | Per tree point; land-cover polygons at official-survey scale; Snapshot 2026-10-03; inputs as published on that date | not validated | explain, screen | Describes mapped planting context at the tree point only; No mapped planted polygon at the point does not prove sealed paving; Says nothing about pit area, soil volume or substrate; Planted areas below the survey's mapping threshold are not distinguished |
| `groundwater-depth-at-stations`: Shallowest and mean depth to groundwater at each monitoring station. | `i-gwdepth` | derived | Terrain height minus the 10-year maximum (and mean) groundwater level published per station; shallowest value per station. | [data.bs.ch 100180 Wasserstand Grundwasser: langjährige Statistiken](https://data.bs.ch/explore/dataset/100180/) | Per monitoring station (point); not interpolated; Statistic period per station (usually 10 years), as published | not validated | explain, screen | Point values; nothing is known between stations; The shallowest observed level is not a design groundwater level; Local perched water and construction effects are not represented |
| `underground-activity-by-network`: Which network a works permit concerns (sewer, district heating, house connection, water, gas, electricity, unspecified utility). | `i-underground` | derived | Keyword rules on the permit description; the first matching category wins. | [data.bs.ch 100018 Allmendbewilligungen](https://data.bs.ch/explore/dataset/100018/) | Per permit point (centroid of the permitted area); Permits in the snapshot of 2026-10-03, with their own start and end dates | not validated | explain, screen | Shows permitted activity, not the location, depth or density of networks; Keyword rules were not checked against permit documents; mixed works get one category; A street without permits may still contain utilities |
| `active-or-upcoming-works`: Permits whose end date is on or after the snapshot date. | `i-digwindows` | derived | Date filter on the permit end date. | [data.bs.ch 100018 Allmendbewilligungen](https://data.bs.ch/explore/dataset/100018/) | Per permit point (centroid of the permitted area); Relative to the snapshot date 2026-10-03 | not validated | explain, screen | Only works that are already permitted; Not a coordinated future works plan; Permit dates can change |

## The gap, in one list

These are the indicators Basel does not have as open real data, with the route to fill them:

- **Sealed share per block or catchment** (`missing`). ≈ proposed: Aggregate land-cover classes per statistical block (100040); a water balance like Berlin's ABIMO could follow.
- **Infiltration capacity** (`missing`). ≈ proposed: Combine depth to groundwater, borehole stratigraphy, soil depth and exclusions (protection zones S1/S2, contaminated sites); validate with citizen-science infiltration tests. **Ask:** Publish the GEP infiltration map (Amt für Umwelt und Energie).
- **Underground utilities** (`restricted`). ≈ run: Permit trail: works permits whose text names utility, sewer, district-heating, water, gas, electricity or house-connection work (7,032 construction-site and excavation permits on the map; 7,557 utility-works records on 666 streets in the wider pilot). Shows activity, not the network. **Ask:** Publish a corridor-density class per street segment (IWB, Tiefbauamt).
- **Sewer and drainage network (GEP)** (`restricted`). ≈ proposed: SWMManywhere or the Eawag sewer generator from streets, terrain and buildings; checked against the 96 streets with sewer-works permits. **Ask:** Publish gully points and a combined/separate flag per street segment (Tiefbauamt, AUE).
- **Gullies and inlets** (`missing`). ≈ proposed: Detection in street-level photos (Mapillary manhole class, published storm-drain detectors) or true orthophotos; OSM manhole=drain. **Ask:** Part of the sewer-network ask.
- **Flow and overflow monitoring in the network** (`missing`). measure or publish **Ask:** Publish overflow events and flows (sewer and treatment-plant operators).
- **Tree pit and root space** (`missing`). ≈ run: 3,372 tree points lie inside a mapped planted polygon; 9,132 have no mapped planted polygon at the point. This is planting context, not a pit measurement. **Ask:** Add a pit-area field to the tree cadastre (Stadtgärtnerei).
- **Soil moisture and tree water stress** (`missing`). measure or publish
- **Registry of built sponge measures and their performance** (`missing`). measure or publish **Ask:** Start an open registry of sponge measures (Stadtgärtnerei, Tiefbauamt).

Methods and pilot details: [GAP-FILLING.md](GAP-FILLING.md). Source catalogue: [DATA-SOURCES.md](DATA-SOURCES.md).
