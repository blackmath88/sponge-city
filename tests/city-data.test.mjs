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

import { matrixView } from '../journey/views.mjs';
test('indicator matrix: complete, every reference resolves, states are consistent', () => {
  const matrix = read('data/indicator-matrix.json');
  const profiles = Object.fromEntries(CITIES.map(id => [id, read(`data/cities/${id}.json`)]));
  const packs = Object.fromEntries(CITIES.map(id => [id, read(`data/maps/${id}/layers.json`)]));
  const EX = ['yes', 'partial', 'no_public_evidence_found', 'unknown'], BASIS = ['observed', 'derived', 'modelled', 'assumed', 'unknown'], AC = ['open', 'partial', 'not_open', 'unknown'], DV = ['yes', 'no', 'unknown'], NEEDS = ['request', 'measure', 'site_visit'];
  for (const ind of matrix.indicators) {
    if (ind.featured_indicator) assert.ok(indicators.includes(ind.featured_indicator), `${ind.id}: featured_indicator`);
    assert.ok(ind.label.de && ind.label.en && ind.question.de && ind.question.en);
    for (const id of CITIES) {
      const cell = matrix.cells[ind.id]?.[id]; const where = `${ind.id}.${id}`;
      assert.ok(cell, `${where}: missing cell`);
      assert.ok(EX.includes(cell.state.exists) && BASIS.includes(cell.state.basis) && AC.includes(cell.state.access) && DV.includes(cell.state.derivable), `${where}: state vocabulary`);
      assert.ok(cell.needs.every(n => NEEDS.includes(n)), `${where}: needs`);
      assert.ok(cell.note.de && cell.note.en && !/ß/.test(cell.note.de), `${where}: note`);
      for (const e of cell.entries) assert.ok(profiles[id].entries.some(x => x.id === e), `${where}: entry ${e} not in ${id} profile`);
      for (const l of cell.layers) assert.ok(packs[id].layers.some(x => x.id === l), `${where}: layer ${l} not in ${id} pack`);
      if (cell.state.exists === 'yes') assert.ok(cell.entries.length + cell.layers.length > 0, `${where}: exists without evidence`);
      if (cell.state.exists === 'no_public_evidence_found') assert.ok(cell.state.access !== 'open' && cell.state.derivable !== 'yes', `${where}: absent evidence cannot be open/derivable`);
      if (cell.state.derivable === 'yes') assert.ok(['open', 'partial'].includes(cell.state.access), `${where}: derivable needs accessible inputs`);
      if (cell.state.basis === 'observed' && cell.layers.some(l => packs[id].layers.find(x => x.id === l).origin === 'modelled')) assert.fail(`${where}: observed cell cites a modelled layer`);
    }
  }
  for (const id of CITIES) { const e = matrix.cells.effect[id]; assert.ok(e.state.access === 'unknown' && e.state.derivable === 'unknown', `effect/${id}: an absence of public evidence is not proof of closure`); }
  const ui = JSON.parse(readFileSync(new URL('../journey/content/ui.json', import.meta.url)));
  for (const lang of ['de', 'en']) {
    const html = matrixView({ lang, ui: k => ui[lang][k] ?? `[${lang}:${k}]`, content: { matrix, cities: CITIES.map(id => profiles[id]) } });
    assert.ok(!/\[(de|en)[:?]/.test(html), `marker in ${lang}`); assert.match(html, /data-cell="sealing.zurich"/);
    assert.ok(!/\b(rank|score|best)\b/i.test(html));
  }
});
