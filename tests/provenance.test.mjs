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

const cityOf = id => read(`data/cities/${id}.json`);
test('cantonal items are scoped as canton, the Copenhagen estimate is qualified, thin quotes are labelled', () => {
  const z = cityOf('zurich'), c = cityOf('copenhagen');
  for (const id of ['zurich.context.01', 'zurich.context.02', 'zurich.measurement.03']) assert.equal(z.entries.find(e => e.id === id).scope, 'canton', id);
  const est = c.entries.find(e => e.id === 'copenhagen.outcomes.01');
  assert.equal(est.origin, 'unknown'); assert.match(est.origin_note.en, /estimate/i); assert.match(est.origin_note.en, /method is not stated/i); assert.match(est.origin_note.de, /Schätzung/);
  const thin = [...z.entries, ...c.entries].flatMap(e => e.sources.map(s => ({ e, s }))).filter(({ s }) => s.quote_note);
  assert.ok(thin.length >= 2, 'thin or reference-only quotes carry a note');
  assert.ok(thin.every(({ s }) => s.quote_note.de && s.quote_note.en && !/ß/.test(s.quote_note.de)));
  assert.ok(thin.some(({ e }) => e.id === 'zurich.access.01') && thin.some(({ e }) => e.id === 'copenhagen.access.01'));
  for (const lang of ['de', 'en']) {
    const html = entryCard(c.entries.find(e => e.id === 'copenhagen.outcomes.01'), lang, ui(lang)); assert.match(html, /data-origin-note/);
    const h2 = entryCard(z.entries.find(e => e.id === 'zurich.access.01'), lang, ui(lang)); assert.match(h2, /data-quote-note/); assert.match(entryCard(z.entries.find(e => e.id === 'zurich.context.02'), lang, ui(lang)), /scope-canton/);
    assert.ok(!/\[(de|en)[:?]/.test(html + h2));
  }
});

test('unchecked, unreachable and thin sources are flagged on the collapsed source line, confirmed ones are not', () => {
  const basel = read('data/cities/basel.json'), zurich = cityOf('zurich');
  for (const lang of ['de', 'en']) {
    const flagged = (e) => (entryCard(e, lang, ui(lang)).match(/<summary>.*?<\/summary>/g) ?? []).filter(x => /data-flag-summary/.test(x)).length;
    assert.ok(flagged(basel.entries.find(e => e.id === 'basel.context.basel-canopy')) >= 1, 'not-checked source is flagged in the summary');
    assert.equal(flagged(basel.entries.find(e => e.id === 'basel.context.basel-sealed')), 0, 'a confirmed source carries no flag');
    assert.ok(flagged(zurich.entries.find(e => e.id === 'zurich.access.01')) >= 1, 'a reference-only quote is flagged in the summary');
    assert.ok(!/\[(de|en)[:?]/.test(entryCard(zurich.entries.find(e => e.id === 'zurich.access.01'), lang, ui(lang))));
  }
});
