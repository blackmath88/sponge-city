# Basel situation map

**Question:** What do we know about this place, and what don't we?

One map with layers grouped by need, possibility, observations, planning and unknown, each labelled observed, modelled, derived, planning or unknown:

- **Need:** Basel climate analysis (night air temperature, daytime heat stress, 2030 scenario; relative colours only, as the service publishes no values), Stadtklimakonzept heat focus areas, and the federal surface-runoff hazard map (hidden beyond 1:12,500 as BAFU requires).
- **Possibility:** all register trees (colour by age, setting or genus) and 3D buildings with generalised swisstopo heights.
- **Observations and planning:** meteoblue stations with live refresh; VoltaNord development-plan perimeters.
- **Unknown:** soil water, infiltration, utilities and ownership are listed but never drawn.

Click any empty spot for the **place lens**: it reads every layer at that point and exports a `place-profile/draft-0` JSON in which unknowns stay unknown. Keys: `/` search, `3` 3D view, `T` control-room theme, `L` lens at map centre, `Esc` close. The URL keeps view, layers, theme and selection.

- Page source: `page.html` → built to `site/situation-map.html`
- Snapshot: `data/basel-map.json` (trees, stations, plans from data.bs.ch, CC BY 4.0), refreshed by `fetch.mjs` (`make fetch`)
- Live: swisstopo, geo.bs.ch WMS («Quelle: Geodaten Kanton Basel-Stadt»), geo.admin.ch (© BAFU), data.bs.ch
- Test: `smoke.mjs`
- Background: [PRECEDENT-QTREES-BERLIN.md](../../docs/PRECEDENT-QTREES-BERLIN.md) (interaction patterns adapted, no code copied), [DECISION-CANVAS.md](../../docs/DECISION-CANVAS.md)
