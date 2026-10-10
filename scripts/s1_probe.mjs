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
 * probe knows on its own: the master-volume slider and the six faders, the
 * euclidean circle, the CC BY credit...) and Escape closes it; the tempo is
 * typed (90 + Enter, Escape cancels, 59 / 201 refused, 60 / 200 accepted); the
 * page does not scroll in FR, EN, PT and ZH; and the master volume reaches the
 * engine — the gain Tone.Destination really renders, read through a tap like
 * scripts/tempo_probe.mjs reads the mixer, follows the transport's slider and
 * the "Instruments & Audio" window's, which show one same value (runVolume).
 *   npm run s1:probe -- --access-only   # S1-20 alone, without the 60 states
 * Positive control: hide one button, S1-20 (and only S1-20) must turn red:
 *   S1_PROBE_INJECT_CSS='[data-fn="son.ouvrir"]{visibility:hidden!important}' npm run s1:probe
 *
 * L1b-1a (Gabriel: "le nom des notes ... sur toutes les touches du piano")
 * adds S1-22, decisive, in every state of the matrix: the vertical piano's 49
 * keys (29 white + 20 black) are all named, each name readable (>= 18px,
 * >= 4.5:1 against what is really behind it, inside its key), no two labels
 * overlapping; an unplayed key reads its name in the notation of the label
 * mode (a C with its octave, a black key with its flat). S1-21 is the next
 * slice's: it will be added there.
 * Positive control: S1-22 prints "N/49 keys named". Giving the keyboard its old
 * look (unplayed names hidden except the Cs) drops N from 49 to 7 in Do majeur
 * and 9 in Sol#m7, and only S1-22 turns red (S1-1, -2, -4, -10 stay green):
 *   S1_PROBE_INJECT_CSS='.piano-vertical .note-label--unplayed > :not(.piano-octave-name){display:none!important}' npm run s1:probe -- --only=cmaj,gsm7
 * and the grey put back to the page's muted grey on the white keys drops the
 * readable count and the contrast, again with S1-22 alone red:
 *   S1_PROBE_INJECT_CSS='.piano-vertical .white-key .note-label--unplayed{color:#8c8c8c!important}' npm run s1:probe -- --only=cmaj,gsm7
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
const ACCESS_ONLY = flag("access-only");

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
  { id: "S1-11", decides: true, what: "V3 step pitch in the centre column >= 39px, cell >= 36px wide (projection)" },
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
  { id: "S1-18", decides: true, what: "mode tabs: 'Mode Studio' / 'Mode Dictionnaire' in the header after the title, >= 48px high; no left rail (the page starts at <= 24px)" },
  // Coordinator, after her QA: the label modes are a function, not a fixture.
  // (Their behaviour without bench=1 is checked per viewport, see runNoBench.)
  { id: "S1-19", decides: true, what: "label modes: one 'Sur les notes' group of 3 segments (data-fn nav.noms-notes-eu / -us / nav.etiquettes-doigts) in the header, right of the tabs, >= 48px high, header still 72px, each button once, none in the centre column" },
  // L1b-1a (Gabriel: "le nom des notes ... sur toutes les touches du piano"; he
  // is a beginner). S1-21 is the next slice's (the instrument heads): it will
  // be added there, nothing is renumbered.
  { id: "S1-22", decides: true, what: "piano: all 49 keys named (an unplayed key by its name, a C with its octave, a black key with its flat), each name readable: >= 18px, >= 4.5:1 against what is behind it, inside its key; no two labels overlap" },
];

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

  // S1-11 — the centre column the V3 timeline would get. The spec's own
  // formula: (column content width - 262px of track names) / 64 steps, a
  // 2px gap between cells. A projection: V3 does not exist yet.
  const center = document.querySelector('[data-s1="center"]');
  const cw = center ? center.clientWidth : 0;
  const v3Pitch = (cw - 262) / 64;
  out.s1_11 = { centerWidth: round(cw), pitch: round(v3Pitch), cellWidth: round(v3Pitch - 2) };

  // S1-12 — page scroll.
  out.s1_12 = {
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: vh,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: vw,
  };

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
    const heads = [...section.querySelectorAll(".proto-a__inst-head > *")];
    const headBox = section.querySelector(".proto-a__inst-head");
    // Lines a head's text runs over: the distinct tops of its text rectangles.
    const lines = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((q) => Math.round(q.top))).size;
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
  // header keeping its 72px, each button once (the probe waits on
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
  // 5. Heads on one line, the same height in the three columns, so that the
  // three instruments start at the same height (a two-line head used to push
  // the bass neck 14px below the guitar's).
  const headLines = [piano, guitar, bass].map((col) => col.headLines);
  if (headLines.some((n) => n !== 1)) fails.push(`a head runs over ${headLines.join(" / ")} lines (piano / guitar / bass), one expected`);
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
  if (!(t.headerHeight <= 72.5)) fails.push(`the header is ${t.headerHeight}px high, 72px expected (no height added)`);
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
    for (const c of CRITERIA) put(c.id, false, `instrument not rendered: ${m.missing.join(", ")}`);
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
  put("S1-11", m.s1_11.pitch >= 39 && m.s1_11.cellWidth >= 36, `centre ${m.s1_11.centerWidth}px -> pitch ${m.s1_11.pitch}px, cell ${m.s1_11.cellWidth}px wide (x 40 high by construction)`);
  const sc = m.s1_12;
  put("S1-12", sc.scrollHeight <= sc.innerHeight && sc.scrollWidth <= sc.innerWidth, `scrollHeight ${sc.scrollHeight} / innerHeight ${sc.innerHeight}, scrollWidth ${sc.scrollWidth} / ${sc.innerWidth}`);
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
  const headLines = [...document.querySelectorAll(".proto-a__inst-head > *")].map((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((q) => Math.round(q.top))).size;
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
  if (!(l.headerHeight <= 72.5)) out.push(`${where}: header ${l.headerHeight}px high, 72 expected`);
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
    located = await page.evaluate(locateFns, A_PRIME_ACCESS.filter((f) => !f.needs).map((f) => f.fn));
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
          master: modal.querySelectorAll('input[type="range"][min="-40"][max="0"]').length,
          faders: modal.querySelectorAll('input[type="range"][orient="vertical"]').length,
          // An element whose own text is "Kick" (the textContent of the whole
          // window runs the labels together: "...VolumesKickSnare...").
          kick: [...modal.querySelectorAll("*")].some((el) => el.children.length === 0 && el.textContent.trim() === "Kick"),
        };
      });
      if (m.master !== 1 || m.faders !== 6 || !m.kick) throw new Error(`window content: master volume ${m.master}, faders ${m.faders}, "Kick" ${m.kick}`);
      await closesOnEscape(".modal-container");
      await page.locator(sel("son.ouvrir")).click({ timeout: T });
      await page.locator(".modal-container .modal-close-btn").click({ timeout: T });
      await page.locator(".modal-container").waitFor({ state: "detached", timeout: T });
      return `opens the master volume (1) and ${m.faders} faders with "Kick"; Escape and ✕ close`;
    });
    await step("composer.math-ouvrir", async () => {
      await page.locator(sel("composer.math-ouvrir")).click({ timeout: T });
      await page.locator(".modal-container #composition-panel .euclidean-svg").waitFor({ state: "visible", timeout: T });
      await closesOnEscape(".modal-container");
      return "opens the euclidean circle; Escape closes";
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

    // 3. Dictionary too: the page holds without scrolling.
    await page.locator(sel("nav.mode-dictionnaire")).click({ timeout: T });
    await page.waitForTimeout(300);
    layouts.dictionary = await page.evaluate(accessLayout);
    fails.push(...layoutFails("Dictionary", layouts.dictionary));
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
  const WINDOW = '.modal-container input[type="range"][min="-40"][max="0"]';
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

    await page.locator('[data-fn="son.ouvrir"]').click({ timeout: T });
    await page.locator(WINDOW).waitFor({ state: "visible", timeout: T });
    const inWindow = await page.locator(WINDOW).inputValue();
    steps.push(`the window's slider shows ${inWindow}`);
    if (inWindow !== "-30") fails.push(`the window's slider shows ${inWindow}, -30 expected (one state)`);
    await setRange(WINDOW, -6);
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.locator(".modal-container").waitFor({ state: "detached", timeout: T });
    const inTransport = await page.locator(TRANSPORT).inputValue();
    steps.push(`window slider -6 -> the transport's shows ${inTransport}`);
    if (inTransport !== "-6") fails.push(`after the window's -6 the transport's slider shows ${inTransport}`);
    expectDb("window slider -6", await page.evaluate(readDestinationTap), -6);
  } catch (err) {
    fails.push(String(err && err.message ? err.message : err).split("\n")[0]);
  } finally {
    await page.close();
  }
  if (pageErrors.length) fails.push(`page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  return { fails, steps };
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
try {
  for (const viewport of ACCESS_ONLY ? [] : VIEWPORTS) {
    for (const scenario of STATES) {
      for (const labels of S1_LABEL_MODES) {
        const { m, pageErrors } = await runState(browser, viewport, scenario, labels);
        const v = verdicts(m);
        const state = `${viewport.label} ${scenario.id.padEnd(14)} ${labels.id.padEnd(7)}`;
        results.push({ viewport: viewport.label, scenario: scenario.id, labels: labels.id, verdicts: v, measures: m, pageErrors });
        if (!AS_JSON) {
          for (const c of CRITERIA) {
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
  // S1-20 (A′-ACCÈS): Gabriel's page, at its own two heights.
  for (const viewport of ACCESS_VIEWPORTS) {
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
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

// ─── summary and decision ───────────────────────────────────────────────────

const summary = CRITERIA.map((c) => {
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
const decision = decisive.every((s) => s.pass) && noBenchOk && accessOk ? "A′" : "B";
const anyPageError = results.some((r) => r.pageErrors.length);

if (AS_JSON) {
  console.log(JSON.stringify({ results, drawerChecks, noBenchChecks, accessChecks, summary, decision }, null, 2));
} else {
  const nScen = STATES.filter((s) => !s.extra).length;
  const nExtra = STATES.filter((s) => s.extra).length;
  console.log(`\nSummary (all states: ${ACCESS_ONLY ? 0 : VIEWPORTS.length} viewports x (${nScen} scenarios + ${nExtra} L1a states) x ${S1_LABEL_MODES.length} label modes)`);
  for (const s of ACCESS_ONLY ? [] : summary) {
    console.log(`  ${s.id.padEnd(5)} ${s.pass ? "PASS" : "FAIL"} ${String(s.passCount).padStart(2)}/${s.total}  ${s.what}${s.decides ? "" : "  [correction, not a decision criterion]"}${s.firstFail ? `\n        first fail: ${s.firstFail}` : ""}`);
  }
  console.log("  S1-14 not measured: Gabriel's reading test (10 labels per instrument, names then degrees).");
  console.log(`  S1-19 no-bench behaviour: ${noBenchOk ? "PASS" : "FAIL"} in ${Object.keys(noBenchChecks).length}/${ACCESS_ONLY ? 0 : VIEWPORTS.length} viewport(s)`);
  console.log(`  S1-20 ${accessOk ? "PASS" : "FAIL"} ${accessPassCount}/${ACCESS_VIEWPORTS.length} viewport(s)  A′-ACCÈS: every function of src/prototype/aPrimeAccess.js on Gabriel's page, on top; openers open and Escape closes; tempo typed; no scroll in FR / EN / PT / ZH; the master volume reaches the engine`);
  if (ACCESS_ONLY) console.log("  (--access-only: S1-1..S1-19 not run)");
  console.log(`\nDecision by the spec's rule (S1-1..S1-11, S1-15..S1-20, S1-22 all PASS -> A′, one FAIL -> B; S1-14 pending): ${decision}`);
  if (anyPageError) console.log("WARNING: page errors occurred (see lines above).");
}

// Exit code: 0 when the measured criteria allow A′ and no page errored.
process.exit(decision === "A′" && !anyPageError ? 0 : 1);
