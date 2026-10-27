// Entry page: three doors into the same journey: a city, a question, an intervention.
import { pick } from './i18n.mjs';
import { esc } from './views.mjs';

export const QUESTIONS = [
  { id: 'q_what', stage: 'concept' }, { id: 'q_measure', stage: 'measure' }, { id: 'q_known', stage: 'map' },
  { id: 'q_support', stage: 'measure' }, { id: 'q_learn', stage: 'cities' }, { id: 'q_next', stage: 'export' },
];

// Interventions that appear in the concept matrix, with the first situation where they matter.
export function interventionEntries(content, lang) {
  const names = new Map(content.facts.interventions.map(i => [i.id, lang === 'de' ? i.de ?? i.name : i.name]));
  const out = new Map();
  for (const cell of content.concept.cells) for (const id of cell.interventions ?? []) {
    if (!names.has(id)) continue;
    if (!out.has(id)) out.set(id, { id, name: names.get(id), situation: cell.situation, mechanisms: new Set() });
    out.get(id).mechanisms.add(cell.mechanism);
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, lang));
}

export function startView({ lang, ui, content, packs }) {
  const cities = content.cities;
  const hasMap = id => !!packs[id];
  const iv = interventionEntries(content, lang);
  const mech = id => pick(content.concept.mechanisms.find(m => m.id === id).label, lang);
  return `<div class="view start"><p class="lead">${esc(ui('start_lead'))}</p>
    <div class="doors">
      <section aria-labelledby="door-city"><h3 id="door-city">${esc(ui('start_city'))}</h3><p class="muted small">${esc(ui('start_city_hint'))}</p>
        <ul class="door-list">${cities.map(c => `<li><button data-go-city="${esc(c.id)}" ${hasMap(c.id) ? '' : 'disabled'}><strong>${esc(pick(c.name, lang))}</strong><span class="small muted">${esc(pick(c.selection.contrast, lang))}</span></button></li>`).join('')}</ul></section>
      <section aria-labelledby="door-q"><h3 id="door-q">${esc(ui('start_question'))}</h3><p class="muted small">${esc(ui('start_question_hint'))}</p>
        <ul class="door-list">${QUESTIONS.map(q => `<li><button data-go-stage="${q.stage}" data-q="${q.id}"><strong>${esc(ui(q.id))}</strong><span class="small muted">→ ${esc(ui('start_to_' + q.stage))}</span></button></li>`).join('')}</ul></section>
      <section aria-labelledby="door-iv"><h3 id="door-iv">${esc(ui('start_intervention'))}</h3><p class="muted small">${esc(ui('start_intervention_hint'))}</p>
        <ul class="door-list compact">${iv.map(i => `<li><button data-go-intervention="${esc(i.id)}" data-sit="${esc(i.situation)}"><strong>${esc(i.name)}</strong><span class="small muted">${[...i.mechanisms].map(mech).map(esc).join(' · ')}</span></button></li>`).join('')}</ul></section>
    </div>
    <p class="boundary">${esc(ui('start_boundary'))}</p></div>`;
}
