// L1a-fix1 (Gabriel, 2026-10-05, ?prototype=a) — the vertical neck's fret pitch.
//
// Until now every fret row of the vertical neck was 70px high: no neck looks
// like that, and Gabriel asked for a pitch that shrinks from the nut towards
// the body ("pas besoin de respecter exactement les proportions, mais s'en
// rapprocher facilitera le repérage").
//
// What is asserted here is the FUNCTION (pure, no layout): the bounds the
// coordinator's brief fixes, measurable without a browser.
//
//   - strictly decreasing, nut to body;
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

const GUITAR_FRETS = 22; // useFretboard.js getNumFrets
const BASS_FRETS = 20;
const GUITAR_HEIGHT_BEFORE = 1682; // measured by the coordinator on 69272a3
const BASS_HEIGHT_BEFORE = 1542;

const css = fs.readFileSync(path.resolve("src/components/Instruments/Fretboard.css"), "utf8");
const cssPx = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)px`));
  if (!m) throw new Error(`${name} not found in Fretboard.css`);
  return Number(m[1]);
};

const pitches = (n) => Array.from({ length: n }, (_, i) => verticalFretPitch(i + 1));
const neckHeight = (frets) => 2 * cssPx("--fbv-head") + cssPx("--fbv-fret") + pitches(frets).reduce((a, b) => a + b, 0);

describe("verticalFretPitch", () => {
  it("shrinks strictly from the nut towards the body", () => {
    const p = pitches(GUITAR_FRETS);
    p.slice(1).forEach((v, i) => expect(v).toBeLessThan(p[i]));
  });

  it("is at least 64px up to fret 12 (S1-5)", () => {
    pitches(12).forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(64));
  });

  it("is at least 52px on every fret, so a 48px pastille never touches its neighbour (S1-4)", () => {
    pitches(GUITAR_FRETS).forEach((v, i) => expect(v, `fret ${i + 1}`).toBeGreaterThanOrEqual(52));
  });

  it("really varies: the nut end is clearly wider than the body end", () => {
    const p = pitches(GUITAR_FRETS);
    expect(p[0] - p[GUITAR_FRETS - 1]).toBeGreaterThanOrEqual(20);
  });

  it("keeps the guitar neck no taller than before (1682px)", () => {
    expect(neckHeight(GUITAR_FRETS)).toBeLessThanOrEqual(GUITAR_HEIGHT_BEFORE);
  });

  it("keeps the bass neck no taller than before (1542px)", () => {
    expect(neckHeight(BASS_FRETS)).toBeLessThanOrEqual(BASS_HEIGHT_BEFORE);
  });
});

describe("INLAY_FRET_DOTS", () => {
  it("lists the frets Gabriel named: 3, 5, 7, 9, 12 (double), 15, 17, 19, 21", () => {
    expect(INLAY_FRET_DOTS).toEqual({ 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 });
  });
});
