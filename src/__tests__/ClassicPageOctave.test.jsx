// L1b-1b (e) — CHARACTERIZATION of the classic page: green before and after.
//
// L1b-1b cuts the link between the common Dictionary octave and the necks'
// default position (C-06 for a scale box, the octave-0 open shape for a chord)
// in A′ ONLY: there the octave becomes the piano's own setting, in its column
// head. The classic page is no longer a design target (Gabriel, 2026-10-10),
// but it is still online and must not break: it keeps today's behaviour, and
// this file says so through AppDesktop's real call site (no ?prototype=a), the
// classic DictionaryPanel's octave segment and the classic PositionSelector's
// label — what Gabriel would read there.
//
// Domain values: Do majeur on the guitar, octave 0 -> the open shape by default;
// any other octave -> the A shape barred at fret 3 (fingeringLogic.js
// getGuitarFingering: the open shapes are the default at the octave 0 only).
// The bass's default (root on the A string) does not depend on the octave.
// The Do major scale's default box follows the octave (C-06): -3 -> box 1 of 5,
// +3 -> box 5 of 5.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    clear: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    state: "stopped",
  };
  return {
    start: vi.fn(),
    now: vi.fn(() => 0),
    getDraw: vi.fn(() => ({ schedule: vi.fn() })),
    context: { lookAhead: 0.1 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: vi.fn() },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Analyser: vi.fn(() => ({ dispose: vi.fn() })),
    Frequency: vi.fn(() => ({ toMidi: () => 60 })),
  };
});

vi.mock("../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  setBpm: vi.fn(),
  initAudio: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({ default: () => <div data-testid="mock-visualizer" /> }));

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

async function press(el) {
  expect(el, "the control to press").toBeTruthy();
  await act(async () => {
    fireEvent.click(el);
  });
  await settle();
}

/** The classic page, Dictionary mode, the "Studio & Harmonie" window open on its panel. */
async function openClassicDictionary() {
  window.history.replaceState({}, "", "/");
  render(
    <AppProvider>
      <AppDesktop />
    </AppProvider>
  );
  fireEvent.click(screen.getByText(/Studio & Harmonie/i));
  fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
  await settle();
}

const segment = (text) => [...document.querySelectorAll(".btn-segment")].find((b) => b.textContent.trim() === text);

/** The label between the classic PositionSelector's ‹ and › of one neck. */
function positionLabel(id) {
  const section = document.querySelector(`#instrument-section-${id}-content`);
  const next = [...section.querySelectorAll("button")].find((b) => b.textContent.trim() === "›");
  return next.previousElementSibling.textContent.trim();
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("L1b-1b (e) — the classic page keeps its octave as it is (characterization)", () => {
  it("is not A′: no column head, the classic position arrows", async () => {
    await openClassicDictionary();
    expect(document.querySelector('[data-prototype="a"]')).toBeNull();
    expect(document.querySelector('[data-fn="jouer.octave-piano-suiv"]')).toBeNull();
    expect(document.querySelector("#instrument-section-guitar-content")).not.toBeNull();
  });

  it("Do majeur: the octave still picks the guitar's default shape (open at 0, A shape at +1); the bass's stays", async () => {
    await openClassicDictionary();
    await press(screen.getByRole("button", { name: /accords/i }));
    expect(positionLabel("guitar")).toBe("Open (auto)");
    expect(positionLabel("bass")).toBe("Corde La (auto)");
    await press(segment("+1"));
    expect(positionLabel("guitar")).toBe("La-forme (fr. 3) (auto)");
    expect(positionLabel("bass")).toBe("Corde La (auto)");
    await press(segment("0"));
    expect(positionLabel("guitar")).toBe("Open (auto)");
  });

  it("the Do major scale: the octave still picks the default box (C-06): -3 -> 1 of 5, +3 -> 5 of 5", async () => {
    await openClassicDictionary();
    await press(screen.getByRole("button", { name: /gammes/i }));
    await press(segment("-3"));
    expect(positionLabel("guitar")).toBe("1 sur 5 (auto)");
    await press(segment("+3"));
    expect(positionLabel("guitar")).toBe("5 sur 5 (auto)");
  });

  it("the octave still clears a chosen scale box", async () => {
    await openClassicDictionary();
    await press(screen.getByRole("button", { name: /gammes/i }));
    const section = document.querySelector("#instrument-section-guitar-content");
    await press([...section.querySelectorAll("button")].find((b) => b.textContent.trim() === "›"));
    expect(positionLabel("guitar")).toBe("1 sur 5");
    await press(segment("+1"));
    expect(positionLabel("guitar")).toMatch(/\(auto\)$/);
  });
});
