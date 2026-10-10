import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapBriefRecord, mapBriefMarkdown } from '../journey/mapbrief.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const CITIES = ['basel', 'berlin', 'copenhagen', 'zurich'];
const ui = lang => { const d = read('journey/content/ui.json')[lang]; return k => d[k] ?? `[${lang}:${k}]`; };
const matrix = read('data/indicator-matrix.json'), measurements = read('journey/content/measurements.json');

const NAMES = { basel: ['Basel'], berlin: ['Berlin'], copenhagen: ['Copenhagen', 'Kopenhagen', 'København'], zurich: ['Zürich', 'Zurich'] };
// every drawable layer of every city, including the ones that carry a measure_topic (sealing) and the ones that do not
const targets = CITIES.flatMap(id => read(`data/maps/${id}/layers.json`).layers.filter(l => l.kind === 'geojson-snapshot').map(l => [id, l.id]));
for (const [id, layerId] of targets) test(`${layerId}: map brief carries provenance, unresolved checks, only this city's own text and no Basel charter guidance elsewhere`, () => {
  const pack = read(`data/maps/${id}/layers.json`), profile = read(`data/cities/${id}.json`);
  const layer = pack.layers.find(l => l.id === layerId), feature = read(`data/maps/${id}/${layer.file}`).features[0];
  const args = { pack, profile, layer, index: 0, feature, matrix, measurements };
  const rec = mapBriefRecord({ ...args, lang: 'de' });
  assert.equal(rec.status, 'requires-investigation'); assert.equal(rec.ui_language, 'de'); assert.equal(rec.city.id, id);
  assert.ok(rec.sources[0].licence_url && rec.sources[0].retrieved && rec.evidence.class);
  assert.ok(rec.unresolved_checks.some(c => /site-verification$/.test(c.id)), 'site verification always unresolved');
  assert.ok(rec.boundaries.some(b => /cannot clear an authority gate/.test(b)));
  if (id !== 'basel') { assert.equal(rec.related_indicator, null, 'Basel charter next action must not appear in another city brief'); assert.ok(!rec.actors.some(a => /Stadtg|Tiefbauamt|AUE|Basel/.test(a)), 'no Basel actors'); }
  const others = CITIES.filter(c => c !== id);
  const blob = JSON.stringify(rec);
  for (const o of others) { assert.ok(!blob.includes(`${o}.`), `${id} brief ids mention ${o}`); for (const n of NAMES[o]) assert.ok(!blob.includes(n), `${id} brief names ${n}`); }
  for (const lang of ['de', 'en']) {
    const md = mapBriefMarkdown({ ...args, lang, ui: ui(lang) });
    const own = mapBriefMarkdown({ ...args, feature: { properties: {} }, lang, ui: ui(lang) }); // source property values keep their own spelling
    assert.ok(!/\[(de|en)[:?]/.test(md) && !/ß/.test(own), `markers or ß in ${lang}`);
    assert.ok(md.includes(layer.id) && md.includes(layer.licence_url) && md.includes(layer.retrieved));
    assert.ok(!/\(nichts offen\)|\(nothing outstanding\)/.test(md.split(/## .*(?:Offene Prüfungen|Unresolved checks)/)[1]?.split('## ')[0] ?? ''), 'resolved cells must not be listed as unresolved');
    for (const o of others) { assert.ok(!md.includes(o + '.'), `${id} markdown ids mention ${o}`); for (const n of NAMES[o]) assert.ok(!md.includes(n), `${id} markdown names ${n}`); }
  }
});
