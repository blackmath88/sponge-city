// Builds data/maps/basel/ (sponge-city-layers/1) from data.bs.ch (Opendatasoft API, bounded bbox queries).
// Usage: node scripts/maps/basel.mjs   (needs network; no keys)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'maps', 'basel');
mkdirSync(out, { recursive: true });
const API = 'https://data.bs.ch/api/explore/v2.1/catalog/datasets';
const today = new Date().toISOString().slice(0, 10);
// Window in central Basel (Grossbasel/Kleinbasel, Rhein): lat S,W,N,E
const WIN = { s: 47.5555, w: 7.5835, n: 47.5615, e: 7.5935 };
const where = `in_bbox(geo_point_2d,${WIN.s},${WIN.w},${WIN.n},${WIN.e})`;
const r5 = n => Math.round(n * 1e5) / 1e5;
function dp(pts, tol) { // Douglas-Peucker on lon/lat degrees
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let m = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i], [x1, y1] = pts[a], [x2, y2] = pts[b];
      const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
      const t = l ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l)) : 0;
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
      if (d > m) { m = d; mi = i; }
    }
    if (m > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ring = (r, tol) => { // keep the rounded original when simplification would collapse a small ring
  const s = dp(r, tol).map(([x, y]) => [r5(x), r5(y)]); if (s.length >= 4) return s;
  const o = r.map(([x, y]) => [r5(x), r5(y)]); return o.length >= 4 ? o : null; };
function simplify(geom, tol) {
  if (geom.type === 'GeometryCollection') { // keep polygon members only
    const ps = geom.geometries.flatMap(g => g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
    return ps.length ? simplify({ type: 'MultiPolygon', coordinates: ps }, tol) : null;
  }
  if (geom.type === 'Polygon') { const rs = geom.coordinates.map(r => ring(r, tol)).filter(Boolean); return rs.length ? { type: 'Polygon', coordinates: rs } : null; }
  if (geom.type === 'MultiPolygon') { const ps = geom.coordinates.map(p => p.map(r => ring(r, tol)).filter(Boolean)).filter(p => p.length); return ps.length ? { type: 'MultiPolygon', coordinates: ps } : null; }
  if (geom.type === 'Point') return { type: 'Point', coordinates: geom.coordinates.map(r5) };
  return geom;
}
async function get(url) { const r = await fetch(url, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
async function records(ds, params, max) {
  const all = [];
  for (let off = 0; off < max; off += 100) {
    const q = new URLSearchParams({ ...params, limit: String(Math.min(100, max - off)), offset: String(off) });
    const j = await get(`${API}/${ds}/records?${q}`); all.push(...j.results);
    if (all.length >= j.total_count) break;
  }
  return all;
}
const fc = features => ({ type: 'FeatureCollection', features });
const bytes = o => Buffer.byteLength(JSON.stringify(o));
function save(name, o) { const s = JSON.stringify(o); if (s.length > 400000) throw new Error(`${name} ${s.length} > 400 KB`); writeFileSync(join(out, name), s); console.log(name, s.length); }

// 1. Boundary: Gemeinde (amtliche Vermessung, Hoheitsgrenzen)
const gem = await records('100017', {}, 10);
const bFeat = gem.map(g => ({ type: 'Feature', geometry: simplify(g.geo_shape.geometry, 0.0001), properties: { name: g.gemeindename } }));
let [W, S, E, N] = [180, 90, -180, -90];
const walk = c => typeof c[0] === 'number' ? (W = Math.min(W, c[0]), E = Math.max(E, c[0]), S = Math.min(S, c[1]), N = Math.max(N, c[1])) : c.forEach(walk);
for (const g of gem) walk(g.geo_shape.geometry.coordinates);
save('basel.boundary.01.geojson', fc(bFeat));

// 2. Bodenbedeckung (sealing classes) in the window
const bb = await records('100477', { where, select: 'bodenbedeckungsart,geo_shape' }, 5000);
const bbN = bb.length;
let tol = 0.00003, sealing;
for (; ; tol *= 1.4) {
  sealing = fc(bb.map(b => ({ type: 'Feature', geometry: simplify(b.geo_shape.geometry, tol), properties: { class: b.bodenbedeckungsart } })).filter(f => f.geometry));
  if (bytes(sealing) < 380000) break;
}
save('basel.sealing.01.geojson', sealing);
// 3. Baumkataster in the window
const tr = await records('100052', { where, select: 'geo_point_2d,baumart_deutsch,ba_baumalter,ba_strasse,ba_gruppe' }, 3000);
const trees = fc(tr.map(t => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r5(t.geo_point_2d.lon), r5(t.geo_point_2d.lat)] }, properties: { species: t.baumart_deutsch, age_years: t.ba_baumalter, street: t.ba_strasse, group: t.ba_gruppe } })));
save('basel.trees.01.geojson', trees);
const groups = [...new Set(tr.map(t => t.ba_gruppe))];
console.log({ bbN, tol, trees: tr.length, groups });

const CC = 'https://creativecommons.org/licenses/by/4.0/';
const cls = [
  ['Gebaeude', '#7a7a7a', 'Gebäude', 'Buildings'], ['befestigt', '#b5651d', 'Befestigte Flächen (Strasse, Trottoir, Areal)', 'Paved surfaces (road, pavement, sites)'],
  ['humusiert', '#7bb661', 'Humusierte Flächen (Park, Garten, Wiese)', 'Humus-covered surfaces (park, garden, meadow)'], ['bestockt', '#2d6a4f', 'Bestockte Flächen (Wald, Gehölz)', 'Wooded surfaces'],
  ['Gewaesser', '#4a90c2', 'Gewässer', 'Water bodies'], ['vegetationslos', '#d9c9a3', 'Vegetationslose Flächen', 'Bare surfaces']];
const used = new Set(sealing.features.map(f => f.properties.class));
// legend uses the full publisher class string; list the ones present, coloured by top-level class
const colour = c => (cls.find(x => c.startsWith(x[0])) || [0, '#999999'])[1];
const items = [...used].sort().map(v => ({ value: v, label: { de: v.replaceAll('_', ' ').replaceAll('.', ' · '), en: v.replaceAll('_', ' ').replaceAll('.', ' · ') + ' (publisher class, German)' }, color: colour(v) }));
const trCol = { 'Strassenbäume': '#2d6a4f' };
const layers = {
  schema_version: 'sponge-city-layers/1', city: 'basel',
  extent: { bbox: [r5(W), r5(S), r5(E), r5(N)], source: 'Bounding box of the Gemeinde polygons Basel, Riehen, Bettingen, data.bs.ch dataset 100017 (Grundbuch- und Vermessungsamt BS, amtliche Vermessung), https://data.bs.ch/explore/dataset/100017/' },
  layers: [
    { id: 'basel.boundary.01', theme: 'boundary', title: { de: 'Gemeindegrenzen Kanton Basel-Stadt', en: 'Municipal boundaries, Canton Basel-Stadt' }, kind: 'geojson-snapshot', file: 'basel.boundary.01.geojson', tiles: null,
      origin: 'observed', method: 'Hoheitsgrenzen der amtlichen Vermessung; polygons simplified (about 10 m) by scripts/maps/basel.mjs', unit: 'polygon', spatial_scale: 'municipality', temporal: 'dataset modified 2026-08-20', retrieved: today, coverage: 'Basel, Riehen, Bettingen (whole canton)',
      publisher: 'Grundbuch- und Vermessungsamt Basel-Stadt', licence: 'CC BY 4.0', licence_url: CC, source_url: 'https://data.bs.ch/explore/dataset/100017/', attribution: 'Grundbuch- und Vermessungsamt Basel-Stadt, Open Data Basel-Stadt, CC BY 4.0',
      limitations: { de: 'Vereinfachte Geometrie, nicht für Vermessungszwecke.', en: 'Simplified geometry, not for survey use.' },
      legend: { type: 'single', items: [{ value: 'boundary', label: { de: 'Gemeindegrenze', en: 'Municipal boundary' }, color: '#444444' }] }, properties_shown: ['name'], measure_topic: null },
    { id: 'basel.sealing.01', theme: 'sealing', title: { de: 'Bodenbedeckung (Versiegelung) – Ausschnitt Innenstadt', en: 'Land cover (sealing) – city-centre window' }, kind: 'geojson-snapshot', file: 'basel.sealing.01.geojson', tiles: null,
      origin: 'observed', method: 'Bodenbedeckung der amtlichen Vermessung (Objekte: Gebäude, befestigte, humusierte, bestockte, vegetationslose Flächen, Gewässer); Polygone mit Schwerpunkt im Fenster, vereinfacht (Toleranz ' + tol.toFixed(5) + '°)', unit: 'land-cover class', spatial_scale: 'parcel/object (cadastral survey)', temporal: 'dataset modified 2026-08-20', retrieved: today,
      coverage: `Ausschnitt ca. 0.8 km × 0.7 km um Rhein/Mittlere Brücke, lon ${WIN.w}–${WIN.e}, lat ${WIN.s}–${WIN.n}; ${bbN} Objekte (nicht ganz Basel) / window of about 0.8 km × 0.7 km around the Rhine/Mittlere Brücke, same bbox; ${bbN} objects (not all of Basel)`,
      publisher: 'Grundbuch- und Vermessungsamt Basel-Stadt', licence: 'CC BY 4.0', licence_url: CC, source_url: 'https://data.bs.ch/explore/dataset/100477/', attribution: 'Grundbuch- und Vermessungsamt Basel-Stadt, Open Data Basel-Stadt, CC BY 4.0',
      limitations: { de: 'Nur ein Ausschnitt. «Befestigt» ist die Vermessungsklasse und sagt nichts über die Wasserdurchlässigkeit des Belags; Dachflächen und Bäume über Flächen sind nicht erfasst. Geometrie vereinfacht.', en: 'Window only. "befestigt" (paved) is the survey class and says nothing about permeability of the surface; roof types and tree canopy over surfaces are not captured. Geometry simplified.' },
      legend: { type: 'categorical', property: 'class', items }, properties_shown: ['class'], measure_topic: 'sealing-fraction' },
    { id: 'basel.trees.01', theme: 'trees', title: { de: 'Baumkataster – Ausschnitt Innenstadt', en: 'Tree register – city-centre window' }, kind: 'geojson-snapshot', file: 'basel.trees.01.geojson', tiles: null,
      origin: 'observed', method: 'Baumkataster der Stadtgärtnerei (städtisch gepflegter Baumbestand), Punkte im Fenster; Koordinaten auf 5 Dezimalen gerundet', unit: 'tree (point)', spatial_scale: 'single tree', temporal: 'dataset modified 2026-10-10 (register is updated continuously)', retrieved: today,
      coverage: `Dasselbe Fenster wie Bodenbedeckung; ${tr.length} Bäume / same window as land cover; ${tr.length} trees`, publisher: 'Stadtgärtnerei Basel-Stadt', licence: 'CC BY 4.0 (Datensatz-Lizenzfeld: «CC BY 4.0 + OpenStreetMap»; verlinkt ist die Erlaubnis des GVA vom 2024-08-22, CC-BY-Daten in OpenStreetMap aufzunehmen; sie enthält keine zusätzlichen Auflagen für Nutzende dieses Datensatzes)', licence_url: CC, source_url: 'https://data.bs.ch/explore/dataset/100052/', attribution: 'Stadtgärtnerei Basel-Stadt, Open Data Basel-Stadt, CC BY 4.0',
      limitations: { de: 'Nur von Stadtgärtnerei und Gemeinde Riehen gepflegte Bäume (inkl. von der Stadtgärtnerei gepflegte Privatbäume); übrige private Bäume fehlen. Ausschnitt, keine Aussage zur Kronenbedeckung.', en: 'Only trees maintained by the city gardens department and Riehen (including private trees it maintains); other private trees are missing. Window only, no statement on canopy cover.' },
      legend: { type: 'categorical', property: 'group', items: groups.filter(Boolean).map((g, i) => ({ value: g, label: { de: g, en: g + ' (publisher group, German)' }, color: ['#2d6a4f', '#74a57f', '#a3b18a', '#588157', '#bc6c25', '#6a994e'][i % 6] })) }, properties_shown: ['species', 'age_years', 'street', 'group'], measure_topic: null }
  ],
  gaps: [
    { theme: 'flood-hazard', reason: { de: 'Gefährdungskarte Oberflächenabfluss (BAFU) ist nur als Kachel-Dienst verfügbar; die STAC-Metadaten nennen als Lizenz «proprietary», eine klare Nutzungsbedingung wurde nicht gelesen. Keine Geometrie übernommen.', en: 'The FOEN overland-flow hazard map is available as tiles only; STAC metadata gives licence "proprietary" and no clear terms were read. No geometry included.' },
      checked: ['https://data.geo.admin.ch/api/stac/v0.9/collections/ch.bafu.gefaehrdungskarte-oberflaechenabfluss → 200, license "proprietary", producer FOEN', 'https://wmts.geo.admin.ch/1.0.0/ch.bafu.gefaehrdungskarte-oberflaechenabfluss/default/current/3857/12/2145/1434.png → 200 (tiles reachable, not used)', 'https://wms.geo.bs.ch/?SERVICE=WMS layer NG_Gefahrenkarten_ProzessWasser (used by the existing page as raster; vector availability not checked)'] },
    { theme: 'heat', reason: { de: 'Kein Hitze-/Stadtklima-Polygonlayer im Open-Data-Katalog gefunden (nur Stationsmessungen).', en: 'No heat/urban-climate polygon layer found in the open-data catalogue (station measurements only).' },
      checked: ['https://data.bs.ch/api/explore/v2.1/catalog/datasets title search "Hitze", "Klima" → only 100254 (NBCN station daily data); "Starkregen", "Gefahrenkarte" → no results'] },
    { theme: 'green', reason: { de: 'Keine Dachbegrünungs-/Gründach-Geodaten im Katalog gefunden (Suche «Gründach», «Dachbegrünung», «Grünfläche»: keine Treffer).', en: 'No green-roof geodata found in the catalogue (searches returned no results).' }, checked: ['https://data.bs.ch/api/explore/v2.1/catalog/datasets title search → 0 results'] }
  ]
};
// colours of classes without publisher styling are our choice: say so
for (const l of layers.layers) if (l.theme !== 'boundary') { l.limitations.de += ' Legendenfarben sind eigene Wahl, nicht Teil der Publisher-Klassen.'; l.limitations.en += ' Legend colours are our choice; the publisher defines classes only.'; }
writeFileSync(join(out, 'layers.json'), JSON.stringify(layers, null, 1));
