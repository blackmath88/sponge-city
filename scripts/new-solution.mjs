// Scaffolds a new solution: node scripts/new-solution.mjs <id> ["Title"]
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { root, loadRegistry } from "./lib-solutions.mjs";

const id = process.argv[2];
const title = process.argv[3] || (id || "").split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error("Usage: make new name=my-solution   (kebab-case id)");
  process.exit(1);
}
const dir = join(root, "solutions", id);
if (await access(dir).then(() => true, () => false)) {
  console.error(`solutions/${id} already exists.`);
  process.exit(1);
}
await mkdir(dir, { recursive: true });

const manifest = {
  id,
  title,
  question: "Which single question does this solution answer?",
  summary: "One sentence on what it shows and what it deliberately does not claim.",
  roles: ["need"],
  status: "idea",
  page: "page.html",
  embeds: { ATLAS_DATA: { file: "data/evidence-atlas.json", pick: ["records", "sources"] } },
  live_sources: [],
  smoke: "smoke.mjs",
  fetch: null,
  docs: []
};
await writeFile(join(dir, "solution.json"), JSON.stringify(manifest, null, 2) + "\n");

await writeFile(join(dir, "page.html"), `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    /*__SHARED_CSS__*/
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); line-height: 1.5; }
    .bar { height: var(--bar); display: flex; align-items: center; gap: 16px; padding: 0 16px; border-bottom: 1px solid var(--ink); }
    .bar a { font: 700 12px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; text-decoration: none; color: var(--ink); }
    main { max-width: 960px; margin: 0 auto; padding: 48px 16px; }
    h1 { font: 500 48px/1 var(--serif); letter-spacing: -.03em; margin: 0 0 16px; }
    .note { color: var(--muted); }
  </style>
</head>
<body>
  <header class="bar"><a href="index.html">Sponge City</a><span>${title}</span></header>
  <main>
    <h1>${title}</h1>
    <p class="note" id="status"></p>
  </main>
  <script>
    const ATLAS = /*__ATLAS_DATA__*/ null;
    // Pure logic first (tested by smoke.mjs), DOM code below.
    function summary(atlas) {
      return \`\${atlas.records.length} atlas records and \${atlas.sources.length} sources available.\`;
    }
    document.querySelector("#status").textContent = summary(ATLAS);
  </script>
</body>
</html>
`);

await writeFile(join(dir, "smoke.mjs"), `import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = await readFile(join(root, "site", "${id}.html"), "utf8");
if (!html.includes("<title>${title}</title>")) throw new Error("${id}: page title missing. Run make build.");
if (html.includes("__ATLAS_DATA__")) throw new Error("${id}: atlas data not embedded.");
console.log("${id} smoke test passed.");
`);

await writeFile(join(dir, "README.md"), `# ${title}

**Question:** ${manifest.question}

**Status:** idea. Edit \`solution.json\`, build the page in \`page.html\`, and extend \`smoke.mjs\`.
See [docs/SOLUTIONS.md](../../docs/SOLUTIONS.md) for the contract.
`);

const registryPath = join(root, "solutions", "registry.json");
const registry = await loadRegistry();
registry.solutions.push(id);
await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n");
console.log(`Created solutions/${id}/ and registered it. Next: make smoke`);
