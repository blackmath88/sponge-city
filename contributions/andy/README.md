# Andy Nkunzimana — Tellplatz evidence contribution

Imported without changing the scripts or data from
`andymucyo-ops/Hack-am-Rhein-2026-SpongeSquad` at
`e502e0356adaa4a9e9c2929d4611ce34f88df1d5`, 4 October 2026.
Andy authored the data-access audit, Tellplatz AOI and Landsat daytime land-surface-temperature extraction.

## What is retained

- `data/`: raw AOI, clipped spatial outputs, access-audit records and Landsat scene/baseline provenance.
- `scripts/audit_data_access.py`: distinguishes queryable numeric evidence, no-hazard results and unavailable layers.
- `scripts/extract_landsat_heat.py`: source-metadata calibration, QA masking, AOI/reference-ring comparison and explicit rejected scenes.
- `tests/`: original audit and extraction checks.

This is a complementary evidence adapter, not the canonical application engine.
Tellplatz evidence is not joined to Kanonengasse or Klybeck. Land surface temperature
does not become air temperature or a predicted cooling effect.
The frontend-derived `stormMm`/`coolC` game catalogue and scenario backend are archived,
not used for intervention assessment.

Install the optional scientific dependencies in a separate Python environment:
`python3 -m pip install -r contributions/andy/requirements.txt`.
Run `python3 -m pytest contributions/andy/tests` from the repository root.
Some original tests expect unpublished audit files (including `heat_grid_results.json`);
those files were absent from the source commit and are not fabricated here.
Network refreshes are optional and are not part of `make smoke`.

See [attribution and the backbone decision](../../docs/OFFBOARDING.md).
