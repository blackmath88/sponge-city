// Composition root: the ONLY place that chooses implementations.
// Swap a module here (or via ?renderer=text / ?mode=execution-0.1) and nothing else changes.
import { AdaptiveInterfaceOrchestrator } from "../runtime/orchestrator.js";
import { parseSelection } from "../runtime/selection.js";
import { createMockPlaceProvider } from "../modules/mock-place-provider.js";
import { createMockKnowledgeProvider } from "../modules/mock-knowledge-provider.js";
import { createMockInterventionProvider } from "../modules/mock-intervention-provider.js";
import { createMockRenderer } from "../modules/mock-renderer.js";
import { createTextRenderer } from "../modules/text-renderer.js";

const loadJson = async path => (await fetch(new URL(path, import.meta.url))).json();

const [placeFixture, knowledge, catalogue, surfaces, scenarios] = await Promise.all([
  loadJson("../examples/demo-place.json"),
  loadJson("../catalogues/intervention-knowledge.json"),
  loadJson("../examples/demo-interventions.json"),
  loadJson("../catalogues/surfaces.json"),
  loadJson("../catalogues/scenarios.json")
]);

const params = new URLSearchParams(location.search);
const root = document.querySelector("#app");
const useText = params.get("renderer") === "text";
const legacy = params.get("mode") === "execution-0.1";

const app = new AdaptiveInterfaceOrchestrator({
  placeProvider: createMockPlaceProvider(placeFixture),                    // → real Basel PlaceProvider (PlaceModel 0.1)
  ...(legacy
    ? { interventionProvider: createMockInterventionProvider(catalogue) }  // PR #3 executable catalogue
    : { knowledgeProvider: createMockKnowledgeProvider(knowledge) }),      // → Basel research knowledge
  catalogues: { surfaces, scenarios },                                     // state-layer data
  renderer: useText ? createTextRenderer(root.appendChild(document.createElement("pre"))) : createMockRenderer(root) // → educational renderer
});

const { selection, errors } = parseSelection(params);
const model = await app.load(selection || placeFixture.selection);
if (errors.length) app.fail(`Selection ignored: ${errors.join("; ")}`);

const toggle = (key, value) => { const p = new URLSearchParams(params); p.get(key) === value ? p.delete(key) : p.set(key, value); return `?${p}`; };
document.querySelector("#renderer-switch").href = toggle("renderer", "text");
document.querySelector("#renderer-switch").textContent = useText ? "Switch to schematic renderer" : "Switch to text renderer";
document.querySelector("#mode-switch").href = toggle("mode", "execution-0.1");
document.querySelector("#mode-switch").textContent = legacy ? "State + knowledge path" : "PR #3 execution path";
window.adaptiveInterface = app; // for poking around in the console
console.info("Adaptive interface ready", model.mode, model.status);
