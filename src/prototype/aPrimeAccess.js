/**
 * A′-ACCÈS (brief A-PRIME-ACCES, 2026-10-06) — every function of the classic
 * design that the A′ page (?prototype=a) must give access to, by its name in
 * the parity registry (the element's data-fn). Ids of the registry seed
 * (reports/parity-audit-2026-10-05/registry.json) are reused; the others are
 * "usage.nom" ids of their own (nav.mode-studio, jouer.tempo-plus...).
 *
 * Shared by the jsdom test (src/prototype/__tests__/PrototypeAAccess.test.jsx)
 * and the S1 probe (scripts/s1_probe.mjs, criterion S1-20) — and NEVER
 * imported by the page: the page does not grade itself. What each window
 * must contain once opened (its content markers) is the probe's and the
 * test's own business, not this list's.
 * Plain data, no import: node reads this file directly.
 *
 *   fn      the data-fn
 *   where   header | transport | centre | instruments | drawer
 *   opens   what a click opens: audio | math | guide | theory | about |
 *           language (the list) | drawer | tempo-field
 *   needs   "drawer": only there once the Assistant drawer is open;
 *           "dictionary": only in the Dictionary mode (L1b-1b: the heads' ▶,
 *           and the position arrows, read-only in the Studio; L1b-1c: the
 *           necks' position-panel button - in the Studio it appears too, once
 *           a chord is clicked);
 *           "panel": only inside a neck's open position panel (L1b-1c), each
 *           one only in the state where its content exists (S1-26 walks them);
 *           VMU-185, the direct selectors (second row of the transport block),
 *           each only in the state where the control exists:
 *           "studio": only in the Studio (the style menu);
 *           "dictionary:chord" / "dictionary:scale": only in the Dictionary
 *           with the family Chords / Scales (their type menu; a single note
 *           has none);
 *   compactOnly
 *           only in the COMPACT page — from 1648 to 2559 px, where A′ shows
 *           ONE instrument column and its compact header (C-104 / C-106): the
 *           "Aide et réglages" menu button (nav.aide-reglages). Absent at
 *           2560 px and wider, where the five help controls stay in the
 *           header. A reader at 2560+ (S1-20 at 3840, the jsdom test with its
 *           wide mock) SKIPS these entries; S1-30 at 1648..2559 walks them.
 *   compactNeeds
 *           the extra state the compact page needs, ON TOP of `needs` (C-107):
 *           "menu": only once the compact "Aide et réglages" menu is open
 *           (the five help controls: Guide, Theory, language, About, Debug);
 *           "instrument:piano" | "instrument:guitar" | "instrument:bass":
 *           only while THAT instrument is the chosen one, because the compact
 *           page renders one instrument column (C-104). It carries the
 *           instrument's own section (jouer.piano / -guitare / -basse), its
 *           ▶, its octave arrows (the Dictionary's), its position arrows,
 *           its panel button and start-octave button, and the panel's own
 *           controls. Absent at 2560 px and wider: the three columns are all
 *           there, so `compactNeeds` is read only by the compact readers.
 *   devOnly only in the development build (import.meta.env.DEV), never clicked
 */
export const A_PRIME_ACCESS = [
  // Header
  { fn: "nav.mode-studio", where: "header" },
  { fn: "nav.mode-dictionnaire", where: "header" },
  { fn: "nav.noms-notes-eu", where: "header" },
  { fn: "nav.noms-notes-us", where: "header" },
  { fn: "nav.etiquettes-doigts", where: "header" },
  { fn: "aide.guide", where: "header", opens: "guide", compactNeeds: "menu" },
  { fn: "aide.theorie", where: "header", opens: "theory", compactNeeds: "menu" },
  { fn: "nav.langue", where: "header", opens: "language", compactNeeds: "menu" },
  { fn: "aide.a-propos", where: "header", opens: "about", compactNeeds: "menu" },
  { fn: "nav.debug", where: "header", devOnly: true, compactNeeds: "menu" },
  // C-106 (Step 3b): below 2560 px the five controls above live in this menu;
  // the button takes their place in the compact header, never at 2560+.
  { fn: "nav.aide-reglages", where: "header", compactOnly: true },
  { fn: "nav.studio-harmonie", where: "header", opens: "drawer" },
  // Transport, at the top of the centre column
  { fn: "jouer.lecture", where: "transport" },
  { fn: "jouer.tempo", where: "transport" },
  { fn: "jouer.tempo-moins", where: "transport" },
  { fn: "jouer.tempo-saisie", where: "transport", opens: "tempo-field" },
  { fn: "jouer.tempo-plus", where: "transport" },
  { fn: "jouer.metronome", where: "transport" },
  { fn: "son.volume-general", where: "transport" },
  // VMU-213 (part 2): "Math & Rythmes" is always there in the Studio (the
  // dock); its transport button stays in the Dictionary only, where it still
  // opens the classic Modal with its warning.
  { fn: "composer.math-ouvrir", where: "transport", opens: "math", needs: "dictionary" },
  { fn: "son.ouvrir", where: "transport", opens: "audio" },
  // VMU-185 — the direct selectors: a second row of the transport block (the
  // Assistant drawer holds the same controls and hides the necks). Registry
  // names reused: composer.style, dico.fondamentale, dico.famille,
  // dico.type-accord, dico.type-gamme. "where" is "centre" (the centre column's
  // transport block, not the top row of it).
  { fn: "composer.style", where: "centre", needs: "studio" },
  { fn: "dico.famille", where: "centre", needs: "dictionary" },
  { fn: "dico.fondamentale", where: "centre", needs: "dictionary" },
  { fn: "dico.type-accord", where: "centre", needs: "dictionary:chord" },
  { fn: "dico.type-gamme", where: "centre", needs: "dictionary:scale" },
  // Centre column
  { fn: "son.visualiseur", where: "centre" },
  { fn: "composer.grilles", where: "centre" },
  { fn: "nav.legende", where: "centre" },
  // VMU-213 (part 2): the recipes column, right of the sequencers, Studio only.
  { fn: "composer.recettes", where: "centre", needs: "studio" },
  // Instruments
  // C-104 (Step 3b): below 2560 px only the chosen instrument's column exists,
  // so each of these carries the instrument it belongs to (compactNeeds).
  { fn: "jouer.piano", where: "instruments", compactNeeds: "instrument:piano" },
  { fn: "jouer.guitare", where: "instruments", compactNeeds: "instrument:guitar" },
  { fn: "jouer.basse", where: "instruments", compactNeeds: "instrument:bass" },
  // L1b-1b — the column heads: the name chooses the instrument that sounds
  // (both modes), ▶ plays it (Dictionary), the piano's ‹ Octave › (both modes:
  // the Studio's base octave there), the necks' ‹ Position › (Dictionary; the
  // Studio shows the shape, read-only).
  { fn: "jouer.instrument-tuile-piano", where: "instruments" },
  { fn: "jouer.instrument-tuile-guitar", where: "instruments" },
  { fn: "jouer.instrument-tuile-bass", where: "instruments" },
  { fn: "jouer.instrument-play-piano", where: "instruments", needs: "dictionary", compactNeeds: "instrument:piano" },
  { fn: "jouer.instrument-play-guitar", where: "instruments", needs: "dictionary", compactNeeds: "instrument:guitar" },
  { fn: "jouer.instrument-play-bass", where: "instruments", needs: "dictionary", compactNeeds: "instrument:bass" },
  // VMU-186: "instruments" = the Dictionary's piano head; in the Studio the same
  // pair sits in the selection row ("Octave des accords"), never on the head too.
  // C-107: the compact page's octave arrows follow the piano column (the Studio
  // keeps them in the selection row, whatever instrument is chosen).
  { fn: "jouer.octave-piano-prec", where: "instruments", compactNeeds: "instrument:piano" },
  { fn: "jouer.octave-piano-suiv", where: "instruments", compactNeeds: "instrument:piano" },
  { fn: "jouer.position-guitar-prec", where: "instruments", needs: "dictionary", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-guitar-suiv", where: "instruments", needs: "dictionary", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-bass-prec", where: "instruments", needs: "dictionary", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-bass-suiv", where: "instruments", needs: "dictionary", compactNeeds: "instrument:bass" },
  // L1b-1c — the position panel: the label of a neck's position is the button
  // that opens it. Inside: "Fondamentale sur" (one button per string; chords),
  // the start-pitch octaves (a scale), the two resets (a position chosen; a
  // scale's focus), the alerts (guitar), and the instrument's range.
  { fn: "jouer.position-panneau-guitar", where: "instruments", needs: "dictionary", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-panneau-bass", where: "instruments", needs: "dictionary", compactNeeds: "instrument:bass" },
  // VMU-202 (slice 3) — the start octave left the panel for the position rail:
  // its button sits at the head of the rail, beside the neck, once a scale is
  // shown. Same registry name as the slice-2 panel select, new "needs".
  { fn: "jouer.position-depart-guitar", where: "instruments", needs: "dictionary:scale", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-depart-bass", where: "instruments", needs: "dictionary:scale", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-fondamentale-corde-guitar-5", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-fondamentale-corde-guitar-4", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-fondamentale-corde-guitar-3", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-fondamentale-corde-bass-3", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-fondamentale-corde-bass-2", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-fondamentale-corde-bass-1", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-reinit-guitar", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-reinit-bass", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-reinit-focus-guitar", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.position-reinit-focus-bass", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  { fn: "jouer.position-alertes-guitar", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.instrument-plage-guitar", where: "instruments", needs: "panel", compactNeeds: "instrument:guitar" },
  { fn: "jouer.instrument-plage-bass", where: "instruments", needs: "panel", compactNeeds: "instrument:bass" },
  // The Assistant drawer, once open
  { fn: "nav.fermer-fenetres", where: "drawer", needs: "drawer" },
];
