# Monitoring and data stack

Status: evidence triage and proposed architecture, 3 October 2026.

## Why this matters

The Decision Canvas and the VoltaNord monitoring project do different jobs:

- the **Canvas screens upstream** for places where need, possibility and an intervention mechanism overlap;
- **field checks** test whether the main local assumptions are true;
- **VoltaNord monitoring observes downstream performance** for the indicators in its protocol;
- a **calibrated model**, where justified, can estimate scenarios beyond the monitored point.

These layers must not be collapsed. A map can identify a promising location without proving feasibility. A sensor can record conditions without establishing a causal effect. One successful pilot does not automatically establish transferability across Basel.

## Verified local evidence chain

| Stage | What the public record establishes | What remains unresolved |
|---|---|---|
| 2024 design project | ZHAW project 74640 reviewed Basel's vegetation building blocks and developed proposals for Therwilerstrasse, Lysbüchelstrasse and Weinlagerstrasse. It addressed draining, resource-saving, structurally stable substrates and site-appropriate planting. The page says a measurement concept should follow. | The measurement concept itself was not found publicly. |
| 2025 funding decision | The Basel-Stadt government approved CHF 280,000 for five years of scientific monitoring. The formal register identifies decision P251765, taken on 18 November 2025, led by BVD and classified as non-parliamentary. | The decision record does not expose the monitoring protocol or decision thresholds. |
| 2026 monitoring project | ZHAW project 80788 is ongoing from May 2026 and names tree and understorey vitality, root development, infiltration capacity and soil-water balance. | Exact monitored elements and sites, methods, cadence, baselines, comparators, QA, data access and reporting dates are not public in the checked sources. |

The design and monitoring projects form a plausible chain, but public metadata does not prove that project 80788 implements the measurement concept anticipated by project 74640. Treat that continuity as an inference until ZHAW or Stadtgärtnerei confirms it.

## What Basel data can support now

| Dataset | Useful now for | Do not use it alone for |
|---|---|---|
| [Smart Climate observations 100009](https://data.bs.ch/explore/dataset/100009/) | Hourly air-temperature and precipitation context; event and coverage exploration after QA | Claiming that a sponge element caused cooling or runoff reduction |
| [Smart Climate station locations 100082](https://data.bs.ch/explore/dataset/100082/) | Checking sensor proximity and spatial coverage | Assuming the nearest station represents street-scale conditions |
| [Long-term groundwater statistics 100180](https://data.bs.ch/explore/dataset/100180/) | Screening hydrogeological context and identifying questions for field work | Event-scale infiltration behaviour or facility drawdown |
| [Land cover 100477](https://data.bs.ch/explore/dataset/100477/) | Surface classification, imperviousness proxies and opportunity screening after validation | Detailed construction feasibility, utility conflicts or infiltration capacity |

Before analysis, create a fitness sheet for every dataset with spatial and temporal resolution, currency, missingness, validation status, licence, publisher, join keys and the decisions it can and cannot support.

## Proposed evidence maturity ladder

The same four levels are encoded in `data/evidence-atlas.json` and shown in the prototype.

| Level | Evidence needed | Decision it can support | Boundary |
|---|---|---|---|
| 1. Screening data only | Documented spatial layers, resolution/date and explicit exclusions | Prioritise places for investigation; state an expected mechanism | Not a site-design or causal claim |
| 2. Point tested | Georeferenced field tests with methods and dates; soil, infiltration and utility constraints where relevant | Reject or advance a candidate; refine the intervention concept | Not long-term or extreme-event performance |
| 3. Monitored | Protocol-linked observations, baseline/comparator logic, QA, maintenance and event context | Observed site performance for named indicators | Not automatic transfer or network-wide effect |
| 4. Model calibrated | Defined model purpose, calibration and validation events, uncertainty analysis, versioned inputs | Scenario comparison within a declared validity domain | Not certainty outside calibrated conditions |

An item should never inherit a higher maturity level from a nearby dataset or a similar project. Maturity attaches to a precise claim, place, intervention and decision.

## Proposed three-layer implementation

### 1. Static screening: where to investigate

Combine authoritative spatial layers for need and feasibility, including terrain, land cover or imperviousness, drainage context, soil and groundwater, utilities, parcels and trees. Every derived layer should retain its source, timestamp, resolution and transformation.

Output: candidate sites with explicit exclusions and unknowns—not a ranked list disguised as certainty.

### 2. Field evidence: what the site and intervention do

Start with the decision and indicator, then choose the method and frequency. Possible evidence families include infiltration tests, soil-water observations, vegetation assessments, rainfall context, facility water levels, drainage outcomes and heat observations. The exact instrument and cadence must come from the phenomenon, protocol and decision threshold; there is no universal one-to-five-minute rule.

Output: protocol-linked observations with QA flags, maintenance/event context and a baseline or comparison design.

### 3. Model and decision layer: what can transfer

Use observations to calibrate a model only when a named decision requires scenario estimates that monitoring alone cannot supply. Record the model purpose, validity domain, calibration and validation events, uncertainty and responsible reviewer.

Output: scenario evidence accompanied by assumptions and uncertainty—not an unqualified citywide prediction.

## Questions for the ZHAW–Stadtgärtnerei hand-off

1. Does the current protocol derive from the measurement concept anticipated in project 74640?
2. Which exact street elements, construction variants and ownership/maintenance arrangements are monitored?
3. For each of the four published indicator areas, what is the operational definition, method, cadence and unit?
4. What baseline, comparator or before/after logic is used?
5. How are rainfall, construction changes, irrigation and maintenance recorded as context?
6. What are the QA rules, data fields, licences, confidentiality limits and publication schedule?
7. Which first decision or standard is expected to change in response to each result, and who signs off?
8. How should the stated five-year duration be reconciled with the public ZHAW listing that ends in August 2034?

## Triage of the supplied research dump

### Added to the canonical atlas

- the verified 2024 ZHAW design project and its named streets;
- the formal decision reference P251765;
- four immediately usable Basel open-data sources;
- the explicit design-to-monitoring inference and its uncertainty;
- the four-level evidence maturity ladder;
- a dataset-fitness action and stronger protocol hand-off questions.

### Kept as research leads, not Basel facts

- specific sensor makes, installation patterns and telemetry stacks;
- universal sampling intervals;
- international monitoring arrangements in Philadelphia, Copenhagen, China, Vienna, Zurich and German pilot cities;
- satellite or airborne thermal resolutions;
- a detailed 1D–2D modelling prescription.

These may be useful precedents, but each should become a source-pinned record with a scope and a clear reason for relevance before it enters the canonical atlas.

### Deliberately not promoted

- the exact start date `2026-05-13`: the checked public ZHAW project page supports May 2026, not day-level precision;
- the explanation that five years starts from street completion: plausible, but not stated publicly;
- inferred VoltaNord instruments and methods;
- the Ulm soil-sensor schema as if it were Basel evidence.

The Ulm schema could later be used as a clearly labelled synthetic development fixture. It must never be mixed with observations or presented as a forecast of the VoltaNord protocol.

## Primary local sources

- [ZHAW project 74640](https://www.zhaw.ch/de/forschung/projekt/74640)
- [ZHAW project 80788](https://www.zhaw.ch/de/forschung/projekt/80788)
- [Basel government bulletin, 18 November 2025](https://www.bs.ch/medienmitteilungen/2025-kurzmitteilungen-aus-der-regierungsrats-sitzung-bulletin-33)
- [Regierungsratsbeschluss P251765](https://www.bs.ch/regierungsratsbeschluesse/P251765?backUrl=/apps/regierungsratsbeschluesse)
- [Official VoltaNord overview](https://www.bs.ch/schwerpunkte/arealentwicklungen-im-kanton-basel-stadt/voltanord)
