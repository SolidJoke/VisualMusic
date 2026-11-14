#!/usr/bin/env node
/**
 * s1_probe.mjs — S1 prototype measurement (VMU-135 / 035, VMU-155).
 *
 * Opens the A′ prototype (`/?prototype=a`, src/prototype/PrototypeA.jsx) in
 * a real Chromium page at 3840x2160 and 3840x2020 (the mock-up's useful
 * height), plays the four scenarios of the S1 spec (Do majeur, Sol♯m7,
 * gamme de Do majeur, La pentatonique mineure) in every label mode the app
 * can show (src/prototype/s1Scenarios.js), and measures criteria S1-1 to
 * S1-13 of `S1-critere-prototype.md` with the spec's own methods
 * (getComputedStyle, scrollWidth <= clientWidth, rectangle intersections,
 * elementFromPoint...). S1-14 (Gabriel reading the labels) is human: not
 * measured here.
 *
 * Output: one line per criterion and per state (viewport x scenario x label
 * mode), PASS / FAIL with the measured value; then a per-criterion summary
 * and the A′ / B decision by the spec's rule:
 *   "A (ou A′) si S1-1 à S1-11 et S1-14 passent tous ; un seul échec → B.
 *    S1-12 et S1-13 sont des corrections, pas des critères de choix."
 *
 * L1a adds the states the four scenarios never reached (S1_EXTRA_STATES:
 * Dictionary octave +3, Studio base octave +2 with a chord clicked, harmonic
 * mode on each scenario), reached by clicking the page's own state button,
 * and criterion S1-15: every note the engine hands an instrument is drawn —
 * a lit key on the piano, a pastille on a neck — inside the viewport (the
 * vertical piano used to stop at C6, L1 study fact 0.4).
 *
 * L1a-fix1 (Gabriel's feedback on ?prototype=a, 2026-10-05): the scenario /
 * state buttons are the probe's own fixtures, drawn only with `bench=1` in
 * the URL, so every state URL below carries it (the three label-mode buttons
 * are a real function and are always there: S1-19). And four criteria:
 * S1-16, the three instrument columns keep their distances (no column
 * overlaps another, the piano keeps clear of the guitar neck, the page keeps
 * a margin after the bass, the heads are not glued to the left, on one line,
 * the three instruments start at the same height, the piano's keys fill
 * their box evenly); S1-17, the necks are as long as the keyboard (their
 * bottom is the keyboard's, fix2), their fret pitch shrinks linearly from
 * the nut to the body (first : last = 1.5) and their markers (3 5 7 9 12x2
 * 15 17 19 21) sit at the
 * middle of their case (a single one between the two middle strings, the two
 * on 12 spread over the width); S1-18, the left rail is gone and its two mode
 * buttons are tabs in the header; S1-19, the label modes are one 3-segment
 * control in the header, working without bench=1 (runNoBench).
 *
 * A′-ACCÈS (brief A-PRIME-ACCES, Gabriel 2026-10-06: "il manque toujours des
 * features comme le volume") adds S1-20, decisive, on Gabriel's page (no
 * bench=1), at 3840x2045 (his window) and 3840x2160: every data-fn of
 * src/prototype/aPrimeAccess.js is there once, visible, on screen and on top
 * (elementFromPoint); each opener opens what it must (a content marker the
 * probe knows on its own: the six faders (the window's master-volume slider is
 * gone, VMU-216), the euclidean circle, the CC BY credit...) and Escape closes
 * it; the tempo is typed (90 + Enter, Escape cancels, 59 / 201 refused, 60 /
 * 200 accepted); the page does not scroll in FR, EN, PT and ZH; none of the nine
 * duplicated controls survives in the drawer or Instruments & Audio (VMU-216);
 * and the master volume reaches the engine — the gain Tone.Destination really
 * renders, read through a tap like scripts/tempo_probe.mjs reads the mixer, and
 * follows the transport's slider (runVolume; the window's copy is gone).
 *   npm run s1:probe -- --access-only   # S1-20 alone, without the 60 states
 * Positive control: hide one button, S1-20 (and only S1-20) must turn red:
 *   S1_PROBE_INJECT_CSS='[data-fn="son.ouvrir"]{visibility:hidden!important}' npm run s1:probe
 *
 * L1b-1a (Gabriel: "le nom des notes ... sur toutes les touches du piano")
 * adds S1-22, decisive, in every state of the matrix: the vertical piano's 49
 * keys (29 white + 20 black) are all named, each name readable (>= 18px,
 * >= 4.5:1 against what is really behind it, inside its key), no two labels
 * overlapping; an unplayed key reads its name in the notation of the label
 * mode (a C with its octave, a black key with its flat).
 *
 * L1b-1b (the column heads: name, ▶ per instrument, ‹ Octave / Position ›)
 * adds S1-21, decisive, on Gabriel's page at 3840x2045 and 3840x2160, in FR /
 * EN / PT / ZH, in the Dictionary and the Studio (runHeads): each head 100px
 * (+-1), the same in the three columns, two rows of one line each, every
 * control >= 48x48 and on top (elementFromPoint), the setting's label fitting
 * its room, the keyboard's bottom >= 40px above the window's (<= 2005 at 2045),
 * no scroll; the controls the mode must show (aPrimeAccess.js), each once; the
 * piano's label equal to an ORACLE computed here from data-s1-notes. Then what
 * the controls do, against literal anchors and invariances: › › on the guitar
 * changes the guitar's data-s1-positions only (open 0-3 -> A shape 3-5), › › on
 * the bass the bass's only (A string 3-5 -> E string 8-10), › on the piano
 * shifts data-s1-notes by 12 and leaves both necks; the Do major scale's
 * default box is the span-4 position nearest the nut, 0-3 (VMU-202 / PR #171:
 * the octave no longer picks a scale box). S1-16 and S1-20 keep their "one line"
 * per ROW of a head (reformulated: a row's text boxes grouped into horizontal
 * bands); S1-20 now also walks the Dictionary-only functions (needs:
 * "dictionary": the heads' ▶ and the position arrows) in the Dictionary.
 * Positive controls (L1b-1b report): a 140px head turns S1-21 red
 *   S1_PROBE_INJECT_CSS='.proto-a{--proto-head-h:140px!important}' npm run s1:probe
 * and labels made too wide for their room turn S1-21's width check red alone
 *   S1_PROBE_INJECT_CSS='.proto-a__head-label{letter-spacing:6px!important}' npm run s1:probe -- --access-only
 * Positive control: S1-22 prints "N/49 keys named". Giving the keyboard its old
 * look (unplayed names hidden except the Cs) drops N from 49 to 7 in Do majeur
 * and 9 in Sol#m7, and only S1-22 turns red (S1-1, -2, -4, -10 stay green):
 *   S1_PROBE_INJECT_CSS='.piano-vertical .note-label--unplayed > :not(.piano-octave-name){display:none!important}' npm run s1:probe -- --only=cmaj,gsm7
 * and the grey put back to the page's muted grey on the white keys drops the
 * readable count and the contrast, again with S1-22 alone red:
 *   S1_PROBE_INJECT_CSS='.piano-vertical .white-key .note-label--unplayed{color:#8c8c8c!important}' npm run s1:probe -- --only=cmaj,gsm7
 *
 * VMU-185 (the direct selectors: the Studio's style, the Dictionary's family,
 * root note and chord / scale type, a second row of the transport block) adds
 * S1-23, decisive, on Gabriel's page at 3840x2045 and 3840x2160, in FR / EN / PT
 * / ZH, in the Studio and the Dictionary (a single note, chords, scales), each
 * with the Assistant drawer closed and open (runSelection): the row is a direct
 * child of [data-s1="transport"], the top row's controls still in the block
 * above it; each state holds exactly its controls (composer.style / dico.famille
 * + dico.fondamentale + dico.type-accord or dico.type-gamme, none of the others),
 * each once, visible, >= 48px high, text = 14px (+-0.5, VMU-212), on top at its centre; no name
 * cut (the longest name of each menu, measured in the field's font, fits the
 * room the field gives it); the row and the block keep ONE height in every state
 * (+-1px; the block <= 190px, it was 98); the page does not scroll and the
 * keyboard's bottom stays >= 40px above the window's; each menu's open list is
 * entirely in the window with its first option on top. Then what the controls
 * do (FR), against theory.js read through the module graph (CHORDS, SCALES,
 * generateChordsFromNNS, bricks.json) and literal anchors: each menu holds the
 * data's own entries (12 notes, every chord, every scale, every style); root Do
 * -> Re moves data-s1-notes by +2 (60 64 67 -> 62 66 69); Majeur -> Mineur
 * lowers the third (60 64 67 -> 60 63 67); Gammes + a scale give the scale's
 * pitch classes and change data-s1-positions; a single note has no type menu;
 * in the Studio a style changes the name shown, the tempo it imposes and the
 * chord names of the sequencer's DAW helper; the row and the drawer show one
 * state. Failures are tagged [presence] [foreground] [size] [fit] [height]
 * [scroll] [lists] [function] so a positive control can be shown to move one.
 *   npm run s1:probe -- --selection-only   # S1-23 alone
 * Positive controls (VMU-185 report): hiding the row turns [presence] red (and
 * S1-20, whose data-fn go missing)
 *   S1_PROBE_INJECT_CSS='[data-s1="selection"]{display:none!important}' npm run s1:probe -- --access-only
 * a transparent veil over it turns [foreground] red alone
 *   S1_PROBE_INJECT_CSS='[data-s1="selection"]{position:relative!important}[data-s1="selection"]::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:auto}' npm run s1:probe -- --selection-only
 * a 160px item in it turns [height] red alone (the page does not scroll)
 *   S1_PROBE_INJECT_CSS='[data-s1="selection"]::after{content:"";display:block;width:100px;height:160px}' npm run s1:probe -- --selection-only
 * and two mutations of src/prototype/SelectionRow.jsx (the probe reads classes
 * React computes, not CSS): wiring the root note's onChange to setDictType, or
 * giving the chord type menu the scale list, turn [function] red.
 *
 * L1b-1c adds S1-26, decisive, on Gabriel's page at 3840x2045 and 3840x2160: the
 * label of a neck's position is a button that opens a panel over the neck (Mi /
 * La / Ré with Do's fret, a root string changes the shape drawn, reset, Escape)
 * without changing the heads' 100px or moving the keyboard; no warning sign in
 * the Studio (VMU-201: the necks keep their octave-0 shape).
 *   npm run s1:probe -- --position-panel-only   # S1-26 alone
 * Positive control: hide the button, S1-26 (and S1-20 / S1-21) turn red
 *   S1_PROBE_INJECT_CSS='[data-fn^="jouer.position-panneau-"]{display:none!important}' npm run s1:probe -- --position-panel-only
 *
 * VMU-212 (part 1, Gabriel 2026-11-05: "fonts are generally far too big") adds
 * S1-28, decisive, on Gabriel's page at 3840x2045 and 3840x2160: ONE text size,
 * 14px — the sequencers' track-name size — for every text of A′, everywhere
 * except the instruments' frozen drawing (everything inside [data-s1=piano] /
 * [data-s1=guitar] / [data-s1=bass] below their .proto-a__inst-head heads) and
 * SVG text, which keeps its drawing with a floor of 14px on screen (font-size x
 * the viewBox scale). Seven states: Studio on arrival, Studio + Math dock,
 * Dictionary chord + scale, Assistant drawer open, "Instruments & Audio" open,
 * and the Guide. Portaled windows / lists / tooltips (Modal, CustomSelect,
 * InfoTooltip -> document.body) are walked too.
 *   npm run s1:probe -- --text-size-only   # S1-28 alone
 * Positive control: forcing --a-prime-fs back to 12px must turn S1-28 (and only
 * S1-28) red:
 *   S1_PROBE_INJECT_CSS=':root:has(.proto-a){--a-prime-fs:12px}' npm run s1:probe -- --text-size-only
 *
 * C-103 (Step 3a, Gabriel 2026-11-06) adds S1-29, decisive, at 3840x2045,
 * 2560x1440 and 2560x1283: below 2045px of height the instruments keep their
 * drawing (a white key stays 61px, a fret row its full-neck height) and show
 * fewer of them — the keyboard the largest whole octave count that fits
 * ((7k+1)*61+18 = 1787 / 1360 / 933 / 506), each neck the most frets whose
 * full-neck rows fit the keyboard's length (its bottom at/above the keyboard's
 * by less than one row); at 3840x2045 the result is identical to today
 * (4 octaves, frets 1-22). The window follows the music: the piano through
 * chooseKeyboardWindow, the necks through chooseFretWindow (core/instrumentWindow.js).
 *   npm run s1:probe -- --height-fit-only   # S1-29 alone
 * C-105 (Step 3b) adds 1920x970 and 2048x1052: below 2560px wide A′ is one
 * column and the key itself shrinks to keep 2 octaves —
 * key = min(61, max(--hit-min, floor((available - 18) / 15))) — so the key,
 * the octave count and the necks' full-neck rows all follow that key. The
 * piano is measured first, then the guitar is chosen for the neck readings.
 * Positive control: making chooseKeySize always return the full key must turn
 * S1-29 red at those two sizes (and only there); it does.
 *   (temporarily make chooseKeySize return fullKeyPx)
 *
 * C-107 (Step 3b, part 4) adds S1-30, decisive, at 1648x900 (the threshold
 * A_PRIME_MIN_WIDTH, moved there from 1600 because 1600's rail left a step cell
 * 45.9px wide), 1920x970, 2048x1052 and 2559x1283: the compact A′ page (no URL
 * parameter, Studio first) holds in four states — Studio+piano, Studio+guitar,
 * Dictionary+bass, Dictionary+scales+guitar — with one instrument column
 * inside the 24px right margin, the 56px header without overflow and every
 * header button >= --hit-min, the sequencer on the S1-11 rule (16 cells of
 * 48px per row, uncut), no horizontal page scroll (the page may scroll
 * vertically: scrollHeight is reported, not asserted). It also checks the
 * three instrument segments, the "Aide et réglages" menu (open, on top,
 * Escape -> focus on the button, a press outside closes), the whole parity
 * list at 1920x970 (needs "panel" excepted: the guitar's panel button is
 * only asserted to open a panel, its content is S1-26's at 3840), that 1647px
 * stays classic and 1648px A′, and — informative only — the smallest width
 * from 1440 to A_PRIME_MIN_WIDTH (step 16) where A′ (forced by ?prototype=a)
 * both has no horizontal scroll in all four states and keeps every step cell
 * >= 48px. The threshold is read from src/layout.js, never written here.
 * Behind --single-column-only: it loads ~55 pages, more than the ~2 min the
 * default run allows.
 *   npm run s1:probe -- --single-column-only   # S1-30 alone
 * Positive control: S1_PROBE_INJECT_CSS='.proto-a.proto-a--compact
 * .proto-a__tab{width:251px!important}' turns S1-30 red at the tightest
 * viewport (header).
 *
 * C-108 (Step 3b) adds the sticky instrument column to S1-30: in the two
 * Studio states the window is scrolled to its bottom and the column must stay
 * fully in the window (top >= -1, bottom <= innerHeight + 1, scrollY > 0).
 * C-108b (Step 3b) makes the key size independent of the instrument shown:
 * every state of a viewport records data-fit-key (on .proto-a) and must show
 * the SAME key as Studio+piano, and with the window at its top (scrollY 0) the
 * column must end inside the window (bottom <= innerHeight + 1) — the
 * Dictionary height C-108 only printed is now asserted. Two states exercise
 * the measure itself: Studio+guitar+reload (the Studio reopens on the guitar:
 * no piano to measure) and Studio+scrolled+bass (the bass is chosen while the
 * window is scrolled to its bottom, then the window goes back to the top).
 * Both must show the same key, the column inside the window.
 * Positive control: S1_PROBE_INJECT_CSS='.proto-a__grid--single
 * .proto-a__instrument{position:static!important}' turns S1-30 red in the two
 * Studio states (the column scrolls out of the window).
 * C-108b positive control: measuring the piano only again ([data-s1="piano"]
 * .piano-wrapper--vertical, other changes kept) turns --single-column-only red
 * on Studio+guitar+reload (key 61, column past the window).
 *
 *   npm run s1:probe                    # human-readable
 *   npm run s1:probe -- --json          # JSON, one entry per state
 *   npm run s1:probe -- --shot          # also PNGs in probe.local/ (gitignored)
 *   npm run s1:probe -- --only=gsm7,harm-gsm7   # only these scenario / state ids
 *   npm run s1:probe -- --viewport=3840x2045    # one other window size, instead of the two
 *
 * Positive control: S1_PROBE_INJECT_CSS="<css>" adds a <style> to every
 * page before measuring, e.g. forcing a label to 10px must turn S1-1 red:
 *   S1_PROBE_INJECT_CSS=".fretboard-container--vertical .note-marker{font-size:10px!important}" npm run s1:probe
 *
 * Why a browser: jsdom does no layout and resolves no media query or custom
 * property (CLAUDE.md "Pièges du dépôt"). Modelled on scripts/style_probe.mjs:
 * its own dev server on its own port (not 4173, not 5199), never writes to
 * dist/ or preview.local/.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { S1_SCENARIOS, S1_LABEL_MODES, S1_EXTRA_STATES } from "../src/prototype/s1Scenarios.js";
import { A_PRIME_ACCESS } from "../src/prototype/aPrimeAccess.js";
import { A_PRIME_MIN_WIDTH } from "../src/layout.js";
import { repoRootFrom } from "./lib/repoRoot.mjs";

// VMU-166: decoded with fileURLToPath (a space or a "~" in the path broke .pathname).
const ROOT = repoRootFrom(import.meta.url);

const PORT = Number(process.env.S1_PROBE_PORT ?? 5986);
const ORIGIN = `http://localhost:${PORT}`;
const INJECT_CSS = process.env.S1_PROBE_INJECT_CSS || "";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const AS_JSON = flag("json");
const SHOT = flag("shot");
const KEEP_OPEN = flag("headed");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length).split(",").filter(Boolean);

// --viewport=3840x2045 measures at another size INSTEAD of the two below
// (Gabriel's window is about 2045px high): an extra look, not a change of
// the 60-state matrix the decision rests on.
const VIEWPORT_ARG = (args.find((a) => a.startsWith("--viewport=")) || "").slice("--viewport=".length);
const [vpW, vpH] = VIEWPORT_ARG.split("x").map(Number);
const VIEWPORTS = VIEWPORT_ARG
  ? [{ w: vpW, h: vpH, label: `${vpW}x${vpH}` }]
  : [
      { w: 3840, h: 2160, label: "3840x2160" },
      { w: 3840, h: 2020, label: "3840x2020" },
    ];
// S1-20 (A′-ACCÈS) is measured at Gabriel's window height (2045, measured on
// his LibreWolf) and at the full 2160; --viewport replaces both.
const ACCESS_VIEWPORTS = VIEWPORT_ARG
  ? VIEWPORTS
  : [
      { w: 3840, h: 2045, label: "3840x2045" },
      { w: 3840, h: 2160, label: "3840x2160" },
    ];
// --selection-only: S1-23 alone (VMU-185), without the 60 states, S1-20 and S1-21.
// --confirm-only: S1-25 alone (VMU-126 / VMU-050).
const CONFIRM_ONLY = flag("confirm-only");
const SELECTION_ONLY = flag("selection-only");
// --chord-octave-only: S1-24 alone (VMU-186).
const CHORD_OCTAVE_ONLY = flag("chord-octave-only");
// --position-panel-only: S1-26 alone (L1b-1c).
const POSITION_PANEL_ONLY = flag("position-panel-only");
// --math-window-only: S1-27 alone (VMU-195-C).
const MATH_WINDOW_ONLY = flag("math-window-only");
// --text-size-only: S1-28 alone (VMU-212, one text size).
const TEXT_SIZE_ONLY = flag("text-size-only");
// --height-fit-only: S1-29 alone (C-103 Step 3a, fewer octaves/frets below 2045px).
const HEIGHT_FIT_ONLY = flag("height-fit-only");
// --single-column-only: S1-30 alone (C-107 Step 3b, the compact page from the
// A_PRIME_MIN_WIDTH threshold to 2559).
const SINGLE_COLUMN_ONLY = flag("single-column-only");
const ACCESS_ONLY = flag("access-only") || SELECTION_ONLY || CHORD_OCTAVE_ONLY || CONFIRM_ONLY || POSITION_PANEL_ONLY || MATH_WINDOW_ONLY || TEXT_SIZE_ONLY || HEIGHT_FIT_ONLY || SINGLE_COLUMN_ONLY;

// S1-29 (C-103 Step 3a): the window below Gabriel's 2045px is measured at the
// full height and at two shorter ones (a 2560 wide page, 1440 = a typical
// laptop, 1283 = the page where the instruments must first start giving way).
// C-105 (Step 3b) adds two single-column laptops (1920x970, 2048x1052): below
// 2560px wide the key itself shrinks to keep 2 octaves, floor 44px.
const HEIGHT_FIT_VIEWPORTS = [
  { w: 3840, h: 2045, label: "3840x2045" },
  { w: 2560, h: 1440, label: "2560x1440" },
  { w: 2560, h: 1283, label: "2560x1283" },
  // C-105 (Step 3b): below 2560px the single column shrinks the white key so
  // the keyboard keeps 2 octaves (never under --hit-min, 44px).
  { w: 1920, h: 970, label: "1920x970" },
  { w: 2048, h: 1052, label: "2048x1052" },
];

// S1-30 (C-107 Step 3b, part 4): the compact page, from its first pixel — the
// A_PRIME_MIN_WIDTH threshold, read from src/layout.js — to the last before the
// three-column layout at 2560. All four states are measured at each size; the
// segments and the help menu at the tightest one.
const SINGLE_COLUMN_VIEWPORTS = [
  { w: A_PRIME_MIN_WIDTH, h: 900, label: `${A_PRIME_MIN_WIDTH}x900` },
  { w: 1920, h: 970, label: "1920x970" },
  { w: 2048, h: 1052, label: "2048x1052" },
  { w: 2559, h: 1283, label: "2559x1283" },
];
/** The tightest compact size; it also carries the page-choice / segments / menu checks. */
const SINGLE_COLUMN_TIGHTEST = SINGLE_COLUMN_VIEWPORTS[0].label;

// S1-30 parity: every entry of the shared list but the dev-only one and the
// position panel's own (needs "panel"), which S1-26 walks at 3840. Grouped by
// the state the compact page must be in for them to exist — one page, one
// setup per state, never one reload per entry.
const SINGLE_COLUMN_PARITY = A_PRIME_ACCESS.filter((f) => !f.devOnly && f.needs !== "panel");

/** The state in which one registry entry exists on the compact page. */
function parityStateOf(f) {
  if (f.needs === "drawer") return "studio-drawer";
  if (f.compactNeeds === "menu") return "studio-menu";
  const instrument = f.compactNeeds ? f.compactNeeds.split(":")[1] : "piano";
  if (f.needs && f.needs.startsWith("dictionary")) {
    return `dict-${f.needs === "dictionary:scale" ? "scale" : "chord"}-${instrument}`;
  }
  return `studio-${instrument}`;
}

// In order: each setup is relative to the page the previous state left.
const SINGLE_COLUMN_PARITY_STATES = [
  { id: "studio-piano", search: "", ready: '[data-s1="piano"]' },
  { id: "studio-guitar", segment: "guitar" },
  { id: "studio-bass", segment: "bass" },
  { id: "studio-menu", click: "nav.aide-reglages" },
  { id: "studio-drawer", escape: true, click: "nav.studio-harmonie", open: '[data-s1="drawer"]' },
  { id: "dict-chord-piano", search: "?scenario=cmaj", ready: '[data-fn="dico.type-accord"]' },
  { id: "dict-chord-guitar", segment: "guitar" },
  { id: "dict-chord-bass", segment: "bass" },
  { id: "dict-scale-piano", search: "?scenario=cmajscale", ready: '[data-fn="dico.type-gamme"]' },
  { id: "dict-scale-guitar", segment: "guitar" },
  { id: "dict-scale-bass", segment: "bass" },
];

// VMU-212 follow-up (C-99d, Gabriel 2026-11-05: "Augmente la taille des polices
// de 2 points"): A′'s single text size, 12px -> 14px. One place for every
// threshold that encodes it: S1-21.labelFont, S1-23.label, S1-26.font,
// S1-27.text and S1-28.size / S1-28.svgFloor.
const A_PRIME_FS = 14;

// VMU-216: A′'s header height, 72px -> 56px. One place for the checks that
// encode it (S1-19's labelModesVerdict, S1-20's layoutFails).
const A_PRIME_HEADER = 56;

// VMU-216: the nine controls A′ omits (each is a duplicate of a direct access
// that stays). Each is tagged with a data-testid on the panel; in A′ the opened
// drawer (both modes) and Instruments & Audio must show none of them.
const A_PRIME_OMITTED = [
  "studio-style",
  "studio-octave",
  "select-root-note",
  "select-family",
  "select-octave",
  "select-chord-type",
  "select-scale-type",
  "select-instrument",
  "select-master-volume",
];

// Thresholds, spec §2 table. `decides` = counts for the A′ / B decision.
const CRITERIA = [
  { id: "S1-1", decides: true, what: "label font-size >= 18px" },
  { id: "S1-2", decides: true, what: "label fits its pastille / key (no overflow, no ellipsis)" },
  { id: "S1-3", decides: true, what: "guitar/bass pastille diameter >= 48px" },
  { id: "S1-4", decides: true, what: "0 overlapping pairs (pastilles, labels, fret numbers, black keys)" },
  { id: "S1-5", decides: true, what: "fret pitch (frets 0..12) >= 64px" },
  { id: "S1-6", decides: true, what: "frets visible without scroll: guitar 0-15, bass 0-12" },
  { id: "S1-7", decides: true, what: "string pitch centre to centre >= 56px" },
  { id: "S1-8", decides: true, what: "white key >= 52px thick, black key >= 30px" },
  { id: "S1-9", decides: true, what: "piano: >= 29 white keys (4 octaves) visible without scroll" },
  { id: "S1-10", decides: true, what: "black-key label inside its key" },
  { id: "S1-11", decides: true, what: "sequencer: 16 step cells per row, each >= 48px wide, the grid never cut" },
  { id: "S1-12", decides: false, what: "no page scroll: scrollHeight <= innerHeight, scrollWidth <= innerWidth" },
  { id: "S1-13", decides: false, what: "no interactive element intercepted (elementFromPoint)" },
  // L1a (coordinator): a layout that drops a note loses a function, so this
  // one decides like S1-1..S1-11.
  { id: "S1-15", decides: true, what: "every active note has its key (piano) or its pastille (neck), on screen" },
  // L1a-fix1 (Gabriel): the piano used to overflow its column and touch the
  // guitar neck, the heads were glued to the left, the bass ended at the
  // window's edge. Decides like S1-15: a layout that crowds an instrument is
  // a layout that fails.
  { id: "S1-16", decides: true, what: "instrument columns: no overlap, piano -> guitar and guitar -> bass >= 24px, right margin >= 24px, head padding-left >= 16px (one line, aligned), the three instruments start at the same height, the piano's keys fill their box evenly (same empty space left and right)" },
  // L1a-fix1 (Gabriel): the frets get closer towards the body and the neck
  // carries the markers a real one has. Decides like S1-5 / S1-16.
  // L1a-fix2 (Gabriel, 2026-10-06): the two necks are as long as the keyboard.
  // The "height <= before" limit is replaced by "the bottom of each neck is the
  // bottom of the keyboard (+-1px)", and the fixed 84 -> 56px by the same 1.5
  // ratio on a larger scale, so that the rows fill that length.
  { id: "S1-17", decides: true, what: "neck: its bottom is the keyboard's bottom (+-1px) and starts where it starts, fret pitch linear and strictly decreasing with first : last = 1.5 (>= 52 everywhere), 12px markers on 3 5 7 9 12x2 15 17 19 21 (those the neck has): a single one between the two middle strings, the two on 12 spread over the width (guitar 2-3 and 4-5, bass 1-2 and 3-4), under the pastilles; numbers and pastilles on their row's middle" },
  // Coordinator's amendment: the left rail is gone, its two mode buttons are
  // tabs in the header after the title.
  { id: "S1-18", decides: true, what: "mode tabs: 'Mode Studio' / 'Mode Dictionnaire' in the 56px header after the title, >= 48px high; no left rail (the page starts at <= 24px)" },
  // Coordinator, after her QA: the label modes are a function, not a fixture.
  // (Their behaviour without bench=1 is checked per viewport, see runNoBench.)
  { id: "S1-19", decides: true, what: "label modes: one 'Sur les notes' group of 3 segments (data-fn nav.noms-notes-eu / -us / nav.etiquettes-doigts) in the header, right of the tabs, >= 48px high, header still 56px, each button once, none in the centre column" },
  // L1b-1a (Gabriel: "le nom des notes ... sur toutes les touches du piano"; he
  // is a beginner). S1-21 is the next slice's (the instrument heads): it will
  // be added there, nothing is renumbered.
  { id: "S1-22", decides: true, what: "piano: all 49 keys named (an unplayed key by its name, a C with its octave, a black key with its flat), each name readable: >= 18px, >= 4.5:1 against what is behind it, inside its key; no two labels overlap" },
  // VMU-212 (part 1): one text size. `matrix: false`: like S1-20..S1-27 it runs
  // on Gabriel's page (no bench), not per state of the matrix — listed here so
  // the decision's "S1-1..S1-28" counts it, and filtered out of the matrix
  // loops (MATRIX_CRITERIA).
  { id: "S1-28", decides: true, matrix: false, what: "one text size: every A′ text 14px (+-0.5), the instruments' frozen drawing excepted, SVG text >= 14px on screen" },
  // C-103 (Step 3a): below 2045px the instruments keep their drawing and show
  // fewer octaves / frets. Also matrix:false (per viewport, on Gabriel's page).
  { id: "S1-29", decides: true, matrix: false, what: "height fit: below 2045px the instruments show fewer octaves/frets; at 2560+ the white key stays 61px, below 2560px (single column, C-105) it shrinks to keep 2 octaves, floor --hit-min; the fret rows keep their full-neck height at that key, their bottom at/above the keyboard's by less than one row; 3840x2045 identical to today (4 octaves, frets 1-22)" },
  // C-107 (Step 3b, part 4): the compact page, A_PRIME_MIN_WIDTH..2559 px
  // (the threshold read from src/layout.js). Also matrix:false, and run only by
  // --single-column-only (it loads ~55 pages; the default run has no room for
  // that). One pixel under the threshold must stay classic.
  { id: "S1-30", decides: true, matrix: false, what: `single column (${A_PRIME_MIN_WIDTH}..2559px): one instrument column ending before the 24px right margin, the same data-fit-key in every state (Studio+piano as the reference) and at the top of the page the column ending inside the window (including after a reload on the guitar and after choosing the bass while scrolled), staying fully in the window when the page is scrolled to its bottom in the two Studio states, a 56px header that never overflows with every button >= --hit-min, the sequencer's 16 cells of 48px per row uncut, no horizontal page scroll in Studio+piano / Studio+guitar / Dictionary+bass / Dictionary+scales+guitar; the three segments switch the column, the help menu opens (controls on top) and closes on Escape (focus back) or a press outside; every entry of the parity list reachable at 1920x970; ${A_PRIME_MIN_WIDTH - 1}px classic / ${A_PRIME_MIN_WIDTH}px A′; threshold 1440..${A_PRIME_MIN_WIDTH} informative (no scroll and cells >= 48px)` },
];

// The per-state matrix criteria (S1-28 is a per-viewport check, see above).
const MATRIX_CRITERIA = CRITERIA.filter((c) => c.matrix !== false);

// S1-16 thresholds (L1a-fix1 brief E, as amended by the coordinator: 24px
// everywhere after the UX critique — the centre keeps its 2764px).
const S1_16 = { pianoToNeck: 24, neckToNeck: 24, columnGap: 24, rightMargin: 24, headPadding: 16, topTolerance: 1 };

// S1-17 limits: no fret row is narrower than a 48px pastille needs (fix1); the
// pitch's first : last ratio is 1.5, the 84 : 56 of fix1 kept on a larger scale
// (fix2); a neck ends where the keyboard ends, within 1px (fix2).
const S1_17 = { minPitch: 52, ratio: 1.5, ratioTolerance: 0.02, bottomTolerance: 1 };

// S1-22 (L1b-1a): the vertical keyboard counted by hand (29 white + 20 black =
// 49 keys), the label size of S1-1, WCAG's 4.5:1 for normal text, and what an
// UNPLAYED key must say in each notation (a played key keeps its role label,
// or in harmonic mode its rank line: only its being readable is checked). The
// names are written here, not imported from the component (PianoKeyboard.jsx
// NOTES / FLAT_EQUIVALENTS): the page must not grade itself.
const S1_22 = {
  keys: 49,
  minFont: 18,
  minContrast: 4.5,
  names: {
    eu: { sharp: ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"], flat: { 1: "Réb", 3: "Mib", 6: "Solb", 8: "Lab", 10: "Sib" } },
    us: { sharp: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], flat: { 1: "Db", 3: "Eb", 6: "Gb", 8: "Ab", 10: "Bb" } },
  },
};

// ─── dev server (same pattern as scripts/style_probe.mjs) ─────────────────

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await isServerUp()) return { server: null, reused: true };
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: path.join(ROOT, "vite.config.js"),
    root: ROOT,
    logLevel: "warn",
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isServerUp()) return { server, reused: false };
    await new Promise((r) => setTimeout(r, 200));
  }
  await server.close();
  throw new Error(`vite did not answer on ${ORIGIN} within 60s`);
}

// ─── in-page measurement (page.evaluate: no access to the outer scope) ─────

function measureInPage() {
  const EPS = 0.5; // px: sub-pixel rounding tolerance for containment
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = (el) => el.getBoundingClientRect();
  const round = (n) => Math.round(n * 10) / 10;
  const visible = (el) => {
    const b = r(el);
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const textRect = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  };
  const inside = (a, b) =>
    a.left >= b.left - EPS && a.right <= b.right + EPS && a.top >= b.top - EPS && a.bottom <= b.bottom + EPS;
  const area = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const describe = (el) => {
    const t = (el.textContent || "").trim().slice(0, 12);
    const cls = [...el.classList].filter((c) => !c.startsWith("role-")).slice(0, 2).join(".");
    return `${el.tagName.toLowerCase()}.${cls}${t ? `"${t}"` : ""}`;
  };

  const piano = document.querySelector('[data-s1="piano"] .piano-vertical');
  const necks = {
    guitar: document.querySelector('[data-s1="guitar"] .fretboard-vertical'),
    bass: document.querySelector('[data-s1="bass"] .fretboard-vertical'),
  };
  const out = { missing: [] };
  if (!piano) out.missing.push("piano");
  if (!necks.guitar) out.missing.push("guitar");
  if (!necks.bass) out.missing.push("bass");
  if (out.missing.length) return out;

  // Every element of the three instruments that carries its own text.
  const instrumentRoots = [piano, necks.guitar, necks.bass];
  const textEls = instrumentRoots.flatMap((root) =>
    [...root.querySelectorAll("*")].filter(
      (e) => visible(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    )
  );

  // S1-1 — computed font-size of every instrument label.
  const sizes = textEls.map((e) => ({ el: e, fs: parseFloat(getComputedStyle(e).fontSize) }));
  const small = sizes.filter((s) => s.fs < 18);
  out.s1_1 = {
    n: sizes.length,
    min: sizes.length ? Math.min(...sizes.map((s) => s.fs)) : null,
    fails: small.slice(0, 5).map((s) => `${describe(s.el)}=${s.fs}px`),
    failCount: small.length,
  };

  // S1-2 — the label fits its pastille (neck markers) or its key (piano).
  const fitFails = [];
  let fitN = 0;
  for (const neck of Object.values(necks)) {
    for (const m of neck.querySelectorAll(".note-marker")) {
      if (!visible(m) || !m.textContent.trim()) continue;
      fitN++;
      const cs = getComputedStyle(m);
      const box = r(m);
      const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const padR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const content = { left: box.left + padL, right: box.right - padR, top: box.top, bottom: box.bottom };
      const tr = textRect(m);
      const overflow = m.scrollWidth > m.clientWidth;
      const ellipsis = cs.textOverflow === "ellipsis";
      if (overflow || ellipsis || !inside(tr, content)) {
        fitFails.push(`${describe(m)} text ${round(tr.width)}px in ${round(content.right - content.left)}px`);
      }
    }
  }
  for (const key of piano.querySelectorAll(".piano-key")) {
    const label = key.querySelector(".note-label");
    if (!label || !visible(label)) continue;
    fitN++;
    const tr = textRect(label);
    if (label.scrollWidth > label.clientWidth || !inside(tr, r(key))) {
      fitFails.push(`${describe(label)} text ${round(tr.width)}x${round(tr.height)} out of key ${round(r(key).width)}x${round(r(key).height)}`);
    }
  }
  out.s1_2 = { n: fitN, failCount: fitFails.length, fails: fitFails.slice(0, 5) };

  // S1-3 — pastille diameter (guitar / bass).
  const markers = Object.values(necks).flatMap((n) => [...n.querySelectorAll(".note-marker")].filter(visible));
  const diam = markers.map((m) => Math.min(r(m).width, r(m).height));
  out.s1_3 = { n: diam.length, min: diam.length ? round(Math.min(...diam)) : null };

  // S1-4 — overlapping pairs, per instrument: pastilles, labels, fret
  // numbers, black keys (+ any inlay dot, VMU-155). A label inside its own
  // pastille / key is the same object, not an overlap (ancestor pairs skipped).
  const overlap = { pairs: 0, borderBoxPairs: 0, examples: [], n: 0 };
  const collect = (root, selectors) =>
    [...root.querySelectorAll(selectors.join(","))].filter((e) => visible(e) && (e.textContent.trim() || !e.matches(".note-label")));
  const groups = [
    collect(piano, [".black-key", ".note-label"]),
    collect(necks.guitar, [".note-marker", ".fbv-fret-number", ".open-string-name", ".string-status-symbol", ".fretboard-dot", ".range-warning"]),
    collect(necks.bass, [".note-marker", ".fbv-fret-number", ".open-string-name", ".string-status-symbol", ".fretboard-dot", ".range-warning"]),
  ];
  // What is DRAWN, not just the border box: a target note's dashed outline
  // (outline-offset 3px + 2px) and a pastille's ring (box-shadow spread)
  // paint outside getBoundingClientRect — a collision the eye sees and a
  // border-box test would miss (first run of this probe, G#m7 guitar).
  const visualRect = (el) => {
    const b = r(el);
    const cs = getComputedStyle(el);
    let grow = 0;
    if (cs.outlineStyle !== "none") grow = Math.max(grow, parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth));
    if (cs.boxShadow && cs.boxShadow !== "none") {
      for (const shadow of cs.boxShadow.split(/,(?![^(]*\))/)) {
        if (/inset/.test(shadow)) continue;
        const nums = shadow.replace(/rgba?\([^)]*\)/g, "").trim().split(/\s+/).map(parseFloat).filter(Number.isFinite);
        // offset-x offset-y blur spread. Only hard-edged shadows count (blur
        // 0: a ring such as 0 0 0 2px, drawn as a shape); a blurred drop
        // shadow fades out and draws no edge, so it is not a collision.
        if (nums.length >= 4 && nums[2] === 0) grow = Math.max(grow, nums[3] + Math.max(Math.abs(nums[0]), Math.abs(nums[1])));
      }
    }
    return { left: b.left - grow, right: b.right + grow, top: b.top - grow, bottom: b.bottom + grow };
  };
  for (const els of groups) {
    overlap.n += els.length;
    const rects = els.map(visualRect);
    const boxes = els.map(r);
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
        if (area(boxes[i], boxes[j]) > 0.01) overlap.borderBoxPairs++;
        const a = area(rects[i], rects[j]);
        if (a > 0.01) {
          overlap.pairs++;
          if (overlap.examples.length < 5) overlap.examples.push(`${describe(els[i])} x ${describe(els[j])} = ${round(a)}px²`);
        }
      }
    }
  }
  out.s1_4 = overlap;

  // S1-5 / S1-6 / S1-7 — neck geometry.
  out.necks = {};
  for (const [name, neck] of Object.entries(necks)) {
    const rows = [...neck.querySelectorAll(".fbv-fret-row")].map((row) => ({ fret: Number(row.dataset.fret), rect: r(row) }));
    const pitch = [];
    for (let f = 1; f <= 12; f++) {
      const a = rows.find((x) => x.fret === f - 1);
      const b = rows.find((x) => x.fret === f);
      if (a && b) pitch.push(b.rect.bottom - a.rect.bottom);
    }
    // Fret visible without scroll: its whole row inside the viewport.
    let lastVisible = -1;
    for (const row of rows.sort((x, y) => x.fret - y.fret)) {
      if (row.rect.top >= -EPS && row.rect.bottom <= vh + EPS && row.rect.left >= -EPS && row.rect.right <= vw + EPS) lastVisible = row.fret;
      else break;
    }
    const cells = [...neck.querySelectorAll('.fbv-fret-row[data-fret="1"] .fbv-cell')].map((c) => {
      const b = r(c);
      return b.left + b.width / 2;
    });
    const gaps = cells.slice(1).map((c, i) => c - cells[i]);
    out.necks[name] = {
      frets: rows.length - 1,
      minFretPitch: pitch.length ? round(Math.min(...pitch)) : null,
      lastVisibleFret: lastVisible,
      minStringPitch: gaps.length ? round(Math.min(...gaps)) : null,
      bottom: round(r(neck).bottom),
    };
  }

  // S1-8 / S1-9 / S1-10 — piano.
  const whites = [...piano.querySelectorAll(".white-key")].map(r);
  const blacks = [...piano.querySelectorAll(".black-key")];
  const whitesVisible = whites.filter((b) => b.top >= -EPS && b.bottom <= vh + EPS).length;
  const blackLabelFails = [];
  let blackLabels = 0;
  let widestBlack = null; // L1a: the margin, not only the verdict
  for (const k of blacks) {
    const label = k.querySelector(".note-label");
    if (!label || !visible(label)) continue;
    blackLabels++;
    const tr = textRect(label);
    if (!widestBlack || tr.width > widestBlack.w) widestBlack = { w: round(tr.width), key: round(r(k).width), text: (label.textContent || "").trim() };
    if (!inside(r(label), r(k)) || !inside(tr, r(k))) blackLabelFails.push(`${describe(label)} ${round(tr.width)}x${round(tr.height)} in ${round(r(k).width)}x${round(r(k).height)}`);
  }
  out.piano = {
    whiteKeys: whites.length,
    minWhite: whites.length ? round(Math.min(...whites.map((b) => b.height))) : null,
    minBlack: blacks.length ? round(Math.min(...blacks.map((k) => r(k).height))) : null,
    whitesVisible,
    blackLabels,
    blackLabelFails,
    widestBlack,
    bottom: round(r(piano).bottom),
  };

  // S1-22 (L1b-1a) — raw measures of the 49 keys' names: for every key of the
  // vertical piano, its label's text parts, whether it is a lit key, the
  // smallest font size and the smallest contrast of its text against what is
  // REALLY behind it (the key's own fill, else the page's; opacity counted),
  // and whether the text sits inside its key. Then the overlaps among the
  // labels and between a label and another key's black key. The thresholds,
  // the 49 and the expected names are applied in namedKeysVerdict(), written
  // there on purpose and NOT imported from the component: the page must not
  // grade itself.
  {
    const parseRgb = (s) => {
      const m = /rgba?\(([^)]+)\)/.exec(s || "");
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
    };
    const over = (top, base) => ({
      r: top.r * top.a + base.r * (1 - top.a),
      g: top.g * top.a + base.g * (1 - top.a),
      b: top.b * top.a + base.b * (1 - top.a),
    });
    // What is painted behind an element: its ancestors' fills, bottom up.
    const backdrop = (el) => {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parseRgb(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) {
          layers.push(c);
          if (c.a >= 1) break;
        }
      }
      let base = { r: 255, g: 255, b: 255 };
      for (const c of layers.reverse()) base = over(c, base);
      return base;
    };
    const lum = (c) => {
      const f = (v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    // The colour a text really has on screen: its colour times the opacity of
    // the element and of every ancestor up to the key, over the key's backdrop.
    const textContrast = (el, key, bg) => {
      const c = parseRgb(getComputedStyle(el).color);
      if (!c) return NaN; // a colour syntax this probe does not read: unreadable, never "passes"
      let alpha = c.a;
      for (let e = el; e && e !== key.parentElement; e = e.parentElement) alpha *= parseFloat(getComputedStyle(e).opacity);
      return ratio(over({ ...c, a: alpha }, bg), bg);
    };
    const s1_22 = { keys: [], pairs: 0, examples: [] };
    const labelsOfKeys = [];
    for (const key of piano.querySelectorAll(".piano-key")) {
      const label = key.querySelector(".note-label");
      const shown = Boolean(label && visible(label) && label.textContent.trim());
      const bg = backdrop(key);
      const carriers = shown
        ? [label, ...label.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        : [];
      const tr = shown ? textRect(label) : null;
      s1_22.keys.push({
        abs: Number(key.getAttribute("data-abs")),
        title: key.getAttribute("title"),
        lit: [...key.classList].some((c) => c.startsWith("role-")),
        black: key.classList.contains("black-key"),
        shown,
        parts: shown ? (label.children.length ? [...label.children].map((c) => c.textContent.trim()) : [label.textContent.trim()]) : [],
        fontSize: carriers.length ? Math.min(...carriers.map((e) => parseFloat(getComputedStyle(e).fontSize))) : null,
        contrast: carriers.length ? Math.round(Math.min(...carriers.map((e) => textContrast(e, key, bg))) * 100) / 100 : null,
        inside: shown ? inside(tr, r(key)) : false,
      });
      if (shown) labelsOfKeys.push({ key, label, tr });
    }
    const blackKeys = [...piano.querySelectorAll(".black-key")];
    for (let i = 0; i < labelsOfKeys.length; i++) {
      for (let j = i + 1; j < labelsOfKeys.length; j++) {
        if (area(labelsOfKeys[i].tr, labelsOfKeys[j].tr) > 0.01) {
          s1_22.pairs++;
          if (s1_22.examples.length < 5) s1_22.examples.push(`${describe(labelsOfKeys[i].label)} x ${describe(labelsOfKeys[j].label)}`);
        }
      }
      for (const bk of blackKeys) {
        if (bk === labelsOfKeys[i].key) continue;
        if (area(labelsOfKeys[i].tr, r(bk)) > 0.01) {
          s1_22.pairs++;
          if (s1_22.examples.length < 5) s1_22.examples.push(`${describe(labelsOfKeys[i].label)} x ${describe(bk)}`);
        }
      }
    }
    out.s1_22 = s1_22;
  }

  // S1-11 — the REAL sequencer (VMU-213, part 2, replaces the V3 projection):
  // 16 step cells per track row (the loop's window), each >= 48px wide, and the
  // grid never cut (no row scrolls horizontally, no cell is clipped by its row).
  const sequencer = document.querySelector('[data-s1="sequencer"]');
  const seqRows = sequencer ? [...sequencer.querySelectorAll(".steps-container")] : [];
  const seqLamps = sequencer ? [...sequencer.querySelectorAll(".step-lamp")] : [];
  const seqLampW = seqLamps.map((el) => el.getBoundingClientRect().width);
  const seqRowCounts = seqRows.map((row) => row.querySelectorAll(".step-lamp").length);
  const seqScrolls = sequencer
    ? [...sequencer.querySelectorAll(".scrollable-instrument")].filter((el) => el.scrollWidth > el.clientWidth + 1).length
    : 0;
  // The "cut" check measures the cell's LAYOUT box against its row. Active cells
  // carry a `transform: scale(1.05)` glow (PianoRoll.jsx) that getBoundingClientRect
  // reflects; that is a visual flourish, not a clipped grid (no ancestor scrolls or
  // hides overflow). Neutralize transform for the geometry comparison — and disable
  // the cells' `transition: all` so the change applies synchronously.
  const seqTransforms = seqLamps.map((el) => el.style.getPropertyValue("transform"));
  seqLamps.forEach((el) => {
    el.style.setProperty("transition", "none", "important");
    el.style.setProperty("transform", "none", "important");
  });
  if (sequencer) void sequencer.offsetWidth; // flush style before measuring
  let seqCut = 0;
  try {
    for (const el of seqLamps) {
      const b = el.getBoundingClientRect();
      const row = el.closest(".steps-container");
      const rb = row ? row.getBoundingClientRect() : null;
      if (rb && (b.left < rb.left - 0.5 || b.right > rb.right + 0.5 || b.top < rb.top - 0.5 || b.bottom > rb.bottom + 0.5)) seqCut++;
    }
  } finally {
    seqLamps.forEach((el, i) => {
      el.style.removeProperty("transform");
      if (seqTransforms[i]) el.style.setProperty("transform", seqTransforms[i]);
      el.style.removeProperty("transition");
    });
  }
  out.s1_11 = {
    sequencer: Boolean(sequencer),
    rows: seqRows.length,
    rowCounts: seqRowCounts,
    cellCount: seqLamps.length,
    minCellWidth: seqLampW.length ? round(Math.min(...seqLampW)) : null,
    scrolls: seqScrolls,
    cut: seqCut,
  };

  // S1-12 — page scroll. The probe loads every state with bench=1, which draws
  // the bench's two fixture panels above the sequencer ([data-s1="scenarios"] and
  // [data-s1="states"], only when bench is set) and pushes the Studio past its
  // window. Gabriel never sees them — S1-19 proves there are 0 fixtures without
  // bench=1 — so scrollHeight / scrollWidth are read with the fixtures hidden
  // (inline display:none, saved and restored right after the reading, so no
  // other check sees the change).
  const benchFixtureEls = ["scenarios", "states"]
    .map((id) => document.querySelector(`[data-s1="${id}"]`))
    .filter(Boolean);
  const benchFixtureDisplays = benchFixtureEls.map((el) => el.style.getPropertyValue("display"));
  const benchFixturesHeight = benchFixtureEls.reduce((sum, el) => sum + r(el).height, 0);
  benchFixtureEls.forEach((el) => el.style.setProperty("display", "none", "important"));
  void document.documentElement.offsetHeight; // flush style before measuring
  const s1_12 = {
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: vh,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
    benchFixturesHeight: round(benchFixturesHeight),
  };
  benchFixtureEls.forEach((el, i) => {
    if (benchFixtureDisplays[i]) el.style.setProperty("display", benchFixtureDisplays[i]);
    else el.style.removeProperty("display");
  });
  out.s1_12 = s1_12;

  // S1-13 — every interactive element whose centre is on screen answers
  // elementFromPoint with itself (or a descendant).
  const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]')].filter(visible);
  let checked = 0;
  let offscreen = 0;
  const intercepted = [];
  for (const el of interactive) {
    const b = r(el);
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    if (x < 0 || y < 0 || x >= vw || y >= vh) {
      offscreen++;
      continue;
    }
    checked++;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) {
      intercepted.push(`${describe(el)} <- ${hit ? describe(hit) : "null"}`);
    }
  }
  out.s1_13 = { checked, offscreen, intercepted };

  // S1-15 (L1a) — what the engine hands each instrument (PrototypeA.jsx's
  // data-s1-notes / data-s1-positions) against what is drawn: a lit key
  // (a role class) for every piano pitch, a pastille in the right cell for
  // every neck position, each visible and inside the viewport.
  const onScreen = (el) => {
    if (!visible(el)) return false;
    const b = r(el);
    return b.top >= -EPS && b.bottom <= vh + EPS && b.left >= -EPS && b.right <= vw + EPS;
  };
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pitchName = (p) => `${NAMES[p % 12]}${Math.floor(p / 12) - 1}`;
  const s1_15 = { n: 0, fails: [] };
  const pianoNotes = (document.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes") || "")
    .split(" ").filter(Boolean).map(Number);
  for (const p of pianoNotes) {
    s1_15.n++;
    const key = piano.querySelector(`.piano-key[data-abs="${p}"]`);
    if (!key) s1_15.fails.push(`piano ${pitchName(p)}: no key`);
    else if (![...key.classList].some((c) => c.startsWith("role-"))) s1_15.fails.push(`piano ${pitchName(p)}: key not lit`);
    else if (!onScreen(key)) s1_15.fails.push(`piano ${pitchName(p)}: key off screen`);
  }
  for (const [name, neck] of Object.entries(necks)) {
    const positions = (document.querySelector(`[data-s1="${name}"]`).getAttribute("data-s1-positions") || "")
      .split(" ").filter(Boolean);
    for (const pos of positions) {
      s1_15.n++;
      const [s, f] = pos.split(":");
      const marker = neck.querySelector(`.fbv-fret-row[data-fret="${f}"] .fbv-cell[data-string-index="${s}"] .note-marker`);
      if (!marker) s1_15.fails.push(`${name} string ${s} fret ${f}: no pastille`);
      else if (!onScreen(marker)) s1_15.fails.push(`${name} string ${s} fret ${f}: pastille off screen`);
    }
  }
  s1_15.piano = pianoNotes.map(pitchName);
  const win = piano.querySelectorAll(".white-key[data-abs]");
  const abs = [...win].map((k) => Number(k.getAttribute("data-abs")));
  s1_15.window = abs.length ? `${pitchName(Math.min(...abs))}-${pitchName(Math.max(...abs))}` : "?";
  out.s1_15 = s1_15;

  // S1-16 (L1a-fix1) — the three instrument columns, raw measures (the
  // thresholds are applied in verdicts()). For each: the column's own box
  // (the grid area's section), the instrument it holds (the piano's wrapper,
  // a neck's container), and how far its head (title + caption) sits from the
  // column's left edge. The page's usable width is clientWidth, so a page
  // scrollbar cannot flatter the right margin.
  const s1_16 = { viewport: document.documentElement.clientWidth };
  for (const id of ["piano", "guitar", "bass"]) {
    const section = document.querySelector(`[data-s1="${id}"]`);
    const content = section.querySelector(id === "piano" ? ".piano-wrapper--vertical" : ".fretboard-container--vertical");
    // The head's ROWS (its children): L1a-fix1's title and caption, one line
    // each; since L1b-1b two rows of controls (name + ▶, ‹ setting ›).
    const heads = [...section.querySelectorAll(".proto-a__inst-head > *")];
    const headBox = section.querySelector(".proto-a__inst-head");
    // Lines a row's text runs over. L1b-1b reformulation (same meaning, "one
    // line per row"): the row's text boxes grouped into horizontal bands — a
    // box that overlaps a band vertically is on that line. It used to count
    // the distinct tops of the row's text, which held while a row was one
    // span, but a row of "‹ Do4 – Sol4 ›" centres a 24px arrow and an 18px
    // label on one line with different tops; a wrapped label still makes a
    // second band below the first.
    const lines = (el) => {
      const rects = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        rects.push(...[...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
      }
      rects.sort((a, b) => a.top - b.top);
      let bands = 0;
      let bottom = -Infinity;
      for (const q of rects) {
        if (q.top >= bottom - 0.5) {
          bands++;
          bottom = q.bottom;
        } else bottom = Math.max(bottom, q.bottom);
      }
      return bands;
    };
    const sb = r(section);
    const cb = content ? r(content) : null;
    s1_16[id] = {
      colLeft: round(sb.left),
      colRight: round(sb.right),
      left: cb ? round(cb.left) : null,
      right: cb ? round(cb.right) : null,
      top: cb ? round(cb.top) : null,
      headPad: heads.length ? round(Math.min(...heads.map((h) => r(h).left)) - sb.left) : null,
      headHeight: headBox ? round(r(headBox).height) : null,
      headLines: heads.length ? Math.max(...heads.map(lines)) : null,
    };
    if (id === "piano" && cb) {
      // The keys inside their box: what is left empty on each side. The white
      // keys used to be 200px in a 238px box, 29px empty on the right.
      const keys = section.querySelector(".piano-vertical");
      const kb = keys ? r(keys) : null;
      s1_16.piano.insetLeft = kb ? round(kb.left - cb.left) : null;
      s1_16.piano.insetRight = kb ? round(cb.right - kb.right) : null;
    }
  }
  const centreBox = document.querySelector('[data-s1="center"]');
  s1_16.leftMargin = centreBox ? round(r(centreBox).left) : null;
  out.s1_16 = s1_16;

  // S1-18 (coordinator's amendment) — the mode tabs in the header.
  {
    const header = document.querySelector("header.proto-a__header");
    const title = header ? header.querySelector(".proto-a__title") : null;
    const tabs = ["Mode Studio", "Mode Dictionnaire"].map((label) => (header ? header.querySelector(`button[aria-label="${label}"]`) : null));
    const boxes = tabs.map((t) => (t ? r(t) : null));
    const hb = header ? r(header) : null;
    out.s1_18 = {
      present: tabs.map(Boolean),
      heights: boxes.map((b) => (b ? round(b.height) : null)),
      widths: boxes.map((b) => (b ? round(b.width) : null)),
      afterTitle: Boolean(title && boxes[0] && boxes[0].left >= r(title).right - EPS),
      sideBySide: Boolean(boxes[0] && boxes[1] && boxes[1].left >= boxes[0].right - EPS && Math.abs(boxes[0].top - boxes[1].top) <= 1),
      inHeader: Boolean(hb && boxes.every((b) => b && b.top >= hb.top - EPS && b.bottom <= hb.bottom + EPS)),
      rail: Boolean(document.querySelector(".proto-a__rail")),
      firstColumnLeft: s1_16.leftMargin,
    };
  }

  // S1-19 (coordinator, after her QA) — the label modes ("Noms Do Ré Mi" /
  // "Noms C D E" / "Doigts") are a real function, in the header on the right:
  // one control with three segments titled "Sur les notes", >= 48px high, the
  // header keeping its 56px (VMU-216), each button once (the probe waits on
  // [data-labels]) and none left in the centre column.
  {
    const FNS = ["nav.noms-notes-eu", "nav.noms-notes-us", "nav.etiquettes-doigts"];
    const header = document.querySelector("header.proto-a__header");
    const hb = header ? r(header) : null;
    const group = header ? header.querySelector('[role="group"][aria-label="Sur les notes"]') : null;
    const btns = FNS.map((fn) => (header ? header.querySelector(`button[data-fn="${fn}"]`) : null));
    const boxes = btns.map((b) => (b ? r(b) : null));
    const gb = group ? r(group) : null;
    const tabsNav = header ? header.querySelector("nav.proto-a__tabs") : null;
    const drawerBtn = header ? header.querySelector('[data-testid="proto-drawer-toggle"]') : null;
    out.s1_19 = {
      group: Boolean(group),
      present: btns.map(Boolean),
      heights: boxes.map((b) => (b ? round(b.height) : null)),
      widths: boxes.map((b) => (b ? round(b.width) : null)),
      headerHeight: hb ? round(hb.height) : null,
      inHeader: Boolean(hb && boxes.every((b) => b && b.top >= hb.top - EPS && b.bottom <= hb.bottom + EPS)),
      // Joined segments share their 1px border: touching is allowed, overlapping by more is not.
      sideBySide: boxes.every((b, i) => b && (i === 0 || (b.left >= boxes[i - 1].right - 1.5 && Math.abs(b.top - boxes[i - 1].top) <= 1))),
      afterTabs: Boolean(gb && tabsNav && gb.left >= r(tabsNav).right - EPS),
      beforeDrawer: Boolean(gb && drawerBtn && gb.right <= r(drawerBtn).left + EPS),
      labelButtons: document.querySelectorAll("[data-labels]").length,
      inCentre: document.querySelectorAll('[data-s1="center"] [data-labels]').length,
    };
  }

  // S1-17 (L1a-fix1) — the neck's fret geometry, raw. The frets that carry a
  // marker are Gabriel's list, kept here on purpose and NOT imported from the
  // component: the page must not grade itself.
  const MARKS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 };
  const centre = (b) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
  out.s1_17 = {};
  {
    // The keyboard's box: the length the necks must have (fix2).
    const kb = r(document.querySelector('[data-s1="piano"] .piano-wrapper--vertical'));
    out.s1_17.keyboard = { top: round(kb.top), bottom: round(kb.bottom), height: round(kb.height) };
  }
  for (const [name, neck] of Object.entries(necks)) {
    const rows = [...neck.querySelectorAll(".fbv-fret-row")]
      .map((row) => ({ fret: Number(row.dataset.fret), row, rect: r(row) }))
      .sort((a, b) => a.fret - b.fret);
    const pitches = rows.filter((x) => x.fret >= 1).map((x) => x.rect.height);
    const fails = [];
    // Markers: exactly Gabriel's frets (and only the ones this neck has).
    const found = {};
    for (const d of neck.querySelectorAll("[data-fret-marker]")) {
      const f = Number(d.getAttribute("data-fret-marker"));
      found[f] = (found[f] || 0) + 1;
    }
    for (const f of new Set([...Object.keys(found), ...Object.keys(MARKS)].map(Number))) {
      const want = rows.some((x) => x.fret === f) ? MARKS[f] || 0 : 0;
      if ((found[f] || 0) !== want) fails.push(`fret ${f}: ${found[f] || 0} marker(s), expected ${want}`);
    }
    // Each marker: 12px, on the middle of its case (vertically). Across the
    // neck (coordinator, after her QA): a single dot between the TWO MIDDLE
    // strings (guitar D / G, bass A / D); the two dots of fret 12 spread over
    // the width like a real neck - guitar between strings 2-3 and 4-5, bass
    // between 1-2 and 3-4, i.e. one string pitch either side of the board's
    // middle, each in the gap between two strings. And under any pastille it
    // touches.
    let dots = 0;
    const byFret = {};
    for (const d of neck.querySelectorAll("[data-fret-marker]")) {
      const f = Number(d.getAttribute("data-fret-marker"));
      (byFret[f] = byFret[f] || []).push(d);
    }
    for (const [fretKey, group] of Object.entries(byFret)) {
      const f = Number(fretKey);
      const row = rows.find((x) => x.fret === f);
      if (!row) continue;
      const bw = parseFloat(getComputedStyle(row.row).borderBottomWidth) || 0;
      const rowMidY = (row.rect.top + row.rect.bottom - bw) / 2;
      const cells = [...row.row.querySelectorAll(".fbv-cell")].map((c) => centre(r(c)).x).sort((a, b) => a - b);
      const boardMidX = (cells[0] + cells[cells.length - 1]) / 2;
      const boxes = group.map(r).sort((a, b) => a.left - b.left);
      const stringPitch = cells.length > 1 ? cells[1] - cells[0] : 0;
      // Where the dots must be: the board's middle for one, one string pitch
      // either side of it for two.
      const wantX = boxes.length === 2 ? [boardMidX - stringPitch, boardMidX + stringPitch] : [boardMidX];
      boxes.forEach((db, i) => {
        dots++;
        const dc = centre(db);
        if (wantX[i] === undefined || Math.abs(dc.x - wantX[i]) > 1.5) fails.push(`fret ${f} marker at x=${round(dc.x)}, expected x=${wantX[i] === undefined ? "?" : round(wantX[i])}`);
        // In the gap between two strings, never on a string.
        const gapMids = cells.slice(1).map((x, k) => (x + cells[k]) / 2);
        if (!gapMids.some((x) => Math.abs(x - dc.x) <= 1.5)) fails.push(`fret ${f} marker at x=${round(dc.x)} is not between two strings`);
        if (Math.abs(centre(db).y - rowMidY) > 1) fails.push(`fret ${f} marker ${round(centre(db).y - rowMidY)}px off the middle of its case`);
        if (Math.abs(db.width - 12) > 0.5 || Math.abs(db.height - 12) > 0.5) fails.push(`fret ${f} marker is ${round(db.width)}x${round(db.height)}px, 12px expected`);
        if (db.top < row.rect.top - EPS || db.bottom > row.rect.bottom - bw + EPS) fails.push(`fret ${f} marker leaves its case`);
      });
    }
    for (const d of neck.querySelectorAll("[data-fret-marker]")) {
      const f = Number(d.getAttribute("data-fret-marker"));
      const row = rows.find((x) => x.fret === f);
      if (!row) continue;
      const db = r(d);
      const dc = centre(db);
      for (const m of row.row.querySelectorAll(".note-marker")) {
        const mb = r(m);
        const mc = centre(mb);
        const dist = Math.hypot(dc.x - mc.x, dc.y - mc.y);
        const overlap = mb.width / 2 + db.width / 2 - dist;
        if (overlap > 1.5 && dist > 0) {
          // A point inside the pastille, on the line to the marker's centre.
          const k = (mb.width / 2 - 1) / dist;
          const stack = document.elementsFromPoint(mc.x + (dc.x - mc.x) * k, mc.y + (dc.y - mc.y) * k);
          const iM = stack.findIndex((e) => m.contains(e));
          const iD = stack.indexOf(d);
          if (iD !== -1 && (iM === -1 || iM > iD)) fails.push(`fret ${f} marker is painted over a pastille`);
        }
      }
    }
    // Numbers, pastilles and markers share their row's middle: one position.
    let aligned = 0;
    for (const { fret, row, rect } of rows) {
      const bw = parseFloat(getComputedStyle(row).borderBottomWidth) || 0;
      const midY = (rect.top + rect.bottom - bw) / 2;
      const parts = [...row.querySelectorAll(".fbv-fret-number, .note-marker")];
      for (const p of parts) {
        aligned++;
        const off = centre(r(p)).y - midY;
        if (Math.abs(off) > 1) fails.push(`fret ${fret} ${p.classList.contains("note-marker") ? "pastille" : "number"} ${round(off)}px off its row's middle`);
      }
    }
    out.s1_17[name] = {
      frets: pitches.length,
      pitches: pitches.map(round),
      top: round(r(neck).top),
      bottom: round(r(neck).bottom),
      height: round(r(neck).height),
      dots,
      aligned,
      fails: fails.slice(0, 6),
      failCount: fails.length,
    };
  }

  // Informational (VMU-155 "noms et degrés mélangés"): what kind of text
  // each instrument shows on its active notes in this state.
  const kind = (t) => (/^[b#♭♯]?\d{1,2}$/.test(t) ? "degree" : "name");
  out.labelKinds = {};
  const pianoTexts = [...piano.querySelectorAll(".piano-key[class*='role-'] .note-label")].map((l) => l.textContent.trim());
  out.labelKinds.piano = pianoTexts;
  for (const [name, neck] of Object.entries(necks)) {
    const texts = [...neck.querySelectorAll(".note-marker")].map((m) => m.textContent.trim());
    const kinds = new Set(texts.map(kind));
    out.labelKinds[name] = { texts: [...new Set(texts)], mixed: kinds.size > 1 };
  }
  return out;
}

// ─── verdicts ───────────────────────────────────────────────────────────────

/** S1-16: [pass, "measured values; what failed"] from the raw column boxes. */
function columnsVerdict(c) {
  const EPS = 0.5;
  const { piano, guitar, bass } = c;
  const fails = [];
  // 1. An instrument stays inside its own column.
  for (const [id, col] of Object.entries({ piano, guitar, bass })) {
    if (col.right > col.colRight + EPS) fails.push(`${id} content ends at x=${col.right}, ${round1(col.right - col.colRight)}px beyond its column (x=${col.colRight})`);
  }
  // 2. No horizontal overlap between neighbouring instruments, as drawn and as columns.
  const pianoToNeck = round1(guitar.left - piano.right);
  const neckToNeck = round1(bass.left - guitar.right);
  const gapPG = round1(guitar.colLeft - piano.colRight);
  const gapGB = round1(bass.colLeft - guitar.colRight);
  if (pianoToNeck < 0) fails.push(`piano overlaps the guitar by ${-pianoToNeck}px`);
  if (neckToNeck < 0) fails.push(`guitar overlaps the bass by ${-neckToNeck}px`);
  // 3. Distances.
  if (pianoToNeck < S1_16.pianoToNeck) fails.push(`piano -> guitar ${pianoToNeck}px < ${S1_16.pianoToNeck}px`);
  if (neckToNeck < S1_16.neckToNeck) fails.push(`guitar -> bass ${neckToNeck}px < ${S1_16.neckToNeck}px`);
  if (gapPG < S1_16.columnGap) fails.push(`column gap piano | guitar ${gapPG}px < ${S1_16.columnGap}px`);
  if (gapGB < S1_16.columnGap) fails.push(`column gap guitar | bass ${gapGB}px < ${S1_16.columnGap}px`);
  const rightMargin = round1(c.viewport - bass.right);
  if (rightMargin < S1_16.rightMargin) fails.push(`right margin after the bass ${rightMargin}px < ${S1_16.rightMargin}px`);
  // 4. Heads: not glued to the left, and aligned the same way in the three columns.
  const pads = { piano: piano.headPad, guitar: guitar.headPad, bass: bass.headPad };
  for (const [id, pad] of Object.entries(pads)) {
    if (!(pad >= S1_16.headPadding)) fails.push(`${id} head padding-left ${pad}px < ${S1_16.headPadding}px`);
  }
  const padValues = Object.values(pads).filter(Number.isFinite);
  if (padValues.length && Math.max(...padValues) - Math.min(...padValues) > 1) fails.push(`head padding differs between columns (${padValues.join(" / ")}px)`);
  // 5. Each row of a head on one line, the same height in the three columns, so
  // that the three instruments start at the same height (a two-line head used
  // to push the bass neck 14px below the guitar's). headLines is the most
  // lines any row of that head runs over (L1b-1b: per row, the heads have two).
  const headLines = [piano, guitar, bass].map((col) => col.headLines);
  if (headLines.some((n) => n !== 1)) fails.push(`a head row runs over ${headLines.join(" / ")} lines (piano / guitar / bass), one per row expected`);
  const heights = [piano, guitar, bass].map((col) => col.headHeight);
  if (Math.max(...heights) - Math.min(...heights) > S1_16.topTolerance) fails.push(`head heights differ (${heights.join(" / ")}px)`);
  const tops = [piano, guitar, bass].map((col) => col.top);
  if (Math.max(...tops) - Math.min(...tops) > S1_16.topTolerance) fails.push(`the instruments do not start at the same height (tops ${tops.join(" / ")}px)`);
  // 6. The keyboard's keys fill their box evenly: the same empty space on the
  // left and on the right (Gabriel asked for padding, not a lopsided void).
  if (!(Math.abs(piano.insetLeft - piano.insetRight) <= 1.5)) fails.push(`piano keys leave ${piano.insetLeft}px empty on the left of their box and ${piano.insetRight}px on the right`);
  const widths = [piano, guitar, bass].map((col) => round1(col.colRight - col.colLeft));
  const value =
    `columns ${widths.join(" / ")}px (piano / guitar / bass); piano -> guitar ${pianoToNeck}px, guitar -> bass ${neckToNeck}px; ` +
    `column gaps ${gapPG} / ${gapGB}px; margins left ${c.leftMargin}px, right ${rightMargin}px; head padding ${padValues.join(" / ")}px, ` +
    `head ${heights.join(" / ")}px high on ${headLines.join(" / ")} line(s); tops ${tops.join(" / ")}px; ` +
    `piano keys ${round1(piano.right - piano.left - piano.insetLeft - piano.insetRight)}px wide, ${piano.insetLeft} / ${piano.insetRight}px empty left / right` +
    (fails.length ? `; FAILED: ${fails.join(" | ")}` : "");
  return [fails.length === 0, value];
}

const round1 = (n) => Math.round(n * 10) / 10;

/** S1-19: [pass, "measured values; what failed"] from the raw header label control. */
function labelModesVerdict(t) {
  const fails = [];
  if (!t.group) fails.push("no 'Sur les notes' group in the header");
  const names = ["nav.noms-notes-eu", "nav.noms-notes-us", "nav.etiquettes-doigts"];
  t.present.forEach((p, i) => { if (!p) fails.push(`no button data-fn="${names[i]}" in the header`); });
  if (t.present.every(Boolean)) {
    if (t.heights.some((h) => !(h >= 48))) fails.push(`segment height ${t.heights.join(" / ")}px < 48px`);
    if (!t.inHeader) fails.push("the segments are not inside the header");
    if (!t.sideBySide) fails.push("the segments are not side by side");
  }
  if (!t.afterTabs) fails.push("the control is not to the right of the mode tabs");
  if (!t.beforeDrawer) fails.push("the control is not to the left of the drawer button");
  if (!(Math.abs(t.headerHeight - A_PRIME_HEADER) <= 0.5)) fails.push(`the header is ${t.headerHeight}px high, ${A_PRIME_HEADER}px expected (no height added)`);
  if (t.labelButtons !== 3) fails.push(`${t.labelButtons} [data-labels] buttons in the page, 3 expected (each once)`);
  if (t.inCentre !== 0) fails.push(`${t.inCentre} label button(s) left in the centre column`);
  const value =
    `segments ${t.widths.join(" / ")}px wide, ${t.heights.join(" / ")}px high; header ${t.headerHeight}px` +
    (fails.length ? `; FAILED: ${fails.join(" | ")}` : "");
  return [fails.length === 0, value];
}

/** S1-18: [pass, "measured values; what failed"] from the raw header tabs. */
function tabsVerdict(t) {
  const fails = [];
  if (!t.present[0]) fails.push("no 'Mode Studio' button in the header");
  if (!t.present[1]) fails.push("no 'Mode Dictionnaire' button in the header");
  if (t.present.every(Boolean)) {
    if (!t.afterTitle) fails.push("the tabs do not come after the title");
    if (!t.sideBySide) fails.push("the tabs are not side by side");
    if (!t.inHeader) fails.push("the tabs are not inside the header");
    if (t.heights.some((h) => !(h >= 48))) fails.push(`tab height ${t.heights.join(" / ")}px < 48px`);
  }
  if (t.rail) fails.push("the left rail is still there");
  if (!(t.firstColumnLeft <= 24)) fails.push(`the page starts at x=${t.firstColumnLeft}px, 24px or less expected without a rail`);
  const value =
    `tabs ${t.widths.join(" x ")} wide, ${t.heights.join(" / ")}px high; page starts at x=${t.firstColumnLeft}px` +
    (fails.length ? `; FAILED: ${fails.join(" | ")}` : "");
  return [fails.length === 0, value];
}

/** S1-17: [pass, "measured values; what failed"] from the raw neck geometry. */
function necksVerdict(c) {
  const parts = [];
  const fails = [];
  for (const name of ["guitar", "bass"]) {
    const n = c[name];
    const p = n.pitches;
    const strictlyDecreasing = p.length > 1 && p.every((v, i) => i === 0 || v < p[i - 1]);
    const min = Math.min(...p);
    const max = Math.max(...p);
    if (!strictlyDecreasing) fails.push(`${name}: fret pitch is not strictly decreasing`);
    // Linear, first : last = 1.5 (the 84 : 56 of fix1), whatever the scale.
    const step = p[0] - p[1];
    const ratio = p[0] / p[p.length - 1];
    if (Math.abs(ratio - S1_17.ratio) > S1_17.ratioTolerance) fails.push(`${name}: pitch runs ${p[0]} -> ${p[p.length - 1]}px, a ratio of ${Math.round(ratio * 1000) / 1000}, ${S1_17.ratio} expected`);
    if (p.some((v, i) => i > 0 && Math.abs(p[i - 1] - v - step) > 0.3)) fails.push(`${name}: fret pitch is not linear`);
    if (!(min >= S1_17.minPitch)) fails.push(`${name}: smallest pitch ${min}px < ${S1_17.minPitch}px`);
    // fix2: as long as the keyboard - same start, same end.
    const kb = c.keyboard;
    if (Math.abs(n.bottom - kb.bottom) > S1_17.bottomTolerance) fails.push(`${name}: the neck ends at y=${n.bottom}, the keyboard at y=${kb.bottom} (${round1(n.bottom - kb.bottom)}px)`);
    if (Math.abs(n.top - kb.top) > S1_17.bottomTolerance) fails.push(`${name}: the neck starts at y=${n.top}, the keyboard at y=${kb.top}`);
    for (const f of n.fails) fails.push(`${name}: ${f}`);
    if (n.failCount > n.fails.length) fails.push(`${name}: ${n.failCount - n.fails.length} more`);
    parts.push(`${name} pitch ${max}px (fret 1) -> ${min}px (fret ${p.length}), ratio ${Math.round(ratio * 100) / 100}, neck y ${n.top} -> ${n.bottom} (${n.height}px; keyboard y ${kb.top} -> ${kb.bottom}), ${n.dots} markers, ${n.aligned} parts on their row's middle`);
  }
  return [fails.length === 0, parts.join("; ") + (fails.length ? `; FAILED: ${fails.join(" | ")}` : "")];
}

/**
 * S1-22: [pass, "measured values; what failed"] from the raw key names. The
 * number printed first ("N/49 named") is the quantity the positive controls
 * move: hiding the unplayed names drops it from 49 to the lit keys plus the
 * unplayed Cs (7 in Do majeur, 9 in Sol#m7, the count of the old keyboard).
 */
function namedKeysVerdict(k, notation) {
  const fails = [];
  const total = k.keys.length;
  if (total !== S1_22.keys) fails.push(`${total} keys, ${S1_22.keys} expected`);
  const named = k.keys.filter((x) => x.shown);
  const unnamed = k.keys.filter((x) => !x.shown);
  if (unnamed.length) fails.push(`${unnamed.length} key(s) without a visible name: ${unnamed.slice(0, 4).map((x) => `${x.title}@${x.abs}`).join(", ")}${unnamed.length > 4 ? " ..." : ""}`);
  const unreadable = named.filter((x) => !(x.fontSize >= S1_22.minFont) || !(x.contrast >= S1_22.minContrast) || !x.inside);
  for (const x of unreadable.slice(0, 4)) fails.push(`"${x.parts.join(" ")}"@${x.abs} (${x.lit ? "lit" : "unplayed"}, ${x.black ? "black" : "white"} key): ${x.fontSize}px, ${x.contrast}:1${x.inside ? "" : ", text outside its key"}`);
  if (unreadable.length > 4) fails.push(`${unreadable.length - 4} more unreadable`);
  const names = S1_22.names[notation];
  const unplayed = k.keys.filter((x) => !x.lit);
  let asExpected = 0;
  const wrong = [];
  for (const x of unplayed.filter((y) => y.shown)) {
    if (!names) break;
    const pc = x.abs % 12;
    const want = x.black ? [names.sharp[pc], names.flat[pc]] : pc === 0 ? [`${names.sharp[0]}${Math.floor(x.abs / 12) - 1}`] : [names.sharp[pc]];
    if (JSON.stringify(x.parts) === JSON.stringify(want)) asExpected++;
    else wrong.push(`@${x.abs} reads [${x.parts.join(" ")}], [${want.join(" ")}] expected`);
  }
  if (!names) fails.push(`no expected names for notation "${notation}"`);
  if (wrong.length) fails.push(`${wrong.length} unplayed key(s) not named as expected: ${wrong.slice(0, 3).join("; ")}`);
  if (k.pairs) fails.push(`${k.pairs} overlapping pairs: ${k.examples.join(" | ")}`);
  const sizes = named.map((x) => x.fontSize);
  const weakest = named.reduce((w, x) => (w === null || x.contrast < w.contrast ? x : w), null);
  // The weakest contrast of each family, so the two tokens show separately.
  const minOf = (pred) => {
    const c = named.filter(pred).map((x) => x.contrast);
    return c.length ? `${Math.min(...c)}:1` : "n/a";
  };
  const value =
    `${named.length}/${S1_22.keys} keys named (${unplayed.length - unplayed.filter((x) => !x.shown).length}/${unplayed.length} unplayed, ${asExpected} as expected in "${notation}"), ` +
    `${named.length - unreadable.length} readable, min ${sizes.length ? Math.min(...sizes) : "n/a"}px, ` +
    `min contrast ${weakest ? `${weakest.contrast}:1 ("${weakest.parts.join(" ")}" ${weakest.lit ? "lit" : "unplayed"} ${weakest.black ? "black" : "white"})` : "n/a"} ` +
    `[unplayed white ${minOf((x) => !x.lit && !x.black)}, unplayed black ${minOf((x) => !x.lit && x.black)}, lit ${minOf((x) => x.lit)}], ${k.pairs} overlapping pairs`;
  return [fails.length === 0, value + (fails.length ? `; FAILED: ${fails.join(" | ")}` : "")];
}

function verdicts(m) {
  const v = {};
  const put = (id, pass, value) => (v[id] = { pass, value });
  if (m.missing?.length) {
    for (const c of MATRIX_CRITERIA) put(c.id, false, `instrument not rendered: ${m.missing.join(", ")}`);
    return v;
  }
  put("S1-1", m.s1_1.failCount === 0, `min ${m.s1_1.min}px over ${m.s1_1.n} labels${m.s1_1.failCount ? `; ${m.s1_1.failCount} < 18px: ${m.s1_1.fails.join(" | ")}` : ""}`);
  put("S1-2", m.s1_2.failCount === 0, `${m.s1_2.n - m.s1_2.failCount}/${m.s1_2.n} fit${m.s1_2.failCount ? `: ${m.s1_2.fails.join(" | ")}` : ""}`);
  put("S1-3", m.s1_3.n > 0 && m.s1_3.min >= 48, `min ${m.s1_3.min}px over ${m.s1_3.n} pastilles`);
  put("S1-4", m.s1_4.pairs === 0, `${m.s1_4.pairs} overlapping pairs as drawn (${m.s1_4.borderBoxPairs} by border box) among ${m.s1_4.n} objects${m.s1_4.pairs ? `: ${m.s1_4.examples.join(" | ")}` : ""}`);
  const g = m.necks.guitar;
  const b = m.necks.bass;
  put("S1-5", g.minFretPitch >= 64 && b.minFretPitch >= 64, `guitar ${g.minFretPitch}px, bass ${b.minFretPitch}px`);
  put("S1-6", g.lastVisibleFret >= 15 && b.lastVisibleFret >= 12, `guitar 0-${g.lastVisibleFret} of 0-${g.frets}, bass 0-${b.lastVisibleFret} of 0-${b.frets}`);
  put("S1-7", g.minStringPitch >= 56 && b.minStringPitch >= 56, `guitar ${g.minStringPitch}px, bass ${b.minStringPitch}px`);
  const p = m.piano;
  put("S1-8", p.minWhite >= 52 && p.minBlack >= 30, `white ${p.minWhite}px, black ${p.minBlack}px`);
  put("S1-9", p.whitesVisible >= 29, `${p.whitesVisible}/${p.whiteKeys} white keys visible (${Math.floor((p.whitesVisible - 1) / 7)} octaves)`);
  put("S1-10", p.blackLabelFails.length === 0, p.blackLabels ? `${p.blackLabels - p.blackLabelFails.length}/${p.blackLabels} inside, widest "${p.widestBlack.text}" ${p.widestBlack.w}px in ${p.widestBlack.key}px${p.blackLabelFails.length ? `: ${p.blackLabelFails.slice(0, 3).join(" | ")}` : ""}` : "n/a (no black-key label in this state)");
  // S1-11 (VMU-213, part 2): the real sequencer's step cells — 16 per row, each
  // >= 48px wide, and the grid never cut (no horizontal scroll, no clipped cell).
  const s11 = m.s1_11;
  const s11Ok =
    s11.sequencer &&
    s11.rows > 0 &&
    s11.cellCount > 0 &&
    s11.rowCounts.every((n) => n === 16) &&
    s11.minCellWidth >= 48 &&
    s11.scrolls === 0 &&
    s11.cut === 0;
  put("S1-11", s11Ok, `${s11.cellCount} step cells over ${s11.rows} rows (${s11.rowCounts.join(",")} cells each), smallest ${s11.minCellWidth}px wide, ${s11.scrolls} scrolling row(s), ${s11.cut} cut cell(s)${s11.sequencer ? "" : ", no sequencer"}`);
  const sc = m.s1_12;
  put("S1-12", sc.scrollHeight <= sc.innerHeight && sc.scrollWidth <= sc.innerWidth, `scrollHeight ${sc.scrollHeight} / innerHeight ${sc.innerHeight}, scrollWidth ${sc.scrollWidth} / ${sc.innerWidth}${sc.benchFixturesHeight ? ` (bench fixtures ${sc.benchFixturesHeight}px excluded)` : ""}`);
  const it = m.s1_13;
  put("S1-13", it.intercepted.length === 0, `${it.intercepted.length} intercepted of ${it.checked} on screen (${it.offscreen} off screen)${it.intercepted.length ? `: ${it.intercepted.slice(0, 3).join(" | ")}` : ""}`);
  const a = m.s1_15;
  put("S1-15", a.fails.length === 0, `${a.n - a.fails.length}/${a.n} drawn; piano [${a.piano.join(" ")}] in window ${a.window}${a.fails.length ? `: ${a.fails.slice(0, 4).join(" | ")}` : ""}`);
  put("S1-16", ...columnsVerdict(m.s1_16));
  put("S1-17", ...necksVerdict(m.s1_17));
  put("S1-18", ...tabsVerdict(m.s1_18));
  put("S1-19", ...labelModesVerdict(m.s1_19));
  put("S1-22", ...namedKeysVerdict(m.s1_22, m.expectedNotation));
  return v;
}

// ─── run ──────────────────────────────────────────────────────────────────

// The four S1 scenarios (applied from the URL), then the L1a states (applied
// by clicking the page's own button: the Studio one plays a chord, and no
// audio context starts without a real click).
const STATES = [
  ...S1_SCENARIOS.map((s) => ({ id: s.id, extra: false })),
  ...S1_EXTRA_STATES.map((x) => ({ id: x.id, extra: true })),
].filter((s) => ONLY.length === 0 || ONLY.includes(s.id));

async function runState(browser, viewport, state, labels) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    const query = state.extra ? `labels=${labels.id}` : `scenario=${state.id}&labels=${labels.id}`;
    await page.goto(`${ORIGIN}/?prototype=a&bench=1&${query}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    // The scenario is applied by an effect after the first paint: wait until
    // the page's own scenario / label buttons report it active.
    await page.locator(`[data-labels="${labels.id}"].is-active`).waitFor({ timeout: 10_000 });
    if (state.extra) {
      await page.locator(`[data-state="${state.id}"]`).click();
      await page.locator(`[data-state="${state.id}"].is-active`).waitFor({ timeout: 10_000 });
    } else {
      await page.locator(`[data-scenario="${state.id}"].is-active`).waitFor({ timeout: 10_000 });
    }
    await page.waitForTimeout(200);
    const m = await page.evaluate(measureInPage);
    // The notation the label mode asks for: what S1-22 expects an unplayed key to read.
    m.expectedNotation = labels.notation;
    if (SHOT) {
      fs.mkdirSync(path.join(ROOT, "probe.local"), { recursive: true });
      await page.screenshot({ path: path.join(ROOT, "probe.local", `s1-${viewport.label}-${state.id}-${labels.id}.png`) });
    }
    return { m, pageErrors };
  } catch (err) {
    return { m: { missing: [String(err && err.message ? err.message : err)] }, pageErrors };
  } finally {
    await page.close();
  }
}

// The assistant drawer (spec §1, A′): laid over the instruments, never over
// the centre column (P0-3: "on voit la piste changer pendant qu'on règle").
// Not an S1 criterion — reported as information, one line per viewport.
// The page as Gabriel reaches it, WITHOUT bench=1 (S1-19, behaviour): no
// scenario or state fixture, the three label modes there and working through
// the real application's state - clicking "Noms C D E" turns the lit piano
// keys' names from Do... to C..., each click moves the pressed segment.
async function runNoBench(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  try {
    await page.goto(`${ORIGIN}/?prototype=a&scenario=cmaj&labels=eu`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-labels="eu"].is-active').waitFor({ timeout: 10_000 });
    const pianoTexts = () =>
      page.evaluate(() => [...document.querySelectorAll('[data-s1="piano"] .piano-key[class*="role-"] .note-label')].map((l) => l.textContent.trim()));
    const fails = [];
    const fixtures = await page.evaluate(
      () => document.querySelectorAll('[data-scenario], [data-state], [data-s1="scenarios"], [data-s1="states"]').length
    );
    if (fixtures !== 0) fails.push(`${fixtures} scenario / state fixture(s) without bench=1`);
    const buttons = await page.evaluate(() => [...document.querySelectorAll("[data-labels]")].map((b) => `${b.getAttribute("data-labels")}:${b.getAttribute("data-fn")}`));
    if (buttons.length !== 3) fails.push(`${buttons.length} label buttons without bench=1, 3 expected`);
    const eu = await pianoTexts();
    await page.locator('[data-labels="us"]').click();
    await page.locator('[data-labels="us"].is-active').waitFor({ timeout: 10_000 });
    const us = await pianoTexts();
    if (!(eu.length > 0 && us.length === eu.length && eu.join("|") !== us.join("|"))) fails.push(`"Noms C D E" did not change the piano's names (${eu.join(" ")} -> ${us.join(" ")})`);
    if (!us.some((t) => /^C\b/.test(t))) fails.push(`"Noms C D E": no key named C (${us.join(" ")})`);
    await page.locator('[data-labels="fingers"]').click();
    await page.locator('[data-labels="fingers"].is-active').waitFor({ timeout: 10_000 });
    const euStillActive = await page.locator('[data-labels="eu"].is-active').count();
    const usStillActive = await page.locator('[data-labels="us"].is-active').count();
    if (euStillActive || usStillActive) fails.push('"Doigts" left another segment pressed');
    await page.locator('[data-labels="eu"]').click();
    await page.locator('[data-labels="eu"].is-active').waitFor({ timeout: 10_000 });
    const back = await pianoTexts();
    if (back.join("|") !== eu.join("|")) fails.push(`back on "Noms Do Ré Mi" the names are ${back.join(" ")}, not ${eu.join(" ")}`);
    return { fails, value: `no fixture; label buttons ${buttons.join(" ")}; piano names ${eu.join(" ")} -> ${us.join(" ")} -> (Doigts) -> ${back.join(" ")}` };
  } catch (err) {
    return { fails: [String(err && err.message ? err.message : err)], value: "" };
  } finally {
    await page.close();
  }
}

async function runDrawer(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  try {
    await page.goto(`${ORIGIN}/?prototype=a&bench=1&scenario=cmaj&labels=eu&drawer=open`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate(() => {
      const d = document.querySelector('[data-s1="drawer"]').getBoundingClientRect();
      const c = document.querySelector('[data-s1="center"]').getBoundingClientRect();
      const w = Math.min(d.right, c.right) - Math.max(d.left, c.left);
      const h = Math.min(d.bottom, c.bottom) - Math.max(d.top, c.top);
      const covered = ["piano", "guitar", "bass"].filter((id) => {
        const i = document.querySelector(`[data-s1="${id}"]`).getBoundingClientRect();
        return Math.min(d.right, i.right) - Math.max(d.left, i.left) > 0;
      });
      return {
        drawerLeft: Math.round(d.left), drawerWidth: Math.round(d.width), centreRight: Math.round(c.right),
        overlapPx2: w > 0 && h > 0 ? Math.round(w * h) : 0, covered,
      };
    });
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  } finally {
    await page.close();
  }
}

// ─── S1-20 (A′-ACCÈS) ────────────────────────────────────────────────────────

/** In page: where each data-fn is, and whether it is the element on top at its centre. */
function locateFns(fns) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const describe = (el) => {
    if (!el) return "null";
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
  };
  return fns.map((fn) => {
    const els = [...document.querySelectorAll(`[data-fn="${fn}"]`)];
    const el = els[0];
    if (!el) return { fn, count: 0 };
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const visible = b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
    const inViewport = b.left >= -0.5 && b.top >= -0.5 && b.right <= vw + 0.5 && b.bottom <= vh + 0.5;
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    const hit = x >= 0 && y >= 0 && x < vw && y < vh ? document.elementFromPoint(x, y) : null;
    const onTop = Boolean(hit && (hit === el || el.contains(hit)));
    return {
      fn,
      count: els.length,
      visible,
      inViewport,
      onTop,
      hit: onTop ? null : describe(hit),
      tag: el.tagName.toLowerCase(),
      rect: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) },
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
    };
  });
}

/** In page: the measures S1-20 keeps an eye on after adding the new controls. */
function accessLayout() {
  const de = document.documentElement;
  const r1 = (n) => Math.round(n * 10) / 10;
  const header = document.querySelector("header.proto-a__header");
  const hb = header ? header.getBoundingClientRect() : null;
  const kids = header ? [...header.children].map((c) => c.getBoundingClientRect()).filter((b) => b.width > 0) : [];
  let headerOverlaps = 0;
  for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 0.5) headerOverlaps++;
  // One entry per head ROW: the lines its text runs over, as horizontal bands
  // (L1b-1b reformulation, the same as S1-16's: a row of "‹ label ›" is one
  // line although its arrow and its label have different tops). A row with no
  // text (the Studio's empty setting row) counts as one line.
  const headLines = [...document.querySelectorAll(".proto-a__inst-head > *")].map((el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      rects.push(...[...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
    }
    rects.sort((a, b) => a.top - b.top);
    let bands = 0;
    let bottom = -Infinity;
    for (const q of rects) {
      if (q.top >= bottom - 0.5) {
        bands++;
        bottom = q.bottom;
      } else bottom = Math.max(bottom, q.bottom);
    }
    return Math.max(bands, 1);
  });
  const kb = document.querySelector('[data-s1="piano"] .piano-wrapper--vertical');
  const centre = document.querySelector('[data-s1="center"]');
  const transport = document.querySelector('[data-s1="transport"]');
  const viz = document.querySelector('[data-fn="son.visualiseur"]');
  return {
    scrollHeight: de.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: de.scrollWidth,
    innerWidth: window.innerWidth,
    headerHeight: hb ? r1(hb.height) : null,
    headerOverlaps,
    headerRight: kids.length ? r1(Math.max(...kids.map((b) => b.right))) : null,
    headLines,
    keyboardBottom: kb ? r1(kb.getBoundingClientRect().bottom) : null,
    centreBottom: centre && centre.children.length ? r1(Math.max(...[...centre.children].map((c) => c.getBoundingClientRect().bottom))) : null,
    transportHeight: transport ? r1(transport.getBoundingClientRect().height) : null,
    visualizer: viz ? { top: r1(viz.getBoundingClientRect().top), height: r1(viz.getBoundingClientRect().height) } : null,
  };
}

/** In page: the Assistant button's text against every colour stop of its background (VMU-184). */
function assistantContrast() {
  const el = document.querySelector('[data-fn="nav.studio-harmonie"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const parse = (s) => (String(s).match(/rgba?\([^)]*\)/g) || []).map((c) => c.match(/[\d.]+/g).slice(0, 3).map(Number));
  const stops = parse(cs.backgroundImage);
  if (!stops.length) stops.push(...parse(cs.backgroundColor));
  const text = parse(cs.color)[0];
  const lum = (rgb) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const ratios = stops.map((s) => ratio(text, s));
  return {
    color: cs.color,
    stops: stops.map((s) => `rgb(${s.join(", ")})`),
    min: ratios.length ? Math.round(Math.min(...ratios) * 100) / 100 : null,
    border: cs.borderTopColor,
    boxShadow: cs.boxShadow,
  };
}

/** S1-20 verdict on one locateFns() row. */
function locatedFails(row) {
  if (row.count !== 1) return [`${row.fn}: ${row.count} element(s), 1 expected`];
  const out = [];
  if (!row.visible) out.push(`${row.fn}: not visible`);
  if (!row.inViewport) out.push(`${row.fn}: off screen (${row.rect.x},${row.rect.y} ${row.rect.w}x${row.rect.h})`);
  if (row.visible && row.inViewport && !row.onTop) out.push(`${row.fn}: covered by ${row.hit}`);
  return out;
}

/** S1-20 verdict on one accessLayout() measure. */
function layoutFails(where, l) {
  const out = [];
  if (l.scrollHeight > l.innerHeight || l.scrollWidth > l.innerWidth) out.push(`${where}: the page scrolls (${l.scrollWidth}x${l.scrollHeight} in ${l.innerWidth}x${l.innerHeight})`);
  if (!(Math.abs(l.headerHeight - A_PRIME_HEADER) <= 0.5)) out.push(`${where}: header ${l.headerHeight}px high, ${A_PRIME_HEADER} expected`);
  if (l.headerOverlaps) out.push(`${where}: ${l.headerOverlaps} header item(s) overlapping the previous one`);
  if (l.headerRight > l.innerWidth - 24 + 0.5) out.push(`${where}: header items end at x=${l.headerRight}, past the 24px right margin`);
  if (l.headLines.some((n) => n !== 1)) out.push(`${where}: an instrument head runs over ${l.headLines.join(" / ")} lines`);
  return out;
}

/**
 * S1-20 on Gabriel's page (?prototype=a, no bench, Studio as on arrival):
 * every function there, on top; every opener opens and Escape closes; the
 * tempo typed; the page holding in four languages.
 */
async function runAccess(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const T = 4000;
  const sel = (id) => `[data-fn="${id}"]`;
  // What a failed step may leave open, closed before the next one: a step
  // must not fail because the previous one left a window over the page.
  const OVERLAYS = '.modal-overlay, .help-modal-overlay, [data-testid="custom-select-dropdown"], [data-s1="drawer"], input[data-fn="jouer.tempo-saisie"]';
  const step = async (name, body) => {
    try {
      const note = await body();
      if (note) notes.push(`${name} ${note}`);
    } catch (err) {
      fails.push(`${name}: ${String(err && err.message ? err.message : err).split("\n")[0]}`);
      for (let i = 0; i < 4 && (await page.locator(OVERLAYS).count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    }
  };
  const closesOnEscape = async (selector) => {
    await page.keyboard.press("Escape");
    await page.locator(selector).first().waitFor({ state: "detached", timeout: T });
  };
  let located = [];
  const layouts = {};
  let contrast = null;
  try {
    await page.goto(`${ORIGIN}/?prototype=a`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // 1. Every function of the list, where Gabriel's page shows it.
    // (VMU-185: the Studio's style menu is "needs: studio" - there on arrival.)
    // compactOnly (the compact page's help menu button, C-106) is absent at
    // 3840: S1-30 walks it below 2560.
    located = await page.evaluate(locateFns, A_PRIME_ACCESS.filter((f) => !f.compactOnly && (!f.needs || f.needs === "studio")).map((f) => f.fn));
    for (const row of located) fails.push(...locatedFails(row));
    layouts.studio = await page.evaluate(accessLayout);
    fails.push(...layoutFails("Studio", layouts.studio));
    contrast = { rest: await page.evaluate(assistantContrast) };

    // 2. Each opener opens what it must, and Escape closes it.
    await step("son.ouvrir", async () => {
      await page.locator(sel("son.ouvrir")).click({ timeout: T });
      await page.locator(".modal-container").waitFor({ state: "visible", timeout: T });
      const m = await page.evaluate(() => {
        const modal = document.querySelector(".modal-container");
        return {
          // VMU-216: the master volume is gone from the window (the transport
          // owns it) — the six mixer faders stay.
          master: modal.querySelectorAll('input[type="range"][min="-40"][max="0"]').length,
          faders: modal.querySelectorAll('input[type="range"][orient="vertical"]').length,
          // An element whose own text is "Kick" (the textContent of the whole
          // window runs the labels together: "...VolumesKickSnare...").
          kick: [...modal.querySelectorAll("*")].some((el) => el.children.length === 0 && el.textContent.trim() === "Kick"),
        };
      });
      if (m.master !== 0 || m.faders !== 6 || !m.kick) throw new Error(`window content: master volume ${m.master} (0 expected, the transport owns it), faders ${m.faders}, "Kick" ${m.kick}`);
      const omitted = await page.evaluate((ids) => {
        const modal = document.querySelector(".modal-container");
        return ids.filter((id) => modal.querySelector(`[data-testid="${id}"]`));
      }, A_PRIME_OMITTED);
      if (omitted.length) throw new Error(`Instruments & Audio still shows omitted control(s): ${omitted.join(", ")}`);
      await closesOnEscape(".modal-container");
      await page.locator(sel("son.ouvrir")).click({ timeout: T });
      await page.locator(".modal-container .modal-close-btn").click({ timeout: T });
      await page.locator(".modal-container").waitFor({ state: "detached", timeout: T });
      return `opens ${m.faders} faders with "Kick" (no master volume — the transport owns it); Escape and ✕ close`;
    });
    await step("aide.guide", async () => {
      await page.locator(sel("aide.guide")).click({ timeout: T });
      await page.locator(".help-modal-overlay").waitFor({ state: "visible", timeout: T });
      await closesOnEscape(".help-modal-overlay");
      return "opens; Escape closes";
    });
    await step("aide.theorie", async () => {
      await page.locator(sel("aide.theorie")).click({ timeout: T });
      await page.locator(".theory-modal-content").waitFor({ state: "visible", timeout: T });
      await closesOnEscape(".theory-modal-content");
      return "opens; Escape closes";
    });
    await step("aide.a-propos", async () => {
      await page.locator(sel("aide.a-propos")).click({ timeout: T });
      await page.locator('.modal-content a[href*="creativecommons.org/licenses/by/3.0"]').waitFor({ state: "visible", timeout: T });
      await closesOnEscape(".modal-content");
      return "opens with the CC BY 3.0 credit; Escape closes";
    });
    await step("nav.langue", async () => {
      const header = page.locator(`${sel("nav.langue")} .custom-select-header`);
      await header.click({ timeout: T });
      await page.locator('[data-testid="custom-select-dropdown"]').waitFor({ state: "visible", timeout: T });
      await closesOnEscape('[data-testid="custom-select-dropdown"]');
      // Each language: A′'s own labels follow it, and the page still holds.
      const seen = [];
      for (const lang of ["EN", "PT", "ZH", "FR"]) {
        await header.click({ timeout: T });
        await page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: lang }).first().click({ timeout: T });
        await page.waitForTimeout(300);
        const play = (await page.locator(sel("jouer.lecture")).textContent()).trim();
        const metro = (await page.locator(sel("jouer.metronome")).textContent()).trim();
        if (lang !== "FR" && (/Lire la progression/.test(play) || /Métronome/.test(metro))) throw new Error(`${lang}: the transport still reads "${play}" / "${metro}"`);
        const l = await page.evaluate(accessLayout);
        layouts[lang] = l;
        fails.push(...layoutFails(`language ${lang}`, l));
        seen.push(`${lang} "${play}"`);
      }
      return `opens its list, Escape closes it; ${seen.join(", ")}`;
    });
    await step("nav.studio-harmonie", async () => {
      await page.locator(sel("nav.studio-harmonie")).hover({ timeout: T });
      contrast.hover = await page.evaluate(assistantContrast);
      await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
      await page.mouse.move(0, viewport.h - 1);
      contrast.active = await page.evaluate(assistantContrast);
      const [close] = await page.evaluate(locateFns, ["nav.fermer-fenetres"]);
      const closeFails = locatedFails(close);
      if (closeFails.length) throw new Error(closeFails.join(" | "));
      await closesOnEscape('[data-s1="drawer"]');
      await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
      await page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: T });
      return "opens the drawer with its Fermer on top; Escape and Fermer close it";
    });
    await step("omitted controls", async () => {
      // VMU-216: none of the nine duplicated controls survives in A′. The
      // drawer (Studio then Dictionary) and Instruments & Audio show none.
      const absent = async (container) => {
        const found = await page.evaluate(({ container, ids }) => {
          const root = document.querySelector(container);
          return root ? ids.filter((id) => root.querySelector(`[data-testid="${id}"]`)) : ids;
        }, { container, ids: A_PRIME_OMITTED });
        if (found.length) throw new Error(`${container} still shows omitted control(s): ${found.join(", ")}`);
      };
      await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
      await absent('[data-s1="drawer"]');
      await page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: T });
      // The Dictionary's drawer (the mode tab is kept).
      await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
      await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
      await absent('[data-s1="drawer"]');
      await page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
      await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: T });
      // Back to the Studio for the checks that follow.
      await page.locator(sel("nav.mode-studio")).click({ timeout: T });
      return "Studio and Dictionary drawers show none of the 9 controls";
    });
    await step("jouer.tempo-saisie", async () => {
      const button = page.locator(`button${sel("jouer.tempo-saisie")}`);
      const typeTempo = async (value, key) => {
        await button.click({ timeout: T });
        const input = page.locator(`input${sel("jouer.tempo-saisie")}`);
        await input.waitFor({ state: "visible", timeout: T });
        const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-fn"));
        if (focused !== "jouer.tempo-saisie") throw new Error(`the field is not focused (${focused})`);
        await input.fill(String(value));
        await input.press(key);
        await button.waitFor({ state: "visible", timeout: T });
        return (await button.textContent()).trim();
      };
      const got = [];
      for (const [value, key, want] of [["90", "Enter", "90"], ["150", "Escape", "90"], ["59", "Enter", "90"], ["201", "Enter", "90"], ["60", "Enter", "60"], ["200", "Enter", "200"], ["95", "Enter", "95"]]) {
        const shown = await typeTempo(value, key);
        got.push(`${value}+${key}->${shown}`);
        if (shown !== want) throw new Error(`${value} + ${key} shows ${shown}, ${want} expected (${got.join(", ")})`);
      }
      // The owner of the tempo (transportOwner.js) holds what the badge shows.
      const ownerBpm = await page.evaluate(async () => (await import("/src/audio/transportOwner.js")).getTransportState().bpm);
      if (ownerBpm !== 95) throw new Error(`the transport owner holds ${ownerBpm}, the badge 95`);
      return `${got.join(", ")}; transport owner ${ownerBpm}`;
    });

    // 3. Dictionary too: the page holds without scrolling, and (L1b-1b) the
    // functions only the Dictionary has — the heads' ▶ and the necks' position
    // arrows — are there once, visible, on screen, on top.
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
    await page.waitForTimeout(300);
    layouts.dictionary = await page.evaluate(accessLayout);
    fails.push(...layoutFails("Dictionary", layouts.dictionary));
    const dictLocated = await page.evaluate(locateFns, A_PRIME_ACCESS.filter((f) => f.needs === "dictionary").map((f) => f.fn));
    for (const row of dictLocated) fails.push(...locatedFails(row).map((f) => `Dictionary: ${f}`));
    located = [...located, ...dictLocated];
    // VMU-185: the type menus exist only for their family: Chords, then Scales.
    for (const [index, needs] of [[1, "dictionary:chord"], [2, "dictionary:scale"]]) {
      await page.locator(`${sel("dico.famille")} button`).nth(index).click({ timeout: T });
      await page.waitForTimeout(300);
      const typeLocated = await page.evaluate(locateFns, A_PRIME_ACCESS.filter((f) => f.needs === needs).map((f) => f.fn));
      for (const row of typeLocated) fails.push(...locatedFails(row).map((f) => `Dictionary (${needs}): ${f}`));
      located = [...located, ...typeLocated];
    }
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (contrast) {
    for (const [state, c] of Object.entries(contrast)) {
      if (!c || !(c.min >= 4.5)) fails.push(`Assistant button text ${c ? `${c.min}:1` : "not found"} (${state}), 4.5:1 expected`);
    }
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  return { fails, notes, located, layouts, contrast };
}

/**
 * Mesure 3 of the brief: the transport's volume really changes the gain the
 * engine renders. Same technique as scripts/tempo_probe.mjs for the mixer: the
 * page imports the live /src/audio/AudioEngine.js, a small DC (ConstantSource,
 * 0.01) is fed into Tone.Destination's own gain node and an analyser reads
 * that node's output: mean / DC is the gain really rendered (not a getter).
 * Installed once, never disconnected (tempo_probe.mjs explains why).
 */
async function installDestinationTap() {
  const engine = await import("/src/audio/AudioEngine.js");
  // @ts-ignore — Tone internals: the context's Destination, its Volume's gain node
  const dest = engine.masterAnalyser.context.destination;
  const node = dest.input.output._gainNode;
  const ctx = dest.context.rawContext;
  const src = ctx.createConstantSource();
  src.offset.value = 0.01;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(node);
  node.connect(analyser);
  src.start();
  // @ts-ignore — page context
  window.__destTap = { analyser, dc: 0.01, dest };
  return ctx.state;
}

async function readDestinationTap() {
  await new Promise((resolve) => setTimeout(resolve, 250));
  // @ts-ignore — page context
  const { analyser, dc, dest } = window.__destTap;
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
  const linear = mean / dc;
  return {
    renderedDb: linear > 0 ? Math.round(20 * Math.log10(linear) * 100) / 100 : null,
    toneDb: Math.round(dest.volume.value * 100) / 100,
    ctxState: dest.context.rawContext.state,
  };
}

async function runVolume(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const T = 4000;
  const TOL = 0.1; // dB
  const steps = [];
  const setRange = (selector, value) =>
    page.evaluate(
      ({ selector, value }) => {
        const el = document.querySelector(selector);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(el, String(value));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      { selector, value },
    );
  const expectDb = (name, read, want) => {
    steps.push(`${name}: rendered ${read.renderedDb} dB (Tone ${read.toneDb})`);
    if (read.renderedDb == null || Math.abs(read.renderedDb - want) > TOL) fails.push(`${name}: rendered ${read.renderedDb} dB, ${want} expected`);
  };
  const TRANSPORT = '[data-fn="son.volume-general"]';
  try {
    await page.goto(`${ORIGIN}/?prototype=a&scenario=cmaj`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    // A real click on ▶: the browser starts the audio context only after a
    // user gesture. Then the chord rings out: the read is the output's mean.
    await page.locator('[data-fn="jouer.lecture"]').click({ timeout: T });
    await page.waitForTimeout(3000);
    const state = await page.evaluate(installDestinationTap);
    steps.push(`audio context ${state}`);
    expectDb("at rest", await page.evaluate(readDestinationTap), -12);

    await setRange(TRANSPORT, -30);
    await page.waitForTimeout(300);
    expectDb("transport slider -30", await page.evaluate(readDestinationTap), -30);
    const shown = (await page.locator('[data-s1="transport"]').textContent()) || "";
    if (!/-30 dB/.test(shown)) fails.push(`the transport does not show -30 dB`);

    // VMU-216: the window's master slider is gone, so there is no window-vs-
    // transport pair to keep in sync. What still matters — and is still
    // checked here — is that the transport's slider reaches the engine.
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  return { fails, steps };
}

// ─── S1-21 (L1b-1b): the column heads ───────────────────────────────────────

// S1-21 thresholds (brief L1b-1b): a 100px head (+-1), the same in the three
// columns, 48px targets, the keyboard's bottom at least 40px above the window's
// (3840 x 2045: <= 2005), the setting's label at 14px (VMU-212's one text size,
// checked +-0.5).
const S1_21 = { head: 100, headTolerance: 1, target: 48, minMargin: 40, labelFont: A_PRIME_FS };

// The piano's label is checked against an ORACLE computed here from what the
// engine hands the piano (data-s1-notes), never read from the page: the names
// are S1-22's own table (sharps, the page's default notation "eu"), and the
// format is the app's range ("low – high", or one name).
const headName = (midi) => `${S1_22.names.eu.sharp[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
function pianoRangeOracle(notesAttr) {
  const n = String(notesAttr || "").split(" ").filter(Boolean).map(Number);
  if (!n.length) return "";
  const lo = Math.min(...n);
  const hi = Math.max(...n);
  return lo === hi ? headName(lo) : `${headName(lo)} – ${headName(hi)}`;
}
/** Lowest-highest fret of a neck's data-s1-positions ("string:fret ..."). */
function fretSpan(positions) {
  const f = String(positions || "").split(" ").filter(Boolean).map((p) => Number(p.split(":")[1]));
  return f.length ? `${Math.min(...f)}-${Math.max(...f)}` : "none";
}

/** In page: the three heads, raw (S1-21). */
function headsMeasure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = (el) => el.getBoundingClientRect();
  const round = (n) => Math.round(n * 10) / 10;
  // Lines a row's text runs over: its text boxes grouped into horizontal bands
  // (the same reading as S1-16 and S1-20).
  const bands = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      rects.push(...[...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
    }
    rects.sort((a, b) => a.top - b.top);
    let count = 0;
    let bottom = -Infinity;
    for (const q of rects) {
      if (q.top >= bottom - 0.5) {
        count++;
        bottom = q.bottom;
      } else bottom = Math.max(bottom, q.bottom);
    }
    return count;
  };
  const cols = {};
  for (const id of ["piano", "guitar", "bass"]) {
    const section = document.querySelector(`[data-s1="${id}"]`);
    const head = section ? section.querySelector(".proto-a__inst-head") : null;
    if (!head) {
      cols[id] = null;
      continue;
    }
    const hb = r(head);
    const sb = r(section);
    const targets = [...head.querySelectorAll("button")].map((b) => {
      const q = r(b);
      const x = q.left + q.width / 2;
      const y = q.top + q.height / 2;
      const hit = x >= 0 && y >= 0 && x < vw && y < vh ? document.elementFromPoint(x, y) : null;
      return {
        fn: b.getAttribute("data-fn"),
        w: round(q.width),
        h: round(q.height),
        onTop: Boolean(hit && (hit === b || b.contains(hit))),
        inViewport: q.left >= -0.5 && q.top >= -0.5 && q.right <= vw + 0.5 && q.bottom <= vh + 0.5,
      };
    });
    const label = head.querySelector(".proto-a__head-label");
    let labelInfo = null;
    if (label) {
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = label.textContent.trim();
      const tr = range.getBoundingClientRect();
      const lb = r(label);
      const prev = label.previousElementSibling;
      const next = label.nextElementSibling;
      labelInfo = {
        text,
        fontSize: parseFloat(getComputedStyle(label).fontSize),
        textWidth: round(tr.width),
        boxWidth: round(lb.width),
        fits: !text || (label.scrollWidth <= label.clientWidth + 0.5 && tr.left >= lb.left - 0.5 && tr.right <= lb.right + 0.5),
        clearOfArrows: !text || ((!prev || tr.left >= r(prev).right - 0.5) && (!next || tr.right <= r(next).left + 0.5)),
        insideColumn: !text || (tr.left >= sb.left - 0.5 && tr.right <= sb.right + 0.5),
      };
    }
    const name = head.querySelector(".proto-a__head-name");
    const instrument = section.querySelector(id === "piano" ? ".piano-wrapper--vertical" : ".fretboard-container--vertical");
    cols[id] = {
      height: round(hb.height),
      top: round(hb.top),
      // The head must not be wider than its instrument: a neck's column is
      // min-content, so a head that grows widens the column (and narrows the
      // centre) instead of overflowing - a label check alone would not see it.
      headRight: round(hb.right),
      headScroll: head.scrollWidth > head.clientWidth + 0.5,
      instrumentRight: instrument ? round(r(instrument).right) : null,
      rows: [...head.children].map((row) => bands(row)),
      targets,
      label: labelInfo,
      name: name ? { text: name.textContent.trim(), fits: name.scrollWidth <= name.clientWidth + 0.5 } : null,
      notes: section.getAttribute("data-s1-notes"),
      positions: section.getAttribute("data-s1-positions"),
    };
  }
  const kb = document.querySelector('[data-s1="piano"] .piano-wrapper--vertical');
  return {
    cols,
    keyboardBottom: kb ? round(r(kb).bottom) : null,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: vh,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
  };
}

/** The head controls a mode must show, from the shared list (aPrimeAccess.js). */
function headFnsFor(mode) {
  return A_PRIME_ACCESS.filter(
    (f) => f.where === "instruments" && /^jouer\.(instrument-|octave-|position-)/.test(f.fn) && (!f.needs || (f.needs === "dictionary" && mode === "dictionary"))
      // VMU-186: in the Studio the octave pair left the piano head for the selection row (S1-24).
      && !(mode === "studio" && f.fn.startsWith("jouer.octave-"))
  ).map((f) => f.fn);
}

/** S1-21 verdict on one headsMeasure(): the list of what failed. */
function headsFails(where, h, { mode }) {
  const out = [];
  const ids = ["piano", "guitar", "bass"];
  if (ids.some((id) => !h.cols[id])) return [`${where}: a column has no head`];
  const heights = ids.map((id) => h.cols[id].height);
  for (const [i, id] of ids.entries()) {
    if (Math.abs(heights[i] - S1_21.head) > S1_21.headTolerance) out.push(`${where}: ${id} head ${heights[i]}px, ${S1_21.head} +-${S1_21.headTolerance} expected`);
  }
  if (Math.max(...heights) - Math.min(...heights) > S1_21.headTolerance) out.push(`${where}: heads differ (${heights.join(" / ")}px)`);
  for (const id of ids) {
    const c = h.cols[id];
    if (c.rows.length !== 2) out.push(`${where}: ${id} head has ${c.rows.length} rows, 2 expected`);
    c.rows.forEach((n, k) => {
      if (n > 1) out.push(`${where}: ${id} row ${k + 1} runs over ${n} lines`);
    });
    for (const t of c.targets) {
      if (!(t.w >= S1_21.target - 0.5 && t.h >= S1_21.target - 0.5)) out.push(`${where}: ${t.fn} ${t.w}x${t.h}px, ${S1_21.target}x${S1_21.target} expected`);
      if (!t.inViewport) out.push(`${where}: ${t.fn} off screen`);
      else if (!t.onTop) out.push(`${where}: ${t.fn} not on top (elementFromPoint)`);
    }
    if (c.name && !c.name.fits) out.push(`${where}: ${id} name "${c.name.text}" does not fit its button`);
    if (!(c.headRight <= c.instrumentRight + 0.5)) out.push(`${where}: ${id} head ends at x=${c.headRight}, past its instrument (x=${c.instrumentRight})`);
    if (c.headScroll) out.push(`${where}: ${id} head's content overflows it`);
    if (c.label) {
      if (!c.label.fits) out.push(`${where}: ${id} label "${c.label.text}" ${c.label.textWidth}px does not fit its ${c.label.boxWidth}px`);
      if (!c.label.clearOfArrows) out.push(`${where}: ${id} label "${c.label.text}" runs under an arrow`);
      if (!c.label.insideColumn) out.push(`${where}: ${id} label "${c.label.text}" leaves its column`);
      if (c.label.text && Math.abs(c.label.fontSize - S1_21.labelFont) > 0.5) out.push(`${where}: ${id} label at ${c.label.fontSize}px, ${S1_21.labelFont}px expected`);
    } else if (id === "piano" && mode === "dictionary") out.push(`${where}: the piano has no setting label`);
  }
  // The controls the mode must show, each once (the list is aPrimeAccess.js's).
  const want = headFnsFor(mode);
  const have = ids.flatMap((id) => h.cols[id].targets.map((t) => t.fn));
  const missing = want.filter((fn) => have.filter((x) => x === fn).length !== 1);
  const extra = have.filter((fn) => !want.includes(fn));
  if (missing.length) out.push(`${where}: ${missing.join(", ")} not there once`);
  if (extra.length) out.push(`${where}: ${extra.join(", ")} should not be there in ${mode}`);
  // The piano's label against the oracle: its range in the Dictionary; in the
  // Studio none (VMU-186: the base octave is "Octave des accords", S1-24).
  const expected = mode === "dictionary" ? pianoRangeOracle(h.cols.piano.notes) : null;
  const shown = h.cols.piano.label ? h.cols.piano.label.text : null;
  if (shown !== expected) out.push(`${where}: the piano reads "${shown}", the oracle "${expected}"`);
  // Room under the keyboard, and no scroll.
  const margin = h.innerHeight - h.keyboardBottom;
  if (!(margin >= S1_21.minMargin)) out.push(`${where}: keyboard bottom y=${h.keyboardBottom}, ${round1(margin)}px above the window's bottom, ${S1_21.minMargin} expected`);
  if (h.scrollHeight > h.innerHeight || h.scrollWidth > h.innerWidth) out.push(`${where}: the page scrolls (${h.scrollWidth}x${h.scrollHeight} in ${h.innerWidth}x${h.innerHeight})`);
  return out;
}

/**
 * S1-21 on Gabriel's page (no bench): the heads in FR / EN / PT / ZH, in the
 * Dictionary and the Studio — 100px, two rows of one line, 48px targets on
 * top, the labels fitting, the keyboard's bottom >= 40px above the window's;
 * then what the controls do (FR, Dictionary), against literal anchors (Do
 * majeur: guitar open 0-3 -> A shape 3-5, bass A string 3-5 -> E string 8-10,
 * piano 60 64 67 -> 72 76 79; the scale's box of the octave 0 starts at fret 4)
 * and invariances (› on the guitar changes the guitar's positions only, › on
 * the piano shifts the piano's notes by 12 and leaves both necks).
 */
async function runHeads(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const layouts = {};
  const T = 4000;
  const sel = (id) => `[data-fn="${id}"]`;
  const open = async (scenario) => {
    await page.goto(`${ORIGIN}/?prototype=a&scenario=${scenario}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.locator(`${sel("nav.mode-dictionnaire")}[aria-pressed="true"]`).waitFor({ timeout: 10_000 });
    await page.waitForTimeout(300);
  };
  const read = () =>
    page.evaluate(() => {
      const col = (id) => document.querySelector(`[data-s1="${id}"]`);
      const label = (id) => {
        const el = col(id).querySelector(".proto-a__head-label");
        return el ? el.textContent.trim() : null;
      };
      return {
        notes: col("piano").getAttribute("data-s1-notes"),
        guitar: col("guitar").getAttribute("data-s1-positions"),
        bass: col("bass").getAttribute("data-s1-positions"),
        labels: { piano: label("piano"), guitar: label("guitar"), bass: label("bass") },
      };
    });
  const click = async (fnId) => {
    await page.locator(sel(fnId)).click({ timeout: T });
    await page.waitForTimeout(250);
  };
  const expectEq = (what, got, want) => {
    if (got !== want) fails.push(`${what}: ${JSON.stringify(got)}, ${JSON.stringify(want)} expected`);
  };
  const shifted = (n, by) => String(n || "").split(" ").filter(Boolean).map((x) => Number(x) + by).join(" ");
  try {
    await open("cmaj");
    // 1. The layout, in four languages and both modes.
    const langHeader = page.locator(`${sel("nav.langue")} .custom-select-header`);
    for (const lang of ["FR", "EN", "PT", "ZH"]) {
      if (lang !== "FR") {
        await langHeader.click({ timeout: T });
        await page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: lang }).first().click({ timeout: T });
        await page.waitForTimeout(300);
      }
      for (const mode of ["dictionary", "studio"]) {
        await page.locator(sel(mode === "dictionary" ? "nav.mode-dictionnaire" : "nav.mode-studio")).click({ timeout: T });
        await page.waitForTimeout(300);
        const h = await page.evaluate(headsMeasure);
        layouts[`${lang} ${mode}`] = h;
        fails.push(...headsFails(`${lang} ${mode}`, h, { mode }));
      }
    }
    await langHeader.click({ timeout: T });
    await page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: "FR" }).first().click({ timeout: T });
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
    await page.waitForTimeout(300);

    // 2. What the controls do (FR, Dictionary, Do majeur).
    const s0 = await read();
    expectEq("Do majeur: piano notes", s0.notes, "60 64 67");
    expectEq("Do majeur: piano label (oracle)", s0.labels.piano, pianoRangeOracle(s0.notes));
    expectEq("Do majeur: guitar label", s0.labels.guitar, "Open (auto)");
    expectEq("Do majeur: guitar frets", fretSpan(s0.guitar), "0-3");
    expectEq("Do majeur: bass label", s0.labels.bass, "Corde La (auto)");
    expectEq("Do majeur: bass frets", fretSpan(s0.bass), "3-5");
    await click("jouer.position-guitar-suiv");
    await click("jouer.position-guitar-suiv");
    const s2 = await read();
    expectEq("guitar › ›: guitar label", s2.labels.guitar, "La-forme (fr. 3)");
    expectEq("guitar › ›: guitar frets", fretSpan(s2.guitar), "3-5");
    expectEq("guitar › ›: bass positions (unchanged)", s2.bass, s0.bass);
    expectEq("guitar › ›: piano notes (unchanged)", s2.notes, s0.notes);
    notes.push(`guitar › ›: guitar ${fretSpan(s0.guitar)} "${s0.labels.guitar}" -> ${fretSpan(s2.guitar)} "${s2.labels.guitar}"; bass ${fretSpan(s0.bass)} -> ${fretSpan(s2.bass)}; piano [${s0.notes}] -> [${s2.notes}]`);
    await click("jouer.position-bass-suiv");
    await click("jouer.position-bass-suiv");
    const s4 = await read();
    expectEq("bass › ›: bass label", s4.labels.bass, "Corde Mi");
    expectEq("bass › ›: bass frets", fretSpan(s4.bass), "8-10");
    expectEq("bass › ›: guitar positions (unchanged)", s4.guitar, s2.guitar);
    expectEq("bass › ›: piano notes (unchanged)", s4.notes, s0.notes);
    notes.push(`bass › ›: bass ${fretSpan(s2.bass)} -> ${fretSpan(s4.bass)} "${s4.labels.bass}"; guitar ${fretSpan(s2.guitar)} -> ${fretSpan(s4.guitar)}; piano [${s2.notes}] -> [${s4.notes}]`);
    await click("jouer.octave-piano-suiv");
    const s5 = await read();
    expectEq("piano ›: piano notes (+12)", s5.notes, shifted(s4.notes, 12));
    expectEq("piano ›: piano label (oracle)", s5.labels.piano, pianoRangeOracle(s5.notes));
    expectEq("piano ›: piano label", s5.labels.piano, "Do5 – Sol5");
    expectEq("piano ›: guitar positions (unchanged)", s5.guitar, s4.guitar);
    expectEq("piano ›: bass positions (unchanged)", s5.bass, s4.bass);
    expectEq("piano ›: guitar label (kept)", s5.labels.guitar, s4.labels.guitar);
    notes.push(`piano ›: piano [${s4.notes}] "${s4.labels.piano}" -> [${s5.notes}] "${s5.labels.piano}"; guitar ${fretSpan(s4.guitar)} -> ${fretSpan(s5.guitar)}; bass ${fretSpan(s4.bass)} -> ${fretSpan(s5.bass)}`);
    await click("jouer.octave-piano-prec");
    expectEq("piano ‹: piano notes back", (await read()).notes, s4.notes);

    // The scale: the octave no longer picks the box (C-06 cut in A′).
    await open("cmajscale");
    const t0 = await read();
    // VMU-202 / PR #171: the common octave no longer picks a scale box — the
    // default is the span-4 position nearest the nut, 0-3 for Do major on the
    // guitar from Do3.
    if (fretSpan(t0.guitar) !== "0-3") fails.push(`Do major scale: the guitar's default box is ${fretSpan(t0.guitar)}, 0-3 (the span-4 nearest the nut) expected`);
    await click("jouer.octave-piano-suiv");
    const t1 = await read();
    expectEq("scale, piano ›: piano notes (+12)", t1.notes, shifted(t0.notes, 12));
    expectEq("scale, piano ›: guitar box (unchanged)", t1.guitar, t0.guitar);
    expectEq("scale, piano ›: bass box (unchanged)", t1.bass, t0.bass);
    notes.push(`scale, piano ›: guitar box ${fretSpan(t0.guitar)} -> ${fretSpan(t1.guitar)}, bass box ${fretSpan(t0.bass)} -> ${fretSpan(t1.bass)}, piano ${pianoRangeOracle(t0.notes)} -> ${pianoRangeOracle(t1.notes)}`);

    // The Studio (VMU-186): the piano head has no setting; the base octave is
    // "Octave des accords" in the selection row, measured by S1-24.
    await page.locator(sel("nav.mode-studio")).click({ timeout: T });
    await page.waitForTimeout(300);
    const u0 = await read();
    expectEq("Studio: piano head label (none, the octave is in the selection row)", u0.labels.piano, null);
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  return { fails, notes, layouts };
}

// ─── S1-23 (VMU-185): the direct selectors ──────────────────────────────────
//
// A second row of the transport block holds the Studio's style menu, or the
// Dictionary's family, root note and chord / scale type (src/prototype/
// SelectionRow.jsx). S1-23 measures it on Gabriel's page in FR / EN / PT / ZH,
// in the Studio and in the Dictionary (a single note, chords, scales), then
// drives it and checks what it does to the keyboard, the necks and the
// sequencer against an ORACLE computed from src/core/theory.js (its tables
// CHORDS / SCALES and generateChordsFromNNS, read through the dev server's
// module graph) and literal anchors (Do majeur = 60 64 67), never from what the
// row itself shows.

// Thresholds (brief VMU-185): 48px targets, labels at 14px (VMU-212's one text
// size, checked +-0.5), the block no taller than 190px (98 before), the row and
// the block the same height in every state (+-1px), the keyboard's bottom >=
// 40px above the window's.
const S1_23 = { target: 48, label: A_PRIME_FS, maxBlock: 190, heightTolerance: 1, minMargin: 40 };
const SELECTION_FNS = ["composer.style", "dico.famille", "dico.fondamentale", "dico.type-accord", "dico.type-gamme"];
// The top row's controls: still in the block, above the new row, untouched.
const SELECTION_TOP_FNS = [
  "jouer.lecture",
  "jouer.tempo",
  "jouer.tempo-moins",
  "jouer.tempo-saisie",
  "jouer.tempo-plus",
  "jouer.metronome",
  "son.volume-general",
  "son.ouvrir",
];
// Exactly what each state holds: the names listed, none of the others.
const SELECTION_EXPECTED = {
  studio: ["composer.style"],
  note: ["dico.famille", "dico.fondamentale"],
  chord: ["dico.famille", "dico.fondamentale", "dico.type-accord"],
  scale: ["dico.famille", "dico.fondamentale", "dico.type-gamme"],
};
const SELECTION_STATES = Object.keys(SELECTION_EXPECTED);

/** In page: the row, its controls and the block, raw (S1-23). */
function selectionMeasure({ fns, topFns }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = (el) => el.getBoundingClientRect();
  const round = (n) => Math.round(n * 10) / 10;
  const transport = document.querySelector('[data-s1="transport"]');
  const rows = [...document.querySelectorAll('[data-s1="selection"]')];
  const row = rows[0] || null;
  const visible = (el) => {
    const b = r(el);
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
  };
  const onTop = (el) => {
    const b = r(el);
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    if (x < 0 || y < 0 || x >= vw || y >= vh) return false;
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && (hit === el || el.contains(hit)));
  };
  const canvas = document.createElement("canvas").getContext("2d");
  const found = {};
  for (const fn of fns) {
    const els = [...document.querySelectorAll(`[data-fn="${fn}"]`)];
    const el = els[0];
    if (!el) {
      found[fn] = { count: 0 };
      continue;
    }
    const isSelect = el.classList.contains("custom-select-container");
    const targets = isSelect ? [el.querySelector(".custom-select-header")] : [...el.querySelectorAll("button")];
    const item = {
      count: els.length,
      visible: visible(el),
      inRow: Boolean(row && row.contains(el)),
      rect: { x: Math.round(r(el).left), y: Math.round(r(el).top), w: round(r(el).width), h: round(r(el).height) },
      targets: targets.map((t) => ({
        w: round(r(t).width),
        h: round(r(t).height),
        onTop: onTop(t),
        font: parseFloat(getComputedStyle(isSelect ? t.querySelector(".current-value") : t).fontSize),
      })),
    };
    if (isSelect) {
      // The longest name of the list against the room the closed field gives
      // it (canvas text width in the field's own font): no ellipsis, whichever
      // entry is chosen.
      const cv = el.querySelector(".current-value");
      const cs = getComputedStyle(cv);
      canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const labels = [...el.querySelectorAll("select option")].map((o) => o.textContent);
      const widest = labels.reduce((best, t) => {
        const w = canvas.measureText(t).width;
        return w > best.w ? { w, t } : best;
      }, { w: 0, t: "" });
      // The room the field gives a name: its content box minus the arrow and
      // the arrow's margin (the name's own span is as wide as the name shown,
      // so its width says nothing about the room).
      const header = targets[0];
      const hcs = getComputedStyle(header);
      const arrow = header.querySelector(".arrow");
      const room = header.clientWidth - parseFloat(hcs.paddingLeft) - parseFloat(hcs.paddingRight) - arrow.offsetWidth - parseFloat(getComputedStyle(arrow).marginLeft);
      item.fit = { box: round(room), widest: round(widest.w), label: widest.t, shownCut: cv.scrollWidth > cv.clientWidth + 0.5, options: labels.length };
    } else {
      item.fit = { buttonsCut: targets.some((b) => b.scrollWidth > b.clientWidth + 0.5) };
    }
    found[fn] = item;
  }
  const tops = topFns.map((fn) => {
    const els = [...document.querySelectorAll(`[data-fn="${fn}"]`)];
    const el = els[0];
    return {
      fn,
      count: els.length,
      inTransport: Boolean(el && transport && transport.contains(el)),
      outsideRow: Boolean(el && !(row && row.contains(el))),
      above: Boolean(el && row && (r(row).height === 0 || r(el).bottom <= r(row).top + 0.5)),
    };
  });
  const fields = row ? [...row.querySelectorAll(".proto-a__field")].map((f) => r(f)).sort((a, b) => a.left - b.left) : [];
  let overlaps = 0;
  for (let i = 1; i < fields.length; i++) if (fields[i].left < fields[i - 1].right - 0.5) overlaps++;
  const tr = transport ? r(transport) : null;
  const trCs = transport ? getComputedStyle(transport) : null;
  const innerRight = tr ? tr.right - parseFloat(trCs.paddingRight) - parseFloat(trCs.borderRightWidth) : null;
  const kb = document.querySelector('[data-s1="piano"] .piano-wrapper--vertical');
  const de = document.documentElement;
  return {
    rowCount: rows.length,
    rowIsChild: Boolean(row && transport && row.parentElement === transport),
    row: row ? { x: Math.round(r(row).left), y: Math.round(r(row).top), w: round(r(row).width), h: round(r(row).height) } : null,
    transportHeight: tr ? round(tr.height) : null,
    transportTop: tr ? round(tr.top) : null,
    found,
    tops,
    labels: row ? [...row.querySelectorAll(".proto-a__muted")].map((e) => ({ text: e.textContent.trim(), font: parseFloat(getComputedStyle(e).fontSize) })) : [],
    overlaps,
    lines: new Set(fields.map((f) => Math.round(f.top / 4))).size,
    rowRight: fields.length ? round(Math.max(...fields.map((f) => f.right))) : null,
    innerRight: innerRight === null ? null : round(innerRight),
    keyboardBottom: kb ? round(r(kb).bottom) : null,
    scrollHeight: de.scrollHeight,
    innerHeight: vh,
    scrollWidth: de.scrollWidth,
    innerWidth: vw,
  };
}

/** S1-23 verdict on one selectionMeasure(): the list of what failed. */
function selectionFails(where, m, state) {
  // Each failure carries the sub-criterion it belongs to ([presence],
  // [foreground], [size], [fit], [height], [scroll], [lists], [function]): a
  // positive control must turn exactly one of them red.
  const out = [];
  if (m.rowCount !== 1) out.push(`[presence] ${where}: ${m.rowCount} selection row(s), 1 expected`);
  if (!m.rowIsChild) out.push(`[presence] ${where}: the row is not a direct child of the transport block`);
  const want = SELECTION_EXPECTED[state];
  for (const fn of SELECTION_FNS) {
    const f = m.found[fn];
    if (!want.includes(fn)) {
      if (f.count !== 0) out.push(`[presence] ${where}: ${fn} present (${f.count}), none expected in this state`);
      continue;
    }
    if (f.count !== 1) {
      out.push(`[presence] ${where}: ${fn}: ${f.count} element(s), 1 expected`);
      continue;
    }
    if (!f.visible) {
      out.push(`[presence] ${where}: ${fn}: not visible`);
      continue;
    }
    if (!f.inRow) out.push(`[presence] ${where}: ${fn}: not in the row`);
    for (const t of f.targets) {
      if (!(t.h >= S1_23.target - 0.5)) out.push(`[size] ${where}: ${fn}: a target ${t.w}x${t.h}px, ${S1_23.target}px high expected`);
      if (!t.onTop) out.push(`[foreground] ${where}: ${fn}: a target is covered at its centre`);
      if (Math.abs(t.font - S1_23.label) > 0.5) out.push(`[size] ${where}: ${fn}: text ${t.font}px, ${S1_23.label}px expected`);
    }
    if (f.fit.box !== undefined && f.fit.widest > f.fit.box) out.push(`[fit] ${where}: ${fn}: the longest name "${f.fit.label}" needs ${f.fit.widest}px, the field gives it ${f.fit.box}px`);
    if (f.fit.shownCut) out.push(`[fit] ${where}: ${fn}: the shown name is cut`);
    if (f.fit.buttonsCut) out.push(`[fit] ${where}: ${fn}: a button's text is cut`);
  }
  for (const t of m.tops) {
    if (t.count !== 1) out.push(`[presence] ${where}: top row ${t.fn}: ${t.count} element(s), 1 expected`);
    else if (!t.inTransport || !t.outsideRow || !t.above) out.push(`[presence] ${where}: top row ${t.fn} moved (in the block ${t.inTransport}, outside the row ${t.outsideRow}, above it ${t.above})`);
  }
  for (const l of m.labels) if (Math.abs(l.font - S1_23.label) > 0.5) out.push(`[size] ${where}: label "${l.text}" ${l.font}px, ${S1_23.label}px expected`);
  if (m.overlaps) out.push(`[fit] ${where}: ${m.overlaps} field(s) overlapping the previous one`);
  if (m.lines !== 1) out.push(`[fit] ${where}: the row runs over ${m.lines} lines, 1 expected`);
  if (m.rowRight !== null && m.rowRight > m.innerRight + 0.5) out.push(`[fit] ${where}: the row ends at x=${m.rowRight}, past the block's inner edge (${m.innerRight})`);
  if (m.row && m.row.h > S1_23.target + 2) out.push(`[height] ${where}: the row is ${m.row.h}px high, one ${S1_23.target}px line expected`);
  if (m.transportHeight > S1_23.maxBlock) out.push(`[height] ${where}: the block is ${m.transportHeight}px high, ${S1_23.maxBlock} at most`);
  if (m.scrollHeight > m.innerHeight || m.scrollWidth > m.innerWidth) out.push(`[scroll] ${where}: the page scrolls (${m.scrollWidth}x${m.scrollHeight} in ${m.innerWidth}x${m.innerHeight})`);
  const margin = m.innerHeight - m.keyboardBottom;
  if (!(margin >= S1_23.minMargin)) out.push(`[scroll] ${where}: keyboard bottom y=${m.keyboardBottom}, ${round1(margin)}px above the window's bottom, ${S1_23.minMargin} expected`);
  return out;
}

/** The sub-criterion a failed click belongs to: Playwright says why it could not click. */
function clickFailureTag(err) {
  const text = String(err && err.message ? err.message : err);
  if (/intercepts pointer events/.test(text)) return "foreground";
  if (/not visible|waiting for element to be visible|element is not visible/.test(text)) return "presence";
  return "function";
}

/** In page: the open list of a CustomSelect, raw. */
function openListMeasure() {
  const dd = document.querySelector('[data-testid="custom-select-dropdown"]');
  if (!dd) return null;
  const b = dd.getBoundingClientRect();
  const items = [...dd.querySelectorAll(".select-item")];
  const first = items[0];
  const fb = first ? first.getBoundingClientRect() : null;
  const hit = fb ? document.elementFromPoint(fb.left + fb.width / 2, fb.top + fb.height / 2) : null;
  const de = document.documentElement;
  return {
    rect: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) },
    inWindow: b.left >= -0.5 && b.top >= -0.5 && b.right <= window.innerWidth + 0.5 && b.bottom <= window.innerHeight + 0.5,
    firstOnTop: Boolean(hit && dd.contains(hit)),
    firstLabel: first ? first.textContent.trim() : null,
    items: items.length,
    direction: dd.getAttribute("data-open-direction"),
    scrollHeight: de.scrollHeight,
    innerHeight: window.innerHeight,
  };
}

/**
 * S1-23 on Gabriel's page (no bench): the row in FR / EN / PT / ZH, Studio and
 * Dictionary (a note, chords, scales), its open lists with the drawer closed
 * and open; then what it does (FR), against the oracle and literal anchors.
 */
async function runSelection(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const layouts = {};
  const lists = [];
  const T = 4000;
  const sel = (id) => `[data-fn="${id}"]`;
  const args = { fns: SELECTION_FNS, topFns: SELECTION_TOP_FNS };
  const open = async (query) => {
    await page.goto(`${ORIGIN}/?prototype=a${query}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
  };
  // Reaching a state for the MEASURES goes through the DOM (el.click()), not the
  // pointer: a covered or hidden control must still be put in its state to be
  // measured, and then fails its own sub-criterion (foreground, presence)
  // instead of aborting the run. What a user does with the pointer is checked
  // after (openList, choose), with real clicks.
  const goState = async (state) => {
    if (state === "studio") {
      await page.locator(sel("nav.mode-studio")).evaluate((el) => el.click());
    } else {
      await page.locator(sel("nav.mode-dictionnaire")).evaluate((el) => el.click());
      await page.locator(`${sel("dico.famille")} button`).nth({ note: 0, chord: 1, scale: 2 }[state]).evaluate((el) => el.click(), null, { timeout: T });
    }
    await page.waitForTimeout(300);
  };
  const openList = async (fn, where) => {
    try {
      await page.locator(`${sel(fn)} .custom-select-header`).click({ timeout: T });
      await page.locator('[data-testid="custom-select-dropdown"]').waitFor({ state: "visible", timeout: T });
    } catch (err) {
      fails.push(`[${clickFailureTag(err)}] ${where}: ${fn}: cannot open the list with the pointer (${String(err && err.message ? err.message : err).split("\n")[0]})`);
      // A list half opened must not stay over the next step - but Escape with
      // no list open would close the drawer, so only when there is one.
      if (await page.locator('[data-testid="custom-select-dropdown"]').count()) await page.keyboard.press("Escape");
      return;
    }
    const m = await page.evaluate(openListMeasure);
    await page.keyboard.press("Escape");
    await page.locator('[data-testid="custom-select-dropdown"]').waitFor({ state: "detached", timeout: T });
    lists.push({ where, fn, ...m });
    if (!m.inWindow) fails.push(`[lists] ${where}: ${fn}: the open list (${m.rect.x},${m.rect.y} ${m.rect.w}x${m.rect.h}) is not entirely in the window`);
    if (!m.firstOnTop) fails.push(`[lists] ${where}: ${fn}: the first option ("${m.firstLabel}") is covered`);
    if (m.items < 2) fails.push(`[lists] ${where}: ${fn}: the open list holds ${m.items} option(s)`);
    if (m.scrollHeight > m.innerHeight) fails.push(`[scroll] ${where}: ${fn}: the page scrolls while the list is open (${m.scrollHeight} in ${m.innerHeight})`);
  };
  const expectEq = (what, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`[function] ${what}: ${JSON.stringify(got)}, ${JSON.stringify(want)} expected`);
  };
  const langHeader = page.locator(`${sel("nav.langue")} .custom-select-header`);
  const pickLang = async (lang) => {
    await langHeader.click({ timeout: T });
    await page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: lang }).first().click({ timeout: T });
    await page.waitForTimeout(300);
  };
  try {
    await open("&scenario=cmaj");
    // 1. Every language, every state: presence and absence, on top, 48px, the
    // block's height, the lists open (drawer closed, then open).
    for (const lang of ["FR", "EN", "PT", "ZH"]) {
      if (lang !== "FR") await pickLang(lang);
      for (const drawer of [false, true]) {
        if (drawer) await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
        if (drawer) await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
        for (const state of SELECTION_STATES) {
          const where = `${lang} ${state}${drawer ? " + drawer" : ""}`;
          await goState(state);
          const m = await page.evaluate(selectionMeasure, args);
          layouts[where] = m;
          fails.push(...selectionFails(where, m, state));
          for (const fn of SELECTION_EXPECTED[state].filter((id) => id !== "dico.famille")) await openList(fn, where);
        }
        if (drawer) {
          await page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
          await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: T });
        }
      }
    }
    await pickLang("FR");
    // The block and the row have ONE height, in every state and language.
    const rows = Object.values(layouts).map((m) => m.row && m.row.h).filter((h) => h !== null);
    const blocks = Object.values(layouts).map((m) => m.transportHeight);
    const spread = (a) => round1(Math.max(...a) - Math.min(...a));
    if (spread(rows) > S1_23.heightTolerance) fails.push(`[height] the row's height varies by ${spread(rows)}px between states (${Math.min(...rows)}-${Math.max(...rows)}), ${S1_23.heightTolerance} at most`);
    if (spread(blocks) > S1_23.heightTolerance) fails.push(`[height] the block's height varies by ${spread(blocks)}px between states (${Math.min(...blocks)}-${Math.max(...blocks)}), ${S1_23.heightTolerance} at most`);
    notes.push(`row ${Math.min(...rows)}-${Math.max(...rows)}px, block ${Math.min(...blocks)}-${Math.max(...blocks)}px over ${Object.keys(layouts).length} states (4 languages x 4 states x drawer closed / open)`);
    // The counts a positive control moves: what is present, what is on top.
    let expectedCount = 0;
    let foundCount = 0;
    let targetCount = 0;
    let topCount = 0;
    for (const [where, m] of Object.entries(layouts)) {
      const state = SELECTION_STATES.find((s) => where.includes(` ${s}`));
      for (const fn of SELECTION_EXPECTED[state]) {
        expectedCount++;
        const f = m.found[fn];
        if (f.count === 1 && f.visible) foundCount++;
        for (const t of f.targets || []) {
          targetCount++;
          if (t.onTop) topCount++;
        }
      }
    }
    notes.push(`controls: ${foundCount}/${expectedCount} present once and visible; ${topCount}/${targetCount} targets on top at their centre`);
    // A control that is missing cannot be driven: say so once (as [presence]),
    // not again as a pile of timeouts.
    if (fails.some((f) => f.startsWith("[presence]"))) {
      notes.push("behaviour steps skipped: a control is missing, there is nothing to drive");
      if (pageErrors.length) fails.push(`[function] page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
      return { fails, notes, layouts, lists };
    }

    // 2. What it does (FR, Do majeur). The oracle comes from theory.js, read
    // through the module graph the page itself runs on.
    await open("&scenario=cmaj");
    const theory = await page.evaluate(async () => {
      const t = await import("/src/core/theory.js");
      const bricks = (await import("/src/data/bricks.json")).default;
      return {
        chords: Object.fromEntries(Object.entries(t.CHORDS).map(([k, v]) => [k, v.semitones])),
        scales: Object.fromEntries(Object.entries(t.SCALES).map(([k, v]) => [k, v.intervals])),
        bricks: bricks.map((b) => ({
          fr: b.name.fr,
          bpm: b.bpm,
          chords: t.generateChordsFromNNS(b.rootValue, b.scaleKey, b.nnsProgression).map((c) => c.chordNameEU),
        })),
      };
    });
    const uniq = (a) => [...new Set(a)].sort((x, y) => x - y);
    const pcs = (notes) => uniq(String(notes || "").split(" ").filter(Boolean).map((n) => Number(n) % 12));
    const chordPcs = (root, type) => uniq(theory.chords[type].map((s) => (root + s) % 12));
    const scalePcs = (root, type) => {
      let acc = 0;
      const out = [root % 12];
      for (const step of theory.scales[type].slice(0, -1)) {
        acc += step;
        out.push((root + acc) % 12);
      }
      return uniq(out);
    };
    const shifted = (n, by) => String(n || "").split(" ").filter(Boolean).map((x) => Number(x) + by).join(" ");
    const read = () =>
      page.evaluate(() => ({
        notes: document.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes"),
        guitar: document.querySelector('[data-s1="guitar"]').getAttribute("data-s1-positions"),
        bass: document.querySelector('[data-s1="bass"]').getAttribute("data-s1-positions"),
      }));
    const shown = (fn) => page.evaluate((id) => document.querySelector(`[data-fn="${id}"] .current-value`).textContent.trim(), fn);
    /** Choose `value` in the row's list, by clicking its entry; returns the entry's text. */
    const choose = async (fn, value) => {
      const label = await page.evaluate(({ id, v }) => {
        const o = document.querySelector(`[data-fn="${id}"] select option[value="${v}"]`);
        return o ? o.textContent : null;
      }, { id: fn, v: String(value) });
      if (label === null) throw new Error(`${fn}: no option with value ${value}`);
      await page.locator(`${sel(fn)} .custom-select-header`).click({ timeout: T });
      const exact = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
      await page.locator('[data-testid="custom-select-dropdown"] .select-item').filter({ hasText: exact }).first().click({ timeout: T });
      await page.waitForTimeout(250);
      const now = await shown(fn);
      if (now !== label) fails.push(`[function] ${fn}: chose "${label}", the field shows "${now}"`);
      return label;
    };
    const family = async (index) => {
      await page.locator(`${sel("dico.famille")} button`).nth(index).click({ timeout: T });
      await page.waitForTimeout(250);
      const pressed = await page.evaluate(() => [...document.querySelectorAll('[data-fn="dico.famille"] button')].map((b) => b.getAttribute("aria-pressed")));
      expectEq(`family button ${index}: pressed states`, pressed, [0, 1, 2].map((i) => String(i === index)));
    };
    const present = (fn) => page.locator(sel(fn)).count();
    const optionValues = (fn) => page.evaluate((id) => [...document.querySelectorAll(`[data-fn="${id}"] select option`)].map((o) => o.value), fn);

    // Literal anchors on what each menu holds (the data's own tables, not the
    // other menus): the twelve notes; every chord of CHORDS and only those;
    // every scale of SCALES and only those.
    expectEq("root note menu: the twelve notes, in order", await optionValues("dico.fondamentale"), Array.from({ length: 12 }, (_, i) => String(i)));
    expectEq("chord type menu: every chord of theory.js CHORDS, only those", (await optionValues("dico.type-accord")).sort(), Object.keys(theory.chords).sort());
    await family(2);
    expectEq("scale type menu: every scale of theory.js SCALES, only those", (await optionValues("dico.type-gamme")).sort(), Object.keys(theory.scales).sort());
    await family(1);

    const s0 = await read();
    expectEq("Do majeur: piano notes (literal)", s0.notes, "60 64 67");
    expectEq("Do majeur: pitch classes (theory.js CHORDS)", pcs(s0.notes), chordPcs(0, "chord_major"));
    const reLabel = await choose("dico.fondamentale", 2);
    const s1 = await read();
    expectEq(`root ${reLabel}: piano notes, +2 semitones`, s1.notes, shifted(s0.notes, 2));
    expectEq(`root ${reLabel}: piano notes (literal)`, s1.notes, "62 66 69");
    expectEq(`root ${reLabel}: pitch classes (theory.js)`, pcs(s1.notes), chordPcs(2, "chord_major"));
    notes.push(`root Do -> ${reLabel}: piano [${s0.notes}] -> [${s1.notes}] (+2); pitch classes ${JSON.stringify(pcs(s1.notes))}`);
    await choose("dico.fondamentale", 0);
    expectEq("root back to Do: piano notes", (await read()).notes, s0.notes);
    const minLabel = await choose("dico.type-accord", "chord_minor");
    const s2 = await read();
    const lowered = s0.notes.split(" ").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))).join(" ");
    expectEq(`chord ${minLabel}: the third falls one semitone`, s2.notes, lowered);
    expectEq(`chord ${minLabel}: piano notes (literal)`, s2.notes, "60 63 67");
    expectEq(`chord ${minLabel}: pitch classes (theory.js)`, pcs(s2.notes), chordPcs(0, "chord_minor"));
    notes.push(`chord Majeur -> "${minLabel}": piano [${s0.notes}] -> [${s2.notes}]; pitch classes ${JSON.stringify(pcs(s2.notes))}`);
    await family(2);
    const s3 = await read();
    expectEq("Gammes: type menu present, chord type menu gone", [await present("dico.type-gamme"), await present("dico.type-accord")], [1, 0]);
    expectEq("Gammes: pitch classes of scale_major (theory.js SCALES)", pcs(s3.notes), scalePcs(0, "scale_major"));
    if (s3.guitar === s2.guitar) fails.push("[function] Gammes: the guitar's positions did not change from the chord's");
    const scaleMinLabel = await choose("dico.type-gamme", "scale_minor");
    const s4 = await read();
    expectEq(`scale "${scaleMinLabel}": pitch classes (theory.js SCALES)`, pcs(s4.notes), scalePcs(0, "scale_minor"));
    if (s4.guitar === s3.guitar) fails.push(`[function] scale "${scaleMinLabel}": the guitar's positions did not change from the major scale's`);
    if (s4.notes === s3.notes) fails.push(`[function] scale "${scaleMinLabel}": the piano's notes did not change from the major scale's`);
    notes.push(`scale Majeure -> "${scaleMinLabel}": piano pitch classes ${JSON.stringify(pcs(s3.notes))} -> ${JSON.stringify(pcs(s4.notes))}; guitar ${fretSpan(s3.guitar)} -> ${fretSpan(s4.guitar)}`);
    await family(0);
    const s5 = await read();
    expectEq("Note unique: no type menu", [await present("dico.type-accord"), await present("dico.type-gamme")], [0, 0]);
    expectEq("Note unique: one pitch class, the root's", pcs(s5.notes), [0]);
    await family(1);
    expectEq("Accords again: the family's first type, Do majeur", (await read()).notes, "60 64 67");

    // VMU-216: the drawer no longer holds a root-note control — A′ reaches it
    // directly in the selection row — so there is no drawer↔row pair left to
    // keep in sync. What the old check proved (the row's fundamental is the
    // ONE state) still holds through `choose` above, and the drawer's missing
    // control is asserted here: open the drawer, confirm the control is gone,
    // close it.
    await choose("dico.fondamentale", 7);
    await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
    await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
    expectEq("drawer: the root-note control is gone (the row owns it)", await page.locator('[data-s1="drawer"] [data-testid="select-root-note"]').count(), 0);
    notes.push(`row <-> drawer: root "${await shown("dico.fondamentale")}" chosen in the row still drives it; the drawer's root-note control is absent (VMU-216)`);
    await page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
    await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: T });

    // The Studio: a style changes the name shown, the tempo it imposes and the
    // progression the sequencer shows (the chord names of the DAW helper under
    // the grids, [data-testid="daw-helper-chords"] .daw-helper__chord-name).
    await page.locator(sel("nav.mode-studio")).click({ timeout: T });
    await page.waitForTimeout(300);
    const chordsShown = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="daw-helper-chords"] .daw-helper__chord-name')].map((e) => e.textContent.trim()));
    const tempoShown = () => page.evaluate(() => document.querySelector('button[data-fn="jouer.tempo-saisie"]').textContent.trim());
    const seen = [];
    expectEq("style menu: every style of bricks.json, by index", (await optionValues("composer.style")).map(Number).sort((a, b) => a - b), theory.bricks.map((_, i) => i));
    for (const index of [1, 2]) {
      const label = await choose("composer.style", index);
      const want = theory.bricks[index];
      expectEq(`style ${index}: the name shown (theory data: bricks.json name.fr)`, label, want.fr);
      const chords = await chordsShown();
      expectEq(`style ${index}: the sequencer's chords (theory.js generateChordsFromNNS)`, chords.slice(0, want.chords.length), want.chords);
      expectEq(`style ${index}: the tempo it imposes (bricks.json bpm)`, await tempoShown(), String(want.bpm));
      seen.push({ index, label, chords, bpm: await tempoShown() });
    }
    if (JSON.stringify(seen[0].chords) === JSON.stringify(seen[1].chords)) fails.push("[function] the two styles show the same progression in the sequencer");
    notes.push(`styles: ${seen.map((s) => `#${s.index} "${s.label}" ${s.bpm} bpm, sequencer chords [${s.chords.join(" ")}] (read: .daw-helper__chord-name under data-testid daw-helper-chords)`).join(" ; ")}`);

    // VMU-126: a style change that would clear edits now asks first - S1-25 (runConfirm).
  } catch (err) {
    fails.push(`[${clickFailureTag(err)}] ${String(err && err.message ? err.message : err).split("\n")[0]}`);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`[function] page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  return { fails, notes, layouts, lists };
}

/** S1-23 on one viewport: run it, keep the verdict, print it. */
async function reportSelection(browser, viewport) {
  const selection = await runSelection(browser, viewport);
  selectionChecks[viewport.label] = selection;
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-23 (selection)`;
  console.log(`${lead} ${selection.fails.length ? "FAIL" : "PASS"}  the row in the transport block: presence / absence per state, on top, 48px, one height, no scroll, no cut name; open lists in the window (drawer closed / open); the controls drive the keyboard, the necks and the sequencer; FR / EN / PT / ZH x Studio / Dictionary (note, chords, scales)`);
  for (const [key, m] of Object.entries(selection.layouts)) {
    if (!/^(FR|ZH) (studio|chord|scale)( \+ drawer)?$/.test(key)) continue;
    const kids = SELECTION_FNS.filter((fn) => m.found[fn] && m.found[fn].count).map((fn) => `${fn} ${m.found[fn].rect.w}x${m.found[fn].rect.h}${m.found[fn].fit && m.found[fn].fit.widest !== undefined ? ` (longest name ${m.found[fn].fit.widest}/${m.found[fn].fit.box}px)` : ""}`);
    console.log(`${lead}   ${key}: block ${m.transportHeight}px, row ${m.row ? m.row.h : "-"}px at y=${m.row ? m.row.y : "-"}; ${kids.join(", ")}; keyboard bottom y=${m.keyboardBottom}, margin ${round1(m.innerHeight - m.keyboardBottom)}px; page ${m.scrollWidth}x${m.scrollHeight} in ${m.innerWidth}x${m.innerHeight}`);
  }
  const byFn = {};
  for (const l of selection.lists) {
    const k = `${l.fn}${l.where.includes("drawer") ? " (drawer open)" : " (drawer closed)"}`;
    byFn[k] = byFn[k] || { n: 0, inWindow: 0, onTop: 0 };
    byFn[k].n++;
    if (l.inWindow) byFn[k].inWindow++;
    if (l.firstOnTop) byFn[k].onTop++;
  }
  console.log(`${lead}   open lists: ${Object.entries(byFn).map(([k, v]) => `${k} ${v.n} opened, ${v.inWindow} in the window, ${v.onTop} first option on top`).join("; ")}`);
  for (const n of selection.notes) console.log(`${lead}   ${n}`);
  // Failures per sub-criterion: a positive control must move exactly one.
  const tags = {};
  for (const f of selection.fails) {
    const tag = (f.match(/^\[(\w+)\]/) || [, "other"])[1];
    tags[tag] = (tags[tag] || 0) + 1;
  }
  console.log(`${lead}   sub-criteria failing: ${Object.keys(tags).length ? Object.entries(tags).map(([k, n]) => `${k} x${n}`).join(", ") : "none"}`);
  if (selection.fails.length) console.log(`${lead}   FAILED: ${selection.fails.join(" | ")}`);
}

// ─── S1-25 (VMU-126 / VMU-050): the confirmation, and the memory ────────────
// On Gabriel's page (no bench except for the scenario step): an edit (a Quick
// Start from the drawer) makes a style change - by the row, by the drawer, and a
// mode change by the header - open the box; "Garder" changes nothing, "Changer"
// applies and clears; with no edit, never a box (and the box does appear WITH
// one: the positive control). A scenario never asks. Then the memory: language,
// notation, mode, root and style survive a reload in the same context and a
// fresh context opens on the defaults; a damaged memory opens without error.
async function runConfirm(browser, viewport) {
  const ctx = async () => (await browser.newContext({ viewport: { width: viewport.w, height: viewport.h } }));
  const fails = [];
  const notes = [];
  const errors = [];
  const T = 4000;
  const sel = (id) => `[data-fn="${id}"]`;
  const KEY = "visualmusic.state.v1";
  let page;
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  };
  const open = async (query = "") => {
    await page.goto(`${ORIGIN}/?prototype=a${query}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(400);
  };
  const eq = (what, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`[function] ${what}: ${JSON.stringify(got)}, ${JSON.stringify(want)} expected`);
  };
  const shown = (fn) => page.evaluate((id) => document.querySelector(`[data-fn="${id}"] .current-value`).textContent.trim(), fn);
  const chords = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="daw-helper-chords"] .daw-helper__chord-name')].map((e) => e.textContent.trim()).join(" "));
  const tempo = () => page.evaluate(() => document.querySelector('button[data-fn="jouer.tempo-saisie"]').textContent.trim());
  const mode = () => page.evaluate(() => (document.querySelector('[data-fn="nav.mode-studio"]').getAttribute("aria-pressed") === "true" ? "studio" : "dictionary"));
  const boxes = () => page.locator('[role="alertdialog"]').count();
  const state = async () => `${await shown("composer.style").catch(() => "-")} | ${await chords()} | ${await tempo()} bpm | ${await mode()}`;
  const pick = async (container, label) => {
    await page.locator(`${container} .custom-select-header`).first().click({ timeout: T });
    await page.locator('[data-testid="custom-select-dropdown"] .select-item').filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }).first().click({ timeout: T });
    await page.waitForTimeout(300);
  };
  const styleName = (i) => page.evaluate((n) => document.querySelector(`${'[data-fn="composer.style"]'} select option[value="${n}"]`).textContent, i);
  const edit = async () => {
    await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
    await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
    await page.locator('[data-s1="drawer"] button.btn-premium[title*=" - "]').first().click({ timeout: T });
    await page.waitForTimeout(300);
  };
  const closeDrawer = () => page.locator(sel("nav.fermer-fenetres")).click({ timeout: T });
  const answer = async (name) => { await page.getByRole("alertdialog").getByRole("button", { name }).click({ timeout: T }); await page.waitForTimeout(300); };
  try {
    page = await (await ctx()).newPage(); watch(page);
    await open();
    const s0 = await state();
    const second = await styleName(1);
    await pick(sel("composer.style"), second);            // no edit: no box
    eq("no edit: a style change opens no box", await boxes(), 0);
    await pick(sel("composer.style"), await styleName(0));
    await edit(); await closeDrawer();
    const withEdit = await state();
    if (withEdit === s0) fails.push("[function] the Quick Start changed nothing: no edit to lose");
    await pick(sel("composer.style"), second);             // by the ROW, with an edit: the box
    eq("edit + row: the box opens (positive control)", await boxes(), 1);
    eq("edit + row: the focus is on Garder", await page.evaluate(() => document.activeElement && document.activeElement.textContent), "Garder mes modifications");
    eq("edit + row, box open: nothing changed yet", await state(), withEdit);
    await answer("Garder mes modifications");
    eq("edit + row + Garder: style, chords, tempo, mode all as before", await state(), withEdit);
    await pick(sel("composer.style"), second);
    await answer("Changer de style");
    const afterChange = await state();
    if (afterChange === withEdit || (await boxes())) fails.push("[function] Changer de style did not apply the style");
    notes.push(`row: [${withEdit}] -> box -> Garder [${withEdit}] -> box -> Changer de style [${afterChange}]`);
    await edit();                                           // an edit IN the drawer (its edit buttons are kept)
    const inDrawer = await state();
    await closeDrawer();                                    // VMU-216: the drawer's style menu is gone — the row drives the style now
    await pick(sel("composer.style"), await styleName(0));
    eq("edit (in the drawer) + the row's style menu: the box opens", await boxes(), 1);
    await answer("Garder mes modifications");
    eq("edit + row + Garder: nothing changed", await state(), inDrawer);
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T }); // mode by the header
    eq("edit + header tab: the mode box opens", [await boxes(), await page.getByRole("alertdialog").textContent()].map(String).join("|").includes("Changer de mode ?"), true);
    await answer("Garder mes modifications");
    eq("edit + header tab + Garder: still Studio, edit kept", await state(), inDrawer);
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
    await answer("Changer de mode");
    eq("edit + header tab + Changer de mode: Dictionary", await mode(), "dictionary");
    await page.locator(sel("nav.mode-studio")).click({ timeout: T });
    eq("back in the Studio: no box, the edit is gone", [await boxes(), (await chords()) === inDrawer.split(" | ")[1]], [0, false]);
    notes.push(`row style menu + header tab: Garder kept [${inDrawer}], Changer de mode left the Studio and the edit with it`);

    await page.goto(`${ORIGIN}/?prototype=a&bench=1`, { waitUntil: "domcontentloaded" }); // a scenario never asks
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    await edit(); await closeDrawer();
    await page.locator('[data-scenario="cmaj"]').click({ timeout: T });
    await page.waitForTimeout(300);
    eq("scenario with an edit: no box, the Dictionary", [await boxes(), await mode()], [0, "dictionary"]);

    // The memory. Same context: reload; a fresh context: the defaults.
    await page.close();
    const keep = await ctx(); page = await keep.newPage(); watch(page);
    await open();
    await pick(sel("composer.style"), await styleName(3));
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
    await pick(sel("dico.fondamentale"), "Sol");
    await page.locator(sel("nav.noms-notes-us")).click({ timeout: T });
    await page.locator(`${sel("nav.langue")} .custom-select-header`).click({ timeout: T });
    await page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: "EN" }).first().click({ timeout: T });
    await page.waitForTimeout(300);
    const before = { mode: await mode(), root: await shown("dico.fondamentale"), lang: await shown("nav.langue"), us: await page.locator(sel("nav.noms-notes-us")).getAttribute("aria-pressed") };
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(400);
    const after = { mode: await mode(), root: await shown("dico.fondamentale"), lang: await shown("nav.langue"), us: await page.locator(sel("nav.noms-notes-us")).getAttribute("aria-pressed") };
    eq("reload, same context: mode, root, language, notation", after, before);
    await page.locator(sel("nav.mode-studio")).click({ timeout: T });
    eq("reload, same context: the style (by name, in English)", await shown("composer.style"), await styleName(3));
    notes.push(`reload: before ${JSON.stringify(before)} -> after ${JSON.stringify(after)}; style "${await shown("composer.style")}"; stored: ${await page.evaluate((k) => localStorage.getItem(k), KEY)}`);
    for (const [label, value] of [["broken JSON", "{broken"], ["version 99", '{"v":99,"appMode":"dictionary"}'], ["octave 17 beside a valid language", '{"v":1,"lang":"en","dictOctave":17}']]) {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, value]);
      const seen = errors.length;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
      eq(`${label}: no error on opening`, errors.slice(seen), []);
      notes.push(`${label}: opens on ${await mode()}, language ${await shown("nav.langue")}`);
    }
    await page.evaluate((k) => localStorage.setItem(k, '{"v":1,"appMode":"studio","dictRoot":7}'), KEY);
    await open("&scenario=cmaj");
    eq("a scenario beats the memory (memory: Studio, Sol; scenario: Do majeur)", [await mode(), await shown("dico.fondamentale")], ["dictionary", "Do"]);
    await keep.close();
    page = await (await ctx()).newPage(); watch(page);
    await open();
    eq("a fresh context opens on the defaults", await state(), s0);
  } catch (err) {
    fails.push(`[${clickFailureTag(err)}] ${String(err && err.message ? err.message : err).split("\n").slice(0, 3).join(" / ")}`);
  } finally {
    if (page) await page.context().close();
  }
  if (errors.length) fails.push(`[function] page errors: ${errors.slice(0, 3).join(" | ")}`);
  return { fails, notes };
}

/** S1-25 on one viewport: run it, keep the verdict, print it. */
async function reportConfirm(browser, viewport) {
  const r = await runConfirm(browser, viewport);
  confirmChecks[viewport.label] = r;
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-25 (confirm + memory)`;
  console.log(`${lead} ${r.fails.length ? "FAIL" : "PASS"}  an edit makes the row / the drawer menu / the header tabs open the box (never without an edit, never for a scenario); Garder changes nothing, Changer applies; language, notation, mode, root and style survive a reload; a damaged memory opens without error`);
  for (const n of r.notes) console.log(`${lead}   ${n}`);
  if (r.fails.length) console.log(`${lead}   FAILED: ${r.fails.join(" | ")}`);
}

// ─── S1-24 (VMU-186): the Studio's "Octave des accords" ─────────────────────
//
// Studio: no octave arrow and no label on the piano head (its 100px is S1-21's);
// the pair sits in the selection row on the style's line (48px, on top), the
// tooltip says the loop and the MIDI export, a real click on › moves the label
// Do4 -> Do5, the EU / US switch renames it (C5). Dictionary: the pair stays on
// the piano head, nothing in the row.

/** In page: where the octave pair is (S1-24). */
function chordOctaveMeasure() {
  const r = (el) => el.getBoundingClientRect();
  const arrows = (scope) => [...document.querySelectorAll(`${scope} [data-fn^="jouer.octave-piano-"]`)];
  const field = document.querySelector('[data-s1="selection"] [data-testid="selection-chord-octave"]');
  const style = document.querySelector('[data-s1="selection"] [data-fn="composer.style"]');
  const label = field && field.querySelector(".proto-a__head-label");
  const mid = (el) => r(el).top + r(el).height / 2;
  return {
    head: arrows('[data-s1="piano"] .proto-a__inst-head').length,
    row: arrows('[data-s1="selection"]').length,
    page: document.querySelectorAll('[data-fn^="jouer.octave-piano-"]').length,
    headLabel: Boolean(document.querySelector('[data-s1="piano"] .proto-a__head-label')),
    field: Boolean(field),
    title: field ? field.getAttribute("title") : null,
    label: label ? label.textContent.trim() : null,
    sameLineAsStyle: Boolean(field && style) && Math.abs(mid(field) - mid(style)) <= 8,
    targets: arrows('[data-s1="selection"]').map((b) => {
      const hit = document.elementFromPoint(r(b).left + r(b).width / 2, r(b).top + r(b).height / 2);
      return { fn: b.getAttribute("data-fn"), w: Math.round(r(b).width), h: Math.round(r(b).height), onTop: Boolean(hit && (hit === b || b.contains(hit))), inViewport: r(b).left >= 0 && r(b).top >= 0 && r(b).right <= innerWidth && r(b).bottom <= innerHeight };
    }),
  };
}

/** S1-24 on one viewport, on Gabriel's page (no bench): Studio, then Dictionary. */
async function reportChordOctave(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const sel = (id) => `[data-fn="${id}"]`;
  const eq = (what, got, want) => {
    if (got !== want) fails.push(`${what}: ${JSON.stringify(got)}, ${JSON.stringify(want)} expected`);
  };
  const press = async (id) => {
    await page.locator(sel(id)).click({ timeout: 4000 });
    await page.waitForTimeout(250);
  };
  try {
    await page.goto(`${ORIGIN}/?prototype=a`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.locator(`${sel("nav.mode-studio")}[aria-pressed="true"]`).waitFor({ timeout: 10_000 });
    await page.waitForTimeout(300);
    const m0 = await page.evaluate(chordOctaveMeasure);
    eq("Studio: octave arrows on the piano head / in the row / in the page", `${m0.head}/${m0.row}/${m0.page}`, "0/2/2");
    eq("Studio: piano head label", m0.headLabel, false);
    eq("Studio: the field is in the selection row, on the style's line", `${m0.field}/${m0.sameLineAsStyle}`, "true/true");
    for (const t of m0.targets) {
      if (!(t.w >= 47.5 && t.h >= 47.5)) fails.push(`Studio: ${t.fn} ${t.w}x${t.h}px, 48x48 expected`);
      if (!t.inViewport || !t.onTop) fails.push(`Studio: ${t.fn} ${t.inViewport ? "not on top (elementFromPoint)" : "off screen"}`);
    }
    for (const word of ["boucle", "MIDI"]) if (!(m0.title || "").includes(word)) fails.push(`Studio: the tooltip ${JSON.stringify(m0.title)} does not say "${word}"`);
    eq("Studio: base octave label at rest", m0.label, "Do4");
    await press("jouer.octave-piano-suiv");
    const m1 = await page.evaluate(chordOctaveMeasure);
    eq("Studio, ›: label", m1.label, "Do5");
    await press("nav.noms-notes-us");
    eq("Studio, US notation: label", (await page.evaluate(chordOctaveMeasure)).label, "C5");
    await press("nav.noms-notes-eu");
    notes.push(`Studio: pair in the row (${m0.targets.map((t) => `${t.w}x${t.h}`).join(", ")}), none on the piano head; "${m0.label}" -> "${m1.label}" on ›; tooltip "${m0.title}"`);
    await press("nav.mode-dictionnaire");
    const d = await page.evaluate(chordOctaveMeasure);
    eq("Dictionary: octave arrows on the piano head / in the row / field", `${d.head}/${d.row}/${d.field}`, "2/0/false");
    notes.push(`Dictionary: ${d.head} arrows on the piano head, ${d.row} in the row, no field`);
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  chordOctaveChecks[viewport.label] = { fails, notes };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-24 (chord octave)`;
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  Studio: no arrow on the piano head, "Octave des accords" in the selection row; Dictionary: the pair on the piano head, nothing in the row`);
  for (const n of notes) console.log(`${lead}   ${n}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

// ─── S1-26 (L1b-1c): the necks' position panel ──────────────────────────────
//
// Dictionary, Do majeur: the label of a neck's position is a button; opened, its
// panel lists Mi / La / Ré with Do's fret (oracle, semitones up from the open
// string: 8 / 3 / 10), the heads stay 100px and the keyboard does not move, the
// controls are on top, >= 48px, text = 14px (+-0.5, VMU-212); a root string changes the shape
// the neck draws (guitar La: 0-3 -> 3-5; bass Mi: 3-5 -> 8-10) and not the other
// neck's; "Réinitialiser Position" puts a chosen position back; Escape closes it
// and returns the focus. Studio, chord octave +2 (bench state): since VMU-201 /
// PR #162 the necks keep the octave-0 shape whatever "Octave des accords" says,
// so the guitar stays inside its range there and shows no warning sign (the
// alert is unit-tested in PrototypePositionPanelUnit.test.jsx); the head stays
// 100px and the label still fits.

const S1_26 = { head: 100, target: 48, font: A_PRIME_FS, frets: [8, 3, 10] };

/** In page: what S1-26 compares before / after opening a panel. */
function positionPanelMeasure() {
  const r = (el) => el.getBoundingClientRect();
  const kb = document.querySelector('[data-s1="piano"] .piano-wrapper--vertical');
  const out = { keyboardBottom: kb ? r(kb).bottom : null, scroll: document.documentElement.scrollHeight - innerHeight };
  for (const id of ["guitar", "bass"]) {
    const col = document.querySelector(`[data-s1="${id}"]`);
    const head = col.querySelector(".proto-a__inst-head");
    const btn = col.querySelector('[data-fn^="jouer.position-panneau-"]');
    const panel = col.querySelector(".proto-a__position-panel");
    out[id] = {
      head: r(head).height,
      positions: col.getAttribute("data-s1-positions"),
      expanded: btn ? btn.getAttribute("aria-expanded") : null,
      focused: Boolean(btn) && document.activeElement === btn,
      fits: btn ? btn.scrollWidth <= btn.clientWidth + 0.5 : null,
      mark: Boolean(btn && btn.querySelector('[role="img"]')),
      below: panel ? r(panel).top >= r(head).bottom - 0.5 && r(panel).bottom <= innerHeight : null,
      reset: Boolean(col.querySelector(`[data-fn="jouer.position-reinit-${id}"]`)),
      root: [...col.querySelectorAll('[data-fn^="jouer.position-fondamentale-corde-"]')].map((b) => {
        const q = r(b);
        const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return { text: b.textContent.trim(), h: q.height, font: parseFloat(getComputedStyle(b).fontSize), onTop: Boolean(hit && (hit === b || b.contains(hit))) };
      }),
    };
  }
  return out;
}

/** S1-26 on one viewport, on Gabriel's page (no bench for the Dictionary). */
async function reportPositionPanel(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const sel = (id) => `[data-fn="${id}"]`;
  const eq = (what, got, want) => {
    if (got !== want) fails.push(`${what}: ${JSON.stringify(got)}, ${JSON.stringify(want)} expected`);
  };
  const press = async (id) => {
    await page.locator(sel(id)).click({ timeout: 4000 });
    await page.waitForTimeout(250);
  };
  const open = async (query) => {
    await page.goto(`${ORIGIN}/?prototype=a${query}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
  };
  const shape = (m, id) => fretSpan(m[id].positions);
  try {
    await open("&scenario=cmaj");
    for (const [id, idx, from, to, name] of [["guitar", 4, "0-3", "3-5", "La"], ["bass", 3, "3-5", "8-10", "Mi"]]) {
      const other = id === "guitar" ? "bass" : "guitar";
      const m0 = await page.evaluate(positionPanelMeasure);
      eq(`${id}: shape at rest`, shape(m0, id), from);
      await press(`jouer.position-panneau-${id}`);
      const m1 = await page.evaluate(positionPanelMeasure);
      eq(`${id}: aria-expanded once opened`, m1[id].expanded, "true");
      for (const n of ["guitar", "bass"]) if (Math.abs(m1[n].head - S1_26.head) > 1) fails.push(`${id} open: ${n} head ${m1[n].head}px, ${S1_26.head} expected`);
      if (Math.abs(m1.keyboardBottom - m0.keyboardBottom) > 0.5 || m1.scroll > 0) fails.push(`${id} open: the keyboard moved (${m0.keyboardBottom} -> ${m1.keyboardBottom}) or the page scrolls (${m1.scroll}px)`);
      eq(`${id} open: the panel is under the head, in the window`, m1[id].below, true);
      eq(`${id}: the three strings, Do's fret on each (oracle ${S1_26.frets})`, m1[id].root.map((b) => Number((b.text.match(/(\d+)\)$/) || [])[1])).join(" "), S1_26.frets.join(" "));
      for (const b of m1[id].root) {
        if (!(b.h >= S1_26.target - 0.5 && Math.abs(b.font - S1_26.font) <= 0.5 && b.onTop)) fails.push(`${id}: "${b.text}" ${b.h}px high, ${b.font}px text, ${b.onTop ? "on top" : "covered"}`);
      }
      await press(`jouer.position-${id}-suiv`);
      eq(`${id}: "Réinitialiser Position" appears once a position is chosen`, (await page.evaluate(positionPanelMeasure))[id].reset, true);
      await press(`jouer.position-reinit-${id}`);
      eq(`${id}: reset puts the shape back`, shape(await page.evaluate(positionPanelMeasure), id), from);
      await press(`jouer.position-fondamentale-corde-${id}-${idx}`);
      const m2 = await page.evaluate(positionPanelMeasure);
      eq(`${id}, ${name}: the neck draws another shape`, shape(m2, id), to);
      eq(`${id}, ${name}: the ${other} is unchanged`, shape(m2, other), shape(m0, other));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const m3 = await page.evaluate(positionPanelMeasure);
      eq(`${id}: Escape closes it (aria-expanded / strings left) and gives the focus back`, `${m3[id].expanded}/${m3[id].root.length}/${m3[id].focused}`, "false/0/true");
      notes.push(`${id}: ${m1[id].root.map((b) => b.text).join(", ")}; ${name} ${from} -> ${to}; heads ${m0.guitar.head}/${m0.bass.head} -> ${m1.guitar.head}/${m1.bass.head}px, keyboard bottom ${round1(m0.keyboardBottom)} -> ${round1(m1.keyboardBottom)}`);
    }
    await open("&bench=1");
    await page.locator('[data-state="studio-oct2"]').click({ timeout: 4000 });
    await page.waitForTimeout(400);
    const s = await page.evaluate(positionPanelMeasure);
    // VMU-201 / PR #162: the Studio necks keep the octave-0 shape whatever
    // "Octave des accords" says, so the guitar is inside its range here and no
    // warning sign is drawn (the alert path is unit-tested instead).
    eq("Studio, chord octave +2: no warning sign on the guitar's label, panel closed", `${s.guitar.mark}/${s.guitar.expanded}`, "false/false");
    eq("Studio, no sign: head 100px and the label fits its button", `${Math.round(s.guitar.head)}/${s.guitar.fits}`, `${S1_26.head}/true`);
    notes.push(`Studio, octave +2: sign ${s.guitar.mark}, head ${s.guitar.head}px, label fits ${s.guitar.fits}`);
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  positionPanelChecks[viewport.label] = { fails, notes };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-26 (position panel)`;
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  the label opens a panel over the neck (heads 100px, keyboard still), strings with Do's fret, a root string changes the shape, reset, Escape; no warning sign in the Studio (VMU-201)`);
  for (const n of notes) console.log(`${lead}   ${n}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

// ─── S1-27 (VMU-195-A/C): the "Math & Rythmes" dock, readable on a 4K screen ──
//
// VMU-195 C turned the window into a dock: opened from A′ (data-fn=
// "composer.math-ouvrir"), Studio, as a band in the centre column. PR #172
// (VMU-195-B) rebuilt the content as a sentence ("5 coups sur 16 cases, départ
// décalé de 0, joués par …") with − / + steppers, a wheel and a strip of cases;
// the sliders and the LED grid left the main view. VMU-213 (part 2): the dock
// is ALWAYS there in the Studio (no opener, no ✕), and "Pour aller plus loin"
// left the dock for A′'s recipes column (".proto-a__recipes"), portaled there,
// open by default. Phase A, the dock on arrival: ONE title (the dock's; no inner
// header, no second h3); every rendered HTML text = 14px (+-0.5, VMU-212) and
// every SVG text >= 14px on screen; every visible clickable thing >= 32px on
// both sides, the buttons and the selects >= 48px high; the cases strip
// [data-testid=comp-grid] visible with as many .strip-cell as
// [data-testid=comp-n-value] shows, each cell >= 22px high; six button.sbtn
// steppers (comp-k/n/r-minus/plus) each >= 44px on both sides; six "?" buttons
// (the advanced title's moved to the column); the "Écouter" button on top. The
// recipes column: the toggle aria-expanded=true, the advanced body shown, its
// four comp-mode-* recipes visible, texts = 14px / targets >= 32px, nothing
// spilling out of the column, no page scroll, inside the centre column, beside
// the dock (or stacked under it on a narrow centre). Phase B turns on phasing,
// then iso, then poly: a slider thumb >= 24px (pixels), the isorhythm grid's
// 64 cells fully visible, a .grid-led >= 32px. Screenshots go to probe.local/.
// Positive control: the same measure on a checkout of origin/main must fail.

const S1_27 = { text: A_PRIME_FS, target: 32, button: 48, thumb: 24, cell: 32, stepper: 44, strip: 22 };

/** In page: what S1-27 reads off the open Math & Rythmes dock. */
function mathWindowMeasure() {
  const dock = document.querySelector(".math-dock");
  if (!dock) return { open: false };
  const r = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    const b = r(el);
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
  };
  const shownChain = (el) => shown(el) && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const box = (el) => (el ? el.getBoundingClientRect() : null);
  const overlaps = (a, b) => a && b && a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  // smallest rendered text (VMU-212: HTML = 14px +-0.5, SVG >= 14px on screen)
  const texts = [];
  const walker = document.createTreeWalker(dock, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest("option, script, style") || !shownChain(el)) continue;
    const svg = el instanceof SVGElement;
    let size = parseFloat(getComputedStyle(el).fontSize);
    if (svg && typeof el.getScreenCTM === "function") {
      const m = el.getScreenCTM();
      if (m) size *= Math.hypot(m.a, m.b);
    }
    texts.push({ size, svg, what: `${name(el)} "${n.nodeValue.trim().slice(0, 24)}"` });
  }
  for (const el of dock.querySelectorAll("select, input[type=text]")) {
    if (shown(el)) texts.push({ size: parseFloat(getComputedStyle(el).fontSize), svg: false, what: `${name(el)} (control)` });
  }
  texts.sort((a, b) => a.size - b.size);
  // clickable targets: a checkbox is measured through its visible label
  const targets = [];
  for (const el of dock.querySelectorAll("button, select, input[type=range], input[type=text], a[href], [role=button], label.retro-switch")) {
    if (!shown(el)) continue;
    const b = r(el);
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const onTop = Boolean(hit && (hit === el || el.contains(hit) || (el.tagName === "LABEL" && el.control && hit === el.control)));
    targets.push({ what: name(el), text: (el.textContent || "").trim().slice(0, 20), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, kind: el.matches("button.retro-btn, select") ? "button" : "other", onTop, hitName: onTop ? null : (hit ? name(hit) : "off-viewport"), inView: b.bottom > 0 && b.top < innerHeight });
  }
  // slider thumbs, grid cells
  // A pseudo-element's computed style is not reliable in Chromium (it answered the
  // input's own width), and a stylesheet read says what is declared, not what wins
  // the cascade (App.css's input[type=range]::-webkit-slider-thumb out-weighs a
  // class selector). So the thumb is measured on pixels, below: the slider is
  // screenshotted and the box of the --select coloured pixels (the thumb's border;
  // nothing else in a slider uses that colour) is read.
  const probe = document.createElement("span");
  probe.style.color = "var(--select)";
  document.body.appendChild(probe);
  const selectRgb = getComputedStyle(probe).color;
  probe.remove();
  const sliderBoxes = [...dock.querySelectorAll("input[type=range]")].filter(shown).map((el) => {
    const b = r(el);
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  });
  const cells = [...dock.querySelectorAll(".grid-led")].filter(shown).map((el) => Math.min(r(el).width, r(el).height));
  // The cases strip (PR #172's replacement for the LED grid in the folded window):
  // visible, as many .strip-cell as the n stepper shows, each >= 22px high.
  const stripEl = dock.querySelector('[data-testid="comp-grid"]');
  const stripCells = stripEl ? [...stripEl.querySelectorAll(".strip-cell")] : [];
  const stripHeights = stripCells.map((el) => r(el).height);
  const nValueEl = dock.querySelector('[data-testid="comp-n-value"]');
  const nValue = nValueEl ? parseInt(nValueEl.textContent.trim(), 10) : NaN;
  const strip = {
    visible: stripEl ? shown(stripEl) : false,
    count: stripCells.length,
    minH: stripHeights.length ? Math.min(...stripHeights) : null,
    nValue: Number.isFinite(nValue) ? nValue : null,
  };
  // The six − / + buttons of the k / n / r steppers.
  const steppers = [...dock.querySelectorAll("button.sbtn")].filter(shown).map((el) => ({
    id: el.getAttribute("data-testid") || "",
    w: Math.round(r(el).width * 10) / 10,
    h: Math.round(r(el).height * 10) / 10,
  }));
  // titles: every heading-like element showing "Math"
  const titles = [...dock.querySelectorAll("h1, h2, h3, h4, .panel__title, .modal-title, [data-testid=comp-title]")].filter(shown).filter((el) => /math/i.test(el.textContent));
  const listen = dock.querySelector('[data-testid="comp-listen"]');
  const listenBox = listen && shown(listen) ? r(listen) : null;
  const listenHit = listenBox ? document.elementFromPoint(listenBox.left + listenBox.width / 2, listenBox.top + listenBox.height / 2) : null;
  const m = r(dock);
  // VMU-195 C (PR 1): the band must not overflow and its zones must not overlap.
  const body = dock.querySelector(".phrase-body");
  const zoneEls = {
    wheel: dock.querySelector(".phrase-body > .viz-section"),
    phrase: dock.querySelector(".phrase-body > .phrase-section"),
    try: dock.querySelector(".phrase-body > .try-section"),
    footer: dock.querySelector(".phrase-body > .export-section"),
  };
  const zones = {};
  for (const [k, el] of Object.entries(zoneEls)) {
    const b = el ? el.getBoundingClientRect() : null;
    zones[k] = b ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height } : null;
  }
  // VMU-195 C: the dock is a band inside the centre column; it must not make the
  // page scroll, leave the centre column, or cover the sequencer / instruments.
  const centreBox = box(document.querySelector('[data-s1="center"]'));
  const sequencerBox = box(document.querySelector('[data-s1="sequencer"]'));
  const instrumentBoxes = [...document.querySelectorAll('[data-s1="piano"], [data-s1="guitar"], [data-s1="bass"]')].map(box).filter(Boolean);
  const insideCentre = centreBox && m &&
    m.left >= centreBox.left - 0.5 && m.right <= centreBox.right + 0.5 &&
    m.top >= centreBox.top - 0.5 && m.bottom <= centreBox.bottom + 0.5;
  const de = document.documentElement;
  return {
    open: true,
    dock: { w: Math.round(m.width), h: Math.round(m.height), left: Math.round(m.left), right: Math.round(m.right), top: Math.round(m.top), bottom: Math.round(m.bottom) },
    bodyClient: body ? body.clientWidth : null,
    bodyScroll: body ? body.scrollWidth : null,
    zones,
    page: {
      scrollHeight: de.scrollHeight,
      innerHeight: window.innerHeight,
      scrollWidth: de.scrollWidth,
      innerWidth: window.innerWidth,
      scrolls: de.scrollHeight > window.innerHeight + 0.5 || de.scrollWidth > window.innerWidth + 0.5,
      insideCentre,
      coversSequencer: overlaps(m, sequencerBox),
      overlapsInstruments: instrumentBoxes.filter((b) => overlaps(m, b)).length,
    },
    titles: titles.map((el) => `${name(el)} "${el.textContent.trim().slice(0, 30)}"`),
    smallestText: texts.slice(0, 3),
    texts,
    textCount: texts.length,
    targets,
    selectRgb,
    sliderBoxes,
    cells,
    strip,
    steppers,
    listen: listen ? { text: listen.textContent.trim(), onTop: Boolean(listenHit && (listenHit === listen || listen.contains(listenHit))) } : null,
    helpButtons: dock.querySelectorAll("button.help-btn").length,
  };
}

/** In page: what S1-27 reads off A′'s recipes column (".proto-a__recipes"), the
 *  "Pour aller plus loin" section the CompositionPanel portals there. Open by
 *  default: the toggle is on, the four recipes and their texts are there. */
function recipesMeasure() {
  const col = document.querySelector(".proto-a__recipes");
  if (!col) return { open: false };
  const r = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    const b = r(el);
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
  };
  const shownChain = (el) => shown(el) && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const box = (el) => (el ? el.getBoundingClientRect() : null);
  const overlaps = (a, b) => a && b && a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  // texts / targets / sliders / grid-led: the same reading as the dock's, on the
  // column instead (the advanced body lives there now).
  const texts = [];
  const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest("option, script, style") || !shownChain(el)) continue;
    const svg = el instanceof SVGElement;
    let size = parseFloat(getComputedStyle(el).fontSize);
    if (svg && typeof el.getScreenCTM === "function") {
      const m = el.getScreenCTM();
      if (m) size *= Math.hypot(m.a, m.b);
    }
    texts.push({ size, svg, what: `${name(el)} "${n.nodeValue.trim().slice(0, 24)}"` });
  }
  for (const el of col.querySelectorAll("select, input[type=text]")) {
    if (shown(el)) texts.push({ size: parseFloat(getComputedStyle(el).fontSize), svg: false, what: `${name(el)} (control)` });
  }
  texts.sort((a, b) => a.size - b.size);
  const targets = [];
  for (const el of col.querySelectorAll("button, select, input[type=range], input[type=text], a[href], [role=button], label.retro-switch")) {
    if (!shown(el)) continue;
    const b = r(el);
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const onTop = Boolean(hit && (hit === el || el.contains(hit) || (el.tagName === "LABEL" && el.control && hit === el.control)));
    targets.push({ what: name(el), text: (el.textContent || "").trim().slice(0, 20), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, kind: el.matches("button.retro-btn, select") ? "button" : "other", onTop, hitName: onTop ? null : (hit ? name(hit) : "off-viewport"), inView: b.bottom > 0 && b.top < innerHeight });
  }
  const probe = document.createElement("span");
  probe.style.color = "var(--select)";
  document.body.appendChild(probe);
  const selectRgb = getComputedStyle(probe).color;
  probe.remove();
  const sliderBoxes = [...col.querySelectorAll("input[type=range]")].filter(shown).map((el) => {
    const b = r(el);
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  });
  const cells = [...col.querySelectorAll(".grid-led")].filter(shown).map((el) => Math.min(r(el).width, r(el).height));
  // The isorhythm grid: 5 coups / 4 pitches / 16 cases -> 64 cells, all of them
  // fully visible inside the column (the 320px cap is overridden in the column).
  const isoGrid = col.querySelector(".isorhythm-steps-grid");
  const isoCells = isoGrid ? [...isoGrid.querySelectorAll(".isorhythm-step-cell")] : [];
  const iso = isoGrid
    ? {
        count: isoCells.length,
        minSide: isoCells.length ? Math.min(...isoCells.map((el) => Math.min(r(el).width, r(el).height))) : null,
        scrolls: isoGrid.scrollHeight > isoGrid.clientHeight + 0.5 || isoGrid.scrollWidth > isoGrid.clientWidth + 0.5,
        lastBottom: isoCells.length ? Math.max(...isoCells.map((el) => r(el).bottom)) : null,
      }
    : null;
  const toggle = col.querySelector('[data-testid="comp-advanced-toggle"]');
  const toggleBox = toggle && shown(toggle) ? r(toggle) : null;
  const toggleHit = toggleBox ? document.elementFromPoint(toggleBox.left + toggleBox.width / 2, toggleBox.top + toggleBox.height / 2) : null;
  const c = r(col);
  const centreBox = box(document.querySelector('[data-s1="center"]'));
  const dockBox = box(document.querySelector(".math-dock"));
  const sequencerBox = box(document.querySelector('[data-s1="sequencer"]'));
  const instrumentBoxes = [...document.querySelectorAll('[data-s1="piano"], [data-s1="guitar"], [data-s1="bass"]')].map(box).filter(Boolean);
  const insideCentre = centreBox && c &&
    c.left >= centreBox.left - 0.5 && c.right <= centreBox.right + 0.5 &&
    c.top >= centreBox.top - 0.5 && c.bottom <= centreBox.bottom + 0.5;
  // A descendant (or the section itself) sticks out of the column by more than a
  // few pixels. Tolerance 6px: the active cell's transform scale(1.08) widens
  // its painted box by ~2.5px without being an overflow.
  const spills = (b) => b.width > 0 && b.height > 0 && (b.left < c.left - 6 || b.right > c.right + 6 || b.top < c.top - 6 || b.bottom > c.bottom + 6);
  const advanced = col.querySelector(".advanced-section");
  let spilled = 0;
  if (advanced && spills(r(advanced))) spilled++;
  if (advanced) for (const el of advanced.querySelectorAll("*")) if (spills(r(el))) spilled++;
  const besideDock = dockBox && c && c.left >= dockBox.right - 1 && !overlaps(c, dockBox);
  const de = document.documentElement;
  return {
    open: true,
    column: { w: Math.round(c.width), h: Math.round(c.height), left: Math.round(c.left), right: Math.round(c.right), top: Math.round(c.top), bottom: Math.round(c.bottom) },
    toggle: toggle ? toggle.getAttribute("aria-expanded") : null,
    toggleOnTop: Boolean(toggleHit && toggleHit === toggle),
    advancedBody: Boolean(col.querySelector('[data-testid="comp-advanced"]')),
    modeButtons: [...col.querySelectorAll('[data-testid^="comp-mode-"]')].filter(shown).length,
    helpButtons: col.querySelectorAll("button.help-btn").length,
    texts,
    textCount: texts.length,
    smallestText: texts.slice(0, 3),
    targets,
    selectRgb,
    sliderBoxes,
    cells,
    iso,
    page: {
      scrollHeight: de.scrollHeight,
      innerHeight: window.innerHeight,
      scrollWidth: de.scrollWidth,
      innerWidth: window.innerWidth,
      scrolls: de.scrollHeight > window.innerHeight + 0.5 || de.scrollWidth > window.innerWidth + 0.5,
      insideCentre,
      besideDock,
      coversDock: overlaps(c, dockBox),
      coversSequencer: overlaps(c, sequencerBox),
      overlapsInstruments: instrumentBoxes.filter((b) => overlaps(c, b)).length,
      spilled,
    },
  };
}

/** Node side: the size of the --select coloured box in a PNG of one slider. */
async function thumbOnPixels(page, box, selectRgb) {
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y - 16), width: box.w, height: box.h + 32 };
  const png = await page.screenshot({ clip });
  return page.evaluate(async ({ b64, rgb }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const want = rgb.match(/\d+/g).slice(0, 3).map(Number);
    let x0 = width, x1 = -1, y0 = height, y1 = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (Math.abs(data[i] - want[0]) <= 6 && Math.abs(data[i + 1] - want[1]) <= 6 && Math.abs(data[i + 2] - want[2]) <= 6) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }, { b64: png.toString("base64"), rgb: selectRgb });
}

/** Phase B of S1-27: the advanced body's checks, each failure prefixed [advanced]. */
async function advancedMathChecks(page, m, requireGridLed) {
  const fails = [];
  const low = m.smallestText[0];
  const texts = m.texts || [];
  const htmlOff = texts.filter((t) => !t.svg && Math.abs(t.size - S1_27.text) > 0.5);
  const svgOff = texts.filter((t) => t.svg && t.size < S1_27.text - 0.5);
  if (!texts.length) {
    fails.push(`[advanced] no text found`);
  } else {
    if (htmlOff.length) fails.push(`[advanced] ${htmlOff.length} text(s) off ${S1_27.text}px (+-0.5): ${htmlOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
    if (svgOff.length) fails.push(`[advanced] ${svgOff.length} SVG text(s) under ${S1_27.text}px on screen: ${svgOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
  }
  const small = m.targets.filter((t) => Math.min(t.w, t.h) < S1_27.target);
  if (small.length) fails.push(`[advanced] ${small.length} clickable thing(s) under ${S1_27.target}px: ${small.slice(0, 3).map((t) => `${t.what} ${t.w}x${t.h}`).join(", ")}`);
  const thumbSizes = [];
  // The dock's advanced body scrolls inside itself (the band never grows): a
  // slider can sit below the visible scrollport. Scroll each one to the middle
  // of its container before reading its thumb on pixels, then re-read its box
  // (the absolute position changed).
  for (let i = 0; i < m.sliderBoxes.length; i++) {
    await page.evaluate((idx) => {
      const slider = document.querySelectorAll(".proto-a__recipes input[type=range]")[idx];
      if (slider) slider.scrollIntoView({ block: "center" });
    }, i);
    await page.waitForTimeout(120);
    const box = await page.evaluate((idx) => {
      const slider = document.querySelectorAll(".proto-a__recipes input[type=range]")[idx];
      if (!slider) return null;
      const b = slider.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    }, i);
    if (!box) continue;
    const t = await thumbOnPixels(page, box, m.selectRgb);
    if (t) thumbSizes.push(Math.min(t.w, t.h));
  }
  const thumbMin = thumbSizes.length ? Math.min(...thumbSizes) : null;
  if (!m.sliderBoxes.length) fails.push(`[advanced] no slider found in the advanced body; >= 1 expected`);
  else if (thumbMin === null || thumbMin < S1_27.thumb) fails.push(`[advanced] slider thumb ${thumbMin === null ? "not found on the pixels (no --select coloured thumb)" : `${thumbMin}px`}, >= ${S1_27.thumb}px expected`);
  let cellMin = null;
  if (m.cells.length) cellMin = Math.min(...m.cells);
  if (requireGridLed) {
    if (!m.cells.length) fails.push(`[advanced] no .grid-led found; >= 1 expected`);
    else if (cellMin < S1_27.cell) fails.push(`[advanced] grid-led cell ${round1(cellMin)}px, >= ${S1_27.cell}px expected`);
  }
  const notes = `${m.sliderBoxes.length} slider(s) (smallest thumb ${thumbMin === null ? "-" : `${thumbMin}px`}), ${m.cells.length} grid-led cell(s) (smallest ${cellMin === null ? "-" : `${round1(cellMin)}px`}); ${m.textCount} texts (smallest ${low ? `${round1(low.size)}px` : "-"}), ${m.targets.length} targets`;
  return { fails, notes };
}

/** The isorhythm check inside the recipes column: 64 cells, all fully visible. */
function isoMathChecks(m) {
  const fails = [];
  const notes = [];
  if (!m.iso) {
    fails.push(`[iso] no isorhythm grid in the recipes column`);
  } else {
    if (m.iso.count !== 64) fails.push(`[iso] ${m.iso.count} isorhythm cell(s), 64 expected`);
    if (m.iso.scrolls) fails.push(`[iso] the isorhythm grid scrolls/clips inside itself`);
    if (m.iso.lastBottom !== null && m.column && m.iso.lastBottom > m.column.bottom + 6) fails.push(`[iso] the grid runs past the column's bottom (last cell y=${Math.round(m.iso.lastBottom)}, column bottom y=${m.column.bottom})`);
  }
  notes.push(`iso: ${m.iso ? `${m.iso.count} cells (smallest ${m.iso.minSide === null ? "-" : `${round1(m.iso.minSide)}px`}), ${m.iso.scrolls ? "scrolls" : "no scroll"}, last y=${m.iso && m.iso.lastBottom !== null ? Math.round(m.iso.lastBottom) : "-"}` : "absent"}`);
  return { fails, notes };
}

/** [overflow] / [overlap] for S1-27 (VMU-195 C, PR 1): the band's phrase-body
 *  must not overflow its container and its four zones must be disjoint and
 *  inside the dock's box (+-1px). `phase` names the check in the notes. */
const S1_27_ZONES = ["wheel", "phrase", "try", "footer"];
const fmtBox = (b) => (b ? `x${Math.round(b.left)}-${Math.round(b.right)} y${Math.round(b.top)}-${Math.round(b.bottom)}` : "-");
function dockLayoutChecks(m, phase) {
  const fails = [];
  const notes = [];
  if (m.bodyClient === null || m.bodyScroll === null) {
    fails.push(`[overflow] ${phase} phrase-body measure missing`);
  } else if (m.bodyScroll > m.bodyClient + 1) {
    fails.push(`[overflow] ${phase} phrase-body scrollWidth ${m.bodyScroll}px > clientWidth ${m.bodyClient}px + 1`);
  }
  const missing = S1_27_ZONES.filter((k) => !m.zones || !m.zones[k]);
  if (missing.length) {
    fails.push(`[overflow] ${phase} zone(s) missing: ${missing.join(", ")}`);
  } else {
    const dock = m.dock;
    const out = S1_27_ZONES.filter((k) => {
      const z = m.zones[k];
      return z.left < dock.left - 1 || z.right > dock.right + 1 || z.top < dock.top - 1 || z.bottom > dock.bottom + 1;
    });
    if (out.length) fails.push(`[overflow] ${phase} zone(s) outside the dock: ${out.map((k) => `${k} ${fmtBox(m.zones[k])}`).join(", ")} (dock ${fmtBox(dock)})`);
    const pairs = [];
    for (let i = 0; i < S1_27_ZONES.length; i++) {
      for (let j = i + 1; j < S1_27_ZONES.length; j++) {
        const a = m.zones[S1_27_ZONES[i]];
        const b = m.zones[S1_27_ZONES[j]];
        if (a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
          pairs.push(`${S1_27_ZONES[i]}x${S1_27_ZONES[j]}`);
        }
      }
    }
    if (pairs.length) fails.push(`[overlap] ${phase} zone pair(s) overlap: ${pairs.join(", ")}`);
  }
  notes.push(`${phase} layout: body ${m.bodyScroll}/${m.bodyClient}px, dock ${fmtBox(m.dock)}; zones ${S1_27_ZONES.map((k) => `${k} ${fmtBox(m.zones && m.zones[k])}`).join(" | ")}`);
  return { fails, notes };
}

/** S1-27 on one viewport, on Gabriel's page (Studio, no bench). */
async function reportMathWindow(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  let m = null;
  let r0 = null;
  try {
    await page.goto(`${ORIGIN}/?prototype=a`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    const studio = page.locator('[data-fn="nav.mode-studio"]');
    if (await studio.count()) await studio.click({ timeout: 4000 });
    await page.waitForTimeout(250);
    // VMU-213: the dock is always there on arrival in the Studio, and the
    // recipes column is open by default — no opener button, nothing to fold.
    await page.locator(".math-dock").waitFor({ state: "visible", timeout: 5000 });
    await page.locator(".proto-a__recipes").waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);
    m = await page.evaluate(mathWindowMeasure);
    r0 = await page.evaluate(recipesMeasure);
    if (!m.open) throw new Error("the dock did not open");
    if (!r0.open) throw new Error("the recipes column did not open");
    if (m.page.scrolls) fails.push(`[page] the page scrolls with the dock open (${m.page.scrollWidth}x${m.page.scrollHeight} in ${m.page.innerWidth}x${m.page.innerHeight})`);
    if (!m.page.insideCentre) fails.push(`[page] the dock is outside the centre column`);
    if (m.page.coversSequencer) fails.push(`[page] the dock covers the sequencer`);
    if (m.page.overlapsInstruments) fails.push(`[page] the dock covers ${m.page.overlapsInstruments} instrument column(s)`);
    const shot = path.join(ROOT, "probe.local", `s1-27-math-dock-${viewport.label}.png`);
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.locator(".math-dock").screenshot({ path: shot });
    notes.push(`screenshot ${path.relative(ROOT, shot).replace(/\\/g, "/")}`);

    if (m.titles.length !== 1) fails.push(`[title] ${m.titles.length} title(s) showing "Math": ${m.titles.join(" / ")}, 1 expected`);
    const texts = m.texts || [];
    const htmlOff = texts.filter((t) => !t.svg && Math.abs(t.size - S1_27.text) > 0.5);
    const svgOff = texts.filter((t) => t.svg && t.size < S1_27.text - 0.5);
    if (!texts.length) {
      fails.push(`[text] no text found`);
    } else {
      if (htmlOff.length) fails.push(`[text] ${htmlOff.length} text(s) off ${S1_27.text}px (+-0.5): ${htmlOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
      if (svgOff.length) fails.push(`[text] ${svgOff.length} SVG text(s) under ${S1_27.text}px on screen: ${svgOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
    }
    const small = m.targets.filter((t) => Math.min(t.w, t.h) < S1_27.target);
    if (small.length) fails.push(`[target] ${small.length} clickable thing(s) under ${S1_27.target}px: ${small.slice(0, 3).map((t) => `${t.what} ${t.w}x${t.h}`).join(", ")}`);
    const buttons = m.targets.filter((t) => t.kind === "button" && t.h < S1_27.button - 0.5);
    if (buttons.length) fails.push(`[button] ${buttons.length} button/select under ${S1_27.button}px high: ${buttons.slice(0, 3).map((t) => `${t.what} ${t.h}`).join(", ")}`);
    const covered = m.targets.filter((t) => t.inView && !t.onTop);
    if (covered.length) fails.push(`[foreground] ${covered.length} control(s) covered: ${covered.slice(0, 3).map((t) => `${t.what} (by ${t.hitName || "?"})`).join(", ")}`);
    // A slider is no longer part of the folded window; if one is visible, its
    // thumb is still measured on pixels and must reach the same 24px.
    const thumbSizes = [];
    for (const box of m.sliderBoxes) {
      const t = await thumbOnPixels(page, box, m.selectRgb);
      if (t) thumbSizes.push(Math.min(t.w, t.h));
    }
    const thumbMin = thumbSizes.length ? Math.min(...thumbSizes) : null;
    if (m.sliderBoxes.length && (thumbMin === null || !(thumbMin >= S1_27.thumb))) fails.push(`[thumb] slider thumb ${thumbMin === null ? "not found on the pixels (no --select coloured thumb)" : `${thumbMin}px`}, >= ${S1_27.thumb}px expected`);
    // The cases strip replaces the LED grid in the folded window: as many cells
    // as the n stepper shows, each >= 22px high.
    if (!m.strip.visible) fails.push(`[strip] the cases strip (comp-grid) is not visible`);
    else {
      if (m.strip.count !== m.strip.nValue) fails.push(`[strip] ${m.strip.count} strip cell(s) but the phrase shows ${m.strip.nValue === null ? "no" : m.strip.nValue} case(s) (comp-n-value); equal expected`);
      if (m.strip.minH === null || m.strip.minH < S1_27.strip - 0.5) fails.push(`[strip] strip cell ${m.strip.minH === null ? "none" : `${round1(m.strip.minH)}px`}, >= ${S1_27.strip}px high expected`);
    }
    if (m.steppers.length !== 6) fails.push(`[stepper] ${m.steppers.length} stepper button(s) in the phrase (comp-k/n/r-minus/plus), 6 expected`);
    else if (m.steppers.some((s) => s.w < S1_27.stepper - 0.5 || s.h < S1_27.stepper - 0.5)) {
      const under = m.steppers.filter((s) => s.w < S1_27.stepper - 0.5 || s.h < S1_27.stepper - 0.5).map((s) => `${s.id} ${s.w}x${s.h}`).join(", ");
      fails.push(`[stepper] stepper(s) under ${S1_27.stepper}px on a side: ${under}`);
    }
    if (!m.listen || !m.listen.onTop) fails.push(`[listen] ${m.listen ? "the Écouter button is covered" : "no Écouter button in the window"}`);
    if (m.helpButtons !== 6) fails.push(`[help] ${m.helpButtons} "?" button(s) in the dock, 6 expected`);
    const layoutA = dockLayoutChecks(m, "phase A");
    fails.push(...layoutA.fails);
    notes.push(...layoutA.notes);

    // ── Phase A: the recipes column, open by default ──
    if (r0.toggle !== "true") fails.push(`[recipes] "Pour aller plus loin" toggle aria-expanded=${r0.toggle}, open by default expected`);
    if (r0.toggleOnTop !== true) fails.push(`[recipes] the "Pour aller plus loin" toggle is not on top (${r0.toggleOnTop === null ? "not found" : "covered"})`);
    if (!r0.advancedBody) fails.push(`[recipes] the advanced body is not shown`);
    if (r0.modeButtons !== 4) fails.push(`[recipes] ${r0.modeButtons} visible recipe button(s), 4 expected`);
    if (r0.helpButtons !== 1) fails.push(`[recipes] ${r0.helpButtons} "?" button(s) in the column, 1 expected`);
    if (r0.page.scrolls) fails.push(`[recipes] the page scrolls with the recipes column (${r0.page.scrollWidth}x${r0.page.scrollHeight} in ${r0.page.innerWidth}x${r0.page.innerHeight})`);
    if (!r0.page.insideCentre) fails.push(`[recipes] the recipes column is outside the centre column`);
    if (r0.page.coversDock) fails.push(`[recipes] the recipes column covers the dock`);
    if (r0.page.coversSequencer) fails.push(`[recipes] the recipes column covers the sequencer`);
    if (r0.page.overlapsInstruments) fails.push(`[recipes] the recipes column covers ${r0.page.overlapsInstruments} instrument column(s)`);
    if (r0.page.spilled) fails.push(`[recipes] ${r0.page.spilled} descendant(s) stick out of the column`);
    const rTexts = r0.texts || [];
    const rHtmlOff = rTexts.filter((t) => !t.svg && Math.abs(t.size - S1_27.text) > 0.5);
    const rSvgOff = rTexts.filter((t) => t.svg && t.size < S1_27.text - 0.5);
    if (rHtmlOff.length) fails.push(`[recipes] ${rHtmlOff.length} text(s) off ${S1_27.text}px (+-0.5): ${rHtmlOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
    if (rSvgOff.length) fails.push(`[recipes] ${rSvgOff.length} SVG text(s) under ${S1_27.text}px on screen: ${rSvgOff.slice(0, 3).map((t) => `${round1(t.size)}px (${t.what})`).join(" | ")}`);
    const rSmall = r0.targets.filter((t) => Math.min(t.w, t.h) < S1_27.target);
    if (rSmall.length) fails.push(`[recipes] ${rSmall.length} clickable thing(s) under ${S1_27.target}px: ${rSmall.slice(0, 3).map((t) => `${t.what} ${t.w}x${t.h}`).join(", ")}`);
    const rCovered = r0.targets.filter((t) => t.inView && !t.onTop);
    if (rCovered.length) fails.push(`[recipes] ${rCovered.length} control(s) covered: ${rCovered.slice(0, 3).map((t) => `${t.what} (by ${t.hitName || "?"})`).join(", ")}`);
    const shotR = path.join(ROOT, "probe.local", `s1-27-recipes-${viewport.label}.png`);
    await page.locator(".proto-a__recipes").screenshot({ path: shotR });
    notes.push(`screenshot ${path.relative(ROOT, shotR).replace(/\\/g, "/")}`);
    notes.push(`dock ${m.dock.w}x${m.dock.h} at y=${m.dock.top}..${m.dock.bottom}; page ${m.page.scrollWidth}x${m.page.scrollHeight} in ${m.page.innerWidth}x${m.page.innerHeight} (${m.page.scrolls ? "scrolls" : "no scroll"}, ${m.page.insideCentre ? "inside centre" : "outside centre"}, ${m.page.coversSequencer ? "covers sequencer" : "clear of sequencer"}, ${m.page.overlapsInstruments} instrument overlap(s)); ${m.textCount} texts, smallest ${m.smallestText.map((t) => `${round1(t.size)}px ${t.what}`).join(" | ")}`);
    notes.push(`dock: ${m.targets.length} targets, smallest ${m.targets.length ? Math.min(...m.targets.map((t) => Math.min(t.w, t.h))) : "-"}px; strip ${m.strip.count} cell(s) x ${m.strip.minH === null ? "-" : round1(m.strip.minH)}px (n=${m.strip.nValue}); steppers ${m.steppers.length}; thumbs ${thumbMin === null ? "none" : `${thumbMin}px`}; titles ${JSON.stringify(m.titles)}; help buttons ${m.helpButtons}; Écouter ${m.listen ? JSON.stringify(m.listen) : "absent"}`);
    notes.push(`recipes ${r0.column.w}x${r0.column.h} at x=${r0.column.left}..${r0.column.right}, y=${r0.column.top}..${r0.column.bottom} (${r0.page.insideCentre ? "inside centre" : "outside centre"}, ${r0.page.besideDock ? "beside the dock" : r0.page.coversDock ? "covers the dock" : "stacked under the dock"}, ${r0.page.overlapsInstruments} instrument overlap(s), ${r0.page.spilled} spilled); toggle ${r0.toggle}, ${r0.modeButtons} recipes, ${r0.helpButtons} "?"; ${r0.textCount} texts, ${r0.targets.length} targets`);

    // ── Phase B — one recipe at a time, in the column ──
    await page.locator('[data-testid="comp-mode-phasing"]').click({ timeout: 4000 });
    await page.waitForTimeout(300);
    const rPhasing = await page.evaluate(recipesMeasure);
    const phasing = await advancedMathChecks(page, rPhasing, false);
    fails.push(...phasing.fails);
    notes.push(`phasing: ${phasing.notes}`);
    if (rPhasing.page.spilled) fails.push(`[recipes] phasing: ${rPhasing.page.spilled} descendant(s) stick out of the column`);
    if (rPhasing.page.scrolls) fails.push(`[recipes] phasing: the page scrolls`);

    await page.locator('[data-testid="comp-mode-phasing"]').click({ timeout: 4000 });
    await page.locator('[data-testid="comp-mode-iso"]').click({ timeout: 4000 });
    await page.waitForTimeout(300);
    const rIso = await page.evaluate(recipesMeasure);
    const iso = isoMathChecks(rIso);
    fails.push(...iso.fails);
    notes.push(iso.notes);
    if (rIso.page.spilled) fails.push(`[recipes] iso: ${rIso.page.spilled} descendant(s) stick out of the column`);
    if (rIso.page.scrolls) fails.push(`[recipes] iso: the page scrolls`);

    // VMU-214: sending the iso recipe with 7 notes (a 112-step cycle) grows
    // the loop to 8 measures (128 steps); the sequencers switch to 64 steps on
    // two pages, and the page does not scroll (S1-12).
    await page.locator('[data-testid="comp-iso-pitches"]').fill("C3, E3, G3, B3, D4, F4, A4");
    await page.waitForTimeout(300);
    const sequencerView = await page.evaluate(() => {
      const rolls = Array.from(document.querySelectorAll(".piano-roll"));
      const density = rolls.map((r) => (r.querySelector(".step-density-btn.active")?.textContent || "").trim());
      const pageButtons = rolls.map((r) => r.querySelectorAll(".page-btn").length);
      const pageIndicator = rolls.map((r) => (r.querySelector(".page-indicator")?.textContent || "").trim());
      const de = document.documentElement;
      return {
        rolls: rolls.length,
        density,
        pageButtons,
        pageIndicator,
        scrolls: de.scrollHeight > window.innerHeight + 0.5 || de.scrollWidth > window.innerWidth + 0.5,
        scrollWidth: de.scrollWidth,
        scrollHeight: de.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      };
    });
    const sequencerOk =
      sequencerView.rolls === 3 &&
      sequencerView.density.every((d) => d === "64") &&
      sequencerView.pageButtons.every((n) => n === 2) &&
      sequencerView.pageIndicator.every((p) => p === "PAGE 1/2") &&
      !sequencerView.scrolls;
    if (!sequencerOk) fails.push(`[sequencer] after the iso send (112 steps): ${JSON.stringify(sequencerView)}`);
    notes.push(`sequencer view after the iso send: ${JSON.stringify(sequencerView)}`);

    await page.locator('[data-testid="comp-mode-iso"]').click({ timeout: 4000 });
    await page.locator('[data-testid="comp-mode-poly"]').click({ timeout: 4000 });
    await page.waitForTimeout(300);
    const rPoly = await page.evaluate(recipesMeasure);
    const poly = await advancedMathChecks(page, rPoly, true);
    fails.push(...poly.fails);
    notes.push(`poly: ${poly.notes}`);
    if (rPoly.page.spilled) fails.push(`[recipes] poly: ${rPoly.page.spilled} descendant(s) stick out of the column`);
    if (rPoly.page.scrolls) fails.push(`[recipes] poly: the page scrolls`);

    const advShot = path.join(ROOT, "probe.local", `s1-27-recipes-advanced-${viewport.label}.png`);
    fs.mkdirSync(path.dirname(advShot), { recursive: true });
    await page.locator(".proto-a__recipes").screenshot({ path: advShot });
    notes.push(`screenshot ${path.relative(ROOT, advShot).replace(/\\/g, "/")}`);
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  mathWindowChecks[viewport.label] = { fails, notes };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-27 (math dock)`;
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  phase A: one title, texts >= ${S1_27.text}px, targets >= ${S1_27.target}px (buttons ${S1_27.button}px), strip cells >= ${S1_27.strip}px, 6 steppers >= ${S1_27.stepper}px, Écouter on top, recipes column open by default beside the dock; phase B: phasing slider thumb >= ${S1_27.thumb}px, iso 64 cells fully visible, poly grid-led >= ${S1_27.cell}px`);
  for (const n of notes) console.log(`${lead}   ${n}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

// ─── S1-28 (VMU-212 follow-up, C-99d): one text size ───────────────────────
//
// Gabriel's decision (2026-11-05): "Augmente la taille des polices de 2 points
// (exemple passer de 10 à 12)". Every text of A′ is 14px — the size measured on
// the sequencers' track names — everywhere except the instruments' frozen
// drawing (everything inside [data-s1=piano] / [data-s1=guitar] / [data-s1=bass]
// below their .proto-a__inst-head heads) and SVG text, which keeps its drawing
// with a floor of 14px on screen (font-size x the viewBox scale). Measured on
// Gabriel's page (no bench) in seven states: Studio on arrival, Studio + Math
// dock, Dictionary chord + scale, Assistant drawer open, "Instruments & Audio"
// open, and the Guide (help window) open. Portaled windows / lists / tooltips
// (Modal, CustomSelect, InfoTooltip render into document.body via createPortal)
// are walked too. Positive control: forcing --a-prime-fs back to 12px, S1-28
// must name it:
//   S1_PROBE_INJECT_CSS=':root:has(.proto-a){--a-prime-fs:12px}' npm run s1:probe -- --text-size-only

const S1_28 = { size: A_PRIME_FS, tolerance: 0.5, svgFloor: A_PRIME_FS };

/** In page: every visible A′ text's computed size, outside the frozen drawing. */
function textSizeMeasure(FS) {
  const proto = document.querySelector(".proto-a");
  if (!proto) return { open: false };
  const pathOf = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 8) {
      let s = cur.tagName.toLowerCase();
      if (cur.id) s += `#${cur.id}`;
      else if (cur.className && typeof cur.className === "string") s += "." + cur.className.trim().split(/\s+/).slice(0, 2).join(".");
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  };
  const shownChain = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (b.width <= 0 || b.height <= 0) return false;
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) <= 0) return false;
    return el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
  };
  // .proto-a plus the portaled windows / lists / tooltips (createPortal -> body),
  // but not an inline modal already inside .proto-a (walked once).
  const roots = [proto];
  for (const sel of [".modal-overlay", ".custom-select-body", ".info-tooltip-popin"]) {
    for (const el of document.querySelectorAll(sel)) if (!proto.contains(el)) roots.push(el);
  }
  const offenders = [];
  const svgOffenders = [];
  let count = 0;
  let svgCount = 0;
  const seen = new Set();
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (seen.has(n)) continue;
      seen.add(n);
      const v = n.nodeValue;
      if (!v || !v.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest("option, script, style, noscript")) continue;
      // The frozen drawing: inside an instrument column but below its head.
      const inInst = el.closest('[data-s1="piano"], [data-s1="guitar"], [data-s1="bass"]');
      const inHead = el.closest(".proto-a__inst-head");
      if (inInst && !inHead) continue;
      const svg = el instanceof SVGElement;
      if (svg) {
        if (typeof el.getScreenCTM !== "function" || !shownChain(el)) continue;
        const m = el.getScreenCTM();
        if (!m) continue;
        const size = parseFloat(getComputedStyle(el).fontSize) * Math.hypot(m.a, m.b);
        svgCount++;
        // S1-28's size, passed in: this function runs inside the page, where the
        // Node-side A_PRIME_FS / S1_28 consts are not in scope.
        if (size < FS - 0.5) svgOffenders.push({ path: pathOf(el), text: v.trim().slice(0, 24), size });
      } else {
        if (!shownChain(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        count++;
        if (Math.abs(size - FS) > 0.5) offenders.push({ path: pathOf(el), text: v.trim().slice(0, 24), size });
      }
    }
  }
  // Dedupe by path: many offenders share one class; the report lists each class once.
  const unique = [];
  const seenPath = new Set();
  for (const o of offenders) {
    if (seenPath.has(o.path)) continue;
    seenPath.add(o.path);
    unique.push(o);
  }
  return {
    open: true,
    count,
    offenders: unique.slice(0, 10),
    offenderTotal: offenders.length,
    svgCount,
    svgOffenders: svgOffenders.slice(0, 10),
    svgOffenderTotal: svgOffenders.length,
  };
}

/** S1-28 on one viewport, on Gabriel's page (no bench). */
async function reportTextSize(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const T = 4000;
  const sel = (id) => `[data-fn="${id}"]`;
  const open = async (query) => {
    await page.goto(`${ORIGIN}/?prototype=a${query}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
  };
  const states = [];
  const measure = async (name) => {
    const m = await page.evaluate(textSizeMeasure, A_PRIME_FS);
    const bad = m.offenderTotal + m.svgOffenderTotal;
    if (bad) {
      const parts = [];
      if (m.offenderTotal) parts.push(`${m.offenderTotal} text(s) off ${S1_28.size}px (+-${S1_28.tolerance}): ${m.offenders.map((o) => `${o.path} "${o.text}" ${o.size}px`).join(" | ")}`);
      if (m.svgOffenderTotal) parts.push(`${m.svgOffenderTotal} SVG text(s) under ${S1_28.svgFloor}px on screen: ${m.svgOffenders.map((o) => `${o.path} "${o.text}" ${o.size}px`).join(" | ")}`);
      fails.push(`${name}: ${parts.join("; ")}`);
    }
    states.push({ name, count: m.count, offenders: m.offenderTotal, svg: m.svgCount, svgOffenders: m.svgOffenderTotal });
  };
  try {
    // 1. Studio on arrival.
    await open("");
    const studio = page.locator(sel("nav.mode-studio"));
    if (await studio.count()) await studio.click({ timeout: T });
    await page.waitForTimeout(300);
    await measure("Studio");
    // 2. Studio + Math dock (robust to the dock already being open).
    if ((await page.locator(".math-dock").count()) === 0) {
      await page.locator(sel("composer.math-ouvrir")).click({ timeout: T });
      await page.locator(".math-dock").waitFor({ state: "visible", timeout: T });
    }
    await page.waitForTimeout(300);
    await measure("Studio, Math dock open");
    // 3/4. Dictionary chord then scale.
    await open("&scenario=cmaj");
    await measure("Dictionary, chord");
    await open("&scenario=cmajscale");
    await measure("Dictionary, scale");
    // 5. Assistant drawer open.
    await open("");
    await page.locator(sel("nav.studio-harmonie")).click({ timeout: T });
    await page.locator('[data-s1="drawer"]').waitFor({ state: "visible", timeout: T });
    await page.waitForTimeout(300);
    await measure("Assistant drawer open");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    // 6. "Instruments & Audio" (portaled Modal).
    await page.locator(sel("son.ouvrir")).click({ timeout: T });
    await page.locator(".modal-container").waitFor({ state: "visible", timeout: T });
    await page.waitForTimeout(300);
    await measure("Instruments & Audio");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    // 7. The Guide (help window, the ❓ button).
    await page.locator(sel("aide.guide")).click({ timeout: T });
    await page.locator(".help-modal-overlay").waitFor({ state: "visible", timeout: T });
    await page.waitForTimeout(300);
    await measure("Guide (help window)");
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  textSizeChecks[viewport.label] = { fails, notes: states.map((s) => `${s.name}: ${s.count} texts, ${s.offenders} off ${S1_28.size}px, ${s.svg} SVG texts (${s.svgOffenders} under ${S1_28.svgFloor}px)`) };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-28 (one text size)`;
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  ${S1_28.size}px for every A′ text, the instruments' frozen drawing excepted, SVG >= ${S1_28.svgFloor}px on screen; Studio / Math dock / Dictionary chord+scale / drawer / Instruments & Audio / Guide`);
  for (const n of textSizeChecks[viewport.label].notes) console.log(`${lead}   ${n}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

// ─── S1-29 (C-103 Step 3a): height fit, fewer octaves / frets below 2045px ──
//
// Gabriel's rule (2026-11-06): below 2045px of height the instruments keep
// their drawing — a white key stays 61px, a fret row its full-neck height —
// and show fewer of them. The keyboard shows the largest whole number of
// octaves whose keys plus the closing C plus the 18px chrome fit
// ((7k+1)*61+18 = 1787 / 1360 / 933 / 506); each neck shows the most frets
// whose full-neck rows fit the keyboard's length, its bottom at/above the
// keyboard's by less than one row. Measured at 3840x2045 (full: 4 octaves,
// frets 1-22, identical to today), 2560x1440 and 2560x1283, on Gabriel's page
// (Studio, no bench: no active notes, so the fret window sits at the nut).
// The probe recomputes the expected counts from the sizes it measures in the
// page — it does not call the page's chooseKeyboardOctaves / chooseFretWindow
// (the page must not grade itself).

/** The neck's row-height share, recomputed here from the documented 1.5 ratio. */
function fretShareFor(fret, numFrets) {
  const t = numFrets > 1 ? (numFrets - fret) / (numFrets - 1) : 0;
  const weight = 1 + (1.5 - 1) * t;
  const totalWeight = numFrets * (1 + (1.5 - 1) / 2);
  return weight / totalWeight;
}

/** In page: the raw sizes S1-29 needs, plus what the page actually chose. */
function heightFitMeasure(withKeyboard = true) {
  const proto = document.querySelector(".proto-a");
  const piano = document.querySelector('[data-s1="piano"] .piano-wrapper--vertical');
  // Below 2560px the page shows ONE instrument: the keyboard readings need the
  // piano chosen, the neck readings the guitar. The same function serves both.
  if (!proto || (withKeyboard && !piano)) return { open: false };
  const width = window.innerWidth;
  const scroll = { height: document.documentElement.scrollHeight, viewport: window.innerHeight };
  const css = (el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name));
  const keyPx = css(proto, "--proto-key");
  const chromePx = css(proto, "--proto-piano-chrome");
  const fullKeys = parseInt(getComputedStyle(proto).getPropertyValue("--proto-keys"), 10) || 29;
  const pianoRect = piano ? piano.getBoundingClientRect() : { top: 0, bottom: 0 };
  const available = piano ? Math.max(0, window.innerHeight - pianoRect.top - 40) : 0;
  const whiteKey = piano ? piano.querySelector(".piano-key.white-key") : null;
  const whiteKeyHeight = whiteKey ? whiteKey.getBoundingClientRect().height : 0;
  const neckEl = document.querySelector('[data-s1="guitar"] .fretboard-container--vertical');
  const ncs = getComputedStyle(neckEl || proto);
  // Single column (< 2560px): no neck is rendered while the keyboard is
  // measured, so the neck's fixed rows come from the same documented defaults
  // the page uses when the CSS is out of reach (36px heads + 70px open row).
  const headPx = css(neckEl || proto, "--fbv-head") || 36;
  const fretPx = css(neckEl || proto, "--fbv-fret") || 70;
  const numFrets = parseInt(ncs.getPropertyValue("--fbv-n"), 10) || 22;
  const fixedRows = 2 * headPx + fretPx;
  const fullRowsHeight = fullKeys * keyPx + chromePx - fixedRows;
  // S1-4, recomputed on the neck the height fit shows: pastilles, fret
  // numbers, open-string names, status symbols, inlay dots and warnings, with
  // the outlines / hard rings S1-4 counts as drawn. Two objects overlap when
  // their drawn areas intersect (an ancestor pair is one object, not two).
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const drawnRect = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let grow = 0;
    if (cs.outlineStyle !== "none") grow = Math.max(grow, parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth));
    if (cs.boxShadow && cs.boxShadow !== "none") {
      for (const shadow of cs.boxShadow.split(/,(?![^(]*\))/)) {
        if (/inset/.test(shadow)) continue;
        const nums = shadow.replace(/rgba?\([^)]*\)/g, "").trim().split(/\s+/).map(parseFloat).filter(Number.isFinite);
        if (nums.length >= 4 && nums[2] === 0) grow = Math.max(grow, nums[3] + Math.max(Math.abs(nums[0]), Math.abs(nums[1])));
      }
    }
    return { left: b.left - grow, right: b.right + grow, top: b.top - grow, bottom: b.bottom + grow };
  };
  const overLap = (el) => {
    if (!el) return { n: 0, pairs: 0, examples: [] };
    const els = [...el.querySelectorAll(".note-marker, .fbv-fret-number, .open-string-name, .string-status-symbol, .fretboard-dot, .range-warning")]
      .filter((e) => e.getClientRects().length > 0);
    const rects = els.map(drawnRect);
    const examples = [];
    let pairs = 0;
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
        if (area(rects[i], rects[j]) > 0.01) {
          pairs++;
          if (examples.length < 3) examples.push(`${els[i].className || els[i].tagName} x ${els[j].className || els[j].tagName}`);
        }
      }
    }
    return { n: els.length, pairs, examples };
  };
  const neck = (id) => {
    const el = document.querySelector(`[data-s1="${id}"] .fretboard-container--vertical`);
    const win = (el?.getAttribute("data-fret-window") || "").split("-").map(Number);
    const rect = el ? el.getBoundingClientRect() : { top: 0, bottom: 0, height: 0 };
    const rows = el ? [...el.querySelectorAll('.fbv-fret-row[data-fret]:not([data-fret="0"])')] : [];
    const last = rows[rows.length - 1];
    const rowHeights = rows.map((row) => ({
      fret: Number(row.getAttribute("data-fret")),
      height: row.getBoundingClientRect().height,
    }));
    return {
      firstFret: Number.isFinite(win[0]) ? win[0] : 0,
      lastFret: Number.isFinite(win[1]) ? win[1] : 0,
      height: rect.height,
      bottom: rect.bottom,
      lastRowHeight: last ? last.getBoundingClientRect().height : 0,
      rowHeights,
      smallestRow: rowHeights.length ? Math.min(...rowHeights.map((r) => r.height)) : 0,
      overlap: overLap(el),
    };
  };
  return {
    open: true,
    width, keyPx, chromePx, fullKeys, available, scroll,
    fitKey: Number(proto.getAttribute("data-fit-key")),
    fitOctaves: Number(proto.getAttribute("data-fit-octaves")),
    fitKeys: Number(proto.getAttribute("data-fit-keys")),
    windowOctaves: piano ? Number(piano.getAttribute("data-window-octaves")) : null,
    whiteKeyHeight,
    fixedRows, fullRowsHeight, numFrets,
    keyboardBottom: piano ? pianoRect.bottom : 0,
    guitar: neck("guitar"),
    bass: neck("bass"),
  };
}

/**
 * In page (C-103b): after a high guitar position is chosen, the rail's chosen
 * thread(s) must sit on the centres of the rendered fret rows and nothing in
 * the rail may hang below the neck. The row centre is the row's border-box
 * centre, which is exactly what rowCentreCss computes.
 */
function railAlignmentMeasure() {
  const root = document.querySelector('[data-s1="guitar"]');
  const neckEl = root && root.querySelector(".fretboard-container--vertical");
  const rail = root && root.querySelector(".proto-a__position-rail");
  if (!neckEl || !rail) return { open: false };
  const win = (neckEl.getAttribute("data-fret-window") || "").split("-").map(Number);
  const firstFret = Number.isFinite(win[0]) ? win[0] : 0;
  const lastFret = Number.isFinite(win[1]) ? win[1] : 0;
  const rows = [...neckEl.querySelectorAll('.fbv-fret-row[data-fret]')]
    .map((row) => ({ fret: Number(row.getAttribute("data-fret")), rect: row.getBoundingClientRect() }))
    .filter((r) => r.fret >= firstFret && r.fret <= lastFret);
  const centres = rows.map((r) => ({ fret: r.fret, y: (r.rect.top + r.rect.bottom) / 2 }));
  const threads = [...rail.querySelectorAll(".proto-a__rail-thread.is-active")];
  const threadFails = [];
  const ends = [];
  for (const t of threads) {
    const b = t.getBoundingClientRect();
    for (const [kind, y] of [["top", b.top], ["bottom", b.bottom]]) {
      const near = centres.reduce((best, r) => (Math.abs(r.y - y) < Math.abs(best.y - y) ? r : best), centres[0]);
      if (!near || Math.abs(near.y - y) > 1) {
        threadFails.push(`chosen thread ${kind} at ${y.toFixed(1)}px, nearest row centre ${near ? `${near.y.toFixed(1)}px (fret ${near.fret})` : "none"}`);
      } else {
        ends.push(`${kind}=fret${near.fret}`);
      }
    }
  }
  const neckBottom = neckEl.getBoundingClientRect().bottom;
  const overflow = [...rail.querySelectorAll("*")]
    .filter((el) => el.getBoundingClientRect().bottom > neckBottom + 1)
    .map((el) => `${el.className || el.tagName} bottom ${el.getBoundingClientRect().bottom.toFixed(1)}px > neck ${neckBottom.toFixed(1)}px`)
    .slice(0, 5);
  return { open: true, firstFret, lastFret, threadCount: threads.length, threadFails, ends, overflow };
}

/** S1-29 on one viewport, on Gabriel's page (Studio, no bench). */
async function reportHeightFit(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  try {
    await page.goto(`${ORIGIN}/?prototype=a`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    // Studio: no active notes, so each neck's window sits at the nut (1..N).
    const studio = page.locator('[data-fn="nav.mode-studio"]');
    if (await studio.count()) await studio.click();
    await page.waitForTimeout(300);
    const m = await page.evaluate(heightFitMeasure);
    if (!m.open) {
      fails.push("the A′ prototype / vertical piano did not open");
    } else {
      // C-105: below 2560px wide the key shrinks to keep 2 octaves:
      //   key = min(61, max(44, floor((available - chrome) / 15))).
      // At 2560 and wider nothing changes: the full 61px key.
      const expectedKey = m.width >= 2560
        ? 61
        : Math.min(61, Math.max(44, Math.floor((m.available - m.chromePx) / 15)));
      if (m.fitKey !== expectedKey) fails.push(`key: page chose ${m.fitKey}px, expected ${expectedKey}px (width ${m.width}px, available ${m.available.toFixed(1)}px)`);
      if (Math.abs(m.keyPx - expectedKey) > 1) fails.push(`--proto-key is ${m.keyPx}px, expected ${expectedKey}px`);
      // The keyboard: largest k with (7k+1)*key + chrome <= available, min 1.
      let expectedOctaves = 1;
      for (let k = 4; k >= 1; k--) {
        if ((7 * k + 1) * expectedKey + m.chromePx <= m.available) { expectedOctaves = k; break; }
      }
      const expectedKeys = 7 * expectedOctaves + 1;
      const keyboardHeight = expectedKeys * expectedKey + m.chromePx;
      if (m.fitOctaves !== expectedOctaves) fails.push(`octaves: page chose ${m.fitOctaves}, expected ${expectedOctaves} (available ${m.available.toFixed(1)}px)`);
      if (m.fitKeys !== expectedKeys) fails.push(`keys: page chose ${m.fitKeys}, expected ${expectedKeys}`);
      if (m.windowOctaves !== expectedOctaves) fails.push(`piano window: ${m.windowOctaves} octave(s), expected ${expectedOctaves}`);
      if (Math.abs(m.whiteKeyHeight - expectedKey) > 1) fails.push(`white key ${m.whiteKeyHeight.toFixed(1)}px thick, expected ${expectedKey}px`);
      // The necks: the most frets whose full-neck rows (at that key) fit the
      // keyboard's length; every row keeps its full-neck height.
      const fullRowsHeight = m.fullKeys * expectedKey + m.chromePx - m.fixedRows;
      let expectedFretCount = 1;
      for (let n = m.numFrets; n >= 1; n--) {
        let s = 0;
        for (let f = 1; f <= n; f++) s += fretShareFor(f, m.numFrets);
        if (m.fixedRows + fullRowsHeight * s <= keyboardHeight + 1e-6) { expectedFretCount = n; break; }
      }
      // Below 2560px the page shows one instrument: the piano readings above,
      // then the guitar's neck (the S1-4 "neck shown"). The key stays the one
      // the page computed from the measured height — switching instruments
      // does not re-measure.
      let mn = m;
      if (m.width < 2560) {
        const guitarTab = page.locator('[data-fn="jouer.instrument-tuile-guitar"]');
        if (!(await guitarTab.count())) {
          fails.push("single column: the guitar instrument segment is missing");
        } else {
          await guitarTab.click();
          await page.locator('[data-s1="guitar"] .fretboard-container--vertical').waitFor({ state: "visible", timeout: 10_000 });
          await page.waitForTimeout(200);
          mn = await page.evaluate(heightFitMeasure, false);
          if (!mn.open) fails.push("single column: the guitar neck did not render");
        }
      }
      const neckOk = (id, n) => {
        if (!Number.isFinite(n.firstFret) || !Number.isFinite(n.lastFret)) { fails.push(`${id}: no fret window drawn`); return; }
        const count = n.lastFret - n.firstFret + 1;
        if (count !== expectedFretCount) fails.push(`${id}: ${count} fret(s) (${n.firstFret}-${n.lastFret}), expected ${expectedFretCount}`);
        if (n.bottom > m.keyboardBottom + 2) fails.push(`${id}: neck bottom ${n.bottom.toFixed(1)}px, keyboard bottom ${m.keyboardBottom.toFixed(1)}px (the neck overflows)`);
        const shortfall = m.keyboardBottom - n.bottom;
        if (shortfall >= n.lastRowHeight + 2) fails.push(`${id}: neck ends ${shortfall.toFixed(1)}px above the keyboard, a full row (${n.lastRowHeight.toFixed(1)}px) or more`);
        for (const row of n.rowHeights) {
          const expectedRow = fullRowsHeight * fretShareFor(row.fret, m.numFrets);
          if (Math.abs(row.height - expectedRow) > 1) fails.push(`${id}: fret ${row.fret} row ${row.height.toFixed(1)}px, full-neck height at key ${expectedKey}px is ${expectedRow.toFixed(1)}px`);
        }
        // S1-4: no two drawn objects (pastilles included) may overlap.
        if (n.overlap.pairs > 0) fails.push(`${id}: S1-4 ${n.overlap.pairs} overlapping pair(s) among ${n.overlap.n} object(s): ${n.overlap.examples.join(" | ")}`);
      };
      if (mn.open) {
        neckOk("guitar", mn.guitar);
        if (mn.bass.firstFret > 0) neckOk("bass", mn.bass);
        const shownNecks = [mn.guitar, mn.bass].filter((n) => n.rowHeights.length);
        const smallestRow = shownNecks.length ? Math.min(...shownNecks.map((n) => n.smallestRow)) : Infinity;
        const bassNote = mn.bass.firstFret > 0 ? `, bass ${mn.bass.firstFret}-${mn.bass.lastFret}` : "";
        notes.push(`${m.available.toFixed(1)}px available -> key ${expectedKey}px, ${m.fitOctaves} octave(s) / ${m.fitKeys} keys (drawn key ${m.whiteKeyHeight.toFixed(1)}px), guitar ${mn.guitar.firstFret}-${mn.guitar.lastFret}${bassNote}, smallest row ${Number.isFinite(smallestRow) ? smallestRow.toFixed(1) : "n/a"}px`);
      }
      // C-105: the instruments must stay inside the window — no scroll for
      // them. (The centre column scrolls at these window heights on the
      // untouched page too: it is 2355px tall at 2560x1440, so the page's own
      // scrollHeight is not this criterion's subject; the keyboard's bottom is.)
      if (m.keyboardBottom > m.scroll.viewport) {
        fails.push(`instruments: keyboard bottom ${m.keyboardBottom.toFixed(1)}px, below the ${m.scroll.viewport}px window`);
      }
      notes.push(`instruments end at ${m.keyboardBottom.toFixed(1)}px in the ${m.scroll.viewport}px window (page scrollHeight ${m.scroll.height}px, the centre column)`);
    }
    // C-103b: on the 2560x1283 page the rail must line up with a window that
    // no longer starts at fret 1. Choose the guitar's highest position (the
    // tab with the largest data-rail-fret), then check the window moved, the
    // chosen thread's ends sit on their rows, and nothing overflows the neck.
    if (viewport.label === "2560x1283") {
      await page.goto(`${ORIGIN}/?prototype=a&scenario=cmajscale`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-s1="guitar"] [data-rail-tab]').first().waitFor({ state: "visible", timeout: 20_000 });
      const chosen = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('[data-s1="guitar"] [data-rail-tab]')];
        if (!tabs.length) return null;
        tabs.sort((a, b) => Number(b.getAttribute("data-rail-fret")) - Number(a.getAttribute("data-rail-fret")));
        const tab = tabs[0];
        tab.click();
        return { label: tab.getAttribute("data-rail-tab"), fret: tab.getAttribute("data-rail-fret") };
      });
      await page.waitForTimeout(400);
      const a = await page.evaluate(railAlignmentMeasure);
      if (!chosen) {
        fails.push("rail: no guitar position tab on the cmajscale page");
      } else if (!a.open) {
        fails.push("rail: the guitar rail / neck did not open");
      } else {
        if (!(a.firstFret > 1)) fails.push(`rail: window starts at fret ${a.firstFret}, above 1 expected (chosen position ${chosen.label}, first fret ${chosen.fret})`);
        if (a.threadCount === 0) fails.push("rail: no chosen thread drawn");
        fails.push(...a.threadFails);
        if (a.overflow.length) fails.push(`rail overflows the neck: ${a.overflow.join(" | ")}`);
        notes.push(`rail @2560x1283: window ${a.firstFret}-${a.lastFret}, chosen position ${chosen.label} (fret ${chosen.fret}), ${a.threadCount} chosen thread segment(s), ends ${a.ends.join(", ") || "none"}`);
      }
    }
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  heightFitChecks[viewport.label] = { fails, notes };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-29 (height fit)`;
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  ${notes[0] || ""}`);
  for (const extra of notes.slice(1)) console.log(`${lead}   ${extra}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

// ─── S1-30 (C-107, Step 3b part 4): the compact page, A_PRIME_MIN_WIDTH..2559 ─

/**
 * In page: what S1-30 measures in ONE state of the compact page. The S1-11
 * sequencer block is the same code as measureInPage's (the rule is one rule).
 */
function singleColumnMeasure() {
  const round = (n) => Math.round(n * 10) / 10;
  const de = document.documentElement;
  // C-108b: the criteria are read with the window at its top. Below 2560px the
  // column is sticky, so a scrolled window would show a different bottom.
  if (window.scrollY !== 0) window.scrollTo(0, 0);
  if (!document.querySelector('[data-prototype="a"]')) return { missing: "the A′ page did not open" };
  const root = document.querySelector('[data-prototype="a"]');
  const key = parseFloat(root ? root.getAttribute("data-fit-key") : "");
  const instruments = [...document.querySelectorAll(".proto-a__instrument")];
  const first = instruments[0];
  const fb = first ? first.getBoundingClientRect() : null;
  const instrument = fb
    ? {
        count: instruments.length,
        fn: first.getAttribute("data-fn"),
        right: round(fb.right),
        width: round(fb.width),
        height: round(fb.height),
        bottom: round(fb.bottom),
      }
    : { count: 0, fn: null, right: null, width: null, height: null, bottom: null };
  const header = document.querySelector("header.proto-a__header");
  const hb = header ? header.getBoundingClientRect() : null;
  // --hit-min is inherited from :root (44px; 48px from 3840) — read live.
  const hitMin = header ? parseFloat(getComputedStyle(header).getPropertyValue("--hit-min")) : NaN;
  const buttons = header
    ? [...header.querySelectorAll("button")].map((b) => {
        const bb = b.getBoundingClientRect();
        return { fn: b.getAttribute("data-fn") || (b.textContent || "").trim().slice(0, 16), min: round(Math.min(bb.width, bb.height)) };
      })
    : [];
  // S1-11 — the REAL sequencer (copied from measureInPage): 16 step cells per
  // track row (the loop's window), each >= 48px wide, and the grid never cut.
  const sequencer = document.querySelector('[data-s1="sequencer"]');
  const seqRows = sequencer ? [...sequencer.querySelectorAll(".steps-container")] : [];
  const seqLamps = sequencer ? [...sequencer.querySelectorAll(".step-lamp")] : [];
  const seqLampW = seqLamps.map((el) => el.getBoundingClientRect().width);
  const seqRowCounts = seqRows.map((row) => row.querySelectorAll(".step-lamp").length);
  const seqScrolls = sequencer
    ? [...sequencer.querySelectorAll(".scrollable-instrument")].filter((el) => el.scrollWidth > el.clientWidth + 1).length
    : 0;
  // Active cells carry a transform: scale(1.05) glow; neutralize it for the
  // containment check (and transitions, so it applies synchronously).
  const seqTransforms = seqLamps.map((el) => el.style.getPropertyValue("transform"));
  seqLamps.forEach((el) => {
    el.style.setProperty("transition", "none", "important");
    el.style.setProperty("transform", "none", "important");
  });
  if (sequencer) void sequencer.offsetWidth; // flush style before measuring
  let seqCut = 0;
  try {
    for (const el of seqLamps) {
      const b = el.getBoundingClientRect();
      const row = el.closest(".steps-container");
      const rb = row ? row.getBoundingClientRect() : null;
      if (rb && (b.left < rb.left - 0.5 || b.right > rb.right + 0.5 || b.top < rb.top - 0.5 || b.bottom > rb.bottom + 0.5)) seqCut++;
    }
  } finally {
    seqLamps.forEach((el, i) => {
      el.style.removeProperty("transform");
      if (seqTransforms[i]) el.style.setProperty("transform", seqTransforms[i]);
      el.style.removeProperty("transition");
    });
  }
  return {
    scrollWidth: de.scrollWidth,
    scrollHeight: de.scrollHeight,
    scrollY: round(window.scrollY),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    key: Number.isFinite(key) ? key : null,
    instrument,
    headerHeight: hb ? round(hb.height) : null,
    headerOverflow: header ? { scrollWidth: header.scrollWidth, clientWidth: header.clientWidth } : null,
    hitMin,
    buttons,
    sequencer: {
      sequencer: Boolean(sequencer),
      rows: seqRows.length,
      rowCounts: seqRowCounts,
      cellCount: seqLamps.length,
      minCellWidth: seqLampW.length ? round(Math.min(...seqLampW)) : null,
      scrolls: seqScrolls,
      cut: seqCut,
    },
  };
}

/** S1-30 verdict on one singleColumnMeasure(). */
function singleColumnFails(m, label) {
  if (m.missing) return [`${label}: ${m.missing}`];
  const out = [];
  if (m.scrollWidth > m.innerWidth) out.push(`${label}: the page scrolls horizontally (${m.scrollWidth} > ${m.innerWidth})`);
  // C-108b: the key is the same in every state of a viewport (compared with
  // Studio+piano in reportSingleColumn), and the column fits the window with
  // the page at its top.
  if (m.key === null) out.push(`${label}: no data-fit-key on [data-prototype="a"]`);
  if (m.scrollY !== 0) out.push(`${label}: the window is scrolled (scrollY ${m.scrollY}), 0 expected`);
  if (m.instrument.bottom !== null && m.instrument.bottom > m.innerHeight + 1) {
    out.push(`${label}: the instrument column ends at ${m.instrument.bottom}, past the window's ${m.innerHeight} (it does not fit)`);
  }
  if (m.instrument.count !== 1) out.push(`${label}: ${m.instrument.count} .proto-a__instrument, 1 expected`);
  else if (m.instrument.right > m.innerWidth - 24 + 0.5) {
    out.push(`${label}: the instrument column ends at x=${m.instrument.right}, past the 24px right margin (${m.innerWidth - 24})`);
  }
  if (!(m.headerHeight !== null && Math.abs(m.headerHeight - A_PRIME_HEADER) <= 1)) {
    out.push(`${label}: header ${m.headerHeight}px high, ${A_PRIME_HEADER} +-1 expected`);
  }
  if (!m.headerOverflow) out.push(`${label}: no header`);
  else if (m.headerOverflow.scrollWidth > m.headerOverflow.clientWidth) {
    out.push(`${label}: the header overflows (${m.headerOverflow.scrollWidth} > ${m.headerOverflow.clientWidth})`);
  }
  const small = m.buttons.filter((b) => !(b.min >= m.hitMin - 0.5));
  if (small.length) {
    out.push(`${label}: ${small.length} header button(s) under the ${m.hitMin}px hit minimum: ${small.slice(0, 4).map((b) => `${b.fn} ${b.min}px`).join(", ")}`);
  }
  const s = m.sequencer;
  if (!s.sequencer) out.push(`${label}: no [data-s1="sequencer"]`);
  else {
    if (s.rows < 1) out.push(`${label}: the sequencer has no row`);
    if (s.rowCounts.some((n) => n !== 16)) out.push(`${label}: sequencer rows carry ${s.rowCounts.join(",")} cells, 16 each expected`);
    if (!(s.minCellWidth >= 48)) out.push(`${label}: a step cell is ${s.minCellWidth}px wide, 48px minimum`);
    if (s.scrolls) out.push(`${label}: ${s.scrolls} sequencer row(s) scroll horizontally`);
    if (s.cut) out.push(`${label}: ${s.cut} sequencer cell(s) cut by their row`);
  }
  return out;
}

/** S1-30 numbers, one line. scrollHeight is reported, not asserted: the page
 * may scroll vertically (only scrollWidth is the criterion). */
function singleColumnLine(m) {
  if (m.missing) return "no A′ page";
  const s = m.sequencer || {};
  return `key ${m.key ?? "-"}px, column ${m.instrument.fn || "none"} ${m.instrument.width ?? "-"}px right x=${m.instrument.right ?? "-"} bottom ${m.instrument.bottom ?? "-"} (window ${m.innerHeight}, margin ${m.instrument.right === null ? "-" : Math.round(m.innerWidth - m.instrument.right)}), page ${m.scrollWidth}x${m.scrollHeight} (scrollWidth ${m.scrollWidth} <= ${m.innerWidth}; scrollHeight reported), header ${m.headerHeight}px (${m.headerOverflow ? `${m.headerOverflow.scrollWidth}/${m.headerOverflow.clientWidth}` : "-"}), ${m.buttons.length} button(s) min ${m.buttons.length ? Math.min(...m.buttons.map((b) => b.min)) : "-"}px (hit-min ${m.hitMin}px), sequencer ${s.rows}x[${(s.rowCounts || []).join("/")}] cells, cell ${s.minCellWidth}px, ${s.scrolls} scrolling, ${s.cut} cut`;
}

/**
 * In page: C-108's sticky check. Scroll the window to its bottom, wait for
 * layout, and report the instrument column's box in the window — then scroll
 * back to the top, so the next state starts where it expects.
 */
function singleColumnStickMeasure() {
  const round = (n) => Math.round(n * 10) / 10;
  const de = document.documentElement;
  const col = document.querySelector(".proto-a__grid--single .proto-a__instrument");
  const read = () => {
    const b = col ? col.getBoundingClientRect() : null;
    return {
      top: b ? round(b.top) : null,
      bottom: b ? round(b.bottom) : null,
      height: b ? round(b.height) : null,
      scrollY: round(window.scrollY),
      innerHeight: window.innerHeight,
      scrollHeight: de.scrollHeight,
      canScroll: de.scrollHeight > window.innerHeight,
    };
  };
  window.scrollTo(0, de.scrollHeight);
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const out = read();
      window.scrollTo(0, 0);
      requestAnimationFrame(() => resolve(out));
    }));
  });
}

/** C-108: at the page's bottom the stuck column must be fully in the window,
 * and the window must have scrolled. A page that cannot scroll at that size is
 * printed, not failed. */
function singleColumnStickFails(m, label) {
  if (m.top === null) return [`${label}: no .proto-a__instrument in the single column`];
  if (!m.canScroll) return [];
  const out = [];
  if (!(m.scrollY > 0)) out.push(`${label}: the window did not scroll (scrollY ${m.scrollY})`);
  if (m.top < -1) out.push(`${label}: the stuck column's top is ${m.top}, above the window`);
  if (m.bottom > m.innerHeight + 1) {
    out.push(`${label}: the column ends at ${m.bottom}, past the window's ${m.innerHeight} (it does not fit)`);
  }
  return out;
}

/** Open the compact A′ page as Gabriel reaches it (no prototype parameter:
 * A′ is the default from A_PRIME_MIN_WIDTH), wait for the state's marker and
 * the fonts. */
async function openCompactPage(page, search, ready) {
  await page.goto(`${ORIGIN}/${search}`, { waitUntil: "domcontentloaded" });
  await page.locator(ready).first().waitFor({ state: "visible", timeout: 20_000 });
  if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

/** Choose an instrument on the compact page's segmented head. */
async function clickSegment(page, id) {
  await page.locator(`[data-fn="jouer.instrument-tuile-${id}"]`).click({ timeout: 4000 });
  await page.locator(`[data-s1="${id}"]`).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(150);
}

/** S1-30: one pixel under A_PRIME_MIN_WIDTH stays the classic page; the
 * threshold itself is A′, on the Studio. */
async function checkPageChoice(browser) {
  const fails = [];
  const page = await browser.newPage({ viewport: { width: A_PRIME_MIN_WIDTH - 1, height: 900 } });
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const classic = await page.evaluate(() => ({
      classic: document.querySelectorAll(".app-container").length,
      a: document.querySelectorAll('[data-prototype="a"]').length,
    }));
    if (classic.classic !== 1 || classic.a !== 0) {
      fails.push(`page choice: at ${A_PRIME_MIN_WIDTH - 1}x900 the classic page is expected (.app-container ${classic.classic}, [data-prototype="a"] ${classic.a})`);
    }
    // The page choice is read once, when layout.js loads: reload after resizing.
    await page.setViewportSize({ width: A_PRIME_MIN_WIDTH, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"]').waitFor({ state: "visible", timeout: 20_000 });
    const a = await page.evaluate(() => ({
      a: document.querySelectorAll('[data-prototype="a"]').length,
      studio: document.querySelectorAll('[data-fn="nav.mode-studio"][aria-pressed="true"]').length,
    }));
    if (a.a !== 1) fails.push(`page choice: at ${A_PRIME_MIN_WIDTH}x900 A′ is expected ([data-prototype="a"] ${a.a})`);
    if (a.studio !== 1) fails.push(`page choice: A′ does not open on the Studio (pressed studio tab ${a.studio})`);
  } catch (err) {
    fails.push(`page choice: ${String(err && err.message ? err.message : err).split("\n")[0]}`);
  } finally {
    await page.close();
  }
  return fails;
}

/** S1-30: the three segments each leave one column and one pressed segment. */
async function checkSegments(page) {
  const fails = [];
  const sectionFn = { piano: "jouer.piano", guitar: "jouer.guitare", bass: "jouer.basse" };
  for (const id of ["guitar", "bass", "piano"]) {
    await clickSegment(page, id);
    const m = await page.evaluate(() => ({
      sections: [...document.querySelectorAll(".proto-a__instrument")].map((s) => s.getAttribute("data-fn")),
      pressed: [...document.querySelectorAll('[data-fn^="jouer.instrument-tuile-"]')]
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.getAttribute("data-fn")),
    }));
    if (m.sections.length !== 1 || m.sections[0] !== sectionFn[id]) {
      fails.push(`segments: after ${id}, the column(s) are ${m.sections.join(", ") || "none"}, ${sectionFn[id]} alone expected`);
    }
    if (m.pressed.length !== 1 || m.pressed[0] !== `jouer.instrument-tuile-${id}`) {
      fails.push(`segments: after ${id}, the pressed segment(s) are ${m.pressed.join(", ") || "none"}, jouer.instrument-tuile-${id} alone expected`);
    }
  }
  return fails;
}

/** S1-30: the compact "Aide et réglages" menu — open, controls on top, Escape
 * returns the focus to the button, a press on the centre column closes it. */
async function checkMenu(page) {
  const fails = [];
  const help = "nav.aide-reglages";
  const items = ["aide.guide", "aide.theorie", "nav.langue", "aide.a-propos"];
  await page.locator(`[data-fn="${help}"]`).click({ timeout: 4000 });
  await page.waitForTimeout(150);
  const open = await page.evaluate((ids) => {
    const button = document.querySelector('[data-fn="nav.aide-reglages"]');
    const found = ids.map((id) => {
      const el = document.querySelector(`[data-fn="${id}"]`);
      if (!el) return { id, why: "is missing" };
      const b = el.getBoundingClientRect();
      const hit = b.width > 0 && b.height > 0 ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
      if (hit && (hit === el || el.contains(hit))) return { id, why: null };
      if (!hit) return { id, why: "has no hit point" };
      return { id, why: `is covered by ${hit.tagName.toLowerCase()}.${(hit.className || "").toString().split(/\s+/)[0]}` };
    });
    return { expanded: button && button.getAttribute("aria-expanded"), found };
  }, items);
  if (open.expanded !== "true") fails.push(`menu: aria-expanded is ${open.expanded} after the click`);
  for (const f of open.found) if (f.why) fails.push(`menu: ${f.id} ${f.why}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const escaped = await page.evaluate(() => ({
    expanded: document.querySelector('[data-fn="nav.aide-reglages"]').getAttribute("aria-expanded"),
    focus: document.activeElement && document.activeElement.getAttribute("data-fn"),
    guide: document.querySelectorAll('[data-fn="aide.guide"]').length,
  }));
  if (escaped.expanded !== "false") fails.push(`menu: Escape left aria-expanded ${escaped.expanded}`);
  if (escaped.focus !== help) fails.push(`menu: Escape left the focus on ${escaped.focus || "nothing"}`);
  if (escaped.guide !== 0) fails.push("menu: Escape left the menu open");

  await page.locator(`[data-fn="${help}"]`).click({ timeout: 4000 });
  await page.waitForTimeout(150);
  await page.locator('[data-s1="center"]').click({ position: { x: 4, y: 4 }, timeout: 4000 });
  await page.waitForTimeout(150);
  const outside = await page.evaluate(() => document.querySelector('[data-fn="nav.aide-reglages"]').getAttribute("aria-expanded"));
  if (outside !== "false") fails.push(`menu: a press on the centre column left it open (${outside})`);
  return fails;
}

/**
 * In page: locate the parity list after scrolling each entry into view. The
 * compact page may be taller than a 970px window (scrollHeight is not S1-30's
 * subject), so the whole rect need not be on screen — but each control must be
 * visible and the element on top at its centre.
 */
function locateParity(fns) {
  const describe = (el) => {
    if (!el) return "nothing";
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
  };
  return fns.map((fn) => {
    const els = [...document.querySelectorAll(`[data-fn="${fn}"]`)];
    const el = els[0];
    if (!el) return { fn, count: 0 };
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const visible = b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    const inWin = x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
    const hit = visible && inWin ? document.elementFromPoint(x, y) : null;
    const onTop = Boolean(hit && (hit === el || el.contains(hit)));
    return { fn, count: els.length, visible, inWin, onTop, hit: onTop ? null : describe(hit) };
  });
}

/** S1-30 on one viewport, the page as Gabriel reaches it (no URL parameter). */
async function reportSingleColumn(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const rows = [];
  const sticks = [];
  // C-108b: the reference key, read in Studio+piano; every other state of the
  // viewport must show the same one.
  let expectedKey = null;
  // The scrolled-choice state (2): its scroll positions are printed below.
  let before = null;
  let atChoice = null;
  const measure = async (state, want) => {
    const m = await page.evaluate(singleColumnMeasure);
    const stateFails = singleColumnFails(m, `${viewport.label} ${state}`);
    if (!m.missing && m.instrument.count === 1 && m.instrument.fn !== want) {
      stateFails.push(`${viewport.label} ${state}: the column is ${m.instrument.fn}, ${want} expected`);
    }
    if (!m.missing && typeof m.key === "number") {
      if (expectedKey === null) expectedKey = m.key;
      else if (m.key !== expectedKey) {
        stateFails.push(`${viewport.label} ${state}: the key is ${m.key}px, ${expectedKey}px in Studio+piano expected`);
      }
    }
    fails.push(...stateFails);
    rows.push({ state, m, pass: stateFails.length === 0 });
  };
  // C-108: in the Studio the page scrolls, so the column is checked at the
  // bottom too. (The at-top fit of every state is already in singleColumnFails.)
  const checkStuck = async (state) => {
    const m = await page.evaluate(singleColumnStickMeasure);
    const stateFails = singleColumnStickFails(m, `${viewport.label} ${state}`);
    fails.push(...stateFails);
    sticks.push({ state, m, pass: stateFails.length === 0 });
  };
  try {
    // 1. Studio, piano (the default).
    await openCompactPage(page, "", '[data-s1="piano"]');
    await measure("Studio+piano", "jouer.piano");
    await checkStuck("Studio+piano");
    // 2. C-108b: choose the bass while the window is scrolled to its bottom
    // (the sticky column keeps the segmented head in view), then come back to
    // the top. A measure that read the sticky top as the document top would
    // keep the full key here.
    const beforeScroll = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return {
        scrollY: window.scrollY,
        canScroll: document.documentElement.scrollHeight > window.innerHeight,
      };
    });
    before = beforeScroll;
    await page.waitForTimeout(150);
    if (before.canScroll && !(before.scrollY > 0)) {
      fails.push(`${viewport.label} Studio+scrolled+bass: the window did not scroll before choosing (scrollY ${before.scrollY})`);
    }
    // A DOM click, not page.click: Playwright would scroll the button into view
    // and the state would no longer be "chosen while scrolled".
    await page.evaluate(() => {
      const btn = document.querySelector('[data-fn="jouer.instrument-tuile-bass"]');
      if (btn) btn.click();
    });
    await page.locator('[data-s1="bass"]').waitFor({ state: "visible", timeout: 10_000 });
    const atChoiceScroll = await page.evaluate(() => window.scrollY);
    atChoice = atChoiceScroll;
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await measure("Studio+scrolled+bass", "jouer.basse");
    // 3. Studio, guitar (a segment click).
    await clickSegment(page, "guitar");
    await measure("Studio+guitar", "jouer.guitare");
    await checkStuck("Studio+guitar");
    // 4. C-108b: the Studio reopened on the guitar (the choice is persisted).
    // There is no piano to measure, so the neck must size the page.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="guitar"]').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await measure("Studio+guitar+reload", "jouer.guitare");
    // 5. Dictionary, bass (a chord scenario).
    await openCompactPage(page, "?scenario=cmaj", '[data-fn="dico.type-accord"]');
    await clickSegment(page, "bass");
    await measure("Dictionary+bass", "jouer.basse");
    // 6. Dictionary, scales family, guitar, with the position rail.
    await openCompactPage(page, "?scenario=cmajscale", '[data-fn="dico.type-gamme"]');
    await clickSegment(page, "guitar");
    await page.locator('[data-s1="guitar"] .proto-a__position-rail').waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(200);
    await measure("Dictionary+scales+guitar", "jouer.guitare");
    // The tightest compact size also checks the page choice, the segments and
    // the help menu (the page is already on the Dictionary scale state).
    if (viewport.label === SINGLE_COLUMN_TIGHTEST) {
      fails.push(...(await checkPageChoice(browser)));
      fails.push(...(await checkSegments(page)));
      fails.push(...(await checkMenu(page)));
    }
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  singleColumnChecks[viewport.label] = { fails, rows, sticks };
  if (AS_JSON) return;
  const lead = `${viewport.label} S1-30 (single column)`;
  for (const row of rows) console.log(`${lead} ${row.state} ${row.pass ? "PASS" : "FAIL"}  ${singleColumnLine(row.m)}`);
  for (const s of sticks) {
    console.log(
      `${lead} ${s.state} stuck ${s.pass ? "PASS" : "FAIL"}  scrollY ${s.m.scrollY} (scrollHeight ${s.m.scrollHeight}, window ${s.m.innerHeight}), column top ${s.m.top} bottom ${s.m.bottom}${s.m.canScroll ? "" : " — the page cannot scroll at this size (printed, not asserted)"}`
    );
  }
  if (before.canScroll) {
    console.log(`${lead} Studio+scrolled+bass chosen at scrollY ${before.scrollY} (scrollY ${atChoice} after the choice, back to 0 before the measure)`);
  }
  if (viewport.label === SINGLE_COLUMN_TIGHTEST) console.log(`${lead}   page choice: ${A_PRIME_MIN_WIDTH - 1}px classic, ${A_PRIME_MIN_WIDTH}px A′ on the Studio; segments: guitar / bass / piano each left one column and one pressed segment; menu: opens with the four help controls on top, Escape closes and returns the focus, a press on the centre column closes`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

/** S1-30 parity: every applicable entry of the shared list, at 1920x970, one
 * setup per state (needs "panel" excepted — its content is S1-26's at 3840). */
async function reportSingleColumnParity(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 970 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const fails = [];
  const notes = [];
  const states = [];
  const seen = new Set();
  const stateIds = SINGLE_COLUMN_PARITY_STATES.map((s) => s.id);
  for (const f of SINGLE_COLUMN_PARITY) {
    if (seen.has(f.fn)) fails.push(`parity: ${f.fn} appears twice in the list`);
    seen.add(f.fn);
    if (!stateIds.includes(parityStateOf(f))) fails.push(`parity: ${f.fn} has no state (${parityStateOf(f)})`);
  }
  try {
    for (const state of SINGLE_COLUMN_PARITY_STATES) {
      if (state.search !== undefined) {
        await openCompactPage(page, state.search, state.ready);
      } else if (state.escape) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
        await page.locator(`[data-fn="${state.click}"]`).click({ timeout: 4000 });
        await page.locator(state.open).waitFor({ state: "visible", timeout: 4000 });
      } else if (state.segment) {
        await clickSegment(page, state.segment);
      } else if (state.click) {
        await page.locator(`[data-fn="${state.click}"]`).click({ timeout: 4000 });
        await page.waitForTimeout(150);
      }
      const entries = SINGLE_COLUMN_PARITY.filter((f) => parityStateOf(f) === state.id);
      const rows = await page.evaluate(locateParity, entries.map((f) => f.fn));
      for (const row of rows) {
        if (row.count !== 1) fails.push(`parity ${state.id}: ${row.fn} ${row.count} element(s), 1 expected`);
        else if (!row.visible) fails.push(`parity ${state.id}: ${row.fn} not visible`);
        else if (!row.inWin) fails.push(`parity ${state.id}: ${row.fn} could not be brought on screen`);
        else if (!row.onTop) fails.push(`parity ${state.id}: ${row.fn} covered by ${row.hit}`);
      }
      const ok = rows.filter((r) => r.count === 1 && r.visible && r.inWin && r.onTop).length;
      states.push({ id: state.id, total: rows.length, ok });
      // The neck's panel button is the one "needs: panel" entry whose opening
      // this probe checks here; the panel's CONTENT is S1-26's (at 3840).
      if (state.id === "dict-chord-guitar") {
        await page.locator('[data-fn="jouer.position-panneau-guitar"]').click({ timeout: 4000 });
        await page.locator('[role="dialog"].proto-a__position-panel').waitFor({ state: "visible", timeout: 4000 });
        notes.push("jouer.position-panneau-guitar opens a position panel in the Dictionary on a chord (its content is S1-26's, checked at 3840)");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
    }
  } catch (err) {
    fails.push(`parity: ${String(err && err.message ? err.message : err).split("\n")[0]}`);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  singleColumnParity = { fails, notes, states, total: SINGLE_COLUMN_PARITY.length };
  if (AS_JSON) return;
  const found = states.reduce((n, s) => n + s.ok, 0);
  const lead = "1920x970 S1-30 (parity)";
  console.log(`${lead} ${fails.length ? "FAIL" : "PASS"}  ${found}/${singleColumnParity.total} entries found, visible, on top in ${states.length} states`);
  for (const s of states) console.log(`${lead}   ${s.id}: ${s.ok}/${s.total}`);
  for (const n of notes) console.log(`${lead}   ${n}`);
  if (fails.length) console.log(`${lead}   FAILED: ${fails.join(" | ")}`);
}

/** In page: the page's horizontal scroll and its smallest sequencer step cell,
 * for the S1-30 threshold scan. */
function pageScrollMeasure() {
  const round = (n) => Math.round(n * 10) / 10;
  const cells = [...document.querySelectorAll('[data-s1="sequencer"] .step-lamp')].map(
    (el) => el.getBoundingClientRect().width
  );
  return {
    a: Boolean(document.querySelector('[data-prototype="a"]')),
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    minCellWidth: cells.length ? round(Math.min(...cells)) : null,
  };
}

/**
 * S1-30 threshold, INFORMATIVE: with A′ forced by ?prototype=a (below the
 * threshold the page would choose the classic one), scan 1440 ->
 * A_PRIME_MIN_WIDTH step 16 at 900px high and print, per width, the smallest
 * step cell among the four states and whether both rules hold: no horizontal
 * scroll and every cell >= 48px. A_PRIME_MIN_WIDTH itself is read, not changed.
 */
async function reportSingleColumnThreshold(browser) {
  const fails = [];
  const results = [];
  const pageErrors = [];
  // One page per width: the app persists its mode and instrument (localStorage,
  // VMU-050), so a shared page would start the next width in the Dictionary's
  // guitar and never show the Studio's piano. A fresh page is a fresh context.
  try {
    for (let width = 1440; width <= A_PRIME_MIN_WIDTH; width += 16) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      try {
        const states = [];
        const take = async (state) => states.push({ state, ...(await page.evaluate(pageScrollMeasure)) });
        await openCompactPage(page, "?prototype=a", '[data-s1="piano"]');
        await take("Studio+piano");
        await clickSegment(page, "guitar");
        await take("Studio+guitar");
        await openCompactPage(page, "?prototype=a&scenario=cmaj", '[data-fn="dico.type-accord"]');
        await clickSegment(page, "bass");
        await take("Dictionary+bass");
        await openCompactPage(page, "?prototype=a&scenario=cmajscale", '[data-fn="dico.type-gamme"]');
        await clickSegment(page, "guitar");
        await page.locator('[data-s1="guitar"] .proto-a__position-rail').waitFor({ state: "visible", timeout: 10_000 });
        await take("Dictionary+scales+guitar");
        if (states.some((s) => !s.a)) fails.push(`threshold ${width}px: A′ is not rendered although ?prototype=a is given`);
        // The smallest step cell among the four states — the deciding number.
        const smallestCell = states.reduce(
          (n, s) => (s.minCellWidth === null ? n : n === null ? s.minCellWidth : Math.min(n, s.minCellWidth)),
          null
        );
        // Both rules, in every state: no horizontal scroll, and cells >= 48px.
        const pass = states.every((s) => s.scrollWidth <= s.innerWidth && s.minCellWidth !== null && s.minCellWidth >= 48);
        results.push({ width, pass, smallestCell, states });
        if (!AS_JSON) console.log(`  threshold ${width}px: ${pass ? "PASS" : "FAIL"}  smallest step cell ${smallestCell ?? "-"}px; ${states.map((s) => `${s.state} ${s.scrollWidth}/${s.innerWidth}`).join(", ")}`);
      } finally {
        await page.close();
      }
    }
  } catch (err) {
    fails.push(`threshold: ${String(err && err.message ? err.message : err).split("\n")[0]}`);
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  const smallest = results.find((r) => r.pass);
  singleColumnThreshold = { fails, results, smallest: smallest ? smallest.width : null };
  if (AS_JSON) return;
  console.log(`S1-30 (threshold, informative) smallest width where all four states have no horizontal scroll AND every step cell >= 48px: ${smallest ? `${smallest.width}px` : `none in 1440..${A_PRIME_MIN_WIDTH}`} (A_PRIME_MIN_WIDTH: ${A_PRIME_MIN_WIDTH}px)`);
  if (fails.length) console.log(`S1-30 (threshold) FAILED: ${fails.join(" | ")}`);
}

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic S1 probe — prototype A′ (?prototype=a), spec S1-critere-prototype.md");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
  console.log("  browser    : Chromium only — the spec also asks for LibreWolf (Gecko): not measured here.");
  if (INJECT_CSS) console.log(`  INJECTED CSS (positive control): ${INJECT_CSS}`);
  console.log("");
}

const browser = await chromium.launch({ headless: !KEEP_OPEN });
const results = [];
const drawerChecks = {};
const noBenchChecks = {};
const accessChecks = {};
const headsChecks = {};
const selectionChecks = {};
const chordOctaveChecks = {};
const confirmChecks = {};
const positionPanelChecks = {};
const mathWindowChecks = {};
const textSizeChecks = {};
const heightFitChecks = {};
const singleColumnChecks = {};
// S1-30's parity and threshold checks: assigned by their report functions
// (empty, hence vacuous, when --single-column-only is not given).
let singleColumnParity = { fails: [], states: [], total: 0 };
let singleColumnThreshold = { fails: [], results: [], smallest: null };
try {
  for (const viewport of ACCESS_ONLY ? [] : VIEWPORTS) {
    for (const scenario of STATES) {
      for (const labels of S1_LABEL_MODES) {
        const { m, pageErrors } = await runState(browser, viewport, scenario, labels);
        const v = verdicts(m);
        const state = `${viewport.label} ${scenario.id.padEnd(14)} ${labels.id.padEnd(7)}`;
        results.push({ viewport: viewport.label, scenario: scenario.id, labels: labels.id, verdicts: v, measures: m, pageErrors });
        if (!AS_JSON) {
          for (const c of MATRIX_CRITERIA) {
            console.log(`${state} ${c.id.padEnd(5)} ${v[c.id].pass ? "PASS" : "FAIL"}  ${v[c.id].value}`);
          }
          if (!m.missing?.length) {
            const lk = m.labelKinds;
            console.log(`${state} info  labels piano [${lk.piano.join(", ")}] · guitar [${lk.guitar.texts.join(", ")}]${lk.guitar.mixed ? " (names+degrees mixed)" : ""} · bass [${lk.bass.texts.join(", ")}]${lk.bass.mixed ? " (names+degrees mixed)" : ""}`);
          }
          if (pageErrors.length) console.log(`${state} page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
        }
      }
    }
    const nb = await runNoBench(browser, viewport);
    noBenchChecks[viewport.label] = nb;
    if (!AS_JSON) {
      console.log(`${viewport.label} no-bench (S1-19, behaviour) ${nb.fails.length ? "FAIL" : "PASS"}  ${nb.value}${nb.fails.length ? `; FAILED: ${nb.fails.join(" | ")}` : ""}`);
    }
    const d = await runDrawer(browser, viewport);
    drawerChecks[viewport.label] = d;
    if (!AS_JSON) {
      console.log(d.error
        ? `${viewport.label} drawer ERROR ${d.error}`
        : `${viewport.label} drawer (info, P0-3) ${d.overlapPx2 === 0 ? "PASS" : "FAIL"}  drawer x=${d.drawerLeft}..${d.drawerLeft + d.drawerWidth} (${d.drawerWidth}px), centre ends at x=${d.centreRight}, overlap ${d.overlapPx2}px², covers: ${d.covered.join(", ") || "nothing"}`);
    }
  }
  // S1-20 (A′-ACCÈS): Gabriel's page, at its own two heights (skipped by
  // --height-fit-only and --single-column-only, which run their own checks).
  for (const viewport of HEIGHT_FIT_ONLY || SINGLE_COLUMN_ONLY ? [] : ACCESS_VIEWPORTS) {
    if (CHORD_OCTAVE_ONLY) {
      await reportChordOctave(browser, viewport);
      continue;
    }
    if (POSITION_PANEL_ONLY) {
      await reportPositionPanel(browser, viewport);
      continue;
    }
    if (MATH_WINDOW_ONLY) {
      await reportMathWindow(browser, viewport);
      continue;
    }
    if (TEXT_SIZE_ONLY) {
      await reportTextSize(browser, viewport);
      continue;
    }
    if (CONFIRM_ONLY) {
      await reportConfirm(browser, viewport);
      continue;
    }
    if (SELECTION_ONLY) {
      await reportSelection(browser, viewport);
      continue;
    }
    const access = await runAccess(browser, viewport);
    const volume = await runVolume(browser, viewport);
    accessChecks[viewport.label] = { access, volume };
    if (!AS_JSON) {
      const ok = access.located.filter((row) => locatedFails(row).length === 0).length;
      const s = access.layouts.studio;
      const c = access.contrast || {};
      const lead = `${viewport.label} S1-20 (access)`;
      console.log(`${lead} ${access.fails.length ? "FAIL" : "PASS"}  ${ok}/${access.located.length} data-fn present once, visible, on screen, on top`);
      for (const n of access.notes) console.log(`${lead}   ${n}`);
      if (s) console.log(`${lead}   page ${s.scrollWidth}x${s.scrollHeight} in ${s.innerWidth}x${s.innerHeight}; header ${s.headerHeight}px, items end at x=${s.headerRight}; transport ${s.transportHeight}px high; visualizer y=${s.visualizer?.top} ${s.visualizer?.height}px; centre column content ends at y=${s.centreBottom}; keyboard bottom y=${s.keyboardBottom}`);
      for (const lang of ["EN", "PT", "ZH"]) {
        const l = access.layouts[lang];
        if (l) console.log(`${lead}   ${lang}: page ${l.scrollWidth}x${l.scrollHeight}, header ${l.headerHeight}px, items end at x=${l.headerRight}, heads on ${l.headLines.join("/")} line(s)`);
      }
      for (const [state, v] of Object.entries(c)) {
        if (v) console.log(`${lead}   Assistant button (${state}): text ${v.color} on ${v.stops.join(" -> ")}, min contrast ${v.min}:1; border ${v.border}${v.boxShadow && v.boxShadow !== "none" ? `; shadow ${v.boxShadow}` : ""}`);
      }
      if (access.fails.length) console.log(`${lead}   FAILED: ${access.fails.join(" | ")}`);
      console.log(`${viewport.label} S1-20 (volume) ${volume.fails.length ? "FAIL" : "PASS"}  ${volume.steps.join("; ")}${volume.fails.length ? `; FAILED: ${volume.fails.join(" | ")}` : ""}`);
    }
    // S1-21 (L1b-1b): the column heads, at the same two heights.
    const heads = await runHeads(browser, viewport);
    headsChecks[viewport.label] = heads;
    if (!AS_JSON) {
      const lead = `${viewport.label} S1-21 (heads)`;
      console.log(`${lead} ${heads.fails.length ? "FAIL" : "PASS"}  heads 100 +-1px x3, one line per row, 48px targets on top, labels fitting, keyboard >= ${S1_21.minMargin}px above the window's bottom; FR / EN / PT / ZH x Dictionary / Studio`);
      for (const [key, h] of Object.entries(heads.layouts)) {
        const c = h.cols;
        if (!c.piano || !c.guitar || !c.bass) {
          console.log(`${lead}   ${key}: a head is missing`);
          continue;
        }
        const labels = ["piano", "guitar", "bass"].map((id) => `${id} "${c[id].label ? c[id].label.text : "-"}"${c[id].label && c[id].label.text ? ` ${c[id].label.textWidth}/${c[id].label.boxWidth}px` : ""}`).join(", ");
        const smallest = Math.min(...["piano", "guitar", "bass"].flatMap((id) => c[id].targets.map((t) => Math.min(t.w, t.h))));
        console.log(`${lead}   ${key}: heads ${c.piano.height} / ${c.guitar.height} / ${c.bass.height}px at y=${c.piano.top}, rows ${c.piano.rows.join("+")} / ${c.guitar.rows.join("+")} / ${c.bass.rows.join("+")} line(s), ${["piano", "guitar", "bass"].reduce((n, id) => n + c[id].targets.length, 0)} targets (smallest ${smallest}px); ${labels}; keyboard bottom y=${h.keyboardBottom}, margin ${round1(h.innerHeight - h.keyboardBottom)}px; page ${h.scrollWidth}x${h.scrollHeight} in ${h.innerWidth}x${h.innerHeight}`);
      }
      for (const n of heads.notes) console.log(`${lead}   ${n}`);
      if (heads.fails.length) console.log(`${lead}   FAILED: ${heads.fails.join(" | ")}`);
    }
    // S1-23 (VMU-185): the direct selectors, at the same two heights.
    await reportSelection(browser, viewport);
    // S1-24 (VMU-186): the Studio's "Octave des accords", at the same two heights.
    await reportChordOctave(browser, viewport);
    // S1-25 (VMU-126 / VMU-050): the confirmation and the memory.
    await reportConfirm(browser, viewport);
    // S1-26 (L1b-1c): the necks' position panel.
    await reportPositionPanel(browser, viewport);
    // S1-27 (VMU-195-A): the Math & Rythmes window, readable on 4K.
    await reportMathWindow(browser, viewport);
    // S1-28 (VMU-212): one text size, 14px everywhere except the frozen drawing.
    await reportTextSize(browser, viewport);
  }
  // S1-29 (C-103 Step 3a): the height fit, on its own three sizes — alone on
  // --height-fit-only, and as part of the full run (not of the other --*-only
  // flags).
  if (HEIGHT_FIT_ONLY || !ACCESS_ONLY) {
    for (const viewport of HEIGHT_FIT_VIEWPORTS) {
      await reportHeightFit(browser, viewport);
    }
  }
  // S1-30 (C-107 Step 3b, part 4): the compact page, alone on
  // --single-column-only. It loads ~55 pages (four sizes, the parity page and
  // the 14-width threshold scan), more than the ~2 min the default run allows:
  // that is why it is not part of the full run.
  if (SINGLE_COLUMN_ONLY) {
    for (const viewport of SINGLE_COLUMN_VIEWPORTS) {
      await reportSingleColumn(browser, viewport);
    }
    await reportSingleColumnParity(browser);
    await reportSingleColumnThreshold(browser);
    if (!AS_JSON) {
      const okViewports = Object.values(singleColumnChecks).filter((c) => c.fails.length === 0).length;
      const parityOk = singleColumnParity.fails.length === 0;
      const failCount = Object.values(singleColumnChecks).reduce((n, c) => n + c.fails.length, 0) + singleColumnParity.fails.length;
      console.log(`S1-30 ${okViewports === SINGLE_COLUMN_VIEWPORTS.length && parityOk ? "PASS" : "FAIL"} ${okViewports}/${SINGLE_COLUMN_VIEWPORTS.length} viewport(s)${parityOk ? "" : "; parity failed"}${failCount ? `; ${failCount} failure(s)` : ""}`);
    }
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

// ─── summary and decision ───────────────────────────────────────────────────

const summary = MATRIX_CRITERIA.map((c) => {
  const states = results.map((r) => r.verdicts[c.id]);
  const failed = results.filter((r) => !r.verdicts[c.id].pass);
  return {
    id: c.id,
    what: c.what,
    decides: c.decides,
    pass: failed.length === 0,
    passCount: states.length - failed.length,
    total: states.length,
    firstFail: failed[0] ? `${failed[0].viewport} ${failed[0].scenario} ${failed[0].labels}: ${failed[0].verdicts[c.id].value}` : null,
  };
});
const decisive = summary.filter((s) => s.decides);
// The page without bench=1 is the one Gabriel uses: its behaviour (S1-19) is
// part of the decision too, in each viewport.
const noBenchOk = Object.values(noBenchChecks).every((c) => c.fails.length === 0);
// S1-20 decides too (brief A-PRIME-ACCES: "critère décisif").
const accessOk = Object.values(accessChecks).every((c) => c.access.fails.length === 0 && c.volume.fails.length === 0);
const accessPassCount = Object.values(accessChecks).filter((c) => c.access.fails.length === 0 && c.volume.fails.length === 0).length;
// S1-21 decides too (brief L1b-1b: "critère de sonde S1-21 « têtes » (décisif)").
const headsOk = Object.values(headsChecks).every((c) => c.fails.length === 0);
const headsPassCount = Object.values(headsChecks).filter((c) => c.fails.length === 0).length;
// S1-23 decides too (brief VMU-185: "critère de sonde S1-23 « sélection directe » (décisif)").
const selectionOk = Object.values(selectionChecks).every((c) => c.fails.length === 0);
const selectionPassCount = Object.values(selectionChecks).filter((c) => c.fails.length === 0).length;
// S1-24 decides too (brief VMU-186: the Studio's octave setting is where Gabriel chose to put it).
const chordOctaveOk = Object.values(chordOctaveChecks).every((c) => c.fails.length === 0);
const chordOctavePassCount = Object.values(chordOctaveChecks).filter((c) => c.fails.length === 0).length;
const confirmOk = Object.values(confirmChecks).every((c) => c.fails.length === 0);
const confirmPassCount = Object.values(confirmChecks).filter((c) => c.fails.length === 0).length;
// S1-26 decides too (brief L1b-1c: the position panel is how A′ gives back what the classic page's PositionSelector did).
const positionPanelOk = Object.values(positionPanelChecks).every((c) => c.fails.length === 0);
const positionPanelPassCount = Object.values(positionPanelChecks).filter((c) => c.fails.length === 0).length;
// S1-27 decides too (brief VMU-195-A: the window must be readable for a beginner on Gabriel's 4K screen).
const mathWindowOk = Object.values(mathWindowChecks).every((c) => c.fails.length === 0);
const mathWindowPassCount = Object.values(mathWindowChecks).filter((c) => c.fails.length === 0).length;
// S1-28 decides too (VMU-212: one text size for everything but the frozen drawing).
const textSizeOk = Object.values(textSizeChecks).every((c) => c.fails.length === 0);
const textSizePassCount = Object.values(textSizeChecks).filter((c) => c.fails.length === 0).length;
// S1-29 decides too (C-103 Step 3a: below 2045px the instruments keep their
// drawing and show fewer octaves / frets).
const heightFitOk = Object.values(heightFitChecks).every((c) => c.fails.length === 0);
const heightFitPassCount = Object.values(heightFitChecks).filter((c) => c.fails.length === 0).length;
// S1-30 decides when it is run (--single-column-only); its threshold scan is
// informative and never enters the verdict.
const singleColumnOk = SINGLE_COLUMN_ONLY
  ? Object.values(singleColumnChecks).every((c) => c.fails.length === 0) && singleColumnParity.fails.length === 0
  : true;
const singleColumnPassCount = Object.values(singleColumnChecks).filter((c) => c.fails.length === 0).length;
const decision = decisive.every((s) => s.pass) && noBenchOk && accessOk && headsOk && selectionOk && chordOctaveOk && confirmOk && positionPanelOk && mathWindowOk && textSizeOk && heightFitOk && singleColumnOk ? "A′" : "B";
const anyPageError = results.some((r) => r.pageErrors.length);

if (AS_JSON) {
  console.log(JSON.stringify({ results, drawerChecks, noBenchChecks, accessChecks, headsChecks, selectionChecks, chordOctaveChecks, confirmChecks, positionPanelChecks, mathWindowChecks, textSizeChecks, heightFitChecks, singleColumnChecks, singleColumnParity, singleColumnThreshold, summary, decision }, null, 2));
} else {
  const nScen = STATES.filter((s) => !s.extra).length;
  const nExtra = STATES.filter((s) => s.extra).length;
  console.log(`\nSummary (all states: ${ACCESS_ONLY ? 0 : VIEWPORTS.length} viewports x (${nScen} scenarios + ${nExtra} L1a states) x ${S1_LABEL_MODES.length} label modes)`);
  for (const s of ACCESS_ONLY ? [] : summary) {
    console.log(`  ${s.id.padEnd(5)} ${s.pass ? "PASS" : "FAIL"} ${String(s.passCount).padStart(2)}/${s.total}  ${s.what}${s.decides ? "" : "  [correction, not a decision criterion]"}${s.firstFail ? `\n        first fail: ${s.firstFail}` : ""}`);
  }
  console.log("  S1-14 not measured: Gabriel's reading test (10 labels per instrument, names then degrees).");
  console.log(`  S1-19 no-bench behaviour: ${noBenchOk ? "PASS" : "FAIL"} in ${Object.keys(noBenchChecks).length}/${ACCESS_ONLY ? 0 : VIEWPORTS.length} viewport(s)`);
  console.log(`  S1-20 ${accessOk ? "PASS" : "FAIL"} ${accessPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  A′-ACCÈS: every function of src/prototype/aPrimeAccess.js on Gabriel's page, on top; openers open and Escape closes; tempo typed; no scroll in FR / EN / PT / ZH; none of the 9 duplicated controls; the transport's master volume reaches the engine`);
  console.log(`  S1-21 ${headsOk ? "PASS" : "FAIL"} ${headsPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  L1b-1b heads: 100 +-1px x3, one line per row, 48px targets on top, labels fitting, keyboard >= ${S1_21.minMargin}px above the window's bottom, no scroll (FR / EN / PT / ZH x Dictionary / Studio); › on the guitar moves the guitar only, › on the piano shifts its notes by 12 and leaves the necks`);
  console.log(`  S1-23 ${selectionOk ? "PASS" : "FAIL"} ${selectionPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  VMU-185 direct selectors: a second row of the transport block holding the Studio's style / the Dictionary's family, root note and type (none for a note), on top, 48px, one height in every state (block <= ${S1_23.maxBlock}px), no scroll, no cut name, open lists in the window (drawer closed and open), and they drive the keyboard / necks / sequencer against theory.js (FR / EN / PT / ZH)`);
  console.log(`  S1-24 ${chordOctaveOk ? "PASS" : "FAIL"} ${chordOctavePassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  VMU-186 chord octave: Studio - no arrow on the piano head, "Octave des accords" in the selection row (48px, on top, tooltip says the loop and the MIDI export, › changes the label, EU / US); Dictionary - the pair stays on the piano head, nothing in the row`);
  console.log(`  S1-25 ${confirmOk ? "PASS" : "FAIL"} ${confirmPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  VMU-126 / VMU-050: the box opens only with an edit (row, drawer menu, header tabs; never for a scenario), Garder keeps, Changer applies; the last selection survives a reload, a fresh context opens on the defaults, a damaged memory opens without error`);
  console.log(`  S1-26 ${positionPanelOk ? "PASS" : "FAIL"} ${positionPanelPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  L1b-1c position panel: the label of a neck's position opens a panel over the neck (heads stay 100px, keyboard does not move), Mi / La / Ré with Do's fret, 48px targets on top, a root string changes the shape drawn, reset, Escape closes and returns the focus; no warning sign in the Studio (VMU-201)`);
  console.log(`  S1-27 ${mathWindowOk ? "PASS" : "FAIL"} ${mathWindowPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  VMU-195-C Math & Rythmes dock: phase A one title, every text = ${S1_27.text}px (+-0.5; SVG >= ${S1_27.text}px on screen), targets >= ${S1_27.target}px (buttons and selects ${S1_27.button}px), the cases strip's cells >= ${S1_27.strip}px (as many as comp-n-value), six steppers >= ${S1_27.stepper}px, six "?" buttons, "Écouter" on top, no page scroll, inside the centre column, clear of the sequencer and the instruments; the recipes column beside the dock (or stacked under it), open by default (toggle on, 4 recipes, texts ${S1_27.text}px, targets >= 32px, nothing spills out); phase B phasing slider thumb >= ${S1_27.thumb}px, iso 64 cells fully visible, poly grid-led >= ${S1_27.cell}px`);
  console.log(`  S1-28 ${textSizeOk ? "PASS" : "FAIL"} ${textSizePassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  VMU-212 one text size: every A′ text ${S1_28.size}px (+-${S1_28.tolerance}), the instruments' frozen drawing excepted, SVG >= ${S1_28.svgFloor}px on screen; Studio / Math dock / Dictionary chord+scale / Assistant drawer / Instruments & Audio / Guide`);
  console.log(`  S1-29 ${heightFitOk ? "PASS" : "FAIL"} ${heightFitPassCount}/${HEIGHT_FIT_VIEWPORTS.length} viewport(s)  C-103 Step 3a / C-105 Step 3b height fit: at 2560+ the white key stays 61px; below 2560px it shrinks to min(61, max(--hit-min, floor((available-18)/15))) so the keyboard keeps 2 octaves. The keyboard shows the largest whole octave count that fits ((7k+1)*key+18 <= available), the necks the most frets whose full-neck rows (at that key) fit the keyboard's length, every row at its full-neck height, their bottom at/above the keyboard's by less than one row; no S1-4 overlap; the instruments end inside the window. 3840x2045 identical to today (4 octaves, frets 1-22)`);
  console.log(`  S1-30 ${SINGLE_COLUMN_ONLY ? (singleColumnOk ? "PASS" : "FAIL") : "not run"}${SINGLE_COLUMN_ONLY ? ` ${singleColumnPassCount}/${SINGLE_COLUMN_VIEWPORTS.length} viewport(s)` : " (--single-column-only: ~55 pages, more than the default run's ~2 min)"}  C-107 Step 3b single column, ${A_PRIME_MIN_WIDTH}..2559px: one instrument column inside the 24px right margin, the same data-fit-key in every state and the column inside the window at the top of the page, a 56px header without overflow and every button >= --hit-min, the sequencer's 16 cells of 48px per row uncut, no horizontal page scroll in Studio+piano / Studio+guitar / Dictionary+bass / Dictionary+scales+guitar; the three segments, the help menu (Escape returns the focus), the whole parity list at 1920x970, ${A_PRIME_MIN_WIDTH - 1}px classic / ${A_PRIME_MIN_WIDTH}px A′; threshold 1440..${A_PRIME_MIN_WIDTH} informative${singleColumnThreshold.smallest ? ` (no scroll + cells >= 48px from ${singleColumnThreshold.smallest}px)` : ""}`);
  if (ACCESS_ONLY) console.log("  (--access-only: S1-1..S1-19 not run)");
  console.log(`\nDecision by the spec's rule (S1-1..S1-11, S1-15..S1-30 all PASS -> A′, one FAIL -> B; S1-14 pending): ${decision}`);
  if (anyPageError) console.log("WARNING: page errors occurred (see lines above).");
}

// Exit code: 0 when the measured criteria allow A′ and no page errored.
process.exit(decision === "A′" && !anyPageError ? 0 : 1);
