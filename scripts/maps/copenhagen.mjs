// Builds data/maps/copenhagen/ (sponge-city-layers/1) from Kobenhavns Kommune open data (wfs-kbhkort.kk.dk, listed on admin.opendata.dk, CC BY 4.0).
// Whole-city datasets are small (<=1000 features); datasets that are large (green roofs, trees) are fetched by bbox window with maxFeatures.
// Usage: node scripts/maps/copenhagen.mjs   (needs network; no keys)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'maps', 'copenhagen');
mkdirSync(out, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const WFS = 'https://wfs-kbhkort.kk.dk/k101/ows';
// Window around Indre By / Norrebro / Osterbro: lon W,E lat S,N
const WIN = { w: 12.545, s: 55.670, e: 12.585, n: 55.695 };
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
  if (geom.type === 'Polygon') { const rs = geom.coordinates.map(r => ring(r, tol)).filter(Boolean); return rs.length ? { type: 'Polygon', coordinates: rs } : null; }
  if (geom.type === 'MultiPolygon') { const ps = geom.coordinates.map(p => p.map(r => ring(r, tol)).filter(Boolean)).filter(p => p.length); return ps.length ? { type: 'MultiPolygon', coordinates: ps } : null; }
  if (geom.type === 'Point') return { type: 'Point', coordinates: geom.coordinates.map(r5) };
  if (geom.type === 'LineString') { const s = dp(geom.coordinates, tol).map(([x, y]) => [r5(x), r5(y)]); return s.length >= 2 ? { type: 'LineString', coordinates: s } : null; }
  return geom;
}

async function get(url) { const r = await fetch(url, { signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
const fc = features => ({ type: 'FeatureCollection', features });
const bytes = o => Buffer.byteLength(JSON.stringify(o));
function save(name, o) { const s = JSON.stringify(o); if (s.length > 400000) throw new Error(`${name} ${s.length} > 400 KB`); writeFileSync(join(out, name), s); console.log(name, s.length); }
const shrink = (win, k) => { const cx = (win.w + win.e) / 2, cy = (win.s + win.n) / 2, hx = (win.e - win.w) / 2 * k, hy = (win.n - win.s) / 2 * k; return { w: cx - hx, e: cx + hx, s: cy - hy, n: cy + hy }; };
const explode = f => !f.geometry ? [] : f.geometry.type === 'MultiPoint' ? f.geometry.coordinates.map(c => ({ ...f, geometry: { type: 'Point', coordinates: c } })) : [f];
// bounded query: optional bbox window (shrunk until the simplified snapshot is <= 380 KB), maxFeatures cap
async function layerData(type, keep, tol0, { win = null, max = 4000 } = {}) {
  for (let k = 1; k > 0.2; k *= 0.8) {
    const w = win && shrink(win, k);
    const q = new URLSearchParams({ service: 'WFS', version: '1.0.0', request: 'GetFeature', typeName: `k101:${type}`, srsname: 'EPSG:4326', outputFormat: 'application/json', maxFeatures: String(max) });
    if (w) q.set('bbox', `${w.w},${w.s},${w.e},${w.n},EPSG:4326`);
    const j = await get(`${WFS}?${q}`);
    for (let tol = tol0; tol < tol0 * 2.5; tol *= 1.5) {
      const fs = j.features.flatMap(explode).map(f => ({ type: 'Feature', geometry: simplify(f.geometry, tol), properties: keep(f.properties) })).filter(f => f.geometry);
      if (bytes(fc(fs)) < 380000) return { fc: fc(fs), win: w, n: fs.length, tol };
      
    }
    if (!w) break;
  }
  throw new Error('cannot fit ' + type);
}
const CC = 'https://creativecommons.org/licenses/by/4.0/';
const common = { tiles: null, kind: 'geojson-snapshot', publisher: 'Københavns Kommune (Teknik- og Miljøforvaltningen), via Open Data DK', licence: 'CC BY 4.0 (CKAN licence_id CC-BY-4.0)', licence_url: CC, attribution: 'Københavns Kommune, Open Data DK, CC BY 4.0', retrieved: today };
const ck = id => `https://admin.opendata.dk/dataset/${id}`;
const nn = v => (v == null || v === '' ? 'ukendt' : v);

const catchments = await layerData('f_skp_skybrudsoplande_kk', p => ({ name: p.opland }), 0.00008);
save('copenhagen.catchments.01.geojson', catchments.fc);
let [W, S, E, N] = [180, 90, -180, -90];
const walk = c => typeof c[0] === 'number' ? (W = Math.min(W, c[0]), E = Math.max(E, c[0]), S = Math.min(S, c[1]), N = Math.max(N, c[1])) : c.forEach(walk);
{ const raw = await get(`${WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=k101:f_skp_skybrudsoplande_kk&srsname=EPSG:4326&outputFormat=application/json`); raw.features.forEach(f => walk(f.geometry.coordinates)); }
const basins = await layerData('skp_bassiner_pladser_kk', p => ({ type: nn(p.typologi?.toLowerCase?.() === 'skybrudsbassin' ? 'Skybrudsbassin' : p.typologi?.toLowerCase?.() === 'rensning' ? 'Rensning' : p.typologi), project: p.projekt_navn, catchment: p.vandopland, expected_year: p.forventet_ibrugtagning }), 0.00003);
save('copenhagen.cloudburst-basins.01.geojson', basins.fc);
const roads = await layerData('skp_veje_tunneller_kk', p => ({ type: nn(p.typologi), project: p.projekt_navn, catchment: p.vandopland }), 0.00003);
save('copenhagen.cloudburst-roads.01.geojson', roads.fc);
const roofs = await layerData('groenne_tage', p => ({ roof: p.tagkonstruktion, material: p.tagdaekningmateriale, year: p.opfoerelse_aar }), 0.00001, { win: WIN, max: 4000 });
save('copenhagen.green.01.geojson', roofs.fc);
const trees = await layerData('bevaringsvaerdige_traer', p => ({ status: p.status, plan: p.lokalplan_navn, species: p.traeart }), 0.00001, { win: WIN, max: 3000 });
save('copenhagen.trees.01.geojson', trees.fc);
console.log({ catchments: catchments.n, basins: basins.n, roads: roads.n, roofs: [roofs.n, roofs.win], trees: [trees.n, trees.win] });
const win = r => r.win ? `lon ${r.win.w.toFixed(4)}–${r.win.e.toFixed(4)}, lat ${r.win.s.toFixed(4)}–${r.win.n.toFixed(4)}` : 'whole dataset';
const items = (arr) => arr.map(([v, de, en, color]) => ({ value: v, label: { de, en }, color }));

const layers = {
  schema_version: 'sponge-city-layers/1', city: 'copenhagen',
  extent: { bbox: [r5(W), r5(S), r5(E), r5(N)], source: 'Bounding box of the 7 cloudburst catchments of Copenhagen and Frederiksberg (Skybrudsplan, CC BY 4.0), https://admin.opendata.dk/dataset/skybrudsplan-skybrudsoplande. No openly licensed municipal-boundary dataset could be fetched (see gaps), so this is the planning area, not the legal municipal boundary.' },
  layers: [
    { ...common, id: 'copenhagen.catchments.01', theme: 'water', title: { de: 'Skybrudsoplande (Wassereinzugsgebiete der Starkregenplanung)', en: 'Cloudburst catchments (Skybrudsplan)' }, file: 'copenhagen.catchments.01.geojson', origin: 'modelled',
      method: 'Publisher: Einteilung von København und Frederiksberg in 7 Wassereinzugsgebiete nach Hydrologie (natürliche Wasserleitung gemäss Höhenmodell); vereinfacht (ca. 5 m) durch scripts/maps/copenhagen.mjs', unit: 'polygon', spatial_scale: 'catchment (7 areas)', temporal: 'dataset modified 2023-12-04', coverage: 'Whole planning area: Copenhagen and Frederiksberg (' + catchments.n + ' catchments)',
      source_url: ck('skybrudsplan-skybrudsoplande'), limitations: { de: 'Hydrologische Einteilung aus dem Höhenmodell, keine Überflutungskarte und kein Gefahrenlayer.', en: 'Hydrological partition derived from the elevation model; not a flood map and not a hazard layer.' },
      legend: { type: 'single', items: [{ value: 'catchment', label: { de: 'Skybrudsopland', en: 'Cloudburst catchment' }, color: '#3b7ea1' }] }, properties_shown: ['name'], measure_topic: null },
    { ...common, id: 'copenhagen.cloudburst-basins.01', theme: 'water', title: { de: 'Skybrudsplan – geplante Rückhalteplätze und Becken', en: 'Cloudburst plan – planned detention squares and basins' }, file: 'copenhagen.cloudburst-basins.01.geojson', origin: 'assumed',
      method: 'Publisher: planned climate-adaptation projects to be established over about 20 years to protect Copenhagen from cloudbursts (categories as published: detention square, basin, treatment, cloudburst basin, courtyard project)', unit: 'planned project (polygon)', spatial_scale: 'project', temporal: 'dataset modified 2024-08-01 (plan, not built status)', coverage: 'Whole Copenhagen plan (' + basins.n + ' project areas)',
      source_url: ck('skybrudsplan-bassiner-og-pladser'), limitations: { de: 'Planung über rund 20 Jahre: zeigt, was vorgesehen ist, nicht, was gebaut ist. Keine Gefährdungs- oder Überflutungskarte. Kategorienamen dänisch wie veröffentlicht.', en: 'A plan over about 20 years: shows what is intended, not what is built. Not a hazard or inundation map. Category names are Danish as published.' },
      legend: { type: 'categorical', property: 'type', items: items([['Forsinkelsesplads', 'Forsinkelsesplads (Rückhalteplatz)', 'Forsinkelsesplads (detention square)', '#2a9d8f'], ['Skybrudsbassin', 'Skybrudsbassin (Starkregenbecken)', 'Skybrudsbassin (cloudburst basin)', '#1d4e89'], ['bassin', 'Bassin (Becken)', 'Bassin (basin)', '#4a90c2'], ['Rensning', 'Rensning (Reinigung)', 'Rensning (treatment)', '#8d6e63'], ['Gårdhaveprojekt', 'Gårdhaveprojekt (Hofprojekt)', 'Gårdhaveprojekt (courtyard project)', '#7bb661'], ['Uvdielse af åen', 'Uvdielse af åen (so veröffentlicht)', 'Uvdielse af åen (as published)', '#e9c46a'], ['ukendt', 'Ohne Kategorie', 'No category', '#999999']]) }, properties_shown: ['type', 'project', 'catchment', 'expected_year'], measure_topic: null },
    { ...common, id: 'copenhagen.cloudburst-roads.01', theme: 'water', title: { de: 'Skybrudsplan – geplante Strassen, Leitungen und Tunnel', en: 'Cloudburst plan – planned streets, pipes and tunnels' }, file: 'copenhagen.cloudburst-roads.01.geojson', origin: 'assumed',
      method: 'Publisher: planned climate-adaptation projects (cloudburst pipes, green streets, detention streets, cloudburst streets, mix)', unit: 'planned project (line)', spatial_scale: 'street / pipe segment', temporal: 'dataset modified 2024-08-01 (plan, not built status)', coverage: 'Whole Copenhagen plan (' + roads.n + ' line segments)',
      source_url: ck('skybrudsplan-veje-og-tunneller'), limitations: { de: 'Planung, kein Baustand; Linien vereinfacht (ca. 3 m). Kategorienamen dänisch wie veröffentlicht.', en: 'A plan, not build status; lines simplified (about 3 m). Category names are Danish as published.' },
      legend: { type: 'categorical', property: 'type', items: items([['Skybrudsledning', 'Skybrudsledning (Starkregenleitung)', 'Skybrudsledning (cloudburst pipe)', '#1d4e89'], ['Grønne veje', 'Grønne veje (grüne Strassen)', 'Grønne veje (green streets)', '#2d6a4f'], ['Forsinkelsesveje', 'Forsinkelsesveje (Rückhaltestrassen)', 'Forsinkelsesveje (detention streets)', '#2a9d8f'], ['Skybrudsveje', 'Skybrudsveje (Starkregenstrassen)', 'Skybrudsveje (cloudburst streets)', '#e76f51'], ['mix', 'Mix', 'Mix', '#9b5de5'], ['ukendt', 'Ohne Kategorie', 'No category', '#999999']]) }, properties_shown: ['type', 'project', 'catchment'], measure_topic: null },
    { ...common, id: 'copenhagen.green.01', theme: 'green', title: { de: 'Grüne Dächer – Ausschnitt Innenstadt', en: 'Green roofs – inner-city window' }, file: 'copenhagen.green.01.geojson', origin: 'derived',
      method: 'Publisher: Gebäude mit grünem Dach als primärer oder sekundärer Dachkonstruktion, erfasst auf Grundlage von BBR und Luftbild', unit: 'building roof (polygon)', spatial_scale: 'building', temporal: 'dataset modified 2023-12-04', coverage: `Ausschnitt ${win(roofs)}; ${roofs.n} Gebäude im Fenster (gesamter Datensatz 2029) / window ${win(roofs)}; ${roofs.n} buildings (whole dataset 2029)`,
      source_url: ck('gronne-tage'), limitations: { de: 'Nur ein Ausschnitt. Aus BBR und Luftbild abgeleitet, nicht vor Ort geprüft; Aufbau und Retention nicht erfasst. Klassen dänisch wie veröffentlicht.', en: 'Window only. Derived from the building register (BBR) and aerial photos, not field verified; build-up and retention not captured. Classes are Danish as published.' },
      legend: { type: 'categorical', property: 'roof', items: items([['Primært Grønt tag', 'Primært grønt tag (primär begrünt)', 'Primært grønt tag (primarily green)', '#2d9a4f'], ['Supplerende Grønt tag', 'Supplerende grønt tag (ergänzend begrünt)', 'Supplerende grønt tag (supplementary green)', '#a3d977'], ['Andet tagkonstuktion', 'Andet (anderes Dach, so veröffentlicht)', 'Other roof construction (spelling as published)', '#bdbdbd']]) }, properties_shown: ['roof', 'material', 'year'], measure_topic: null },
    { ...common, id: 'copenhagen.trees.01', theme: 'trees', title: { de: 'Bevaringsværdige træer (erhaltenswerte Bäume) – Ausschnitt Innenstadt', en: 'Trees designated for preservation – inner-city window' }, file: 'copenhagen.trees.01.geojson', origin: 'observed',
      method: 'Publisher: digitised from local plans (lokalplaner) since 2006 combined with aerial photos of spring 2018; marked trees only, guidance not binding', unit: 'tree (point)', spatial_scale: 'single tree', temporal: 'dataset modified 2024-10-29', coverage: `Ausschnitt ${win(trees)}; ${trees.n} Bäume im Fenster / window ${win(trees)}; ${trees.n} trees`,
      source_url: ck('bevaringsvaerdige-traeer'), limitations: { de: 'Nur in Lokalplänen als erhaltenswert bezeichnete Bäume, nicht der gesamte Baumbestand; Digitalisierung nur richtungweisend. Ausschnitt.', en: 'Only trees designated as worth preserving in local plans, not the whole tree stock; digitisation is indicative only. Window only.' },
      legend: { type: 'categorical', property: 'status', items: [...new Set(trees.fc.features.map(f => f.properties.status))].map((s, i) => ({ value: s, label: { de: s + ' (dänisch, wie veröffentlicht)', en: s + ' (Danish, as published)' }, color: ['#2d6a4f', '#74a57f', '#bc6c25', '#999999', '#9b5de5', '#e76f51'][i % 6] })) }, properties_shown: ['status', 'plan', 'species'], measure_topic: null }
  ],
  gaps: [
    { theme: 'boundary', reason: { de: 'Keine offen lizenzierte Gemeindegrenze abrufbar: «Bydele» (KK) hat keine Lizenzangabe im Katalog; DAWA/Dataforsyningen-Endpunkt liefert HTTP 410. Die Ausdehnung stammt deshalb aus den Skybrudsoplande-Polygonen (Planungsgebiet København + Frederiksberg).', en: 'No openly licensed municipal boundary could be fetched: "Bydele" (KK) has no licence in the catalogue; the DAWA/Dataforsyningen endpoint returns HTTP 410. The extent therefore comes from the cloudburst catchment polygons (planning area Copenhagen + Frederiksberg).' },
      checked: ['https://admin.opendata.dk/api/3/action/package_show?id=bydele → 200, license_id null', 'https://api.dataforsyningen.dk/kommuner/0101?format=geojson → 410 Gone', 'https://dawa.aws.dk/kommuner/0101?format=geojson → 410 Gone', 'https://admin.opendata.dk/dataset/kommunegraense → CC-BY-4.0 but publisher is Horsens Kommune (other municipality, not used)', 'k101:kommunaegraense_flade exists on wfs-kbhkort.kk.dk but is not listed as a licensed open dataset (not fetched)'] },
    { theme: 'sealing', reason: { de: 'Kein offener Versiegelungs-/Befestigungslayer für Kopenhagen gefunden.', en: 'No open sealing/impervious-surface layer for Copenhagen found.' }, checked: ['https://admin.opendata.dk/api/3/action/package_search q=befæstelse → 0; q=afstrømning → 0'] },
    { theme: 'heat', reason: { de: 'Kein Hitze-/Stadtklimalayer gefunden (Suche «varme»: nur Energieverbrauch Randers).', en: 'No heat/urban-climate layer found (search "varme" returned only Randers energy use).' }, checked: ['https://admin.opendata.dk/api/3/action/package_search q=varme → 1 unrelated result'] },
    { theme: 'trees', reason: { de: 'Kommunales Baumregister «Træ basis» (k101:trae_basis) hat keine Lizenzangabe im Katalog → nicht übernommen. Es werden nur die erhaltenswerten Bäume (CC BY 4.0) gezeigt. Trækronedække 2024 ist ein Raster ohne Lizenzangabe/Vektordienst.', en: 'The municipal tree register "Træ basis" (k101:trae_basis) has no licence in the catalogue, so it is not included. Only trees designated for preservation (CC BY 4.0) are shown. Tree canopy 2024 has no licence entry or vector service.' }, checked: ['https://admin.opendata.dk/dataset/trae-basis-kommunale-traeer → license_id null', 'https://admin.opendata.dk/dataset/traekronedaekke-2024-for-kobenhavn → no WFS/GeoJSON resource, license null'] },
    { theme: 'other', reason: { de: 'Lokalplaner (CC BY 4.0 laut Katalog) in dieser Runde nicht abgerufen (Zeitbudget, kein direkter Bezug zur Wasserbilanz); bleibt als mögliche Quelle vermerkt.', en: 'Local plans (CC BY 4.0 per catalogue) not fetched in this round (time budget, no direct link to the water balance); noted as a possible source.' }, checked: ['https://admin.opendata.dk/api/3/action/package_search q=lokalplan → lokalplaner (city-of-copenhagen, CC-BY-4.0, not fetched)'] }
  ]
};
// colours of classes without publisher styling are our choice: say so
for (const l of layers.layers) if (['green', 'trees'].includes(l.theme)) { l.limitations.de += ' Legendenfarben sind eigene Wahl, nicht Teil der Publisher-Klassen.'; l.limitations.en += ' Legend colours are our choice; the publisher defines classes only.'; }
writeFileSync(join(out, 'layers.json'), JSON.stringify(layers, null, 1));
