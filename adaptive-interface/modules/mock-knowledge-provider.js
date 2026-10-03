// MOCK KnowledgeProvider. Serves the researcher-facing intervention knowledge as-is.
// The Basel research team replaces the data (contracts/intervention-knowledge.schema.json);
// a provider that loads it from elsewhere only needs:
//
//   { async getKnowledge(place) → InterventionKnowledge }
//
// `place` is the PlaceModel, so a provider may filter or annotate records per place. It must not add
// executable operations or renderer fields; the runtime compiles those.

export function createMockKnowledgeProvider(knowledge) {
  if (!knowledge) throw new Error("createMockKnowledgeProvider needs a knowledge catalogue");
  return {
    name: "mock-knowledge-provider",
    async getKnowledge() {
      return JSON.parse(JSON.stringify(knowledge));
    }
  };
}
