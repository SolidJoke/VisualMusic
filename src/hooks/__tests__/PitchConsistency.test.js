import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// UI callbacks scheduled through Tone.getDraw run immediately, so the values
// handed to the display can be read synchronously and compared with what was
// sent to the synth.
vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: (fn) => fn() })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));

vi.mock("../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));

import * as AudioEngine from "../../audio/AudioEngine";
import { useDictionaryPlayback } from "../useDictionaryPlayback";
import { useStudioPlayback } from "../useStudioPlayback";
import { useFretboardPlayback } from "../useFretboardPlayback";
import { getAbsoluteNoteValue } from "../../core/theory";

/**
 * What you hear must be what you see.
 *
 * Gabriel reported that the piano played different notes from the ones it
 * showed. Measured on 2026-09-10: dictionary chords and scales sounded exactly
 * one octave above the highlighted keys. Values were in MIDI (C4 = 60) but nine
 * sites turned them into note names with Math.floor(midi / 12), dropping the
 * `- 1`, so 60 was played as "C5". Two tests in this repository asserted that
 * very disagreement and passed.
 *
 * Each test below checks two things: an invariant — every note name sent to the
 * synth is the MIDI value handed to the display — and an anchor on the octave
 * itself, because an invariant alone would pass if both channels were wrong in
 * the same direction.
 */

const midi = (name) => getAbsoluteNoteValue(name);
const valueOf = (p) => (typeof p === "object" && p !== null ? p.absoluteValue : p);

/** Every note name the synth received, in order. */
const sentToSynth = () =>
  AudioEngine.playDictionaryNote.mock.calls.flatMap((c) => (Array.isArray(c[1]) ? c[1] : [c[1]]));

/** Every MIDI value handed to a display setter, in order, ignoring clears. */
const shownOn = (setter) =>
  setter.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0)
    .flatMap((a) => a.map(valueOf));

let scheduler;
let setCurrentlyPlayingNotes;

beforeEach(() => {
  vi.clearAllMocks();
  setCurrentlyPlayingNotes = vi.fn();
  scheduler = {
    ensureAudioReady: vi.fn(() => Promise.resolve()),
    startPlaybackSession: vi.fn(() => 1),
    isCurrentSession: vi.fn(() => true),
  };
});

// Standard tuning, indexed high to low as useFretboardPlayback builds it.
// Open C chord x32010 in the V2 shape useMusicEngine exposes to the app.
const OPEN_C_V2 = {
  0: { fret: 0, status: "open" }, // E4 → E4 (64)
  1: { fret: 1, status: "played" }, // B3 + 1 → C4 (60)
  2: { fret: 0, status: "open" }, // G3 → G3 (55)
  3: { fret: 2, status: "played" }, // D3 + 2 → E3 (52)
  4: { fret: 3, status: "played" }, // A2 + 3 → C3 (48)
  5: { fret: -1, status: "muted" }, // low E not played
};

// C major, position 3 of 5, as getAvailableScaleFingerings returns it.
const C_MAJOR_BOX = [
  { stringIndex: 5, fret: 8 }, { stringIndex: 4, fret: 5 }, { stringIndex: 4, fret: 7 },
  { stringIndex: 4, fret: 8 }, { stringIndex: 3, fret: 5 }, { stringIndex: 3, fret: 7 },
  { stringIndex: 2, fret: 4 }, { stringIndex: 2, fret: 5 },
];

function renderDictionary(overrides) {
  return renderHook(() =>
    useDictionaryPlayback({
      dictRoot: "0",
      dictType: "chord_major",
      dictOctave: 0,
      playbackInstrument: "piano",
      guitarFingering: null,
      bassFingering: null,
      activeBrick: null,
      activeNotes: [],
      chordOctaveOffset: 0,
      currentBpm: 120,
      lastClickedContext: null,
      setCurrentlyPlayingNotes,
      scheduler,
      ...overrides,
    })
  );
}

async function play(result) {
  await act(async () => {
    await result.current.playDictionaryAudio();
  });
}

describe("Dictionnaire — ce qu'on entend est ce qu'on voit", () => {
  it("piano, accord de do : joué en do4, là où il est affiché", async () => {
    const { result } = renderDictionary({ dictType: "chord_major" });
    await play(result);

    expect(sentToSynth()).toEqual(["C4", "E4", "G4"]);
    expect(sentToSynth().map(midi)).toEqual(shownOn(setCurrentlyPlayingNotes));
  });

  it("piano, gamme de do majeur : monte de do4 à do5, comme les touches affichées", async () => {
    const { result } = renderDictionary({ dictType: "scale_major" });
    await play(result);

    const names = sentToSynth();
    expect(names.slice(0, 8)).toEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]);
    expect(names.map(midi)).toEqual(shownOn(setCurrentlyPlayingNotes));
  });

  it("piano, note seule : jouée à la hauteur affichée, octave comprise", async () => {
    const { result: atC4 } = renderDictionary({
      dictType: "single_note",
      activeNotes: [{ value: 0, absoluteValue: 60 }],
    });
    await play(atC4);
    expect(sentToSynth()).toEqual(["C4"]);

    vi.clearAllMocks();
    const { result: atC5 } = renderDictionary({
      dictType: "single_note",
      activeNotes: [{ value: 0, absoluteValue: 72 }],
    });
    await play(atC5);
    // Played `pitch class + 4 * 12` regardless of the octave shown.
    expect(sentToSynth()).toEqual(["C5"]);
  });

  it("guitare, accord de do ouvert : les vraies hauteurs de l'instrument, sans planter", async () => {
    const { result } = renderDictionary({
      dictType: "chord_major",
      playbackInstrument: "guitar",
      guitarFingering: { fingeringMap: OPEN_C_V2 },
    });
    await play(result);

    // x32010 on a guitar sounds C3 E3 G3 C4 E4.
    expect(sentToSynth()).toEqual(["C3", "E3", "G3", "C4", "E4"]);
    expect(sentToSynth().map(midi)).toEqual(shownOn(setCurrentlyPlayingNotes));
  });

  it("guitare, gamme en position : jouée à la hauteur des cases affichées", async () => {
    const { result } = renderDictionary({
      dictType: "scale_major",
      playbackInstrument: "guitar",
      guitarFingering: { scaleFrets: C_MAJOR_BOX, isScaleMode: true },
    });
    await play(result);

    const names = sentToSynth();
    // Low E fret 8 is C3; G string fret 5 is C4.
    expect(names[0]).toBe("C3");
    expect(names.slice(0, 8)).toEqual(["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"]);
    expect(names.map(midi)).toEqual(shownOn(setCurrentlyPlayingNotes));
  });
});

describe("Studio — clic sur un accord de la progression", () => {
  function renderStudio(overrides) {
    const setCurrentAbsoluteNotes = vi.fn();
    const hook = renderHook(() =>
      useStudioPlayback({
        playbackInstrument: "piano",
        selectedRootStringGuitar: null,
        selectedRootStringBass: null,
        activeBrick: null,
        chordOctaveOffset: 0,
        currentAbsoluteNotes: [],
        setCurrentAbsoluteNotes,
        setCurrentlyPlayingNotes,
        setClickedChord: vi.fn(),
        scheduler,
        useShellVoicings: false,
        ...overrides,
      })
    );
    return { ...hook, setCurrentAbsoluteNotes };
  }

  const C_CHORD = { rootNote: { value: 0 }, nns: "1" };

  it("l'accord affiché et l'accord entendu sont le même do4", async () => {
    const { result, setCurrentAbsoluteNotes } = renderStudio();
    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(sentToSynth()).toEqual(["C4", "E4", "G4"]);
    // Displayed at MIDI 48 (C3) while heard as C4, because getClosestInversionN
    // still targeted 48 — C4 in the pre-MIDI convention.
    expect(shownOn(setCurrentAbsoluteNotes)).toEqual([60, 64, 67]);
  });

  it("reste audible en notation européenne", async () => {
    // "Do4" is NaN to Tone.Frequency, and playDictionaryNote silently drops
    // anything it cannot read — Studio chords were mute in EU notation.
    const { result } = renderStudio({ notation: "eu" });
    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(sentToSynth()).toEqual(["C4", "E4", "G4"]);
  });
});

describe("Manche — clic sur la fondamentale en mode gamme", () => {
  it("la gamme part de la note cliquée, pas une octave au-dessus", async () => {
    const { result } = renderHook(() =>
      useFretboardPlayback({
        playbackInstrument: "piano",
        setPlaybackInstrument: vi.fn(),
        appMode: "dictionary",
        dictRoot: "0",
        dictType: "scale_major",
        activeNotes: [{ value: 0 }],
        guitarFingering: null,
        bassFingering: null,
        activeBrick: null,
        currentBpm: 120,
        lastClickedContext: null,
        setCurrentlyPlayingNotes,
        setContextualScaleAbsoluteValues: vi.fn(),
        setLastClickedContext: vi.fn(),
        setSinglePlayContext: vi.fn(),
        setScaleAnchor: vi.fn(),
        scheduler,
      })
    );

    await act(async () => {
      await result.current.playSingleNote("C4");
    });

    const names = sentToSynth();
    expect(names[0]).toBe("C4");
    expect(names.map(midi)).toEqual(shownOn(setCurrentlyPlayingNotes));
  });
});
