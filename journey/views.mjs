// Native, bilingual journey views. Each view is a pure function: (state) → HTML string.
// Content comes from data files; nothing here invents a fact, score or measurement.
import { pick } from './i18n.mjs';
import { DIMENSIONS, entriesFor, measurePairs } from './cities.mjs';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (text, kind = '') => `<span class="chip ${esc(kind)}">${esc(text)}</span>`;
const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} ↗</a>`;
const factIndex = facts => { const m = new Map(facts.context.map(f => [f.id, f])); for (const i of facts.interventions) { m.set(i.id, { ...i, intervention: true }); for (const f of i.facts) m.set(f.id, f); } return m; };

export function conceptView({ lang, ui, content }) {
  const { concept, facts } = content;
  const idx = factIndex(facts);
  const s = content.conceptSituation ?? concept.situations[0].id;
  const situation = concept.situations.find(x => x.id === s);
  const nameOf = id => { const i = idx.get(id); return i ? (lang === 'de' ? i.de ?? i.name : i.name) : id; };
  const cards = concept.cells.filter(c => c.situation === s).map(c => {
    const mech = concept.mechanisms.find(m => m.id === c.mechanism);
    const facts = (c.facts ?? []).map(id => content.practice.cases.find(p => p.fact === id)).filter(Boolean);
    return `<article class="mech" data-mechanism="${esc(c.mechanism)}"><h4>${esc(pick(mech.label, lang))}</h4><p class="muted">${esc(pick(mech.what, lang))}</p><p>${esc(pick(c.text, lang))}</p>
      <p class="small"><strong>${esc(ui('interventions'))}:</strong> ${c.interventions.map(id => esc(nameOf(id))).join(' · ') || esc(ui('none_listed'))}</p>
      <p class="small"><strong>${esc(ui('needs_evidence'))}:</strong> ${c.indicators.map(id => esc(indNameLocal(content, id, lang))).join(' · ') || esc(ui('none_listed'))}</p>
      ${facts.map(f => `<p class="small example"><strong>${esc(ui('example'))}:</strong> ${esc(lang === 'de' ? f.claim_de : f.claim_en)}</p>`).join('')}</article>`;
  }).join('');
  return `<div class="view concept"><h3>${esc(ui('matrix_title'))}</h3><p class="muted">${esc(ui('matrix_hint'))}</p>
    <div class="seg" role="group" aria-label="${esc(ui('situation'))}">${concept.situations.map(x => `<button data-situation="${esc(x.id)}" aria-pressed="${x.id === s}">${esc(pick(x.label, lang))}</button>`).join('')}</div>
    <p class="lead">${esc(pick(situation.question, lang))}</p><div class="cards">${cards}</div>
    <h3>${esc(pick(concept.chain.title, lang))}</h3><ol class="chain">${concept.chain.steps.map(x => `<li>${esc(pick(x, lang))}</li>`).join('')}</ol>
    <p class="boundary">${esc(pick(concept.boundary, lang))}</p></div>`;
}
// Indicator names are only translated where the measurement view carries a translation; otherwise the source name stays.
export const indNameLocal = (content, id, lang) => pick(content.concept.indicator_names?.[id] ?? id, lang);

export function practiceView({ lang, ui, content }) {
  const { practice } = content;
  const idx = factIndex(content.facts);
  const filter = content.practiceFilter ?? 'all';
  const cases = practice.cases.filter(c => filter === 'all' || c.scope === filter);
  const mechLabel = id => pick(content.concept.mechanisms.find(m => m.id === id)?.label ?? id, lang);
  return `<div class="view practice"><div class="seg" role="group" aria-label="${esc(ui('filter_scope'))}"><button data-filter="all" aria-pressed="${filter === 'all'}">${esc(ui('all'))}</button>${Object.keys(practice.scopes).map(k => `<button data-filter="${esc(k)}" aria-pressed="${filter === k}">${esc(pick(practice.scopes[k], lang))}</button>`).join('')}</div>
    <div class="cards">${cases.map(c => { const f = idx.get(c.fact); const cav = lang === 'de' ? c.caveat_de : c.caveat_en; return `<article class="case" data-fact="${esc(c.fact)}"><p class="eyebrow">${esc(pick(practice.scopes[c.scope], lang))} · ${esc(ui('ev_' + f.evidence))}</p><h4>${esc(pick(c.lesson, lang))}</h4><p>${esc(lang === 'de' ? c.claim_de : c.claim_en)}</p>
      ${cav ? `<p class="small"><strong>${esc(ui('caveat'))}:</strong> ${esc(cav)}</p>` : ''}<p class="small">${esc(ui('mechanisms'))}: ${c.mechanisms.map(mechLabel).map(esc).join(' · ')}<br>${esc(ui('source'))}: ${link(f.source.url, f.source.label)}</p></article>`; }).join('')}</div><p class="small muted">${esc(ui('source_note'))}</p></div>`;
}

const clsOf = { open: 'observed', partial: 'observed', restricted: 'unknown', missing: 'unknown' };
const fillCls = { run: 'derived', proposed: 'assumed', none: 'unknown' };
export function measureView({ lang, ui, content }) {
  const byId = new Map(content.charter.indicators.map(i => [i.id, i]));
  const sel = content.measureSel ?? content.measurements.indicators[0].id;
  const m = content.measurements.indicators.find(x => x.id === sel);
  const ch = byId.get(sel);
  const status = ch.basel.status;
  const t = x => esc(pick(x, lang));
  const section = (label, body) => `<div class="field"><dt>${esc(label)}</dt><dd>${body}</dd></div>`;
  const srcs = ch.basel.sources.map(s => link(s.url, s.label)).join(' · ') || esc(ui('none_listed'));
  return `<div class="view measure"><h3>${esc(ui('m_title'))}</h3><p class="muted">${esc(ui('m_lead'))}</p>
    <div class="seg wrap" role="group">${content.measurements.indicators.map(x => `<button data-indicator="${esc(x.id)}" aria-pressed="${x.id === sel}">${esc(pick(x.question, lang))}</button>`).join('')}</div>
    <article class="indicator" data-indicator-id="${esc(sel)}"><p class="eyebrow">${esc(sel)}</p><h4>${t(m.question)}</h4><dl>
      ${section(ui('m_why'), t(m.why))}
      ${section(ui('m_desirable'), `${esc(pick(m.desirable, lang))}`)}
      ${section(ui('m_proxy'), m.proxy ? `${chip(ui('fill_' + ch.fill.status), fillCls[ch.fill.status])} ${esc(pick(m.proxy, lang))}<br><span class="small">${esc(pick(ch.fill.confidence ? { de: 'Vertrauen laut Quelle: ' + ch.fill.confidence + ' (englisch)', en: 'Confidence per source: ' + ch.fill.confidence } : '', lang))}</span>` : esc(ui('m_no_proxy')))}
      ${section(ui('m_actual'), `${chip(ui('status_' + status), clsOf[status])} ${chip(ui('cls_' + clsOf[status]), clsOf[status])}<br>${esc(pick(m.actual, lang))}<br><span class="small">${esc(ui('m_sources'))}: ${srcs}</span><br><span class="small muted">${esc(ui('m_scale'))}</span>`)}
      ${section(ui('m_supports'), t(m.supports))}
      ${section(ui('m_cannot'), t(m.cannot))}
      ${section(ui('m_next'), `${t(m.next_action)}${m.ask ? `<br><span class="small">${esc(ui('m_ask'))}: ${esc(pick(m.ask, lang))}</span>` : ''}`)}
      ${section(ui('m_monitor'), t(m.monitoring))}
    </dl></article><p class="small muted">${esc(ui('charter_updated'))}: ${esc(content.charter.updated)} · ${esc(ui('cls_observed'))} / ${esc(ui('cls_derived'))} / ${esc(ui('cls_modelled'))} / ${esc(ui('cls_assumed'))} / ${esc(ui('cls_unknown'))}</p></div>`;
}

const entryCard = (e, lang, ui) => `<article class="entry" data-entry="${esc(e.id)}"><p class="eyebrow">${chip(ui('sc_' + e.scope), 'scope-' + e.scope)} ${chip(ui('cls_' + e.origin), e.origin)} ${e.evidence_state !== 'found' ? chip(ui('st_' + e.evidence_state), 'state-' + e.evidence_state) : ''}</p><p>${esc(pick(e.text, lang))}</p>
  ${e.measure ? `<p class="small"><em>${esc(ui('measure_def'))}:</em> <strong>${esc(e.measure.quantity)}</strong> · ${esc(e.measure.unit)} · ${esc(e.measure.method)} · ${esc(e.measure.spatial_scale)}${e.measure.period ? ' · ' + esc(e.measure.period) : ''}</p>` : ''}
  ${(e.sources ?? []).map(s => `<details><summary>${esc(s.title)}</summary><p class="small">${link(s.url, s.publisher || s.url)} · ${esc(ui('retrieved'))} ${esc(s.retrieved)}</p><blockquote lang="${esc(s.quote_lang || 'en')}">${esc(s.quote)}</blockquote></details>`).join('')}</article>`;

export function citiesView({ lang, ui, content }) {
  const profiles = content.cities;
  const dimSel = content.cityDim ?? 'context';
  const pairs = measurePairs(profiles);
  const nm = id => pick(profiles.find(p => p.id === id).name, lang);
  const pairHtml = pairs.length ? pairs.map(p => `<li class="pair ${p.comparable ? 'ok' : 'no'}" data-topic="${esc(p.topic)}"><strong>${esc(p.topic)}</strong> · ${esc(nm(p.a.city))}: ${esc(p.a.entry.measure.quantity)} (${esc(p.a.entry.measure.unit)}) ↔ ${esc(nm(p.b.city))}: ${esc(p.b.entry.measure.quantity)} (${esc(p.b.entry.measure.unit)}) — ${chip(p.comparable ? ui('comparable') : ui('not_comparable'), p.comparable ? 'derived' : 'unknown')}${p.comparable ? '' : ` <span class="small">${esc(ui('differs_in'))}: ${p.differs.map(f => esc(ui('f_' + f))).join(', ')}</span>`}</li>`).join('') : `<li class="small">${esc(ui('no_measures'))}</li>`;
  return `<div class="view cities"><h3>${esc(ui('city_title'))}</h3><p class="muted">${esc(ui('city_lead'))}</p>
    <div class="profile-heads">${profiles.map(p => `<article class="phead"><h4>${esc(pick(p.name, lang))}</h4><p class="small"><strong>${esc(ui('city_selection'))}:</strong> ${esc(pick(p.selection.rationale, lang))}</p>${p.selection.contrast?.[lang] ? `<p class="small"><strong>${esc(ui('city_contrast'))}:</strong> ${esc(pick(p.selection.contrast, lang))}</p>` : ''}</article>`).join('')}</div>
    <div class="seg wrap" role="group">${DIMENSIONS.map(d => `<button data-dim="${d}" aria-pressed="${d === dimSel}">${esc(ui('dim_' + d))}</button>`).join('')}</div>
    <div class="compare" style="--cols:${profiles.length}">${profiles.map(p => `<section aria-label="${esc(pick(p.name, lang))}"><h4>${esc(pick(p.name, lang))}</h4>${entriesFor(p, dimSel).map(e => entryCard(e, lang, ui)).join('') || `<p class="small muted">${esc(ui('st_unknown'))}</p>`}</section>`).join('')}</div>
    <h3>${esc(ui('measures_head'))}</h3><p class="muted">${esc(ui('measures_lead'))}</p><ul class="pairs">${pairHtml}</ul>
    ${content.citiesNote ? `<p class="small muted">${esc(pick(content.citiesNote, lang))}</p>` : ''}</div>`;
}

export function exportView({ lang, ui, record, place, refGaps }) {
  return `<div class="view export"><h3>${esc(ui('x_title'))}</h3><p>${esc(ui('x_decision'))}</p><p class="small">${esc(ui('x_separate'))}</p>
    <p><button class="download" id="export-json">${esc(ui('x_download_json'))}</button> <button class="download" id="export-md">${esc(ui('x_download_md'))}</button></p>
    ${record.unresolved.map(g => `<article class="gate" data-gate="${esc(g.id)}"><h4>${esc(g.question)}</h4><dl><dt>${esc(ui('x_evidence'))}</dt><dd>${esc(ui('x_unknown'))} · ${esc(g.access_state)}</dd><dt>${esc(ui('x_who'))}</dt><dd>${esc(g.gatekeeper)}</dd><dt>${esc(ui('x_action'))}</dt><dd>${esc(g.next_action)}</dd><dt>${esc(ui('x_blocks'))}</dt><dd>${esc(g.blocks)}</dd></dl></article>`).join('')}
    <h3>${esc(ui('x_ref'))}</h3><ul class="small">${refGaps.map(g => `<li data-indicator-id="${esc(g.id)}"><strong>${esc(g.name)}</strong> — ${esc(g.next_action)}</li>`).join('')}</ul><p class="small muted">${esc(ui('x_nothing'))}</p></div>`;
}
