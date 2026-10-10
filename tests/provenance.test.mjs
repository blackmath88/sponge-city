// Evidence labels and retrieval dates in the Basel profile follow the verification record, not a version bump.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryCard } from '../journey/views.mjs';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const basel = read('data/cities/basel.json'), checks = new Map(read('data/verification/basel-claims.json').claims.map(c => [c.id, c]));
const ui = lang => { const d = read('journey/content/ui.json')[lang]; return k => d[k] ?? `[${lang}:${k}]`; };

test('the Engelgasse entry (a 2016 announcement) is not labelled observed', () => {
  const e = basel.entries.find(x => x.id === 'basel.interventions.engelgasse');
  assert.equal(e.origin, 'unknown'); assert.match(e.text.en, /announced/i); assert.match(e.text.en, /not verified/i);
  assert.equal(e.sources[0].quote_basis, 'source-verbatim'); assert.equal(e.sources[0].quote_lang, 'de');
});

test('a retrieval date later than the collection date exists only where a check reached the source; nothing else is re-dated', () => {
  for (const e of basel.entries) for (const s of e.sources) {
    assert.ok(s.verification, `${e.id}: source carries its verification state`);
    const reached = ['confirmed', 'confirmed-with-difference'].includes(s.verification.verdict);
    if (reached) assert.equal(s.retrieved, s.verification.checked_on, `${e.id}: retrieval date must be the date of the check that reached the source`);
    else assert.equal(s.retrieved, '2026-10-03', `${e.id}: unchecked or unreachable sources keep the collection date`);
  }
  assert.equal(basel.provenance.snapshot, '2026-10-03'); assert.equal(basel.provenance.refetched_in_this_session, false);
  for (const [id, c] of checks) if (c.verdict === 'source-unreachable') assert.ok(!basel.entries.some(e => e.id.endsWith('.' + id) && e.sources.some(s => s.retrieved !== '2026-10-03')), id);
});

test('unchecked and unreachable sources are visibly flagged in both languages', () => {
  const unchecked = basel.entries.find(e => e.sources.some(s => s.verification.verdict === 'not-checked'));
  for (const lang of ['de', 'en']) {
    const html = entryCard(unchecked, lang, ui(lang));
    assert.match(html, /data-verification="not-checked"/); assert.ok(!/\[(de|en)[:?]/.test(html));
  }
});
