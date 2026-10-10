import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const read = path => readFileSync(join(root, path), "utf8");
let html = read("src/page.html");
html = html.replace("/*__SHARED_CSS__*/", read("src/tokens.css").trim());
html = html.replace("/*__CHARTER__*/ null", JSON.stringify(JSON.parse(read("data/data-charter.json"))));
html = html.replace("/*__CHARTER_DE__*/ null", JSON.stringify(JSON.parse(read("data/charter-de.json"))));
html = html.replace("/*__CHARTER_MAP__*/ null", JSON.stringify(JSON.parse(read("data/charter-map.json"))));
if (/\/\*__[A-Z_]+__\*\/ null/.test(html)) throw new Error("Unfilled data marker in Data Charter page");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "index.html"), html);
for (const folder of ["data", "docs"]) cpSync(join(root, folder), join(output, folder), { recursive: true });
console.log(`Data Charter build: ${output}`);
