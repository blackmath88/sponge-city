# Data & source catalogue

A working inventory of sources found during research. This is a **discovery document**, not a guarantee that every source is suitable for a product claim.

## Basel / Swiss open-data infrastructure

### Basel-Stadt data portal — VERIFIED

- Portal: https://data.bs.ch/
- Explore API v2.1 is available per dataset.
- Useful for records-oriented datasets and metadata.
- Canton code organisation: https://github.com/opendatabs

Questions to ask for every dataset:

- update cadence;
- observation period;
- geometry / CRS;
- identifier stability;
- licence;
- missing-value semantics;
- whether the spatial/temporal resolution fits the intended decision.

### Swiss federal geodata STAC — VERIFIED

- Documentation: https://www.geo.admin.ch/de/rest-schnittstelle-stac-api
- API/spec: https://data.geo.admin.ch/api/stac/static/spec/v1/api.html

STAC supports spatial and temporal discovery and is useful as a pattern for evidence catalogues. It is a catalogue/data-access pattern, not a reasoning engine.

### Rhine hydrology — VERIFIED

- BAFU Basel-Rheinhalle station:
  https://www.hydrodaten.admin.ch/de/seen-und-fluesse/stationen-und-daten/2289
- BAFU station condition/context:
  https://www.hydrodaten.admin.ch/de/seen-und-fluesse/messstationen-zustand
- Basel-Stadt Rhine dataset:
  https://data.bs.ch/explore/assets/100089/?flg=de-ch
- Port of Switzerland gauge:
  https://port-of-switzerland.ch/hafenservice/pegel/

Research notes:

- Basel has high-frequency Rhine data.
- BAFU provides long historical series.
- Related sources can be cross-checked.
- A Basel-specific low-water operational threshold for the manufacturing challenge was **not established** in the research pass.

---

## Sponge city / climate adaptation sources

### Basel example — VERIFIED

Basel-Stadt example linking greening/unsealing with district-heating works:

https://www.bs.ch/bvd/staedtebau-architektur/baukultur/grau-blau-gruen-baukultur-machen/gruene-zukunft-begruenung-und-entsiegelung-im-zuge-des-fernwaermeausbaus

Why it matters:

- demonstrates real sponge-city-style intervention;
- demonstrates coordination with already-planned infrastructure work;
- suggests "planned works / intervention opportunity" as a valuable evidence layer.

### External-city guidance — VERIFIED SOURCE, NOT BASEL RULE

Bern:
https://www.bern.ch/themen/umwelt-natur-und-energie/klima/klimaanpassung/grundlagen-und-wissen/schwammstadt/schwammstadt-fuer-baeume

Zürich:
https://www.zh.ch/de/umwelt-tiere/klima/schwammstadt-prinzip.html

Luzern:
https://www.stadtluzern.ch/dienstleistungeninformation/73666

BAFU:
https://www.bafu.admin.ch/de/konzept-schwammstadt

Use these to learn intervention/process concepts. Do **not** silently treat them as Basel-specific approval or engineering requirements.

### Candidate local layers — VERIFY FITNESS

Research identified combinations worth checking:

- urban heat analysis;
- surface-runoff hazard;
- tree register;
- tree canopy;
- surface sealing;
- terrain / surface model;
- planned works;
- ownership / parcels;
- utility corridors.

The main task is not finding that these layers exist. It is checking whether they can be joined at compatible resolution and whether the result supports the intended intervention claim.

---

## Heat / support sources

Candidate layers already discussed:

- heat maps / temperature sensors;
- population by age and quarter;
- cool rooms;
- fountains;
- routes / pedestrian network;
- shade / canopy;
- opening hours;
- MeteoSwiss warnings.

Key caution:

> Aggregated area data describes areas, not individuals.

A quarter-level signal should not be converted into a claim about a person or household.

---

## Life Sciences ecosystem sources

### Basel Area / BaseLaunch — VERIFIED SOURCE

https://baselarea.swiss/program/baselaunch/

### Switzerland Innovation Park Basel Area — VERIFIED SOURCE

https://sip-baselarea.com/

Research also referenced:
https://baselaunch.ch/blog-post/plug-play-lab-space/

### Other candidate sources — VERIFY STRUCTURE / LICENCE

- Zefix;
- Basel-Stadt company registers;
- Startup.ch / investor directories;
- programme and accelerator pages;
- campus / lab-space inventories.

Research question:

> Can programme prose be compiled into structured eligibility records with explicit source spans and review status?

---

## Source-fitness checklist

Before using a source in a recommendation, record:

```yaml
source:
  url:
  publisher:
  retrieved_at:
  observation_period:
  update_cadence:
  licence:
  geometry:
  crs:
  resolution:
  identifiers:
  known_gaps:
  supports:
  does_not_support:
```

This repository should prefer an explicit "not enough evidence" over an unsupported join.
