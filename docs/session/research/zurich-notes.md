# Zürich research notes (2026-10-10)

Outputs: `data/cities/zurich.json` (20 entries, validateProfile → `[]`), `data/maps/zurich/` (layers.json + 3 snapshots, 127/151/29 KB), `scripts/maps/zurich.mjs` (reproduces the snapshots from the Open Data Zürich WFS; layers.json is hand-written metadata).

## Sources fetched (all 2026-10-10, HTTP 200)
- Kanton Zürich: Schwammstadt interview (zh_news), Zürcher Umweltpraxis 97 (Hitzeminderung), Klimakarten 2025 news, Stadtklima Messbericht 2020, Gefahrenkarte page, sealing press release 2022 (14 % cantonal).
- Stadt Zürich: Fachplanung Stadtbäume page + 2022 press release, Weltwassertag 2025 (ERZ), ERZ "Blau-grüne Infrastruktur", Giessereistrasse press release 2020, Leitfaden Solargründach (BZO Art. 11).
- Open Data Zürich / opendata.swiss: Baumkataster, Fachplanung Hitzeminderung OGD, Stadtkreise, Oberflächenabfluss, Stadtklima datasets (CKAN API).
- ZHAW project page 72564; Aqua Urbanica 2025 paper V05 (Hauber/Antener).
Every quote in the profile was machine-checked as a whitespace-normalised substring of the fetched text.

## Blocked / not found
- ERZ brochure SW_Wasserkreislauf_von_Zuerich_1312.pdf: HTTP 404 → sewer facts (length, 47/28 % split seen in snippets) NOT used; context.04 is no_public_evidence_found.
- No city-wide sealing figure or green-roof area (only cantonal 14 %); a city remote-sensing study appeared only as a search snippet, not read.
- No published Giessereistrasse/Scheuchzerstrasse monitoring results.
- Oberflächenabfluss: only a viewer link (geo.zh.ch), no tile URL resolved → gap. Gefahrenkarte page read, no data downloaded.
- Fachplan Regenwasser im Siedlungsraum: status after consultation (early 2026) unknown.

## Caveats to carry forward
- Licence: data.stadt-zuerich.ch says CCZero; opendata.swiss says terms_open (also permits reuse). Recorded both.
- Stadtklima meteoblue datasets titled "[Nachführung eingestellt]" but description says updated Aug 2026 → conflict recorded, no station layer.
- Crown cover: 17 % (2018, press release 2022) vs 15 % (2022, current page); no trend figure given. Entry measurement.01 uses topic `canopy` (shared with Basel); it will show "not comparable" by scale/method.
- Search-snippet claims (Baublatt, ZKB, Quartier Enge document, a city sealing study) were deliberately not used.
- Tree layer is a 745-tree bounded sample around Hardplatz, not representative.
- Not run: git commit/push (coordinator integrates). The coordinator note about `legend.property` was applied (heat and trees layers set it).
