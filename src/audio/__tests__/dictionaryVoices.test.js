/**
 * VMU-187 — the voices of a Dictionary playback (src/audio/dictionaryVoices.js).
 *
 * Tone is replaced by doubles that keep Tone's relevant behaviour and nothing
 * else; what the voices do to a real audio graph is measured on the served page
 * by scripts/dictionary_replay_probe.mjs. What is pinned here:
 *
 *  - the registry: what a playback remembered is stopped once, together, at the
 *    instant Tone.immediate() gives, then forgotten; a voice that throws does
 *    not stop the others, nor the next playback;
 *  - triggerSamplerVoice plays exactly as `triggerAttackRelease` does (the same
 *    two calls, in the same order, with the same dates) and keeps the sources
 *    the sampler forgets the moment the release is scheduled: a source that has
 *    not started is taken out of the graph, one that sounds is stopped at `at`
 *    (it fades), one that is over is left alone;
 *  - the bass voice cancels the three signals of the one oscillator from `at`
 *    on BEFORE releasing (releasing first would leave the later attacks);
 *  - the PolySynth fallback releases what sounds.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const MIDI = { C4: 60, E4: 64, G4: 67 };

vi.mock("tone", () => ({
  immediate: vi.fn(() => 5),
  Frequency: vi.fn((note) => ({ toMidi: () => MIDI[note] })),
}));

import * as Tone from "tone";
import {
  rememberDictionaryVoice,
  stopDictionaryVoices,
  combineVoices,
  triggerSamplerVoice,
  monoSynthVoice,
  polySynthVoice,
} from "../dictionaryVoices";

/** A Tone.Sampler as far as the voices see it: the attack makes a source and remembers it, the release forgets it. */
function fakeSampler() {
  const calls = [];
  const sampler = {
    calls,
    _activeSources: new Map(),
    toSeconds: vi.fn((t) => (t === undefined ? 1 : typeof t === "string" ? 0.25 : t)),
    triggerAttack: vi.fn((notes, time, velocity) => {
      calls.push("attack");
      for (const note of notes) {
        const midi = MIDI[note];
        const source = { disposed: false, dispose: vi.fn(), stop: vi.fn(), note, time, velocity };
        const list = sampler._activeSources.get(midi) ?? [];
        list.push(source);
        sampler._activeSources.set(midi, list);
      }
    }),
    triggerRelease: vi.fn((notes) => {
      calls.push("release");
      for (const note of notes) sampler._activeSources.set(MIDI[note], []); // Tone's own bookkeeping
    }),
  };
  return sampler;
}

beforeEach(() => {
  vi.clearAllMocks();
  stopDictionaryVoices(); // the registry is module state: leave nothing behind
  vi.clearAllMocks();
});

describe("the registry of a playback's voices", () => {
  it("stops every remembered voice once, at Tone.immediate(), then forgets them", () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    rememberDictionaryVoice(a);
    rememberDictionaryVoice(b);
    stopDictionaryVoices();
    expect(a.stop).toHaveBeenCalledOnce();
    expect(a.stop).toHaveBeenCalledWith(5);
    expect(b.stop).toHaveBeenCalledWith(5);
    stopDictionaryVoices();
    expect(a.stop).toHaveBeenCalledOnce();
    expect(b.stop).toHaveBeenCalledOnce();
  });

  it("with nothing remembered it does not even read the audio clock", () => {
    stopDictionaryVoices();
    expect(Tone.immediate).not.toHaveBeenCalled();
  });

  it("ignores what is not a voice (an engine that played nothing)", () => {
    rememberDictionaryVoice(undefined);
    rememberDictionaryVoice(null);
    stopDictionaryVoices();
    expect(Tone.immediate).not.toHaveBeenCalled();
  });

  it("a voice that cannot be stopped does not keep the others from being stopped", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = {
      stop: vi.fn(() => {
        throw new Error("disposed");
      }),
    };
    const good = { stop: vi.fn() };
    rememberDictionaryVoice(bad);
    rememberDictionaryVoice(good);
    expect(() => stopDictionaryVoices()).not.toThrow();
    expect(good.stop).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("combineVoices stops them all at the same instant", () => {
    const a = { stop: vi.fn() };
    const b = { stop: vi.fn() };
    combineVoices([a, b]).stop(7);
    expect(a.stop).toHaveBeenCalledWith(7);
    expect(b.stop).toHaveBeenCalledWith(7);
  });
});

describe("triggerSamplerVoice — triggerAttackRelease that keeps hold of its sources", () => {
  it("plays as triggerAttackRelease does: the attack at the start, then the release at start + duration", () => {
    const sampler = fakeSampler();
    triggerSamplerVoice(sampler, ["C4", "E4"], "8n", 10, 0.8);
    expect(sampler.calls).toEqual(["attack", "release"]);
    expect(sampler.triggerAttack).toHaveBeenCalledWith(["C4", "E4"], 10, 0.8);
    expect(sampler.triggerRelease).toHaveBeenCalledWith(["C4", "E4"], 10.25);
  });

  it("a single note name is a one-note chord, and no date means 'now' as Tone reads it", () => {
    const sampler = fakeSampler();
    triggerSamplerVoice(sampler, "G4", "8n", undefined);
    expect(sampler.toSeconds).toHaveBeenCalledWith(undefined);
    expect(sampler.triggerAttack).toHaveBeenCalledWith(["G4"], 1, undefined);
    expect(sampler.triggerRelease).toHaveBeenCalledWith(["G4"], 1.25);
  });

  it("stop(at) decides per source from its own dates", () => {
    // Build the sources by hand so each can be inspected.
    const over = { disposed: false, dispose: vi.fn(), stop: vi.fn() };
    const sounding = { disposed: false, dispose: vi.fn(), stop: vi.fn() };
    const pending = { disposed: false, dispose: vi.fn(), stop: vi.fn() };
    const gone = { disposed: true, dispose: vi.fn(), stop: vi.fn() };
    const queue = [over, sounding, pending, gone];
    const sampler = {
      _activeSources: new Map(),
      toSeconds: (t) => (typeof t === "string" ? 0.25 : t),
      triggerAttack: vi.fn((notes) => {
        sampler._activeSources.set(MIDI[notes[0]], [queue.shift()]);
      }),
      triggerRelease: vi.fn(),
    };
    const voice = combineVoices([
      triggerSamplerVoice(sampler, "C4", "8n", 10), //     10.00 -> 10.25: over at 10.4
      triggerSamplerVoice(sampler, "E4", "8n", 10.3), //   10.30 -> 10.55: sounding at 10.4
      triggerSamplerVoice(sampler, "G4", "8n", 10.5), //   10.50 -> 10.75: not started at 10.4
      triggerSamplerVoice(sampler, "C4", "8n", 10.2), //   already disposed by Tone
    ]);
    voice.stop(10.4);
    expect(over.dispose).not.toHaveBeenCalled();
    expect(over.stop).not.toHaveBeenCalled();
    expect(sounding.stop).toHaveBeenCalledWith(10.4);
    expect(sounding.dispose).not.toHaveBeenCalled();
    expect(pending.dispose).toHaveBeenCalledOnce();
    expect(pending.stop).not.toHaveBeenCalled();
    expect(gone.stop).not.toHaveBeenCalled();
    expect(gone.dispose).not.toHaveBeenCalled();
  });

  it("a Tone that no longer keeps its sources where it did is said once, and the voice then stops nothing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sampler = { toSeconds: (t) => t, triggerAttack: vi.fn(), triggerRelease: vi.fn() };
    const voice = combineVoices([
      triggerSamplerVoice(sampler, "C4", "8n", 1),
      triggerSamplerVoice(sampler, "E4", "8n", 1),
    ]);
    expect(() => voice.stop(2)).not.toThrow();
    expect(error).toHaveBeenCalledOnce(); // once per page load, not once per note
    error.mockRestore();
  });
});

describe("monoSynthVoice — the bass's one oscillator", () => {
  it("cancels the pitch, the amplitude and the filter from `at` on, then releases", () => {
    const order = [];
    const synth = {
      frequency: { cancelScheduledValues: vi.fn(() => order.push("frequency")) },
      envelope: { cancel: vi.fn(() => order.push("envelope")) },
      filterEnvelope: { cancel: vi.fn(() => order.push("filterEnvelope")) },
      triggerRelease: vi.fn(() => order.push("release")),
    };
    monoSynthVoice(synth).stop(3);
    expect(synth.frequency.cancelScheduledValues).toHaveBeenCalledWith(3);
    expect(synth.envelope.cancel).toHaveBeenCalledWith(3);
    expect(synth.filterEnvelope.cancel).toHaveBeenCalledWith(3);
    expect(synth.triggerRelease).toHaveBeenCalledWith(3);
    expect(order.at(-1)).toBe("release");
    expect(order.slice(0, 3).sort()).toEqual(["envelope", "filterEnvelope", "frequency"]);
  });
});

describe("polySynthVoice — the fallback while samples load", () => {
  it("releases what sounds", () => {
    const synth = { releaseAll: vi.fn() };
    polySynthVoice(synth).stop(4);
    expect(synth.releaseAll).toHaveBeenCalledWith(4);
  });
});
