# Precedent: QTrees / Baumblick (Berlin)

Checked **2026-10-03**. Tags: **[confirmed]** read at the source · **[inferred]** · **[unknown]**.

**Why it matters for us:** it is the only open, end-to-end example we found of per-tree soil-water monitoring in streets: sensor schema, ETL, model and a public interface showing classes. It is **not** a sponge-city project. It forecasts irrigation need for ordinary street-tree pits, so treat it as a schema, modelling and communication precedent, never as evidence of effects. [inferred]

## Project facts

| Item | Value | Tag |
|---|---|---|
| Name | Quantified Trees (QTrees), public app "Baumblick" | confirmed |
| Period | Sep/Oct 2021 – Sep 2023, completed | confirmed ([qtrees.ai](https://www.qtrees.ai/), [UBA Tatenbank](https://www.umweltbundesamt.de/themen/klima-energie/klimafolgen-anpassung/werkzeuge-der-anpassung/tatenbank/quantified-trees-qtrees-intelligente)) |
| Funding | BMUV, German climate adaptation programme (DAS), EUR 410,544, >90 % personnel | confirmed (UBA) |
| Consortium | Technologiestiftung Berlin (lead), Birds on Mars (AI); Straßen- und Grünflächenämter Mitte and Neukölln; ARBOR revital (sensors); IM NORDEN (watering service) | confirmed |
| Sensors | >120 sensors in two districts. **Watermark** suction-tension sensors at **30, 60, 90 cm** in the tree pit, data via the ARBOR Monitor | confirmed (UBA; [sensor story](https://github.com/technologiestiftung/baumblick-frontend/blob/main/pages/stories/saugspannung-und-sensoren.mdx)) |
| Coverage | Nowcast and 14-day forecast for all Berlin street trees, including trees without sensors | confirmed |
| Claimed result | Expert estimate that demand-based watering could save up to 50 % of water; forecast quality depends on weather-forecast quality | confirmed as *claimed* (UBA). Independent validation [unknown] |
| Status | No follow-up funding. Baumblick in demo mode with static data since July 2024. Backend last commit 2024-06-20 | confirmed |

## Repositories (all public, read-only clone)

| Repo | Licence | Last commit | Use for us |
|---|---|---|---|
| [technologiestiftung/qtrees-ai-data](https://github.com/technologiestiftung/qtrees-ai-data) | MIT, © 2022 Birds on Mars | 2024-06-20 | Schema, ETL and model design |
| [technologiestiftung/baumblick-frontend](https://github.com/technologiestiftung/baumblick-frontend) | MIT, © 2022 Technologiestiftung Berlin | 2024-07-17 | Status classes and explanatory "stories" |
| [technologiestiftung/superset-qtrees](https://github.com/technologiestiftung/superset-qtrees) (linked from qtrees.ai as the expert dashboard) / `qtrees-superset*` | MIT for the `qtrees-superset*` repos | 2023–2025 | Administration dashboard. Not inspected [unknown] |
| `giessdenkiez-de-*` family | Mostly MIT | active 2026 | Citizen-watering platform. Its open watering data was a model feature [confirmed in schema] |

MIT permits reuse with the copyright and licence notice kept. Nothing has been copied into this repo; the notes below describe the design only.

## What the code shows

**Data model** (`infrastructure/database/migrations/000001_*_setup_tables.up.sql`) [confirmed]
- `sensor_types`: `saugspannung_30cm`, `saugspannung_60cm`, `saugspannung_90cm`, `saugspannung_stamm`. The frontend comments call type 4 the "average".
- `private.sensor_measurements(tree_id, type_id, sensor_id, timestamp, value)` is a long format, one row per reading.
- `public.nowcast` / `public.forecast(tree_id, type_id, timestamp, value, model_id)`: model outputs carry a `model_id`, kept separate from observations.
- **Raw sensor data and the device mapping are in a `private` schema.** Only model outputs are public, so there is no open raw sensor dataset.
- Context tables: `trees` (Berlin tree register), `soil` (Berlin soil map attributes), `weather`, `radolan` (DWD radar rainfall), `shading` (seasonal shading index), `watering_gdk` / `watering_sga` (citizen and district watering), and private `trees_private` (vitality index, tree-pit area and surface).

**Model** (`qtrees/constants.py`) [confirmed]
- Random-forest nowcast and forecast (scikit-learn, 1000 trees), 14-day horizon, 7-day rolling window.
- Features: month, genus, tree age, shading index, max wind, mean temperature, rainfall, solar radiation (GHI), watering volumes (nowcast only), previous day's mean.
- A model-evaluation notebook exists; reported accuracy figures were not reviewed [unknown].

**Communication** (`src/lib/utils/mapSuctionTensionToStatus/index.ts`) [confirmed]
- Three classes: **Gut (0–33]**, **Mäßig (33–81]**, **Kritisch (81–270]**, with an expected value range of about 0–240.
- The code states no unit. Watermark sensors read in centibar (= kPa), so the classes are probably kPa [inferred].

## Mapping to our Place Profile

| QTrees element | Place Profile use | Note |
|---|---|---|
| Long-format reading (id, variable, depth, timestamp, value) | `soil_water` evidence records with `unit` and `origin: observed` | Add `unit`, which QTrees leaves implicit |
| Separate nowcast/forecast tables with `model_id` | `origin: modelled` with model provenance | Matches our "observed vs derived" rule |
| Three-class display | Optional presentation layer only | Thresholds are uncalibrated for Basel soils and ZHAW substrates; keep unset until VoltaNord data exist |
| Shading index, genus, age, watering | Explanatory variables for **need** (tree stress) | Basel equivalents: Baumkataster (genus, planting year), canopy/land cover; no watering log found |
| Private raw data, public outputs | Template for a data-sharing ask to ZHAW/Stadtgärtnerei | Shows a workable pattern where raw data stay closed and indicators are published |

These rows are recorded in `data/evidence-atlas.json` (`precedent-qtrees-*`, `boundary-qtrees-transfer`, `interpret-soil-water-field-design`).

## Boundaries

- QTrees does not measure infiltration, retention, runoff or substrate performance. It says nothing about sponge-city effect. [inferred from schema and project description]
- Berlin soils, tree pits and climate differ from VoltaNord. Thresholds and model weights do not transfer. [inferred]
- The project is unmaintained, so reuse would mean adopting the design, not depending on the service. [inferred]

## Worth asking

- Technologiestiftung Berlin (public contact via [qtrees.ai](https://www.qtrees.ai/)): were the classes calibrated, and against what? Is any anonymised sensor time series shareable?
- ZHAW: does VoltaNord measure suction tension (and at which depths) or volumetric water content? This determines whether the QTrees schema fits as-is.
