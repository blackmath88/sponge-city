// Runs the registry contract check, the hub check and every solution's smoke test.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, loadSolutions } from "./lib-solutions.mjs";

const { solutions, errors } = await loadSolutions();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const hub = await readFile(join(root, "site", "solutions.html"), "utf8");
for (const solution of solutions) {
  if (!hub.includes(`"href":"${solution.id}.html"`)) {
    console.error(`Hub does not list ${solution.id}. Run make build.`);
    process.exit(1);
  }
}

let failed = 0;
for (const solution of solutions) {
  const result = spawnSync(process.execPath, [join(solution.dir, solution.smoke)], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`✗ ${solution.id} smoke test failed`);
    failed += 1;
  }
}
if (failed) process.exit(1);
console.log(`All ${solutions.length} solutions pass.`);
