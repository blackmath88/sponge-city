# ZHAW / VoltaNord public-source check

Search date: **2026-10-03**. Scope: public code, data, measurement concepts and sensor schemas related to the ZHAW IUNR (Wädenswil) monitoring of the Basel VoltaNord sponge-city pilots.

Claim tags: **[confirmed]** read directly at the cited source · **[inferred]** reasonable reading, not stated by the source · **[unknown]** not determinable from public material.

## Summary

- **No public code, sensor schema, processing pipeline or dataset exists for VoltaNord (ZHAW 80788) or its predecessor (74640).** [confirmed for every source listed under "Not found"; absence elsewhere is unknown]
- No ZHAW or IUNR GitHub organisation works on urban hydrology, trees or sponge cities. Searches found no GitHub account officially linked to any team member, so step 3 (personal accounts) did not apply. [confirmed]
- The closest public material from the same team is **method-level**: two CC BY 4.0 conference presentations on Zenodo about structurally stable tree substrates and sponge-city vegetation systems (Wädenswil and Zurich field trials). There are also a few ZHAW digitalcollection entries, mostly with no full text or an unspecified licence. [confirmed]
- The 74640 project page says a **measurement concept was designed for three street locations** in Basel. This is the most relevant missing artefact, and it is not published. [confirmed that it is mentioned; its content is unknown]
- Basel open data (data.bs.ch, CC BY 4.0) covers parts of the Place Profile, such as trees, canopy, land cover, groundwater and climate. None of it is VoltaNord monitoring data. [confirmed]

## Findings

### F1 — ZHAW project page 80788 "Monitoringkonzept VoltaNord Pilot Schwammstadtstrassen"

| Field | Value |
|---|---|
| URL | <https://www.zhaw.ch/de/forschung/projekt/80788> |
| Owner | ZHAW, IUNR [confirmed] |
| Verification | Official ZHAW research database [confirmed] |
| Contents | Start May 2026, ongoing, five-year duration. Client "Stadtgrün Basel". Lead Stefan Stevanovic, deputy Doris Tausendpfund, team Heinrich, Hertig, Bertschy, Iten. Four indicators: tree/understorey vitality, root development, infiltration capacity, soil water balance. [confirmed] |
| Code / data / protocol | None linked. The page says nothing about publishing data. [confirmed] |
| Licence | Not stated (ordinary web page) [confirmed] |
| Last activity | Page live on 2026-10-03; last edit date [unknown] |
| Place Profile relevance | **possibility** → `infiltration` and `existing_tree_count`/tree vitality are the indicators that correspond. **potential_effect** → VoltaNord is the only Basel source of *site effect observed* evidence (claim ladder level 3) for these four indicators. **need** → none (heat and runoff exposure are not among the indicators). [inferred] |

Already recorded in `data/evidence-atlas.json` as `project-voltanord-monitoring`.

### F2 — ZHAW project page 74640 "Schwammstadt-Vegetationsbausteine für Basel-Stadt"

| Field | Value |
|---|---|
| URL | <https://www.zhaw.ch/de/forschung/projekt/74640> |
| Owner | ZHAW, IUNR. Client: Basel-Stadt, Bau- und Verkehrsdepartement, Stadtgärtnerei [confirmed] |
| Verification | Official ZHAW research database [confirmed] |
| Contents | Sep–Dec 2024, completed. Lead Axel Heinrich, deputy Doris Tausendpfund, team Bertschy and Stevanovic. Evaluated existing sponge-city components and developed improved vegetation elements: draining, resource-efficient, structurally stable substrates plus site-appropriate vegetation. **"A measurement concept was designed to document effectiveness at three street locations."** [confirmed] |
| Code / data / protocol | None linked. The measurement concept is not published. [confirmed] |
| Licence | Not stated [confirmed] |
| Last activity | Project ended 12/2024 [confirmed] |
| Place Profile relevance | **possibility** → the substrate/vegetation specs would define the requirements of a "connected tree trench" candidate. The three-street measurement concept is probably the predecessor of the 80788 protocol [inferred]. Whether the three streets are in VoltaNord is [unknown]. |

### F3 — Zenodo: EFUF 2023 presentation "Structurally stable substrates for sustainable green infrastructure and stormwater management: a field trial with urban trees in Wädenswil"

| Field | Value |
|---|---|
| URL | <https://zenodo.org/records/10698162> (DOI 10.5281/zenodo.10698162) |
| Owner | Uploaded to the `efuf` and `clearinghouse` Zenodo communities. Creators listed as Stefanovic [sic], Hertig, Heinrich [confirmed] |
| Verification | Creator names and topic match the 80788 team [confirmed]. The record lists no affiliations or ORCIDs, so the link to ZHAW rests on the topic and the Wädenswil location [inferred] |
| Contents | One PDF of slides, presented at EFUF 2023 (Kraków, 24–26 May 2023). No dataset or code. [confirmed] |
| Licence | **CC BY 4.0** [confirmed]. Can be cited and reused with attribution; nothing is copied here. |
| Last activity | Published 2023-05-25 [confirmed] |
| Place Profile relevance | **possibility** → field-trial evidence on substrate performance for tree trenches (claim ladder level 1–2, mechanism supported, *not* a Basel site observation). Likely shows which variables the team measures (soil sensors, growth) [inferred, slides not inspected in detail]. |

### F4 — Zenodo: EFUF 2023 presentation "Sponge city principle for sustainable urban tree growth: innovative substrate and vegetation systems in Zurich's industrial district"

| Field | Value |
|---|---|
| URL | <https://zenodo.org/records/10698196> (DOI 10.5281/zenodo.10698196) |
| Owner | Creators Heinrich, Saluz, Hertig, Stevanovic. Communities `efuf`, `clearinghouse` [confirmed] |
| Verification | Same as F3 [confirmed names / inferred affiliation] |
| Contents | One PDF of slides. No dataset or code. [confirmed] |
| Licence | **CC BY 4.0** [confirmed] |
| Last activity | Published 2023-05-25 [confirmed] |
| Place Profile relevance | **possibility / potential_effect** → Zurich precedent for the same component family that VoltaNord tests. Useful as *mechanism supported* evidence only. [inferred] |

### F5 — ZHAW project page 81151 "Schwammstadt Scheuchzerstrasse in der Stadt Zürich" (sister project, not Basel)

| Field | Value |
|---|---|
| URL | <https://www.zhaw.ch/de/forschung/projekt/81151> |
| Owner | ZHAW IUNR. Funder: City of Zurich, Tiefbauamt. Partner: Monitron AG [confirmed] |
| Verification | Official ZHAW research database [confirmed] |
| Contents | Started July 2026. **Same team and roles as 80788.** Methods named: *Bonituren* (visual vitality scoring), **dendrometer measurements** and **soil sensors** for tree growth and soil water/energy balance in tree-trench substrates. [confirmed] |
| Code / data | None linked [confirmed] |
| Licence | Not stated [confirmed] |
| Place Profile relevance | This is the most specific public description of the instrumentation the team uses, so VoltaNord probably uses similar methods [inferred, not confirmed for Basel]. It suggests evidence fields such as `tree_vitality_score`, `stem_growth_dendrometer` and `soil_water_*`. The sensor vendor or type (e.g. Watermark, tensiometer) is [unknown]. |

### F6 — ZHAW digitalcollection: related team outputs (metadata only)

All [confirmed] from the DSpace API at `digitalcollection.zhaw.ch`:

| Record | Type / date | Licence | Relevance |
|---|---|---|---|
| [Beispiele von Schwammstadt-Vegetationsbausteinen aus Schweizer Städten](https://digitalcollection.zhaw.ch/handle/11475/34002) (Bertschy) | Conference talk, 2025-06 | Not specified | Possibly includes Basel examples [unknown]. Metadata only, no full text attached [inferred]. |
| [Beläge in der Schwammstadt](https://digitalcollection.zhaw.ch/handle/11475/35772) (Bertschy) | Conference talk, 2026-01 | Not specified | Keywords: infiltration capacity, permeable paving, thermography → **possibility.infiltration** and the permeable-pavement intervention. |
| [Kommunizierende Baumrigolen](https://digitalcollection.zhaw.ch/handle/11475/33090) (BSc, advisors Stevanovic & Heinrich) | Thesis, 2023, DOI 10.21256/zhaw-33090 | **CC BY 4.0** | Literature review on connected tree trenches → requirement checklist for the "connected tree trench" candidate. |
| [Langfristige Infiltrationsleistung sickerfähiger Beläge](https://digitalcollection.zhaw.ch/handle/11475/36855) | BSc thesis, 2025 | **CC BY 4.0** | Long-term infiltration of permeable pavements → evidence for **possibility.infiltration** assumptions. |
| [Bewässerte Klima-Dachbegrünung im Gundeldinger Feld, Basel](https://digitalcollection.zhaw.ch/handle/11475/34380) | MSc thesis, 2025, DOI 10.21256/zhaw-34380 | **CC BY 4.0** | A Basel site with measured surface and air temperatures (May–Oct 2024). It is not VoltaNord or a street, but it is local **potential_effect** (cooling) evidence for green roofs. |
| [Schwammstadt und Superblock](https://digitalcollection.zhaw.ch/handle/11475/31639) (Stevanovic, Eggimann) | Journal article, 2024 | Publisher contract | Framing only. |

No digitalcollection record mentions VoltaNord, and none is typed as research data for this topic. [confirmed]

### F7 — Basel open data (opendatabs / data.bs.ch): context datasets, not VoltaNord monitoring

All carry **CC BY 4.0** (some with an OpenStreetMap base-map attribution) and were updated in 2026 [confirmed via the data.bs.ch catalogue API]. Publisher verification: the official cantonal portal [confirmed].

| Dataset | Publisher | Place Profile slot |
|---|---|---|
| [100052 Baumkataster: Baumbestand](https://data.bs.ch/explore/dataset/100052/) | Stadtgärtnerei | possibility.existing_tree_count (already listed in DECISION-CANVAS.md) |
| [100054 Baumkataster: Fäll- und Baumersatzliste](https://data.bs.ch/explore/dataset/100054/) | Stadtgärtnerei | possibility, plus a tree-stress proxy for need [inferred] |
| [100357 Baumkronenbedeckung](https://data.bs.ch/explore/dataset/100357/) | Stadtgärtnerei | possibility.canopy_fraction |
| [100477 Bodenbedeckung](https://data.bs.ch/explore/dataset/100477/) | Grundbuch- und Vermessungsamt | possibility.sealed_fraction |
| [100164 Wasserstand Grundwasser](https://data.bs.ch/explore/dataset/100164/) / [100180 statistics](https://data.bs.ch/explore/dataset/100180/) | Amt für Umwelt und Energie | possibility.infiltration (groundwater constraint) |
| [100291](https://data.bs.ch/explore/dataset/100291/) / [100292 Gewässerschutzkarte](https://data.bs.ch/explore/dataset/100292/) | AUE | possibility (infiltration exclusion zones) |
| [100009 Smart Climate Luftklima](https://data.bs.ch/explore/dataset/100009/) + [100082 station locations](https://data.bs.ch/explore/dataset/100082/) | meteoblue AG | need.day_heat / night_heat (point network) |
| [100254 NBCN Basel-Binningen daily](https://data.bs.ch/explore/dataset/100254/) | MeteoSchweiz | rainfall forcing / context |

The `opendatabs/data-processing` repo (GitHub org of the Basel statistical office) has no ETL for soil moisture, sponge-city or VoltaNord data. Its only "stadtgaertnerei" pipeline (`stadtgaertnerei_spielen`) concerns playgrounds and is irrelevant. [confirmed by code search]

### F8 — Adjacent precedent (not ZHAW): Berlin "Baumblick" street-tree suction-tension viewer

| Field | Value |
|---|---|
| URL | <https://github.com/technologiestiftung/baumblick-frontend> |
| Owner | Technologiestiftung Berlin (organisation account) [confirmed] |
| Verification | Organisation repo. Turned up only because it was the sole GitHub code hit for "Saugspannung" [confirmed] |
| Contents | Map UI showing soil suction tension per street tree from underground sensors plus model nowcasts, with a story page `pages/stories/saugspannung-und-sensoren.mdx` [confirmed]. Running in demo mode with static data since July 2024 [confirmed per repo page] |
| Licence | **MIT** [confirmed on repo page; verify the LICENSE file before any reuse] |
| Last activity | Demo mode since 2024-07-11 [confirmed]. Last commit date [unknown] |
| Place Profile relevance | Interaction precedent for presenting `soil_water_balance` per tree. It has no Basel data and is no evidence of VoltaNord methods. [inferred] |

## Not found

| Searched | Where | Result |
|---|---|---|
| `VoltaNord`, `Volta Nord`, `Lysbüchel`, `Schwammstadt` (repo names, descriptions) | GitHub repository search | 0 repos |
| `VoltaNord` | GitHub code search | Only this repo, `blackmath88/hack-am-rhein` and unrelated text corpora / domain lists |
| `Schwammstadt Basel` | GitHub code search | No ZHAW, Stadtgärtnerei or cantonal code |
| `Saugspannung Watermark tensiometer` | GitHub code search | Only F8 (Berlin) |
| ZHAW orgs (`zhaw` org search, ~115 accounts) | GitHub | None for IUNR urban greening, trees or hydrology. `zhaw-data-analysis-and-monitoring` holds course material for a Circular Economy MSc module, so it is irrelevant |
| `iunr`, `zhaw-iunr` | GitHub user/org search | No institutional account |
| Stadtgrün / Stadtgärtnerei Basel | GitHub | No organisation found |
| `opendatabs` org (27 repos); code search for `bodenfeuchte`, `Schwammstadt`, `Baumkataster` | GitHub | No sponge-city or soil-moisture processing |
| `VoltaNord`, `Volta Nord`, `Baumrigole`, `"sponge city" AND Basel`, ZHAW-affiliated urban-tree records | Zenodo API | 0 hits |
| Creators Tausendpfund, Bertschy | Zenodo API | Only same-surname records in unrelated fields (not recorded) |
| `VoltaNord` | ZHAW digitalcollection | 0 relevant hits |
| Research-data item type for Schwammstadt / Stadtbaum | ZHAW digitalcollection | None |
| `schwamm`, `versickerung`, `stadtklima`, `volta` | data.bs.ch catalogue | 0 datasets |
| ORCID for the six team members | ORCID public API | Tausendpfund, Heinrich (ZHAW), Hertig, Bertschy, Iten: no records. Stevanovic: 3 same-name records, none with a ZHAW affiliation, works or links, so none can be verified as the project lead and none is used |
| GitHub/ORCID/Zenodo links on ZHAW staff pages | zhaw.ch person pages for Heinrich, Hertig, Iten (Stevanovic, Tausendpfund, Bertschy slugs not resolved) | No links |
| ResearchGate project pages | — | Not checked (needs login / not machine-readable) [unknown] |
| Personal GitHub accounts | — | Not searched. No official source links one (rule 3) |

## Recommendation

**Yes, contacting the project lead directly is the better route.** Public search is exhausted:

1. The protocol, sensor types, site list, baselines, cadence, data dictionary and data rights for VoltaNord are not public anywhere we can reach. [confirmed]
2. 80788 started only in May 2026 and 81151 in July 2026. First data or reports are unlikely before at least one vegetation season has passed [inferred].
3. The most useful existing artefact is the **74640 measurement concept for three Basel streets** (2024). It belongs to the client (Stadtgärtnerei) and ZHAW. Ask for it explicitly, along with the 80788 indicator dictionary.

Suggested ask (keep it short, through the official project contact on the ZHAW 80788 page and, in parallel, Stadtgärtnerei as client):

- Can the hackathon team see the indicator list, units and measurement cadence (no raw data needed)?
- Are the 74640 three-street measurement concept and the 80788 site list shareable, and under what terms?
- Is there a planned publication route (Zenodo, digitalcollection, data.bs.ch) and timeline?
- Would they review how our Place Profile maps their four indicators (see the F1 row)?

This matches the "VoltaNord learning agreement" already proposed in [QUERYABLE-EVIDENCE-ATLAS.md](QUERYABLE-EVIDENCE-ATLAS.md). Until then, use the F3–F6 material only as *mechanism supported* evidence and the F7 datasets for need/possibility screening. Do not present any VoltaNord result as observed.
