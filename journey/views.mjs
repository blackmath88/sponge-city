// Native, bilingual journey views. Each view is a pure function: (state) → HTML string.
// Content comes from data files; nothing here invents a fact, score or measurement.
import { pick } from './i18n.mjs';
import { DIMENSIONS, entriesFor, measurePairs } from './cities.mjs';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (text, kind = '') => `<span class="chip ${esc(kind)}">${esc(text)}</span>`;
const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} ↗</a>`;
const factIndex = facts => { const m = new Map(facts.context.map(f => [f.id, f])); for (const i of facts.interventions) { m.set(i.id, { ...i, intervention: true }); for (const f of i.facts) m.set(f.id, f); } return m; };


// Schematic street section. No numbers, no real place: it shows where each mechanism acts. Elements carry class m-<mechanism>.
export function conceptDiagram({ lang, ui, situation, focus }) {
  const on = id => (!focus ? 'on' : focus === id ? 'on focus' : 'dim');
  const ambient = situation === 'heavy-rain'
    ? `<g class="amb">${[60, 130, 200, 270, 340, 410, 480, 550].map((x, i) => `<path d="M${x} ${20 + (i % 3) * 14}l-6 16" class="drop"/>`).join('')}</g>`
    : situation === 'heat'
      ? `<g class="amb"><circle cx="590" cy="38" r="20" class="sun"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M${590 + Math.cos(a * Math.PI / 180) * 26} ${38 + Math.sin(a * Math.PI / 180) * 26}l${Math.cos(a * Math.PI / 180) * 10} ${Math.sin(a * Math.PI / 180) * 10}" class="ray"/>`).join('')}</g>`
      : `<g class="amb"><circle cx="590" cy="38" r="14" class="sun dry"/><path d="M60 236l14 8 10-10 12 12M300 240l12 6 8-8 14 10" class="crack"/></g>`;
  return `<figure class="mechdiagram" data-situation-shown="${esc(situation)}"><svg viewBox="0 0 640 300" role="img" aria-label="${esc(ui('diagram_aria'))}">
    <rect x="0" y="0" width="640" height="300" class="d-sky"/>${ambient}
    <rect x="0" y="206" width="640" height="94" class="d-soil"/><rect x="0" y="196" width="640" height="10" class="d-paving"/>
    <g class="bld"><rect x="40" y="96" width="150" height="100" class="d-wall"/><rect x="34" y="88" width="162" height="10" class="d-roofbase"/></g>
    <g class="m-retention ${on('retention')}"><rect x="34" y="78" width="162" height="10" class="g-green"/><path d="M420 196q40 16 80 0" class="g-green fillish"/></g>
    <g class="m-shade ${on('shade')}"><ellipse cx="320" cy="100" rx="70" ry="44" class="g-tree"/><path d="M250 196h140l-30-14h-80z" class="g-shadow"/><rect x="316" y="120" width="8" height="76" class="d-trunk"/></g>
    <g class="m-evaporation ${on('evaporation')}">${[300, 320, 340].map(x => `<path d="M${x} 66q-6-10 0-20t0-20" class="g-vapour"/>`).join('')}${[60, 110, 150].map(x => `<path d="M${x} 70q-6-8 0-16t0-16" class="g-vapour"/>`).join('')}</g>
    <g class="m-infiltration ${on('infiltration')}"><path d="M440 200v44M458 200v52M476 200v40" class="g-flow"/><path d="M436 244l4 8 4-8M454 252l4 8 4-8M472 240l4 8 4-8" class="g-flow"/></g>
    <g class="m-storage ${on('storage')}"><rect x="270" y="222" width="100" height="40" rx="4" class="g-store"/><path d="M286 242h68" class="g-store-line"/></g>
    <g class="pipe"><rect x="0" y="272" width="640" height="10" class="d-pipe"/></g>
    <text x="14" y="296" class="d-label">${esc(ui('diagram_pipe'))}</text>
  </svg>
  <figcaption class="small muted">${esc(ui('diagram_caption'))}</figcaption></figure>`;
}

export function conceptView({ lang, ui, content }) {
  const { concept, facts } = content;
  const idx = factIndex(facts);
  const s = content.conceptSituation ?? concept.situations[0].id;
  const situation = concept.situations.find(x => x.id === s);
  const nameOf = id => { const i = idx.get(id); return i ? (lang === 'de' ? i.de ?? i.name : i.name) : id; };
  const cards = concept.cells.filter(c => c.situation === s).map(c => {
    const mech = concept.mechanisms.find(m => m.id === c.mechanism);
    const facts = (c.facts ?? []).map(id => content.practice.cases.find(p => p.fact === id)).filter(Boolean);
    const hl = content.conceptFocus && c.interventions.includes(content.conceptFocus);
    return `<article class="mech${hl ? ' hl' : ''}${content.mechFocus === c.mechanism ? ' focus' : ''}" data-mechanism="${esc(c.mechanism)}"><h4><button class="mech-btn" data-mech="${esc(c.mechanism)}" aria-pressed="${content.mechFocus === c.mechanism}" title="${esc(ui('diagram_focus'))}">${esc(pick(mech.label, lang))}</button></h4><p class="muted">${esc(pick(mech.what, lang))}</p><p>${esc(pick(c.text, lang))}</p>
      <p class="small"><strong>${esc(ui('interventions'))}:</strong> ${c.interventions.map(id => esc(nameOf(id))).join(' · ') || esc(ui('none_listed'))}</p>
      <p class="small"><strong>${esc(ui('needs_evidence'))}:</strong> ${c.indicators.map(id => esc(indNameLocal(content, id, lang))).join(' · ') || esc(ui('none_listed'))}</p>
      ${facts.map(f => `<p class="small example"><strong>${esc(ui('example'))}:</strong> ${esc(lang === 'de' ? f.claim_de : f.claim_en)}</p>`).join('')}</article>`;
  }).join('');
  return `<div class="view concept"><h3>${esc(ui('matrix_title'))}</h3><p class="muted">${esc(ui('matrix_hint'))}</p>
    <div class="seg" role="group" aria-label="${esc(ui('situation'))}">${concept.situations.map(x => `<button data-situation="${esc(x.id)}" aria-pressed="${x.id === s}">${esc(pick(x.label, lang))}</button>`).join('')}</div>
    ${content.conceptFocus ? `<p class="small focus" data-focus="${esc(content.conceptFocus)}">${esc(ui('concept_focus').replace('{name}', nameOf(content.conceptFocus)))} <button data-clear-focus>×</button></p>` : ''}<p class="lead">${esc(pick(situation.question, lang))}</p>${conceptDiagram({ lang, ui, situation: s, focus: content.mechFocus })}<div class="cards">${cards}</div>
    <h3>${esc(pick(concept.chain.title, lang))}</h3><ol class="chain">${concept.chain.steps.map(x => `<li>${esc(pick(x, lang))}</li>`).join('')}</ol>
    <p class="boundary">${esc(pick(concept.boundary, lang))}</p></div>`;
}
// Indicator names are only translated where the measurement view carries a translation; otherwise the source name stays.
export const indNameLocal = (content, id, lang) => pick(content.concept.indicator_names?.[id] ?? id, lang);

// Verification record for one claim (data/verification/basel-claims.json). Evidence and limits are shown in the active language when a translation exists.
export function verificationBlock({ lang, ui, content }, id) {
  const c = content.checks?.claims?.find(x => x.id === id); if (!c) return '';
  const de = lang === 'de' ? content.checksDe?.claims?.[id] : null;
  const cls = c.verdict === 'confirmed' ? 'observed' : c.verdict === 'confirmed-with-difference' ? 'partial' : 'unknown';
  const limit = de?.verification_limit_de ?? c.verification_limit, evidence = de?.evidence_de ?? c.evidence;
  const untranslated = lang === 'de' && !de;
  return `<details class="verify" data-verdict="${esc(c.verdict)}"><summary class="small">${chip(ui('ver_' + c.verdict), cls)} ${chip(ui('ct_' + c.claim_type))} <span class="muted">${esc(ui('ver_checked'))} ${esc(c.retrieved_on)}</span></summary>
    <p class="small"><strong>${esc(ui('ver_evidence'))}:</strong> <span ${untranslated ? 'lang="en"' : ''}>${esc(evidence)}</span></p>
    ${limit ? `<p class="small"><strong>${esc(ui('ver_limit'))}:</strong> <span ${untranslated ? 'lang="en"' : ''}>${esc(limit)}</span></p>` : ''}
    ${untranslated ? `<p class="small muted">${esc(ui('ver_english'))}</p>` : ''}<p class="small">${link(c.source_url, ui('source'))}</p></details>`;
}

export function practiceView({ lang, ui, content }) {
  const { practice } = content;
  const idx = factIndex(content.facts);
  const filter = content.practiceFilter ?? 'all';
  const cases = practice.cases.filter(c => filter === 'all' || c.scope === filter);
  const mechLabel = id => pick(content.concept.mechanisms.find(m => m.id === id)?.label ?? id, lang);
  return `<div class="view practice"><div class="seg" role="group" aria-label="${esc(ui('filter_scope'))}"><button data-filter="all" aria-pressed="${filter === 'all'}">${esc(ui('all'))}</button>${Object.keys(practice.scopes).map(k => `<button data-filter="${esc(k)}" aria-pressed="${filter === k}">${esc(pick(practice.scopes[k], lang))}</button>`).join('')}</div>
    <div class="cards">${cases.map(c => { const f = idx.get(c.fact); const cav = lang === 'de' ? c.caveat_de : c.caveat_en; return `<article class="case" data-fact="${esc(c.fact)}"><p class="eyebrow">${esc(pick(practice.scopes[c.scope], lang))} · ${esc(ui('ev_' + f.evidence))}</p><h4>${esc(pick(c.lesson, lang))}</h4><p>${esc(lang === 'de' ? c.claim_de : c.claim_en)}</p>
      ${cav ? `<p class="small"><strong>${esc(ui('caveat'))}:</strong> ${esc(cav)}</p>` : ''}${(lang === 'de' ? c.status_note_de : c.status_note_en) ? `<p class="small" data-status-note><strong>${esc(ui('status_note'))}:</strong> ${esc(lang === 'de' ? c.status_note_de : c.status_note_en)}</p>` : ''}${verificationBlock({ lang, ui, content }, c.fact)}<p class="small">${esc(ui('mechanisms'))}: ${c.mechanisms.map(mechLabel).map(esc).join(' · ')}<br>${esc(ui('source'))}: ${link(f.source.url, f.source.label)}</p></article>`; }).join('')}</div><p class="small muted">${esc(ui('source_note'))}</p></div>`;
}

const clsOf = { open: 'observed', partial: 'partial', restricted: 'unknown', missing: 'unknown' };
const fillCls = { run: 'derived', proposed: 'assumed', none: 'unknown' };
export function measureView({ lang, ui, content }) {
  const byId = new Map(content.charter.indicators.map(i => [i.id, i]));
  const sel = content.measureSel ?? content.measurements.indicators[0].id;
  const m = content.measurements.indicators.find(x => x.id === sel);
  const ch = byId.get(sel);
  const status = ch.basel.status;
  const t = x => esc(pick(x, lang));
  const step = (n, label, body) => `<li class="dstep" data-step="${n}"><span class="dnum" aria-hidden="true">${n}</span><div><h5>${esc(label)}</h5><p>${body}</p></div></li>`;
  const row = (content.matrix?.indicators ?? []).find(i => i.featured_indicator === sel);
  const elsewhere = row ? `<details class="elsewhere"><summary class="small">${esc(ui('m_elsewhere'))}</summary><ul class="small">${content.cities.map(c => { const cell = content.matrix.cells[row.id]?.[c.id]; return cell ? `<li data-elsewhere="${esc(c.id)}"><strong>${esc(pick(c.name, lang))}:</strong> ${esc(ui('ex_' + cell.state.exists))} · ${esc(ui('cls_' + cell.state.basis))} · ${esc(ui('ac_' + cell.state.access))} — ${esc(pick(cell.note, lang))}</li>` : ''; }).join('')}</ul></details>` : '';
  const mapLayers = Object.entries(content.packs ?? {}).flatMap(([city, pack]) => pack.layers.filter(l => l.measure_topic === sel).map(l => ({ city, l })));
  const onMap = mapLayers.length ? `<br><span class="small">${esc(ui('m_on_map'))}: ${mapLayers.map(({ city, l }) => `<a href="#" data-map-layer="${esc(city)}:${esc(l.id)}">${esc(pick(content.cities.find(c => c.id === city).name, lang))} · ${esc(pick(l.title, lang))} →</a>`).join(' · ')}</span>` : '';
  const srcs = ch.basel.sources.map(s => link(s.url, s.label)).join(' · ') || esc(ui('none_listed'));
  return `<div class="view measure"><h3>${esc(ui('m_title'))}</h3><p class="muted">${esc(ui('m_lead'))}</p>
    <div class="seg wrap" role="group">${content.measurements.indicators.map(x => `<button data-indicator="${esc(x.id)}" aria-pressed="${x.id === sel}">${esc(pick(x.question, lang))}</button>`).join('')}</div>
    <article class="indicator" data-indicator-id="${esc(sel)}"><p class="eyebrow">${esc(sel)}</p><h4>${t(m.question)}</h4><p class="muted">${t(m.why)}</p>
    <ol class="dchain">
      ${step(1, ui('ch_question'), t(m.question))}
      ${step(2, ui('ch_needed'), `${esc(pick(m.desirable, lang))}<br>${m.proxy ? `<span class="small">${esc(ui('m_proxy'))}: ${chip(ui('fill_' + ch.fill.status), fillCls[ch.fill.status])} ${esc(pick(m.proxy, lang))}</span>` : `<span class="small">${esc(ui('m_no_proxy'))}</span>`}`)}
      ${step(3, ui('ch_available'), `${chip(ui('status_' + status), clsOf[status])}${status === 'partial' ? '' : ' ' + chip(ui('cls_' + clsOf[status]), clsOf[status])}<br>${esc(pick(m.actual, lang))}<br><span class="small">${esc(ui('m_sources'))}: ${srcs}</span><br><span class="small muted">${esc(ui('m_scale'))}</span>${elsewhere}${onMap}${verificationBlock({ lang, ui, content }, 'measurement:' + sel)}`)}
      ${step(4, ui('ch_analysis'), `<strong>${esc(ui('m_supports'))}:</strong> ${t(m.supports)}<br><strong>${esc(ui('m_cannot'))}:</strong> ${t(m.cannot)}`)}
      ${step(5, ui('ch_action'), `${t(m.next_action)}${m.ask ? `<br><span class="small">${esc(ui('m_ask'))}: ${esc(pick(m.ask, lang))}</span>` : ''}`)}
      ${step(6, ui('ch_monitor'), t(m.monitoring))}
    </ol></article><p class="small muted">${esc(ui('charter_updated'))}: ${esc(content.charter.updated)} · ${esc(ui('cls_observed'))} / ${esc(ui('cls_derived'))} / ${esc(ui('cls_modelled'))} / ${esc(ui('cls_assumed'))} / ${esc(ui('cls_unknown'))}</p></div>`;
}

const entryCard = (e, lang, ui) => `<article class="entry" data-entry="${esc(e.id)}"><p class="eyebrow">${chip(ui('sc_' + e.scope), 'scope-' + e.scope)} ${chip(ui('cls_' + e.origin), e.origin)} ${e.evidence_state !== 'found' ? chip(ui('st_' + e.evidence_state), 'state-' + e.evidence_state) : ''}</p><p>${esc(pick(e.text, lang))}</p>
  ${e.measure ? `<p class="small"><em>${esc(ui('measure_def'))}:</em> <strong>${esc(e.measure.quantity)}</strong> · ${esc(e.measure.unit)} · ${esc(e.measure.method)} · ${esc(e.measure.spatial_scale)}${e.measure.period ? ' · ' + esc(e.measure.period) : ''}</p>` : ''}
  ${(e.sources ?? []).map(s => `<details><summary>${esc(s.title)}</summary><p class="small">${link(s.url, s.publisher || s.url)} · ${esc(ui('retrieved'))} ${esc(s.retrieved)}</p><blockquote lang="${esc(s.quote_lang || 'en')}">${esc(s.quote)}</blockquote></details>`).join('')}</article>`;

export function matrixView({ lang, ui, content }) {
  const m = content.matrix; if (!m) return '';
  const name = id => pick(content.cities.find(c => c.id === id).name, lang);
  const ids = content.cities.map(c => c.id);
  const cell = (ind, id) => { const c = m.cells[ind.id]?.[id]; if (!c) return '<td>—</td>';
    const s = c.state;
    return `<td data-cell="${esc(ind.id)}.${esc(id)}"><p class="eyebrow">${chip(ui('ex_' + s.exists), s.exists === 'yes' ? 'observed' : s.exists === 'partial' ? 'partial' : 'unknown')} ${s.basis !== 'unknown' ? chip(ui('cls_' + s.basis), s.basis) : chip(ui('cls_unknown'), 'unknown')}</p>
      <p class="small">${esc(ui('mx_access'))}: ${esc(ui('ac_' + s.access))} · ${esc(ui('mx_derivable'))}: ${esc(ui('dv_' + s.derivable))}</p>
      <p class="small">${esc(ui('mx_needs'))}: ${c.needs.length ? c.needs.map(n => esc(ui('need_' + n))).join(', ') : esc(ui('mx_none'))}</p>
      <details><summary class="small">${esc(ui('mx_refs'))}</summary><p class="small">${esc(pick(c.note, lang))}</p><p class="small muted">${[...c.entries, ...c.layers].map(esc).join(' · ') || '—'}</p></details></td>`; };
  return `<h3>${esc(ui('mx_title'))}</h3><p class="muted">${esc(ui('mx_lead'))}</p><div class="scroll"><table class="matrix"><thead><tr><th></th>${ids.map(id => `<th scope="col">${esc(name(id))}</th>`).join('')}</tr></thead><tbody>
    ${m.indicators.map(ind => `<tr data-indicator-row="${esc(ind.id)}"><th scope="row">${esc(pick(ind.label, lang))}<br><span class="small muted">${esc(pick(ind.question, lang))}</span></th>${ids.map(id => cell(ind, id)).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="small muted">${esc(ui('mx_reviewed'))}</p>`;
}

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
    ${matrixView({ lang, ui, content })}
    ${content.citiesNote ? `<p class="small muted">${esc(pick(content.citiesNote, lang))}</p>` : ''}</div>`;
}

export function exportView({ lang, ui, record, place, refGaps }) {
  return `<div class="view export"><h3>${esc(ui('x_title'))}</h3><p>${esc(ui('x_decision'))}</p><p class="small">${esc(ui('x_separate'))}</p>
    <p><button class="download" id="export-json">${esc(ui('x_download_json'))}</button> <button class="download" id="export-md">${esc(ui('x_download_md'))}</button></p>
    ${record.unresolved.map(g => `<article class="gate" data-gate="${esc(g.id)}"><h4>${esc(g.question)}</h4><dl><dt>${esc(ui('x_evidence'))}</dt><dd>${esc(ui('x_unknown'))} · ${esc(g.access_state)}</dd><dt>${esc(ui('x_who'))}</dt><dd>${esc(g.gatekeeper)}</dd><dt>${esc(ui('x_action'))}</dt><dd>${esc(g.next_action)}</dd><dt>${esc(ui('x_blocks'))}</dt><dd>${esc(g.blocks)}</dd></dl></article>`).join('')}
    <h3>${esc(ui('x_ref'))}</h3><ul class="small">${refGaps.map(g => `<li data-indicator-id="${esc(g.id)}"><strong>${esc(g.name)}</strong> — ${esc(g.next_action)}</li>`).join('')}</ul><p class="small muted">${esc(ui('x_nothing'))}</p></div>`;
}
