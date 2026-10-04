# Basel Site Scoping Tool

Internal research and decision-support dashboard for the Hack am Rhein **Make Basel a Sponge** challenge. It helps the team discover evidence, frame heat/water overlap, and compare candidate sites before building a public-facing prototype.

## What it is / is not

It is a lightweight, inspectable workspace for dataset discovery, provisional hotspot discussion, and site shortlisting. It is **not** a public product, a validated hazard map, engineering guidance, or a predictive city-wide model. Candidate areas and their current normalized indicators are illustrative placeholders, not measured Basel analysis. Do not present their numeric ranking as a factual claim.

## Run locally

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` performs the TypeScript check and production build.

## Architecture

- `src/data/sources.ts`: source registry, including a disabled border-region extension stub.
- `src/lib/connectors.ts`: Basel Opendatasoft Explore API and opendata.swiss CKAN catalog adapters; normalize records to a shared model.
- `src/data/seed-datasets.ts`: prioritized discovery leads available before network refresh.
- `src/data/areas.ts`: temporary Basel candidate-area fixture and explicit provenance/unknowns.
- `src/lib/scoring.ts`: explainable normalized indicator scoring.
- `src/ui/`: searchable catalog, Leaflet basemap, site detail, shortlist and comparison.

Connectors call public catalogs directly from the browser. If a catalog blocks cross-origin requests, use the seed records or add a small local proxy/cache; no credentials are required. Catalog live records replace that source's seed entries when refresh succeeds. Dataset relevance toggles and shortlist entries are browser-local state.

## Data model

The shared interfaces are in `src/types.ts`: `DatasetSource`, `DatasetMetadata`, `SelectedAnalysisLayer`, `AreaIndicators`, `ScoreComponent`, `ScopingScoreBreakdown`, and `SiteShortlistEntry` (plus `CandidateArea`). Connector output retains source-specific IDs while exposing common metadata, tags, formats, fields, geography, endpoint, and suitability flag.

## Initial dataset priorities

The seed catalog lists Stadtklimaanalyse (heat/night cooling/ventilation), city tree inventory (shade proxy), surface runoff/heavy-rain layers, land cover/imperviousness, and green/sponge-city adaptation projects. These are **discovery targets**, not guarantees of exact dataset titles or currently exposed APIs. Inspect `data.bs.ch` and `map.geo.bs.ch` to confirm catalog IDs, temporal coverage, units, geometry, license and field schema. Seed field names/types are explicitly examples to guide inspection, not asserted source attributes. Live catalog metadata displays field names/types when provided by the API; opendata.swiss search results generally do not expose resource schemas, so open the resource to inspect fields. Use opendata.swiss for national discovery and validate Basel spatial coverage. Nearby French/German catalogs are registry stubs only; they never enter Basel scoring.

## Scoring assumptions and interpretation

`scoreArea` takes provisional 0–1 indicators where higher means more scoping concern/opportunity (including *deficit* or *poor cooling*, not raw canopy/cooling). It applies weights: heat 25%, poor night cooling 20%, canopy deficit 15%, sealed surface 15%, runoff relevance 20%, cooling opportunity 5%. Available dimensions are renormalized to sum to 100%; the score is rounded to 0–100. The breakdown exposes every dimension, weight, and point contribution. Evidence confidence is a separate qualitative flag, based on available dimensions and the provisional evidence-quality input.

The score prioritizes discussion, not hazard severity or feasibility. Equal-area units and aligned indicator scales are assumed but not implemented yet. Avoid double-counting correlated indicators; calibrate against verified datasets, local knowledge, and site visits. The map uses standard OpenStreetMap tiles with a planning view and a CSS high-contrast analysis view; it does not reproduce the official MapBS style or its authoritative layers. It requires an internet connection and follows the OpenStreetMap tile usage policy; avoid bulk downloading or high-volume automated use. Satellite imagery is not included. The 20 candidate pins and area fixtures remain schematic/illustrative and must be replaced with Basel-Stadt-bounded geometries and spatial joins before the scores are used for site decisions. The top 5/10/20/50 control displays up to the available 20 screening points. Missingness, dates, resolution, uncertainty and local constraints should travel with every derived indicator. Intervention directions are prompts requiring feasibility validation.

## Next implementation steps

1. Validate source dataset IDs, schemas, formats, licenses and freshness; add sample-record/layer previews.
2. Select an analysis unit and Basel-Stadt boundary; load official geometries and derive indicators with provenance and null handling.
3. Replace illustrative pins with verified Basel-Stadt geometries, then add real layer toggles; keep scoring weights configurable.
4. Improve shortlist notes, compare evidence/missingness, and field-validate top candidates with the team.
