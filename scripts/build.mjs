// Builds every registered solution into a standalone page in site/, plus the hub at site/index.html.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { root, loadSolutions, datasetDate } from "./lib-solutions.mjs";

const { solutions, errors } = await loadSolutions();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const sharedCss = await readFile(join(root, "shared", "tokens.css"), "utf8");
const cssMarker = "/*__SHARED_CSS__*/";
const leftover = /\/\*__[A-Z_]+__\*\/ null/;
await mkdir(join(root, "site"), { recursive: true });

const pick = (data, keys) => keys ? Object.fromEntries(keys.map(key => [key, data[key]])) : data;
const hubEntries = [];

for (const solution of solutions) {
  let html = await readFile(join(solution.dir, solution.page), "utf8");
  if (!html.includes(cssMarker)) throw new Error(`${solution.id}: page must include ${cssMarker} in its <style>`);
  html = html.replace(cssMarker, () => sharedCss.trim());
  const datasets = [];
  for (const [key, embed] of Object.entries(solution.embeds || {})) {
    const marker = `/*__${key}__*/ null`;
    if (!html.includes(marker)) throw new Error(`${solution.id}: page has no marker ${marker}`);
    const data = JSON.parse(await readFile(join(root, embed.file), "utf8"));
    html = html.replace(marker, () => JSON.stringify(pick(data, embed.pick)));
    datasets.push({ file: embed.file, date: datasetDate(data) });
  }
  const unfilled = html.match(leftover);
  if (unfilled) throw new Error(`${solution.id}: unfilled data marker ${unfilled[0]}`);
  await writeFile(join(root, "site", `${solution.id}.html`), html);
  console.log(`Built site/${solution.id}.html`);
  const { dir, ...manifest } = solution;
  hubEntries.push({ ...manifest, href: `${solution.id}.html`, datasets });
}

const hub = (await readFile(join(root, "shared", "hub.html"), "utf8"))
  .replace(cssMarker, () => sharedCss.trim())
  .replace("/*__SOLUTIONS__*/ null", () => JSON.stringify(hubEntries));
await writeFile(join(root, "site", "index.html"), hub);
console.log(`Built site/index.html with ${hubEntries.length} solutions`);

// Old prototype/ links keep working through small redirect pages.
const legacy = { "prototype/evidence-atlas.html": "evidence-atlas.html", "prototype/basel-map.html": "situation-map.html" };
await mkdir(join(root, "prototype"), { recursive: true });
for (const [path, target] of Object.entries(legacy)) {
  await writeFile(join(root, path), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta http-equiv="refresh" content="0; url=../site/${target}">
<script>location.replace("../site/${target}" + location.hash);</script></head>
<body><p>This page moved to <a href="../site/${target}">site/${target}</a>.</p></body></html>
`);
}
