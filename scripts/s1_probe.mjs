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
 *   npm run s1:probe                    # human-readable
 *   npm run s1:probe -- --json          # JSON, one entry per state
 *   npm run s1:probe -- --shot          # also PNGs in probe.local/ (gitignored)
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
import { S1_SCENARIOS, S1_LABEL_MODES } from "../src/prototype/s1Scenarios.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

const PORT = Number(process.env.S1_PROBE_PORT ?? 5986);
const ORIGIN = `http://localhost:${PORT}`;
const INJECT_CSS = process.env.S1_PROBE_INJECT_CSS || "";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const AS_JSON = flag("json");
const SHOT = flag("shot");
const KEEP_OPEN = flag("headed");

const VIEWPORTS = [
  { w: 3840, h: 2160, label: "3840x2160" },
  { w: 3840, h: 2020, label: "3840x2020" },
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
  { id: "S1-11", decides: true, what: "V3 step pitch in the centre column >= 39px, cell >= 36px wide (projection)" },
  { id: "S1-12", decides: false, what: "no page scroll: scrollHeight <= innerHeight, scrollWidth <= innerWidth" },
  { id: "S1-13", decides: false, what: "no interactive element intercepted (elementFromPoint)" },
];

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
  for (const k of blacks) {
    const label = k.querySelector(".note-label");
    if (!label || !visible(label)) continue;
    blackLabels++;
    const tr = textRect(label);
    if (!inside(r(label), r(k)) || !inside(tr, r(k))) blackLabelFails.push(`${describe(label)} ${round(tr.width)}x${round(tr.height)} in ${round(r(k).width)}x${round(r(k).height)}`);
  }
  out.piano = {
    whiteKeys: whites.length,
    minWhite: whites.length ? round(Math.min(...whites.map((b) => b.height))) : null,
    minBlack: blacks.length ? round(Math.min(...blacks.map((k) => r(k).height))) : null,
    whitesVisible,
    blackLabels,
    blackLabelFails,
    bottom: round(r(piano).bottom),
  };

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
  put("S1-10", p.blackLabelFails.length === 0, p.blackLabels ? `${p.blackLabels - p.blackLabelFails.length}/${p.blackLabels} inside${p.blackLabelFails.length ? `: ${p.blackLabelFails.slice(0, 3).join(" | ")}` : ""}` : "n/a (no black-key label in this state)");
  put("S1-11", m.s1_11.pitch >= 39 && m.s1_11.cellWidth >= 36, `centre ${m.s1_11.centerWidth}px -> pitch ${m.s1_11.pitch}px, cell ${m.s1_11.cellWidth}px wide (x 40 high by construction)`);
  const sc = m.s1_12;
  put("S1-12", sc.scrollHeight <= sc.innerHeight && sc.scrollWidth <= sc.innerWidth, `scrollHeight ${sc.scrollHeight} / innerHeight ${sc.innerHeight}, scrollWidth ${sc.scrollWidth} / ${sc.innerWidth}`);
  const it = m.s1_13;
  put("S1-13", it.intercepted.length === 0, `${it.intercepted.length} intercepted of ${it.checked} on screen (${it.offscreen} off screen)${it.intercepted.length ? `: ${it.intercepted.slice(0, 3).join(" | ")}` : ""}`);
  return v;
}

// ─── run ──────────────────────────────────────────────────────────────────

async function runState(browser, viewport, scenario, labels) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    await page.goto(`${ORIGIN}/?prototype=a&scenario=${scenario.id}&labels=${labels.id}`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
    if (INJECT_CSS) await page.addStyleTag({ content: INJECT_CSS });
    await page.evaluate(() => document.fonts.ready);
    // The scenario is applied by an effect after the first paint: wait until
    // the page's own scenario / label buttons report it active.
    await page.locator(`[data-scenario="${scenario.id}"].is-active`).waitFor({ timeout: 10_000 });
    await page.locator(`[data-labels="${labels.id}"].is-active`).waitFor({ timeout: 10_000 });
    await page.waitForTimeout(200);
    const m = await page.evaluate(measureInPage);
    if (SHOT) {
      fs.mkdirSync(path.join(ROOT, "probe.local"), { recursive: true });
      await page.screenshot({ path: path.join(ROOT, "probe.local", `s1-${viewport.label}-${scenario.id}-${labels.id}.png`) });
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
async function runDrawer(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  try {
    await page.goto(`${ORIGIN}/?prototype=a&scenario=cmaj&labels=eu&drawer=open`, { waitUntil: "domcontentloaded" });
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
try {
  for (const viewport of VIEWPORTS) {
    for (const scenario of S1_SCENARIOS) {
      for (const labels of S1_LABEL_MODES) {
        const { m, pageErrors } = await runState(browser, viewport, scenario, labels);
        const v = verdicts(m);
        const state = `${viewport.label} ${scenario.id.padEnd(9)} ${labels.id.padEnd(7)}`;
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
    const d = await runDrawer(browser, viewport);
    drawerChecks[viewport.label] = d;
    if (!AS_JSON) {
      console.log(d.error
        ? `${viewport.label} drawer ERROR ${d.error}`
        : `${viewport.label} drawer (info, P0-3) ${d.overlapPx2 === 0 ? "PASS" : "FAIL"}  drawer x=${d.drawerLeft}..${d.drawerLeft + d.drawerWidth} (${d.drawerWidth}px), centre ends at x=${d.centreRight}, overlap ${d.overlapPx2}px², covers: ${d.covered.join(", ") || "nothing"}`);
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
const decision = decisive.every((s) => s.pass) ? "A′" : "B";
const anyPageError = results.some((r) => r.pageErrors.length);

if (AS_JSON) {
  console.log(JSON.stringify({ results, drawerChecks, summary, decision }, null, 2));
} else {
  console.log("\nSummary (all states: 2 viewports x 4 scenarios x 3 label modes)");
  for (const s of summary) {
    console.log(`  ${s.id.padEnd(5)} ${s.pass ? "PASS" : "FAIL"} ${String(s.passCount).padStart(2)}/${s.total}  ${s.what}${s.decides ? "" : "  [correction, not a decision criterion]"}${s.firstFail ? `\n        first fail: ${s.firstFail}` : ""}`);
  }
  console.log("  S1-14 not measured: Gabriel's reading test (10 labels per instrument, names then degrees).");
  console.log(`\nDecision by the spec's rule (S1-1..S1-11 all PASS -> A′, one FAIL -> B; S1-14 pending): ${decision}`);
  if (anyPageError) console.log("WARNING: page errors occurred (see lines above).");
}

// Exit code: 0 when the measured criteria allow A′ and no page errored.
process.exit(decision === "A′" && !anyPageError ? 0 : 1);
