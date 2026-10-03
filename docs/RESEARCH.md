# Sponge-city research and technical landscape

Captured: 3 October 2026 (Europe/Zurich).

## Evidence status

This document preserves the research synthesis and links supplied in the preceding project conversation. Sources and repositories have **not been independently re-audited in this repository-writing step**. Treat descriptions, licences, maturity and novelty claims as research leads until checked against primary sources. No third-party code has been copied.

The earlier search did not identify an exact match for our combined heat + runoff + canopy + intervention canvas. That is a bounded search observation, not proof that no such tool exists.

## Topic foundations

Sponge-city planning keeps rainfall near where it falls through collection, retention, infiltration, evaporation and reuse. The proposed product connects water management to shade, vegetation, tree water supply and cooling. These benefits depend on site conditions and ongoing maintenance.

Related traditions include Blue-Green Infrastructure (BGI), Sustainable Urban Drainage Systems (SuDS), Low Impact Development (LID), Water Sensitive Urban Design (WSUD) and Nature-Based Solutions (NbS). They provide useful vocabularies and precedents, but should not be treated as identical standards.

Primary/local starting points from the earlier research:

- [Basel: implementation of the urban climate concept](https://www.bs.ch/schwerpunkte/klima/stadtklima/umsetzung-stadtklimakonzept)
- [Basel: Basel wird Schwammstadt](https://www.bs.ch/medienmitteilungen/bvd/2022-basel-wird-schwammstadt)
- [US EPA: urban street trees and green infrastructure](https://www.epa.gov/water-research/urban-street-trees-and-green-infrastructure)

Street trees are a useful bridge between water and heat: shade above ground and potentially stormwater storage/infiltration and water supply below. Actual performance requires suitable design and sufficient water.

## Research precedents

### Multi-Criteria GIS for Sponge City Planning with Open Data Sources in Vigo (2024)

[Paper and publication record](https://isprs-annals.copernicus.org/articles/X-4-W5-2024/41/2024/isprs-annals-X-4-W5-2024-41-2024.html)

The earlier synthesis describes an open-data GIS/multi-criteria approach combining terrain, hydrogeology, land cover, demographics, imperviousness, vegetation and surface temperature to screen intervention suitability. Relevance: spatial screening can identify where to investigate; it cannot establish engineering feasibility alone. Inspect the full paper before choosing thresholds, weights or transferring the method to Basel.

### Other leads

- [Water 2019, 11(10), 2024](https://www.mdpi.com/2073-4441/11/10/2024): terminology/background lead from the earlier conversation; verify title and relevant claims.
- [Journal of Environmental Management article record, 2026](https://www.sciencedirect.com/science/article/pii/S0301479726021468): earlier research described GIS/AI planning for blue-green roofs and street trees. Bibliographic details and methods still need verification; do not use as established evidence yet.

## GitHub implementation leads

| Project | Earlier synthesis / reuse idea | Verification needed |
|---|---|---|
| [US EPA SWMM](https://github.com/USEPA/Stormwater-Management-Model) | Downstream rainfall-runoff and LID simulation engine | Official docs, licence, model inputs, calibration and limitations |
| [SWMMLIDOPT](https://github.com/ElhadiMohsenAbdalla/SWMMLIDOPT) | SWMM + land-use/intervention constraints + multi-objective optimisation; potential Pareto alternative generation | Existence, implementation, NSGA-II details, licence and runnable example |
| [USEPA Greenopt](https://github.com/USEPA/Greenopt) | Alternative green-infrastructure plans and trade-off presentation | Supported objectives, dependencies, licence, maintenance |
| [Rhodium-SWMM](https://github.com/NastaranT/rhodium-swmm) | Green-infrastructure decisions under uncertainty | Exact workflow, examples and licence |
| [OSTRICH-SWMM](https://github.com/lsmatott/ostrich-swmm) | Optimisation around SWMM | Interfaces, supported versions and licence |
| [Criterra Nature for Cooling](https://github.com/Dimitrios-Kafetzis/CriterraNatureCoolingTool) | Site characteristics → intervention suitability → constraints/evidence/report; conceptually close to our canvas | Earlier claims of Apache-2.0, Leaflet and 121 interventions require confirmation |
| [UrbanLens](https://github.com/LambSystems/UrbanLens) | Geospatial evidence → hotspots → ranking → planning suggestions | Actual functionality, data provenance, licence, reproducibility |
| [Urban heat stress hotspot detection](https://github.com/Priyal-Deshmukh/urban-heat-stress-hotspot-detection) | Heat-first pipeline using vegetation, built form, temperature and population indicators | Actual input layers, method, licence and demo validity |
| [Sponge City Karachi](https://github.com/Mirza-Abdul-Wasay5704/FYP-2-Sponge-City-Karachi) | Terrain/wetness indicators as a possible portability fallback | TWI computation, urban applicability, code quality and licence |

The earlier conversation also linked [openswmm.engine](https://github.com/wanghai1988/openswmm.engine). Prefer the official EPA upstream when investigating the engine; evaluate forks only for a concrete missing capability.

## What to learn from these projects

1. **Expose alternatives.** Trade-offs between water, cooling, cost and constraints belong in the decision surface.
2. **Screen before simulating.** Candidate discovery and detailed hydraulic design are different stages.
3. **Make uncertainty operational.** An unknown infiltration rate should trigger an investigation, not an invented suitability value.
4. **Reuse mature engines downstream.** If calibrated hydrology becomes necessary, investigate SWMM rather than writing an engine.
5. **Separate site description from intervention logic.** A typed profile supports explanations, similarity search and portability.

DEM-derived slope, flow accumulation and Topographic Wetness Index may provide terrain indicators when authoritative runoff mapping is unavailable. They are not equivalent substitutes for an urban hazard model: buildings, drains, culverts and engineered flow routes matter. Any fallback must be labelled and validated.

## Build versus reuse

| Layer | Proposed approach |
|---|---|
| Basel ingestion and provenance | Build local adapters after verifying access/licences |
| Raster/vector processing | Reuse GDAL, Rasterio and GeoPandas where appropriate |
| Map interface | Choose MapLibre or Leaflet after inspecting delivery/data needs |
| Heat, runoff, canopy and trees | Use authoritative regional datasets; preserve their limits |
| Intervention vocabulary | Adapt documented BGI/LID taxonomies with attribution |
| Site compatibility rules | Build transparent rules informed by verified literature |
| Evidence, unknowns and explanations | Build as a central product capability |
| Detailed hydrological simulation | Defer; assess SWMM if needed |
| Optimisation | Defer; investigate existing Pareto/robust-decision workflows |
| LLM | Optional structured explanation/querying; no spatial truth inference |

## Research backlog before implementation

- Confirm each candidate repo exists and inspect README, licence, recent activity, tests and example data.
- Record exact versions/commits and reuse permission before copying any code or intervention catalogue. Public availability is not a licence.
- Read the Vigo methodology and test whether its criteria transfer to Basel.
- Find authoritative local data endpoints and record access, licence, CRS, resolution, scenario year and coverage.
- Read FOEN runoff-map technical limitations and distinguish surface runoff from river flooding and sewer capacity.
- Check whether canopy years are comparable and which trees the inventory covers.
- Validate proposed interventions with local planning constraints and identify missing feasibility data.
- Reconstruct the real Basel decision process and data hand-offs; see [Governance and measurement](GOVERNANCE-AND-MEASUREMENT.md).
- Locate or confirm the status of the first Stadtklimakonzept indicator/controlling report scheduled for 31 July 2025.
- Obtain the VoltaNord monitoring protocol and publication schedule before designing a parallel measurement system.

The strongest working contribution is **evidence → typed place profile → compatibility and unknowns → inspectable decision canvas**. This is a design direction supported by the research leads, not a demonstrated claim of uniqueness.
