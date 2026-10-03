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
