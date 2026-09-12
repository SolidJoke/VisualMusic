/**
 * VMU-003 / VMU-103 / VMU-104 — what is heard must be what is shown.
 *
 * The Dictionary computed pitches twice, from two unrelated places:
 *
 *   display  — `useMusicEngine.activeNotes`, fed by `useDictionaryMode`, which
 *              folds every chord tone into a single octave
 *              (`(root + semitone) % 12 + (octave + 1) * 12`);
 *   playback — `useDictionaryPlayback`, which, when the instrument is a guitar
 *              or a bass *and* a fingering exists, derives pitches from the
 *              positions on the neck — a real voicing spanning two octaves.
 *
 * Two sources, two truths, and a symptom that looked incoherent because the gap
 * went in different directions depending on the mode: the keyboard lit
 * C4-E4-G4 while the guitar sounded C3-E3-G3-C4-E4, and a scale box played an
 * exact octave below the highlighted scale.
 *
 * This file asserts the **invariant**, not values: the set of pitches the
 * animation lights up equals the set the synth is asked to play. It is wired
 * through the real hooks in the real order — `useDictionaryMode` →
 * `useMusicEngine` → `useDictionaryPlayback` — which is what AppDesktop does,
 * so no fingering is invented here and nothing bypasses the engine.
 *
 * The hardcoded pitch values live in `core/__tests__/realization.test.js`
 * instead, on the pure module, where they are derived from the domain (middle C
 * = C4 = MIDI 60). Splitting them matters: an invariant alone passes when both
 * channels are wrong together — precisely how three tests certified the octave
 * defect fixed in #100 — and fixed values alone say nothing about agreement.
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// The scale branch paints each step through `Tone.getDraw().schedule(cb)`. A
// no-op mock makes this test measure an empty animation and fail for the wrong
// reason — it did, on the first run: the scale case reported [] played against
// 8 highlighted. Run the callbacks synchronously so what is asserted is the
// pitches, not the scheduler.
vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: (cb) => cb() })),
  Transport: { scheduleOnce: (cb) => cb(0) },
}));

vi.mock("../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));

import { useDictionaryPlayback } from "../useDictionaryPlayback";
import { useDictionaryMode } from "../useDictionaryMode";
import { useMusicEngine } from "../useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { TUNINGS } from "../../core/tunings";

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

const activeBrick = {
  guitarStrings: TUNINGS.GUITAR_STANDARD,
  bassStrings: TUNINGS.BASS_STANDARD,
  rootValue: 0,
  scaleKey: "scale_major",
};

/** Every distinct MIDI value the animation lit up across the whole playback. */
function playedPitches(calls) {
  const all = new Set();
  for (const [notes] of calls) {
    for (const n of notes ?? []) {
      all.add(typeof n === "object" && n !== null ? n.absoluteValue : n);
    }
  }
  all.delete(undefined);
  return [...all].sort((a, b) => a - b);
}

/** Every distinct MIDI value shown as highlighted. */
function displayedPitches(activeNotes) {
  return [...new Set((activeNotes ?? []).map((n) => n.absoluteValue))].sort(
    (a, b) => a - b
  );
}

/**
 * Runs the real chain for one selection and returns both sides of the
 * invariant. Mirrors AppDesktop: selection → engine → playback.
 */
async function runSelection({ root, type, octave, instrument }) {
  const setCurrentlyPlayingNotes = vi.fn();
  const scheduler = {
    ensureAudioReady: vi.fn(() => Promise.resolve()),
    startPlaybackSession: vi.fn(() => 42),
    isCurrentSession: vi.fn(() => true),
  };

  const dict = renderHook(() => useDictionaryMode(), { wrapper });
  act(() => {
    dict.result.current.setDictRoot(root);
    dict.result.current.setDictType(type);
    dict.result.current.setDictOctave(octave);
  });

  const engine = renderHook(
    () =>
      useMusicEngine({
        appMode: "dictionary",
        activeBrick,
        clickedChord: null,
        currentAbsoluteNotes: [],
        chordOctaveOffset: 0,
        displayMode: "chord",
        visualFocus: "guitar",
        selectedRootStringGuitar: null,
        selectedRootStringBass: null,
        selectedVoicingIndexGuitar: null,
        selectedVoicingIndexBass: null,
        dictRoot: root,
        dictType: type,
        dictActiveNotes: dict.result.current.activeNotes,
        dictOctave: octave,
        fingeringMode: "numbers",
        notation: "EN",
        playbackInstrument: instrument,
      }),
    { wrapper }
  );

  const playback = renderHook(() =>
    useDictionaryPlayback({
      dictRoot: root,
      dictType: type,
      dictOctave: octave,
      chordOctaveOffset: 0,
      playbackInstrument: instrument,
      guitarFingering: engine.result.current.guitarFingering,
      bassFingering: engine.result.current.bassFingering,
      activeBrick,
      activeNotes: engine.result.current.activeNotes,
      currentBpm: 120,
      lastClickedContext: null,
      setCurrentlyPlayingNotes,
      scheduler,
    })
  );

  await act(async () => {
    await playback.result.current.playDictionaryAudio();
  });

  return {
    played: playedPitches(setCurrentlyPlayingNotes.mock.calls),
    displayed: displayedPitches(engine.result.current.activeNotes),
    notes: engine.result.current.activeNotes ?? [],
    source: engine.result.current.realizationSource,
  };
}

describe("VMU-003 — played pitches and highlighted pitches are the same set", () => {
  beforeEach(() => vi.clearAllMocks());

  const cases = [];
  for (const instrument of ["piano", "guitar", "bass"]) {
    for (const type of ["chord_major", "chord_m7", "scale_major"]) {
      for (const octave of [-1, 0, 1]) {
        cases.push({ instrument, type, octave, root: 0 });
      }
    }
  }

  it.each(cases)(
    "$instrument · $type · octave $octave",
    async ({ instrument, type, octave, root }) => {
      const { played, displayed, source, notes } = await runSelection({
        root,
        type,
        octave,
        instrument,
      });
      // Both non-empty: an empty-vs-empty comparison would pass while nothing
      // is played and nothing is lit.
      expect(displayed.length).toBeGreaterThan(0);
      expect(played.length).toBeGreaterThan(0);
      expect(played).toEqual(displayed);

      // Equality alone stopped measuring once playback started reading
      // `activeNotes`: revert the display to the theoretical notes and both
      // sides move together, so the sets still match. Verified by breaking it.
      // What pins the display to the realization is the positions: a note that
      // came from a grip knows which string and fret produce it, a theoretical
      // one does not.
      if (source === "fingering") {
        expect(notes.every((n) => Number.isFinite(n.stringIndex) && Number.isFinite(n.fret))).toBe(true);
      }
    }
  );
});
