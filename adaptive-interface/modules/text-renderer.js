// Second, deliberately different renderer: plain text into any element with textContent
// (or a { textContent } stub in tests). Exists to prove the renderer is swappable.

const show = value => value?.state === "unknown" ? "unknown" : value?.state === "not-applicable" ? "n/a" : `${value?.value}`;

export function renderText(view) {
  const lines = [`ADAPTIVE VIEW · ${view.status}`];
  if (view.selection) lines.push(`selection ${view.selection.lat}, ${view.selection.lon} r=${view.selection.radius_m} m`);
  for (const error of view.errors) lines.push(`! ${error}`);
  if (!view.scenario) return lines.join("\n");
  lines.push(`place: ${view.scenario.label}`, "", "ELEMENTS (scenario)");
  for (const el of view.scenario.elements) {
    lines.push(`  ${el.type.padEnd(11)} ${el.label.padEnd(30)} surface=${show(el.surface)} [${el.surface.state}] area=${show(el.area_m2)} [${el.area_m2.state}] present=${show(el.presence)}`);
  }
  lines.push("", "INTERVENTIONS");
  for (const item of view.interventions) lines.push(`  ${item.id.padEnd(18)} ${item.status.padEnd(23)} ${item.reason}`);
  lines.push("", "EFFECTS (today → scenario, change)");
  for (const effect of view.effects) lines.push(`  ${effect.label.padEnd(16)} ${show(effect.baseline).padStart(8)} → ${show(effect.scenario).padStart(8)}  Δ ${show(effect.change)} [${effect.change.state}]`);
  lines.push("", "UNKNOWNS");
  for (const item of view.unknowns) lines.push(`  ${item.scope}: ${item.label}`);
  return lines.join("\n");
}

export function createTextRenderer(target) {
  return {
    name: "text-renderer",
    connect(actions) { this.actions = actions; },
    render(view) { target.textContent = renderText(view); }
  };
}
