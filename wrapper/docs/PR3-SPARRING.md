# Sparring review: `sponge-city` pull request 3

Reviewed: 2026-10-03
Source: <https://github.com/blackmath88/sponge-city/pull/3>
PR state at review: open, explicitly marked “do not merge yet”; data modules are mocks.

## Bottom line

The PR is a strong research and contract prototype. Its most valuable contribution to this MVP is a discipline for claims: separate place evidence, state transformations, effects and rendering; keep routing explicit; attach drivers; and allow `unknown` or `not-applicable` instead of inventing certainty.

It should not be copied wholesale into the hackathon build. The current Street Lab already has the smaller, working vertical slice. Importing the complete adaptive engine now would create two world models, two effect systems and unnecessary integration risk.

## Adopt now

| Idea from PR 3 | Integration in this branch |
| --- | --- |
| `STATE → INTERVENTION → NEW STATE → EFFECTS` | Existing pure `applyPlan` and `simulate` flow retained |
| Routing is observed, assumed or unknown | Added explicit `evidence.routing` to `StreetScenario` |
| Effects expose their drivers | Added pure mechanism claims for STORE, ABSORB and SLOW |
| Research is separate from execution | Added source references and geography labels; sources do not change model values |
| Real data gaps remain visible | Added Basel data-readiness view; sewer/gully routing is a named gap |
| Renderer consumes results | React/SVG remains a projection; no evidence or simulation rules moved into it |

## Defer

| PR 3 capability | Why it waits |
| --- | --- |
| Full `adaptive-state/0.2` graph | Duplicates the narrower typed street graph before the MVP needs breadth |
| Generic intervention compiler | One deterministic rain-garden patch is easier to verify and present |
| Eight-effect qualitative engine | Heat, shade and evapotranspiration require additional state and a second scenario slice |
| JSON Schema suite for every internal object | Add at external handoffs first; TypeScript plus runtime graph validation covers the current internal slice |
| Broad intervention catalogue | Research records without an executable recipe should remain knowledge, not clickable promises |

## Data findings that materially affect architecture

- Basel cadastral land cover (`100477`) can seed buildings, roads, sidewalks, traffic islands, gardens and water as observed geometry.
- The Basel tree cadastre (`100052`) can seed tree locations, but not tree-pit dimensions.
- Groundwater protection zones (`100292`) can support an intervention constraint.
- The sponge suitability layer (`SETV`) is useful prioritisation context, not proof of street geometry or drainage.
- Sewer networks, gullies, utilities, soil permeability, parking-bay geometry, tree-pit sizes and roof load capacity remain gaps in the reviewed open sources.

## Recommended next vertical slice

Implement a `BaselPlaceProvider` behind an adapter for one prepared location:

1. fetch or cache land-cover polygons from `100477`;
2. add nearby trees from `100052`;
3. intersect groundwater protection zones from `100292`;
4. preserve missing soil, utilities and routing as explicit unknowns;
5. map only verified facts into a versioned scenario seed;
6. keep the current illustrative hydrological parameters until calibration evidence exists.

This produces a visibly real Basel street context without pretending that open geometry is already an engineering model.
