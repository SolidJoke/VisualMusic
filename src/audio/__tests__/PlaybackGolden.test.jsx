import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { BRICKS, THEMES, SPECIAL_CASES, studioState } from "./goldenCases";

/**
 * T1 golden — what the playback loop triggers, call for call (entry of
 * VMU-116).
 *
 * T1 moves the "what plays on this step" decision out of useSequencer's
 * `repeat` callback into one pure function (src/audio/dispatch.js) that the
 * loop then translates into Tone calls. jsdom has no Web Audio, so "nothing
 * audible changed" is proven here at the one boundary a test can observe:
 * every call the loop makes on the synths, with every argument, in order —
 * plus the two things it publishes to React (the notes lit on screen, the
 * chord of the measure). The real sound is `npm run audio:check`'s job.
 *
 * Tone and AudioEngine are replaced by recorders (same capture of the
 * Transport callback as SequencerPlayingChord.test.jsx); the loop is driven
 * by hand for the 64 steps of the 4-measure loop, at 0.125 s per step. Each
 * case's full journal is fingerprinted (SHA-256 of its JSON) and counted,
 * **frozen from `main` at d277303, before the move**.
 *
 * If a fingerprint here ever has to change, that is a behaviour change of
 * playback, not a refactor: its own ticket, its own review.
 */

const rec = vi.hoisted(() => ({ repeat: null, log: [] }));

vi.mock("tone", () => ({
  start: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 0),
  context: { lookAhead: 0.1 },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn((cb) => {
      rec.repeat = cb;
      return 1;
    }),
    clear: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  Draw: { schedule: (fn) => fn() },
  Destination: { volume: { value: 0, rampTo: vi.fn() } },
}));

vi.mock("../AudioEngine", () => {
  // Every argument, as passed: a refactor that adds, drops or reorders one
  // shows up in the journal even when the sound would be the same.
  const recorder = (name) => (...args) => rec.log.push({ call: name, args });
  return {
    kickSynth: { triggerAttackRelease: recorder("kickSynth") },
    snareSynth: { triggerAttackRelease: recorder("snareSynth") },
    hatSynth: { triggerAttackRelease: recorder("hatSynth") },
    bassSynth: { triggerAttackRelease: recorder("bassSynth"), triggerRelease: vi.fn() },
    playDictionaryNote: recorder("playDictionaryNote"),
    initPianoSampler: vi.fn(),
    initGuitarSampler: vi.fn(),
    applyGenrePreset: vi.fn(),
    setInstrumentVolume: vi.fn(),
    getPianoSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
    getGuitarSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
  };
});

import { useSequencer } from "../useSequencer";

const STEP_SECONDS = 0.125;
const LOOP_STEPS = 64;

/** Drives the real hook's loop for 64 steps and returns its journal. */
async function playbackJournal(state) {
  rec.log = [];
  rec.repeat = null;
  const setCurrentlyPlayingNotes = (notes) => rec.log.push({ call: "setCurrentlyPlayingNotes", args: [notes] });
  const { result, unmount } = renderHook(() =>
    useSequencer({
      appMode: "studio",
      activeBrick: state.brick,
      activeDrums: state.drums,
      activeMelody: state.melody,
      activeProgression: state.progression,
      activeRhythm: state.rhythm,
      currentRootValue: state.rootValue,
      setCurrentlyPlayingNotes,
      chordOctaveOffset: state.octaveOffset,
    }),
  );
  await act(async () => {
    await result.current.togglePlayback();
  });
  expect(rec.repeat).toBeTypeOf("function");
  rec.log = [];

  let published = result.current.currentPlayingChord;
  for (let step = 0; step < LOOP_STEPS; step++) {
    act(() => {
      rec.repeat(step * STEP_SECONDS);
    });
    if (result.current.currentPlayingChord !== published) {
      published = result.current.currentPlayingChord;
      rec.log.push({ call: "currentPlayingChord", args: [published] });
    }
  }
  unmount();
  return rec.log;
}

function fingerprint(journal) {
  return createHash("sha256").update(JSON.stringify(journal)).digest("hex");
}

// Styles of different genres (expert, funk with its own chordRhythm,
// electronic, metal, reggae with its own chordRhythm, urban, locrian metal
// with diminished chords, pop, jazz), each in both themes.
const SAMPLE_STYLES = [0, 3, 5, 7, 8, 10, 16, 18, 21];

function allCases() {
  const cases = [];
  SAMPLE_STYLES.forEach((index) => {
    THEMES.forEach((theme) => {
      cases.push([`${index}:${theme} ${BRICKS[index].name.en}`, () => studioState(index, theme)]);
    });
  });
  Object.entries(SPECIAL_CASES).forEach(([name, build]) => cases.push([name, build]));
  // Playback only: with no progression there is no measure chord, and every
  // melodic track falls back to the tonic of the sequencer's root. (Export
  // has no such path: exportChords writes an empty track and exportBass
  // throws on an empty progression — see the T1 report.)
  cases.push(["empty-progression", () => studioState(0, "A", { progression: [], rootValue: 3 })]);
  return cases;
}

// Frozen from main at d277303 (before T1). [SHA-256 of the journal, entries].
const GOLDEN = {
  "0:A Modern Pop (4 Chords)": ["6be9416391e81a5c1d7211524766da21b42356a8e6dfc112c7d1f5f3afc643ae", 120],
  "0:B Modern Pop (4 Chords)": ["6be9416391e81a5c1d7211524766da21b42356a8e6dfc112c7d1f5f3afc643ae", 120],
  "3:A Funk/Disco Loop": ["759d1dd7a9824b5df4110f2f9e3cb0bb86eaebc81f76b29d0f2093d7277a1658", 176],
  "3:B Funk/Disco Loop": ["759d1dd7a9824b5df4110f2f9e3cb0bb86eaebc81f76b29d0f2093d7277a1658", 176],
  "5:A Euphoric Techno": ["51eede655841a0f3492df7506b96e8d42a2fb61f263de17caf5ce886a9d95081", 244],
  "5:B Euphoric Techno": ["917719def04a8e3fc28f06c91eccf26265d20c82aeaeb3551294b4fa11916de5", 156],
  "7:A Epic Metal": ["61cd36fe87e685bda2eb291c657e0acf0de78c4f9eb78f6fb94aaff73382ad89", 204],
  "7:B Epic Metal": ["3c6b47b25ca28eec7e92600933af9725a104938bf715a00b94056215095ecb4f", 180],
  "8:A Joyful Reggae": ["d404a02a04a249459b465cbd59a231f3e4d40bf7fae476d27165c685b2bc9260", 140],
  "8:B Joyful Reggae": ["55dadc58709e6bb08e78c260c5b1bc5204e11fc4214faf0ba393293ce7591f7a", 124],
  "10:A Oldschool Boom Bap": ["bc62d04c94340c2ab91f0e34535487a88a7a9ccabc2e2a501d0f048c6c9462db", 132],
  "10:B Oldschool Boom Bap": ["d4cb46e33f619f8438e73aa455d4c903c65489199a76c3289c62719ef52fcfd0", 132],
  "16:A Groove Metal": ["2c80ed79b721e1b5a1d9b5e027c24d1f0b0be53c8cc098e541e77b136ced6763", 160],
  "16:B Groove Metal": ["7407c6d1a0850f854444ea66868469a6960f151db16bdab52667e0d7fb5f47a7", 156],
  "18:A Modern Pop (Ballad)": ["f5083d83597c47dda500f1f28053fb0859c9304867857e596fb6b24ba3ae2669", 108],
  "18:B Modern Pop (Ballad)": ["5711eb71c977bd4b06e285ec402fd4b71a02980d668f1ed35042c7d053f865be", 124],
  "21:A Bossa Nova": ["9d18a106fd3e2407dd3c9deb6a09c8235ca9324e2e809eef2161db9aff440417", 124],
  "21:B Bossa Nova": ["d3f1b77420844ebf1becabafb0da5ac3644a129b50599c4b0dc5d1ffff596cf2", 160],
  "rhythm-absolute-0-6-10": ["bb12801756896b15d826c358fad5b2c809eac12fd6eb4888a268aa01c6d54418", 116],
  "octave-plus-1": ["15b4125e3bbb58456f091d60f45bebc85b62e11f8b76d9220902852d9bedcb97", 120],
  "progression-jazz_251_maj": ["318d3e2b1920e45f5ea27cdec5b5ccf228878d1bc9f04b9dfb18c5dbf4296d3a", 120],
  "non-bass-melodic-track": ["29565a9d2fcd466dba30cac5f5d4d3b20f50ec0b0a7d94208f67d7327b42294d", 168],
  "empty-progression": ["0cc352aca834358bb3adec2a025ac950aebde4425e3c4ad1aefb2ac3388031e7", 84],
};

describe("Playback golden — T1 changes no synth call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("covers the sampled styles in both themes, plus the particular cases", () => {
    const genres = new Set(SAMPLE_STYLES.map((i) => BRICKS[i]._group));
    expect(genres.size).toBeGreaterThanOrEqual(6);
    expect(Object.keys(GOLDEN).sort()).toEqual(allCases().map(([name]) => name).sort());
  });

  // Positive control: an empty journal would also be "stable".
  it("records drums, chords, bass and the published chord for the default style", async () => {
    const journal = await playbackJournal(studioState(0, "A"));
    const calls = new Set(journal.map((e) => e.call));
    ["kickSynth", "snareSynth", "hatSynth", "bassSynth", "playDictionaryNote", "setCurrentlyPlayingNotes", "currentPlayingChord"].forEach(
      (call) => expect(calls).toContain(call),
    );
  });

  it.each(allCases())("%s", async (name, build) => {
    const journal = await playbackJournal(build());
    expect([fingerprint(journal), journal.length]).toEqual(GOLDEN[name]);
  });
});
