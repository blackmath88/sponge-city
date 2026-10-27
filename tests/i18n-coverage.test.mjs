// Bilingual coverage of everything the journey can ask the dictionary for, including dynamic key families and placeholders.
// Author-written; complements tests/journey-bilingual.test.mjs (parity, markers). Not an independent review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { THEMES } from '../journey/map.mjs';
import { SCOPES, DIMENSIONS, ORIGINS, STATES, COMPARE_FIELDS } from '../journey/cities.mjs';
import { QUESTIONS } from '../journey/startview.mjs';
import { inspectPanel } from '../journey/mapview.mjs';
import { inspectRecord as rec } from '../journey/map.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const dict = read('journey/content/ui.json');
const has = k => dict.de[k] !== undefined && dict.en[k] !== undefined;
const matrix = read('data/indicator-matrix.json'), checks = read('data/verification/basel-claims.json'), charter = read('wrapper/data-charter-map/data/data-charter.json');

test('every literal ui(...) key used anywhere in the journey code exists in both languages (shell, views, map, brief, export, start)', () => {
  const dir = new URL('../journey/', import.meta.url); const missing = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bui\(\s*['"]([a-z0-9_\-]+)['"]\s*\)/g)) if (!has(m[1])) missing.push(`${f}: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('every dynamic key family resolves for every value the data or the code can produce', () => {
  const cells = Object.values(matrix.cells).flatMap(r => Object.values(r));
  const fam = {
    flag_: [...new Set(cells.flatMap(c => c.flags))], rc_: [...new Set(checks.claims.map(c => c.independent_recheck.state)), 'rechecked', 'partial', 'sampled', 'not-rechecked'],
    ver_: ['confirmed', 'confirmed-with-difference', 'source-unreachable', 'not-found-on-page', 'not-checked', ...checks.claims.map(c => c.verdict)], ct_: [...new Set(checks.claims.map(c => c.claim_type)), 'implementation', 'measured-performance', 'context', 'study-elsewhere'],
    sc_: SCOPES, theme_: THEMES, need_: ['request', 'measure', 'site_visit'], ex_: ['yes', 'partial', 'no_public_evidence_found', 'unknown'], ac_: ['open', 'partial', 'not_open', 'unknown'], dv_: ['yes', 'no', 'unknown'],
    cls_: [...ORIGINS, 'observed', 'derived', 'modelled', 'assumed', 'unknown'], st_: STATES, dim_: DIMENSIONS, f_: [...COMPARE_FIELDS, 'temporal'],
    status_: [...new Set(charter.indicators.map(i => i.basel.status))], fill_: [...new Set(charter.indicators.map(i => i.fill?.status).filter(Boolean))], start_to_: [...new Set(QUESTIONS.map(q => q.stage))],
  };
  const missing = [];
  for (const [prefix, values] of Object.entries(fam)) for (const v of values) if (!has(prefix + v)) missing.push(prefix + v);
  assert.deepEqual(missing, []);
});

test('placeholders are identical in German and English for every string, and the async-state messages exist in both languages', () => {
  const ph = s => (String(s).match(/\{[a-z]+\}/g) ?? []).sort().join(',');
  for (const k of Object.keys(dict.de)) assert.equal(ph(dict.de[k]), ph(dict.en[k]), `placeholder mismatch in ${k}`);
  for (const k of ['loading', 'map_layer_failed', 'map_page', 'map_rows', 'map_shared', 'map_share_fail', 'map_no_snapshot', 'map_no_layer_selected', 'load_error', 'map_prev', 'map_next']) assert.ok(has(k), k);
  assert.match(dict.de.map_page, /\{n\}.*\{pages\}/); assert.match(dict.en.map_rows, /\{from\}.*\{to\}.*\{total\}/);
});

test('source wording is preserved verbatim in both languages and declared as untranslated in the inspector', () => {
  const layer = { id: 'testa.x.01', theme: 'sealing', title: { de: 'T', en: 'T' }, origin: 'derived', method: 'Biotope mapping state 2020; Open Data record', unit: '% sealed share', spatial_scale: 'block', temporal: '2021', coverage: 'Hardplatz window / Ausschnitt', publisher: 'P', licence: 'CC0', licence_url: 'https://e.org/l', source_url: 'https://e.org/s', attribution: 'A', limitations: { de: 'Nur Test.', en: 'Test only.' }, legend: { type: 'single', items: [] } };
  for (const lang of ['de', 'en']) {
    const html = inspectPanel({ lang, ui: k => dict[lang][k] ?? `[${lang}:${k}]`, record: rec(layer, { properties: {} }, lang), measureIds: [] });
    for (const v of [layer.method, layer.unit, layer.temporal, layer.coverage]) assert.ok(html.includes(v.replace(/&/g, '&amp;')), `${lang}: source wording "${v}" kept`);
    assert.match(html, /data-source-wording/); assert.ok(html.includes(dict[lang].map_source_wording)); assert.ok(html.includes(layer.limitations[lang]));
    assert.ok(!/\[(de|en)[:?]/.test(html));
  }
});
