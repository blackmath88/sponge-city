// Native bilingual map view. Pure: (state) → HTML string. Behaviour (zoom, click) is bound in app.mjs.
import { pick } from './i18n.mjs';
import { esc } from './views.mjs';
import { fitView, makeProjection, geometryPath, isPointGeom, isLineGeom, colorFor, legendEntries, inspectRecord, comparableLayers, packSummary } from './map.mjs';

const MAX_FEATURES = 4000;
const chip = (text, kind = '') => `<span class="chip ${esc(kind)}">${esc(text)}</span>`;

function layerGroup(layer, geo, proj) {
  const feats = (geo?.features ?? []).slice(0, MAX_FEATURES);
  const paths = feats.map((f, i) => {
    const d = geometryPath(f.geometry, proj); if (!d) return '';
    const c = colorFor(layer, f);
    const attrs = `data-layer="${esc(layer.id)}" data-f="${i}"`;
    if (isPointGeom(f.geometry)) return `<path ${attrs} d="${d}" class="pt" stroke="${c}"/>`;
    if (isLineGeom(f.geometry)) return `<path ${attrs} d="${d}" class="ln" stroke="${c}"/>`;
    return `<path ${attrs} d="${d}" class="pg" fill="${c}" ${layer.theme === 'boundary' ? 'fill-opacity="0.04"' : 'fill-opacity="0.55"'} stroke="${layer.theme === 'boundary' ? '#243c35' : c}"/>`;
  }).join('');
  return `<g class="layer layer-${esc(layer.theme)}" data-layer-group="${esc(layer.id)}">${paths}</g>`;
}

function mapPanel({ lang, ui, pack, geoById, state, side, selection }) {
  const proj = makeProjection(pack.extent.bbox);
  const active = pack.layers.filter(l => l.kind === 'geojson-snapshot' && state.layers.includes(l.id));
  const failed = active.filter(l => !geoById.get(l.id));
  const drawn = active.filter(l => geoById.get(l.id));
  // boundaries first, then areas, lines, points
  const order = l => (l.theme === 'boundary' ? 0 : 1);
  const groups = [...drawn].sort((a, b) => order(a) - order(b)).map(l => layerGroup(l, geoById.get(l.id), proj)).join('');
  const name = pick(pack.name, lang);
  const fit = fitView(drawn.filter(l => l.theme !== 'boundary').map(l => geoById.get(l.id)), proj);
  const [w, s, e, n] = pack.extent.bbox;
  return `<figure class="mappanel" data-city="${esc(pack.city)}" data-side="${side}">
    <figcaption><strong>${esc(name)}</strong> <span class="small muted">${esc(ui('map_extent'))}: ${w.toFixed(3)}–${e.toFixed(3)} °E · ${s.toFixed(3)}–${n.toFixed(3)} °N</span></figcaption>
    <div class="mapframe"><svg class="mapsvg" role="img" aria-label="${esc(ui('map_aria').replace('{city}', name))}" viewBox="0 0 ${proj.width} ${proj.height}" data-fit="${fit ? fit.join(' ') : ''}" data-w="${proj.width}" data-h="${proj.height}" preserveAspectRatio="xMidYMid meet" tabindex="0">
      <rect class="seabed" x="0" y="0" width="${proj.width}" height="${proj.height}"/>${groups}${selection ? '' : ''}</svg>
      <div class="zoom" role="group" aria-label="${esc(ui('map_zoom'))}"><button data-zoom="in" aria-label="${esc(ui('map_zoom_in'))}">+</button><button data-zoom="out" aria-label="${esc(ui('map_zoom_out'))}">−</button><button data-zoom="reset" aria-label="${esc(ui('map_zoom_reset'))}">⌂</button></div>
      ${drawn.length ? '' : `<p class="mapempty">${esc(pack.layers.some(l => l.kind === 'geojson-snapshot') ? ui('map_no_layer_selected') : ui('map_no_snapshot'))}</p>`}
      ${failed.length ? `<p class="maperror" role="alert">${esc(ui('map_layer_failed'))}: ${failed.map(l => esc(pick(l.title, lang))).join(', ')}</p>` : ''}
    </div>
    <div class="legends">${drawn.filter(l => l.theme !== 'boundary' || l.legend.type !== 'single').map(l => `<div class="legend" data-legend="${esc(l.id)}"><strong>${esc(pick(l.title, lang))}</strong> <span class="small muted">· ${esc(ui('cls_' + l.origin))} · ${esc(l.unit)}</span>
      <ul>${legendEntries(l, lang).map(it => `<li><i style="background:${esc(it.color)}"></i>${esc(it.label)}</li>`).join('')}</ul></div>`).join('')}
      ${drawn.length > 0 ? `<p class="small muted">${esc(ui('map_legend_note'))}</p>` : ''}</div>
    ${drawn.length ? `<p class="small muted attribution" data-attribution="${esc(pack.city)}">© ${[...new Set(drawn.map(l => l.attribution))].map(esc).join(' · ')} · ${esc(ui('map_date'))}: ${[...new Set(drawn.map(l => l.temporal))].map(esc).join(' · ')}</p>` : ''}
  </figure>`;
}

function layerControls({ lang, ui, pack, state, side }) {
  const rows = pack.layers.map(l => {
    const drawable = l.kind === 'geojson-snapshot';
    return `<li class="layerrow"><label><input type="checkbox" data-layer-toggle="${esc(l.id)}" data-side="${side}" ${state.layers.includes(l.id) ? 'checked' : ''} ${drawable ? '' : 'disabled'}> <span>${esc(pick(l.title, lang))}</span></label>
      <span class="small">${chip(ui('cls_' + l.origin), l.origin)} ${chip(ui('theme_' + l.theme))}${drawable ? '' : ' ' + chip(ui('map_external'), 'unknown')}</span>
      <span class="small muted">${esc(l.temporal)} · ${esc(l.coverage)}</span>${drawable ? '' : `<a class="small" href="${esc(l.source_url)}" target="_blank" rel="noreferrer">${esc(ui('map_open_source'))} ↗</a>`}</li>`;
  }).join('');
  const gaps = (pack.gaps ?? []).map(g => `<li class="gap" data-gap="${esc(g.theme)}"><strong>${esc(ui('theme_' + g.theme))}</strong> ${g.state === 'not_checked' ? chip(ui('map_not_checked'), 'unknown') : ''} ${esc(pick(g.reason, lang))}
    <details><summary class="small">${esc(ui('map_checked'))}</summary><ul class="small">${g.checked.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details></li>`).join('');
  return `<div class="layerbox" data-side="${side}"><h4>${esc(pick(pack.name, lang))}</h4>
    <ul class="layers">${rows || `<li class="small muted">${esc(ui('map_no_snapshot'))}</li>`}</ul>
    ${gaps ? `<h5>${esc(ui('map_gaps'))}</h5><ul class="gaps">${gaps}</ul>` : ''}</div>`;
}

export function inspectPanel({ lang, ui, record, measureIds }) {
  if (!record) return `<div class="inspect empty" id="inspect"><h4>${esc(ui('map_inspect'))}</h4><p class="muted">${esc(ui('map_inspect_hint'))}</p></div>`;
  const rows = record.props.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const hasMeasure = record.measure_topic && measureIds.includes(record.measure_topic);
  return `<div class="inspect" id="inspect" data-inspect-layer="${esc(record.layer)}"><h4>${esc(record.title)}</h4>
    <p>${chip(ui('cls_' + record.origin), record.origin)} ${chip(ui('theme_' + record.theme))}</p>
    ${rows ? `<table class="props"><tbody>${rows}</tbody></table>` : `<p class="small muted">${esc(ui('map_no_props'))}</p>`}
    <dl class="meta">
      <dt>${esc(ui('map_method'))}</dt><dd>${esc(record.method)}</dd>
      <dt>${esc(ui('map_unit_scale'))}</dt><dd>${esc(record.unit)} · ${esc(record.spatial_scale)}</dd>
      <dt>${esc(ui('map_date'))}</dt><dd>${esc(record.temporal)} · ${esc(ui('retrieved'))} ${esc(record.retrieved)}</dd>
      <dt>${esc(ui('map_coverage'))}</dt><dd>${esc(record.coverage)}</dd>
      <dt>${esc(ui('map_limits'))}</dt><dd>${esc(record.limitations)}</dd>
      <dt>${esc(ui('source'))}</dt><dd>${esc(record.publisher)} · <a href="${esc(record.source_url)}" target="_blank" rel="noreferrer">${esc(ui('map_open_source'))} ↗</a></dd>
      <dt>${esc(ui('map_licence'))}</dt><dd><a href="${esc(record.licence_url)}" target="_blank" rel="noreferrer">${esc(record.licence)} ↗</a> · ${esc(record.attribution)}</dd>
    </dl>
    <p class="boundary small">${esc(ui('map_screening'))}</p>
    <p class="links">${hasMeasure ? `<a href="#" data-goto="measure" data-indicator-go="${esc(record.measure_topic)}">${esc(ui('map_to_measure'))} →</a> ` : ''}<a href="#" data-goto="export">${esc(ui('map_to_investigate'))} →</a></p>
    <p><button class="download secondary" id="brief-md">${esc(ui('mb_export_md'))}</button> <button class="download secondary" id="brief-json">${esc(ui('mb_export_json'))}</button></p></div>`;
}

function tableView({ lang, ui, pack, geoById, state }) {
  const layers = pack.layers.map(l => `<tr data-layer-row="${esc(l.id)}"><th scope="row">${esc(pick(l.title, lang))}</th><td>${esc(ui('cls_' + l.origin))}</td><td>${esc(l.method)}</td><td>${esc(l.unit)}</td><td>${esc(l.spatial_scale)}</td><td>${esc(l.temporal)}</td><td>${esc(l.coverage)}</td><td>${esc(l.publisher)}</td><td><a href="${esc(l.licence_url)}" target="_blank" rel="noreferrer">${esc(l.licence)}</a></td></tr>`).join('');
  const sel = pack.layers.filter(l => state.layers.includes(l.id) && geoById.get(l.id));
  const feats = sel.map(l => {
    const f = geoById.get(l.id).features.slice(0, 25);
    const keys = (l.properties_shown?.length ? l.properties_shown : Object.keys(f[0]?.properties ?? {})).slice(0, 4);
    return `<h5>${esc(pick(l.title, lang))} <span class="small muted">(${esc(ui('map_first_n').replace('{n}', f.length).replace('{total}', geoById.get(l.id).features.length))})</span></h5>
      <div class="scroll"><table><thead><tr><th>#</th>${keys.map(k => `<th>${esc(k)}</th>`).join('')}<th></th></tr></thead><tbody>${f.map((x, i) => `<tr><td>${i}</td>${keys.map(k => `<td>${esc(x.properties?.[k])}</td>`).join('')}<td><button data-pick="${esc(l.id)}:${i}">${esc(ui('map_inspect_btn'))}</button></td></tr>`).join('')}</tbody></table></div>`;
  }).join('');
  return `<div class="tableview"><h4>${esc(pick(pack.name, lang))} · ${esc(ui('map_table_layers'))}</h4>
    <div class="scroll"><table><thead><tr><th>${esc(ui('map_layer'))}</th><th>${esc(ui('map_origin'))}</th><th>${esc(ui('map_method'))}</th><th>${esc(ui('map_unit'))}</th><th>${esc(ui('map_scale'))}</th><th>${esc(ui('map_date'))}</th><th>${esc(ui('map_coverage'))}</th><th>${esc(ui('source'))}</th><th>${esc(ui('map_licence'))}</th></tr></thead><tbody>${layers}</tbody></table></div>${feats}</div>`;
}

export function mapView({ lang, ui, packs, geoById, state, mode = 'map', measureIds = [], record = null }) {
  const ids = Object.keys(packs);
  const pack = packs[state.city];
  const other = state.compare ? packs[state.compare] : null;
  const otherState = other ? { ...state, layers: state.layersCompare ?? [] } : null;
  const sum = packSummary(pack);
  let compareNote = '';
  if (other) {
    const a = pack.layers.filter(l => state.layers.includes(l.id)), b = other.layers.filter(l => otherState.layers.includes(l.id));
    const pairs = a.flatMap(x => b.map(y => ({ x, y, ...comparableLayers(x, y) }))).filter(p => p.same_theme);
    compareNote = `<p class="small boundary" data-compare-note>${esc(ui('map_compare_note'))}${pairs.map(p => ` <span class="pair ${p.comparable ? 'ok' : 'no'}">${esc(ui('theme_' + p.x.theme))}: ${esc(ui(p.comparable ? 'comparable' : 'not_comparable'))}${p.comparable ? '' : ` (${esc(ui('differs_in'))} ${p.differs.map(f => esc(ui(f === 'temporal' ? 'f_temporal' : f === 'theme' ? 'map_layer' : f === 'origin' ? 'map_origin' : 'f_' + f))).join(', ')})`}</span>`).join('')}</p>`;
  }
  return `<div class="view mapview" data-city="${esc(state.city)}" data-mode="${mode}">
    <div class="maptoolbar">
      <div class="seg" role="group" aria-label="${esc(ui('map_city'))}">${ids.map(id => `<button data-map-city="${esc(id)}" aria-pressed="${id === state.city}">${esc(pick(packs[id].name, lang))}</button>`).join('')}</div>
      <label class="cmp">${esc(ui('map_compare_with'))} <select id="map-compare"><option value="">—</option>${ids.filter(id => id !== state.city).map(id => `<option value="${esc(id)}" ${id === state.compare ? 'selected' : ''}>${esc(pick(packs[id].name, lang))}</option>`).join('')}</select></label>
      <div class="seg" role="group" aria-label="${esc(ui('map_mode'))}"><button data-map-mode="map" aria-pressed="${mode === 'map'}">${esc(ui('map_mode_map'))}</button><button data-map-mode="table" aria-pressed="${mode === 'table'}">${esc(ui('map_mode_table'))}</button></div>
      <button id="map-share" class="download secondary">${esc(ui('map_share'))}</button><span id="map-share-note" class="small muted" role="status"></span>
    </div>
    <p class="small muted">${esc(pick(pack.context, lang))} · ${esc(ui('map_summary').replace('{d}', sum.drawable).replace('{e}', sum.external).replace('{g}', sum.gaps))}</p>
    ${compareNote}
    ${mode === 'table'
      ? `<div class="tablewrap">${tableView({ lang, ui, pack, geoById, state })}${other ? tableView({ lang, ui, pack: other, geoById, state: otherState }) : ''}</div>`
      : `<div class="mapgrid ${other ? 'two' : ''}">${mapPanel({ lang, ui, pack, geoById, state, side: 'a' })}${other ? mapPanel({ lang, ui, pack: other, geoById, state: otherState, side: 'b' }) : ''}</div>`}
    <div class="mapside"><div class="controls">${layerControls({ lang, ui, pack, state, side: 'a' })}${other ? layerControls({ lang, ui, pack: other, state: otherState, side: 'b' }) : ''}</div>
      ${inspectPanel({ lang, ui, record, measureIds })}</div>
  </div>`;
}

export { inspectRecord };
