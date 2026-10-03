import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(join(root, "data", "evidence-atlas.json"), "utf8"));
const html = await readFile(join(root, "site", "evidence-atlas.html"), "utf8");
const errors = [];

const unique = (items, label) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
  return seen;
};

const sourceIds = unique(data.sources, "source");
const entityIds = unique(data.entities, "entity");
const recordIds = unique(data.records, "record");
const maturityIds = unique(data.maturity_levels, "maturity level");
unique(data.decision_routes, "decision route");

if (maturityIds.size !== 4) errors.push(`Expected four maturity levels, found ${maturityIds.size}`);
const maturityOrders = data.maturity_levels.map(level => level.order).sort((a, b) => a - b);
if (maturityOrders.join(",") !== "1,2,3,4") errors.push(`Maturity orders must be 1,2,3,4; found ${maturityOrders.join(",")}`);

for (const entity of data.entities) {
  for (const id of entity.source_ids) if (!sourceIds.has(id)) errors.push(`${entity.id}: unknown source ${id}`);
  for (const id of entity.related_entity_ids || []) if (!entityIds.has(id)) errors.push(`${entity.id}: unknown entity ${id}`);
}

for (const record of data.records) {
  for (const id of record.source_ids) if (!sourceIds.has(id)) errors.push(`${record.id}: unknown source ${id}`);
  for (const id of record.entity_ids) if (!entityIds.has(id)) errors.push(`${record.id}: unknown entity ${id}`);
  for (const id of record.related_record_ids || []) if (!recordIds.has(id)) errors.push(`${record.id}: unknown record ${id}`);
}

for (const route of data.decision_routes) {
  for (const id of route.source_ids) if (!sourceIds.has(id)) errors.push(`${route.id}: unknown source ${id}`);
}

if (!html.includes(`"schema_version":"${data.schema_version}"`)) {
  errors.push("Standalone HTML does not contain the current dataset. Run make build.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Atlas valid: ${data.records.length} records, ${data.maturity_levels.length} maturity levels, ${data.decision_routes.length} decision routes, ${data.sources.length} sources.`);
