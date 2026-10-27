// MOCK InterventionProvider. Serves a catalogue object as-is.
// The Basel research team replaces the catalogue data (contracts/intervention-catalog.schema.json);
// a provider that loads it from elsewhere only needs:
//
//   { async getCatalogue() → InterventionCatalogue }

export function createMockInterventionProvider(catalogue) {
  if (!catalogue) throw new Error("createMockInterventionProvider needs a catalogue");
  return {
    name: "mock-intervention-provider",
    async getCatalogue() {
      return JSON.parse(JSON.stringify(catalogue));
    }
  };
}
