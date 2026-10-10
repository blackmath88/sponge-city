# Map layer packs: Basel, Berlin, Copenhagen (`sponge-city-layers/1`)

Retrieved 2026-10-10. Rebuild: `node scripts/maps/<city>.mjs` (network, no keys). Output: `data/maps/<city>/layers.json` + GeoJSON snapshots (all ≤ 400 KB, WGS84, coordinates rounded to 5 decimals, Douglas-Peucker simplified; features whose ring would collapse keep their rounded original ring).
Thematic layers are windows (a bounded bbox) unless stated; each layer's `coverage` gives the exact window and feature count.

## Basel (data.bs.ch, Opendatasoft API, CC BY 4.0)
| layer | source | notes |
|---|---|---|
| basel.boundary.01 | dataset 100017 Gemeinde (Grundbuch- und Vermessungsamt) | extent bbox taken from it; whole canton |
| basel.sealing.01 | dataset 100477 Bodenbedeckung (amtliche Vermessung) | window lon 7.5835–7.5935, lat 47.5555–47.5615; publisher classes, "befestigt" ≠ permeability statement; origin `observed` |
| basel.trees.01 | dataset 100052 Baumkataster (Stadtgärtnerei) | same window; licence field reads "CC BY 4.0 + OpenStreetMap"; the linked PDF (data-bs.ch/stata/dataspot/permalinks/20240822-osm-vektordaten.pdf) was read: it is GVA's permission for OpenStreetMap to incorporate CC BY data (attribution via OSM contributors, waiver of 2(a)(5)(B) for OSM); no extra terms for users of the dataset |
Gaps: BAFU overland-flow hazard (tiles only; STAC licence "proprietary", no clear terms read), heat, green roofs (no catalogue hits). Existing `data/basel-map.json` was not reused; everything was fetched fresh.
Legend colours for Bodenbedeckung and trees are ours (publisher gives classes, no style); stated in each layer's `limitations`.

## Berlin (gdi.berlin.de WFS 2.0, dl-de/zero-2-0 read in each GetCapabilities `ows:Fees`)
Window Mitte lon 13.395–13.415, lat 52.515–52.525 (green roofs shrunk automatically, see `coverage`).
| layer | WFS | legend |
|---|---|---|
| berlin.boundary.01 | alkis_land:landesgrenze | single; extent bbox from it |
| berlin.sealing.01 | ua_versiegelung_2021:versieg2021 | publisher's 11 classes and colours read via WMS GetLegendGraphic (JSON); 12 blocks without `vg_2021` get class "keine Angabe" (grey, ours) |
| berlin.green.01 | ua_gruendaecher_2020:b_begruente_dachteilfl_geb | publisher's extensiv/intensiv colours |
| berlin.heat.01 | ua_klimabewertung_2022:bj_ua_phk_biokl_siedl_2022 | publisher's 4 classes and colours; origin `modelled` |
| berlin.trees.01 | baumbestand:strassenbaeume | colours ours; group values verbatim (one contains ß: `Großsträucher`, kept only as legend `value`) |
Gaps: Starkregengefahrenkarte (WMS + ATOM bulk only, mixed licence incl. CC BY 4.0 areas; `stark_regen_gefahr` WFS 404), river flood maps not queried (out of scope).
Note: WFS needs `bbox=lon,lat,lon,lat,EPSG:4326`; lat/lon order returns nothing.

## Copenhagen (wfs-kbhkort.kk.dk, listed at admin.opendata.dk, CKAN licence_id CC-BY-4.0)
| layer | dataset | notes |
|---|---|---|
| copenhagen.catchments.01 | skybrudsplan-skybrudsoplande | 7 hydrological catchments; extent bbox derived from it (planning area, not legal boundary) |
| copenhagen.cloudburst-basins.01 | skybrudsplan-bassiner-og-pladser | planned; origin `assumed`; Danish typologies kept, DE/EN glosses are ours |
| copenhagen.cloudburst-roads.01 | skybrudsplan-veje-og-tunneller | planned; 2 features without geometry dropped |
| copenhagen.green.01 | gronne-tage | window lon 12.545–12.585, lat 55.670–55.695 (93 of 2029 roofs) |
| copenhagen.trees.01 | bevaringsvaerdige-traeer | same window; designated trees only |
Gaps: boundary (Bydele has no licence; DAWA/Dataforsyningen returns 410), sealing, heat, municipal tree register `trae_basis` and canopy 2024 (no licence), Lokalplaner (CC BY, not fetched).
Colours of Copenhagen classes are ours (publisher gives none).

## Changes after review
- `measure_topic`: `sealing-fraction` for sealing layers (id exists in journey/content/measurements.json); tree layers `null` (a point register is not canopy cover).
- Copenhagen cloudburst plan layers use theme `water` (not hazard). Berlin office name is SenStadt (ProviderName in all capabilities read).
- Basel flood-hazard gap lists the existing `wms.geo.bs.ch` NG_Gefahrenkarten layer as raster-only/not checked as vector.

## Verification
JSON parses; sizes ≤ 400 KB; all required layer fields present; every feature value of `legend.property` matches a legend item; all coordinates inside extent; no ß in text fields.

## Open points
- Legend colours without publisher styling are ours and flagged in `limitations`.
- Window layers are not city-wide; a map must show `coverage`.
- No hazard layer in Basel, none "observed" for Copenhagen floods; Copenhagen cloudburst layers are plans (`assumed`), not hazard.
