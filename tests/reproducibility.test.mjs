// Repository-local reproducibility of the Basel tree and area figures: what is recomputed, what is a recorded gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recompute } from '../scripts/recompute-basel-trees.mjs';
import { practiceView } from '../journey/views.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const dict = read('journey/content/ui.json');
const ui = lang => k => dict[lang][k] ?? `[${lang}:${k}]`;
const repro = read('data/verification/reproducibility.json'), checks = read('data/verification/basel-claims.json'), checksDe = read('data/verification/basel-claims.de.json');

test('the pinned snapshot reproduces the "without mapped planted polygon" count and quartiles exactly', () => {
  const r = recompute(), rec = repro.reproduced.find(x => x.id === 'trees-without-mapped-planted-polygon').result;
  assert.deepEqual(r, rec);
  assert.equal(r.total, 12504); assert.equal(r.snapshot.unique_ids, 12504);
  assert.equal(r.without_mapped_planted_polygon + r.in_mapped_planted_polygon, r.total);
  assert.equal(r.without_mapped_planted_polygon, 9132); assert.equal(r.without_share_percent, 73.03);
  assert.deepEqual([r.planted_polygon_area_m2.q1, r.planted_polygon_area_m2.median, r.planted_polygon_area_m2.q3], [202, 371, 787]);
});

test('the 9,046 paved-polygon count is NOT claimed as reproduced: the missing input is stated and it stays author-only', () => {
  assert.ok(!repro.reproduced.some(x => /9,?046|paved|befestigt/i.test(JSON.stringify(x.label) + JSON.stringify(x.result))), 'no reproduced entry may stand for the paved count');
  for (const id of ['trees-in-paved-polygons', 'basel-area-percentages', 'basel-hot-days']) {
    const g = repro.gaps.find(x => x.id === id); assert.ok(g, id);
    assert.equal(g.status, 'not-reproducible-locally'); assert.equal(g.author_only, true);
    for (const f of ['missing_input', 'expected_computation', 'current_status']) assert.ok(g[f].de && g[f].en && !/ß/.test(g[f].de), `${id}.${f}`);
    assert.match(g.source_url, /^https:\/\/data\.bs\.ch\/explore\/dataset\/\d+\/$/); assert.match(g.source_date, /2026-/);
    for (const c of g.claims) assert.ok(checks.claims.some(x => x.id === c), `${id}: claim ${c}`);
  }
  // the repository window is far smaller than the claimed dataset: this is why the area shares cannot be recomputed locally
  const win = read('data/maps/basel/basel.sealing.01.geojson'); assert.ok(win.features.length < 2000 && win.features.length < 49595);
  const by = new Map(checks.claims.map(c => [c.id, c]));
  assert.equal(by.get('sealed-trees').independent_recheck.state, 'sampled'); assert.equal(by.get('basel-sealed').independent_recheck.state, 'partial');
});

test('the practice cards show the reproduced figure and the gaps, in both languages, as author-only', () => {
  const content = { checks, checksDe, repro, practice: read('journey/content/practice.json'), facts: read('data/sponge-facts.json'), concept: read('journey/content/concept.json'), measurements: read('journey/content/measurements.json'), charter: read('wrapper/data-charter-map/data/data-charter.json'), cities: [] };
  for (const lang of ['de', 'en']) {
    const html = practiceView({ lang, ui: ui(lang), content });
    assert.ok(!/\[(de|en)[:?]/.test(html));
    assert.match(html, /data-repro="reproduced"/); assert.ok((html.match(/data-repro="gap"/g) ?? []).length >= 3);
    assert.ok(html.includes(dict[lang].rp_author)); assert.ok(html.includes('9132') || html.includes('9,132') || /9132 \/ 12504/.test(html));
  }
});
