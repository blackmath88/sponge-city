// Rain Walk language layer. Self-contained copy of the shared contract (shared/lang.js lives at a different
// relative path in the built site): active language = URL ?lang=de|en, else localStorage "sponge.lang", else "de".
export const LANGS = ['de', 'en'];
export const DEFAULT_LANG = 'de';
export const LANG_KEY = 'sponge.lang';
const valid = v => (LANGS.includes(v) ? v : null);

export function resolveLang(search = '', storage = null) {
  try {
    const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ''));
    const u = valid(params.get('lang'));
    if (u) return u;
  } catch { /* fall through */ }
  try {
    const s = valid(storage && storage.getItem(LANG_KEY));
    if (s) return s;
  } catch { /* storage may be blocked */ }
  return DEFAULT_LANG;
}
export function persistLang(lang, storage = null) {
  const v = valid(lang) || DEFAULT_LANG;
  try { if (storage) storage.setItem(LANG_KEY, v); } catch { /* ignore */ }
  return v;
}

// Stored English default place name (kept as the stored value so existing saved state stays valid).
export const DEFAULT_PLACE = 'Demo street — no surveyed location';
export const SEED_NOTE = 'Synthetic practice clue; no photograph or field visit.';
export const RAIN_KEYS = {unknown: 'unknown', 'Water enters': 'enters', 'Water pools': 'pools', 'Water crosses': 'crosses'};
export const KIND_IDS = ['inlet', 'cover', 'tree', 'sealed', 'green', 'ponding', 'constraint', 'opportunity'];
export const REVIEW_IDS = ['pending', 'accepted', 'uncertain', 'rejected', 'clarification'];

export const EN = {
  'title.main': 'Rain Walk · SpongeSquad',
  'title.refs': 'Citizen science precedents · Rain Walk',
  'brand': 'SPONGE SQUAD / STREET LAB',
  'tag': 'UNDERSTAND → DECIDE',
  'lang.switch': 'Language',
  'eyebrow': 'STREET EVIDENCE CAMPAIGN',
  'h1': 'What does the street tell us?',
  'intro': 'Follow the rain. Notice the gaps. Help build a clearer picture of what needs checking next.',
  'notice.demo': 'Demo campaign · Synthetic 120 m segment · No surveyed Basel site selected',
  'ctx.boundary': 'Selected place identity only. Positions refer to the 120 m practice layout, not measured street coordinates.',
  'nav.aria': 'Campaign',
  'tab.walk': '01 · Observe',
  'tab.review': '02 · Review',
  'tab.passport': '03 · Evidence passport',
  'walk.h': 'Walk a short stretch',
  'walk.step1': 'Note your street and start point.',
  'walk.step2': 'Look at the pavement edge.',
  'walk.step3': 'Look for visible inlets and covers.',
  'walk.step4': 'Look at a tree pit or planted area.',
  'walk.step5': 'Record one opportunity or constraint.',
  'walk.safety': 'Stay on public footways. Photograph only material you may use; avoid identifiable people and number plates.',
  'street.aria': 'Schematic observation positions',
  'street.note': 'Approximate distance from your chosen start. Schematic, not a map or survey.',
  'form.h': 'Add an observation',
  'f.place': 'Street / start point (unverified)',
  'place.ph': 'Demo street — no surveyed location',
  'place.default': 'Demo street — no surveyed location',
  'f.kind': 'What is visible?',
  'f.dist': 'Approximate distance along segment:',
  'f.conf': 'How certain are you?',
  'conf.low': 'Not sure',
  'conf.medium': 'Probably',
  'conf.high': 'Certain about appearance',
  'f.rain': 'What did you observe in rain?',
  'rain.unknown': 'I do not know / no rain observation',
  'rain.enters': 'Water enters',
  'rain.pools': 'Water pools',
  'rain.crosses': 'Water crosses',
  'f.time': 'Observation time',
  'f.note': 'Notes / rain conditions',
  'note.ph': 'Describe what you actually saw.',
  'f.photo': 'Optional photo (JPEG, PNG or WebP, max 1 MB)',
  'form.local': 'Saved in this browser only. Photos are included in your JSON export. Nothing is sent to the city.',
  'form.submit': 'Add to review queue',
  'review.h': 'Review the visible clue',
  'review.intro': 'Acceptance confirms only the visible interpretation. Demo clues remain demo data after review.',
  'filter.label': 'Filter',
  'filter.all': 'All observations',
  'filter.pending': 'Pending review',
  'filter.accepted': 'Accepted',
  'filter.uncertain': 'Uncertain',
  'filter.rejected': 'Rejected',
  'filter.clarification': 'Specialist clarification',
  'passport.eyebrow': 'STREET EVIDENCE PASSPORT',
  'passport.h': 'See clearly. Ask precisely.',
  'poss.h': 'Three possibilities to investigate',
  'poss.a.h': 'A · Space below',
  'poss.a.p': 'Explore tree trenches or bioswales if utility, soil and design investigations support excavation.',
  'poss.b.h': 'B · Shallow sponge',
  'poss.b.p': 'Explore shallow planting and surface storage if space, overflow and accessibility checks support them.',
  'poss.c.h': 'C · No-dig cooling',
  'poss.c.p': 'Explore shade or movable planting, subject to ownership, access, safety and maintenance checks.',
  'poss.note': 'These are conditional discussion branches, not recommendations. No observation automatically changes the Street Lab geometry or water model.',
  'export.json': 'Export passport JSON',
  'export.brief': 'Download field-check brief',
  'link.studio': 'Explore the illustrative Street Lab →',
  'link.refs': 'Citizen-science precedents · projects we can learn from →',
  'footer.local': 'Local prototype · Export to keep or share your work.',
  'reset': 'Reset demo',
  'reset.ctx': 'Reset observations',
  'reset.confirm': 'Reset observations for this context? Export first to keep your work.',
  'save.ok': 'Saved on this device only. Export to share.',
  'save.fail': 'Could not save locally (storage unavailable or full). Export now to keep this session.',
  'save.unreadable': 'Stored data could not be read. Demo loaded; export before resetting.',
  'save.unavailable': 'Local storage unavailable or unreadable. Export to retain your work.',
  'err.photo': 'Choose a JPEG, PNG or WebP photo smaller than 1 MB.',
  'err.photoRead': 'Photo could not be read.',
  'err.time': 'Enter an observation time.',
  'err.note': 'Describe what you saw.',
  'obs.added': 'Observation added, pending review.',
  'badge.demo': 'SYNTHETIC DEMO',
  'badge.community': 'COMMUNITY OBSERVATION',
  'obs.noPhoto': 'No photograph. Text-only review; not image confirmation.',
  'obs.photoAlt': 'Contributor photograph of the reported clue',
  'obs.observed': 'Observed',
  'obs.noObs': 'No actual observation — demo',
  'obs.confidence': 'Confidence',
  'obs.appearance': 'appearance only',
  'obs.rain': 'Rain',
  'obs.support': 'Can support',
  'obs.cannot': 'Cannot establish',
  'street.btnTitle': 'Observation',
  'review.outcome': 'Review outcome',
  'review.reason': 'Reason / evidence inspected',
  'review.reason.ph': 'Explain the interpretation or uncertainty',
  'review.record': 'Record review',
  'review.history': 'Review history',
  'queue.empty': 'No observations in this filter.',
  'rv.pending': 'Pending review',
  'rv.accepted': 'Visible clue accepted',
  'rv.uncertain': 'Needs another observation',
  'rv.rejected': 'Rejected / misclassified',
  'rv.clarification': 'Needs specialist clarification',
  'seed.note': SEED_NOTE,
  'mission.0.t': 'Follow the rain', 'mission.0.d': 'Look for inlets, pooling and water traces.',
  'mission.1.t': 'Find the sponge', 'mission.1.d': 'Look for tree pits and planted areas.',
  'mission.2.t': 'Find the hard edge', 'mission.2.d': 'Look for long sealed-looking surfaces.',
  'mission.3.t': 'Find the constraint', 'mission.3.d': 'Look for narrow passages and obstructions.',
  'kind.inlet.label': 'Possible inlet', 'kind.inlet.support': 'Visible surface structure', 'kind.inlet.cannot': 'Network connection, pipe depth or capacity', 'kind.inlet.check': 'Ask drainage owner to check connection and condition',
  'kind.cover.label': 'Cover / manhole', 'kind.cover.support': 'Visible cover', 'kind.cover.cannot': 'Asset owner or underground route', 'kind.cover.check': 'Identify the responsible asset owner',
  'kind.tree.label': 'Tree pit', 'kind.tree.support': 'Apparent planting condition', 'kind.tree.cannot': 'Root volume or soil health', 'kind.tree.check': 'Check soil and rooting space',
  'kind.sealed.label': 'Sealed-looking surface', 'kind.sealed.support': 'Surface appearance', 'kind.sealed.cannot': 'Infiltration rate or sub-base', 'kind.sealed.check': 'Measure area and investigate pavement construction',
  'kind.green.label': 'Green / permeable-looking surface', 'kind.green.support': 'Visible vegetation or surface appearance', 'kind.green.cannot': 'Permeability or storage capacity', 'kind.green.check': 'Check soil permeability and groundwater',
  'kind.ponding.label': 'Water / stain / debris', 'kind.ponding.support': 'A reported surface clue', 'kind.ponding.cannot': 'Flood hazard or cause', 'kind.ponding.check': 'Repeat observation during rain with time and conditions',
  'kind.constraint.label': 'Access / obstruction', 'kind.constraint.support': 'An apparent spatial constraint', 'kind.constraint.cannot': 'Legal compliance or ownership', 'kind.constraint.check': 'Request access and ownership review',
  'kind.opportunity.label': 'Possible planting space', 'kind.opportunity.support': 'A candidate surface opportunity', 'kind.opportunity.cannot': 'Buildability or utility clearance', 'kind.opportunity.check': 'Check utilities, ownership and accessibility',
  'unknown.0': 'Utility clearance and depth',
  'unknown.1': 'Soil permeability and groundwater',
  'unknown.2': 'Drainage connection and capacity',
  'unknown.3': 'Ownership, accessibility and maintenance',
  'p.boundary': 'Local prototype. Visual review is not authority confirmation or construction clearance. No automatic simulation updates.',
  'p.scenario': 'None: reviewed visual clues do not establish hydraulic parameters.',
  'p.location': 'Location is contributor-entered and unverified.',
  'p.m.community': 'Accepted community clues',
  'p.m.demo': 'Accepted demo clues · not field evidence',
  'p.m.pending': 'Pending review',
  'p.m.rejected': 'Rejected · retained in audit trail',
  'p.see': 'What we can see',
  'p.see.demo': 'synthetic demo',
  'p.see.community': 'community report',
  'p.see.at': 'at',
  'p.see.suffix': 'visual interpretation only',
  'p.see.none': 'No accepted observations yet.',
  'p.compute': 'What we can compute',
  'p.compute.body': 'No site measurements established. Explore illustrative water behaviour in the Street Lab; these observations do not supply catchment areas, infiltration rates or storage dimensions.',
  'p.ask': 'What we must ask',
  'p.next': 'Next field checks',
  'brief.title': 'STREET FIELD-CHECK BRIEF',
  'brief.unverified': 'unverified location',
  'brief.community': 'Accepted community clues',
  'brief.demo': 'Accepted synthetic demo clues',
  'brief.pending': 'Pending',
  'brief.rejected': 'Rejected',
  'brief.next': 'NEXT CHECKS',
  'brief.unknown': 'UNKNOWN',
  'brief.footer': 'Nothing has been submitted to an authority. Export the JSON for observation details and review history.',
  // references.html
  'ref.brand': 'SPONGE SQUAD / RAIN WALK',
  'ref.tag': 'SOURCES & RESEARCH',
  'ref.eyebrow': 'LEARNING FROM OTHER PROJECTS',
  'ref.h1': 'People can help make streets legible.',
  'ref.intro': 'Citizen-science precedents for observing rain, maintaining green infrastructure and building public inventories.',
  'ref.notice': 'These are precedents, not proof that our Basel prototype is validated. Source checks and suggested design lessons are distinguished below. Reported participation totals and success rates from the supplied brief have not been adopted.',
  'ref.life.h': 'A lifecycle worth exploring',
  'ref.life.before': 'Before change — Rain Watch:',
  'ref.life.before.t': 'build a visible baseline at fixed, safe observation points.',
  'ref.life.after': 'After change — Living Sponge:',
  'ref.life.after.t': 'repeat observations of completed features to inform maintenance questions.',
  'ref.life.note': 'This is a future campaign direction. The current Rain Walk remains a local demonstration; no authority receives its reports automatically.',
  'ref.lesson': 'Possible lesson for Rain Walk:',
  'ref.b.project': 'Source checked · project report',
  'ref.b.paper': 'Source checked · research paper, 2021',
  'ref.b.timeout': 'Suggested reference · source retrieval timed out',
  'ref.b.unchecked': 'Suggested reference · not independently checked',
  'ref.1.d': 'The project combined citizen flood reports and photographs with rainfall observations.',
  'ref.1.l': 'Ask what water visibly did at a specific place and time.',
  'ref.2.d': 'A citizen-science assessment protocol tested in six North American cities, with sensors supporting longer-term monitoring.',
  'ref.2.l': 'Use repeatable observations to monitor existing planted stormwater features.',
  'ref.3.d': 'Suggested in the supplied research brief for structured drain observations. Detailed findings have not been independently checked here.',
  'ref.3.l': 'Explore fixed observation points and a named recipient for follow-up.',
  'ref.4.d': 'Research reference supplied for repeated photographs at fixed monitoring points.',
  'ref.4.l': 'Explore consistent photo framing over time.',
  'ref.5.d': 'Research reference supplied for community flood monitoring.',
  'ref.5.l': 'Explore a small trained cohort before a public campaign.',
  'ref.6.d': 'Street-tree census dataset supplied as an urban inventory precedent.',
  'ref.6.l': 'Explore clear object categories and task allocation.',
  'ref.7.d': 'Research reference supplied for observation quality control.',
  'ref.7.l': 'Plan for uncertain and rejected submissions.',
  'ref.8.d': 'Campaign reference supplied for time-bounded public participation.',
  'ref.8.l': 'Explore a short shared observation event.',
  'ref.footer': 'Based on the user-supplied precedent brief. Source check: 4 October 2026. Lessons are SpongeSquad design interpretations, not partner endorsements.',
  'ref.back': 'Back to Rain Walk →'
};

export const DE = {
  'title.main': 'Regenspaziergang · SpongeSquad',
  'title.refs': 'Bürgerwissenschaftliche Vorbilder · Regenspaziergang',
  'brand': 'SPONGE SQUAD / STRASSENLABOR',
  'tag': 'VERSTEHEN → ENTSCHEIDEN',
  'lang.switch': 'Sprache',
  'eyebrow': 'KAMPAGNE ZU STRASSENBEFUNDEN',
  'h1': 'Was verrät uns die Strasse?',
  'intro': 'Folgen Sie dem Regen. Achten Sie auf die Lücken. Helfen Sie mit, ein klareres Bild davon zu zeichnen, was als Nächstes geprüft werden muss.',
  'notice.demo': 'Demo-Kampagne · Synthetischer 120-m-Abschnitt · Kein vermessener Basler Standort gewählt',
  'ctx.boundary': 'Nur die Identität des gewählten Orts. Die Positionen beziehen sich auf das 120-m-Übungslayout, nicht auf gemessene Strassenkoordinaten.',
  'nav.aria': 'Kampagne',
  'tab.walk': '01 · Beobachten',
  'tab.review': '02 · Prüfen',
  'tab.passport': '03 · Befundpass',
  'walk.h': 'Ein kurzes Stück begehen',
  'walk.step1': 'Notieren Sie Ihre Strasse und den Startpunkt.',
  'walk.step2': 'Schauen Sie sich den Rand des Belags an.',
  'walk.step3': 'Suchen Sie sichtbare Einläufe und Deckel.',
  'walk.step4': 'Schauen Sie sich eine Baumscheibe oder bepflanzte Fläche an.',
  'walk.step5': 'Halten Sie eine Chance oder eine Einschränkung fest.',
  'walk.safety': 'Bleiben Sie auf öffentlichen Gehwegen. Fotografieren Sie nur Material, das Sie verwenden dürfen; vermeiden Sie erkennbare Personen und Autokennzeichen.',
  'street.aria': 'Schematische Beobachtungspositionen',
  'street.note': 'Ungefähre Distanz ab Ihrem gewählten Startpunkt. Schematisch, keine Karte und keine Vermessung.',
  'form.h': 'Beobachtung hinzufügen',
  'f.place': 'Strasse / Startpunkt (ungeprüft)',
  'place.ph': 'Demo-Strasse — kein vermessener Ort',
  'place.default': 'Demo-Strasse — kein vermessener Ort',
  'f.kind': 'Was ist sichtbar?',
  'f.dist': 'Ungefähre Distanz entlang des Abschnitts:',
  'f.conf': 'Wie sicher sind Sie?',
  'conf.low': 'Nicht sicher',
  'conf.medium': 'Wahrscheinlich',
  'conf.high': 'Sicher, was das Aussehen betrifft',
  'f.rain': 'Was haben Sie bei Regen beobachtet?',
  'rain.unknown': 'Weiss ich nicht / keine Regenbeobachtung',
  'rain.enters': 'Wasser läuft ein',
  'rain.pools': 'Wasser staut sich',
  'rain.crosses': 'Wasser überquert die Fläche',
  'f.time': 'Zeitpunkt der Beobachtung',
  'f.note': 'Notizen / Regenbedingungen',
  'note.ph': 'Beschreiben Sie, was Sie tatsächlich gesehen haben.',
  'f.photo': 'Foto (optional; JPEG, PNG oder WebP, max. 1 MB)',
  'form.local': 'Nur in diesem Browser gespeichert. Fotos sind in Ihrem JSON-Export enthalten. Es wird nichts an die Stadt gesendet.',
  'form.submit': 'Zur Prüfliste hinzufügen',
  'review.h': 'Den sichtbaren Hinweis prüfen',
  'review.intro': 'Die Annahme bestätigt nur die sichtbare Deutung. Demo-Hinweise bleiben auch nach der Prüfung Demodaten.',
  'filter.label': 'Filter',
  'filter.all': 'Alle Beobachtungen',
  'filter.pending': 'Prüfung ausstehend',
  'filter.accepted': 'Angenommen',
  'filter.uncertain': 'Unsicher',
  'filter.rejected': 'Abgelehnt',
  'filter.clarification': 'Fachliche Klärung',
  'passport.eyebrow': 'STRASSEN-BEFUNDPASS',
  'passport.h': 'Klar sehen. Genau fragen.',
  'poss.h': 'Drei Möglichkeiten zum Untersuchen',
  'poss.a.h': 'A · Raum darunter',
  'poss.a.p': 'Baumrigolen oder Mulden prüfen, falls Leitungs-, Boden- und Entwurfsabklärungen einen Aushub zulassen.',
  'poss.b.h': 'B · Flacher Schwamm',
  'poss.b.p': 'Flache Bepflanzung und Speicherung an der Oberfläche prüfen, falls Platz, Überlauf und Zugänglichkeit dies zulassen.',
  'poss.c.h': 'C · Kühlen ohne Aushub',
  'poss.c.p': 'Schatten oder bewegliche Bepflanzung prüfen, vorbehaltlich Eigentum, Zugang, Sicherheit und Unterhalt.',
  'poss.note': 'Dies sind bedingte Diskussionsansätze, keine Empfehlungen. Keine Beobachtung verändert automatisch die Geometrie oder das Wassermodell des Strassenlabors.',
  'export.json': 'Befundpass als JSON exportieren',
  'export.brief': 'Kurzprotokoll für die Feldprüfung herunterladen',
  'link.studio': 'Das illustrative Strassenlabor erkunden →',
  'link.refs': 'Bürgerwissenschaftliche Vorbilder · Projekte, von denen wir lernen können →',
  'footer.local': 'Lokaler Prototyp · Exportieren Sie, um Ihre Arbeit zu behalten oder zu teilen.',
  'reset': 'Demo zurücksetzen',
  'reset.ctx': 'Beobachtungen zurücksetzen',
  'reset.confirm': 'Beobachtungen für diesen Kontext zurücksetzen? Exportieren Sie zuerst, um Ihre Arbeit zu behalten.',
  'save.ok': 'Nur auf diesem Gerät gespeichert. Exportieren Sie, um zu teilen.',
  'save.fail': 'Lokales Speichern nicht möglich (Speicher nicht verfügbar oder voll). Exportieren Sie jetzt, um diese Sitzung zu behalten.',
  'save.unreadable': 'Gespeicherte Daten konnten nicht gelesen werden. Demo geladen; exportieren Sie vor dem Zurücksetzen.',
  'save.unavailable': 'Lokaler Speicher nicht verfügbar oder nicht lesbar. Exportieren Sie, um Ihre Arbeit zu behalten.',
  'err.photo': 'Wählen Sie ein JPEG-, PNG- oder WebP-Foto, das kleiner als 1 MB ist.',
  'err.photoRead': 'Das Foto konnte nicht gelesen werden.',
  'err.time': 'Geben Sie einen Zeitpunkt der Beobachtung ein.',
  'err.note': 'Beschreiben Sie, was Sie gesehen haben.',
  'obs.added': 'Beobachtung hinzugefügt, Prüfung ausstehend.',
  'badge.demo': 'SYNTHETISCHE DEMO',
  'badge.community': 'BEOBACHTUNG AUS DER GEMEINSCHAFT',
  'obs.noPhoto': 'Kein Foto. Prüfung nur anhand des Texts; keine Bildbestätigung.',
  'obs.photoAlt': 'Foto der meldenden Person zum gemeldeten Hinweis',
  'obs.observed': 'Beobachtet',
  'obs.noObs': 'Keine tatsächliche Beobachtung — Demo',
  'obs.confidence': 'Sicherheit',
  'obs.appearance': 'nur das Aussehen',
  'obs.rain': 'Regen',
  'obs.support': 'Kann belegen',
  'obs.cannot': 'Kann nicht belegen',
  'street.btnTitle': 'Beobachtung',
  'review.outcome': 'Ergebnis der Prüfung',
  'review.reason': 'Begründung / geprüfte Belege',
  'review.reason.ph': 'Erklären Sie die Deutung oder die Unsicherheit',
  'review.record': 'Prüfung festhalten',
  'review.history': 'Prüfverlauf',
  'queue.empty': 'Keine Beobachtungen in diesem Filter.',
  'rv.pending': 'Prüfung ausstehend',
  'rv.accepted': 'Sichtbarer Hinweis angenommen',
  'rv.uncertain': 'Braucht eine weitere Beobachtung',
  'rv.rejected': 'Abgelehnt / falsch eingeordnet',
  'rv.clarification': 'Braucht fachliche Klärung',
  'seed.note': 'Synthetischer Übungshinweis; kein Foto und kein Besuch vor Ort.',
  'mission.0.t': 'Dem Regen folgen', 'mission.0.d': 'Suchen Sie Einläufe, Pfützen und Wasserspuren.',
  'mission.1.t': 'Den Schwamm finden', 'mission.1.d': 'Suchen Sie Baumscheiben und bepflanzte Flächen.',
  'mission.2.t': 'Die harte Kante finden', 'mission.2.d': 'Suchen Sie lange, versiegelt wirkende Flächen.',
  'mission.3.t': 'Die Einschränkung finden', 'mission.3.d': 'Suchen Sie Engstellen und Hindernisse.',
  'kind.inlet.label': 'Möglicher Einlauf', 'kind.inlet.support': 'Sichtbare Struktur an der Oberfläche', 'kind.inlet.cannot': 'Anschluss ans Netz, Rohrtiefe oder Kapazität', 'kind.inlet.check': 'Entwässerungsverantwortliche bitten, Anschluss und Zustand zu prüfen',
  'kind.cover.label': 'Deckel / Schacht', 'kind.cover.support': 'Sichtbarer Deckel', 'kind.cover.cannot': 'Eigentümerschaft oder unterirdischer Verlauf', 'kind.cover.check': 'Die zuständige Eigentümerschaft der Anlage ermitteln',
  'kind.tree.label': 'Baumscheibe', 'kind.tree.support': 'Erkennbarer Zustand der Bepflanzung', 'kind.tree.cannot': 'Wurzelraum oder Bodengesundheit', 'kind.tree.check': 'Boden und Wurzelraum prüfen',
  'kind.sealed.label': 'Versiegelt wirkende Fläche', 'kind.sealed.support': 'Aussehen der Oberfläche', 'kind.sealed.cannot': 'Versickerungsrate oder Unterbau', 'kind.sealed.check': 'Fläche messen und den Belagsaufbau untersuchen',
  'kind.green.label': 'Grüne / durchlässig wirkende Fläche', 'kind.green.support': 'Sichtbare Vegetation oder Aussehen der Oberfläche', 'kind.green.cannot': 'Durchlässigkeit oder Speicherkapazität', 'kind.green.check': 'Durchlässigkeit des Bodens und Grundwasser prüfen',
  'kind.ponding.label': 'Wasser / Fleck / Schutt', 'kind.ponding.support': 'Ein gemeldeter Hinweis an der Oberfläche', 'kind.ponding.cannot': 'Überflutungsgefahr oder Ursache', 'kind.ponding.check': 'Beobachtung bei Regen wiederholen, mit Zeit und Bedingungen',
  'kind.constraint.label': 'Zugang / Hindernis', 'kind.constraint.support': 'Eine erkennbare räumliche Einschränkung', 'kind.constraint.cannot': 'Rechtliche Konformität oder Eigentum', 'kind.constraint.check': 'Zugang anfragen und Eigentum klären lassen',
  'kind.opportunity.label': 'Möglicher Pflanzraum', 'kind.opportunity.support': 'Eine mögliche Chance an der Oberfläche', 'kind.opportunity.cannot': 'Machbarkeit oder Leitungsfreiheit', 'kind.opportunity.check': 'Leitungen, Eigentum und Zugänglichkeit prüfen',
  'unknown.0': 'Leitungsfreiheit und Tiefe',
  'unknown.1': 'Durchlässigkeit des Bodens und Grundwasser',
  'unknown.2': 'Anschluss an die Entwässerung und Kapazität',
  'unknown.3': 'Eigentum, Zugänglichkeit und Unterhalt',
  'p.boundary': 'Lokaler Prototyp. Eine visuelle Prüfung ersetzt weder eine Bestätigung durch die Behörde noch eine Baufreigabe. Keine automatische Aktualisierung der Simulation.',
  'p.scenario': 'Keine: geprüfte visuelle Hinweise belegen keine hydraulischen Kennwerte.',
  'p.location': 'Der Ort wurde von der meldenden Person eingegeben und ist ungeprüft.',
  'p.m.community': 'Angenommene Hinweise aus der Gemeinschaft',
  'p.m.demo': 'Angenommene Demo-Hinweise · kein Feldbefund',
  'p.m.pending': 'Prüfung ausstehend',
  'p.m.rejected': 'Abgelehnt · im Prüfpfad behalten',
  'p.see': 'Was wir sehen können',
  'p.see.demo': 'synthetische Demo',
  'p.see.community': 'Beobachtung aus der Gemeinschaft',
  'p.see.at': 'bei',
  'p.see.suffix': 'nur visuelle Deutung',
  'p.see.none': 'Noch keine angenommenen Beobachtungen.',
  'p.compute': 'Was wir berechnen können',
  'p.compute.body': 'Keine Messungen vor Ort vorhanden. Erkunden Sie im Strassenlabor das illustrative Wasserverhalten; diese Beobachtungen liefern keine Einzugsflächen, Versickerungsraten oder Speichergrössen.',
  'p.ask': 'Was wir fragen müssen',
  'p.next': 'Nächste Feldprüfungen',
  'brief.title': 'KURZPROTOKOLL FELDPRÜFUNG STRASSE',
  'brief.unverified': 'ungeprüfter Ort',
  'brief.community': 'Angenommene Hinweise aus der Gemeinschaft',
  'brief.demo': 'Angenommene synthetische Demo-Hinweise',
  'brief.pending': 'Ausstehend',
  'brief.rejected': 'Abgelehnt',
  'brief.next': 'NÄCHSTE PRÜFUNGEN',
  'brief.unknown': 'UNBEKANNT',
  'brief.footer': 'Es wurde nichts an eine Behörde übermittelt. Exportieren Sie das JSON für Details zu den Beobachtungen und den Prüfverlauf.',
  'ref.brand': 'SPONGE SQUAD / REGENSPAZIERGANG',
  'ref.tag': 'QUELLEN & FORSCHUNG',
  'ref.eyebrow': 'VON ANDEREN PROJEKTEN LERNEN',
  'ref.h1': 'Menschen können helfen, Strassen lesbar zu machen.',
  'ref.intro': 'Bürgerwissenschaftliche Vorbilder, um Regen zu beobachten, grüne Infrastruktur zu unterhalten und öffentliche Inventare aufzubauen.',
  'ref.notice': 'Dies sind Vorbilder, kein Beleg dafür, dass unser Basler Prototyp validiert ist. Quellenprüfungen und vorgeschlagene Lehren für den Entwurf sind unten getrennt ausgewiesen. Angegebene Teilnahmezahlen und Erfolgsquoten aus dem gelieferten Briefing wurden nicht übernommen.',
  'ref.life.h': 'Ein Lebenszyklus, der sich lohnt',
  'ref.life.before': 'Vor der Veränderung — Rain Watch:',
  'ref.life.before.t': 'eine sichtbare Ausgangslage an festen, sicheren Beobachtungspunkten aufbauen.',
  'ref.life.after': 'Nach der Veränderung — Living Sponge:',
  'ref.life.after.t': 'Beobachtungen an fertiggestellten Elementen wiederholen, um Fragen zum Unterhalt zu klären.',
  'ref.life.note': 'Dies ist eine mögliche künftige Kampagnenrichtung. Der aktuelle Regenspaziergang bleibt eine lokale Demonstration; keine Behörde erhält seine Meldungen automatisch.',
  'ref.lesson': 'Mögliche Lehre für den Regenspaziergang:',
  'ref.b.project': 'Quelle geprüft · Projektbericht',
  'ref.b.paper': 'Quelle geprüft · Forschungsartikel, 2021',
  'ref.b.timeout': 'Vorgeschlagene Referenz · Abruf der Quelle abgelaufen',
  'ref.b.unchecked': 'Vorgeschlagene Referenz · nicht unabhängig geprüft',
  'ref.1.d': 'Das Projekt verband Hochwassermeldungen und Fotos aus der Bevölkerung mit Niederschlagsbeobachtungen.',
  'ref.1.l': 'Fragen, was das Wasser an einem bestimmten Ort und zu einer bestimmten Zeit sichtbar getan hat.',
  'ref.2.d': 'Ein bürgerwissenschaftliches Bewertungsprotokoll, das in sechs nordamerikanischen Städten getestet wurde; Sensoren unterstützten die längerfristige Überwachung.',
  'ref.2.l': 'Wiederholbare Beobachtungen nutzen, um bestehende bepflanzte Regenwasseranlagen zu überwachen.',
  'ref.3.d': 'Im gelieferten Recherchebriefing für strukturierte Beobachtungen von Abläufen vorgeschlagen. Die Einzelergebnisse wurden hier nicht unabhängig geprüft.',
  'ref.3.l': 'Feste Beobachtungspunkte und eine benannte Empfangsstelle für die Weiterverfolgung prüfen.',
  'ref.4.d': 'Gelieferte Forschungsreferenz zu wiederholten Fotos an festen Messpunkten.',
  'ref.4.l': 'Einen gleichbleibenden Bildausschnitt über die Zeit prüfen.',
  'ref.5.d': 'Gelieferte Forschungsreferenz zur gemeinschaftlichen Hochwasserüberwachung.',
  'ref.5.l': 'Vor einer öffentlichen Kampagne eine kleine geschulte Gruppe erproben.',
  'ref.6.d': 'Datensatz einer Strassenbaum-Zählung, geliefert als Vorbild für ein städtisches Inventar.',
  'ref.6.l': 'Klare Objektkategorien und eine klare Aufgabenverteilung prüfen.',
  'ref.7.d': 'Gelieferte Forschungsreferenz zur Qualitätskontrolle von Beobachtungen.',
  'ref.7.l': 'Unsichere und abgelehnte Beobachtungen einplanen.',
  'ref.8.d': 'Gelieferte Kampagnenreferenz für zeitlich begrenzte öffentliche Beteiligung.',
  'ref.8.l': 'Einen kurzen gemeinsamen Beobachtungsanlass prüfen.',
  'ref.footer': 'Basierend auf dem von den Nutzenden gelieferten Briefing zu Vorbildern. Quellenprüfung: 4. Oktober 2026. Die Lehren sind Deutungen des SpongeSquad-Teams für den Entwurf, keine Zustimmung der Partner.',
  'ref.back': 'Zurück zum Regenspaziergang →'
};

export const DICT = {de: DE, en: EN};
export const makeT = lang => key => DICT[lang]?.[key] ?? EN[key] ?? key;

// Localized human-readable view of a passport. Machine keys, ids and enums stay unchanged; adds `language`.
export function localizePassport(p, lang) {
  const t = makeT(lang);
  const ctx = p.investigationContext ? {...p.investigationContext, boundary: t('ctx.boundary')} : undefined;
  return {
    ...p, language: lang,
    place: p.place === DEFAULT_PLACE ? t('place.default') : p.place,
    ...(ctx ? {investigationContext: ctx} : {}),
    boundary: t('p.boundary'),
    observations: p.observations.map(o => ({
      ...o,
      note: o.source === 'demo' && o.note === SEED_NOTE ? t('seed.note') : o.note,
      canEstablish: t(`kind.${o.kind}.support`), cannotEstablish: t(`kind.${o.kind}.cannot`)
    })),
    nextChecks: [...new Set(p.observations.filter(o => o.review !== 'rejected').map(o => t(`kind.${o.kind}.check`)))],
    unknowns: [0, 1, 2, 3].map(i => t(`unknown.${i}`)),
    scenarioUpdate: t('p.scenario')
  };
}

export function applyDom(doc, lang) {
  const t = makeT(lang);
  doc.documentElement.lang = lang;
  doc.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  doc.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  doc.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  doc.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
}

// Keep lang (and embedded) when navigating between Rain Walk pages.
export function langHref(href, lang, search = '') {
  const keep = new URLSearchParams();
  const cur = new URLSearchParams(search);
  if (cur.get('embedded') === '1') keep.set('embedded', '1');
  keep.set('lang', lang);
  return href.split('?')[0] + '?' + keep.toString();
}

// Wires language state: URL > storage > de; live switching by switcher or postMessage.
export function initLang({win = window, onChange = () => {}} = {}) {
  let storage = null;
  try { storage = win.localStorage; } catch { /* blocked */ }
  let lang = resolveLang(win.location.search, storage);
  const embedded = new URLSearchParams(win.location.search).get('embedded') === '1';
  const doc = win.document;
  if (embedded) doc.documentElement.classList.add('embedded');
  const box = doc.getElementById('lang-switch');
  const paint = () => {
    applyDom(doc, lang);
    doc.querySelectorAll('a[data-keep-lang]').forEach(a => { a.href = langHref(a.getAttribute('data-keep-lang'), lang, win.location.search); });
    if (box) {
      box.hidden = embedded;
      box.innerHTML = '';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', makeT(lang)('lang.switch'));
      for (const l of LANGS) {
        const b = doc.createElement('button');
        b.type = 'button'; b.textContent = l.toUpperCase(); b.lang = l;
        b.setAttribute('aria-pressed', String(l === lang));
        b.onclick = () => set(l);
        box.appendChild(b);
      }
    }
  };
  function set(next) {
    if (!LANGS.includes(next)) return;
    lang = persistLang(next, storage);
    try { const u = new URL(win.location.href); u.searchParams.set('lang', lang); win.history.replaceState(null, '', u); } catch { /* ignore */ }
    paint(); onChange(lang);
  }
  win.addEventListener('message', e => e.origin === location.origin && e.data?.type === 'sponge-lang' && set(e.data.lang));
  paint();
  return {get lang() { return lang; }, get t() { return makeT(lang); }, set};
}
