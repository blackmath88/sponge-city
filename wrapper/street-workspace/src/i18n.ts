// Street Lab language layer (de/en). Self-contained: no imports from outside this package.
// Contract: ?lang=de|en, else localStorage "sponge.lang", else "de". Display strings only;
// ids, enum keys and the simulation are never translated.
import { useSyncExternalStore } from "react";

export type Lang = "de" | "en";
export const LANGS: readonly Lang[] = ["de", "en"];
export const DEFAULT_LANG: Lang = "de";
export const LANG_KEY = "sponge.lang";

const valid = (v: unknown): Lang | null => (v === "de" || v === "en" ? v : null);

type StorageLike = { getItem(key: string): string | null } | null | undefined;

export function resolveLang(search: string = "", storage?: StorageLike): Lang {
  try {
    const fromUrl = valid(new URLSearchParams(search).get("lang"));
    if (fromUrl) return fromUrl;
  } catch {
    /* fall through */
  }
  try {
    const fromStore = valid(storage?.getItem(LANG_KEY));
    if (fromStore) return fromStore;
  } catch {
    /* storage may be blocked */
  }
  return DEFAULT_LANG;
}

const en = {
  // chrome
  "brand.suffix": "/ STREET LAB",
  "journey.label": "Prototype journey",
  "journey.find": "1 · Find",
  "journey.test": "2 · Test",
  "journey.explain": "3 · Explain",
  "tag.version": "Illustrative scenario · v0.4",
  "tag.rainWalk": "Rain Walk · collect street evidence →",
  "lang.switch": "Language",
  "doc.title": "Sponge Street · Water connections",
  // intro
  "intro.eyebrow": "01 / UNDERSTAND THE CONNECTION",
  "intro.title": "A street, connected.",
  "intro.lead": "Give rain somewhere to go. Add a garden, open the kerb, then follow the water.",
  "place.selected": "SELECTED CANDIDATE",
  "place.inspired": "BASEL-INSPIRED",
  "place.syntheticName": "Synthetic demo street",
  "place.noSite": "No surveyed site selected",
  "place.contextOnly": "{district} · context only",
  // site handoff
  "site.aria": "Selected candidate context",
  "site.eyebrow": "HANDOFF FROM SITE SCOPING",
  "site.leads": "Evidence leads",
  "site.unknown": "Still unknown",
  "site.error": "The site handoff could not be read. Showing the synthetic demo street; no place is selected.",
  // design controls
  "design.aria": "Design your street",
  "design.eyebrow": "DESIGN YOUR STREET",
  "design.title": "Two changes. One connected system.",
  "iv.garden.titleOff": "Add a rain garden",
  "iv.garden.titleOn": "Rain garden added",
  "iv.garden.line1": "Replace the north parking strip.",
  "iv.garden.line2": "12 m³ storage · 3 spaces removed",
  "iv.connect.title": "Connect street runoff",
  "iv.connect.line1": "Open the kerb to feed the garden.",
  "iv.connect.line2": "Overflow still reaches the drain.",
  "iv.expl.sealed": "The sealed surfaces send all rainfall to the sewer. Start with one garden.",
  "iv.expl.isolated": "The garden catches rain falling on itself. Runoff from the rest of the street still bypasses it.",
  "iv.expl.connected": "Roof and street runoff now feed the garden. Water infiltrates into soil; once storage is full, the excess flows to the sewer.",
  "iv.err.needsGarden": "A runoff connection requires a rain garden.",
  "iv.err.baseline": "Expected an unmodified baseline.",
  "iv.err.parking": "This intervention needs the demo parking strip.",
  // workspace
  "ws.aria": "Street workspace",
  "view.baseline": "BASELINE / SEALED STREET",
  "view.yours": "YOUR STREET / {state}",
  "view.connected": "CONNECTED GARDEN",
  "view.isolated": "ISOLATED GARDEN",
  "view.sealed": "SEALED",
  "view.showYours": "Show your street",
  "view.compare": "Compare baseline",
  "legend.drainage": "Drainage",
  "legend.infiltration": "Infiltration",
  "legend.overflow": "Overflow",
  "legend.catchments": "All catchment links",
  "sel.area": "{area} m² · {material} · {n} parking spaces",
  "flow.aria": "Active water route",
  "flow.direct": "Roof & street → drain → sewer",
  "flow.garden": "Roof & street → garden → soil + overflow to sewer",
  "flow.isolatedNote": "Garden receives only rain on its own footprint.",
  "storm.pause": "Pause rain",
  "storm.replay": "Replay rain",
  "storm.continue": "Continue rain",
  "storm.run": "Run rain",
  "storm.rewind": "Rewind",
  "storm.rewindAria": "Rewind storm",
  "storm.depth": "Rain in 30 minutes",
  "storm.clock": "{t} / 30 min",
  "storm.progress": "Storm progress",
  "metrics.aria": "Current water balance",
  "metrics.rain": "Rain received",
  "metrics.held": "Held in garden",
  "metrics.soil": "Into soil",
  "metrics.sewer": "Into sewer",
  "balance.note": "Rain = stored + infiltrated + sewer · Results at minute {t}. Simulation time is accelerated.",
  // aside
  "aside.eyebrow": "FOLLOW THE WATER",
  "aside.title": "Where does the rain go?",
  "aside.sameMinute": "Same rain. Same minute:",
  "aside.sealedStreet": "Sealed street",
  "aside.yourDesign": "Your design",
  "aside.emptyHint": "Run rain or move the timeline to see water enter the system.",
  "aside.jumpEnd": "See complete storm",
  "forecast.end": "At the end of this storm",
  "forecast.less": "less water reaches the sewer than in the baseline",
  "forecast.path": "Water path",
  "forecast.before": "Before",
  "forecast.after": "After",
  "forecast.stored": "Stored",
  "forecast.infiltrated": "Infiltrated",
  "forecast.sewer": "Sewer",
  "forecast.note": "Volumes in m³ · illustrative parameters",
  "reset": "Reset street & rain",
  "wb.rain": "{v} m³ rain",
  "wb.stored": "Stored",
  "wb.soil": "Soil",
  "wb.sewer": "Sewer",
  "wb.storedAria": "{v} cubic metres stored",
  "wb.soilAria": "{v} cubic metres soil",
  "wb.sewerAria": "{v} cubic metres sewer",
  // details
  "details.eyebrow": "LOOK UNDER THE SURFACE",
  "details.title": "Every part has an identity.",
  "details.zonesAria": "Inspect zone",
  "dl.zone": "Zone",
  "dl.surface": "Surface",
  "dl.area": "Area",
  "dl.parking": "Parking spaces",
  "dl.ownership": "Ownership",
  "dl.ownershipUnknown": "Unknown — needs site evidence",
  "bounds.title": "Model boundaries",
  "bounds.text": "This is an explanation of connected water systems, not a hydraulic model or a site recommendation.",
  "bounds.inspect": "Inspect world data & water connections",
  // evidence layer
  "ev.eyebrow": "FROM DEMO TO DECISION SUPPORT",
  "ev.title": "Show the mechanism. Label the evidence.",
  "ev.text": "The diagram explains a connected system. Its exact volumes are demo parameters; source-backed guidance and real Basel inputs stay visibly separate.",
  "ev.drivenBy": "Driven by: {drivers}",
  "ev.routing": "Routing evidence",
  "ev.rule": "A selected candidate adds context only. It never creates pipes, gullies or flow paths.",
  "ev.refs": "Curb-opening references",
  "ev.dataEyebrow": "BASEL DATA ADAPTER / NEXT",
  "ev.dataTitle": "What can replace the demo inputs?",
  "footer.left": "SpongeSquad / Hack am Rhein 2026",
  "footer.right": "Site scoping → Street model → Interventions → Water paths",
  // mechanisms
  "mech.store.label": "STORE",
  "mech.absorb.label": "ABSORB",
  "mech.slow.label": "SLOW",
  "mech.store.on": "The garden holds water until its illustrative 12 m³ storage is full.",
  "mech.store.off": "There is no surface storage in the sealed baseline.",
  "mech.absorb.on": "Stored water enters the soil at the demo infiltration rate.",
  "mech.absorb.off": "Sealed surfaces provide no infiltration path in this model.",
  "mech.slow.connected": "The kerb opening redirects upstream runoff through the garden before overflow reaches the drain.",
  "mech.slow.isolated": "The garden is isolated, so street runoff still bypasses it.",
  "mech.slow.off": "Runoff follows the assumed direct route to the drain.",
  "state.supported": "supported",
  "state.illustrative": "illustrative",
  "state.unknown": "unknown",
  "state.assumed": "assumed",
  "state.observed": "observed",
  "state.available": "available",
  "state.gap": "gap",
  // scenario
  "route.note": "No open Basel sewer or gully network was found. Demo runoff routes are assumptions, never inferred from the selected candidate.",
  "assume.0": "Synthetic 60 × 30 m schematic, not a surveyed Basel street.",
  "assume.1": "All baseline catchments are sealed; rainfall is uniform, with no evaporation or travel delay.",
  "assume.2": "The garden replaces one 120 m² parking strip: 12 m³ storage and 4 m³/h infiltration.",
  "assume.3": "Three displaced parking spaces are a scenario assumption. Ownership and feasibility are unknown.",
  "assume.4": "Sewer is an unlimited sink. This model does not estimate flooding, heat or engineering suitability.",
  "zone.zone-0": "Roof catchment",
  "zone.zone-1": "North sidewalk",
  "zone.zone-2": "Three parking spaces",
  "zone.zone-3": "Street",
  "zone.zone-4": "South parking",
  "zone.zone-5": "South sidewalk",
  "node.downpipe": "Downpipe",
  "node.runoff": "Surface runoff",
  "node.drain": "Drain",
  "node.sewer": "Sewer",
  "node.soil": "Soil",
  "node.garden": "Rain garden",
  "kind.building": "building",
  "kind.sidewalk": "sidewalk",
  "kind.parking": "parking",
  "kind.road": "road",
  "mat.roof": "roof",
  "mat.paving": "paving",
  "mat.asphalt": "asphalt",
  "mat.vegetated-soil": "vegetated soil",
  "garden.name": "Rain garden",
  // knowledge: data readiness and design sources
  "data.0.label": "Street surfaces",
  "data.0.detail": "Basel cadastral land cover · dataset 100477",
  "data.1.label": "Trees",
  "data.1.detail": "Basel tree cadastre · dataset 100052",
  "data.2.label": "Groundwater protection",
  "data.2.detail": "Protection zones · dataset 100292",
  "data.3.label": "Sewer & gullies",
  "data.3.detail": "Not available as open street-scale data",
  "src.0.geography": "International guidance",
  "src.1.geography": "Ontario guidance · not Swiss",
  // diagram
  "diagram.title": "Interactive sponge street",
  "diagram.desc": "A schematic sixty by thirty metre street. Select a zone to inspect it. Blue lines show drainage, green lines infiltration and amber lines overflow.",
  "diagram.inspect": "Inspect {zone}",
  "diagram.gardenLabel": "RAIN GARDEN · FORMER PARKING",
  "diagram.caption": "PLAN VIEW / 60 × 30 M ILLUSTRATIVE BLOCK",
} as const;

export type Key = keyof typeof en;

const de: Record<Key, string> = {
  "brand.suffix": "/ STRASSENLABOR",
  "journey.label": "Ablauf des Prototyps",
  "journey.find": "1 · Finden",
  "journey.test": "2 · Testen",
  "journey.explain": "3 · Erklären",
  "tag.version": "Illustratives Szenario · v0.4",
  "tag.rainWalk": "Rain Walk · Hinweise auf der Strasse sammeln →",
  "lang.switch": "Sprache",
  "doc.title": "Schwammstrasse · Wasserverbindungen",
  "intro.eyebrow": "01 / DEN ZUSAMMENHANG VERSTEHEN",
  "intro.title": "Eine Strasse, verbunden.",
  "intro.lead": "Gib dem Regen einen Ort, wohin er fliessen kann. Füge einen Garten hinzu, öffne den Randstein und verfolge dann das Wasser.",
  "place.selected": "AUSGEWÄHLTER KANDIDAT",
  "place.inspired": "VON BASEL INSPIRIERT",
  "place.syntheticName": "Synthetische Demo-Strasse",
  "place.noSite": "Kein vermessener Standort gewählt",
  "place.contextOnly": "{district} · nur Kontext",
  "site.aria": "Kontext des gewählten Kandidaten",
  "site.eyebrow": "ÜBERGABE AUS DER STANDORTSUCHE",
  "site.leads": "Hinweise aus Daten",
  "site.unknown": "Noch unbekannt",
  "site.error": "Die Standortübergabe konnte nicht gelesen werden. Es wird die synthetische Demo-Strasse gezeigt; es ist kein Ort gewählt.",
  "design.aria": "Gestalte deine Strasse",
  "design.eyebrow": "GESTALTE DEINE STRASSE",
  "design.title": "Zwei Änderungen. Ein verbundenes System.",
  "iv.garden.titleOff": "Regengarten hinzufügen",
  "iv.garden.titleOn": "Regengarten hinzugefügt",
  "iv.garden.line1": "Ersetzt den nördlichen Parkstreifen.",
  "iv.garden.line2": "12 m³ Speicher · 3 Parkplätze entfallen",
  "iv.connect.title": "Strassenabfluss anschliessen",
  "iv.connect.line1": "Öffne den Randstein, damit Wasser in den Garten fliesst.",
  "iv.connect.line2": "Der Überlauf erreicht weiterhin den Ablauf.",
  "iv.expl.sealed": "Die versiegelten Flächen leiten den ganzen Regen in die Kanalisation. Beginne mit einem Garten.",
  "iv.expl.isolated": "Der Garten fängt nur den Regen auf, der auf ihn selbst fällt. Der Abfluss der übrigen Strasse läuft weiter an ihm vorbei.",
  "iv.expl.connected": "Der Abfluss von Dach und Strasse speist nun den Garten. Das Wasser versickert im Boden; ist der Speicher voll, fliesst der Rest in die Kanalisation.",
  "iv.err.needsGarden": "Ein Anschluss des Abflusses setzt einen Regengarten voraus.",
  "iv.err.baseline": "Eine unveränderte Ausgangslage wurde erwartet.",
  "iv.err.parking": "Diese Massnahme braucht den Demo-Parkstreifen.",
  "ws.aria": "Arbeitsfläche Strasse",
  "view.baseline": "AUSGANGSLAGE / VERSIEGELTE STRASSE",
  "view.yours": "DEINE STRASSE / {state}",
  "view.connected": "VERBUNDENER GARTEN",
  "view.isolated": "ABGETRENNTER GARTEN",
  "view.sealed": "VERSIEGELT",
  "view.showYours": "Deine Strasse zeigen",
  "view.compare": "Mit Ausgangslage vergleichen",
  "legend.drainage": "Entwässerung",
  "legend.infiltration": "Versickerung",
  "legend.overflow": "Überlauf",
  "legend.catchments": "Alle Einzugsgebiet-Verbindungen",
  "sel.area": "{area} m² · {material} · {n} Parkplätze",
  "flow.aria": "Aktiver Wasserweg",
  "flow.direct": "Dach und Strasse → Ablauf → Kanalisation",
  "flow.garden": "Dach und Strasse → Garten → Boden + Überlauf in die Kanalisation",
  "flow.isolatedNote": "Der Garten erhält nur den Regen auf seiner eigenen Fläche.",
  "storm.pause": "Regen pausieren",
  "storm.replay": "Regen wiederholen",
  "storm.continue": "Regen fortsetzen",
  "storm.run": "Regen starten",
  "storm.rewind": "Zurück",
  "storm.rewindAria": "Regen zurückspulen",
  "storm.depth": "Regen in 30 Minuten",
  "storm.clock": "{t} / 30 Min.",
  "storm.progress": "Fortschritt des Regens",
  "metrics.aria": "Aktuelle Wasserbilanz",
  "metrics.rain": "Gefallener Regen",
  "metrics.held": "Im Garten gespeichert",
  "metrics.soil": "In den Boden",
  "metrics.sewer": "In die Kanalisation",
  "balance.note": "Regen = gespeichert + versickert + Kanalisation · Ergebnisse bei Minute {t}. Die Simulationszeit ist beschleunigt.",
  "aside.eyebrow": "DEM WASSER FOLGEN",
  "aside.title": "Wohin fliesst der Regen?",
  "aside.sameMinute": "Gleicher Regen. Gleiche Minute:",
  "aside.sealedStreet": "Versiegelte Strasse",
  "aside.yourDesign": "Dein Entwurf",
  "aside.emptyHint": "Starte den Regen oder verschiebe den Zeitstrahl, um zu sehen, wie Wasser ins System gelangt.",
  "aside.jumpEnd": "Ganzen Regen zeigen",
  "forecast.end": "Am Ende dieses Regens",
  "forecast.less": "weniger Wasser erreicht die Kanalisation als in der Ausgangslage",
  "forecast.path": "Wasserweg",
  "forecast.before": "Vorher",
  "forecast.after": "Nachher",
  "forecast.stored": "Gespeichert",
  "forecast.infiltrated": "Versickert",
  "forecast.sewer": "Kanalisation",
  "forecast.note": "Mengen in m³ · illustrative Parameter",
  "reset": "Strasse und Regen zurücksetzen",
  "wb.rain": "{v} m³ Regen",
  "wb.stored": "Gespeichert",
  "wb.soil": "Boden",
  "wb.sewer": "Kanalisation",
  "wb.storedAria": "{v} Kubikmeter gespeichert",
  "wb.soilAria": "{v} Kubikmeter im Boden",
  "wb.sewerAria": "{v} Kubikmeter in der Kanalisation",
  "details.eyebrow": "UNTER DIE OBERFLÄCHE SCHAUEN",
  "details.title": "Jeder Teil hat eine Identität.",
  "details.zonesAria": "Zone untersuchen",
  "dl.zone": "Zone",
  "dl.surface": "Oberfläche",
  "dl.area": "Fläche",
  "dl.parking": "Parkplätze",
  "dl.ownership": "Eigentum",
  "dl.ownershipUnknown": "Unbekannt — braucht Belege vor Ort",
  "bounds.title": "Grenzen des Modells",
  "bounds.text": "Das ist eine Erklärung verbundener Wassersysteme, kein hydraulisches Modell und keine Standortempfehlung.",
  "bounds.inspect": "Modelldaten und Wasserverbindungen ansehen",
  "ev.eyebrow": "VON DER DEMO ZUR ENTSCHEIDUNGSHILFE",
  "ev.title": "Den Mechanismus zeigen. Die Belege kennzeichnen.",
  "ev.text": "Das Diagramm erklärt ein verbundenes System. Die genauen Mengen sind Demo-Parameter; belegte Richtlinien und echte Basler Daten bleiben sichtbar getrennt.",
  "ev.drivenBy": "Bestimmt durch: {drivers}",
  "ev.routing": "Belege zur Wasserführung",
  "ev.rule": "Ein gewählter Kandidat liefert nur Kontext. Er erzeugt nie Leitungen, Strassenabläufe oder Fliesswege.",
  "ev.refs": "Referenzen zu Randstein-Öffnungen",
  "ev.dataEyebrow": "BASLER DATENANBINDUNG / ALS NÄCHSTES",
  "ev.dataTitle": "Was kann die Demo-Eingaben ersetzen?",
  "footer.left": "SpongeSquad / Hack am Rhein 2026",
  "footer.right": "Standortsuche → Strassenmodell → Massnahmen → Wasserwege",
  "mech.store.label": "SPEICHERN",
  "mech.absorb.label": "VERSICKERN",
  "mech.slow.label": "VERLANGSAMEN",
  "mech.store.on": "Der Garten hält Wasser zurück, bis sein illustrativer Speicher von 12 m³ voll ist.",
  "mech.store.off": "In der versiegelten Ausgangslage gibt es keinen Speicher an der Oberfläche.",
  "mech.absorb.on": "Gespeichertes Wasser dringt mit der Versickerungsrate der Demo in den Boden.",
  "mech.absorb.off": "Versiegelte Flächen bieten in diesem Modell keinen Versickerungsweg.",
  "mech.slow.connected": "Die Randstein-Öffnung leitet den Abfluss von oberhalb durch den Garten, bevor der Überlauf den Ablauf erreicht.",
  "mech.slow.isolated": "Der Garten ist abgetrennt, daher läuft der Strassenabfluss weiter an ihm vorbei.",
  "mech.slow.off": "Der Abfluss folgt dem angenommenen direkten Weg zum Ablauf.",
  "state.supported": "belegt",
  "state.illustrative": "illustrativ",
  "state.unknown": "unbekannt",
  "state.assumed": "angenommen",
  "state.observed": "beobachtet",
  "state.available": "verfügbar",
  "state.gap": "Lücke",
  "route.note": "Es wurde kein offenes Basler Kanal- oder Strassenablaufnetz gefunden. Die Abflusswege der Demo sind Annahmen und werden nie aus dem gewählten Kandidaten abgeleitet.",
  "assume.0": "Synthetisches Schema von 60 × 30 m, keine vermessene Basler Strasse.",
  "assume.1": "Alle Einzugsgebiete der Ausgangslage sind versiegelt; der Regen fällt gleichmässig, ohne Verdunstung und ohne Fliesszeit.",
  "assume.2": "Der Garten ersetzt einen Parkstreifen von 120 m²: 12 m³ Speicher und 4 m³/h Versickerung.",
  "assume.3": "Drei entfallende Parkplätze sind eine Annahme des Szenarios. Eigentum und Machbarkeit sind unbekannt.",
  "assume.4": "Die Kanalisation ist eine unbegrenzte Senke. Das Modell schätzt weder Überflutung noch Hitze noch die technische Eignung.",
  "zone.zone-0": "Dach-Einzugsgebiet",
  "zone.zone-1": "Trottoir Nord",
  "zone.zone-2": "Drei Parkplätze",
  "zone.zone-3": "Strasse",
  "zone.zone-4": "Parkplätze Süd",
  "zone.zone-5": "Trottoir Süd",
  "node.downpipe": "Fallrohr",
  "node.runoff": "Oberflächenabfluss",
  "node.drain": "Ablauf",
  "node.sewer": "Kanalisation",
  "node.soil": "Boden",
  "node.garden": "Regengarten",
  "kind.building": "Gebäude",
  "kind.sidewalk": "Trottoir",
  "kind.parking": "Parkierung",
  "kind.road": "Strasse",
  "mat.roof": "Dach",
  "mat.paving": "Pflaster",
  "mat.asphalt": "Asphalt",
  "mat.vegetated-soil": "bewachsener Boden",
  "garden.name": "Regengarten",
  "data.0.label": "Strassenoberflächen",
  "data.0.detail": "Bodenbedeckung (Kataster) Basel · Datensatz 100477",
  "data.1.label": "Bäume",
  "data.1.detail": "Baumkataster Basel · Datensatz 100052",
  "data.2.label": "Grundwasserschutz",
  "data.2.detail": "Schutzzonen · Datensatz 100292",
  "data.3.label": "Kanalisation und Strassenabläufe",
  "data.3.detail": "Nicht als offene Daten auf Strassenebene verfügbar",
  "src.0.geography": "Internationale Richtlinie",
  "src.1.geography": "Richtlinie aus Ontario · nicht schweizerisch",
  "diagram.title": "Interaktive Schwammstrasse",
  "diagram.desc": "Eine schematische Strasse von sechzig mal dreissig Metern. Wähle eine Zone, um sie zu untersuchen. Blaue Linien zeigen die Entwässerung, grüne Linien die Versickerung und gelbe Linien den Überlauf.",
  "diagram.inspect": "{zone} untersuchen",
  "diagram.gardenLabel": "REGENGARTEN · EHEMALIGE PARKPLÄTZE",
  "diagram.caption": "GRUNDRISS / 60 × 30 M ILLUSTRATIVER BLOCK",
};

export const DICTIONARIES: Record<Lang, Record<Key, string>> = { en, de };

export function translate(
  lang: Lang,
  key: Key,
  vars: Record<string, string | number> = {},
): string {
  return DICTIONARIES[lang][key].replace(/\{(\w+)\}/g, (m, name) =>
    name in vars ? String(vars[name]) : m,
  );
}

/** Localize a dynamic id-based key; falls back to the given English text when unknown. */
export function translateDynamic(lang: Lang, key: string, fallback: string): string {
  return key in en ? translate(lang, key as Key) : fallback;
}

// ---- language state (module singleton, React-subscribable) ----
const listeners = new Set<() => void>();
let current: Lang = DEFAULT_LANG;
let storage: Storage | null = null;

function applyDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = current;
}

export function initLang(win: Window = window): Lang {
  try {
    storage = win.localStorage;
  } catch {
    storage = null;
  }
  current = resolveLang(win.location.search, storage);
  if (new URLSearchParams(win.location.search).get("embedded") === "1")
    win.document.documentElement.classList.add("embedded");
  applyDocument();
  win.addEventListener("message", (e: MessageEvent) => {
    if (e.origin === location.origin && e.data?.type === "sponge-lang") setLang(e.data.lang);
  });
  return current;
}

export function setLang(next: unknown, win: Window | undefined = typeof window === "undefined" ? undefined : window) {
  const lang = valid(next);
  if (!lang) return;
  current = lang;
  try {
    (storage as Storage | null)?.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  try {
    if (win) {
      const u = new URL(win.location.href);
      u.searchParams.set("lang", lang);
      win.history.replaceState(null, "", u);
    }
  } catch {
    /* ignore */
  }
  applyDocument();
  listeners.forEach((l) => l());
}

export const getLang = (): Lang => current;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLang(): {
  lang: Lang;
  t: (key: Key, vars?: Record<string, string | number>) => string;
} {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return { lang, t: (key, vars) => translate(lang, key, vars) };
}

/** Keep language (and embedded) when linking to sibling pages. */
export function withLang(href: string, lang: Lang, search: string = ""): string {
  const keep = new URLSearchParams();
  if (new URLSearchParams(search).get("embedded") === "1") keep.set("embedded", "1");
  keep.set("lang", lang);
  const [base, hash = ""] = href.split("#");
  const [path] = base.split("?");
  return `${path}?${keep.toString()}${hash ? `#${hash}` : ""}`;
}

// ---- display lookups next to the data (ids are never renamed) ----
type ZoneLike = { id: string; label: string };
export const zoneLabel = (lang: Lang, zone: ZoneLike) =>
  translateDynamic(lang, `zone.${zone.id}`, zone.label);
export const nodeLabel = (lang: Lang, node: ZoneLike) =>
  translateDynamic(lang, `node.${node.id}`, node.label);
export const kindLabel = (lang: Lang, kind: string) =>
  translateDynamic(lang, `kind.${kind}`, kind);
export const materialLabel = (lang: Lang, material: string) =>
  translateDynamic(lang, `mat.${material}`, material.replaceAll("-", " "));
export const stateLabel = (lang: Lang, state: string) =>
  translateDynamic(lang, `state.${state}`, state);

/** Localize the demo scenario's assumption list; unknown lists pass through unchanged. */
export function assumptionTexts(lang: Lang, assumptions: string[]): string[] {
  return assumptions.map((text, i) =>
    text === en[`assume.${i}` as Key] ? translate(lang, `assume.${i}` as Key) : text,
  );
}
export const routingNote = (lang: Lang, note: string) =>
  note === en["route.note"] ? translate(lang, "route.note") : note;

/** Localize known intervention errors by their English message; others pass through. */
export function errorText(lang: Lang, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const known = (["iv.err.needsGarden", "iv.err.baseline", "iv.err.parking"] as const).find(
    (k) => en[k] === message,
  );
  return known ? translate(lang, known) : message;
}
