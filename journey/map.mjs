// City-aware map: pure helpers shared by the page and the checks. No network, no DOM.
// Layers come from data/maps/<city>/layers.json (docs/MAP-LAYERS.md). The map draws bounded GeoJSON
// snapshots as SVG; a layer is only ever drawn inside the city folder it was published for.
import { pick } from './i18n.mjs';

export const THEMES = ['sealing', 'green', 'trees', 'heat', 'flood-hazard', 'water', 'monitoring', 'boundary', 'other'];
export const ORIGINS = ['observed', 'derived', 'modelled', 'assumed'];
export const REQUIRED_LAYER_FIELDS = ['id', 'theme', 'title', 'kind', 'origin', 'method', 'unit', 'spatial_scale', 'temporal', 'retrieved', 'coverage',
  'publisher', 'licence', 'licence_url', 'source_url', 'attribution', 'limitations', 'legend'];

// ---- validation (used by the build checks) -------------------------------------------------
export function validateLayerPack(pack, files = {}) {
  const problems = [];
  const add = m => problems.push(`${pack?.city ?? '?'}: ${m}`);
  if (pack?.schema_version !== 'sponge-city-layers/1') add('schema_version');
  const bbox = pack?.extent?.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4 || !(bbox[0] < bbox[2] && bbox[1] < bbox[3])) add('extent.bbox must be [w,s,e,n]');
  if (!pack?.extent?.source) add('extent.source missing');
  const ids = new Set();
  for (const layer of pack?.layers ?? []) {
    const where = layer.id ?? '(no id)';
    if (!layer.id?.startsWith(pack.city + '.')) add(`${where}: id must start with "${pack.city}."`);
    if (ids.has(layer.id)) add(`${where}: duplicate id`);
    ids.add(layer.id);
    for (const f of REQUIRED_LAYER_FIELDS) if (layer[f] == null || layer[f] === '') add(`${where}: ${f} missing`);
    if (!THEMES.includes(layer.theme)) add(`${where}: theme`);
    if (!ORIGINS.includes(layer.origin)) add(`${where}: origin`);
    for (const lang of ['de', 'en']) {
      if (!layer.title?.[lang]) add(`${where}: title.${lang}`);
      if (!layer.limitations?.[lang]) add(`${where}: limitations.${lang}`);
      if (/ß/.test(JSON.stringify([layer.title?.[lang], layer.limitations?.[lang], ...(layer.legend?.items ?? []).map(i => i.label?.[lang])]))) add(`${where}: ß in ${lang}`);
    }
    if (!/^https?:\/\/\S+$/.test(layer.licence_url ?? '') || !/^https?:\/\/\S+$/.test(layer.source_url ?? '')) add(`${where}: licence_url/source_url must be http(s)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(layer.retrieved ?? '')) add(`${where}: retrieved must be YYYY-MM-DD`);
    if (layer.kind === 'geojson-snapshot') {
      const geo = files[layer.file];
      if (!layer.file) add(`${where}: file missing`);
      else if (geo) {
        if (geo.type !== 'FeatureCollection') add(`${where}: snapshot must be a FeatureCollection`);
        const b = pack.extent?.bbox;
        // coordinates must lie near the city extent: catches another city's data under this label
        const span = b ? Math.max(b[2] - b[0], b[3] - b[1]) : 0; const pad = Math.max(0.02, span * 0.1); let outside = 0; // a city's own data cannot lie far outside its extent
        walkCoords(geo, ([x, y]) => { if (b && (x < b[0] - pad || x > b[2] + pad || y < b[1] - pad || y > b[3] + pad)) outside++; });
        if (outside) add(`${where}: ${outside} coordinates outside the city extent`);
      }
    } else if (layer.kind === 'raster-service') {
      if (!/^https?:\/\//.test(layer.tiles ?? '')) add(`${where}: raster-service needs tiles url`);
    } else add(`${where}: kind`);
    const items = layer.legend?.items ?? [];
    if (layer.legend?.type !== 'single' && !layer.legend?.property) add(`${where}: legend.property required for ${layer.legend?.type}`);
    if (!items.length) add(`${where}: legend.items empty`);
    for (const item of items) if (!/^#[0-9a-f]{6}$/i.test(item.color ?? '') || !item.label?.de || !item.label?.en) add(`${where}: legend item needs color and de/en label`);
  }
  for (const gap of pack?.gaps ?? []) {
    if (!gap.theme || !gap.reason?.de || !gap.reason?.en || (!(gap.checked ?? []).length && gap.state !== 'not_checked')) add(`gap ${gap.theme ?? '?'}: needs theme, de/en reason and checked[]`);
  }
  if (!(pack?.layers ?? []).length && !(pack?.gaps ?? []).length) add('neither layers nor gaps');
  return problems;
}

export function walkCoords(node, fn) {
  if (!node) return;
  if (node.type === 'FeatureCollection') return node.features.forEach(f => walkCoords(f, fn));
  if (node.type === 'Feature') return walkCoords(node.geometry, fn);
  if (node.type === 'GeometryCollection') return node.geometries.forEach(g => walkCoords(g, fn));
  const rec = c => (typeof c[0] === 'number' ? fn(c) : c.forEach(rec));
  if (node.coordinates) rec(node.coordinates);
}

// ---- share state ---------------------------------------------------------------------------
// ?city=zurich&layers=a,b&compare=berlin&sel=layer-id:feature-index&lang=de
export function parseMapState(search, packs) {
  const p = new URLSearchParams(search);
  const ids = Object.keys(packs);
  const city = ids.includes(p.get('city')) ? p.get('city') : ids[0];
  const known = new Set((packs[city]?.layers ?? []).map(l => l.id));
  const layers = p.has('layers') ? p.get('layers').split(',').filter(id => known.has(id)) : defaultLayers(packs[city]);
  const compare = ids.includes(p.get('compare')) && p.get('compare') !== city ? p.get('compare') : null;
  const knownB = new Set((packs[compare]?.layers ?? []).map(l => l.id));
  const layersCompare = compare ? (p.has('layers2') ? p.get('layers2').split(',').filter(id => knownB.has(id)) : defaultLayers(packs[compare])) : null;
  let sel = null;
  const m = /^(.+):(\d+)$/.exec(p.get('sel') ?? '');
  if (m && (known.has(m[1]) || knownB.has(m[1]))) sel = { layer: m[1], index: Number(m[2]) };
  return { city, layers, compare, layersCompare, sel };
}
export function defaultLayers(pack) {
  const draw = (pack?.layers ?? []).filter(l => l.kind === 'geojson-snapshot');
  const boundary = draw.filter(l => l.theme === 'boundary').map(l => l.id);
  const first = draw.find(l => l.theme !== 'boundary');
  return [...boundary, ...(first ? [first.id] : [])];
}
export function writeMapState(url, state) {
  const u = new URL(url);
  u.searchParams.set('city', state.city);
  u.searchParams.set('layers', state.layers.join(','));
  state.compare ? u.searchParams.set('compare', state.compare) : u.searchParams.delete('compare');
  state.compare && state.layersCompare ? u.searchParams.set('layers2', state.layersCompare.join(',')) : u.searchParams.delete('layers2');
  state.sel ? u.searchParams.set('sel', `${state.sel.layer}:${state.sel.index}`) : u.searchParams.delete('sel');
  return u;
}

// ---- projection and SVG ---------------------------------------------------------------------
export const VIEW_W = 1000;
export function makeProjection(bbox) {
  const [w, s, e, n] = bbox;
  const k = Math.cos(((s + n) / 2) * Math.PI / 180);
  const width = (e - w) * k, height = n - s;
  const scale = VIEW_W / width;
  return { width: VIEW_W, height: Math.round(height * scale), x: lon => (lon - w) * k * scale, y: lat => (n - lat) * scale };
}
const r1 = v => Math.round(v * 10) / 10;
export function geometryPath(geom, proj) {
  const ring = c => c.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(proj.x(x))} ${r1(proj.y(y))}`).join('');
  switch (geom?.type) {
    case 'Polygon': return geom.coordinates.map(r => ring(r) + 'Z').join('');
    case 'MultiPolygon': return geom.coordinates.map(p => p.map(r => ring(r) + 'Z').join('')).join('');
    case 'LineString': return ring(geom.coordinates);
    case 'MultiLineString': return geom.coordinates.map(ring).join('');
    case 'Point': return `M${r1(proj.x(geom.coordinates[0]))} ${r1(proj.y(geom.coordinates[1]))}`;
    case 'MultiPoint': return geom.coordinates.map(c => `M${r1(proj.x(c[0]))} ${r1(proj.y(c[1]))}`).join('');
    default: return '';
  }
}
export const isPointGeom = g => g?.type === 'Point' || g?.type === 'MultiPoint';
export const isLineGeom = g => g?.type === 'LineString' || g?.type === 'MultiLineString';

export function colorFor(layer, feature) {
  const legend = layer.legend;
  const items = legend.items;
  if (legend.type === 'single' || !legend.property) return items[0].color;
  const v = String(feature.properties?.[legend.property] ?? '');
  return (items.find(i => String(i.value) === v) ?? { color: '#9aa39e' }).color;
}
export function legendEntries(layer, lang) {
  const known = layer.legend.items.map(i => ({ color: i.color, label: pick(i.label, lang) }));
  return layer.legend.type === 'single' ? known : [...known, { color: '#9aa39e', label: lang === 'de' ? 'Andere Klasse' : 'Other class', other: true }];
}

// Escape-free data model for the inspect panel: the view escapes it.
export function inspectRecord(layer, feature, lang) {
  const props = feature?.properties ?? {};
  const shown = (layer.properties_shown?.length ? layer.properties_shown : Object.keys(props)).filter(k => k in props);
  return {
    layer: layer.id, city: layer.id.split('.')[0], title: pick(layer.title, lang),
    origin: layer.origin, theme: layer.theme,
    props: shown.map(k => [k, props[k]]),
    method: layer.method, unit: layer.unit, spatial_scale: layer.spatial_scale, temporal: layer.temporal,
    coverage: layer.coverage, retrieved: layer.retrieved, publisher: layer.publisher,
    licence: layer.licence, licence_url: layer.licence_url, source_url: layer.source_url, attribution: layer.attribution,
    limitations: pick(layer.limitations, lang), measure_topic: layer.measure_topic ?? null,
  };
}

export const packSummary = (pack) => ({
  drawable: (pack.layers ?? []).filter(l => l.kind === 'geojson-snapshot').length,
  external: (pack.layers ?? []).filter(l => l.kind === 'raster-service').length,
  gaps: (pack.gaps ?? []).length,
  themes: [...new Set((pack.layers ?? []).map(l => l.theme))],
});

// Two layers of different cities may sit next to each other. They are comparable only on exact theme, method, unit,
// scale, origin and reference period; `differs` names the reasons so the view can say why not.
export function comparableLayers(a, b) {
  const norm = v => String(v ?? '').trim().toLowerCase();
  const differs = ['theme', 'unit', 'method', 'spatial_scale', 'origin', 'temporal'].filter(f => norm(a[f]) !== norm(b[f]));
  return { comparable: differs.length === 0, differs, same_theme: a.theme === b.theme };
}

// Initial view: zoom to the thematic layers when they cover well under the whole extent. Returns [x,y,w,h] or null.
export function fitView(geos, proj) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of geos) walkCoords(g, ([lon, lat]) => { const x = proj.x(lon), y = proj.y(lat); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  if (!isFinite(x0)) return null;
  const pad = Math.max(20, (x1 - x0) * 0.08);
  let w = Math.max(x1 - x0 + 2 * pad, 80); let h = w * proj.height / proj.width;
  if (h < (y1 - y0) + 2 * pad) { h = (y1 - y0) + 2 * pad; w = h * proj.width / proj.height; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const vx = Math.min(proj.width - w, Math.max(0, cx - w / 2)), vy = Math.min(proj.height - h, Math.max(0, cy - h / 2));
  return w > proj.width * 0.6 ? null : [vx, vy, w, h].map(v => Math.round(v * 10) / 10);
}
