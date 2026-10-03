// Shared helpers for the solution model: registry, manifests and their contract.
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ROLES = ["need", "possibility", "potential_effect", "evidence", "governance"];
export const STATUSES = ["idea", "prototype", "alpha"];

const exists = async path => access(path).then(() => true, () => false);

export async function loadRegistry() {
  const registry = JSON.parse(await readFile(join(root, "solutions", "registry.json"), "utf8"));
  if (registry.schema_version !== "solutions/0.1") throw new Error("solutions/registry.json: unknown schema_version");
  return registry;
}

// Returns every manifest in registry order, with a list of contract errors.
export async function loadSolutions() {
  const registry = await loadRegistry();
  const errors = [];
  const solutions = [];
  const seen = new Set();
  for (const id of registry.solutions) {
    const dir = join(root, "solutions", id);
    const manifestPath = join(dir, "solution.json");
    if (seen.has(id)) errors.push(`${id}: listed twice in registry`);
    seen.add(id);
    if (!(await exists(manifestPath))) { errors.push(`${id}: missing solutions/${id}/solution.json`); continue; }
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const fail = message => errors.push(`${id}: ${message}`);
    if (manifest.id !== id) fail(`manifest id "${manifest.id}" does not match folder`);
    if (!/^[a-z0-9-]+$/.test(id)) fail("id must be kebab-case");
    for (const field of ["title", "question", "summary", "page", "smoke"]) if (!manifest[field]) fail(`missing ${field}`);
    if (!Array.isArray(manifest.roles) || !manifest.roles.length || manifest.roles.some(role => !ROLES.includes(role))) fail(`roles must be from ${ROLES.join(", ")}`);
    if (!STATUSES.includes(manifest.status)) fail(`status must be one of ${STATUSES.join(", ")}`);
    if (manifest.page && !(await exists(join(dir, manifest.page)))) fail(`page ${manifest.page} not found`);
    if (manifest.smoke && !(await exists(join(dir, manifest.smoke)))) fail(`smoke ${manifest.smoke} not found`);
    if (manifest.fetch && !(await exists(join(dir, manifest.fetch)))) fail(`fetch ${manifest.fetch} not found`);
    for (const [key, embed] of Object.entries(manifest.embeds || {})) {
      if (!/^[A-Z_]+$/.test(key)) fail(`embed key ${key} must be UPPER_CASE`);
      if (!embed.file || !(await exists(join(root, embed.file)))) fail(`embed ${key} file ${embed.file} not found`);
    }
    for (const live of manifest.live_sources || []) if (!live.name || !live.url || !live.credit) fail("each live source needs name, url and credit");
    solutions.push({ ...manifest, dir });
  }
  return { registry, solutions, errors };
}

// Snapshot date of an embedded dataset, for the hub.
export function datasetDate(data) {
  return data.fetched_at || data.updated || null;
}
