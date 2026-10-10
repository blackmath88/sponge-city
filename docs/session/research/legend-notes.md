# Legend label polish: Basel, Berlin, Copenhagen

Scope: `items[].label.de/en` in `data/maps/{basel,berlin,copenhagen}/layers.json`. `items[].value`, `legend.property`, colours, geometry, ids, licences, URLs, origin, dates and coverage are unchanged (labels only, plus one limitations phrase for Copenhagen green roofs).

Rules applied
- German with umlauts and Swiss spelling (ss, no ß); English plain.
- Publisher class path is shown as meaning, not as raw key: `befestigt.Strasse_Weg` -> "Strasse/Weg (befestigt)" / "Road/path (paved)". The word "befestigt"/"humusiert" stays as a bracketed qualifier, so classes with the same base term (e.g. the five paved classes sharing one colour) remain distinguishable.
- "(publisher class, German)" suffixes removed; no class merged or dropped.
- Danish publisher categories (Copenhagen): translation first, Danish original in brackets for plans/roads/basins, so the source term stays traceable; the long tree-status sentences are translated and not repeated in the original.
- Berlin sealing: "Versiegelungsgrad > 5–10 %" -> "> 5–10 % versiegelt" / "> 5–10 % sealed" (no repeated word).

Judgement calls
- Basel "humusiert" is rendered "humus-covered" (survey class for topsoil-covered land; not claimed to be vegetated or permeable).
- Copenhagen green roofs: "Primært/Supplerende Grønt tag" -> primary/secondary roof construction, following the publisher's method text; no claim about green share of the roof.
- "Uvdielse af åen" is kept verbatim ("spelling as published"); not corrected to a guessed word.
- Titles and limitations already read naturally and keep origin honest (Berlin heat = modelled, Copenhagen plan layers = planned, "not what is built"); not changed.

Check: `node --test tests/city-data.test.mjs tests/map.test.mjs` passes (15/15).
