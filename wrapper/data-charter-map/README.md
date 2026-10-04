# Data Charter map

Port of Claude's `blackmath88/sponge-city` Data Charter solution into the integration wrapper.

Source branch: `feat/data-charter-map`
Source commit: `99ee7f669f49cf834bdd533afcc39c5057d1f5e0`

The module keeps four things separate:

- published evidence and official models;
- explicitly inferred values with their methods;
- information that exists but is gated by access, ownership or project purpose;
- evidence that genuinely requires a site check, new measurement or further investigation.

The access question is now explicit: **who is the gatekeeper, what unlocks the evidence, and which decision is blocked until then?** See [The data question: access, gatekeepers and true unknowns](docs/GATEKEEPERS.md).

## Run

```bash
npm run dev --prefix wrapper/data-charter-map
```

Open `http://localhost:5175/wrapper/data-charter-map/`.

## Verify and refresh

```bash
npm test --prefix wrapper/data-charter-map
npm run fetch --prefix wrapper/data-charter-map
```

`fetch` calls the live Basel APIs, replaces the snapshot and reruns the build and smoke test. The checked-in snapshot keeps the demo reproducible without those point-data API calls; WMS/WMTS map layers still require internet access.

## Typed inference claims

Every inferred layer has one claim in `data/data-charter.json` (`claims[]`): evidence class (derived or modelled), method, inputs, spatial and temporal resolution, validation, limitations and permitted use. All four current claims are **not validated** and may only be used to **explain** or **screen**. The map shows this beside each inferred layer and in popups; the smoke test enforces it. See [ADR 0007](../docs/adr/0007-data-charter-inferences-are-typed-claims.md).

`missing` means no open data was found in the reviewed Basel and federal sources; `restricted` means the data is expected to exist (an assumption, with its basis stated) but was not found as open data.

## Integration boundary

The charter describes city-wide data availability. It does not directly populate Street Lab. A future adapter may transfer a site-specific evidence claim only when it declares its method, inputs, validation, permitted use and limitations. A possible `candidate-site-context.v2` with an optional `claims` array is proposed in ADR 0007 but not implemented; it needs agreement from the integration, site-scoping and Street Lab owners.
