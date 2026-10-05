import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import extendedTheoryData from "../extendedTheoryData.json";
import { NOTES, generateChordsFromNNS, resolveChordFromShortName } from "../theory";
import { chordsFromProgression, describeChord } from "../timeline";
import { quickStartProgression } from "../quickStart";

/**
 * VMU-169 — a chord is named in full: its root AND its type, seventh included.
 *
 * The Studio showed a Quick Start's chords by root and "m" / "dim" only
 * (`generateChordsFromNNS` read two families out of fourteen chord types):
 * E phrygian II-V-I, which sounds Fmaj7, Bm7b5, Em7, was written "Fa", "Sim",
 * "Mim" (US: "F", "Bm", "Em"). The sound is right (the type comes from
 * resolveNnsToChordType); the name hid the seventh — and "Bm7b5" read as a
 * plain minor chord.
 *
 * What a chord is called is decided once, in theory.js, and every place that
 * names one reads it: the Studio's progression (generateChordsFromNNS) and the
 * DAW helper's chords of the document (describeChord).
 *
 * The names below are written by hand from the scales — E phrygian E F G A B C D,
 * E dorian E F# G A B C# D, G mixolydian G A B C D E F — stacking thirds on the
 * degree, not read back from the code under test. The notation is the app's:
 * US "Fmaj7", EU "Famaj7" (root in solfege, same suffix; as the app already
 * writes a minor chord "Lam").
 */

const QUICK_STARTS = extendedTheoryData.axiomRules.progressions;
const byId = (id) => QUICK_STARTS.find((quickStart) => quickStart.id === id);

const E_PHRYGIAN = { rootValue: 4, scaleKey: "scale_phrygian" };
const E_DORIAN = { rootValue: 4, scaleKey: "scale_dorian" };
const G_MIXOLYDIAN = { rootValue: 7, scaleKey: "scale_mixolydian" };

/** The chords the Studio shows for a Quick Start in a style: what StudioPanel does. */
function studioChords(key, quickStartId, options) {
  return generateChordsFromNNS(key.rootValue, key.scaleKey, quickStartProgression(byId(quickStartId), key, options));
}
const us = (chords) => chords.map((chord) => chord.chordNameUS);
const eu = (chords) => chords.map((chord) => chord.chordNameEU);

describe("VMU-169 — the Studio names a Quick Start's chords in full (predicted red: 'F', 'Bm', 'Em')", () => {
  it("data this test relies on is there", () => {
    expect(QUICK_STARTS.map((q) => q.id)).toEqual(["jazz_251_maj", "jazz_251_min", "pop_1564", "jazz_turnaround", "rnb_436"]);
    expect(BRICKS.some((b) => b.rootValue === 4 && b.scaleKey === "scale_phrygian")).toBe(true);
  });

  describe.each([
    {
      style: "E phrygian",
      key: E_PHRYGIAN,
      cases: [
        ["jazz_251_maj", {}, ["Fmaj7", "Bm7b5", "Em7"], ["Famaj7", "Sim7b5", "Mim7"]],
        ["jazz_251_maj", { classicCadence: true }, ["Fmaj7", "B7", "Em7"], ["Famaj7", "Si7", "Mim7"]],
        ["jazz_turnaround", {}, ["Em7", "Cmaj7", "Fmaj7", "Bm7b5"], ["Mim7", "Domaj7", "Famaj7", "Sim7b5"]],
        // iii of E phrygian is G B D F: a dominant seventh, not a major one.
        ["rnb_436", {}, ["Am7", "G7", "Cmaj7"], ["Lam7", "Sol7", "Domaj7"]],
        ["pop_1564", {}, ["Em", "Bdim", "C", "Am"], ["Mim", "Sidim", "Do", "Lam"]],
        ["pop_1564", { classicCadence: true }, ["Em", "B", "C", "Am"], ["Mim", "Si", "Do", "Lam"]],
      ],
    },
    {
      style: "E dorian",
      key: E_DORIAN,
      cases: [
        ["jazz_251_maj", {}, ["F#m7", "Bm7", "Em7"], ["Fa#m7", "Sim7", "Mim7"]],
        ["jazz_251_maj", { classicCadence: true }, ["F#m7", "B7", "Em7"], ["Fa#m7", "Si7", "Mim7"]],
      ],
    },
    {
      style: "G mixolydian",
      key: G_MIXOLYDIAN,
      cases: [
        ["jazz_251_maj", {}, ["Am7", "Dm7", "G7"], ["Lam7", "Rém7", "Sol7"]],
        ["jazz_251_maj", { classicCadence: true }, ["Am7", "D7", "G7"], ["Lam7", "Ré7", "Sol7"]],
      ],
    },
  ])("$style", ({ key, cases }) => {
    it.each(cases)("%s %j: US", (id, options, expectedUS) => {
      expect(us(studioChords(key, id, options))).toEqual(expectedUS);
    });
    it.each(cases)("%s %j: EU", (id, options, expectedUS, expectedEU) => {
      expect(eu(studioChords(key, id, options))).toEqual(expectedEU);
    });
  });
});

describe("VMU-169 — a name carries the chord's type, on every style and Quick Start", () => {
  // The suffix that follows the root in a US name; the type it reads back as.
  // resolveChordFromShortName is the dictionary's reverse reading — independent of
  // the code that writes the name — so a name that loses the type cannot round-trip.
  const suffixOf = (name, rootUS) => name.slice(rootUS.length);

  it("US: each name reads back as the chord's own root and type (27 styles x 5 Quick Starts x 2 options)", () => {
    const failures = [];
    let checked = 0;
    BRICKS.forEach((brick) => {
      const key = { rootValue: brick.rootValue, scaleKey: brick.scaleKey };
      QUICK_STARTS.forEach((quickStart) => {
        [false, true].forEach((classicCadence) => {
          const progression = quickStartProgression(quickStart, key, { classicCadence });
          const shown = generateChordsFromNNS(key.rootValue, key.scaleKey, progression);
          const played = chordsFromProgression(key, progression).slice(0, progression.length);
          shown.forEach((chord, i) => {
            checked += 1;
            const back = resolveChordFromShortName(chord.chordNameUS);
            if (back?.rootValue !== played[i].rootPc || back?.dictType !== played[i].type) {
              failures.push(`${brick.name.en} / ${quickStart.id} / cadence ${classicCadence} / ${progression[i]}: "${chord.chordNameUS}" is not ${played[i].rootPc} ${played[i].type}`);
            }
          });
        });
      });
    });
    expect(checked).toBeGreaterThanOrEqual(900); // the loop ran: 27 styles x 5 Quick Starts x 2 options x 3-4 chords (918 at the time of writing)
    expect(failures).toEqual([]);
  });

  it("EU: the same suffix after the root in solfege", () => {
    const failures = [];
    BRICKS.forEach((brick) => {
      const key = { rootValue: brick.rootValue, scaleKey: brick.scaleKey };
      QUICK_STARTS.forEach((quickStart) => {
        const progression = quickStartProgression(quickStart, key, { classicCadence: true });
        generateChordsFromNNS(key.rootValue, key.scaleKey, progression).forEach((chord) => {
          const root = NOTES[chord.rootNote.value];
          const suffix = suffixOf(chord.chordNameUS, root.us);
          if (chord.chordNameEU !== `${root.eu}${suffix}`) failures.push(`${chord.chordNameUS} / ${chord.chordNameEU}`);
        });
      });
    });
    expect(failures).toEqual([]);
  });

  it("every chord type the symbols can name has a name of its own (none is shown as another)", () => {
    const written = { chord_major: "1", chord_minor: "1-", chord_dim: "1°", chord_aug: "1+", chord_7: "17", chord_maj7: "1maj7", chord_m7: "1-7", chord_m7b5: "1m7b5", chord_dim7: "1dim7", chord_9: "19", chord_m9: "1m9", chord_add9: "1add9", chord_sus2: "1sus2", chord_sus4: "1sus4" };
    const names = Object.entries(written).map(([type, nns]) => [type, generateChordsFromNNS(0, "scale_major", [nns])[0].chordNameUS]);
    expect(Object.fromEntries(names)).toEqual({
      chord_major: "C", chord_minor: "Cm", chord_dim: "Cdim", chord_aug: "Caug", chord_7: "C7", chord_maj7: "Cmaj7", chord_m7: "Cm7", chord_m7b5: "Cm7b5", chord_dim7: "Cdim7", chord_9: "C9", chord_m9: "Cm9", chord_add9: "Cadd9", chord_sus2: "Csus2", chord_sus4: "Csus4",
    });
    expect(new Set(names.map(([, name]) => name)).size).toBe(14);
  });
});

describe("VMU-169 — a chord of the document is named by the same rule (describeChord)", () => {
  const key = E_PHRYGIAN;

  it("a chord that carries its label is named as the Studio names it", () => {
    const [shown] = studioChords(key, "jazz_251_maj", {});
    const described = describeChord(key, { rootPc: 5, type: "chord_maj7", durationSteps: 16, nns: "2Maj7" });
    expect([described.chordNameUS, described.chordNameEU]).toEqual(["Fmaj7", "Famaj7"]);
    expect([shown.chordNameUS, shown.chordNameEU]).toEqual([described.chordNameUS, described.chordNameEU]);
  });

  it("a chord with no label of its own (edited, or set by hand) keeps its type in the name", () => {
    const names = (chord) => {
      const described = describeChord(key, { durationSteps: 16, ...chord });
      return [described.chordNameUS, described.chordNameEU];
    };
    expect(names({ rootPc: 5, type: "chord_maj7" })).toEqual(["Fmaj7", "Famaj7"]);
    expect(names({ rootPc: 11, type: "chord_m7b5" })).toEqual(["Bm7b5", "Sim7b5"]);
    expect(names({ rootPc: 11, type: "chord_7" })).toEqual(["B7", "Si7"]);
    expect(names({ rootPc: 4, type: "chord_m7" })).toEqual(["Em7", "Mim7"]);
    expect(names({ rootPc: 9, type: "chord_sus4" })).toEqual(["Asus4", "Lasus4"]);
  });

  it("a chord that is its own label's chord stays named as before for the triads (no regression on C, Cm, Cdim)", () => {
    const names = (type) => {
      const described = describeChord({ rootValue: 0, scaleKey: "scale_major" }, { rootPc: 0, type, durationSteps: 16 });
      return [described.chordNameUS, described.chordNameEU];
    };
    expect(names("chord_major")).toEqual(["C", "Do"]);
    expect(names("chord_minor")).toEqual(["Cm", "Dom"]);
    expect(names("chord_dim")).toEqual(["Cdim", "Dodim"]);
  });
});
