import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapBriefRecord, mapBriefMarkdown } from '../journey/mapbrief.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const CITIES = ['basel', 'berlin', 'copenhagen', 'zurich'];
const ui = lang => { const d = read('journey/content/ui.json')[lang]; return k => d[k] ?? `[${lang}:${k}]`; };
const matrix = read('data/indicator-matrix.json'), measurements = read('journey/content/measurements.json');

for (const id of CITIES) test(`${id}: map brief carries provenance, unresolved checks and no other city`, () => {
  const pack = { ...read(`data/maps/${id}/layers.json`) }, profile = read(`data/cities/${id}.json`);
  const layer = pack.layers.find(l => l.kind === 'geojson-snapshot' && l.theme !== 'boundary') ?? pack.layers[0];
  const feature = read(`data/maps/${id}/${layer.file}`).features[0];
  const args = { pack, profile, layer, index: 0, feature, matrix, measurements };
  const rec = mapBriefRecord({ ...args, lang: 'de' });
  assert.equal(rec.status, 'requires-investigation'); assert.equal(rec.ui_language, 'de'); assert.equal(rec.city.id, id);
  assert.ok(rec.sources[0].licence_url && rec.sources[0].retrieved && rec.evidence.class);
  assert.ok(rec.unresolved_checks.some(c => /site-verification$/.test(c.id)), 'site verification always unresolved');
  assert.ok(rec.boundaries.some(b => /cannot clear an authority gate/.test(b)));
  const others = CITIES.filter(c => c !== id);
  const blob = JSON.stringify(rec);
  for (const o of others) assert.ok(!new RegExp(`"${o}[.-]`).test(blob) && !blob.includes(`${o}.`), `${id} brief mentions ${o}`);
  for (const lang of ['de', 'en']) {
    const md = mapBriefMarkdown({ ...args, lang, ui: ui(lang) });
    assert.ok(!/\[(de|en)[:?]/.test(md) && !/ß/.test(md), `markers or ß in ${lang}`);
    assert.ok(md.includes(layer.id) && md.includes(layer.licence_url) && md.includes(layer.retrieved));
    for (const o of others) assert.ok(!md.includes(o + '.'), `${id} markdown mentions ${o}`);
  }
});
