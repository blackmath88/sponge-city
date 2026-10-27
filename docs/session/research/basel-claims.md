# Basel claim revalidation (Delivery 5), checked 2026-10-10

Machine-readable record: `data/verification/basel-claims.json` (schema `sponge-claim-checks/1`). `practice.json` and `sponge-facts.json` were not edited.
16 claims: 12 practice cases plus the `actual` statements for land-cover, sealing-fraction, tree-pits and sewer-network.

**Verdicts:** confirmed 10, confirmed-with-difference 2, source-unreachable 4, not-found-on-page 0, not-checked 0.

## Needs a decision
| Claim | Finding |
|---|---|
| `sealed-trees` | The 12,504 street trees match. Recomputed against live land cover, 9,046 (72.3 %) sit in sealed polygons, not 9,132 (73 %). The 86 gap is not fully explained (82 trees fall in no polygon; data has been updated). The median of 371 m² was not checked. |
| `engelgasse` | The 2016 release is a *plan* (future tense: "wird … je einen Jungbaum anpflanzen" in 50 new pits). No fetched source shows it was done. The claim is worded as completed. |
| `sevogel`, `voltanord-pilot` | Figures confirmed, but both are plans or approvals (Nov 2025). Neither shows built status or a measured effect. |
| `benthemplein`, `compaction`, `clogging`, `retention-50` | Cited URLs fail: 404, 404, 404, and 403 (Cloudflare challenge). The claims are unchecked. The sources need replacing or the claims need a dated "not re-verified" note. |

## Confirmed by recomputation from open data
- `basel-sealed`: buildings 16.56 %, paved 28.48 %, roads 9.47 %, sidewalks 4.17 %, total 45.0 %. My own area total is 36.9 km², not 36.6 (approximation).
- `basel-hot-days`: 8.80 / 14.27 / 21.90 hot days per year. The 14.27 rounds to 14.3.
- `land-cover` (49,595 polygons, CC BY 4.0, 2026-08-20) and `tree-pits` (no pit or root-space field) are confirmed.
- `sealing-fraction` and `sewer-network` are absence claims. A data.bs.ch keyword search found no such dataset, only the ARA catchment with 13 polygons. Federal sources and the 2012 GEP PDF were **not** checked.

## Confirmed from documents
- `bern-36`: Bern guidance, 36 m³ target; depth at least 1.0 m, and 1.5 m if 36 m³ cannot otherwise be reached.
- `voltanord-pilot`: CHF 280'000 and five years are in the resolution PDF linked from P251765. The landing page itself shows only the title.
- `interception-season`: abstract of Xiao & McPherson (2002): 14.8 % of 21.7 mm in winter and 79.5 % of 20.3 mm in summer. Santa Monica, California; modelled; only the abstract was read.

## Claim types
- `implementation`: bern-36, engelgasse, sevogel, voltanord-pilot, benthemplein.
- `study-elsewhere`: interception-season, retention-50, compaction, clogging.
- `context`: basel-sealed, basel-hot-days, sealed-trees and the four measurement statements.
- `measured-performance`: none among the Basel claims. No fetched Basel source reports a measured effect.

## Limits
Only the cited sources were fetched. No substitute sources were used. Datasets are live, so recomputed numbers can drift. Hot-day and sealed-tree figures are my recomputations, not published statistics.
