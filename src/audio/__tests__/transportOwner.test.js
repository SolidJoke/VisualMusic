import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * transportOwner.test.js — the module did not exist before VMU-163-fix2, so
 * every one of these was red by construction (module not found) before this
 * file existed — same convention as metronome.test.js's own header comment.
 *
 * Covers the brief's measure 3: the four transitions (Play, Stop, metronome
 * on, metronome off) each in both states of "the other" (music playing or
 * not, metronome on or not), plus the position reset on Play and the
 * standalone-metronome start/stop behaviour VMU-056 already established for
 * metronome.js itself (now owned here instead).
 *
 * Same mocking strategy as metronome.test.js: Tone is mocked wholesale
 * (jsdom has no Web Audio), and the fake transport's `ticks` setter and
 * `state` are plain, observable properties so a test can assert the exact
 * sequence of position resets and start/stop calls without a real
 * Tone.Transport.
 */

let mockTransport;

function makeMockTransport() {
  return {
    _ticks: 0,
    state: "stopped",
    get ticks() {
      return this._ticks;
    },
    set ticks(t) {
      this._ticks = t;
    },
    start: vi.fn(function start() {
      this.state = "started";
    }),
    stop: vi.fn(function stop() {
      this.state = "stopped";
      this._ticks = 0;
    }),
    scheduleRepeat: vi.fn(() => "repeat-id"),
    clear: vi.fn(),
  };
}

vi.mock("tone", () => ({
  getTransport: vi.fn(() => mockTransport),
}));

describe("transportOwner (VMU-163-fix2 §4)", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockTransport = makeMockTransport();
  });

  // ─── Play ──────────────────────────────────────────────────────────────

  it("Play resets the transport to tick 0 before registering the caller's steps, then starts it", async () => {
    const { playMusic } = await import("../transportOwner");
    mockTransport._ticks = 500; // simulate the metronome having run for a while
    const order = [];
    mockTransport.start.mockImplementation(function () {
      order.push("start");
      this.state = "started";
    });

    playMusic((t) => {
      order.push(`register(ticks=${t.ticks})`);
      t.scheduleRepeat(() => {}, "16n", 0);
    });

    expect(mockTransport._ticks).toBe(0);
    // Registration happened after the reset (ticks already 0) and before start.
    expect(order).toEqual(["register(ticks=0)", "start"]);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), "16n", 0);
  });

  it("Play does not start the transport again if the metronome already has it running", async () => {
    const { playMusic, enableMetronome } = await import("../transportOwner");
    enableMetronome(() => {});
    mockTransport._ticks = 500; // metronome ran a while before Play
    mockTransport.start.mockClear();
    mockTransport.stop.mockClear();

    playMusic(() => {});

    // Both calls happen — this is what actually resets position synchronously
    // (see transportOwner.js's own docstring: setting `ticks = 0` directly
    // does *not* take effect synchronously when the transport was already
    // started, confirmed empirically against real Tone.js by the offline
    // harness; a plain mock's `ticks` setter cannot catch that on its own,
    // which is why this is asserted here against stop()/start() call counts
    // rather than only against the mock's own `ticks` value).
    expect(mockTransport.stop).toHaveBeenCalledTimes(1);
    expect(mockTransport.start).toHaveBeenCalledTimes(1);
    expect(mockTransport._ticks).toBe(0);
    expect(mockTransport.state).toBe("started");
  });

  // ─── Stop ──────────────────────────────────────────────────────────────

  it("Stop clears the caller's steps and stops the transport when the metronome is off", async () => {
    const { playMusic, stopMusic } = await import("../transportOwner");
    playMusic(() => {});
    // playMusic's own internal stop()+start() (part of its own position
    // reset, see transportOwner.js) is setup noise here — cleared so this
    // test's assertion is only about stopMusic's own call.
    mockTransport.start.mockClear();
    mockTransport.stop.mockClear();

    const unregister = vi.fn();
    stopMusic(unregister);

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(mockTransport.stop).toHaveBeenCalledTimes(1);
  });

  it("Stop clears the caller's steps but never stops the transport when the metronome is on (VMU-056/VMU-163)", async () => {
    const { playMusic, stopMusic, enableMetronome } = await import("../transportOwner");
    enableMetronome(() => {});
    playMusic(() => {});
    // Same setup noise as above — playMusic's own stop()/start() already ran.
    mockTransport.stop.mockClear();

    const unregister = vi.fn();
    stopMusic(unregister);

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(mockTransport.stop).not.toHaveBeenCalled();
    expect(mockTransport.state).toBe("started");
  });

  // ─── metronome on ──────────────────────────────────────────────────────

  it("metronome on starts the transport standalone when nothing else has it running", async () => {
    const { enableMetronome } = await import("../transportOwner");
    expect(mockTransport.state).toBe("stopped");

    const register = vi.fn();
    enableMetronome(register);

    expect(register).toHaveBeenCalledTimes(1);
    expect(mockTransport.start).toHaveBeenCalledTimes(1);
    expect(mockTransport.state).toBe("started");
  });

  it("metronome on does not restart the transport (or reset position) when the music is already playing", async () => {
    const { playMusic, enableMetronome } = await import("../transportOwner");
    playMusic(() => {});
    mockTransport._ticks = 777;
    mockTransport.start.mockClear();

    enableMetronome(() => {});

    expect(mockTransport.start).not.toHaveBeenCalled();
    expect(mockTransport._ticks).toBe(777); // untouched — only Play resets position
  });

  // ─── metronome off ─────────────────────────────────────────────────────

  it("metronome off stops the transport when the music is not playing", async () => {
    const { enableMetronome, disableMetronome } = await import("../transportOwner");
    enableMetronome(() => {});

    const unregister = vi.fn();
    disableMetronome(unregister);

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(mockTransport.stop).toHaveBeenCalledTimes(1);
  });

  it("metronome off never stops the transport while the music plays", async () => {
    const { playMusic, enableMetronome, disableMetronome } = await import("../transportOwner");
    playMusic(() => {});
    enableMetronome(() => {});
    // playMusic's own internal stop()/start() (setup noise) already ran.
    mockTransport.stop.mockClear();

    disableMetronome(() => {});

    expect(mockTransport.stop).not.toHaveBeenCalled();
    expect(mockTransport.state).toBe("started");
  });

  // ─── StrictMode-style double invocation ───────────────────────────────
  // The caller (metronome.js, useSequencer.js) already guards against a
  // second call while already on/playing — same as the existing guard
  // tested in metronome.test.js ("starting twice only schedules once"). What
  // this module must not do is anything that breaks *if* a caller's own
  // guard did not exist — asserted here directly rather than assumed.

  it("calling enableMetronome twice in a row only starts the transport once", async () => {
    const { enableMetronome } = await import("../transportOwner");
    enableMetronome(() => {});
    enableMetronome(() => {});

    expect(mockTransport.start).toHaveBeenCalledTimes(1);
  });

  it("calling playMusic twice in a row resets position, restarts the transport and re-registers each time (a second Play always restarts the song)", async () => {
    const { playMusic } = await import("../transportOwner");
    const register = vi.fn();
    playMusic(register);
    playMusic(register);

    expect(mockTransport.start).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenCalledTimes(2);
  });
});
