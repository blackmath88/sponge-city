# Lab notes: Sie register and Street Lab edit persistence

## Register («Sie»)
- Rain Walk (`public/rain-walk/i18n.mjs`, DE) and Street Lab (`src/i18n.ts`, de) now use the formal «Sie», matching `journey/content/ui.json`. Swiss spelling kept; ids, source titles and quotations untouched. The HTML pages only use `data-i18n` keys, so nothing to change there.
- Terms: *Beobachtung* = a recorded observation (Rain Walk "Meldung" -> "Beobachtung"; Street Lab tag "Hinweise sammeln" -> "Beobachtungen sammeln"); *Hinweis* = a visible cue or data lead; *Fehler* is not used in these modules' user-facing text.
- Regression tests: `test/edit-state.test.ts` (Street Lab dictionary) and `test/rain-walk-register.test.ts` (Rain Walk DE) fail on du-forms (du, dein*, dir, dich and the imperatives Folge, Achte, Füge, Gib, Wähle, ...).

## Street Lab state across language switches
- Route chosen: persistence. `src/edit-state.ts` stores `{plan, depthMm}` in **sessionStorage** under `sponge.streetlab.edits.v1:<place id>` (`synthetic-demo-street` when no handoff). The record is marked `evidence: "synthetic"`, is language-independent, is validated on load (unknown depths, connection-without-garden and wrong evidence marker are rejected), and is removed when the state equals the default. Nothing exports it; it is never real-site evidence.
- Restored on load in `src/main.tsx`; saved on every plan/depth change. Playback frame, selected zone and compare toggle are intentionally not persisted.
- **Shell (journey/) needs no change** for correctness: the iframe reload now keeps edits. Caveat: the `site=` payload is localized, but the key uses only the place id (`site.id`), which is language-stable. Optional later improvement: stop reloading the Street Lab frame and rely on the existing `sponge-lang` postMessage (src/i18n.ts handles it), but then the localized `site=` text would stay in the old language.
- Not verified in a real browser; node tests only (28 pass in street-workspace; `tsc --noEmit` clean).
