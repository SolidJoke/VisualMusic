// L1a-fix1 (Gabriel, 2026-10-05, ?prototype=a) — the vertical neck's fret pitch.
//
// Until now every fret row of the vertical neck was 70px high: no neck looks
// like that, and Gabriel asked for a pitch that shrinks from the nut towards
// the body ("pas besoin de respecter exactement les proportions, mais s'en
// rapprocher facilitera le repérage"). The coordinator's amendment fixes the
// curve: LINEAR, 84px on fret 1 down to 56px on the neck's last fret, so a
// neck is exactly as tall as with 70px rows (22 x 70 = 1540, 20 x 70 = 1400).
//
// What is asserted here is the FUNCTION (pure, no layout), for the guitar's 22
// frets and the bass's 20:
//
//   - linear, strictly decreasing, 84px -> 56px;
//   - >= 64px up to fret 12 (S1-5, which the probe measures in Chromium);
//   - >= 52px everywhere (a 48px pastille, no overlap, S1-4);
//   - a whole neck no taller than today's: guitar 1682px, bass 1542px.
//
// The neck's other heights (the two head rows, the open-string row) are read
// from Fretboard.css, where they are declared, so this file cannot drift from
// the stylesheet. Whether the rows really get those heights in a page is the
// probe's job (scripts/s1_probe.mjs, S1-5 and S1-17), not this file's.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { verticalFretPitch, INLAY_FRET_DOTS } from "../verticalNeckGeometry";

const NECKS = { guitar: 22, bass: 20 }; // useFretboard.js getNumFrets
const HEIGHT_BEFORE = { guitar: 1682, bass: 1542 }; // measured by the coordinator on 69272a3

const css = fs.readFileSync(path.resolve("src/components/Instruments/Fretboard.css"), "utf8");
const cssPx = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)px`));
  if (!m) throw new Error(`${name} not found in Fretboard.css`);
  return Number(m[1]);
};

const pitches = (numFrets) => Array.from({ length: numFrets }, (_, i) => verticalFretPitch(i + 1, numFrets));
const neckHeight = (numFrets) => 2 * cssPx("--fbv-head") + cssPx("--fbv-fret") + pitches(numFrets).reduce((a, b) => a + b, 0);

describe.each(Object.entries(NECKS))("verticalFretPitch on the %s (%i frets)", (name, numFrets) => {
  it("goes from 84px on fret 1 to 56px on the last fret", () => {
    const p = pitches(numFrets);
    expect(p[0]).toBeCloseTo(84, 1);
    expect(p[numFrets - 1]).toBeCloseTo(56, 1);
  });

  it("shrinks strictly from the nut towards the body", () => {
    const p = pitches(numFrets);
    p.slice(1).forEach((v, i) => expect(v).toBeLessThan(p[i]));
  });

  it("is linear: the same step from one fret to the next", () => {
    const p = pitches(numFrets);
    const step = p[0] - p[1];
    expect(step).toBeGreaterThan(1);
    p.slice(1).forEach((v, i) => expect(p[i] - v).toBeCloseTo(step, 1));
  });

  it("is at least 64px up to fret 12 (S1-5)", () => {
    pitches(numFrets).slice(0, 12).forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(64));
  });

  it("is at least 52px on every fret, so a 48px pastille never touches its neighbour (S1-4)", () => {
    pitches(numFrets).forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(52));
  });

  it("keeps the neck no taller than before", () => {
    expect(neckHeight(numFrets)).toBeLessThanOrEqual(HEIGHT_BEFORE[name]);
  });

  it("uses the height it had: the rows sum to numFrets x 70px, within half a pixel", () => {
    expect(pitches(numFrets).reduce((a, b) => a + b, 0)).toBeGreaterThan(numFrets * 70 - 0.5);
  });
});

describe("INLAY_FRET_DOTS", () => {
  it("lists the frets Gabriel named: 3, 5, 7, 9, 12 (double), 15, 17, 19, 21", () => {
    expect(INLAY_FRET_DOTS).toEqual({ 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 });
  });
});
