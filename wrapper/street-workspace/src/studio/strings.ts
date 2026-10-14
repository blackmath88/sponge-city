/**
 * German user-facing strings for the Studio (Swiss German spelling).
 * One plain exported object, no i18n library.
 */
export const STUDIO_DE = {
  // Evidence and provenance
  evidenceLabel: "Visualisierung",
  evidenceDescription: "Diese Darstellung ist rein illustrativ und stellt keine vermessene Strassengeometrie oder Machbarkeitspruefung dar.",

  // General
  studioTitle: "Strassen-Transformationsstudio",
  proposalA: "Variante A",
  proposalB: "Variante B",
  baseline: "Ausgangszustand",

  // Intervention kinds (from catalogue)
  intervention: {
    "tree-trench": "Baumrigole",
    "rain-garden": "Regengarten",
    "depave": "Entsiegelung",
  },

  // Bands
  bands: {
    "gehweg-nord": "Gehweg Nord",
    "parkierung": "Parkierung",
    "fahrbahn": "Fahrbahn",
    "gehweg-sued": "Gehweg Sued",
  },

  // Actions
  addPlacement: "Hinzufuegen",
  removePlacement: "Entfernen",
  togglePlacement: "Umschalten",
  cloneProposal: "Kopieren",
  revertProposal: "Zuruecksetzen",
  resetState: "Alles zuruecksetzen",

  // Messages
  unknownSlot: "Unbekannter Bereich",
  notAllowed: "Nicht erlaubt in diesem Bereich",
  slotOccupied: "Bereich bereits belegt",
  noPlacement: "Keine Platzierung gefunden",

  // Tooltips and help
  help: {
    schematic: "Schematische Darstellung – nicht massstabsgetreu",
    illustrative: "Reine Visualisierung ohne gemessene Daten",
    placement: "Platziere eine Massnahme in einem Bereich",
  },

  // Validation
  validation: {
    invalidInput: "Ungueltige Eingabe",
    parseError: "Die Daten konnten nicht gelesen werden",
  },

  // Storage
  storage: {
    loadError: "Fehler beim Laden der Daten",
    saveError: "Fehler beim Speichern der Daten",
    noData: "Keine gespeicherten Daten gefunden",
  },
} as const;
