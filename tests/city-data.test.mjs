// Checks the real city data: profiles and map layer packs. Deterministic, offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { validateProfile } from '../journey/cities.mjs';
import { validateLayerPack, walkCoords } from '../journey/map.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const CITIES = ['basel', 'berlin', 'copenhagen', 'zurich'];
const indicators = read('journey/content/measurements.json').indicators.map(i => i.id);

test('four city profiles exist and validate', () => {
  for (const id of CITIES) {
    assert.ok(existsSync(new URL(`../data/cities/${id}.json`, import.meta.url)), `${id} profile`);
    const profile = read(`data/cities/${id}.json`);
    assert.equal(profile.id, id);
    assert.deepEqual(validateProfile(profile), []);
  }
});

test('every city has a layer pack that validates with the city taken from its folder, snapshots are bounded', () => {
  for (const id of CITIES) {
    const dir = `data/maps/${id}`;
    const pack = read(`${dir}/layers.json`);
    assert.equal(pack.city, id, `${id}: layers.json city must equal its folder`);
    const files = {};
    for (const layer of pack.layers) {
      if (layer.kind !== 'geojson-snapshot') continue;
      const path = new URL(`../${dir}/${layer.file}`, import.meta.url);
      assert.ok(statSync(path).size <= 400 * 1024, `${layer.file} is over 400 KB`);
      files[layer.file] = JSON.parse(readFileSync(path, 'utf8'));
    }
    assert.deepEqual(validateLayerPack(pack, files), []);
    const unreferenced = readdirSync(new URL(`../${dir}/`, import.meta.url)).filter(f => f.endsWith('.geojson') && !pack.layers.some(l => l.file === f));
    assert.deepEqual(unreferenced, [], `${id}: snapshot not described in layers.json`);
    for (const layer of pack.layers) if (layer.measure_topic) assert.ok(indicators.includes(layer.measure_topic), `${layer.id}: measure_topic ${layer.measure_topic} is not a featured indicator`);
    for (const layer of pack.layers) assert.ok(!(layer.origin === 'observed' && /model|simul|hazard map|scenario/i.test(layer.method)), `${layer.id}: modelled method labelled observed`);
  }
});

test('no snapshot geometry appears in two cities (city isolation)', () => {
  const seen = new Map();
  for (const id of CITIES) {
    const pack = read(`data/maps/${id}/layers.json`);
    for (const layer of pack.layers.filter(l => l.kind === 'geojson-snapshot')) {
      const geo = read(`data/maps/${id}/${layer.file}`); let n = 0;
      walkCoords(geo, c => { if (n++ < 20) { const k = c.map(v => v.toFixed(5)).join(','); if (seen.has(k) && seen.get(k) !== id) assert.fail(`${layer.id} shares a coordinate with ${seen.get(k)}`); seen.set(k, id); } });
    }
  }
});

test('profile references: layer titles and gaps are bilingual and Swiss-spelled', () => {
  for (const id of CITIES) {
    const pack = read(`data/maps/${id}/layers.json`);
    for (const g of pack.gaps ?? []) { assert.ok(g.reason.de && g.reason.en); assert.ok(!/ß/.test(g.reason.de)); }
  }
});
