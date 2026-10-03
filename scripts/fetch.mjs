// Refreshes the data snapshot of every solution that declares a fetch script.
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { loadSolutions } from "./lib-solutions.mjs";

const { solutions, errors } = await loadSolutions();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
for (const solution of solutions.filter(item => item.fetch)) {
  console.log(`Fetching ${solution.id}…`);
  const result = spawnSync(process.execPath, [join(solution.dir, solution.fetch)], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
