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

vi.mock("tone", () => {
  // transportOwner.js (VMU-163-fix2) reads Tone.getTransport(), never the
  // deprecated Tone.Transport — same object either way, so callers using
  // either spelling observe the same start/stop/scheduleRepeat calls.
  const transport = {
    bpm: { value: 120 },
    state: "stopped",
    ticks: 0,
    scheduleRepeat: vi.fn((cb) => {
      rec.repeat = cb;
      return 1;
    }),
    clear: vi.fn(),
    start: vi.fn(function () {
      this.state = "started";
    }),
    stop: vi.fn(function () {
      this.state = "stopped";
      this.ticks = 0;
    }),
  };
  return {
    start: vi.fn(() => Promise.resolve()),
    now: vi.fn(() => 0),
    context: { lookAhead: 0.1 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: (fn) => fn() },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
  };
});

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
// VMU-200: the journals are the same, entry for entry, except the arguments of
// `setCurrentlyPlayingNotes` — the loop now publishes tagged notes
// ({ absoluteValue, instrument }, melodic ones also `nearShape: true`) instead
// of bare MIDI numbers, so the fingerprints below changed while every synth
// call, every pitch and every entry count stayed the same (checked: counts
// unchanged for all 23 cases). Nothing audible moved.
const GOLDEN = {
  "0:A Modern Pop (4 Chords)": ["d785c550ed37d0a3641984eed4164ee59990472c74160d0a460e568086e81283", 120],
  "0:B Modern Pop (4 Chords)": ["d785c550ed37d0a3641984eed4164ee59990472c74160d0a460e568086e81283", 120],
  "3:A Funk/Disco Loop": ["6f51195d8c0782be371f9967ae5e8ca7f5ffb898312d7ade867c2d07377c1375", 176],
  "3:B Funk/Disco Loop": ["6f51195d8c0782be371f9967ae5e8ca7f5ffb898312d7ade867c2d07377c1375", 176],
  "5:A Euphoric Techno": ["ca9fb34cbbcba022b8fe1d2018052d38bdee324fa72978bd8e2f36945a55a7e1", 244],
  "5:B Euphoric Techno": ["0e3215f22b975a17e6a889a3a30523c0a56a21d1af31670b46734b119b7dfbb5", 156],
  "7:A Epic Metal": ["b465ddef72c1a2711e7a07318f84320ab0e176dbd0ff1059a8d2864b75d9ee21", 204],
  "7:B Epic Metal": ["7a11ac8f24c1d403b611677dc1f22671122224908aa822b12740c6586a4463e5", 180],
  "8:A Joyful Reggae": ["618b465eccd2baac670135372170a1a4f61fdbba6b0453bc6973baa0e651d2be", 140],
  "8:B Joyful Reggae": ["095931853267f944abdac0fc4604995a86e232d4a016d0c7178a8208221f181a", 124],
  "10:A Oldschool Boom Bap": ["74bb4bb2416335ce2253926059c5ba453c5e2babc88c9faa1eae0364199a6d28", 132],
  "10:B Oldschool Boom Bap": ["6f11e5f5568cc561475b0d3b8d2151dff5e18499fd12fb7e702b69086b5779ed", 132],
  "16:A Groove Metal": ["4860c7765908593675f8c7cbd56f311a9c4291fa7295e666dc228dc859126723", 160],
  "16:B Groove Metal": ["9e5491e36908b1aa50db4523ea7d56751b21cd6ed395a6f0d5e2b9cf335352fe", 156],
  "18:A Modern Pop (Ballad)": ["317399cd3ba436f97b7e316e80b79acc559dff56df3a909d12612f88279d53a8", 108],
  "18:B Modern Pop (Ballad)": ["3be2b7d419eb3d9c8a743382c8757491730b246877732677019f023a3969442b", 124],
  "21:A Bossa Nova": ["74df84d7e6869fd12dfc12ad55beb8f9a78497a726c6b351312a7bdbd52b2870", 124],
  "21:B Bossa Nova": ["cdc1e55b081dab895b5c2e987d1d88de2137f01dd070fd87d1579d5703dc9180", 160],
  "rhythm-absolute-0-6-10": ["1d10decb400c4ff57b27bdda4a157e80ff8f02909aa3e9a97170dcb939c6c8e8", 116],
  "octave-plus-1": ["8e7573f458a3c80cd6d8f271fc5f46e72f7df2178f9d173d625bb8f7bd65bfc7", 120],
  // VMU-169: the chord published to React carries its name, and the name is now
  // complete ("Dm" "G" "C" became "Dm7" "G7" "Cmaj7"; EU "Rém7" "Sol7" "Domaj7").
  // Nothing audible moved: the journals of the previous fingerprint and of this
  // one are identical once those two fields (chordNameUS, chordNameEU) are
  // taken out — same 120 entries, every synth call and every pitch the same.
  // Was 90e9c06209d8b18813554c1d68863a809baec5a25592c054cf3c81f90088f47c
  // (VMU-200 re-fingerprinted for the tagged published notes, same reason).
  "progression-jazz_251_maj": ["a4c45a8f0ce9c9dab275368898236d4c456704263ca690d2c536e5044d32397f", 120],
  "non-bass-melodic-track": ["ef562e9a73977e697c328c84a4171441fe1cecc8a610989056351affe2170725", 168],
  "empty-progression": ["03f2e372a5b27165f2403233feba016549f22f629b6022a65a5b08d6f74ae039", 84],
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
