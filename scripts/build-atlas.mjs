import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dataPath = join(root, "data", "evidence-atlas.json");
const templatePath = join(root, "prototype", "evidence-atlas.template.html");
const outputPath = join(root, "prototype", "evidence-atlas.html");

const data = JSON.parse(await readFile(dataPath, "utf8"));
const template = await readFile(templatePath, "utf8");
const marker = "/*__ATLAS_DATA__*/ null";

if (!template.includes(marker)) {
  throw new Error(`Data marker not found in ${templatePath}`);
}

const output = template.replace(marker, JSON.stringify(data));
await writeFile(outputPath, output);
console.log(`Built ${outputPath}`);

// The Basel tree map embeds the open-data snapshot and the atlas records it cites.
const mapTemplate = await readFile(join(root, "prototype", "basel-map.template.html"), "utf8");
const mapSnapshot = await readFile(join(root, "data", "basel-map.json"), "utf8");
const mapMarker = "/*__MAP_DATA__*/ null";
const atlasMarker = "/*__ATLAS_DATA__*/ null";
if (!mapTemplate.includes(mapMarker) || !mapTemplate.includes(atlasMarker)) {
  throw new Error("Data markers not found in basel-map.template.html");
}
const mapOutputPath = join(root, "prototype", "basel-map.html");
await writeFile(mapOutputPath, mapTemplate
  .replace(mapMarker, () => JSON.stringify(JSON.parse(mapSnapshot)))
  .replace(atlasMarker, () => JSON.stringify({ records: data.records, sources: data.sources })));
console.log(`Built ${mapOutputPath}`);
