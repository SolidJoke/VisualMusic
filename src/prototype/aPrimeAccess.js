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
 *   needs   "drawer": only there once the Assistant drawer is open
 *   devOnly only in the development build (import.meta.env.DEV), never clicked
 */
export const A_PRIME_ACCESS = [
  // Header
  { fn: "nav.mode-studio", where: "header" },
  { fn: "nav.mode-dictionnaire", where: "header" },
  { fn: "nav.noms-notes-eu", where: "header" },
  { fn: "nav.noms-notes-us", where: "header" },
  { fn: "nav.etiquettes-doigts", where: "header" },
  { fn: "aide.guide", where: "header", opens: "guide" },
  { fn: "aide.theorie", where: "header", opens: "theory" },
  { fn: "nav.langue", where: "header", opens: "language" },
  { fn: "aide.a-propos", where: "header", opens: "about" },
  { fn: "nav.debug", where: "header", devOnly: true },
  { fn: "nav.studio-harmonie", where: "header", opens: "drawer" },
  // Transport, at the top of the centre column
  { fn: "jouer.lecture", where: "transport" },
  { fn: "jouer.tempo", where: "transport" },
  { fn: "jouer.tempo-moins", where: "transport" },
  { fn: "jouer.tempo-saisie", where: "transport", opens: "tempo-field" },
  { fn: "jouer.tempo-plus", where: "transport" },
  { fn: "jouer.metronome", where: "transport" },
  { fn: "son.volume-general", where: "transport" },
  { fn: "composer.math-ouvrir", where: "transport", opens: "math" },
  { fn: "son.ouvrir", where: "transport", opens: "audio" },
  // Centre column
  { fn: "son.visualiseur", where: "centre" },
  { fn: "composer.grilles", where: "centre" },
  { fn: "nav.legende", where: "centre" },
  // Instruments
  { fn: "jouer.piano", where: "instruments" },
  { fn: "jouer.guitare", where: "instruments" },
  { fn: "jouer.basse", where: "instruments" },
  // The Assistant drawer, once open
  { fn: "nav.fermer-fenetres", where: "drawer", needs: "drawer" },
];
