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
  if (view.scenarioState) {
    const added = view.scenarioState.elements.filter(el => el.origin?.startsWith("intervention"));
    for (const el of added) lines.push(`  + ${el.type.padEnd(9)} ${el.label.padEnd(30)} (scenario, assumed)`);
  }
  lines.push("", "INTERVENTIONS");
  for (const item of view.interventions) lines.push(`  ${item.id.padEnd(18)} ${item.status.padEnd(23)} ${item.reason}`);
  lines.push("", "EFFECTS (today → scenario, change)");
  for (const effect of view.effects) lines.push(`  ${effect.label.padEnd(16)} ${show(effect.baseline).padStart(8)} → ${show(effect.scenario).padStart(8)}  Δ ${show(effect.change)} [${effect.change.state}]`);
  if (view.scenarioEffects) {
    lines.push("", `TENDENCIES (${view.scenario_id}; today → scenario)`);
    for (const [key, after] of Object.entries(view.scenarioEffects.effects)) {
      const before = view.baselineEffects.effects[key];
      if (after.state === "not-applicable") continue;
      lines.push(`  ${key.padEnd(30)} ${String(before.value ?? before.state).padStart(8)} → ${String(after.value ?? after.state).padStart(8)}  ${view.effectDelta.changes[key].direction}`);
    }
  }
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
