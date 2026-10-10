// Deterministic fixtures for the map checks: two invented rectangles that are not real places.
export const layer = (city, id, over = {}) => ({
  id: `${city}.${id}`, theme: 'sealing', title: { de: 'Versiegelung (Testdaten)', en: 'Sealing (fixture)' }, kind: 'geojson-snapshot', file: `${city}.${id}.geojson`, tiles: null,
  origin: 'derived', method: 'fixture method', unit: 'percent', spatial_scale: 'block', temporal: '2021', retrieved: '2026-10-10', coverage: 'whole fixture city',
  publisher: 'Fixture office', licence: 'CC0', licence_url: 'https://example.org/licence', source_url: 'https://example.org/data', attribution: 'Fixture',
  limitations: { de: 'Nur Testdaten.', en: 'Fixture data only.' },
  legend: { type: 'categorical', property: 'cls', items: [{ value: 'high', label: { de: 'hoch', en: 'high' }, color: '#aa3300' }, { value: 'low', label: { de: 'tief', en: 'low' }, color: '#3377aa' }] },
  properties_shown: ['cls'], measure_topic: 'sealing-fraction', ...over,
});
export const square = (w, s, e, n) => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] });
export const geo = (...feats) => ({ type: 'FeatureCollection', features: feats.map(([g, props]) => ({ type: 'Feature', geometry: g, properties: props })) });
export const packA = { schema_version: 'sponge-city-layers/1', city: 'testa', name: { de: 'Testa', en: 'Testa' }, context: { de: 'Testkontext A', en: 'Test context A' },
  extent: { bbox: [7.0, 47.0, 7.2, 47.1], source: 'https://example.org/boundary' },
  layers: [layer('testa', 'sealing.01'), layer('testa', 'boundary.01', { theme: 'boundary', legend: { type: 'single', items: [{ value: 'b', label: { de: 'Grenze', en: 'Boundary' }, color: '#243c35' }] } }), layer('testa', 'hazard.01', { theme: 'flood-hazard', kind: 'raster-service', file: null, tiles: 'https://example.org/{z}/{x}/{y}.png', origin: 'modelled' })],
  gaps: [{ theme: 'heat', reason: { de: 'Keine offene Hitzekarte gefunden.', en: 'No open heat map found.' }, checked: ['https://example.org/heat → HTTP 404'] }] };
export const geoA = { 'testa.sealing.01': geo([square(7.01, 47.01, 7.1, 47.05), { cls: 'high' }], [square(7.1, 47.05, 7.19, 47.09), { cls: 'low' }]), 'testa.boundary.01': geo([square(7.0, 47.0, 7.2, 47.1), {}]) };
export const packB = { ...packA, city: 'testb', name: { de: 'Testb', en: 'Testb' }, layers: [layer('testb', 'sealing.01', { method: 'other method' })], gaps: [] };
