/**
 * VMU-187 — starting a Dictionary playback stops the previous one.
 *
 * Gabriel, 2026-10-10: "Si on appuie 2x sur le bouton lecture d'un instrument
 * (exemple guitare), alors on lance 2x la lecture de la gamme: il faudrait
 * arreter la lecture de la premiere lecture au moment de lancer la lecture de
 * la seconde."
 *
 * A scale is scheduled whole, up front: one playDictionaryNote(..., time) per
 * note. The playback session token (useAudioScheduler) only gates what the
 * DISPLAY does, so a second press left the first scale's notes in the audio
 * graph, and a second scale on top of them.
 *
 * What is pinned here is the contract between the hook and the audio engine,
 * with the engine replaced by a double: playDictionaryNote hands back a voice
 * (what it put into the audio graph), the hook keeps it, and the NEXT playback
 * stops every voice of the previous one before it schedules anything of its
 * own. What the engine's voices do to Tone is not testable without Web Audio:
 * that is scripts/dictionary_replay_probe.mjs, on the served page.
 *
 *  1. A single press stops nothing.
 *  2. A second press stops every voice of the first, once, BEFORE its own first
 *     note is scheduled — for each instrument and each family.
 *  3. A third press stops the second's voices only.
 *  4. It does not matter which button started which: another instrument, the
 *     big "Ecouter" button (no argument).
 *  5. What the second press schedules is exactly what a single press schedules.
 *  6. An engine that returns no voice (a note out of range, or a test double)
 *     does not break the next press.
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  immediate: vi.fn(() => 0.9),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn() },
}));

vi.mock("../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));
vi.mock("../../core/fretboardLogic", () => ({ calcActivePath: vi.fn(() => []) }));
vi.mock("../../core/debugScale", () => ({
  logScalePosition: vi.fn(),
  logPlaybackSequence: vi.fn(),
  logNotePlay: vi.fn(),
}));

import * as AudioEngine from "../../audio/AudioEngine";
import { useDictionaryPlayback } from "../useDictionaryPlayback";

const INSTRUMENTS = ["piano", "guitar", "bass"];
const FAMILIES = [
  { id: "scale", dictType: "scale_major" },
  { id: "chord", dictType: "chord_major" },
  { id: "note", dictType: "note" },
];

const playDictionaryNote = /** @type {import("vitest").Mock} */ (AudioEngine.playDictionaryNote);

/** The voice the double engine returns for each call, in call order. */
const voiceOfCall = (i) => playDictionaryNote.mock.results[i].value;

function mount(dictType, playbackInstrument = "piano") {
  const scheduler = {
    ensureAudioReady: vi.fn(() => Promise.resolve()),
    startPlaybackSession: vi.fn(() => 42),
    isCurrentSession: vi.fn(() => true),
  };
  return renderHook(() =>
    useDictionaryPlayback({
      dictType,
      dictRoot: "0",
      playbackInstrument,
      setPlaybackInstrument: vi.fn(),
      currentBpm: 120,
      setCurrentlyPlayingNotes: vi.fn(),
      scheduler,
    })
  );
}

/** One press; returns how many notes it handed to the engine. */
async function press(result, instrument) {
  const before = playDictionaryNote.mock.calls.length;
  await act(async () => {
    await result.current.playDictionaryAudio(instrument);
  });
  return playDictionaryNote.mock.calls.length - before;
}

describe("useDictionaryPlayback — a new playback stops the previous one (VMU-187)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playDictionaryNote.mockImplementation(() => ({ stop: vi.fn() }));
  });

  for (const family of FAMILIES) {
    for (const instrument of INSTRUMENTS) {
      describe(`${family.id} on the ${instrument}`, () => {
        it("a single press stops nothing", async () => {
          const { result } = mount(family.dictType);
          const n = await press(result, instrument);
          expect(n).toBeGreaterThan(0);
          for (let i = 0; i < n; i++) expect(voiceOfCall(i).stop).not.toHaveBeenCalled();
        });

        it("a second press stops every voice of the first, once, before it schedules its own", async () => {
          const { result } = mount(family.dictType);
          const n1 = await press(result, instrument);
          const n2 = await press(result, instrument);

          const firstOwnCall = playDictionaryNote.mock.invocationCallOrder[n1];
          for (let i = 0; i < n1; i++) {
            const stop = voiceOfCall(i).stop;
            expect(stop).toHaveBeenCalledTimes(1);
            expect(stop).toHaveBeenCalledWith(expect.any(Number));
            expect(stop.mock.invocationCallOrder[0]).toBeLessThan(firstOwnCall);
          }
          // and the second press's own voices are left alone
          for (let i = n1; i < n1 + n2; i++) expect(voiceOfCall(i).stop).not.toHaveBeenCalled();
        });

        it("a third press stops the second's voices, and does not stop the first's again", async () => {
          const { result } = mount(family.dictType);
          const n1 = await press(result, instrument);
          const n2 = await press(result, instrument);
          const n3 = await press(result, instrument);

          for (let i = 0; i < n1; i++) expect(voiceOfCall(i).stop).toHaveBeenCalledTimes(1);
          for (let i = n1; i < n1 + n2; i++) expect(voiceOfCall(i).stop).toHaveBeenCalledTimes(1);
          for (let i = n1 + n2; i < n1 + n2 + n3; i++) expect(voiceOfCall(i).stop).not.toHaveBeenCalled();
        });

        it("schedules exactly what a single press schedules", async () => {
          const { result: alone } = mount(family.dictType);
          const nAlone = await press(alone, instrument);
          const singleArgs = playDictionaryNote.mock.calls.slice(0, nAlone);

          vi.clearAllMocks();
          playDictionaryNote.mockImplementation(() => ({ stop: vi.fn() }));
          const { result } = mount(family.dictType);
          const n1 = await press(result, instrument);
          const n2 = await press(result, instrument);
          expect(n1).toBe(nAlone);
          expect(n2).toBe(nAlone);
          expect(playDictionaryNote.mock.calls.slice(n1, n1 + n2)).toEqual(singleArgs);
        });
      });
    }
  }

  it("a press on another instrument stops the first instrument's scale", async () => {
    const { result } = mount("scale_major");
    const n1 = await press(result, "guitar");
    await press(result, "bass");
    for (let i = 0; i < n1; i++) expect(voiceOfCall(i).stop).toHaveBeenCalledTimes(1);
  });

  it("the big play button (no argument) stops what a column head started", async () => {
    const { result } = mount("scale_major", "guitar");
    const n1 = await press(result, "guitar");
    await press(result, undefined);
    for (let i = 0; i < n1; i++) expect(voiceOfCall(i).stop).toHaveBeenCalledTimes(1);
  });

  it("a chord press stops the scale that was playing, whatever the families", async () => {
    const scale = mount("scale_major");
    const n1 = await press(scale.result, "piano");
    const chord = mount("chord_major");
    await press(chord.result, "piano");
    for (let i = 0; i < n1; i++) expect(voiceOfCall(i).stop).toHaveBeenCalledTimes(1);
  });

  it("an engine that hands back no voice does not break the next press", async () => {
    playDictionaryNote.mockImplementation(() => undefined);
    const { result } = mount("scale_major");
    await press(result, "guitar");
    await expect(press(result, "guitar")).resolves.toBeGreaterThan(0);
  });
});
