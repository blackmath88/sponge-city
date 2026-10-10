# R2 — Independent evidence-validity review (read-only)

- Commit under review: `cf64561e74cc73d1ec38667c220ef707673ecf17` (branch blackmath88/review-R2, clean tree). No tracked file was modified.
- Date of re-fetch: 2026-10-10 (live pages/APIs, curl + WebFetch/WebSearch).
- Method: (1) every source URL cited in zurich/berlin/copenhagen.json (86 quotes on 44 distinct URLs) was fetched with curl; HTML/PDF/JSON was converted to text, normalised (entities, quotes, dashes, whitespace, case) and each `quote` string was searched verbatim (ellipsis-split quotes searched per fragment). (2) For the claims with figures/qualifiers *beyond* the quote, the page text around the figure was read. (3) Layer licences, publishers, dates, feature counts, properties and bbox were compared against the live WFS/API/CKAN responses. (4) Matrix cells were compared with the cited repository entries/layers. (5) Basel verdicts were recomputed from the live data.bs.ch API where feasible.
- Verdict vocabulary: confirmed / confirmed-with-difference / not-supported / unreachable / not checked.

## Summary

| Result | Count |
|---|---|
| Quotes verbatim on cited page (automated, all three city files) | **86 / 86** (2 Berlin quotes first returned HTTP 429, re-fetched OK) |
| Blockers | **0** |
| Major | **3** |
| Minor | **16** |
| Not checked | 6 (listed at the end) |

No quote is fabricated or missing; no cited page was unreachable. The problems are in what surrounds the quotes: figures in the entry text that are not in any quoted sentence, claims worded stronger than the source, matrix states that assert more than the entries show, and two Basel claims whose published text was not corrected after the verification flagged a difference.

## Ranked problems

### Major
1. **M1 — `basel.interventions.engelgasse` (data/cities/basel.json:179-184) and the matching sponge-facts claim state a 2016 *announcement* as completed work.** The cited release (26.01.2016) is future tense ("im Rahmen der diesen Frühling beginnenden Sanierung … zu vergrössern", "wird … pflanzen", works "bis voraussichtlich Mitte 2018"; 76 old trees, 50 new tree strips, 26 removed trees to be re-planted nearby). The entry says "Basel **has enlarged** … and **replanted** 50 young trees". `data/verification/basel-claims.json` already marks this `confirmed-with-difference` for exactly this reason, but the claim text was not changed. *Fix:* reword to "In 2016 Basel announced that it would enlarge … and plant one young tree in each of 50 new strips (76 old trees, works to about mid-2018); completion not verified", or find a completion source.
2. **M2 — Matrix `effect` row: `access: not_open` in 4 cells (basel, berlin, copenhagen, zurich) is not supported by any entry.** The cited entries (`*.measurement.04/03`, `*.outcomes.0x`, `basel.outcomes.measures-registry`) are all "no public evidence found … does not show that nothing is measured". "Not open" asserts that data exist and are closed; the evidence is only absence. The same absence is rendered as `access: unknown` in `sealing/copenhagen`. *Fix:* `access: unknown` (and `derivable: unknown` rather than `no`) for the four effect cells, or add an entry that shows closure.
3. **M3 — Matrix `sewer/zurich`: `access: partial` contradicts its own entry.** `zurich.context.04` says "no open geodata of the network were found" (I re-ran the opendata.swiss search for the Stadt-Zürich organisation: "Kanalisation" → only a stream dataset `ehgraben`; "Kanalnetz"/"Werkleitungskataster" → 0). The comparable Basel cell (`sewer/basel`) is `not_open`/`no_public_evidence_found`. *Fix:* align to the Basel treatment (`access: not_open` or `unknown`; `exists: partial` only for the textual km figures).

### Minor (most consequential first)
- m1 `berlin.context.02`: the **48 Mio. m³** figure is correct on the page but **is not in either recorded quote** (quotes cover only the ¾/¼ split and the 5.5 Mio. figure). The 5.5 Mio. sentence reads "5,5 Mio. m³ Regenwasser **und 0,5 Mio. m³ Schmutzwasser** pro Jahr unbehandelt …"; the entry text drops the 0.5 Mio. m³ and labels the 5.5 as "combined-sewer overflow" (the page puts it under the Mischsystem/“Überläufe aus der Kanalisation” paragraph, so the label is defensible). *Fix:* add the quote "Insgesamt werden durch das Trennentwässerungssystem rund 48 Mio. m³ Regenwasser pro Jahr in die Gewässer eingeleitet." and state "5.5 million m³ rainwater plus 0.5 million m³ wastewater".
- m2 `zurich.measurement.04` has **no `sources`** although it states two checkable facts (city announced ZHAW monitoring until 2024; ZHAW lists the project as completed 06/2020–07/2025). Both are true (city release 03.12.2020 contains the ZHAW sentence; zhaw.ch/de/forschung/projekt/72564 shows 06/2020–07/2025; a follow-up "Giessereistrasse 2.0" is listed on staff pages, not mentioned). *Fix:* add both URLs + quotes.
- m3 Matrix `canopy/zurich`: `derivable: yes` is not shown. `zurich.measurement.05` itself says no crown share is stated and the raster "could not be downloaded here"; `measurement.01` says the 2018 (17 %) and 2022 (15 %) values may not be comparable. *Fix:* `derivable: unknown` (or "yes, untested").
- m4 Matrix `heat/zurich`: `access: open` with note "About 90 stations at 15-minute intervals" omits that the meteoblue-network datasets carry the suffix "[Nachführung eingestellt]" (confirmed in the CKAN JSON: temperature and station datasets), as `zurich.measurement.02` records. *Fix:* add to the note; consider `partial`.
- m5 Matrix `sealing/berlin`: `access: partial` and note "licence of the 2021 version not verified" are contradicted by the repository's own layer (`berlin.sealing.01`, dl-de/zero-2-0) and by the live WFS capabilities of `ua_versiegelung_2021` (`Fees`: Datenlizenz Deutschland – Zero – 2.0; AccessConstraints "Es gelten keine Zugriffsbeschränkungen"). *Fix:* `access: open`, drop the caveat. `berlin.access.01` still says the 2022 water-balance licence "was not checked" — the *2005* record is the only one read (confirmed).
- m6 Matrix `green-roofs/berlin`: `basis: observed` while layer `berlin.green.01` is `derived` and, per the Umweltatlas method page, produced by multispectral remote-sensing pre-mapping plus visual aerial-image correction (and counts any vegetated roof, "unabhängig davon, ob sie als Gründach angelegt wurde"). Cell `scale: programme` but the layer is a 2020 city-wide inventory (window shown). *Fix:* `basis: derived`; split programme output (19,640 m²) from the inventory.
- m7 Matrix `sealing/basel`: `basis: derived` vs layer `basel.sealing.01` `origin: observed`; `needs: site_visit` unexplained for an `open/yes` cell. Pick one vocabulary.
- m8 Matrix `pluvial/copenhagen`: cites `copenhagen.catchments.01`, whose own limitations say "not a flood map and not a hazard layer". The cell is right (flood PDFs from 2012 calculations) but the layer reference suggests geodata of flooding. *Fix:* drop the layer or say "catchment partition only".
- m9 Matrix `pluvial/basel` (`basis: modelled`, no entries/layers) and `sewer/copenhagen` (`unknown`, "not researched") cite nothing; `copenhagen.transfer.01` + the ClimateADAPT PDF do say the majority of Copenhagen's sewers are combined. Cite the gap records / that entry.
- m10 Matrix `green-roofs/zurich`: `basis: observed` for a zoning rule (legal fact, not an observation of roofs); `exists: partial` fine.
- m11 `zurich` layers `extent.bbox` [8.44689, 47.319033, 8.627212, 47.435141] is **not reproducible** from the cited source (`adm_stadtkreise_v` and `_a` both give [8.448018, 47.320218, 8.625453, 47.434665] — identical to the shipped boundary snapshot). The stored box is ~0.001–0.002° (≈100–200 m) larger on every side, hand-typed (6-decimal precision, no script produces it). It is a safe superset of the official outline; Basel, Berlin and Copenhagen bboxes reproduce exactly. *Fix:* use the live value or say "rounded outward".
- m12 `zurich.measurement.06`: counts reproduce exactly from the CSV (2,496 rows, 3,684 reports, 211 stznr, 1976-06-10 → 2025-11-09), but the dataset page header says **"Zeitraum 1977 – 2024"** (updated 07.10.2026). The entry should note the metadata/data mismatch.
- m13 `copenhagen.cloudburst-roads.01`: live WFS returns **976** features, snapshot has **974** (dataset still dated 2024-08-01); 2 features dropped in processing, undisclosed. Basins (176), catchments (7), green (93), trees (612) match exactly.
- m14 `copenhagen.green.01`: 13 of 93 features carry the class "Andet tagkonstruktion" (other roof construction); layer is titled "Green roofs" and limitations do not say these may not be green. Publisher text: "Bygninger med grønt tag som primær eller sekundær tagkonstruktion".
- m15 Weak/truncated quotes: `zurich.interventions.06` ("Seit dem 1. Dezember 2024 gelten neue"), `zurich.interventions.01` second quote ends mid-sentence ("… mit der umfassenden"), `zurich.access.01` (quote = "Creative Commons CCZero", "https://opendata.swiss/terms-of-use#terms_open"), `copenhagen.access.01` (listing text). They are on the page but do not by themselves carry the claim.
- m16 Origin/scope labelling: `zurich.context.01/02` and `zurich.measurement.03` have `scope: unspecified` although the text states they are cantonal; `copenhagen.outcomes.01` is `origin: unknown` although the report says the figure is an estimate ("anslås") — `modelled/estimated` would be more informative.

## (A) data/cities/zurich.json — 11 entries re-checked (all 6 with a measure block + context.04/05, measurement.05/06, outcomes.03 + three others)

All source quotes of all 23 Zürich entries were also verified verbatim by script; the table gives the claim-level result for the most consequential ones.

| Entry | Quote on page? | Claim supported as worded? (origin / scope / evidence_state / measure) | Verdict | Discrepancy / fix |
|---|---|---|---|---|
| context.02 (canton 25,000 ha / 14 % sealed) | yes (zh.ch release 2022) | yes; Arealstatistik 2013/18 on page; scope "Canton" in measure | confirmed | scope field says `unspecified` (m16) |
| context.04 (sewer 1000 vs 1500 km; 104 km walkable; ~80 % combined) | yes, 4/4 (kanalisation.html, unterhalt page, Umweltbericht 2025) | yes; "no open geodata" re-checked on opendata.swiss (Kanalisation → 1 unrelated hit) | confirmed | matrix `access: partial` contradicts (M3) |
| context.05 (28.6 % sealed, own computation) | yes (dataset descriptions of btk_2020 and BEV580OD5803; attribute definition quote on page) | provenance honest ("our computation", `derived`, not official, denominator incl. forest/water) | confirmed (method); **numbers not checked** | I did not recompute 28.6 / 4.7 / 1.1 % from 96,178 WFS polygons (see not checked) |
| measurement.01 (canopy ~15 % 2022, 17 % 2018) | yes, both | yes; 15 % (2022) and 17 % (2018) on the two pages; comparability caveat is the project's | confirmed | — |
| measurement.02 (~90 stations, 15-min, Aug 2019→) | quote "für rund 90 Stationen …" found in CKAN JSON | "15-Minuten-Mittelwerte", "seit August 2019 bis und mit August 2026" in description; 2 titles carry "[Nachführung eingestellt]" — all verified | confirmed | matrix omits discontinuation (m4); the only quote is the station count, other facts unquoted |
| measurement.03 (pluvial map) | yes, 3/3 | 30/100/300/1000-year events, scale 1:10,000–15,000, reliability caveat, CCZero and WFS (maps.zh.ch OGD ZH WFS listed) all verified | confirmed | scope `unspecified` for a cantonal model (m16) |
| measurement.05 (lidar height raster 2022) | yes, 3/3 (LAS-Code 5, 50 cm, "Kronenbedeckung") | yes; dataset TIFF, CCZero verified | confirmed | self-disclosed: raster not downloaded, no share computed |
| measurement.06 (flood reports) | yes, 2/2 | counts reproduced from CSV exactly (see m12) | confirmed-with-difference | page says Zeitraum 1977–2024 vs data 1976–2025 |
| outcomes.03 (no green-roof total) | n/a (no sources) | "25 flat-roof polygons (≈0.5 ha)" **not checked** | not checked (claim); absence of a published total plausible | — |
| interventions.04 (Giessereistrasse) | yes (nine trees, CHF 680 000) | "larger tree pits, water-storing substrate" present ("grössere Baumgruben … wasserspeicherndes Baumsubstrat") | confirmed | — |
| outcomes.01 (tree decline 2014/18/22) | yes | yes, "grösste Abnahme auf Privatgrund" | confirmed | — |
| measurement.04 (ZHAW monitoring) | no sources | facts true (see m2) | confirmed-with-difference | missing sources |
| context.03, interventions.02/03/05, access.01, transfer.01 | yes | yes | confirmed | quotes thin (m15) |
| context.01 | yes | yes; "derived" for an agency quote is generous | confirmed | m16 |

## (B) Berlin and Copenhagen — all 86 quotes (Berlin 16 entries, Copenhagen 17) checked; claim-level results for the prioritised ones

| Entry | Verdict | Detail |
|---|---|---|
| berlin.context.02 (¾/¼; 48 Mio.; 5.5 Mio.) | **confirmed-with-difference** | ¾/¼ and 5.5 Mio. quotes exact. 48 Mio. m³ exists on the page ("durch das Trennentwässerungssystem rund 48 Mio. m³ Regenwasser pro Jahr") but not in a quote. Page also says 0.5 Mio. m³ Schmutzwasser untreated and ~15 Mio. m³ treated combined water — omitted. See m1. |
| berlin.context.01 (33.9 %, 2021) | confirmed | quote exact. "including water bodies and street land" (entry/measure) is **not** worded on the page; page says "gesamter Versiegelungsgrad der Stadt"; WFS abstract confirms street areas are part of the survey (Block + Strassenabschnitte). Hybrid ALKIS + Sentinel-2B method confirmed by WFS abstract. The "since early 1980s" claim in measurement.02 is on the page ("seit Anfang der 80er Jahre"). |
| berlin.context.03 (>60 % unfavourable) | confirmed | quote exact, "modelled" matches WFS abstract (Klimamodellierung). |
| berlin.measurement.01 (ABIMO) | confirmed-with-difference | quotes exact (almost two thirds evaporate; two thirds of rest infiltrate); "25,000 Einzelflächen" on page. "about 32,000 street areas" and "ABIMO 3.2, green roofs included" are **not** on the cited summary page (3.2/green roofs are on the download page quoted in berlin.access.01; 32,000 not found anywhere I fetched). Minor. |
| berlin.interventions.02 (300,000 m³ target, up to EUR 7 M/yr) | confirmed | quote exact; "jährlich bis zu 7 Millionen €" on same page. |
| berlin.interventions.04 (Mitte 2,000 m², 50 green gullies, until July 2027) | confirmed | all three on press release (Förderzeitraum bis 3. Juli 2027; "rund 50 Grüne Gullys"). |
| berlin.outcomes.01 (19,640 m²) | confirmed | exact; "nachlassende Nachfrage" on page. |
| berlin.outcomes.02 (300,000 m³ built) | confirmed | exact (press release 2026); programme runs to 2028 with 86 M EUR state share (not used). |
| berlin.interventions.05 (QTrees) | confirmed | quote exact; "2021–2023": UBA page gives 01/10/2021–"31/09/2023" (sic, date typo on the source). |
| berlin.interventions.01/03, transfer.02/03, measurement.03, access.01 | confirmed | exact. |
| copenhagen.outcomes.01 (7–9 %, 6,000 people, 3,500 households, 2,300–3,300 businesses) | confirmed | exact on p. 9–10 of the 2021 Klimatilpasningsredegørelse ("ca. 7-9 %, hvilket anslås til, at ca. 6.000 københavnere (svarende til ca. 3.500 husstande) og 2.300-3.300 virksomheder"). Source calls it an estimate; entry's `origin: unknown` is fine but see m16. |
| copenhagen.outcomes.02 (4 of 48) | confirmed | exact ("48 kritiske oversvømmelsesområder … fire af områderne … løst med fysiske tiltag"). Page also says 19 areas better handled by emergency planning — not used, not contradicted. |
| copenhagen.measurement.02 (heat data) | confirmed | 2024-08-19 committee minutes: "grov opløsning, der ikke dækker hele byen"; "Derfor findes der ikke det nødvendige datagrundlag …" exact. "Proposed subject to funding" not separately verified. |
| copenhagen.context.01/02/03, interventions.01–04, measurement.01/04, access.01–03, outcomes.04, transfer.01 | confirmed | all quotes exact (PDF text; the ClimateADAPT item is a PDF download). Extra details verified: 10 cm threshold; DKK 3.8 bn (2012) → 11 bn (2015 plan) → 13.4 bn (2021); 262 surface projects ongoing / ≈300 planned; six landowner associations; three-year HOFOR pilot; six skybrud datasets tagged, licence CC BY 4.0 ×6, update frequency Årligt ×5 + Løbende ×1; per-catchment PDF files. |

Entries with `no_public_evidence_found` (berlin.measurement.04, outcomes.03/04; copenhagen.measurement.03, outcomes.03; zurich.measurement.04, outcomes.02/03) carry no quotes and cannot be verified by re-fetch; each states its search terms and "does not show that nothing is measured". Not independently re-searched (except the Zürich sewer-geodata search and the ZHAW search).

## (C) data/maps/*/layers.json — 19 layers

Licence: every `licence_url` opened (HTTP 200) and every layer's licence text compared to the live catalogue.
`licence` column = publisher's own statement found on the page/API. Counts = features in the shipped GeoJSON vs `coverage` text (all match) and vs live source where noted.

| Layer | licence vs live | origin honest? | coverage / limitations / temporal | Spot-check (3 features or live comparison) | Verdict |
|---|---|---|---|---|---|
| basel.boundary.01 | CC BY 4.0 (data.bs.ch 100017 API: `CC BY 4.0`, modified 2026-08-20) ✓ | observed ✓ | 3 Gemeinden ✓ | live names Bettingen/Basel/Riehen ✓; bbox reproduces exactly | confirmed |
| basel.sealing.01 | CC BY 4.0 (100477) ✓; modified 2026-08-20 ✓ | observed (cadastral land cover) ✓ — but the matrix calls the same thing `derived` (m7) | window count 1138 = live in_bbox count 1138 ✓; limitations accurate | class histogram of all 1138 polygons (11 classes) = live group-by classes; 3 samples ✓ | confirmed |
| basel.trees.01 | data.bs.ch field is **"CC BY 4.0 + OpenStreetMap"**; `license_url` in API is the GVA permission PDF, layer links to the CC page and explains it | observed ✓ | 307 = live 307 ✓ | Rheinsprung samples (Sommer-Linde 15, Feld-Ahorn 15, Hain-/Weissbuche null) and first tree (Winter-Linde, 105, Oberer Rheinweg) match live | confirmed-with-difference (licence_url ≠ dataset's own `license_url`; explained in text) |
| berlin.boundary.01 | WFS Fees: dl-de/zero-2-0 ✓ | observed ✓ ("abgeleitet aus ALKIS") | whole Berlin ✓ | bbox [13.08835, 52.33825, 13.76116, 52.67551] = live | confirmed |
| berlin.sealing.01 | dl-de/zero-2-0 ✓ (m5) | derived ✓ (Sentinel-2B + building data, WFS abstract) | 126 blocks; "Stand 2020" Blockkarte ✓ | 3/3 blocks match live (`vg_2021` 90.04 / null Gewässer / 96.03, same schluessel) | confirmed |
| berlin.green.01 | dl-de/zero-2-0 ✓ | derived ✓ (method page: multispectral remote sensing + visual aerial interpretation) | 854 roof sub-areas, 2020 ✓ | 3/3 class (`gruen_kat`) match live | confirmed |
| berlin.heat.01 | dl-de/zero-2-0 ✓ | modelled ✓ | 85 areas, 2022 ✓; "settlement areas only" matches typename `…biokl_siedl…` | 3/3 `phk_gesamt` + `schl5` match | confirmed |
| berlin.trees.01 | dl-de/zero-2-0 ✓ | observed ✓ | 803; limitation "street trees only" ✓ (typename `strassenbaeume`; WFS abstract also mentions park trees — they are not in this layer) | 3/3 species/age/street/crown match live | confirmed |
| copenhagen.catchments.01 | CKAN `CC-BY-4.0` ✓; metadata_modified 2023-12-04 ✓ | modelled ✓ (hydrological partition from elevation model, publisher notes) | 7 ✓ | live 7 = 7; names ✓ | confirmed |
| copenhagen.cloudburst-basins.01 | CC-BY-4.0 ✓; modified 2024-08-01 ✓ | `assumed` — judgement: publisher says "planlagte … projekter"; "planned" would be the honest term, `assumed` is the closest vocabulary value | 176 = live 176 ✓; "plan, not built" ✓ | samples (project, catchment, expected_year) consistent with live | confirmed (label judgement) |
| copenhagen.cloudburst-roads.01 | same ✓ | same | **974 vs live 976** (m13) | samples consistent | confirmed-with-difference |
| copenhagen.green.01 | CC-BY-4.0 ✓; modified 2023-12-04 ✓ | derived ✓ ("Registreret på baggrund af BBR og luftfoto") | 93 = live 93 in window ✓ | 3/3 (roof class, material, year) match | confirmed-with-difference (m14: 13 "Andet" class) |
| copenhagen.trees.01 | CC-BY-4.0 ✓; modified 2024-10-29 ✓ | observed ✓ (digitised from local plans + 2018 aerial photo; guidance only) | 612 = live 612 ✓; limitations accurate | samples match; note 'species null' for some | confirmed |
| zurich.heat.01 | CCZero (page) ✓; update 14.06.2024 ✓ | modelled ✓ | 174 ✓ | 3/3 `massnahmengebiet` match live | confirmed |
| zurich.trees.01 | CCZero ✓; update 30.08.2026 ✓ | observed ✓ | 745 in Hardplatz rectangle ✓; "not city-wide" ✓ | 3/3 species/category/crown found live at the point (live Winter-Linde variants ±"Stadt-Linde" in name field) | confirmed |
| zurich.boundary.01 | CCZero ✓; update 08.10.2026 ✓ | observed ✓ | 12 Kreise ✓ | 3/3 Kreis names match; **extent.bbox differs (m11)** | confirmed-with-difference |
| zurich.sealing.01 | CCZero ✓; 18.01.2024 ✓ | observed (mapping) ✓ | 727 polygons shown of 966 intersecting ✓ (stated) | 3/3 `versiegelung`/`biotoptyp` match live (all "unversiegelt") — a weak sample; no sealed polygons in the three | confirmed (sample weak) |
| zurich.pluvial.01 | CCZero ✓ (cantonal dataset page); 08.11.2024 | modelled ✓ | 513 polygons, window, 100-year ✓; limitations match dataset description | 2/3 match; third snapshot polygon (0.1–0.25 m) has a vertex-mean test point that falls inside a live "0–0.1 m" polygon — likely geometry nesting/simplification, inconclusive | confirmed (1 inconclusive) |

Extent bbox vs official boundary: Basel ✓ exact (Gemeinde polygons, data.bs.ch 100017), Berlin ✓ exact (ALKIS Landesgrenze), Copenhagen ✓ exact but **not a municipal boundary** (7 skybrud catchments incl. Frederiksberg — openly disclosed in `extent.source` and `gaps`), Zürich ✗ differs by ≈100–200 m (m11).

## (D) data/indicator-matrix.json — 28 cells

All 28 cells present; every referenced entry id and layer id exists. States judged against the cited material only.

| Cell | Judgement | Change recommended |
|---|---|---|
| sealing/basel | supported (45 % basel-sealed, land-cover access) | align basis wording with layer (m7) |
| sealing/berlin | **understated** | access → open; drop licence caveat (m5) |
| sealing/copenhagen | supported (layers.json gap) | none |
| sealing/zurich | supported, note honest | none |
| canopy/basel | supported | none |
| canopy/berlin | supported (unknown) | none |
| canopy/copenhagen | supported | none |
| canopy/zurich | **overstated** `derivable: yes` | → unknown (m3) |
| heat/basel | supported | none |
| heat/berlin | supported | none |
| heat/copenhagen | supported (single entry) | none |
| heat/zurich | partly overstated `access: open` | note discontinuation (m4) |
| pluvial/basel | supported but uncited | cite gap record (m9) |
| pluvial/berlin | supported | none |
| pluvial/copenhagen | supported; layer reference misleading | drop/qualify catchments layer (m8) |
| pluvial/zurich | supported; cantonal model shown as city-wide | note "cantonal" |
| sewer/basel | supported | none |
| sewer/berlin | supported | none |
| sewer/copenhagen | understated "not researched" | cite copenhagen.transfer.01 (m9) |
| sewer/zurich | **inconsistent** `access: partial` | → not_open/unknown (M3) |
| green-roofs/basel | supported (§72 BPG entry) | none |
| green-roofs/berlin | basis/scale mixed | basis → derived (m6) |
| green-roofs/copenhagen | supported | none |
| green-roofs/zurich | basis label | (m10) |
| effect/basel | **overstated** access not_open, derivable no | (M2) |
| effect/berlin | **overstated** | (M2) |
| effect/copenhagen | **overstated**; also note that outcomes.01 reports a modelled 7–9 % risk reduction estimate | (M2) |
| effect/zurich | **overstated** | (M2) |

Cells I would change: 4 (effect) + sealing/berlin + sewer/zurich + canopy/zurich + heat/zurich + green-roofs/berlin = 9 cells; 4 more get note/citation edits.

## (E) data/verification/basel-claims.json — 5 verdicts re-checked

| Claim | Stored verdict | My re-check | Result |
|---|---|---|---|
| sealed-trees | confirmed-with-difference | Live: 12,504 "Strassenbäume" ✓. Independent sample of 120 street trees tested against the live land-cover API: 91 (75.8 %) in befestigt/Gebäude polygons — consistent with the stored 72.3 % within sampling error (±8 pp). Stored recomputation 9,046 (72.3 %) vs claim 9,132 (73 %) **not reproduced exactly by me**. | confirmed-with-difference (verdict appropriate). **Published claim text (sponge-facts.json:164) still says 9,132 / 73 % and "pit too small to be mapped" (interpretation)** → minor, fix the figure to "about 72–73 %" and drop the causal clause or label it interpretation |
| engelgasse | confirmed-with-difference | Release re-fetched: future-tense announcement, 76 trees, 50 new strips, 26 replaced nearby, works to mid-2018 ✓ as stored | verdict **correct**; claim text not corrected → **M1** |
| basel-hot-days | confirmed | Recomputed from live API (dataset 100254): complete years only — 1961–1990 = 8.80, 1991–2020 = 14.27, 2015–2024 = 21.90 | confirmed exactly |
| voltanord-pilot | confirmed | Landing page P251765 (title, session 18.11.2025) + linked PDF: "Gesamtausgaben in der Höhe von Fr. 280'000"; "jeweils über eine Zeitdauer von fünf Jahren wissenschaftlich begleitet und ausgewertet" | confirmed (planning/spending approval only, as stored) |
| basel-sealed | confirmed | Record count 49,595 ✓ and modified 2026-08-20 ✓. The area-weighted percentages (16.56 / 28.48 / 45.04 %) were **not** recomputed (needs the full 49 k-polygon export) | confirmed (counts); percentages not checked |

The 4 `source-unreachable` verdicts (retention-50, compaction, clogging, benthemplein) were not re-opened.

## Not checked
1. `zurich.context.05` figures (28.6 % / 4.7 % / 1.1 %; 96,178 polygons; 91.79 km²) and `zurich.outcomes.03` (25 flat-roof polygons ≈0.5 ha): would need the full btk_2020 WFS export; only method/provenance text verified.
2. `basel-sealed` percentages (area-weighted sums) and `sealed-trees` exact counts (9,046 / 9,132); sampled instead.
3. The four Basel `source-unreachable` verdicts, and Basel entries not referenced by the matrix (only the 10 matrix-cited Basel entries were read, not re-fetched against sources).
4. "Not found" claims (all `no_public_evidence_found` entries) except the Zürich sewer-geodata and Giessereistrasse/ZHAW searches.
5. Berlin "about 32,000 street areas" and the "(including water bodies and street land)" parenthetical of berlin.context.01: not located on any page I fetched.
6. Layer feature-level spot checks used 3 samples per layer for Zürich (5 layers), Berlin (4) and Copenhagen counts/fields; Basel layers were checked by exact counts/class histogram plus sample trees; the Berlin and Copenhagen boundary polygons themselves were checked only by bbox/count.
