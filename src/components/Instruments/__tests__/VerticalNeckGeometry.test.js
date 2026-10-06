// L1a-fix1 (Gabriel, 2026-10-05, ?prototype=a) — the vertical neck's fret pitch,
// then L1a-fix2 (Gabriel, 2026-10-06): "Le manche de la basse est plus court
// que celui de la guitare qui lui-même est plus court que le clavier. Les deux
// manches devraient avoir la même longueur que le clavier afin d'optimiser
// l'espace vertical."
//
// fix1 made the pitch LINEAR, 84px on fret 1 down to 56px on the last fret, so
// a neck was exactly as tall as with 70px rows (guitar 1682px, bass 1542px).
// fix2 keeps the shape and the 84 : 56 = 1.5 ratio, and changes the scale: the
// rows are normalised so that the neck's rows fill what is left of the
// KEYBOARD's height once the neck's fixed lines (two head rows, the open-string
// row above the nut) are taken off. The keyboard's height (1816px) is one value
// in the page's CSS (--proto-inst-h, from the key thickness) that both the
// keyboard and the necks read.
//
// What is asserted here is the FUNCTION (pure, no layout), for the guitar's 22
// frets and the bass's 20, with the keyboard's height read from PrototypeA.css
// and the neck's fixed lines from Fretboard.css, where they are declared, so
// this file cannot drift from the stylesheets:
//
//   - the rows' shares of the available height sum to 1, whatever the neck;
//   - linear, strictly decreasing, first : last = 1.5;
//   - the rows plus the fixed lines are as tall as the keyboard (to the 0.01px
//     the rounding down costs, never above), on both necks;
//   - >= 64px up to fret 12 (S1-5) and >= 52px everywhere (S1-4) at that height;
//   - the keyboard and the necks read the SAME height variable.
// Whether the browser lays the rows out to those heights is the probe's job
// (scripts/s1_probe.mjs, S1-17: the bottom of each neck is the keyboard's).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  verticalFretShare,
  verticalFretPitch,
  verticalFretPitchCss,
  FRET_PITCH_RATIO,
  INLAY_FRET_DOTS,
} from "../verticalNeckGeometry";

const NECKS = { guitar: 22, bass: 20 }; // useFretboard.js getNumFrets

const read = (p) => fs.readFileSync(path.resolve(p), "utf8");
const neckCss = read("src/components/Instruments/Fretboard.css");
const pageCss = read("src/prototype/PrototypeA.css");
const cssNumber = (css, name) => {
  const m = css.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)(?:px)?\\s*;`));
  if (!m) throw new Error(`${name} not found`);
  return Number(m[1]);
};

// The keyboard's height, as the page defines it: white keys x key thickness +
// the keyboard box's own padding and border. Read inside the tests (not when
// the file loads), so that a stylesheet without these variables makes the
// tests fail one by one, not the whole file at once.
const geo = () => {
  const keyboard =
    cssNumber(pageCss, "--proto-keys") * cssNumber(pageCss, "--proto-key") + cssNumber(pageCss, "--proto-piano-chrome");
  const fixed = 2 * cssNumber(neckCss, "--fbv-head") + cssNumber(neckCss, "--fbv-fret");
  return { keyboard, fixed, rows: keyboard - fixed };
};

const shares = (n) => Array.from({ length: n }, (_, i) => verticalFretShare(i + 1, n));
const pitches = (n) => Array.from({ length: n }, (_, i) => verticalFretPitch(i + 1, n, geo().rows));
const sum = (a) => a.reduce((x, y) => x + y, 0);

describe("the premise: what the page's CSS says", () => {
  it("has a keyboard 1816px high (29 white keys of 62px + 18px of box), the necks' fixed lines 142px", () => {
    expect(geo()).toEqual({ keyboard: 1816, fixed: 142, rows: 1674 });
  });

  it("gives the keyboard and the necks ONE height variable: --fbv-h and the key thickness come from --proto-*", () => {
    // The necks read --fbv-h, set on .proto-a from the keyboard's height ...
    expect(pageCss).toMatch(/--fbv-h:\s*var\(--proto-inst-h/);
    expect(pageCss).toMatch(/--proto-inst-h:\s*calc\([^;]*--proto-keys[^;]*--proto-key[^;]*--proto-piano-chrome/);
    // ... and the keyboard's key thickness is the same --proto-key.
    expect(pageCss).toMatch(/--piano-v-key:\s*var\(--proto-key/);
  });
});

describe.each(Object.entries(NECKS))("verticalFretShare / verticalFretPitch on the %s (%i frets)", (name, numFrets) => {
  it("shares the available height out completely: the shares sum to 1", () => {
    expect(sum(shares(numFrets))).toBeCloseTo(1, 6);
  });

  it("shrinks strictly from the nut towards the body, in a straight line", () => {
    const s = shares(numFrets);
    s.slice(1).forEach((v, i) => expect(v).toBeLessThan(s[i]));
    const step = s[0] - s[1];
    s.slice(1).forEach((v, i) => expect(s[i] - v).toBeCloseTo(step, 7));
  });

  it("keeps fret 1 : last fret = 1.5 (the 84 : 56 of fix1), on every neck", () => {
    expect(FRET_PITCH_RATIO).toBe(1.5);
    const s = shares(numFrets);
    expect(s[0] / s[numFrets - 1]).toBeCloseTo(1.5, 6);
    const p = pitches(numFrets);
    expect(p[0] / p[numFrets - 1]).toBeCloseTo(1.5, 2);
  });

  it("fills the keyboard: the rows plus the neck's fixed lines are as tall as the keyboard (never above, within 0.01px per row below)", () => {
    const { keyboard, fixed } = geo();
    const total = fixed + sum(pitches(numFrets));
    expect(total).toBeLessThanOrEqual(keyboard + 1e-6);
    expect(total).toBeGreaterThan(keyboard - 0.01 * numFrets);
  });

  it("is at least 64px up to fret 12 (S1-5) and at least 52px on every fret (S1-4) at that height", () => {
    const p = pitches(numFrets);
    p.slice(0, 12).forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(64));
    p.forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(52));
  });

  it("gives the bass the same neck length as the guitar, with its own, larger scale", () => {
    // Both fill the same height, so the shorter neck (20 frets) has the larger mean pitch.
    const mean = (n) => sum(pitches(n)) / n;
    expect(mean(NECKS.bass)).toBeGreaterThan(mean(NECKS.guitar));
    expect(geo().fixed + sum(pitches(NECKS.bass))).toBeCloseTo(geo().fixed + sum(pitches(NECKS.guitar)), 0);
  });

  it("writes the row's height as a CSS calc of the page's available height and its share", () => {
    for (let fret = 1; fret <= numFrets; fret++) {
      const css = verticalFretPitchCss(fret, numFrets);
      expect(css).toContain("var(--fbv-rows-h");
      expect(css).toContain(String(verticalFretShare(fret, numFrets)));
    }
  });
});

describe("INLAY_FRET_DOTS", () => {
  it("lists the frets Gabriel named: 3, 5, 7, 9, 12 (double), 15, 17, 19, 21", () => {
    expect(INLAY_FRET_DOTS).toEqual({ 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 });
  });
});
