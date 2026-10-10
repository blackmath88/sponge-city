# Sponge City fact cards

Status: research catalogue, 2026-10-10. Generated from [`data/sponge-facts.json`](../data/sponge-facts.json) by `node scripts/facts-doc.mjs`; do not edit by hand. Basel-data numbers are reproduced by [`pilots/basel_facts.py`](pilots/basel_facts.py) and [`pilots/tree_pit_canopy.py`](pilots/tree_pit_canopy.py).

Short, sourced facts that explain each sponge-city intervention or action, for visual explainers. Every fact carries exactly one evidence class; numbers are quoted as their source states them, with the caveat that matters.

**46 facts** across 15 interventions and actions, plus Basel context. Evidence classes:

- **Basel data** (9): Computed by us from Basel open data; method and dataset named; reproducible with docs/pilots/
- **Official** (16): Stated by an authority (Basel-Stadt or another city or canton)
- **Research** (17): From a cited study or guideline; the setting may not be Basel
- **≈ Inference** (4): Our own reasoning from the facts above; not measured

Visual hints: `bars` two or more bars to compare · `trend` values over time · `share` part of a whole (stacked bar, 100 squares) · `count` icon count (trees, bays, barrels) · `slice` street cross-section, before and after · `map` points or areas on the Basel map · `quote` a single striking statement.

## Basel context

- **Basel data** · 45 % of Basel-Stadt's ground is sealed: 16.6 % buildings and 28.5 % paved surfaces. Roads alone cover 9.5 %, sidewalks 4.2 %.
  Source: [data.bs.ch 100477 Bodenbedeckung (official survey)](https://data.bs.ch/explore/dataset/100477/).
  Method: Area of all land-cover polygons by class (36.6 km² total).
  Caveat: Planted areas include gardens and parks; 'unsealed' is not the same as 'absorbs well' (see compaction).
  Visual: share · id `basel-sealed`

- **Basel data** · Basel-Binningen had 8.8 hot days (≥ 30 °C) a year in 1961–1990, 14.3 in 1991–2020, and 21.9 in 2015–2024.
  Source: [data.bs.ch 100254 NBCN daily climate, MeteoSwiss](https://data.bs.ch/explore/dataset/100254/).
  Method: Days with daily maximum ≥ 30 °C, averaged per period (complete years only).
  Caveat: Series is not homogenised.
  Visual: trend · id `basel-hot-days`

- **Basel data** · Days with 20 mm of rain or more did not become more frequent in Basel's daily record (5.4 a year in 1961–1990, 6.2 in 1991–2020, 5.2 in 2015–2024). The wettest day on record is 25 May 1872 with 94.8 mm; 26 July 1991 had 85 mm.
  Source: [data.bs.ch 100254 NBCN daily climate, MeteoSwiss](https://data.bs.ch/explore/dataset/100254/).
  Method: Days with daily precipitation ≥ 20 mm per period; ranking of daily totals since 1864.
  Caveat: Cloudbursts last minutes to hours; daily totals hide them. Sub-hourly data (MeteoSwiss 10-minute series) is needed for that question.
  Visual: trend · id `basel-heavy-rain`

- **Official** · Tree crowns cover about 25 % of the canton (2021 LiDAR evaluation), which has changed only marginally over the past ten years.
  Source: [Stadtgärtnerei Basel-Stadt: städtischer Baumbestand](https://www.bs.ch/bvd/stadtgaertnerei/unsere-abteilungen/gruenflaechenunterhalt/staedtischer-baumbestand).
  Visual: share · id `basel-canopy`

- **Basel data** · 63 % of Basel's street length (194 km) carries little enough traffic to be rated suitable for sponge measures; 10 % (30 km) needs checking and 27 % (81 km) is not suitable.
  Source: [geo.bs.ch SETV Schwammstadt-Eignung nach Tagesverkehr](https://api.geo.bs.ch/stac/v1/collections/SETV).
  Method: Sum of segment lengths per suitability class of the canton's model (≤ 2,000 vehicles/day suitable, ≥ 4,000 not suitable).
  Caveat: Traffic is one criterion; utilities, groundwater and space are not in this rating.
  Visual: share · id `basel-suitable-streets`

## Interventions and actions

### Keep the old trees (Bäume erhalten)

A mature tree cannot be replaced by a young one for decades. Protecting and caring for existing trees is the cheapest sponge measure.

Mechanisms: SHADE · SWEAT · STORE

- **Basel data** · Around Basel's street trees, the median canopy within 8 m grows with time at the site: about 20 m² for trees there up to 12 years, 46 m² at 13–25 years, 78 m² at 26–50, 118 m² at 51–80 and 138 m² for trees there more than 80 years.
  Source: [data.bs.ch 100052 tree cadastre + 100357 LiDAR canopy 2024](https://data.bs.ch/explore/dataset/100357/).
  Method: Canopy pixels within 8 m of each of 12,504 street trees, grouped by years at site (docs/pilots/tree_pit_canopy.py).
  Caveat: The 8 m circle can include neighbouring crowns; years at site is not tree age.
  Visual: bars · id `canopy-by-age`

- **Research** · In Santa Monica, a small young tree intercepted 15 % of the rain falling on it, a mature tree up to 66 %.
  Source: [Xiao & McPherson, rainfall interception by Santa Monica's urban forest](https://urbanforestrysouth.org/resources/library/citations/Citation.2004-11-03.P511).
  Caveat: Californian climate and species; interception is highest in small summer storms.
  Visual: bars · id `interception-size`

- **Research** · The same large plane tree intercepted about 15 % of a 22 mm winter storm (no leaves) but about 80 % of a 20 mm summer storm.
  Source: [Xiao & McPherson, rainfall interception by Santa Monica's urban forest](https://urbanforestrysouth.org/resources/library/citations/Citation.2004-11-03.P511).
  Visual: bars · id `interception-season`

- **Official** · Basel renews about 1 % of its tree stock a year; the tree cadastre lists over 28,000 trees, about 2,000 more than ten years ago.
  Source: [Stadtgärtnerei Basel-Stadt: städtischer Baumbestand](https://www.bs.ch/bvd/stadtgaertnerei/unsere-abteilungen/gruenflaechenunterhalt/staedtischer-baumbestand).
  Visual: count · id `renewal-rate`

- **≈ Inference** · ≈ Felling one old street tree removes canopy that a new tree needs several decades to rebuild.
  Based on: `canopy-by-age`, `interception-size`.
  Caveat: Growth depends on species and root space.
  Visual: quote · id `old-tree-inference`

### Give trees more root space (Grössere Baumrabatte)

Enlarge the planted area and the soil volume around a street tree, so roots get water and air.

Mechanisms: SWEAT · SHADE · ABSORB · knowledge catalogue: `enlarged-tree-pit`

- **Basel data** · About 72 % of Basel's street trees (9,046 of 12,504, recomputed on 2026-10-10 from the live open datasets) stand in surfaces the official survey maps as sealed, so their pit is probably too small to be mapped. The rest stand in mapped planting strips.
  Source: [data.bs.ch 100052 + 100477](https://data.bs.ch/explore/dataset/100052/).
  Method: Tree point inside sealed vs planted land-cover polygon.
  Caveat: An enlarged pit still below the mapping threshold counts as sealed.
  Visual: share · id `sealed-trees`

- **Official** · Bern's guidance sets a target root space of 36 m³ per street tree, with pits at least 1 m deep (1.5 m where needed).
  Source: [Stadt Bern: Arbeitshilfe Wurzelraum für Strassenbäume](https://www.bern.ch/themen/planen-und-bauen/bern-baut/arbeitshilfen/wurzelraum-fuer-baeume-im-strassenraum/anhang/arbeitshilfe-wurzelraum-fur-strassenbaume-version.pdf).
  Visual: slice · id `bern-36`

- **Research** · Small-leaved limes in Munich cooled their surroundings with up to 2.3 kW (sap flow up to 8 litres an hour); on narrow paved squares with small tree pits the cooling was at least 20 % lower than in open green squares.
  Source: [TU München press release, 14 Sept 2016 (Rahman et al.)](https://www.tum.de/en/about-tum/news/press-releases/details/33394/).
  Visual: bars · id `small-pits-cool-less`

- **Official** · In 2016 Basel announced that it would enlarge the tree pits of the Engelgasse and plant one young tree in each of 50 new, larger pits, because the old pits gave too little root space. Completion is not verified.
  Source: [Basel-Stadt media release 2016, Engelgasse](https://www.bs.ch/medienmitteilungen/bvd/2016-bessere-entfaltungsmoeglichkeiten-fuer-die-baeume-der-engelgasse).
  Visual: slice · id `engelgasse`

### Tree trench (sponge root bed) (Baumrigole)

A connected bed of load-bearing substrate under the pavement: roots grow in it, and runoff from the street is led into it.

Mechanisms: STORE · SLOW · SWEAT · SHADE · knowledge catalogue: `tree-trench`

- **Research** · The Stockholm method fills a large pit with coarse stones that carry the pavement; the gaps hold compost and biochar, roots, air and water. Trees grow larger and the bed takes street runoff.
  Source: [Vermont Urban & Community Forestry: Using the Stockholm planting method](https://vtcommunityforestry.org/sites/default/files/2025-06/Using-the-Stockholm-Planting-Method-to-Grow-Bigger-Trees.pdf).
  Visual: slice · id `stockholm`

- **Official** · Basel tests sponge-city elements in the new VoltaNord streets and monitors them scientifically for five years (CHF 280,000 approved).
  Source: [Regierungsratsbeschluss P251765](https://www.bs.ch/regierungsratsbeschluesse/P251765?backUrl=/apps/regierungsratsbeschluesse).
  Visual: map · id `voltanord-pilot`

- **Research** · ZHAW develops vegetation building blocks with draining, resource-saving substrates for three Basel streets: Therwilerstrasse, Lysbüchelstrasse and Weinlagerstrasse.
  Source: [ZHAW project 74640](https://www.zhaw.ch/de/forschung/projekt/74640).
  Visual: map · id `zhaw-streets`

### Water the young trees (Jungbäume wässern)

Newly planted trees need regular water for their first years, especially in hot, dry summers.

Mechanisms: SWEAT

- **Official** · The Woodland Trust advises about 50 litres a week for newly planted street trees in summer, for the first three years. Richmond (London) waters with about 10 litres every two days and plans 19 contractor visits a year for the first three years.
  Source: [Woodland Trust press release, June 2023; London Borough of Richmond: tree watering](https://woodlandtrust.org.uk/press-centre/2023/06/water-your-street-trees).
  Caveat: UK guidance, not Basel.
  Visual: count · id `50-litres`

- **Research** · A 2009 survey cited by the Woodland Trust found that 30 % of newly planted street trees die in their first years, often up to 50 %.
  Source: [Woodland Trust press release, June 2023](https://woodlandtrust.org.uk/press-centre/2023/06/water-your-street-trees).
  Caveat: UK figure from a survey cited by an NGO; causes vary, dry weather is one.
  Visual: count · id `young-mortality`

- **≈ Inference** · ≈ With hot days in Basel up from about 9 a year (1961–1990) to about 22 (2015–2024), the first summers are getting harder for new trees.
  Based on: `basel-hot-days`.
  Visual: trend · id `hot-days-link`

### Unseal (Entsiegeln)

Remove asphalt or concrete where it is not needed and replace it with soil and planting.

Mechanisms: ABSORB · SWEAT · COOL · knowledge catalogue: `depave`

- **Basel data** · 45 % of Basel-Stadt's ground is sealed; roads alone are 347 ha, sidewalks 153 ha.
  Source: [data.bs.ch 100477 Bodenbedeckung](https://data.bs.ch/explore/dataset/100477/).
  Method: Area of all land-cover polygons by class (36.6 km² total), see context fact basel-sealed.
  Visual: share · id `sealed-share`

- **Research** · In Manchester, grass lowered maximum surface temperatures by up to 24 °C compared with concrete; tree shade by up to 19 °C, and shade cut the temperature people feel (globe temperature) by 5–7 °C.
  Source: [Armson, Stringer & Ennos (2012), Urban Forestry & Urban Greening](https://research.manchester.ac.uk/en/publications/the-effect-of-tree-shade-and-grass-on-surface-and-globe-temperatu/).
  Visual: bars · id `grass-vs-concrete`

- **Research** · Compaction by construction cut soil infiltration by 70–99 % in a Florida study; without deliberate restoration, recovery can take decades.
  Source: [Gregor et al., Journal of Soil and Water Conservation (compaction study)](https://abe.ufl.edu/faculty/mdukes/pdf/stormwater/Gregor-et-%20al-JSWC-compaction-article.pdf).
  Caveat: Sandy Florida soils; the point is that unsealing alone is not enough, the soil must be loosened.
  Visual: bars · id `compaction`

- **Official** · At Sevogelstrasse, about 1,000 m² of asphalt will be unsealed and about 600 m² become green space, with 32 new trees (from spring 2026).
  Source: [Basel-Stadt media release 2025, Sevogelstrasse](https://www.bs.ch/medienmitteilungen/bvd/2025-sevogelstrasse-wird-gruen-32-neue-baeume-anlaesslich-fernwaermeausbau).
  Visual: slice · id `sevogel`

### Permeable parking (Versickerungsfähige Parkplätze)

Parking bays paved with grass-joint stones or open joints let rain soak in where cars stand.

Mechanisms: ABSORB · SLOW · knowledge catalogue: `permeable-parking`

- **Official** · Sevogelstrasse gets 14 parking bays with grass-joint stones; parking there goes from 36 to 19 spaces.
  Source: [Basel-Stadt media release 2025, Sevogelstrasse](https://www.bs.ch/medienmitteilungen/bvd/2025-sevogelstrasse-wird-gruen-32-neue-baeume-anlaesslich-fernwaermeausbau).
  Visual: count · id `sevogel-bays`

- **Research** · Studies report the infiltration capacity of permeable pavements falling by 63–100 % over time as joints clog; with regular cleaning, systems still performed after eight years.
  Source: [Villanova Urban Stormwater Partnership: permeable pavement](https://www.villanova.edu/content/dam/villanova/engineering/VUSP/2022/Permeable-Pavement.pdf).
  Caveat: Figures compiled from several studies; maintenance makes the difference.
  Visual: trend · id `clogging`

- **Official** · Basel tested surfaces for depaved parking spaces in 2022.
  Source: [Basel-Stadt media release 2022](https://www.bs.ch/medienmitteilungen/bvd/2022-die-suche-nach-dem-besten-untergrund-fuer-entsiegelte-parkplaetze).
  Visual: quote · id `basel-test`

### Rain garden (Versickerungsmulde)

A shallow planted hollow that collects runoff from nearby paving and lets it soak in or evaporate.

Mechanisms: STORE · ABSORB · SWEAT · knowledge catalogue: `rain-garden`

- **Research** · Across 20 US studies, bioretention retained, infiltrated or evaporated on average 66 % of the runoff flowing into it; unlined systems reduced volumes by 60–92 %.
  Source: [STEP bioretention synthesis (Toronto)](https://sustainabletechnologies.ca/app/uploads/2019/10/STEP_Bioretention-Synthesis_Tech-Brief-New-Template-2019-Oct-10.-2019.pdf).
  Visual: share · id `bioretention-66`

- **Official** · At Sevogelstrasse the new trees stand in mulch beds where rain from sidewalk and road collects and soaks in.
  Source: [Basel-Stadt media release 2025, Sevogelstrasse](https://www.bs.ch/medienmitteilungen/bvd/2025-sevogelstrasse-wird-gruen-32-neue-baeume-anlaesslich-fernwaermeausbau).
  Visual: slice · id `sevogel-beds`

- **Basel data** · The shallowest groundwater level over 10 years lies 0.8 m to 20.8 m below ground at Basel's monitoring stations (median 9.8 m).
  Source: [data.bs.ch 100180 groundwater statistics](https://data.bs.ch/explore/dataset/100180/).
  Method: Terrain height minus 10-year maximum level, shallowest per station (81 stations).
  Caveat: Point values; not interpolated between stations.
  Visual: map · id `groundwater-room`

- **≈ Inference** · ≈ Where groundwater can come within a metre or two of the surface (near the Birs), infiltration needs care; at most stations there are many metres of room.
  Based on: `groundwater-room`.
  Visual: map · id `groundwater-inference`

### Open the kerb (Randsteinöffnung)

A gap in the kerb lets road runoff flow into a rain garden or tree trench instead of the gully.

Mechanisms: SLOW · STORE · knowledge catalogue: `curb-cut`

- **Research** · Inlet design decides whether it works: small slope differences let low flows bypass the opening, and litter, leaves and sediment can block it.
  Source: [NACTO Urban Street Stormwater Guide: inlet design](https://nacto.org/publication/urban-street-stormwater-guide/stormwater-elements/bioretention-design-considerations/inlet-design).
  Visual: slice · id `inlet-design`

- **Research** · Curb cuts are breaks along a curb that let water flow into a planted bed.
  Source: [STEP LID guide: Inlets](https://wiki.sustainabletechnologies.ca/wiki/Inlets).
  Visual: slice · id `curb-cut-definition`

### Keep gullies clear (Strassenabläufe reinigen)

Leaves, litter and sand in gullies and inlets cause much of the local flooding; cleaning is a sponge action too.

Mechanisms: SLOW

- **Research** · In 12,000 resident flood reports from Haarlem and Breda, 70 % of the problems were caused by blocked gully pots, not by too little pipe capacity. Over ten years their damage equalled that of a once-in-a-century flood.
  Source: [TU Delft, M.-C. ten Veldhuis (2010)](https://delta.tudelft.nl/?p=109226).
  Visual: share · id `gullies-70`

- **Research** · Modelling showed clogged grated inlets capture about 7 % less water when mildly clogged and nearly 50 % less when severely clogged.
  Source: [Universidad de Zaragoza: impact of grated inlet clogging on urban pluvial flooding](https://zaguan.unizar.es/record/164077).
  Visual: bars · id `clogging-volume`

### Green roof (Dachbegrünung (extensiv))

A thin planted layer on a flat roof holds back and evaporates part of the rain.

Mechanisms: STORE · SLOW · SWEAT · COOL · knowledge catalogue: `green-roof`

- **Official** · In Basel-Stadt, flat roofs of 10 m² and more must be greened when built or renovated (§ 72 BPG), with at least 15 cm of regional soil and 20 cm on a third of the roof.
  Source: [Stadtgärtnerei Basel-Stadt: Stadtnatur fördern](https://www.bs.ch/bvd/stadtgaertnerei/biodiversitaet/stadtnatur-foerdern).
  Visual: slice · id `bpg-72`

- **Research** · Extensive green roofs in Southern Ontario retain 60–70 % of rain in the warm season and about 50 % over a full year; a roof in Syracuse retained 56 % over 21 months.
  Source: [STEP LID guide: green roofs](https://wiki.sustainabletechnologies.ca/wiki/Special:MobileDiff/15606).
  Caveat: North American climates; most is retained in small storms, much less in long heavy rain.
  Visual: share · id `retention-50`

### Roof garden (Dachgarten (intensiv))

Deeper substrate where the structure allows: more water held, more evaporation, more use.

Mechanisms: STORE · SWEAT · COOL · knowledge catalogue: `green-roof`

- **Official** · Depending on the building structure, thicker substrate can be used and roofs planted as gardens; the more intensive greening holds back and evaporates more water, helping to cool in summer. Semi-intensive and intensive roofs also need watering.
  Source: [Stadtgärtnerei Basel-Stadt: Stadtnatur fördern](https://www.bs.ch/bvd/stadtgaertnerei/biodiversitaet/stadtnatur-foerdern).
  Visual: slice · id `deeper-holds-more`

### Rain barrel or cistern (Regentonne / Zisterne)

Collect roof water at the downpipe for watering; it only helps in a storm if it is empty before the rain.

Mechanisms: STORE

- **Research** · A household study found people rarely empty their rain barrels, and a full barrel does nothing in a storm; a slow-release valve that drains it over 24 hours was proposed.
  Source: [Insurance Bureau of Canada, Wingham rain barrel study (2012)](https://insurance-canada.ca/2012/06/01/ibc-old-fashioned-rain-barrels-can-help-solve-a-modern-day-problem/).
  Visual: quote · id `full-barrel`

- **Research** · A modelling study estimated 87 % annual retention for a green roof that re-used water from a cistern, against 43 % for the green roof alone.
  Source: [STEP LID guide: green roofs (Florida study)](https://wiki.sustainabletechnologies.ca/wiki/Special:MobileDiff/15606).
  Visual: bars · id `roof-plus-cistern`

### Disconnect the downpipe (Fallrohr abkoppeln)

Lead roof water into a garden or bed instead of the sewer.

Mechanisms: ABSORB · SLOW

- **Official** · Portland (Oregon) disconnected more than 50,000 downspouts since 1995, removing over 1.2 billion gallons (about 4.5 million m³) of stormwater a year from its combined sewer.
  Source: [City of Portland, Downspout Disconnection Program record](https://efiles.portlandoregon.gov/record/3548994/file/document).
  Caveat: Program figures as reported by the city.
  Visual: count · id `portland`

### Water square (Wasserplatz)

A public square that is a place to sit and play when dry and a temporary storage basin in heavy rain.

Mechanisms: STORE · SLOW

- **Official** · Rotterdam's Benthemplein water square can store about 1,800 m³ of rainwater.
  Source: [Klimaatadaptatie Nederland: Rotterdam water squares](https://klimaatadaptatienederland.nl/en/@163422/rotterdam-water).
  Visual: count · id `benthemplein`

### Dig once (Gleichzeitig bauen)

When a street is opened anyway for pipes, heating or tracks, rebuild it as a sponge street in the same works.

Mechanisms: ABSORB · STORE · SHADE

- **Official** · Basel uses the district-heating build-out (about 60 km more by 2037) to redesign streets for a better climate: heat protection on about 30 streets so far, with new trees, green areas and unsealing.
  Source: [Basel-Stadt media release, 16 July 2025](https://www.bs.ch/medienmitteilungen/bvd/2025-kanton-sorgt-anlaesslich-des-fernwaermeausbaus-fuer-besseren-hitzeschutz-auf-gut-30-strassen).
  Visual: map · id `fernwaerme-30`

- **Official** · 55 % of Basel's district-heating projects hold potential for unsealing and greening.
  Source: [Basel-Stadt media release 2025, Sevogelstrasse](https://www.bs.ch/medienmitteilungen/bvd/2025-sevogelstrasse-wird-gruen-32-neue-baeume-anlaesslich-fernwaermeausbau).
  Visual: share · id `fernwaerme-55`

- **Basel data** · Basel's public-ground permits name utility, sewer, heating, water, gas, electricity or house-connection works in 7,032 construction-site and excavation permits; 334 of them end after 3 October 2026.
  Source: [data.bs.ch 100018 Allmendbewilligungen](https://data.bs.ch/explore/dataset/100018/).
  Method: Keyword match on permit texts (solutions/data-charter-map/fetch.mjs).
  Caveat: Permits show activity, not the network.
  Visual: map · id `permit-trail`

- **≈ Inference** · ≈ Each upcoming permit is a window: the street is open anyway, so a tree trench or unsealing costs less than on its own.
  Based on: `permit-trail`, `fernwaerme-55`.
  Visual: map · id `dig-once-inference`
