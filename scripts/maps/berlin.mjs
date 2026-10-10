// Builds data/maps/berlin/ (sponge-city-layers/1) from gdi.berlin.de WFS (FIS-Broker/Umweltatlas, bounded bbox + count queries).
// Usage: node scripts/maps/berlin.mjs   (needs network; no keys)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'maps', 'berlin');
mkdirSync(out, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const WFS = 'https://gdi.berlin.de/services/wfs';
// Window in Mitte (Alexanderplatz / Spree): lon W,E lat S,N
const WIN = { w: 13.395, s: 52.515, e: 13.415, n: 52.525 };
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
  return geom;
}

async function get(url) { const r = await fetch(url, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
const fc = features => ({ type: 'FeatureCollection', features });
const bytes = o => Buffer.byteLength(JSON.stringify(o));
function save(name, o) { const s = JSON.stringify(o); if (s.length > 400000) throw new Error(`${name} ${s.length} > 400 KB`); writeFileSync(join(out, name), s); console.log(name, s.length); }
const shrink = (win, k) => { const cx = (win.w + win.e) / 2, cy = (win.s + win.n) / 2, hx = (win.e - win.w) / 2 * k, hy = (win.n - win.s) / 2 * k; return { w: cx - hx, e: cx + hx, s: cy - hy, n: cy + hy }; };
// bounded WFS query: bbox + count; shrinks the window until the simplified snapshot is <= 380 KB
async function layerData(service, type, keep, tol0, win = WIN, count = 6000) {
  for (let k = 1; k > 0.2; k *= 0.8) {
    const w = shrink(win, k);
    const q = new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: `${service}:${type}`, outputFormat: 'application/json', srsName: 'EPSG:4326', count: String(count), bbox: `${w.w},${w.s},${w.e},${w.n},EPSG:4326` });
    const j = await get(`${WFS}/${service}?${q}`);
    for (let tol = tol0; tol < tol0 * 2.5; tol *= 1.5) {
      const fs = j.features.map(f => ({ type: 'Feature', geometry: simplify(f.geometry, tol), properties: keep(f.properties) })).filter(f => f.geometry);
      if (bytes(fc(fs)) < 380000) return { fc: fc(fs), win: w, n: fs.length, matched: j.numberMatched, tol };
    }
  }
  throw new Error('cannot fit ' + type);
}
const L = {};
const DLZ = 'https://www.govdata.de/dl-de/zero-2-0';
const common = { tiles: null, kind: 'geojson-snapshot', publisher: 'Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen Berlin (FIS-Broker / Umweltatlas)', licence: 'Datenlizenz Deutschland – Zero – Version 2.0 (dl-de/zero-2-0)', licence_url: DLZ, attribution: 'Geoportal Berlin / Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen, dl-de/zero-2-0', retrieved: today };
const cov = (r, what) => ({ de: `Ausschnitt Berlin-Mitte (Alexanderplatz/Spree), lon ${r.win.w.toFixed(4)}–${r.win.e.toFixed(4)}, lat ${r.win.s.toFixed(4)}–${r.win.n.toFixed(4)}; ${r.n} ${what} im Fenster`, en: `Window in Berlin-Mitte (Alexanderplatz/Spree), lon ${r.win.w.toFixed(4)}–${r.win.e.toFixed(4)}, lat ${r.win.s.toFixed(4)}–${r.win.n.toFixed(4)}; ${r.n} ${what} in the window` });

// boundary
const lg = await get(`${WFS}/alkis_land?service=WFS&version=2.0.0&request=GetFeature&typeNames=alkis_land:landesgrenze&outputFormat=application/json&srsName=EPSG:4326`);
let [W, S, E, N] = [180, 90, -180, -90];
const walk = c => typeof c[0] === 'number' ? (W = Math.min(W, c[0]), E = Math.max(E, c[0]), S = Math.min(S, c[1]), N = Math.max(N, c[1])) : c.forEach(walk);
lg.features.forEach(f => walk(f.geometry.coordinates));
save('berlin.boundary.01.geojson', fc(lg.features.map(f => ({ type: 'Feature', geometry: simplify(f.geometry, 0.0003), properties: { name: f.properties.namlan } }))));

// sealing 2021 (blocks)
const vgClasses = [[5, '#BCFF79', '≤ 5'], [10, '#FFFF80', '> 5–10'], [20, '#FFFF00', '> 10–20'], [30, '#FFD0A2', '> 20–30'], [40, '#DCA603', '> 30–40'], [50, '#FF8000', '> 40–50'], [60, '#F94F06', '> 50–60'], [70, '#FF0000', '> 60–70'], [80, '#BF00BF', '> 70–80'], [90, '#800080', '> 80–90'], [100, '#000099', '> 90–100']];
const vgCls = v => vgClasses.find(c => v <= c[0])?.[2] ?? vgClasses[10][2];
const sealing = await layerData('ua_versiegelung_2021', 'versieg2021', p => ({ sealing_pct: p.vg_2021, vg_class: p.vg_2021 == null ? 'keine Angabe' : vgCls(p.vg_2021), structure_type: p.etypklar, block: p.schluessel }), 0.00002);
save('berlin.sealing.01.geojson', sealing.fc);
// green roofs 2020 (roof sub-areas of buildings)
const roofs = await layerData('ua_gruendaecher_2020', 'b_begruente_dachteilfl_geb', p => ({ type: p.gruen_kat }), 0.00001);
save('berlin.green.01.geojson', roofs.fc);
// bioclimatic assessment of settlement areas 2022
const heat = await layerData('ua_klimabewertung_2022', 'bj_ua_phk_biokl_siedl_2022', p => ({ rating: p.phk_gesamt, block: p.schl5 }), 0.00002);
save('berlin.heat.01.geojson', heat.fc);
// street trees
const trees = await layerData('baumbestand', 'strassenbaeume', p => ({ species: p.art_dtsch, age_years: p.standalter, street: p.strname, crown_diameter_m: p.kronedurch, group: p.art_gruppe }), 0.00001, WIN, 5000);
save('berlin.trees.01.geojson', trees.fc);
console.log({ sealing: [sealing.n, sealing.matched, sealing.tol], roofs: [roofs.n, roofs.matched], heat: [heat.n, heat.matched], trees: [trees.n, trees.matched] });
const groups = [...new Set(trees.fc.features.map(f => f.properties.group))].filter(Boolean);

const layers = {
  schema_version: 'sponge-city-layers/1', city: 'berlin',
  extent: { bbox: [r5(W), r5(S), r5(E), r5(N)], source: 'Bounding box of Landesgrenze Berlin (ALKIS), WFS https://gdi.berlin.de/services/wfs/alkis_land, layer alkis_land:landesgrenze' },
  layers: [
    { ...common, id: 'berlin.boundary.01', theme: 'boundary', title: { de: 'Landesgrenze Berlin', en: 'Berlin state boundary' }, file: 'berlin.boundary.01.geojson', origin: 'observed', method: 'Landesgrenze abgeleitet aus dem ALKIS-Datenbestand (Publisher); vereinfacht (ca. 25 m) durch scripts/maps/berlin.mjs', unit: 'polygon', spatial_scale: 'state', temporal: 'ALKIS (current at retrieval)', coverage: 'Whole of Berlin', source_url: 'https://gdi.berlin.de/services/wfs/alkis_land?service=WFS&request=GetCapabilities', attribution: 'Geoportal Berlin / ALKIS Berlin, dl-de/zero-2-0',
      limitations: { de: 'Vereinfachte Geometrie, nicht für Vermessungszwecke.', en: 'Simplified geometry, not for survey use.' }, legend: { type: 'single', items: [{ value: 'boundary', label: { de: 'Landesgrenze', en: 'State boundary' }, color: '#444444' }] }, properties_shown: ['name'], measure_topic: null },
    { ...common, id: 'berlin.sealing.01', theme: 'sealing', title: { de: 'Versiegelung 2021 (Block- und Blockteilflächen) – Ausschnitt Mitte', en: 'Sealing 2021 (urban blocks) – Mitte window' }, file: 'berlin.sealing.01.geojson', origin: 'derived',
      method: 'Publisher: Versiegelung von Block- und Blockteilflächen in 10 %-Stufen, ermittelt aus Satellitenbilddaten (Sentinel-2B, unbebauter Anteil) und Gebäudedaten (bebauter Anteil) auf Grundlage der Blockkarte 1:5\'000 (ISU5), Stand 2020', unit: '% sealed share of block area', spatial_scale: 'urban block / block part (ISU5)', temporal: 'Versiegelung 2021 (Veränderung 2016–2021 im Datensatz)', coverage: cov(sealing, 'Blöcke').de + ' / ' + cov(sealing, 'blocks').en,
      source_url: 'https://gdi.berlin.de/services/wfs/ua_versiegelung_2021?service=WFS&request=GetCapabilities', attribution: 'Geoportal Berlin / Umweltatlas «Versiegelung 2021», SenStadt, dl-de/zero-2-0',
      limitations: { de: 'Nur ein Ausschnitt. Ableitung aus Satellitendaten, Auflösung = Blockflächen; keine Aussage zu einzelnen Flächen oder zur Durchlässigkeit. Geometrie vereinfacht.', en: 'Window only. Derived from satellite data at block resolution; no statement on single surfaces or permeability. Geometry simplified.' },
      legend: { type: 'categorical', property: 'vg_class', items: [...vgClasses.map(c => ({ value: c[2], label: { de: `Versiegelungsgrad ${c[2]} %`, en: `Degree of sealing ${c[2]} %` }, color: c[1] })), { value: 'keine Angabe', label: { de: 'Keine Angabe (Versiegelungsgrad fehlt)', en: 'No value given' }, color: '#cccccc' }] }, properties_shown: ['sealing_pct', 'structure_type', 'block'], measure_topic: 'sealing-fraction' },
    { ...common, id: 'berlin.green.01', theme: 'green', title: { de: 'Begrünte Dachteilflächen (Gebäude) 2020 – Ausschnitt Mitte', en: 'Green roof sub-areas (buildings) 2020 – Mitte window' }, file: 'berlin.green.01.geojson', origin: 'derived',
      method: 'Publisher: bestehende Gründachteilflächen (extensiv und intensiv) der Gebäude, Gründächer 2020 (Umweltatlas)', unit: 'polygon, class', spatial_scale: 'roof sub-area', temporal: '2020', coverage: cov(roofs, 'Dachteilflächen').de + ' / ' + cov(roofs, 'roof sub-areas').en,
      source_url: 'https://gdi.berlin.de/services/wfs/ua_gruendaecher_2020?service=WFS&request=GetCapabilities', attribution: 'Geoportal Berlin / Umweltatlas «Gründächer 2020», SenStadt, dl-de/zero-2-0',
      limitations: { de: 'Nur ein Ausschnitt; Stand 2020. Ableitung aus Fernerkundung, nicht vor Ort geprüft; Aufbau/Retention nicht erfasst.', en: 'Window only; state 2020. Derived from remote sensing, not field verified; build-up and retention not captured.' },
      legend: { type: 'categorical', property: 'type', items: [{ value: 'extensiv', label: { de: 'Extensive Begrünung', en: 'Extensive green roof' }, color: '#FFFF80' }, { value: 'intensiv', label: { de: 'Intensive Begrünung', en: 'Intensive green roof' }, color: '#BCFF79' }] }, properties_shown: ['type'], measure_topic: null },
    { ...common, id: 'berlin.heat.01', theme: 'heat', title: { de: 'Bioklimatische Gesamtbewertung Siedlungsflächen 2022 – Ausschnitt Mitte', en: 'Bioclimatic overall assessment of settlement areas 2022 – Mitte window' }, file: 'berlin.heat.01.geojson', origin: 'modelled',
      method: 'Publisher: Klimabewertungskarten 2022 (Planungshinweise Stadtklima), Gesamtbewertung anhand der Tag- und Nachtsituation, Klimamodellierung', unit: 'class (günstig … sehr ungünstig)', spatial_scale: 'urban block', temporal: '2022', coverage: cov(heat, 'Flächen').de + ' / ' + cov(heat, 'areas').en,
      source_url: 'https://gdi.berlin.de/services/wfs/ua_klimabewertung_2022?service=WFS&request=GetCapabilities', attribution: 'Geoportal Berlin / Umweltatlas «Klimabewertungskarten 2022», SenStadt, dl-de/zero-2-0',
      limitations: { de: 'Modellergebnis (Planungshinweis), keine Messung. Nur ein Ausschnitt, nur Siedlungsflächen (keine Verkehrs- und Grünflächen).', en: 'Model result (planning guidance), not a measurement. Window only, settlement areas only (no traffic or green areas).' },
      legend: { type: 'categorical', property: 'rating', items: [['günstig', '#FFFFCC', 'Favourable'], ['weniger günstig', '#FFEA00', 'Less favourable'], ['ungünstig', '#FF5500', 'Unfavourable'], ['sehr ungünstig', '#E600A9', 'Very unfavourable']].map(c => ({ value: c[0], label: { de: c[0][0].toUpperCase() + c[0].slice(1), en: c[2] }, color: c[1] })) }, properties_shown: ['rating', 'block'], measure_topic: null },
    { ...common, id: 'berlin.trees.01', theme: 'trees', title: { de: 'Strassenbäume – Ausschnitt Mitte', en: 'Street trees – Mitte window' }, file: 'berlin.trees.01.geojson', origin: 'observed',
      method: 'Baumbestand Berlin – Strassenbäume (Strassenbaumkataster der Bezirke), Punkte im Fenster', unit: 'tree (point)', spatial_scale: 'single tree', temporal: 'register as of retrieval', coverage: cov(trees, 'Bäume').de + ' / ' + cov(trees, 'trees').en,
      source_url: 'https://gdi.berlin.de/services/wfs/baumbestand?service=WFS&request=GetCapabilities', attribution: 'Geoportal Berlin / Baumbestand Berlin, SenStadt, dl-de/zero-2-0',
      limitations: { de: 'Nur Strassenbäume des Landes, keine Park- (Anlagen-) oder Privatbäume; Ausschnitt.', en: 'State-owned street trees only, no park (Anlagen) or private trees; window only.' },
      legend: { type: 'categorical', property: 'group', items: groups.map((g, i) => ({ value: g, label: { de: g.replaceAll('ß', 'ss'), en: g.replaceAll('ß', 'ss') + ' (publisher group, German)' }, color: ['#2d6a4f', '#bc6c25', '#74a57f', '#588157'][i % 4] })) }, properties_shown: ['species', 'age_years', 'street', 'crown_diameter_m'], measure_topic: null }
  ].map(l => ({ ...l, coverage: typeof l.coverage === 'string' ? l.coverage : l.coverage })),
  gaps: [
    { theme: 'flood-hazard', reason: { de: 'Starkregengefahrenkarte Berlin: nur WMS (Darstellung) und ATOM-Grossdownload verfügbar, kein WFS; Lizenz je Modellgebiet gemischt (dl-de/zero-2-0, Moabit/Flughafensee CC BY 4.0). Kein begrenzter Vektorabruf möglich, daher keine Geometrie übernommen.', en: 'Berlin heavy-rain hazard map: only WMS (display) and ATOM bulk download are available, no WFS; licence differs by model area (dl-de/zero-2-0; Moabit/Flughafensee CC BY 4.0). No bounded vector query possible, so no geometry included.' },
      checked: ['https://gdi.berlin.de/services/wfs/stark_regen_gefahr → 404', 'https://gdi.berlin.de/data/ua_srgk/atom/ → 200, bulk download feed, rights text read, not downloaded', 'https://gdi.berlin.de/services/wms/ua_srgk?request=GetCapabilities&service=WMS → listed in catalogue (raster only, not used)'] },
    { theme: 'water', reason: { de: 'Hochwassergefahrenkarten (Fliessgewässer) nicht abgerufen: ausserhalb der Aufgabe, Fokus Starkregen/Versiegelung.', en: 'River flood hazard maps not fetched: out of scope (focus on heavy rain / sealing).' }, checked: ['https://gdi.berlin.de/services/wfs/ua_hochwassergefahrenkarten (listed in catalogue, not queried)'] }
  ]
};
// colours of classes without publisher styling are our choice: say so
for (const l of layers.layers) if (l.id === 'berlin.trees.01') { l.limitations.de += ' Legendenfarben sind eigene Wahl, nicht Teil der Publisher-Klassen.'; l.limitations.en += ' Legend colours are our choice; the publisher defines classes only.'; }
writeFileSync(join(out, 'layers.json'), JSON.stringify(layers, null, 1));
