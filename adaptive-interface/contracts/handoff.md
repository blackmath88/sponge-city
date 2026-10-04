# Situation Map → Adaptive Interface handoff

The Situation Map answers *what do we know about this place?* The Adaptive Interface starts once a place is chosen and answers *what does that mean here, and what might it become?*

## Preferred contract: a location in the URL

```text
adaptive-interface/demo/index.html?lat=47.57350&lon=7.57410&radius=50&from=situation-map&place_id=point-7.57410-47.57350
```

| Param | Required | Meaning |
|---|---|---|
| `lat`, `lon` | yes | WGS84, 5 decimals (≈1 m) |
| `radius` | no | metres, default 50, clamped to 10–250 |
| `from` | no | where the user came from (`situation-map`) |
| `place_id` | no | `place_id` of the Situation Map's `place-profile/draft-0`, for traceability only |

Parsed by `runtime/selection.js` (`parseSelection`, `handoffUrl`) into:

```json
{ "lon": 7.5741, "lat": 47.5735, "radius_m": 50, "from": "situation-map", "place_profile_id": "point-7.57410-47.57350" }
```

That object is what `placeProvider.getPlace(selection)` receives.

## Why a location, not the Place Profile

- The Place Profile (`place-profile/draft-0`) is a **screening summary**: need/possibility slots for a point. The PlaceModel needs **geometry** (elements, surfaces, areas). The PlaceProvider must fetch that itself; passing the profile would tempt us to render from screening data.
- URLs stay short, shareable and bookmarkable, like the Situation Map's own state.
- Either side can change independently: the map can add layers, the provider can add sources.

If the provider later wants the screening context (heat focus class, runoff class), it should recompute it from the same sources or call a shared service, keyed by the selection, not parse the URL.

## In the Situation Map today

The place lens has an **Open in Sponge View** link that builds this URL with `radius=25` (the lens radius). Nothing else in the map changed.

With the mock provider, every selection returns the same demo fixture; the demo states this in its provenance banner.
