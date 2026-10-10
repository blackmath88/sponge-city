import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLayerPack, parseMapState, writeMapState, makeProjection, geometryPath, comparableLayers, colorFor, legendEntries, inspectRecord } from '../journey/map.mjs';
import { mapView } from '../journey/mapview.mjs';
import { packA, packB, geoA, layer, square, geo } from './fixtures/maps/fixture.mjs';
import { readFileSync } from 'node:fs';

const ui = JSON.parse(readFileSync(new URL('../journey/content/ui.json', import.meta.url)));
const uiFor = lang => key => ui[lang][key] ?? `[${lang}:${key}]`;
const geoMap = new Map(Object.entries(geoA));
const byFile = (pack, g) => Object.fromEntries(pack.layers.filter(l => g[l.id]).map(l => [l.file, g[l.id]]));
const packs = { testa: packA, testb: { ...packB, extent: packA.extent } };

test('layer pack validates; city isolation catches foreign geometry', () => {
  assert.deepEqual(validateLayerPack(packA, byFile(packA, geoA)), []);
  const foreign = { ...geoA, 'testa.sealing.01': geo([square(8.5, 52.4, 8.6, 52.5), { cls: 'high' }]) };
  assert.ok(validateLayerPack(packA, byFile(packA, foreign)).some(p => /outside the city extent/.test(p)));
  assert.ok(validateLayerPack({ ...packA, layers: [{ ...packA.layers[0], id: 'other.sealing.01' }] }, geoA).some(p => /must start with/.test(p)));
  assert.ok(validateLayerPack({ ...packA, layers: [{ ...packA.layers[0], licence_url: '' }] }, geoA).length);
  assert.ok(validateLayerPack({ ...packA, gaps: [{ theme: 'heat', reason: { de: 'x', en: 'y' }, checked: [] }] }, geoA).some(p => /checked/.test(p)));
});

test('share state round-trips and rejects unknown cities and layers', () => {
  const st = parseMapState('?city=testa&layers=testa.sealing.01,bogus&compare=testb&layers2=testb.sealing.01&sel=testa.sealing.01:1', packs);
  assert.deepEqual(st.layers, ['testa.sealing.01']);
  assert.equal(st.compare, 'testb'); assert.deepEqual(st.sel, { layer: 'testa.sealing.01', index: 1 });
  const url = writeMapState('http://x/?lang=de&place=kanonengasse', st);
  assert.equal(url.searchParams.get('lang'), 'de');
  assert.deepEqual(parseMapState(url.search, packs), st);
  assert.equal(parseMapState('?city=nowhere', packs).city, 'testa');
  assert.equal(parseMapState('?city=testa&compare=testa', packs).compare, null);
  assert.equal(parseMapState('?city=testa&sel=testb.sealing.01:0', packs).sel, null, 'a selection from another city is dropped');
});

test('projection keeps the extent aspect and draws geometry', () => {
  const proj = makeProjection(packA.extent.bbox);
  assert.equal(proj.width, 1000); assert.ok(proj.height > 0);
  assert.match(geometryPath(square(7.0, 47.0, 7.2, 47.1), proj), /^M0 [\d.]+L/);
  assert.equal(geometryPath({ type: 'Nonsense' }, proj), '');
});

test('legend colours follow the layer property; unknown classes are grey, not a match', () => {
  const l = packA.layers[0];
  assert.equal(colorFor(l, { properties: { cls: 'high' } }), '#aa3300');
  assert.equal(colorFor(l, { properties: { cls: 'zzz' } }), '#9aa39e');
  assert.ok(legendEntries(l, 'de').some(e => e.other));
});

test('equal themes are comparable only on exact method, unit and scale', () => {
  assert.equal(comparableLayers(packA.layers[0], packA.layers[0]).comparable, true);
  assert.equal(comparableLayers(packA.layers[0], packB.layers[0]).comparable, false);
});

for (const lang of ['de', 'en']) {
  test(`map view renders in ${lang}: provenance, legends, gaps, external layers, no missing keys`, () => {
    const st = parseMapState('?city=testa&layers=testa.boundary.01,testa.sealing.01&compare=testb&layers2=testb.sealing.01', packs);
    const html = mapView({ lang, ui: uiFor(lang), packs, geoById: new Map([...geoMap, ['testb.sealing.01', geoA['testa.sealing.01']]]), state: st, measureIds: ['sealing-fraction'] });
    assert.ok(!/\[(de|en)[:?]/.test(html), 'no missing translation markers');
    assert.ok(!/ß/.test(html));
    assert.match(html, /data-city="testa"/); assert.match(html, /data-legend="testa.sealing.01"/);
    assert.match(html, /data-gap="heat"/); assert.match(html, /disabled/); // raster-service listed, not drawable
    assert.match(html, /data-compare-note/); assert.match(html, /class="pair no"/);
    assert.equal((html.match(/class="mappanel"/g) ?? []).length, 2, 'two panels side by side');
    assert.ok(!/testa\.sealing\.01/.test(html.split('data-side="b"')[1].split('</figure>')[0]), 'panel b must not draw city a layers');
  });
}

test('failed layer shows an error and keeps the rest; empty selection says so', () => {
  const st = parseMapState('?city=testa&layers=testa.sealing.01', packs);
  const bad = mapView({ lang: 'en', ui: uiFor('en'), packs, geoById: new Map([['testa.sealing.01', null]]), state: st });
  assert.match(bad, /role="alert"/); assert.match(bad, /class="mapempty"/);
  const none = mapView({ lang: 'de', ui: uiFor('de'), packs, geoById: geoMap, state: { ...st, layers: [] } });
  assert.match(none, /mapempty/);
});

test('inspect panel shows source, date, coverage, licence and the screening boundary; links to the measurement', () => {
  const st = parseMapState('?city=testa&layers=testa.sealing.01&sel=testa.sealing.01:0', packs);
  const rec = inspectRecord(packA.layers[0], geoA['testa.sealing.01'].features[0], 'en');
  const html = mapView({ lang: 'en', ui: uiFor('en'), packs, geoById: geoMap, state: st, record: rec, measureIds: ['sealing-fraction'] });
  for (const needle of ['fixture method', '2021', '2026-10-10', 'whole fixture city', 'CC0', 'Fixture data only', 'not a verified site assessment', 'data-indicator-go="sealing-fraction"']) assert.ok(html.includes(needle), needle);
  const noLink = mapView({ lang: 'en', ui: uiFor('en'), packs, geoById: geoMap, state: st, record: rec, measureIds: [] });
  assert.ok(!noLink.includes('data-indicator-go'));
});

test('table view is a complete non-map evidence view', () => {
  const st = parseMapState('?city=testa&layers=testa.sealing.01', packs);
  const html = mapView({ lang: 'de', ui: uiFor('de'), packs, geoById: geoMap, state: st, mode: 'table' });
  assert.match(html, /data-layer-row="testa.sealing.01"/); assert.match(html, /data-pick="testa.sealing.01:0"/); assert.ok(!/<svg/.test(html));
});
