// Validates data/sponge-facts.json and writes docs/SPONGE-FACTS.md from it.
// Run: node scripts/facts-doc.mjs        (add --check to fail if the doc is out of date)
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { root } from "./lib-solutions.mjs";

const data = JSON.parse(await readFile(join(root, "data", "sponge-facts.json"), "utf8"));
const facts = [...data.context, ...data.interventions.flatMap(item => item.facts)];
const ids = new Set();
const errors = [];
for (const fact of facts) {
  if (ids.has(fact.id)) errors.push(`duplicate fact id ${fact.id}`);
  ids.add(fact.id);
  if (!(fact.evidence in data.evidence)) errors.push(`${fact.id}: unknown evidence ${fact.evidence}`);
  if (!(fact.visual in data.visuals)) errors.push(`${fact.id}: unknown visual ${fact.visual}`);
  if (fact.evidence === "inference") {
    if (!fact.claim.startsWith("≈")) errors.push(`${fact.id}: inference must start with ≈`);
    if (!fact.basis?.length) errors.push(`${fact.id}: inference needs a basis`);
  } else if (!/^https:\/\//.test(fact.source?.url || "")) errors.push(`${fact.id}: needs an https source`);
  if (fact.evidence === "basel-data" && !fact.method) errors.push(`${fact.id}: basel-data needs a method`);
}
for (const fact of facts) for (const id of fact.basis || []) if (!ids.has(id)) errors.push(`${fact.id}: unknown basis ${id}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const label = { "basel-data": "Basel data", official: "Official", research: "Research", inference: "≈ Inference" };
const card = fact => [
  `- **${label[fact.evidence]}** · ${fact.claim}`,
  fact.source ? `  Source: [${fact.source.label}](${fact.source.url}).` : `  Based on: ${fact.basis.map(id => `\`${id}\``).join(", ")}.`,
  fact.method ? `  Method: ${fact.method}` : null,
  fact.caveat ? `  Caveat: ${fact.caveat}` : null,
  `  Visual: ${fact.visual} · id \`${fact.id}\``
].filter(Boolean).join("\n");

const counts = Object.fromEntries(Object.keys(data.evidence).map(key => [key, facts.filter(f => f.evidence === key).length]));
const doc = `# Sponge City fact cards

Status: research catalogue, ${data.updated}. Generated from [\`data/sponge-facts.json\`](../data/sponge-facts.json) by \`node scripts/facts-doc.mjs\`; do not edit by hand. Basel-data numbers are reproduced by [\`pilots/basel_facts.py\`](pilots/basel_facts.py) and [\`pilots/tree_pit_canopy.py\`](pilots/tree_pit_canopy.py).

${data.purpose}

**${facts.length} facts** across ${data.interventions.length} interventions and actions, plus Basel context. Evidence classes:

${Object.entries(data.evidence).map(([key, text]) => `- **${label[key]}** (${counts[key]}): ${text}`).join("\n")}

Visual hints: ${Object.entries(data.visuals).map(([key, text]) => `\`${key}\` ${text}`).join(" · ")}.

## Basel context

${data.context.map(card).join("\n\n")}

## Interventions and actions

${data.interventions.map(item => `### ${item.name} (${item.de})

${item.what}

Mechanisms: ${item.mechanisms.join(" · ")}${item.knowledge_id ? ` · knowledge catalogue: \`${item.knowledge_id}\`` : ""}

${item.facts.map(card).join("\n\n")}`).join("\n\n")}
`;
const target = join(root, "docs", "SPONGE-FACTS.md");
if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current !== doc) { console.error("docs/SPONGE-FACTS.md is out of date. Run node scripts/facts-doc.mjs"); process.exit(1); }
  console.log(`Sponge facts valid: ${facts.length} facts, doc up to date.`);
} else {
  await writeFile(target, doc);
  console.log(`Wrote docs/SPONGE-FACTS.md: ${facts.length} facts.`);
}
