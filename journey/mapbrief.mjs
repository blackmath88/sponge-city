// Investigation brief for a map selection: one city, one layer, one object. Stable IDs, source titles and quotations stay untranslated.
// A brief states what the map shows and what is still unresolved. It cannot clear an authority gate.
import { pick } from './i18n.mjs';

export function mapBriefRecord({ pack, profile, layer, index, feature, lang, matrix, measurements }) {
  // The measurement chain and its actors describe Basel (the charter is Basel's). Other cities use their own matrix cell only.
  const indicator = pack.city === 'basel' ? (measurements?.indicators?.find(m => m.id === layer.measure_topic) ?? null) : null;
  const row = matrix?.indicators?.find(i => i.featured_indicator === layer.measure_topic);
  const cell = row ? matrix.cells[row.id]?.[pack.city] : null;
  const gaps = (pack.gaps ?? []).filter(g => g.theme === layer.theme || (cell && g.theme === row.id));
  const needs = cell?.needs ?? ['request'];
  return {
    schema_version: 'sponge-map-brief/1', status: 'requires-investigation', language: 'en', ui_language: lang,
    city: { id: pack.city, name: profile.name.en },
    selection: { layer_id: layer.id, feature_index: index, properties: Object.fromEntries((layer.properties_shown?.length ? layer.properties_shown : Object.keys(feature?.properties ?? {})).filter(k => k in (feature?.properties ?? {})).map(k => [k, feature.properties[k]])) },
    evidence: { class: layer.origin, theme: layer.theme, method: layer.method, unit: layer.unit, spatial_scale: layer.spatial_scale, data_date: layer.temporal, coverage: layer.coverage, limitations: layer.limitations.en },
    sources: [{ layer_id: layer.id, publisher: layer.publisher, source_url: layer.source_url, licence: layer.licence, licence_url: layer.licence_url, retrieved: layer.retrieved, attribution: layer.attribution }],
    context: cell && !cell.needs.length ? { indicator: row.id, note: cell.note.en } : null,
    related_indicator: indicator ? { id: indicator.id, question: indicator.question.en, next_action: indicator.next_action.en } : null,
    unresolved_checks: [
      { id: `${layer.id}.site-verification`, check: 'Screening result has not been verified on site.', needs: ['site_visit'] },
      ...(cell && cell.needs.length ? [{ id: `${row.id}.${pack.city}`, check: cell.note.en, needs }] : []),
      ...gaps.map(g => ({ id: `${pack.city}.gap.${g.theme}`, check: g.reason.en, needs: ['request'] })),
    ],
    actors: [...new Set([layer.publisher, ...(indicator?.ask ? [indicator.ask.en] : [])])],
    boundaries: ['Map screening is not a verified site assessment.', 'Observations remain observations and cannot clear an authority gate.', `Only ${profile.name.en} sources are used in this brief; no other city's data is included.`],
  };
}

export function mapBriefMarkdown({ pack, profile, layer, index, feature, lang, matrix, measurements, ui }) {
  const rec = mapBriefRecord({ pack, profile, layer, index, feature, lang, matrix, measurements });
  const row = matrix?.indicators?.find(i => i.featured_indicator === layer.measure_topic);
  const cell = row ? matrix.cells[row.id]?.[pack.city] : null;
  const indicator = pack.city === 'basel' ? measurements?.indicators?.find(m => m.id === layer.measure_topic) : null;
  const gaps = (pack.gaps ?? []).filter(g => g.theme === layer.theme || (cell && g.theme === row.id));
  const needName = n => ui('need_' + n);
  return [
    `# ${pick(profile.name, lang)} · ${pick(layer.title, lang)} · ${ui('mb_title')}`, '',
    `**${ui('md_status')}:** ${ui('md_status_value')}`, '',
    `**${ui('map_city')}:** ${pick(profile.name, lang)} (\`${pack.city}\`) · **${ui('map_layer')}:** \`${layer.id}\` · **${ui('mb_object')}:** #${index}`,
    ...Object.entries(rec.selection.properties).map(([k, v]) => `- ${k}: ${v}`), '',
    `## ${ui('mb_class')}`, '',
    `- ${ui('map_origin')}: ${ui('cls_' + layer.origin)} (\`${layer.origin}\`)`, `- ${ui('map_method')}: ${layer.method}`, `- ${ui('map_unit_scale')}: ${layer.unit} · ${layer.spatial_scale}`,
    `- ${ui('map_date')}: ${layer.temporal} · ${ui('retrieved')} ${layer.retrieved}`, `- ${ui('map_coverage')}: ${layer.coverage}`, `- ${ui('map_limits')}: ${pick(layer.limitations, lang)}`, '',
    `## ${ui('mb_sources')}`, '', `- ${layer.publisher} · ${layer.source_url}`, `- ${ui('map_licence')}: ${layer.licence} · ${layer.licence_url} · ${layer.attribution}`, '',
    `## ${ui('mb_unresolved')}`, '',
    `- \`${layer.id}.site-verification\`: ${ui('mb_verify_site')} (${ui('need_site_visit')})`,
    ...(cell && cell.needs.length ? [`- \`${row.id}.${pack.city}\`: ${pick(cell.note, lang)} (${cell.needs.map(needName).join(', ')})`] : []),
    ...gaps.map(g => `- \`${pack.city}.gap.${g.theme}\`: ${pick(g.reason, lang)}`), '',
    ...(cell && !cell.needs.length ? [`## ${ui('mb_context')}`, '', `- \`${row.id}.${pack.city}\`: ${pick(cell.note, lang)}`, ''] : []),
    `## ${ui('mb_actors')}`, '', ...rec.actors.map(a => `- ${a}`), '',
    `## ${ui('mb_next')}`, '', ...(indicator ? [`- ${pick(indicator.next_action, lang)}`] : [`- ${ui('mb_next_generic')}`]), '',
    `## ${ui('md_boundaries')}`, '', `- ${ui('map_screening')}`, `- ${ui('md_boundary_obs')}`, `- ${ui('mb_city_only').replace('{city}', pick(profile.name, lang))}`, '',
  ].join('\n');
}
