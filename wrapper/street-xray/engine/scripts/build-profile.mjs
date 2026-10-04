// Build data/profile.json from data/demo-street.json and fail if it is invalid or stale.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assess, buildProfile, validateProfile } from "../src/profile.js";
import { toPageProfile } from "../src/to-page.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const street = JSON.parse(readFileSync(join(root, "data/demo-street.json"), "utf8"));
const profile = buildProfile(street);
const errors = validateProfile(profile);
if (errors.length) {
  console.error(errors.map((e) => `Error: ${e}`).join("\n"));
  process.exit(1);
}
const catalogue = JSON.parse(readFileSync(join(root, "../../sponge-catalogue/data/catalogue.json"), "utf8"));
const outputs = {
  "data/profile.json": profile,
  "data/kanonengasse.page.json": toPageProfile(profile, street, catalogue),
};
for (const [path, value] of Object.entries(outputs)) {
  const json = JSON.stringify(value, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(join(root, path), "utf8") !== json) {
      console.error(`Error: ${path} is stale; run npm run build`);
      process.exit(1);
    }
  } else writeFileSync(join(root, path), json);
}
const known = profile.fields.filter((f) => f.evidence !== "unknown").length;
console.log(`${profile.place.name}: ${known} known, ${profile.fields.length - known} unknown; ` +
  assess(profile).map((a) => `${a.id} ${a.state}`).join(", "));
