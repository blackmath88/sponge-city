import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLang, persistLang, pick } from '../journey/i18n.mjs';
import { validateProfile, compareMeasures, measurePairs, DIMENSIONS } from '../journey/cities.mjs';
import { conceptView, practiceView, measureView, citiesView, exportView } from '../journey/views.mjs';
import { exportJson, exportMarkdown, localizeRecord, referenceGaps } from '../journey/export.mjs';
import { moduleUrl } from '../journey/context.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const dict = read('journey/content/ui.json');
const concept = read('journey/content/concept.json');
const practice = read('journey/content/practice.json');
const measurements = read('journey/content/measurements.json');
const charter = read('wrapper/data-charter-map/data/data-charter.json');
const facts = read('data/sponge-facts.json');
const manifest = read('journey/modules.json');
const cities = readdirSync(join(root, 'data/cities')).filter(f => f.endsWith('.json')).map(f => read('data/cities/' + f)).sort((a, b) => (a.role === 'home' ? -1 : 1) - (b.role === 'home' ? -1 : 1));
const overlayPath = join(root, 'journey/content/place-de.json');
const overlay = existsSync(overlayPath) ? read('journey/content/place-de.json') : null;
const places = read('site/assets/places.json').places;
const content = { concept, practice, measurements, charter, facts, cities };
const ui = lang => key => { assert.ok(dict[lang][key] !== undefined, `missing ${lang}:${key}`); return dict[lang][key]; };

// Every {de,en} pair in the journey content, with a path for failure messages.
function* bilingual(value, path = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.includes('de') && keys.includes('en') && keys.every(k => ['de', 'en'].includes(k))) { yield [path, value]; return; }
    for (const k of keys) yield* bilingual(value[k], `${path}/${k}`);
  } else if (Array.isArray(value)) value.forEach((v, i) => { for (const x of bilingual(v, `${path}[${i}]`)) {} ; });
}
function* allPairs(value, path = '') {
  if (Array.isArray(value)) { for (let i = 0; i < value.length; i++) yield* allPairs(value[i], `${path}[${i}]`); return; }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length && keys.every(k => k === 'de' || k === 'en') && keys.includes('de') && keys.includes('en')) { yield [path, value]; return; }
    for (const k of keys) yield* allPairs(value[k], `${path}/${k}`);
  }
}

test('Language resolves German by default, honours ?lang and a stored choice, and rejects unknown values', () => {
  const mem = { v: null, getItem() { return this.v; }, setItem(_, x) { this.v = x; } };
  assert.equal(resolveLang('', mem), 'de');
  assert.equal(resolveLang('?lang=en', mem), 'en');
  assert.equal(resolveLang('?lang=fr', mem), 'de');
  persistLang('en', mem);
  assert.equal(resolveLang('', mem), 'en');
  assert.equal(resolveLang('?lang=de', mem), 'de');
  assert.equal(resolveLang('', { getItem() { throw Error('blocked'); } }), 'de');
  assert.equal(pick({ de: 'a' }, 'en'), '[en?]');
});

test('UI dictionaries have identical keys, no empty strings, and Swiss spelling (no ß) in German', () => {
  assert.deepEqual(Object.keys(dict.de).sort(), Object.keys(dict.en).sort());
  for (const lang of ['de', 'en']) for (const [k, v] of Object.entries(dict[lang])) assert.ok(String(v).trim(), `${lang}:${k} empty`);
  for (const [k, v] of Object.entries(dict.de)) assert.ok(!/ß/.test(v), `ß in de:${k}`);
});

test('Every UI key used by the journey exists in both languages', () => {
  const sources = ['journey/views.mjs', 'journey/app.mjs', 'journey/export.mjs', 'journey/page.html'].map(f => readFileSync(join(root, f), 'utf8')).join('\n');
  const used = new Set([...sources.matchAll(/\bu?i?\(?'([a-z][a-z0-9_-]+)'\)/g)].map(m => m[1]));
  for (const m of sources.matchAll(/data-i18n(?:-label)?="([a-z0-9_]+)"/g)) used.add(m[1]);
  for (const m of sources.matchAll(/\bui\('([a-z0-9_]+)'\)/g)) used.add(m[1]);
  for (const key of used) if (/^[a-z]+_[a-z0-9_-]+$/.test(key) && !['sponge_lang'].includes(key)) assert.ok(key in dict.de && key in dict.en, `UI key not defined in both languages: ${key}`);
  // dynamic families
  for (const status of ['open', 'partial', 'restricted', 'missing']) assert.ok(`status_${status}` in dict.de);
  for (const fill of ['run', 'proposed', 'none']) assert.ok(`fill_${fill}` in dict.de);
  for (const cls of ['observed', 'derived', 'modelled', 'assumed', 'unknown']) assert.ok(`cls_${cls}` in dict.de);
  for (const d of DIMENSIONS) assert.ok(`dim_${d}` in dict.de);
  for (const s of ['project', 'programme', 'city-wide', 'unspecified']) assert.ok(`sc_${s}` in dict.de, `sc_${s}`);
  for (const s of ['found', 'no_public_evidence_found', 'unknown']) assert.ok(`st_${s}` in dict.de);
  for (const e of ['basel-data', 'official', 'research', 'inference']) assert.ok(`ev_${e}` in dict.de);
  for (const f of ['quantity', 'unit', 'method', 'spatial_scale']) assert.ok(`f_${f}` in dict.de);
});

test('All bilingual content is complete in both languages, with Swiss spelling in German', () => {
  const files = { manifest, concept, measurements, practice: { scopes: practice.scopes, lessons: practice.cases.map(c => c.lesson) }, cities };
  let n = 0;
  for (const [name, value] of Object.entries(files)) for (const [path, pair] of allPairs(value)) {
    n++;
    for (const lang of ['de', 'en']) if (typeof pair[lang] === 'string' && path.indexOf('/contrast') === -1 && !path.endsWith('/selection/contrast')) assert.ok(pair[lang].trim(), `${name}${path}.${lang} empty`);
    assert.ok(!/ß/.test(pair.de), `ß in ${name}${path}`);
  }
  assert.ok(n > 200, `expected many pairs, found ${n}`);
  for (const c of practice.cases) { assert.ok(c.claim_de.trim() && !/ß/.test(c.claim_de + (c.caveat_de ?? ''))); assert.equal(Boolean(c.caveat_en), Boolean(c.caveat_de), `${c.fact} caveat parity`); }
});

test('Translated claims and indicator text stay pinned to their sources (provenance integrity)', () => {
  const factIndex = new Map(facts.context.map(f => [f.id, f]));
  for (const i of facts.interventions) { factIndex.set(i.id, i); for (const f of i.facts) factIndex.set(f.id, f); }
  for (const c of practice.cases) {
    const f = factIndex.get(c.fact); assert.ok(f, `unknown fact ${c.fact}`);
    assert.equal(c.claim_en, f.claim, `${c.fact}: English claim drifted from the catalogue`);
    assert.equal(c.caveat_en ?? null, f.caveat ?? null, `${c.fact}: caveat drifted`);
    assert.ok(practice.scopes[c.scope]);
  }
  const byId = new Map(charter.indicators.map(i => [i.id, i]));
  for (const m of measurements.indicators) {
    const i = byId.get(m.id); assert.ok(i, `unknown indicator ${m.id}`);
    assert.equal(m.desirable.en, i.north_star); assert.equal(m.actual.en, i.basel.detail);
    assert.equal(m.proxy?.en ?? null, i.fill?.method ?? null, `${m.id}: proxy pin`);
    assert.equal(m.ask?.en ?? null, i.ask ?? null, `${m.id}: ask pin`);
    for (const field of ['question', 'why', 'supports', 'cannot', 'next_action', 'monitoring']) assert.ok(m[field].de && m[field].en, `${m.id}.${field}`);
  }
  for (const cell of concept.cells) {
    for (const id of cell.indicators) { assert.ok(byId.has(id), `concept indicator ${id}`); assert.ok(concept.indicator_names[id], `no name for ${id}`); assert.equal(concept.indicator_names[id].en, byId.get(id).name); }
    for (const id of cell.interventions) assert.ok(facts.interventions.some(i => i.id === id), `concept intervention ${id}`);
    for (const id of cell.facts ?? []) assert.ok(practice.cases.some(c => c.fact === id), `concept fact ${id}`);
  }
  assert.equal(concept.cells.length, concept.situations.length * concept.mechanisms.length);
});

test('Unknown stays unknown: missing and restricted evidence is never presented as observed', () => {
  for (const lang of ['de', 'en']) for (const m of measurements.indicators) {
    const status = charter.indicators.find(i => i.id === m.id).basel.status;
    const html = measureView({ lang, ui: ui(lang), content: { ...content, measureSel: m.id } });
    const actual = html.split(ui(lang)('m_actual'))[1].split(ui(lang)('m_supports'))[0];
    if (status === 'missing' || status === 'restricted') { assert.match(actual, /chip unknown/); assert.doesNotMatch(actual, /chip observed/, `${m.id} presented as observed`); }
    else assert.match(actual, /chip observed/);
    const proxyFill = charter.indicators.find(i => i.id === m.id).fill;
    if (proxyFill?.status === 'proposed') assert.match(html, /chip assumed/);
    if (proxyFill?.status === 'none') assert.match(html, /chip unknown/);
    assert.ok(!/\[(de|en)[?:]/.test(html), `missing translation marker in ${m.id}/${lang}`);
  }
});

test('City profiles are valid, source-pinned and keep unknown evidence distinct from "not measured"', () => {
  assert.equal(cities.length, 3);
  assert.equal(cities.filter(c => c.role === 'home').length, 1);
  for (const p of cities) {
    assert.deepEqual(validateProfile(p), []);
    assert.ok(p.entries.length >= 14, `${p.id} too thin`);
    for (const e of p.entries) {
      if (e.evidence_state === 'no_public_evidence_found') { assert.equal(e.origin, 'unknown'); assert.deepEqual(e.sources.every(s => s.url) , true); assert.doesNotMatch(e.text.en, /\bnot measured\b/i, `${e.id}: must not claim "not measured"`); }
      if (e.scope === 'project') assert.doesNotMatch(e.text.en, /(?<!not a )\bcity-wide\b/i, `${e.id}: project example phrased as city-wide`);
    }
    assert.ok(p.entries.some(e => e.evidence_state === 'no_public_evidence_found'), `${p.id} should record at least one searched gap`);
  }
  assert.ok(cities.some(c => c.id !== 'basel' && c.role === 'comparator'));
});

test('Comparable versus incompatible measures are decided by exact quantity, unit, method and scale', () => {
  const m = { quantity: 'sealed share', unit: '%', method: 'cadastre', spatial_scale: 'canton' };
  assert.equal(compareMeasures(m, { ...m, unit: 'percent' }).comparable, true);
  const other = compareMeasures(m, { ...m, method: 'satellite', spatial_scale: 'block' });
  assert.equal(other.comparable, false); assert.deepEqual(other.differs, ['method', 'spatial_scale']);
  assert.equal(compareMeasures(m, { ...m, quantity: '' }).comparable, false);
  const pairs = measurePairs(cities);
  assert.ok(pairs.length >= 1);
  const sealing = pairs.find(p => p.topic === 'sealing');
  assert.ok(sealing && !sealing.comparable, 'Basel and Berlin sealing figures use different methods and scales');
  for (const lang of ['de', 'en']) {
    const html = citiesView({ lang, ui: ui(lang), content });
    assert.match(html, new RegExp(ui(lang)('not_comparable')));
    assert.doesNotMatch(html, /\b(ranking|score|best)\b:/i);
    assert.ok(!/\[(de|en)[?:]/.test(html));
  }
});

test('Every delivered journey view renders without a missing-translation marker in both languages', () => {
  for (const lang of ['de', 'en']) {
    const ctx = { lang, ui: ui(lang), content };
    const views = [conceptView(ctx), practiceView(ctx), citiesView(ctx)];
    for (const s of concept.situations) views.push(conceptView({ ...ctx, content: { ...content, conceptSituation: s.id } }));
    for (const scope of Object.keys(practice.scopes)) views.push(practiceView({ ...ctx, content: { ...content, practiceFilter: scope } }));
    for (const d of DIMENSIONS) views.push(citiesView({ ...ctx, content: { ...content, cityDim: d } }));
    for (const place of places) views.push(exportView({ lang, ui: ui(lang), place, record: { unresolved: localizeRecord(place, lang, overlay).unresolved }, refGaps: referenceGaps(content, lang) }));
    for (const html of views) assert.ok(!/\[(de|en)[?:]/.test(html), `marker found (${lang})`);
  }
  assert.ok(manifest.modules.every(m => m.label.de && m.label.en && m.question.de && m.boundary.de));
});

test('German place overlay covers every claim of both places and the human-readable export is localized', () => {
  assert.ok(overlay, 'journey/content/place-de.json is required');
  for (const place of places) {
    const o = overlay.places[place.key]; assert.ok(o, `overlay for ${place.key}`);
    for (const c of place.profile.claims) {
      const t = o.claims[c.id]; assert.ok(t, `${place.key}/${c.id} untranslated`);
      for (const f of ['title', 'method', 'limitation']) if (c[f]) assert.ok(t[f]?.trim(), `${place.key}/${c.id}.${f}`);
      if (c.evidence_class === 'unknown') for (const f of ['unlock_action', 'decision_blocked']) assert.ok(t[f]?.trim(), `${place.key}/${c.id}.${f}`);
    }
    assert.ok(o.site.boundary && o.site.identity_status);
    assert.ok(!/ß/.test(JSON.stringify(o)));
  }
});

test('Exports stay in one place context, are bilingual, keep stable IDs, and carry no synthetic Street Lab inputs', () => {
  const [kanon, kly] = [places.find(p => p.key === 'kanonengasse'), places.find(p => p.key === 'klybeck')];
  const klyOnly = kly.profile.claims.map(c => c.id).filter(id => !kanon.profile.claims.some(c => c.id === id));
  assert.ok(klyOnly.length >= 5);
  for (const lang of ['de', 'en']) {
    const { scope_note, ...exported } = exportJson(kanon, lang, content, overlay);
    assert.ok(scope_note);
    const json = JSON.stringify(exported);
    const md = exportMarkdown(kanon, lang, content, ui(lang), overlay);
    for (const text of [json, md]) {
      assert.ok(!text.includes(kly.profile.site.id), 'Klybeck place id leaked');
      for (const id of klyOnly) assert.ok(!text.includes(id), `Klybeck claim ${id} leaked`);
      assert.ok(!/footprint_m2|synthetic|createDemoStreet|Street Lab parameters/i.test(text.replace(/synthetischen Strasse im Strassenlabor|synthetic street in Street Lab/g, '')), 'synthetic Street Lab input leaked');
    }
    for (const c of kanon.profile.claims.filter(c => c.evidence_class === 'unknown')) assert.ok(md.includes(`\`${c.id}\``), `stable id ${c.id} missing in report`);
    assert.ok(md.includes(kanon.sha256));
    assert.ok(md.includes(ui(lang)('md_status_value')));
    assert.equal(exported.engineering_recommendation, false);
    assert.equal(exported.language, lang);
    assert.ok(!/ß/.test(md) || lang === 'en');
  }
  const de = exportMarkdown(kanon, 'de', content, ui('de'), overlay);
  const en = exportMarkdown(kanon, 'en', content, ui('en'), overlay);
  assert.notEqual(de, en);
  assert.match(de, /Offene Prüfungen/); assert.match(en, /Unresolved checks/);
  const klyMd = exportMarkdown(kly, 'de', content, ui('de'), overlay);
  assert.ok(!klyMd.includes(kanon.profile.site.id));
});

test('The selected language travels to every embedded module', () => {
  for (const place of places) for (const m of manifest.modules.filter(m => m.path)) {
    for (const lang of ['de', 'en']) assert.equal(new URL(moduleUrl(m, place, lang), 'https://example.test/').searchParams.get('lang'), lang, m.id);
  }
});
