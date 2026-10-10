#!/usr/bin/env node
// Reproduces data/maps/zurich/*.geojson from Stadt Zürich Open Data WFS (CC0 per data.stadt-zuerich.ch).
// Usage: node scripts/maps/zurich.mjs   (network required; layers.json is hand-written metadata)
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'maps', 'zurich');
const WFS = 'https://www.ogd.stadt-zuerich.ch/wfs/geoportal';
const q = (svc, typename, extra = '') =>
  `${WFS}/${svc}?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&TYPENAME=${typename}&outputFormat=GeoJSON&srsName=EPSG:4326${extra}`;
const r = (n, d = 5) => Number(n.toFixed(d));

// Douglas-Peucker on lon/lat degrees (tolerance in degrees; 0.00005 ~ 5 m)
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], a, b);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function ring(rg, tol) {
  const s = dp(rg, tol).map(([x, y]) => [r(x), r(y)]);
  return s.length >= 4 ? s : null;
}
function simplifyGeom(g, tol) {
  if (g.type === 'Point') return { type: 'Point', coordinates: g.coordinates.map(v => r(v)) };
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const out = polys.map(p => p.map(rg => ring(rg, tol)).filter(Boolean)).filter(p => p.length);
  return out.length === 1 ? { type: 'Polygon', coordinates: out[0] } : { type: 'MultiPolygon', coordinates: out };
}
async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sponge-city-research' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
function save(name, features) {
  const file = join(OUT, name);
  writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
  console.log(name, features.length, 'features', statSync(file).size, 'bytes');
}

mkdirSync(OUT, { recursive: true });

// 1) Fachplanung Hitzeminderung: Massnahmengebiete
const heat = await get(q('Fachplanung_Hitzeminderung_OGD', 'fph_massnahmengebiete_ogd'));
const code = { 'MG 1 - Tag / Nacht': '1', 'MG 2 - Tag': '2', 'MG 3 - Empfehlung': '3' };
save('zurich.heat.01.geojson', heat.features.map(f => ({
  type: 'Feature',
  properties: { massnahmengebiet: f.properties.massnahmengebiet, klasse: code[f.properties.massnahmengebiet] ?? '' },
  geometry: simplifyGeom(f.geometry, 0.00006),
})));

// 2) Stadtkreise
const kreise = await get(q('Stadtkreise', 'adm_stadtkreise_v'));
save('zurich.boundary.01.geojson', kreise.features.map(f => ({
  type: 'Feature',
  properties: { kname: f.properties.kname, knr: f.properties.knr },
  geometry: simplifyGeom(f.geometry, 0.00008),
})));

// 3) Baumkataster: bounded subset (bbox lon/lat, Kreis 4/5 around Hardplatz), max 1500 points
const bbox = '8.510,47.382,8.522,47.390';
const trees = await get(q('Baumkataster', 'baumkataster_baumstandorte', `&maxFeatures=1500&BBOX=${bbox},EPSG:4326`));
save('zurich.trees.01.geojson', trees.features.map(f => ({
  type: 'Feature',
  properties: {
    baumnamedeu: f.properties.baumnamedeu, kategorie: f.properties.kategorie,
    pflanzjahr: f.properties.pflanzjahr, kronendurchmesser: f.properties.kronendurchmesser,
  },
  geometry: simplifyGeom(f.geometry, 0),
})));
