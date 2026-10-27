// MOCK PlaceProvider. Returns the hand-authored demo street for any selection.
// The real Basel provider implements the same one-method interface:
//
//   { async getPlace(selection) → PlaceModel }   (contracts/place-model.schema.json)
//
// It must not leak data.bs.ch / WMS / OSM field names into the PlaceModel.

export function createMockPlaceProvider(fixture) {
  if (!fixture) throw new Error("createMockPlaceProvider needs a fixture PlaceModel");
  return {
    name: "mock-place-provider",
    async getPlace(selection) {
      const place = JSON.parse(JSON.stringify(fixture));
      if (selection) {
        // Echo the requested selection, but say plainly that the geometry did not come from it.
        place.selection = { ...place.selection, ...selection };
        place.provenance.push({
          id: "selection",
          kind: "selection",
          label: "Requested selection",
          note: `Requested ${selection.lat?.toFixed?.(5)}, ${selection.lon?.toFixed?.(5)} (r=${selection.radius_m} m)${selection.from ? ` from ${selection.from}` : ""}. The mock provider ignores the location and always returns the demo fixture.`
        });
      }
      return place;
    }
  };
}
