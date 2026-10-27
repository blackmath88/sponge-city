# Street X-Ray

Street X-Ray is the evidence gate between a promising candidate area and the
illustrative Street Lab.

It answers one bounded question for one Basel study point:

> This edge looks usable. Is it buildable?

The page keeps three layers separate:

1. **Known now** — contextual records available in the bundled Basel snapshot;
2. **Derived carefully** — explicit screening hypotheses and scenario geometry;
3. **Must ask or measure** — gated or site-specific evidence that blocks a real
   recommendation.

The centre point comes from Andy's illustrative Klybeck candidate. The tree
count and nearest groundwater station are reproduced from
`../data-charter-map/data/charter-map.json`. The 160 m street segment, 2.4 m
candidate strip, flow arrow and intervention are deliberately illustrative.

## Run and verify

From the repository root:

```bash
npm --prefix wrapper run dev
node wrapper/street-xray/smoke.mjs
```

Open <http://localhost:5172/wrapper/street-xray/>.

The page is dependency-free. Its Evidence Passport has a print layout and its
Street Lab button emits the existing `candidate-site-context.v1` payload. It
does not widen that cross-team contract or pass inferred street geometry.
