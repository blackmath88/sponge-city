# Street X-Ray engine

Computed street profile and assessment rules behind Street X-Ray (ADR 0008, ADR 0009). One rule-picked Basel street, every decision-relevant fact typed: what we can see, what we can compute, what we must ask. The page in `..` uses it: its checks call `assessFacts()`, and `?street=kanonengasse` shows this computed street beside the illustrative Klybeck fixture.

| File | Role |
|---|---|
| `scripts/select_street.py` | Picks the demo street by rule and gathers its open inputs into `data/demo-street.json` |
| `src/profile.js` | `computed-street-profile/0.1`: `buildProfile`, `validateProfile`, `scenarios`, `assess`, `assessFacts` |
| `src/to-page.js` | Converts the profile into the page's claim shape |
| `scripts/build-profile.mjs` | Writes `data/profile.json` and `data/kanonengasse.page.json`; `--check` fails if either is invalid or stale |
| `test/profile.test.mjs` | Unknown never becomes zero, safe or suitable; assessment rules |

```bash
npm test                                                   # validate profile + 14 tests
npm run build                                              # rebuild data/profile.json
python3 scripts/select_street.py --cache /tmp/sponge-cache # re-pick and refetch (uses ../../sponge-catalogue)
```

## Demo street

The rule picks a street that is:

- rated sponge-suitable by traffic;
- in a Fokus heat area;
- named;
- the one with the most active or upcoming permits within 60 m.

On the 3 October 2026 snapshot that is **Kanonengasse**: 241 m, with 24 utility permits ending between December 2026 and April 2027. The 12 m corridor either side holds:

- about 3,077 m² of sealed ground (road and other paving);
- 176 m² planted;
- 2 cadastre trees.

There is no groundwater protection zone at the middle vertex. The shallowest groundwater at the nearest station (164 m away) is 13.1 m below ground.

Seven facts stay unknown, each with a gatekeeper and a next action:

- drainage system;
- utilities;
- utility depth;
- infiltration;
- overflow route;
- pavement build-up;
- gullies.

With no gatekeeper answers, only the no-dig future is a candidate. `assess(profile, { utilities: "clear", overflow_route: "allowed" })` shows how one answer turns a tree trench into a candidate. These are hypotheses, never answers that were received.

Scenarios are derived, not validated, and for explaining and screening only. A 30 mm rain on the corridor's sealed ground gives 64.6–87.7 m³ of runoff. One assumed 20 m² element holds 1.0–3.2 m³.
