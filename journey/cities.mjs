// Pure city-profile helpers shared by the page and the checks. No scores, no rankings.
import { pick } from './i18n.mjs';

export const DIMENSIONS = ['context', 'interventions', 'measurement', 'access', 'outcomes', 'transfer'];
export const ORIGINS = ['observed', 'derived', 'modelled', 'assumed', 'unknown'];
export const SCOPES = ['project', 'programme', 'city-wide', 'unspecified'];
export const STATES = ['found', 'no_public_evidence_found', 'unknown'];
export const COMPARE_FIELDS = ['quantity', 'unit', 'method', 'spatial_scale', 'period']; // time counts: equal units over different years are not comparable

const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(%|percent|prozent)$/, 'percent');

// Comparable only when every comparison field (including the period) matches exactly (after trimming and case folding).
export function compareMeasures(a, b) {
  const differs = COMPARE_FIELDS.filter(field => norm(a?.[field]) !== norm(b?.[field]) || !norm(a?.[field]));
  return { comparable: differs.length === 0, differs };
}

// Pair measures of different cities that address the same topic.
export function measurePairs(profiles) {
  const byTopic = new Map();
  for (const profile of profiles) {
    for (const entry of profile.entries) {
      if (!entry.measure?.topic) continue;
      if (!byTopic.has(entry.measure.topic)) byTopic.set(entry.measure.topic, []);
      byTopic.get(entry.measure.topic).push({ city: profile.id, entry });
    }
  }
  const pairs = [];
  for (const [topic, items] of byTopic) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].city === items[j].city) continue;
        pairs.push({ topic, a: items[i], b: items[j], ...compareMeasures(items[i].entry.measure, items[j].entry.measure) });
      }
    }
  }
  return pairs;
}

// Structural validation used by the build checks. Returns a list of problems.
export function validateProfile(profile) {
  const problems = [];
  const add = message => problems.push(`${profile.id}: ${message}`);
  if (profile.schema_version !== 'sponge-city-profile/1') add('schema_version');
  const ids = new Set();
  for (const entry of profile.entries ?? []) {
    const where = entry.id ?? '(no id)';
    if (!entry.id || !entry.id.startsWith(profile.id + '.')) add(`${where}: id must start with "${profile.id}."`);
    if (ids.has(entry.id)) add(`${where}: duplicate id`);
    ids.add(entry.id);
    if (!DIMENSIONS.includes(entry.dimension)) add(`${where}: dimension`);
    if (!ORIGINS.includes(entry.origin)) add(`${where}: origin`);
    if (!SCOPES.includes(entry.scope)) add(`${where}: scope`);
    if (!STATES.includes(entry.evidence_state)) add(`${where}: evidence_state`);
    for (const lang of ['de', 'en']) {
      if (!entry.text?.[lang]?.trim()) add(`${where}: text.${lang} empty`);
      if (/ß/.test(entry.text?.[lang] ?? '')) add(`${where}: ß in ${lang} text`);
    }
    if (entry.evidence_state === 'found') {
      if (!entry.sources?.length) add(`${where}: found without source`);
      for (const source of entry.sources ?? []) {
        if (!/^https?:\/\//.test(source.url ?? '') || !source.retrieved || !source.quote || !source.title) add(`${where}: source needs title, url, retrieved, quote`);
      }
    } else if (entry.origin !== 'unknown' && entry.evidence_state === 'no_public_evidence_found') {
      add(`${where}: no_public_evidence_found must have origin unknown`);
    }
    if (entry.dimension === 'transfer' && entry.origin === 'observed') add(`${where}: transfer cannot be observed`);
    if (entry.measure) {
      for (const field of COMPARE_FIELDS) if (!entry.measure[field]) add(`${where}: measure.${field} missing`);
      if (entry.evidence_state !== 'found') add(`${where}: measure requires found evidence`);
    }
    if (/\b(?:rank\w*|score\w*|best city|league)\b/i.test(entry.text?.en ?? '') || /\b(?:rangliste|spitzenreiter\w*|bestes? stadt|punktzahl|rangfolge)\b/i.test(entry.text?.de ?? '')) add(`${where}: ranking language`);
  }
  for (const dim of DIMENSIONS) if (!(profile.entries ?? []).some(e => e.dimension === dim)) add(`no entry for ${dim}`);
  return problems;
}

export const entriesFor = (profile, dimension) => profile.entries.filter(e => e.dimension === dimension);
export const cityName = (profile, lang) => pick(profile.name, lang);
