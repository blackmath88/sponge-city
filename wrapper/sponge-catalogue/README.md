# Sponge catalogue

What a sponge city can do in Basel, as data first; the sketch page comes after review.

One column per action (14), four rows plus a band:

1. **Possible**: what the action is, for new developments or existing structures, and for which owner (private, public buildings, Allmend).
2. **Basel today**: verified items with a status (in force, done, in progress, announced) or a visible `none-found`.
3. **Potential**: where the impact lies, typed as observed, derived, assumed or unknown.
4. **Missing data and the hack**: per action, the gaps that block a decision, each with an access state (from `../data-charter-map/docs/GATEKEEPERS.md`), gatekeeper, the decision it blocks, and hacks (derive, digitise, annotate, observe, request, site-test, design-around). Each hack names the prototype it feeds and what it cannot establish.
5. **How to get there**: six levers. These are our proposals (`assumed`).

| File | Role |
|---|---|
| `data/catalogue.json` | Actions, Basel status, potential, levers and sources |
| `data/potential.json` | Derived figures written by `scripts/compute_potential.py` |
| `scripts/compute_potential.py` | Reproduces the derived city findings from open Basel data (stdlib Python) |
| `scripts/build-doc.mjs` | Validates the catalogue and writes `docs/CATALOGUE.md` |
| `docs/CATALOGUE.md` | Generated readable catalogue; do not edit |

```bash
npm test                                       # validate; fail if the doc is stale
npm run doc                                    # regenerate docs/CATALOGUE.md
python3 scripts/compute_potential.py --cache /tmp/sponge-cache   # recompute (land cover takes minutes)
```

## Evidence rules

- Derived figures come from our overlays. They are not validated and are for explaining and screening only. Each one names its method and limitations.
- "Other parcels" are not only private land: the parcel data has no owner field, so canton, municipal and SBB land is included.
- Permits are not a coordinated works plan. Being near a suitable street is a screening signal, not a project.
- Where data is missing, the catalogue says "No open data found in the reviewed Basel and federal sources". It does not estimate.
- Tree and groundwater items reuse the Data Charter's typed claims (`../data-charter-map/data/data-charter.json`), and the validator checks that those claim ids exist.
