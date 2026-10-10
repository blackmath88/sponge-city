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

// `node scripts/maps/zurich.mjs`                    -> all snapshots (base + extra)
// `node scripts/maps/zurich.mjs --only=sealing,pluvial,greenroofs,sealstats` (greenroofs and sealstats only print)  -> selected parts
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const want = n => (only ? only.includes(n) : !['sealstats', 'greenroofs'].includes(n));

if (want('base')) {
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
}

// ---- Second pass (gap closing) ----------------------------------------------------------------
const BBOX = [8.510, 47.382, 8.522, 47.390]; // lon/lat window around Hardplatz (same as trees)
const inBox = ([x, y]) => x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3];

// Sutherland-Hodgman clip of one ring to the rectangular window (window is convex)
function clipRing(rg) {
  const edges = [
    [p => p[0] >= BBOX[0], (a, b) => [BBOX[0], a[1] + (b[1] - a[1]) * (BBOX[0] - a[0]) / (b[0] - a[0])]],
    [p => p[0] <= BBOX[2], (a, b) => [BBOX[2], a[1] + (b[1] - a[1]) * (BBOX[2] - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= BBOX[1], (a, b) => [a[0] + (b[0] - a[0]) * (BBOX[1] - a[1]) / (b[1] - a[1]), BBOX[1]]],
    [p => p[1] <= BBOX[3], (a, b) => [a[0] + (b[0] - a[0]) * (BBOX[3] - a[1]) / (b[1] - a[1]), BBOX[3]]],
  ];
  let out = rg.slice(0, -1);
  for (const [inside, cut] of edges) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); }
      else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) return null;
  }
  out.push(out[0]);
  return out;
}
function clipGeom(g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const res = polys.map(p => p.map(clipRing).filter(Boolean)).filter(p => p.length && p[0].length >= 4);
  if (!res.length) return null;
  return res.length === 1 ? { type: 'Polygon', coordinates: res[0] } : { type: 'MultiPolygon', coordinates: res };
}
function shape(f, props, tol) {
  const g = f.geometry && clipGeom(f.geometry);
  const s = g && simplifyGeom(g, tol);
  return s && s.coordinates.length ? { type: 'Feature', properties: props, geometry: s } : null;
}

// 4) Biotoptypenkartierung 2020: Versiegelung (attribute `versiegelung`), window around Hardplatz
if (want('sealing')) {
  const svc = `${WFS}/Biotoptypenkartierung_2020`;
  const base = `${svc}?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&TYPENAME=btk_2020`;
  const bb = `&BBOX=${BBOX.join(',')},EPSG:4326`;
  const all = []; // page explicitly: maxFeatures alone silently truncates
  for (let i = 0; ; i += 500) {
    const page = await get(q('Biotoptypenkartierung_2020', 'btk_2020', `&maxFeatures=500&startIndex=${i}&sortBy=objectid${bb}`));
    all.push(...page.features);
    if (page.features.length < 500) break;
  }
  console.log('biotope features intersecting window:', all.length);
  save('zurich.sealing.01.geojson', all.map(f => shape(f, {
    versiegelung: f.properties.versiegelung, biotoptyp: f.properties.lrtyp2text,
  }, 0.00004)).filter(Boolean));
}

// 5) Oberflächenabfluss (canton ZH, modelled): flow depth for a 100-year event, same window.
//    maps.zh.ch takes BBOX in lat/lon order for EPSG:4326 (lon/lat returns an empty collection).
if (want('pluvial')) {
  const url = 'https://maps.zh.ch/wfs/OGDZHWFS?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.1.0&outputFormat=GeoJSON&srsName=EPSG:4326' +
    `&TYPENAME=ogd-0035_awel_wb_ofa_fliesstiefen_p100_f&BBOX=${BBOX[1]},${BBOX[0]},${BBOX[3]},${BBOX[2]},EPSG:4326`;
  const d = await get(url);
  save('zurich.pluvial.01.geojson', d.features.map(f => shape(f, {
    fliesstiefe: f.properties.waterlevel_txt === 'Gewässer' ? 'Gewässer' : f.properties.waterlevel_txt,
  }, 0.00004)).filter(Boolean));
}

// 6) Green-roof check (prints only): "Flachdach" biotope types in the Biotoptypenkartierung 2020. 25 polygons, ca. 0.5 ha in the whole
//    city against ca. 1119 ha of "Gebäude" polygons -> the survey is not a roof inventory, so no layer and no total is published.
if (want('greenroofs')) {
  const d = await get(q('Biotoptypenkartierung_2020', 'btk_2020', `&EXP_FILTER=${encodeURIComponent('"lrtyp2text"=\'Flachdach\'')}`).replace('EPSG:4326', 'EPSG:2056'));
  const ringA = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
  const ha = d.features.reduce((a, f) => a + (f.geometry ? (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).reduce((b, p) => b + Math.abs(ringA(p[0])), 0) : 0), 0) / 1e4;
  console.log('Flachdach polygons:', d.features.length, 'area ha:', ha.toFixed(2));
}

// 7) City-wide sealed share from the biotope map (prints only; the figure goes into data/cities/zurich.json).
//    Pages the whole dataset in EPSG:2056 (metres) and sums planar polygon area per `versiegelung` class.
if (want('sealstats')) {
  const ringA = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
  const area = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
    .reduce((a, p) => a + Math.abs(ringA(p[0])) - p.slice(1).reduce((b, h) => b + Math.abs(ringA(h)), 0), 0);
  const sum = {}; let n = 0, nullGeom = 0;
  for (let i = 0; ; i += 3000) {
    const page = await get(q('Biotoptypenkartierung_2020', 'btk_2020', `&maxFeatures=3000&startIndex=${i}&sortBy=objectid`).replace('EPSG:4326', 'EPSG:2056'));
    for (const f of page.features) {
      n++;
      if (!f.geometry) { nullGeom++; continue; }
      sum[f.properties.versiegelung] = (sum[f.properties.versiegelung] ?? 0) + area(f.geometry);
    }
    if (page.features.length < 3000) break;
  }
  const tot = Object.values(sum).reduce((a, b) => a + b, 0);
  console.log({ features: n, nullGeom, totalKm2: +(tot / 1e6).toFixed(2) });
  for (const [k, v] of Object.entries(sum)) console.log(k, (v / 1e6).toFixed(3), 'km2', (100 * v / tot).toFixed(2), '%');
}
