// Human-readable, localized investigation report. Stable IDs, source titles and quotations are never translated.
import { investigationRecord } from './context.mjs';
import { pick } from './i18n.mjs';

// Overlay lookup: German text for a profile field when available, English source text otherwise.
export function localizeClaim(claim, place, lang, overlay) {
  if (lang !== 'de') return claim;
  const o = overlay?.places?.[place.key]?.claims?.[claim.id];
  return o ? { ...claim, ...o } : claim;
}
export function localizeRecord(place, lang, overlay) {
  const record = investigationRecord(place);
  const claims = place.profile.claims.map(c => localizeClaim(c, place, lang, overlay));
  const byId = new Map(claims.map(c => [c.id, c]));
  const unresolved = record.unresolved.map(g => {
    const c = byId.get(g.id);
    return { id: g.id, question: c.title, access_state: g.access_state, gatekeeper: c.gatekeeper || g.gatekeeper, next_action: c.unlock_action, blocks: c.decision_blocked };
  });
  const site = lang === 'de' ? { ...place.profile.site, ...(overlay?.places?.[place.key]?.site ?? {}) } : place.profile.site;
  return { record, claims, unresolved, site };
}
// City-level reference gaps for the featured indicators that are missing or restricted. Not site-specific.
export function referenceGaps(content, lang) {
  return content.measurements.indicators.filter(m => {
    const status = content.charter.indicators.find(i => i.id === m.id).basel.status;
    return status === 'missing' || status === 'restricted' || m.id === 'infiltration';
  }).map(m => ({ id: m.id, name: pick(m.question, lang), next_action: pick(m.next_action, lang) }));
}
export function exportJson(place, lang, content, overlay) {
  const { record } = localizeRecord(place, lang, overlay);
  return { ...record, language: 'en', ui_language: lang, scope_note: 'Place claims describe only this place. Reference gaps are city-level and not site-specific. No Street Lab synthetic parameters or observations are included.',
    reference_gaps: content.measurements.indicators.map(m => ({ indicator_id: m.id, scope: 'city-level-reference', status: content.charter.indicators.find(i => i.id === m.id).basel.status })) };
}
export function exportMarkdown(place, lang, content, ui, overlay) {
  const { record, claims, unresolved, site } = localizeRecord(place, lang, overlay);
  const u = ui;
  const known = claims.filter(c => c.evidence_class !== 'unknown');
  const lines = [
    `# ${site.name} · ${u('x_title')}`, '',
    `**${u('md_status')}:** ${u('md_status_value')}`, '',
    `**${u('md_place')}:** ${site.name} (\`${place.profile.site.id}\`) · ${site.coordinates.join(' / ')}`,
    `**${u('md_snapshot')}:** ${record.snapshot}`,
    `**${u('md_sha')}:** \`${record.evidence_sha256}\``,
    '', `_${u('md_ids')}_`, '', `## ${u('md_known')}`, '',
    ...known.map(c => `- \`${c.id}\` · ${u('cls_' + c.evidence_class)} · ${c.title}: ${[c.value, c.unit].filter(Boolean).join(' ')}`),
    '', `## ${u('md_unresolved')}`, '',
    ...unresolved.flatMap(g => [`### ${g.question} (\`${g.id}\`)`, `- ${u('x_evidence')}: ${u('x_unknown')} · ${g.access_state}`, `- ${u('x_who')}: ${g.gatekeeper}`, `- ${u('x_action')}: ${g.next_action}`, `- ${u('x_blocks')}: ${g.blocks}`, '']),
    `## ${u('x_ref')}`, '',
    ...referenceGaps(content, lang).map(g => `- \`${g.id}\` · ${g.name} — ${g.next_action}`),
    '', `## ${u('md_boundaries')}`, '', `- ${site.boundary}`, `- ${u('md_boundary_obs')}`, `- ${u('x_separate')}`, ''
  ];
  return lines.join('\n');
}
