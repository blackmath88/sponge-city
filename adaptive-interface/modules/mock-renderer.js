// MOCK renderer: deliberately neutral and disposable. The frontend team replaces it with the
// educational Sponge Street renderer. It knows only the view model (contracts/renderer-contract.md):
// no Basel datasets, no WMS, no API schemas, no calculations — only layout for drawing.
// Qualitative effects come precomputed in view.adaptive; the Street Slice adapter only maps them to visuals.
import { toStreetSlice, explainerStages } from "./street-slice-adapter.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const fmt = (value, unit = "") => value?.state === "unknown" ? `unknown${Number.isFinite(value.known_part) && value.known_part ? ` (≥ ${value.known_part}${unit ? " " + unit : ""} known)` : ""}`
  : value?.state === "not-applicable" ? "n/a" : `${value?.value}${unit && value?.value !== null ? " " + unit : ""}`;
const signed = (value, unit) => value?.state === "unknown" ? "unknown" : `${value.value > 0 ? "+" : ""}${value.value}${unit ? " " + unit : ""}`;
const chip = state => `<span class="ai-chip" data-state="${esc(state)}">${esc(state)}</span>`;

const SURFACE_FILL = { sealed: "#9b9b97", permeable: "url(#ai-permeable)", planted: "#8fbf86", water: "#7fb3d5", unknown: "url(#ai-unknown)" };
const TYPE_FILL = { building: "#6f6f6b", road: "#8a8a86", tram: "#a29b8f" };

const isPoint = el => el.type === "tree" || el.type === "entrance" || el.layout?.point !== undefined;

function bandLayout(elements) {
  const bands = new Map();
  for (const el of elements) {
    const band = el.layout?.band;
    if (band === undefined || isPoint(el)) continue;
    const width = Math.min(el.layout.width_m || 2, 5);
    bands.set(band, Math.max(bands.get(band) || 0, width));
  }
  let y = 0;
  const rows = new Map();
  for (const band of [...bands.keys()].sort((a, b) => a - b)) {
    const h = 14 + bands.get(band) * 9;
    rows.set(band, { y, h });
    y += h + 3;
  }
  return { rows, height: y };
}

// Elements carved out of a parent are drawn inside the parent's band, one after another.
function spans(elements, length) {
  const out = new Map();
  const offsets = new Map();
  for (const el of elements) {
    if (isPoint(el) || el.layout?.band === undefined) continue;
    if (el.layout.inserted_from) {
      const parent = elements.find(item => item.id === el.layout.inserted_from);
      const [a] = parent?.layout?.along || [0, 1];
      const width = parent?.layout?.width_m || 2;
      const fraction = el.area_m2?.value ? Math.min(0.5, el.area_m2.value / (width * length)) : 0.05;
      const start = (offsets.get(parent?.id) ?? a + 0.04);
      out.set(el.id, [start, start + fraction]);
      offsets.set(parent?.id, start + fraction + 0.02);
    } else out.set(el.id, el.layout.along || [0, 1]);
  }
  return out;
}

function sceneSvg(place, title, changedIds) {
  const W = 560;
  const length = place.schematic?.length_m || 60;
  const elements = place.elements;
  const { rows, height } = bandLayout(elements);
  const span = spans(elements, length);
  const shapes = [];
  for (const el of elements) {
    const row = rows.get(el.layout?.band);
    if (!row || isPoint(el)) continue;
    const [a, b] = span.get(el.id);
    const absent = el.presence?.value === false;
    const fill = el.surface?.state === "unknown" ? SURFACE_FILL.unknown : TYPE_FILL[el.type] && el.surface?.value === "sealed" ? TYPE_FILL[el.type] : SURFACE_FILL[el.surface?.value] || "#ccc";
    const changed = changedIds.has(el.id);
    shapes.push(`<g><title>${esc(el.label)} · surface ${esc(fmt(el.surface))} (${esc(el.surface?.state)})</title>
      <rect x="${a * W}" y="${row.y}" width="${Math.max(2, (b - a) * W)}" height="${row.h}" fill="${absent ? "none" : fill}" stroke="${changed ? "#111" : "#fff"}" stroke-width="${changed ? 2.5 : 1}" ${absent ? 'stroke-dasharray="4 3"' : ""}/>
      ${(b - a) * W > 70 ? `<text x="${a * W + 6}" y="${row.y + row.h / 2 + 4}" class="ai-svg-label">${esc(el.label)}${el.count?.state && el.count.state !== "not-applicable" ? ` · ${esc(fmt(el.count))} bays` : ""}</text>` : ""}</g>`);
  }
  for (const el of elements) {
    if (!isPoint(el)) continue;
    const row = rows.get(el.layout.band);
    if (!row) continue;
    const parentSpan = el.layout.inserted_from ? span.get([...span.keys()].find(id => elements.find(item => item.id === id)?.layout?.inserted_from === el.layout.inserted_from) || el.layout.inserted_from) : null;
    const x = (el.layout.point ?? (parentSpan ? (parentSpan[0] + parentSpan[1]) / 2 : 0.5)) * W;
    const cy = row.y + row.h / 2;
    const state = el.presence?.state;
    if (el.type === "tree") {
      const absent = el.presence?.value === false;
      shapes.push(`<g><title>${esc(el.label)} · presence ${esc(fmt(el.presence))} (${esc(state)})</title>
        <circle cx="${x}" cy="${cy}" r="11" fill="${absent || state === "unknown" ? "none" : "#4d8a46"}" stroke="${changedIds.has(el.id) ? "#111" : "#2f5f2a"}" stroke-width="${changedIds.has(el.id) ? 2.5 : 1.5}" ${state === "unknown" || absent ? 'stroke-dasharray="3 3"' : ""}/>
        ${state === "unknown" ? `<text x="${x}" y="${cy + 4}" text-anchor="middle" class="ai-svg-label">?</text>` : ""}
        ${absent ? `<text x="${x}" y="${cy + 4}" text-anchor="middle" class="ai-svg-label">×</text>` : ""}</g>`);
    } else if (el.type === "entrance") {
      shapes.push(`<g><title>${esc(el.label)}</title><rect x="${x - 5}" y="${row.y + row.h - 8}" width="10" height="8" fill="#fff" stroke="#111"/></g>`);
    }
  }
  return `<figure class="ai-scene"><figcaption>${esc(title)}</figcaption>
    <svg viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(title)}: schematic plan of the place">
      <defs>
        <pattern id="ai-unknown" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f3efe4"/><line x1="0" y1="0" x2="0" y2="8" stroke="#c49a3a" stroke-width="3"/></pattern>
        <pattern id="ai-permeable" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#c9cdc4"/><circle cx="3" cy="3" r="1.2" fill="#8a8f84"/></pattern>
      </defs>
      ${shapes.join("")}
    </svg></figure>`;
}

function changedElementIds(baseline, scenario) {
  const before = new Map(baseline.elements.map(el => [el.id, JSON.stringify(el)]));
  return new Set(scenario.elements.filter(el => before.get(el.id) !== JSON.stringify(el)).map(el => el.id));
}

function correctionPanel(view) {
  const base = view.baseline;
  const areas = base.elements.filter(el => el.surface?.state !== "not-applicable" && !el.origin?.startsWith("intervention"));
  const trees = base.elements.filter(el => el.type === "tree");
  const surfaceOptions = ["sealed", "permeable", "planted", "unknown"];
  return `<section class="ai-panel"><h2>Does this look right?</h2>
    <p class="ai-note">This is our interpretation of the place. Correct it where you know better; the source value is kept.</p>
    <table class="ai-table"><thead><tr><th>Element</th><th>Surface</th><th>Evidence</th></tr></thead><tbody>
    ${areas.map(el => `<tr><td>${esc(el.label)}</td><td><select data-correct-surface="${esc(el.id)}" aria-label="Surface of ${esc(el.label)}">
      ${surfaceOptions.map(s => `<option value="${s}" ${(el.surface.value ?? "unknown") === s ? "selected" : ""}>${s}</option>`).join("")}</select></td><td>${chip(el.surface.state)}</td></tr>`).join("")}
    ${trees.map(el => `<tr><td>${esc(el.label)}</td><td><select data-correct-presence="${esc(el.id)}" aria-label="Is ${esc(el.label)} there?">
      ${[["true", "is there"], ["false", "is not there"], ["unknown", "not sure"]].map(([v, l]) => `<option value="${v}" ${String(el.presence.value ?? "unknown") === v ? "selected" : ""}>${l}</option>`).join("")}</select></td><td>${chip(el.presence.state)}</td></tr>`).join("")}
    </tbody></table>
    <p><button type="button" data-action="add-tree">+ I can see a tree that is missing</button></p>
    ${view.corrections.length ? `<h3>Your corrections</h3><ul class="ai-list">${view.corrections.map(c => `<li>${esc(c.action === "add-element" ? `Added ${c.element.label}` : `${c.element_id}: ${c.property} → ${c.value ?? "unknown"}`)} <button type="button" data-undo="${esc(c.id)}">undo</button></li>`).join("")}</ul>` : ""}
  </section>`;
}

function interventionPanel(view) {
  return `<section class="ai-panel"><h2>Interventions</h2>
    ${view.interventions.map(item => `<article class="ai-intervention" data-status="${esc(item.status)}">
      <header><strong>${esc(item.label)}</strong> ${chip(item.status)} ${item.applied_count ? `<span class="ai-note">applied ×${item.applied_count}</span>` : ""}</header>
      <p>${esc(item.summary)}</p>
      <p class="ai-mech">${item.mechanisms.map(m => `<span>${esc(m)}</span>`).join("")}</p>
      <p class="ai-note">${esc(item.reason)}</p>
      ${item.eligible_targets.length && !["excluded", "no-recipe"].includes(item.status) ? `<label>on <select data-target-for="${esc(item.id)}">${item.eligible_targets.map(id => `<option value="${esc(id)}">${esc(view.scenario.elements.find(el => el.id === id)?.label || id)}</option>`).join("")}</select></label>
        <button type="button" data-apply="${esc(item.id)}">Apply</button>` : ""}
    </article>`).join("")}
    <p><button type="button" data-action="reset-scenario">Reset scenario</button> <button type="button" data-action="reset-all">Reset corrections too</button></p>
  </section>`;
}

function effectsPanel(view) {
  return `<section class="ai-panel"><h2>Effects <span class="ai-note">geometry only</span></h2>
    <table class="ai-table"><thead><tr><th>Measure</th><th>Today</th><th>Scenario</th><th>Change</th><th>Basis</th></tr></thead><tbody>
    ${view.effects.map(e => `<tr><td>${esc(e.label)}</td><td>${esc(fmt(e.baseline, e.unit))}</td><td>${esc(fmt(e.scenario, e.unit))}</td><td><strong>${esc(signed(e.change, e.unit))}</strong></td><td>${chip(e.change.state)}${e.change.assumptions?.length ? `<div class="ai-note">${e.change.assumptions.map(esc).join("; ")}</div>` : ""}</td></tr>`).join("")}
    </tbody></table>
    <p class="ai-note">Totals stay unknown while any relevant surface is unknown; changes are computed from the elements that changed.</p>
  </section>`;
}

const levelText = value => value?.state === "derived" ? value.value : value?.state === "not-applicable" ? "n/a" : "unknown";

function stateEffectsPanel(view) {
  const adaptive = view.adaptive;
  if (!adaptive?.scenario) return "";
  const slice = toStreetSlice(adaptive);
  const stages = explainerStages(slice).stages;
  const rows = Object.entries(adaptive.effectDelta.changes).filter(([, change]) => change.direction !== "not-applicable");
  const routing = adaptive.scenarioState.routing;
  return `<section class="ai-panel ai-wide"><h2>Effects under a scenario <span class="ai-note">qualitative, state-driven</span></h2>
    <p class="ai-scenarios">${adaptive.scenarios.map(item => `<button type="button" data-scenario="${esc(item.id)}" aria-pressed="${item.id === adaptive.scenario.id}">${esc(item.label)}</button>`).join(" ")}</p>
    <p class="ai-note">${esc(adaptive.scenario.description || "")} Routing: ${chip(routing.state)} ${esc(routing.note || "")}</p>
    <p class="ai-mech">${Object.entries(slice.mechanisms).filter(([, m]) => m.relevant).map(([name, m]) => `<span data-lit="${m.scenario === null ? "unknown" : m.scenario}" title="${esc(m.driven_by)}">${esc(name)}${m.scenario === null ? " ?" : m.scenario && !m.today ? " +" : ""}</span>`).join("")}</p>
    <p class="ai-note ai-stages">Street Slice: ${Object.entries(stages).map(([track, item]) => `<span data-track="${esc(track)}" title="${esc(item.note || "")}">${esc(track)} ${item.stage === null ? chip("unknown") : `<strong>${esc(item.label)}</strong>${item.partial ? " (some)" : ""}${item.mixed ? " (mixed)" : ""}`}</span>`).join(" · ")}</p>
    <table class="ai-table"><thead><tr><th>Effect</th><th>Today</th><th>Scenario</th><th>Change</th><th>Where it changes</th></tr></thead><tbody>
    ${rows.map(([id, change]) => {
      const result = adaptive.scenarioEffects.effects[id];
      return `<tr><td>${esc(change.label)}</td><td>${esc(levelText(change.before))}</td><td>${esc(levelText(change.after))}</td><td>${chip(change.assessment)}</td>
        <td>${change.local.length ? change.local.map(item => `${esc(view.scenario.elements.find(el => el.id === item.element_id)?.label || item.element_id)}: ${esc(levelText(item.before))} → ${esc(levelText(item.after))}`).join("<br>") : "—"}
        ${result.state === "unknown" ? `<div class="ai-note">${esc(result.reason)}</div>` : ""}
        <div class="ai-note">${result.drivers.length} drivers</div></td></tr>`;
    }).join("")}
    </tbody></table>
    <p class="ai-note">Levels, not numbers: no score, no °C, no runoff %. Place-level values bracket unknown inputs; if an unknown could change the level, the result stays unknown.</p>
  </section>`;
}

function unknownPanel(view) {
  const groups = [["context", "About the place"], ["element", "About elements"], ["routing", "About drainage"], ["effect-result", "Effects that depend on unknowns"], ["effect", "Not modelled in this prototype"]];
  return `<section class="ai-panel"><h2>Unknowns</h2>
    ${groups.map(([scope, title]) => {
      const items = (view.adaptive?.unknowns || view.unknowns).filter(item => item.scope === scope);
      return items.length ? `<h3>${title}</h3><ul class="ai-list">${items.map(item => `<li>${esc(item.label)}${item.note ? ` <span class="ai-note">${esc(item.note)}</span>` : ""}</li>`).join("")}</ul>` : "";
    }).join("")}
  </section>`;
}

export function createMockRenderer(root) {
  let actions = null;
  let lastView = null;
  let added = 0;

  root.addEventListener("change", event => {
    const el = event.target;
    if (el.dataset.correctSurface) {
      actions.correct({ element_id: el.dataset.correctSurface, property: "surface", value: el.value === "unknown" ? null : el.value, reason: "corrected in demo" });
    } else if (el.dataset.correctPresence) {
      actions.correct({ element_id: el.dataset.correctPresence, property: "presence", value: el.value === "unknown" ? null : el.value === "true", reason: "corrected in demo" });
    }
  });
  root.addEventListener("click", event => {
    const el = event.target.closest("button");
    if (!el || !actions) return;
    if (el.dataset.scenario) actions.setScenario(el.dataset.scenario);
    else if (el.dataset.apply) actions.applyIntervention(el.dataset.apply, { targetId: root.querySelector(`[data-target-for="${el.dataset.apply}"]`)?.value });
    else if (el.dataset.undo) actions.undoCorrection(el.dataset.undo);
    else if (el.dataset.action === "reset-scenario") actions.resetScenario();
    else if (el.dataset.action === "reset-all") actions.resetAll();
    else if (el.dataset.action === "add-tree") {
      added += 1;
      const band = lastView?.baseline?.elements.find(item => item.type === "sidewalk" && item.layout?.band > 3)?.layout.band ?? 0;
      actions.correct({ action: "add-element", element: { id: `user-tree-${added}`, type: "tree", label: `Tree you added (${added})`, layout: { band, point: Math.min(0.95, 0.45 + added * 0.08) } }, reason: "seen on site" });
    }
  });

  return {
    name: "mock-renderer",
    connect(next) { actions = next; },
    render(view) {
      lastView = view;
      const errors = view.errors.length ? `<div class="ai-errors" role="alert">${view.errors.map(esc).join("<br>")}</div>` : "";
      if (!view.baseline) {
        root.innerHTML = `${errors}<p class="ai-note">${view.status === "loading" ? "Loading place…" : "No place loaded."}</p>`;
        return;
      }
      const fixture = view.source.provenance.find(item => item.kind === "demo-fixture");
      root.innerHTML = `${errors}
        ${fixture ? `<div class="ai-fixture"><strong>Demo fixture.</strong> ${esc(fixture.note)}</div>` : ""}
        <header class="ai-head"><h1>${esc(view.scenario.label)}</h1>
          <p class="ai-note">Selection ${view.selection ? `${esc(view.selection.lat)}, ${esc(view.selection.lon)} · r ${esc(view.selection.radius_m)} m${view.selection.from ? ` · from ${esc(view.selection.from)}` : ""}` : "none (demo default)"}</p></header>
        <div class="ai-compare">${sceneSvg(view.baseline, "Today", new Set())}${sceneSvg(view.scenario, view.applied.length ? "Scenario" : "Scenario (no change yet)", changedElementIds(view.baseline, view.scenario))}</div>
        <p class="ai-legend"><span><i style="background:#9b9b97"></i>sealed</span><span><i style="background:#c9cdc4"></i>permeable</span><span><i style="background:#8fbf86"></i>planted</span><span><i class="ai-hatch"></i>unknown</span><span><i class="ai-ring"></i>changed</span></p>
        <div class="ai-grid">${stateEffectsPanel(view)}${interventionPanel(view)}${effectsPanel(view)}${correctionPanel(view)}${unknownPanel(view)}</div>`;
    }
  };
}
