# Filling the data gaps: deduce, detect, synthesise, measure, ask

Status: research plus three small pilots on open Basel data, 3 October 2026. Companion to [DATA-SOURCES.md](DATA-SOURCES.md), which lists what is open; this file covers what is missing.

The north-star charter that scores Basel against these gaps, and its map, are in [DATA-CHARTER.md](DATA-CHARTER.md).

## The gaps are a result

Six inputs that sponge-city decisions depend on are not openly available for Basel:

1. the sewer and drainage network;
2. underground utilities;
3. on-street parking geometry;
4. soil permeability;
5. tree pit size;
6. roof load capacity.

That list is already a finding. It says what a city should measure, or open up if it already measures it, before it can plan sponge streets in public. Each gap below has four routes, in order of preference:

| Route | Meaning | Evidence state in our model |
|---|---|---|
| **Deduce** | Combine open datasets into a defensible indirect value | `derived`, with `method` and the inputs named |
| **Detect** | Extract objects from imagery or street-level photos | `modelled` (detector output), with a confidence |
| **Synthesise** | Generate a plausible network or model from first principles | `modelled`, labelled synthetic, never shown as the real network |
| **Measure / ask** | Field survey, citizen science, or an open-data request | `observed` once done; until then, `unknown` |

Nothing inferred becomes `observed`. The state engine already keeps that distinction; these methods only move a value from `unknown` to `derived` or `modelled`, never further.

## Pilot results (run on live open data)

### 1. The permit trail: a utilities and works index (deduce)

The public-realm permit dataset (`100018`) records every use of public ground, including excavations. Matching keywords over 16,291 relevant records gives:

| Keyword in permit text | Records | Distinct streets |
|---|---|---|
| Leitungsbau / Werkleitung (utility works) | 7,557 | 666 |
| Strassenbau (road works) | 3,155 | 352 |
| Fernwärme (district heating) | 593 | 156 |
| Hausanschluss (house connection, with sidewalk side: "links/rechts, gerade/ungerade Hausnr.") | 489 | 208 |
| Kanalisation / Abwasser (sewer) | 478 | 96 |
| Strom / Kabel (electricity) | 431 | 123 |
| Wasser (water) | 368 | 94 |
| Gas | 206 | 53 |
| Entsiegelung / Versickerung / Schwamm (sponge measures) | 64 | 17 |

620 records are *Meldung Aufgrabung* (excavation notices). They describe house-connection work on the carriageway and on a named sidewalk side, which places a service line under that sidewalk. Permits run into **2028**.

What this enables:

- **Utility density per street** (`derived`): a street with many recent excavations and house connections under its sidewalks has crowded ground, so a tree trench there is "requires investigation" with a reason, rather than an unexplained unknown.
- **Sewer presence and renovation** (`derived`): 96 streets with sewer works confirm a sewer and show when it was opened.
- **Dig-once windows:** a street opened for utility works between now and 2028 is the cheapest moment to add a tree trench or rain garden. This turns a data gap into a planning opportunity: overlay permit dates on the `SETV` suitability layer.

Limits: permits record activity, not the network. A street with no permits may still be full of pipes.

### 2. Tree planting context from the land-cover cadastre (deduce)

The pilot downloads mapped planted land-cover polygons and intersects the street-tree points with them. A hit shows that the tree stands inside a mapped planted polygon. A miss means only that no mapped planted polygon exists at that point; it does not prove a sealed surface or a particular pit type.

- All 12,504 street trees: **3,372 inside mapped planted polygons and 9,132 without a mapped planted polygon at the tree point.** Mapped polygon areas have quartiles of 202, 371 and 787 m², but can describe an entire verge or garden rather than an individual tree pit.

Mapping onto our `vegetation.pit` field:
- no mapped planted polygon at the tree point → planting context remains `unknown`, with the method and limitation shown;
- planted polygon → mapped planting context `derived`, with the polygon area recorded; individual pit size remains `unknown`.

Pits below that threshold that were enlarged without any surveyed change stay indistinguishable. That is an honest limit.

### 3. Does root space show in the canopy? (deduce, screening only)

LiDAR canopy rasters for 2012 and 2024 (`100357`, 0.5 m) give the canopy within 8 m of each street tree. Grouped by years at the site (`ba_standjahr`):

| Years at site | Context | n | Canopy 2012 → 2024 (median m²) | Median change |
|---|---|---|---|---|
| 13–25 | no mapped planting | 1,807 | 24.8 → 46.5 | +17.5 |
| 13–25 | mapped planted polygon | 674 | 18.0 → 46.8 | **+23.8** |
| 26–50 | no mapped planting | 2,476 | 63.1 → 73.5 | +9.0 |
| 26–50 | mapped planted polygon | 688 | 92.8 → 97.0 | +7.4 |
| >50 | no mapped planting | 2,633 | 116.2 → 112.8 | −0.5 |
| >50 | mapped planted polygon | 1,415 | 146.8 → 139.0 | −3.5 |

- **Younger trees:** those in mapped planted polygons gained about a third more canopy than those without mapped planting.
- **Older trees:** those in mapped planted polygons are larger, but no longer growing faster.

This is consistent with root space mattering, but it is **not causal**. Species mix, other vegetation inside the 8 m radius, and pruning all confound it. It is a reason to measure, not a parameter.

Reproduce with [`pilots/tree_pit_canopy.py`](../pilots/tree_pit_canopy.py).

### 4. Depth to groundwater (deduce)

The groundwater statistics (`100180`) give terrain height and the 10-year maximum level per station. Their difference is the **shallowest depth to groundwater** over 10 years:

- range 0.8 m (Lehenmattstrasse, near the Birs) to 20.8 m;
- median 9.8 m across 81 stations (taking the shallowest of a station's sensors and statistic periods; a first count over all rows gave 88 rows, 1.3–20.6 m, median 10.5 m).

Interpolated between stations and checked against the highest-groundwater contours (`ms:GN_IsohypseHoechsthochwasser`) and the 25 cm terrain model, this gives an infiltration screening layer. Shallow groundwater means caution; deep groundwater means room for infiltration. It is `derived`, never a permeability value.

## Ideas per gap

### Sewer and drainage routing

| Idea | Route | Notes |
|---|---|---|
| [SWMManywhere](https://github.com/imperialcollegelondon/swmmanywhere) (Imperial College) | Synthesise | Generates a drainage network and a SWMM model from street network, terrain and buildings, worldwide ([JOSS paper](https://www.theoj.org/joss-papers/joss.07729/10.21105.joss.07729.pdf)). Run it on one Basel catchment, then compare against the 96 sewer-permit streets |
| Eawag [simplified sanitary sewer generator](https://opendata.eawag.ch/dataset/simplified-sanitary-sewers-generator) (Duque et al., Water Research 2022) | Synthesise | Swiss origin; built for city-scale exploratory modelling |
| [Terrain flow accumulation on a manipulated terrain model](https://www.iwas-sachsen.ufz.de/index.php?en=21851) (Blumensaat et al., "Sewer model development under minimum data requirements") | Synthesise | Uses the 25 cm Basel terrain model or swissALTI3D |
| Gully and manhole detection | Detect | Street-level detectors ([RetinaNet storm-drain study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7472039/)); aerial detection ([manhole covers in aerial images](https://hal.archives-ouvertes.fr/hal-01556762)) on Basel's true orthophotos (2017, 2020, 2023); [Mapillary](https://help.mapillary.com/hc/en-us/articles/360003021152-Types-of-map-data) exposes `object--manhole` detections (an API token is needed; not tested) |
| Overland flow as routing hint | Deduce | BAFU overland-flow map (Basel-Stadt download) and terrain flow paths show where water goes when gullies are full |
| Ask | Ask | The general drainage plan (GEP) and network geometry from Tiefbauamt / Amt für Umwelt und Energie |

In our model a synthetic network may only feed `routing` as `modelled` edges. The routing contract allows edge origins `place` and `assumption` today, so a `synthetic` origin would be a contract change to decide first. Sewer-load tendencies that depend on it must say so.

### Utilities

| Idea | Route |
|---|---|
| Permit trail (pilot 1): density, house-connection sidewalk side, last dig | Deduce |
| Utility covers on street photos (cover logos, valve caps) via Mapillary or own survey | Detect |
| The Swiss utility cadastre (Leitungskataster) exists but is restricted. Ask for a coarse, open "utility corridor density per street segment" product: it reveals no pipe positions | Ask |

### Parking geometry

| Idea | Route |
|---|---|
| Spread the per-street counts (`100329`) along the street's sides: road and sidewalk polygons (`100477`) plus street segments (`100250`), at an assumed 5–6 m per parallel bay. This gives positions as `derived` | Deduce |
| OSM `parking:both/left/right` tags; viewer and editor [parking-lanes](https://zlant.github.io/parking-lanes/) ([tag docs](https://wiki.openstreetmap.org/Key:parking:lane)). Coverage in Basel was not verified (Overpass unreachable from this session) | Detect / crowd |
| Aerial-imagery parking inventory ([DLR, Hellekes et al. 2022](https://elib.dlr.de/191145/1/Hellekes_et_al_2022_Parking_space_inventory_from_above.pdf); [ISPRS 2021](https://isprs-archives.copernicus.org/articles/XLIII-B2-2021/479/2021/)) on SWISSIMAGE 10 cm (free) or Basel orthophotos | Detect |
| Ask Amt für Mobilität for the geometry behind `100329` | Ask |

### Soil permeability and infiltration

| Idea | Route |
|---|---|
| Depth to groundwater (pilot 4) plus the borehole register's stratigraphy (`BOHA`, *Felsoberkante*, groundwater level) give the unsaturated thickness and the material class. Basel's Rhine gravels versus clay layers show up in the profiles | Deduce |
| Exclusions: contaminated sites (`ms:AK_*`), groundwater protection zones S1/S2, soil depth (`ms:BD_Bodenkarte_Gruendigkeit*`) | Deduce |
| Citizen-science infiltration tests at candidate sites; [Earthwatch protocol, Frontiers in Water 2021](https://www.frontiersin.org/articles/10.3389/frwa.2021.654493/text), where simple measurements classified high versus low infiltration | Measure |

### Roofs (type, existing green roofs, load)

| Idea | Route |
|---|---|
| Flat versus pitched from swissBUILDINGS3D 3.0, with building year from the GWR (`100230`). Basel requires greening of flat roofs (§ 72 BPG), so flat roofs built or renovated under that rule are likely green. That is a prior, not a fact (the date the rule took effect is still to be checked) | Deduce |
| Green-roof detection: [Berlin's environmental atlas method](https://berlin.de/umweltatlas/en/land-use/green-roofs/2020/methodology); [mundialis](https://mundialis.de/en/references/green-roof-detection). NDVI needs near infrared: [SWISSIMAGE RS](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-rs) has it but is **not free**; RGB-only U-Net variants exist | Detect |
| Load capacity: no remote proxy is reliable. Building year and type give a weak prior at best. Measure per building (engineer) | Measure |

## What we could do next, place by place

For one or two Basel streets that `SETV` rates *geeignet* and the heat focus areas (`FGSK`) rate *Fokus*:

1. **Tree pits:** apply the land-cover rule to every tree (pilot 2) → `vegetation.pit` `derived`.
2. **Utilities and timing:** attach the permit trail to the street (pilot 1): utility density, last excavation, and any planned dig before 2028.
3. **Groundwater:** interpolate depth to groundwater at the site (pilot 4).
4. **Synthetic drainage:** run SWMManywhere on the catchment, labelled `modelled`.
5. **One afternoon of field measurement:** photograph gullies and covers, measure a few pits, run two infiltration tests. Then compare observed against inferred values; that comparison is the most convincing result we could show.

Steps 1–3 need only the open APIs already in [DATA-SOURCES.md](DATA-SOURCES.md).

## The open-data asks (the gaps as a deliverable)

| Missing | Likely holder | Smallest useful open version |
|---|---|---|
| Sewer network / GEP | Tiefbauamt, Amt für Umwelt und Energie | Gully points plus combined- or separate-system flag per street segment |
| Utility corridors | IWB, Tiefbauamt (utility cadastre) | Density class per street segment, no positions |
| On-street parking geometry | Amt für Mobilität | The geometry behind `100329` |
| Tree pit dimensions | Stadtgärtnerei | A pit-area field in the tree cadastre `100052` |
| Infiltration capacity | Amt für Umwelt und Energie | The existing infiltration-suitability assessment, if one exists |
| Climate-analysis grids | Grundbuch- und Vermessungsamt (geodata shop) | Open GeoTIFFs of the published 2019 and 2030 layers |
