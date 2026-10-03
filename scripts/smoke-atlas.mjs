import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(join(root, "prototype", "evidence-atlas.html"), "utf8");
const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
if (!match) throw new Error("Atlas script not found.");

const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) {
    elements.set(selector, {
      value: "",
      textContent: "",
      innerHTML: "",
      dataset: {},
      addEventListener() {},
      scrollIntoView() {},
      classList: { toggle() {} }
    });
  }
  return elements.get(selector);
};

const context = vm.createContext({
  console,
  navigator: { clipboard: { writeText: async () => {} } },
  window: { print() {} },
  document: {
    querySelector: element,
    querySelectorAll: () => [],
    documentElement: { scrollWidth: 1200 }
  }
});

vm.runInContext(match[1], context, { filename: "evidence-atlas.html" });

const startingCards = (element("#results").innerHTML.match(/class="card"/g) || []).length;
if (startingCards !== 8) throw new Error(`Expected 8 starting cards, found ${startingCards}.`);

vm.runInContext("state.query = 'private renovation incentive permit'; runSearch();", context);
if (!element("#results").innerHTML.includes("How should sponge-city measures enter a private renovation?")) {
  throw new Error("Private-renovation query did not retrieve its decision route.");
}

vm.runInContext("state.query = 'Basel open datasets'; runSearch();", context);
if (!element("#results").innerHTML.includes("Which Basel open datasets can the Canvas use now?")) {
  throw new Error("Open-data query did not retrieve the verified dataset record.");
}

if ((element("#maturity-levels").innerHTML.match(/class="maturity-card"/g) || []).length !== 4) {
  throw new Error("Evidence maturity ladder did not render four levels.");
}

vm.runInContext("state.routeContext = 'planned-renewal'; state.routeOwnership = 'private'; renderRoute();", context);
if (!element("#route-card").innerHTML.includes("permit-triggered review where legally applicable")) {
  throw new Error("Private-renovation route did not render its permit and incentive levers.");
}

if (!element("#brief-text").textContent.includes("Planned renewal · Private ownership")) {
  throw new Error("Working brief did not follow the selected decision route.");
}

console.log("Atlas UI logic smoke test passed.");
