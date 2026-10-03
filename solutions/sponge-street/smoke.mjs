import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const dir = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(dir, "page.html"), "utf8");
const match = html.match(/<script id="sponge-logic">\s*([\s\S]*?)\s*<\/script>/);
if (!match) throw new Error("Sponge logic script not found.");

const context = vm.createContext({ console });
vm.runInContext(`${match[1]}\nthis.api = { TRACKS, T, COMBOS, FRAMES, BASE, EVENT, stagesAt, missing, model, frameOf };`, context, { filename: "sponge-street.html" });
const api = context.api;
const fail = message => { throw new Error(message); };

if (api.FRAMES.length !== 12) fail(`Expected 12 states, found ${api.FRAMES.length}.`);
if (api.TRACKS.length !== 7) fail(`Expected 7 intervention tracks, found ${api.TRACKS.length}.`);
if (!html.includes("not a hydraulic or thermal model")) fail("Page must state the model boundary.");
if (/fonts\.googleapis\.com/.test(html)) fail("Page should remain usable without remote fonts.");

const waterTotal = model => model.et + model.inf + model.hold + model.run;
for (const event of Object.keys(api.EVENT)) {
  for (let frame = 0; frame < api.FRAMES.length; frame += 1) {
    const state = api.stagesAt(frame);
    const model = api.model(state, event);
    if (Math.abs(waterTotal(model) - 100) > 1e-9) fail(`${event}/${frame}: water paths total ${waterTotal(model)}, expected 100.`);
    for (const key of ["et", "inf", "hold", "run"]) if (model[key] < 0) fail(`${event}/${frame}: ${key} is negative.`);
    if (api.frameOf(state) !== frame) fail(`State ladder does not round-trip at frame ${frame}.`);
  }
}

const grey = api.model(api.stagesAt(0), "heavy");
const sponge = api.model(api.stagesAt(11), "heavy");
if (!(sponge.run < grey.run && sponge.inf > grey.inf && sponge.et > grey.et && sponge.heat < grey.heat)) {
  fail("Final state must reduce runoff and heat while increasing infiltration and evapotranspiration.");
}

const isolated = api.stagesAt(0);
isolated.pipe = 2;
if (!api.missing("pipe", 2, isolated)) fail("Disconnected roof-to-tree state should expose its missing tree trench.");
const connected = { ...isolated, tree: 2 };
if (api.missing("pipe", 2, connected)) fail("Connected roof-to-tree state should satisfy its dependency.");
if (!(api.model(connected, "heavy").run < api.model(isolated, "heavy").run)) fail("Connection should improve the illustrative runoff result.");

const custom = { ...api.stagesAt(0), walk: 1, roof: 2 };
if (api.frameOf(custom) !== -1) fail("A free catalog combination should not masquerade as a timeline frame.");

for (const combo of api.COMBOS) {
  for (const [track, stage] of combo.parts) {
    if (!api.T[track] || stage >= api.T[track].stages.length) fail(`Combo ${combo.id} cites missing ${track}:${stage}.`);
  }
}

console.log(`Sponge Street smoke test passed: ${api.FRAMES.length} states, ${api.TRACKS.length} tracks, ${api.COMBOS.length} system links.`);
