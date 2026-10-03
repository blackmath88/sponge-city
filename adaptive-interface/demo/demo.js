// Composition root: the ONLY place that chooses implementations.
// Swap a module here (or via ?renderer=text) and nothing else changes.
import { AdaptiveInterfaceOrchestrator } from "../runtime/orchestrator.js";
import { parseSelection } from "../runtime/selection.js";
import { createMockPlaceProvider } from "../modules/mock-place-provider.js";
import { createMockInterventionProvider } from "../modules/mock-intervention-provider.js";
import { createMockRenderer } from "../modules/mock-renderer.js";
import { createTextRenderer } from "../modules/text-renderer.js";

const loadJson = async path => (await fetch(new URL(path, import.meta.url))).json();

const params = new URLSearchParams(location.search);
const useLegacyCatalogue = params.get("catalogue") === "legacy";

const [placeFixture, catalogue, surfaces, scenarios, routingAssumptions] = await Promise.all([
  loadJson("../examples/demo-place.json"),
  loadJson(useLegacyCatalogue ? "../examples/demo-interventions.json" : "../catalogues/intervention-knowledge.json"),
  loadJson("../catalogues/surfaces.json"),
  loadJson("../catalogues/scenarios.json"),
  loadJson("../examples/demo-routing.json")   // DEMO ONLY: assumed drainage; a real PlaceModel brings place.routing or nothing
]);

const root = document.querySelector("#app");
const useText = params.get("renderer") === "text";

const app = new AdaptiveInterfaceOrchestrator({
  placeProvider: createMockPlaceProvider(placeFixture),          // → real Basel PlaceProvider
  interventionProvider: createMockInterventionProvider(catalogue), // → Basel research knowledge (or ?catalogue=legacy for PR #3's 0.1 catalogue)
  renderer: useText ? createTextRenderer(root.appendChild(document.createElement("pre"))) : createMockRenderer(root), // → educational Street Slice renderer
  surfaces,                 // surface archetypes (assumed defaults)
  scenarios,                // heavy-rain / hot-day / hot-drought
  routingAssumptions        // explicit, demo-only, every edge "assumed"
});

const { selection, errors } = parseSelection(params);
const model = await app.load(selection || placeFixture.selection);
if (errors.length) app.fail(`Selection ignored: ${errors.join("; ")}`);

document.querySelector("#renderer-switch").href = `?${(() => { const p = new URLSearchParams(params); useText ? p.delete("renderer") : p.set("renderer", "text"); return p; })()}`;
document.querySelector("#renderer-switch").textContent = useText ? "Switch to schematic renderer" : "Switch to text renderer";
window.adaptiveInterface = app; // for poking around in the console
console.info("Adaptive interface ready", model.status);
