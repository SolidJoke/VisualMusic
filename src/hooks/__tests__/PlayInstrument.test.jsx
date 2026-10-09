/**
 * INST-A2 — playInstrument(id): one play button per instrument plays THAT
 * instrument's realization, now.
 *
 * The tile buttons of the instrument bar used to select an instrument and play
 * it on the NEXT render (hooks/useSelectThenPlay.js), because
 * `playDictionaryAudio` closed over `playbackInstrument`: called in the same
 * event as the setter, it was still the previous render's callback and played
 * the previous instrument. Gabriel (2026-10-05): "there is no button left to
 * start playback for the piano, the guitar or the bass specifically" — the
 * prototype A' has no per-instrument play at all, and the column heads it is
 * getting need a function they can call without waiting for a render.
 *
 * These tests chain the REAL hooks in the order AppDesktop does —
 * useDictionaryMode -> useMusicEngine -> useDictionaryPlayback — so the
 * realizations are the app's own, not fixtures. What they pin:
 *
 *  1. For every instrument and every family (note, chord, scale), the pitches
 *     sent to the synth are exactly `realizationsByInstrument[id]`, and the
 *     synth is asked to play `id`.
 *  2. That holds with the selection setter INERT and the hook's props stale
 *     (still naming another instrument): the sound depends on the id given, not
 *     on a re-render. A naive `setPlaybackInstrument(id); playDictionaryAudio()`
 *     fails here for every instrument but the one already selected.
 *  3. Playing an instrument makes it the instrument of the big play button
 *     ("last instrument touched"), as the tile did before.
 *
 * Expected values are domain values, never copied from what the code returned:
 * middle C is C4 = MIDI 60; an open C chord on a guitar (x32010) sounds
 * C3 E3 G3 C4 E4 = 48 52 55 60 64; the bass plays a root, a fifth and an octave
 * from its A string: C2 G2 C3 = 36 43 48 (the synth is monophonic and sounds
 * only the lowest — that is a separate question, left to the ear).
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";

// Tone's draw callbacks run at once, so the animation can be read synchronously.
vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: (cb) => cb() })),
  Transport: { scheduleOnce: (cb) => cb(0) },
}));

vi.mock("../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));

import * as AudioEngine from "../../audio/AudioEngine";
import { useDictionaryPlayback } from "../useDictionaryPlayback";
import { useDictionaryMode } from "../useDictionaryMode";
import { useMusicEngine } from "../useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { TUNINGS } from "../../core/tunings";
import { getAbsoluteNoteValue } from "../../core/theory";

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

const activeBrick = {
  guitarStrings: TUNINGS.GUITAR_STANDARD,
  bassStrings: TUNINGS.BASS_STANDARD,
  rootValue: 0,
  scaleKey: "scale_major",
};

const INSTRUMENTS = ["piano", "guitar", "bass"];

/** An instrument other than `id`, to leave selected while `id` is asked for. */
const OTHER = { piano: "guitar", guitar: "bass", bass: "piano" };

/**
 * The selections, with what the domain says about each. `anchors` are fixed
 * pitches (MIDI); `pitchClasses` is what every pitch must belong to, whatever
 * position or octave the instrument chooses.
 */
const SELECTIONS = [
  {
    label: "note: Do",
    family: "note",
    root: 0,
    type: "single_note",
    anchors: { piano: [60], guitar: [60], bass: [60] },
    pitchClasses: [0],
  },
  {
    label: "chord: Do majeur",
    family: "chord",
    root: 0,
    type: "chord_major",
    anchors: { piano: [60, 64, 67], guitar: [48, 52, 55, 60, 64], bass: [36, 43, 48] },
    pitchClasses: [0, 4, 7],
  },
  {
    label: "chord: Sol#m7",
    family: "chord",
    root: 8,
    type: "chord_m7",
    // G#4 B4 D#5 F#5. The two fretted instruments choose their own grip.
    anchors: { piano: [68, 71, 75, 78] },
    pitchClasses: [8, 11, 3, 6],
  },
  {
    label: "scale: Do majeur",
    family: "scale",
    root: 0,
    type: "scale_major",
    // The sequence goes up then back down, so the anchor is the set of pitches.
    anchors: { piano: [60, 62, 64, 65, 67, 69, 71, 72] },
    pitchClasses: [0, 2, 4, 5, 7, 9, 11],
  },
];

let scheduler;
let setCurrentlyPlayingNotes;

beforeEach(() => {
  vi.clearAllMocks();
  setCurrentlyPlayingNotes = vi.fn();
  scheduler = {
    ensureAudioReady: vi.fn(() => Promise.resolve()),
    startPlaybackSession: vi.fn(() => 42),
    isCurrentSession: vi.fn(() => true),
  };
});

/**
 * Mirrors AppDesktop's wiring for the Dictionary. `frozenSetter`, when given,
 * replaces the state setter: the selection never changes and nothing re-renders
 * because of it.
 */
function useDictionarySession(initialInstrument, frozenSetter) {
  const dict = useDictionaryMode();
  const [playbackInstrument, setPlaybackInstrumentState] = useState(initialInstrument);
  const setPlaybackInstrument = frozenSetter ?? setPlaybackInstrumentState;

  const engine = useMusicEngine({
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: dict.selectedRootStringGuitar,
    selectedRootStringBass: dict.selectedRootStringBass,
    selectedVoicingIndexGuitar: dict.selectedVoicingIndexGuitar,
    selectedVoicingIndexBass: dict.selectedVoicingIndexBass,
    dictRoot: dict.dictRoot,
    dictType: dict.dictType,
    dictActiveNotes: dict.activeNotes,
    dictOctave: dict.dictOctave,
    notation: "EN",
    playbackInstrument,
  });

  const playback = useDictionaryPlayback({
    dictRoot: dict.dictRoot,
    dictType: dict.dictType,
    dictOctave: dict.dictOctave,
    playbackInstrument,
    setPlaybackInstrument,
    guitarFingering: engine.guitarFingering,
    bassFingering: engine.bassFingering,
    activeBrick,
    activeNotes: engine.activeNotes,
    realizationsByInstrument: engine.realizationsByInstrument,
    currentBpm: 120,
    lastClickedContext: null,
    setCurrentlyPlayingNotes,
    scheduler,
  });

  return { dict, engine, playback, playbackInstrument };
}

function mount({ root, type, initial, frozen = false }) {
  const setter = frozen ? vi.fn() : undefined;
  const hook = renderHook(() => useDictionarySession(initial, setter), { wrapper });
  act(() => {
    hook.result.current.dict.setDictRoot(root);
    hook.result.current.dict.setDictType(type);
  });
  return { hook, setter };
}

const pitchesOf = (notes) =>
  (notes ?? []).map((n) => (typeof n === "object" && n !== null ? n.absoluteValue : n));
const unique = (list) => [...new Set(list)].sort((a, b) => a - b);

/** Every call the synth received: [instrument, notes, duration, time]. */
const synthCalls = () => AudioEngine.playDictionaryNote.mock.calls;
/** Every note name the synth received, in order, as MIDI values. */
const sentPitches = () =>
  synthCalls()
    .flatMap((c) => (Array.isArray(c[1]) ? c[1] : [c[1]]))
    .map((name) => getAbsoluteNoteValue(name));

describe("INST-A2 — playInstrument(id) plays the realization of that instrument, now", () => {
  describe.each(SELECTIONS)("$label", (selection) => {
    it.each(INSTRUMENTS)(
      "%s: exactly its own realization, with the selection setter inert and the props stale",
      async (id) => {
        const stale = OTHER[id];
        const { hook, setter } = mount({ ...selection, initial: stale, frozen: true });
        const realizations = hook.result.current.engine.realizationsByInstrument;
        const expected = pitchesOf(realizations[id]);

        // The test must be able to tell the instruments apart where they differ,
        // or it would pass for the wrong instrument too.
        expect(expected.length).toBeGreaterThan(0);
        if (selection.family !== "note") {
          expect(unique(pitchesOf(realizations[stale]))).not.toEqual(unique(expected));
        }
        // Domain anchor, so the realization itself is pinned and not only
        // compared with itself.
        if (selection.anchors[id]) expect(unique(expected)).toEqual(selection.anchors[id]);
        expect(expected.every((p) => selection.pitchClasses.includes(p % 12))).toBe(true);

        await act(async () => {
          await hook.result.current.playback.playInstrument(id);
        });

        expect(synthCalls().length).toBeGreaterThan(0);
        // The synth is asked to play the instrument requested, every time.
        expect(synthCalls().every((c) => c[0] === id)).toBe(true);
        if (selection.family === "scale") {
          // Up, then back down: the set is the realization.
          expect(unique(sentPitches())).toEqual(unique(expected));
        } else {
          expect(sentPitches()).toEqual(expected);
        }
        // The tile selects what it plays.
        expect(setter).toHaveBeenCalledWith(id);
        // The animation lights what was played.
        const lit = unique(
          setCurrentlyPlayingNotes.mock.calls.flatMap((c) => pitchesOf(c[0]))
        );
        expect(lit).toEqual(unique(expected));
      }
    );
  });

  it("the sound is out before the next task: nothing waits for a render", async () => {
    const { hook } = mount({ root: 0, type: "chord_major", initial: "piano", frozen: true });

    const done = hook.result.current.playback.playInstrument("guitar");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(synthCalls()).toHaveLength(1);
    expect(synthCalls()[0][0]).toBe("guitar");
    await done;
  });

  it("asking for the instrument already selected plays it as before", async () => {
    const { hook } = mount({ root: 0, type: "chord_major", initial: "bass" });

    await act(async () => {
      await hook.result.current.playback.playInstrument("bass");
    });

    expect(synthCalls()).toHaveLength(1);
    expect(synthCalls()[0][0]).toBe("bass");
    expect(sentPitches()).toEqual([36, 43, 48]);
    expect(hook.result.current.playbackInstrument).toBe("bass");
  });
});

describe("INST-A2 — the big play button plays the last instrument touched", () => {
  it("piano selected, the guitar play is pressed: the big play then plays the guitar", async () => {
    const { hook } = mount({ root: 0, type: "chord_major", initial: "piano" });

    await act(async () => {
      await hook.result.current.playback.playInstrument("guitar");
    });
    expect(hook.result.current.playbackInstrument).toBe("guitar");
    expect(sentPitches()).toEqual([48, 52, 55, 60, 64]);

    AudioEngine.playDictionaryNote.mockClear();
    await act(async () => {
      await hook.result.current.playback.playDictionaryAudio();
    });

    expect(synthCalls()).toHaveLength(1);
    expect(synthCalls()[0][0]).toBe("guitar");
    expect(sentPitches()).toEqual([48, 52, 55, 60, 64]);
  });

  it("the last of several plays wins: guitar, then bass, then the big play is the bass", async () => {
    const { hook } = mount({ root: 0, type: "chord_major", initial: "piano" });

    await act(async () => {
      await hook.result.current.playback.playInstrument("guitar");
    });
    await act(async () => {
      await hook.result.current.playback.playInstrument("bass");
    });
    expect(hook.result.current.playbackInstrument).toBe("bass");

    AudioEngine.playDictionaryNote.mockClear();
    await act(async () => {
      await hook.result.current.playback.playDictionaryAudio();
    });

    expect(synthCalls()).toHaveLength(1);
    expect(synthCalls()[0][0]).toBe("bass");
    expect(sentPitches()).toEqual([36, 43, 48]);
  });

  it("the big play, called with no argument, still plays the selected instrument", async () => {
    const { hook } = mount({ root: 0, type: "chord_major", initial: "guitar", frozen: true });

    await act(async () => {
      await hook.result.current.playback.playDictionaryAudio();
    });

    expect(synthCalls()[0][0]).toBe("guitar");
    expect(sentPitches()).toEqual([48, 52, 55, 60, 64]);
  });

  it("playDictionaryAudio(id) plays that instrument without touching the selection", async () => {
    const { hook, setter } = mount({ root: 0, type: "chord_major", initial: "piano", frozen: true });

    await act(async () => {
      await hook.result.current.playback.playDictionaryAudio("bass");
    });

    expect(synthCalls()[0][0]).toBe("bass");
    expect(sentPitches()).toEqual([36, 43, 48]);
    expect(setter).not.toHaveBeenCalled();
  });

  it("an event handed to playDictionaryAudio is not an instrument: the selected one plays", async () => {
    // `onClick={playDictionaryAudio}` would pass the click event as the argument.
    const { hook } = mount({ root: 0, type: "chord_major", initial: "guitar", frozen: true });

    await act(async () => {
      await hook.result.current.playback.playDictionaryAudio({ type: "click" });
    });

    expect(synthCalls()[0][0]).toBe("guitar");
    expect(sentPitches()).toEqual([48, 52, 55, 60, 64]);
  });
});
