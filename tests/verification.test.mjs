import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { practiceView, measureView } from '../journey/views.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const dict = read('journey/content/ui.json');
const ui = lang => k => dict[lang][k] ?? `[${lang}:${k}]`;
const checks = read('data/verification/basel-claims.json');
const checksDe = existsSync(new URL('../data/verification/basel-claims.de.json', import.meta.url)) ? read('data/verification/basel-claims.de.json') : null;
const content = { checks, checksDe, practice: read('journey/content/practice.json'), facts: read('data/sponge-facts.json'), concept: read('journey/content/concept.json'), measurements: read('journey/content/measurements.json'), charter: read('wrapper/data-charter-map/data/data-charter.json'), cities: [] };

test('every practice case and featured Basel statement has a dated verification record', () => {
  const byId = new Map(checks.claims.map(c => [c.id, c]));
  for (const c of content.practice.cases) assert.ok(byId.has(c.fact), `no check for ${c.fact}`);
  for (const id of ['land-cover', 'sealing-fraction', 'tree-pits', 'sewer-network']) assert.ok(byId.has('measurement:' + id), `no check for ${id}`);
  for (const c of checks.claims) {
    assert.match(c.retrieved_on, /^\d{4}-\d{2}-\d{2}$/); assert.ok(c.source_url && c.evidence && c.claim_type, c.id);
    assert.ok(['confirmed', 'confirmed-with-difference', 'source-unreachable', 'not-found-on-page', 'not-checked'].includes(c.verdict), c.id);
    if (c.verdict !== 'confirmed') assert.ok(c.verification_limit, `${c.id}: a non-confirmed verdict needs a stated limit`);
    if (c.claim_type === 'measured-performance') assert.ok(c.verdict === 'confirmed', `${c.id}: measured performance must be confirmed`);
  }
});

test('verification renders in both languages; unreachable sources are labelled as not re-verified; German evidence is translated when available', () => {
  for (const lang of ['de', 'en']) {
    const html = practiceView({ lang, ui: ui(lang), content });
    assert.ok(!/\[(de|en)[:?]/.test(html), `markers in ${lang}`);
    assert.match(html, /data-verdict="source-unreachable"/); assert.match(html, /data-verdict="confirmed-with-difference"/);
    assert.match(html, new RegExp(ui(lang)('ver_source-unreachable')));
    const m = measureView({ lang, ui: ui(lang), content: { ...content, measureSel: 'land-cover' } });
    assert.match(m, /data-verdict="confirmed"/);
  }
  if (checksDe) {
    assert.deepEqual(Object.keys(checksDe.claims).sort(), checks.claims.map(c => c.id).sort());
    assert.ok(!/ß/.test(JSON.stringify(checksDe)));
    assert.ok(!/lang="en"/.test(practiceView({ lang: 'de', ui: ui('de'), content })), 'all German evidence translated');
  }
});
