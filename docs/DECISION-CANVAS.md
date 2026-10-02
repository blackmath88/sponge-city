# Decision Canvas

Status: working concept captured from the project conversation on 3 October 2026 (Europe/Zurich). Proposed scope and examples are design hypotheses, not measured findings.

## Thesis

Basel has separate evidence about heat, water and vegetation. Decision Canvas connects that evidence to candidate interventions: **where should a planner investigate, what could work there, why, and what remains unknown?**

The contribution is a spatial decision-support/compiler layer between city datasets and interventions. Detailed hydrological simulation is a possible downstream integration.

## Scale and demo story

Start at neighbourhood scale and move to one site:

1. Select a neighbourhood with usable source coverage.
2. Identify roughly 5–20 candidate locations if the evidence supports that number.
3. Inspect one street, square or courtyard in depth.
4. Show the underlying evidence and its limitations.
5. Compare compatible interventions and their trade-offs.
6. Find places with a similar evidence profile.

The number of candidates is an MVP target, not a finding. A micro-scale demonstration must not claim city-wide validity.

## Three separate questions

| Dimension | Question | Relevant evidence |
|---|---|---|
| Need | Where would intervention be valuable? | Day/night heat, surface runoff, tree stress, exposure and vulnerability where data exists |
| Possibility | What could physically and institutionally work? | Surface type, available area, slope, soil, utilities, ownership, existing trees and air corridors |
| Potential effect | What benefits might a candidate provide? | Infiltration, storage, slower flow, evapotranspiration, shade, cooling |

High need with low feasibility differs from moderate need with an unusually good opportunity. Keep these dimensions visible instead of hiding them inside a single “Sponge Score”.

## Interaction

The proposed **sponge lens** lets the user select a real place on a map and inspect its profile. The canvas exposes:

- Place identity and analysis boundary.
- Heat, runoff and vegetation evidence.
- Compatible interventions and the reasoning behind each.
- Constraints, unknowns and the next investigations required.
- Source links, dates, scenario years, resolutions and derivation methods.

The main action is **Why here?** It expands the evidence behind the recommendation. **Show me places like this** compares typed profiles, displaying which dimensions match and which remain unknown.

Use the approachable verbs **ABSORB · STORE · SLOW · SWEAT · SHADE · COOL** as benefit labels. They describe mechanisms; they do not promise quantified performance.

## Computational architecture

1. Ingest licensed raster/vector sources and retain provenance.
2. Align coordinate systems, extents, spatial units and temporal/scenario metadata.
3. Calculate spatial observations deterministically.
4. Compile a typed Place Profile.
5. Apply explicit intervention requirements and contraindications.
6. Produce an Intervention Compatibility Matrix.
7. Optionally use Apertus/another LLM to explain the structured result or interpret a query.

An LLM must not invent spatial observations, feasibility, engineering dimensions or benefit estimates. Its explanation should reference the supplied evidence and preserve unknowns. Core analysis and a readable result should remain available without it.

## Place Profile: proposed structure

The following is illustrative and contains no measurements for an actual Basel location:

```json
{
  "schema_version": "place-profile/draft-0",
  "place_id": "illustrative-segment",
  "geometry_ref": null,
  "need": {
    "day_heat": {"status": "unknown", "evidence_ids": []},
    "night_heat": {"status": "unknown", "evidence_ids": []},
    "surface_runoff": {"status": "unknown", "evidence_ids": []}
  },
  "possibility": {
    "canopy_fraction": {"status": "unknown", "evidence_ids": []},
    "sealed_fraction": {"status": "unknown", "evidence_ids": []},
    "existing_tree_count": {"status": "unknown", "evidence_ids": []},
    "infiltration": {"status": "unknown", "evidence_ids": []},
    "utilities": {"status": "unknown", "evidence_ids": []},
    "ownership": {"status": "unknown", "evidence_ids": []}
  },
  "candidate_interventions": []
}
```

The implementation should distinguish observed, derived, assumed, unknown and not-applicable values. An absent value must not become zero or “safe”. Each evidence record needs origin, licence, date/scenario, spatial resolution, unit, processing method and limitations.

## Intervention compatibility

Each candidate should carry: intervention type, requirements, supporting evidence, conflicting evidence, unresolved checks, qualitative benefits and an explicit assessment state. Useful states include **candidate**, **requires investigation**, **excluded** and **not applicable**. Do not represent suitability as uncalibrated stars.

Initial vocabulary to investigate:

| Intervention | Potential mechanisms | Essential checks |
|---|---|---|
| Depaving | Absorb, sweat | Soil, contamination, use requirements |
| Connected tree trench | Store, absorb, shade, sweat | Utilities, root space, water routing, species and maintenance |
| Bioswale | Slow, store, absorb | Slope, flow connection, footprint, overflow |
| Rain garden / bioretention | Store, absorb, sweat | Soil, water quality, overflow, maintenance |
| Permeable pavement | Absorb, store | Traffic/load, subgrade, clogging, groundwater |
| Temporary surface detention | Store, slow | Safe exceedance routes, access, downstream effects |
| Green roof | Store, sweat | Roof location, structure, waterproofing, maintenance |
| Blue-green roof | Store, sweat | Roof capacity, controls, overflow, drought operation |
| Tree planting / canopy expansion | Shade, sweat | Root space, species, water availability, air corridors |
| Rainwater harvesting | Store, reuse | Demand, storage, water quality, operational ownership |

These are candidate ontology entries, not validated local prescriptions. Cooling and infiltration depend on conditions; a benefit label alone is not an effect estimate.

## Basel source plan

| Source from challenge brief | Proposed role | Caveat to retain |
|---|---|---|
| Stadtklimaanalyse Basel-Stadt | Heat and air-corridor context | Model/scenario, units and resolution; present and 2030 must stay distinct |
| Klimaanalyse Basel-Landschaft / GeoView BL | Cross-border climate context | Different methods and 2035 horizon; do not silently merge with BS 2030 |
| FOEN surface-runoff hazard map | Surface-runoff screening | Read technical limitations; not sewer modelling or a full flood-risk model |
| Baumkataster Basel-Stadt | Existing maintained trees | Coverage and freshness; does not establish tree health by itself |
| Baumkronenbedeckung | Canopy and possible change | 2012/2021/2024 comparability must be checked |
| Urban-form / land-cover sources | Surface and site geometry | Availability, licence and derivation still to establish |
| MeteoSwiss extremes and station data | Rainfall and climate context | Station representativeness; no automatic site-specific calibration |
| Naturgefahrenkarten BL | Additional flood context | Hazard mechanisms and coverage differ |

## Acceptance for a credible MVP

- A real location, reproducible calculations and traceable data licences.
- Visible distinction between measured/derived facts and assumptions.
- At least two intervention alternatives where supported, with trade-offs.
- Unknown feasibility factors remain visible and affect assessment state.
- No invented cooling degrees, runoff reduction or construction dimensions.
- A clear account of what transfers to another place and what needs local data.

## Next bounded design step

Verify source access and licences, choose a neighbourhood, formalise the evidence-aware Place Profile and an initial 8–12-type intervention ontology, then implement one reproducible vertical slice. This is a proposal for subsequent work, not a dispatched mission or build authorization.
