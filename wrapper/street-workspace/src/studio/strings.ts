/**
 * German user-facing strings for the Studio.
 * One plain exported object, no i18n library.
 */
export const STUDIO_DE = {
  // Evidence and provenance
  evidence: "illustrative",
  evidenceLabel: "Visualisierung",
  evidenceDescription: "Diese Darstellung ist rein illustrativ und stellt keine vermessene Straßengeometrie oder Machbarkeitsprüfung dar.",

  // General
  studioTitle: "Straßen-Transformationsstudio",
  proposalA: "Variante A",
  proposalB: "Variante B",
  baseline: "Ausgangszustand",

  // Intervention kinds (from catalogue)
  intervention: {
    "tree-trench": "Baumrigole",
    "rain-garden": "Regenbeet",
    "depave": "Entsiegelung",
  },

  // Bands
  bands: {
    "gehweg-nord": "Gehweg Nord",
    "parkierung": "Parkierung",
    "fahrbahn": "Fahrbahn",
    "gehweg-sued": "Gehweg Süd",
  },

  // Actions
  addPlacement: "Hinzufügen",
  removePlacement: "Entfernen",
  togglePlacement: "Umschalten",
  cloneProposal: "Kopieren",
  revertProposal: "Zurücksetzen",
  resetState: "Alles zurücksetzen",

  // Messages
  unknownSlot: "Unbekannter Bereich",
  notAllowed: "Nicht erlaubt in diesem Bereich",
  slotOccupied: "Bereich bereits belegt",
  noPlacement: "Keine Platzierung gefunden",

  // Tooltips and help
  help: {
    schematic: "Schematische Darstellung – nicht maßstabsgetreu",
    illustrative: "Reine Visualisierung ohne reelle Daten",
    placement: "Platziere eine Maßnahme in einem Bereich",
  },

  // Validation
  validation: {
    invalidInput: "Ungültige Eingabe",
    parseError: "Die Daten konnten nicht gelesen werden",
  },

  // Storage
  storage: {
    loadError: "Fehler beim Laden der Daten",
    saveError: "Fehler beim Speichern der Daten",
    noData: "Keine gespeicherten Daten gefunden",
  },
} as const;
