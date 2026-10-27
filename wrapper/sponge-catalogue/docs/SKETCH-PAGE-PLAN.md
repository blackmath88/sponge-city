# Sketch page: execution brief

A self-contained brief for a fresh session that builds the visual layer of the sponge catalogue. The data already exists and has been checked. This task is presentation only.

## 0. Setup

- Repo: `blackmath88/Hack-am-Rhein-2026-SpongeSquad`. Branch: `integration/spatial-journey`. Pull it first, because the branch moves.
- Work only in `wrapper/sponge-catalogue/`. Read these first:
  - `README.md`
  - `data/catalogue.json` (the content source)
  - `docs/CATALOGUE.md` (a readable view of the same data)
  - `scripts/build-doc.mjs` (the validation rules)
  - `../data-charter-map/scripts/build.mjs` and `../data-charter-map/src/page.html`, which show the build pattern and the visual tokens to reuse
- Also read the repo root `WORKSTREAMS.md` and `wrapper/README.md` for ownership boundaries.

## 1. Hard constraints

- Never modify, move or reformat `frontend/`, `data/site-scoping-tool/`, `explainer-videos-context/` or `presentation-story/`.
- Do not change the root `scripts/`, `integration/` or `package.json` without asking. If the page should appear in the integration build, write the one-line proposal for `scripts/build-integration.mjs` (its module list, around line 11) into your report. Do not apply it.
- Do not edit `data/catalogue.json` content. If a text looks wrong, list it in the report. The data was verified against sources, and figures are guarded by `npm test`.
- Never invent evidence. Each potential item's evidence class (observed / derived / assumed / unknown) must stay visible on the page. Derived figures carry "for explaining and screening only".
- A row-2 cell with status `none-found` is shown as a visibly empty cell: a dashed outline with the text "Nothing published found in the reviewed sources". Never hide it.
- Use "No open data found in the reviewed Basel and federal sources" for unknowns, never "no data exists".
- No autonomous merge. Do not open a PR. Commit with normal commits and no force-push.

## 2. What to build

`src/page.html` is one HTML file. `scripts/build.mjs` injects `data/catalogue.json` and `data/potential.json` through a `/*__CATALOGUE__*/ null` marker, using the data-charter-map pattern, and writes `dist/index.html`. Add `"build"` to `package.json` and make `"test"` run `build` and then `build-doc --check` plus a smoke check (step 4).

The page has five horizontal bands. There is one column per action (14), in `catalogue.json` order. Column headers show the name plus the German name.

1. **Row 1, Possible.** Show the sketch, `what`, context chips (new / existing), owner chips (private / public building / Allmend) and mechanism tags.
2. **Row 2, Basel today.** Each `basel[]` item has:
   - a status badge (in force / done / in progress / announced / none-found);
   - its text;
   - small source links.

   The sketch is redrawn in a "realised" variant: same drawing, with the wash only where something is done or in progress. For none-found, use the empty cell from §1.
3. **Row 3, Most potential.** For each `potential[]` item:
   - show its text with its evidence class badge, using the observed / derived / assumed / unknown styles from §3;
   - when the item references a finding, show that finding's method and limitations in an expandable `<details>`;
   - when it references a Data Charter claim, show the claim id and link to `/wrapper/data-charter-map/`.
4. **Row 4, Missing data and the hack.** For each `gaps[]` item:
   - show the question;
   - show the access state as a gate glyph (open / gated / site check / unknown, refining gated into restricted, operator-held or project-held), with "assumed" shown when `access_basis` is assumed;
   - show the gatekeeper names, or "holder not identified";
   - show the decision it blocks;
   - list the hacks as small chips (`kind` → `prototype`), with the `cannot` text visible, not hidden.

   The sketch is redrawn in an "x-ray" variant: the ground below the surface is left as a grey void with a hatched "gated" zone where the gap is underground. This is the visual statement that the blank part decides.
5. **Band, How to get there.** Show the six `levers` as one full-width strip. Mark it "Our proposals (assumed)".

Above the grid, add a short header:

- the title;
- the four `city_findings` as compact statements with evidence badges, with the 296 ha vs 1,353 ha sealed split as a single thin stacked bar.

  Label the 1,353 ha part "other parcels (incl. canton, municipal, SBB)", never "private".

Add filters as two chip groups, context and owner. Columns that don't match dim to about 25 % opacity. They are not removed, so the grid stays stable. Reflect the filter state in the URL hash.

## 3. Visual language

- **Ground.** Near-black (`#0b0d0e`-ish) with off-white line work (`#e9e6df`). Use the Data Charter's `src/tokens.css` for type and spacing. A dark-only page is acceptable here, but still define the colours as `:root` tokens.
- **Sketches.** There are 14 inline SVG symbols, one per `sketch` key:

  barrel, courtyard, curb-cut, dig-once, district, downpipe, gully, parking, rain-garden, roof, square, street-unseal, tree-pit, tree-trench.

  Each is a small section or axonometric drawing, about 160×120 viewBox, with 1.25–1.5 px strokes, round caps, no fills on lines, and a hand-drawn feel. Apply a light `feTurbulence` + `feDisplacementMap` filter to the line group, scale ≈ 1.5. Keep each drawing legible and literal: soil layers, pipe, tree, kerb, water arrows.
- **Watercolour washes.** These are separate shapes beneath the lines. Use one SVG filter chain: `feTurbulence` (fractalNoise, baseFrequency ~0.02–0.04) → `feDisplacementMap` (scale 8–14), then `feGaussianBlur` (~1.5), plus a second low-frequency noise used as an alpha mask for granulation. Use `mix-blend-mode: screen` on black. Palette:

  | Material | Colour | Opacity |
  |---|---|---|
  | water | `#3f8fd2` | ~0.55 |
  | soil | `#9a6b3f` | ~0.5 |
  | planting | `#5f9e4a` | ~0.5 |
  | sealed / asphalt | `#6d6f73` | ~0.35 |
  | heat (optional, `COOL` items) | `#d9783a` | ~0.3 |

  Use each wash only where that material is in the drawing.
- **Evidence badges.** These are typographic, not coloured blobs:
  - observed: solid outline;
  - derived: dashed outline plus "derived";
  - assumed: "≈" prefix plus italic;
  - unknown: dotted outline plus muted text.

  This mirrors the Data Charter's real / inferred / missing separation.
- **Density.** Aim for an operational, VS Code-like density, with crisp 1 px separators between rows and columns and no dashboard chrome. Row labels go in a sticky left column.
- **Width.** On desktop the 14 columns scroll horizontally inside the grid container, with the row-label column sticky. On phones (≤ 640 px), switch to one card per action with the four rows stacked, the filters on top, and no horizontal page scroll. Use a 16 px gutter.
- **Fallbacks.** Respect `prefers-reduced-motion`; there is no animation needed beyond a subtle wash fade-in. All text must be real text, not drawn in the SVG.

## 4. Verification before committing

```bash
cd wrapper/sponge-catalogue && npm test          # build + catalogue check + smoke
cd ../.. && npm test --prefix wrapper/data-charter-map
git diff --check && git status                   # only wrapper/sponge-catalogue/ may change
```

The smoke script (`scripts/smoke.mjs`, node only) checks the built `dist/index.html`:

- the marker is filled;
- there are 14 columns;
- every `sketch` key has an SVG symbol;
- every none-found item renders the empty-cell text;
- every potential item renders an evidence badge;
- every gap renders its access state and every hack its `cannot` text where present;
- "private" never labels the 1,353 ha bar part;
- "dig window" does not appear.

Then serve `dist/` and take Playwright screenshots at 1440×900 and 390×844. Chromium is preinstalled; do not run `playwright install`. Look at the screenshots yourself: lines must read crisply and washes must not muddy the text.

Known unrelated failure: the root `npm test` fails in Street Lab with `node: bad option: --test-isolation=none`. That's not this task, so report it but don't fix it.

## 5. Report back

Include:

- the files changed;
- the checks and their output;
- the screenshots;
- any catalogue text you think is wrong (not edited);
- the proposed one-line integration change (not applied);
- the commit hash.

Then stop.
