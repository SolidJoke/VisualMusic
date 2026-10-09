// A′-ACCÈS (brief A-PRIME-ACCES, Gabriel 2026-10-06: "il manque toujours des
// features comme le volume") — every function of the classic design becomes
// reachable in ?prototype=a, reusing the classic components, in a PROVISIONAL
// place (the dock, the column heads and zone B come later).
//
// The whole app is rendered (AppDesktop with ?prototype=a), so what is checked
// is the real wiring, not a stub of it: the same Modal windows as the classic
// page with the same content, the same master-volume state, the real tempo
// owner. Only the three heavy instrument / sequencer components are stubbed,
// and the audio engine is mocked as in the other integration tests.
//
// What is asserted:
//   (a) every data-fn of the shared list (src/prototype/aPrimeAccess.js) is in
//       the page once, visible (jsdom: no hidden / display none);
//   (b) "Instruments & Audio" opens a window holding the master volume
//       (-40..0 dB) and the six mixer faders; "Math & Rythmes" opens
//       CompositionPanel (Studio) or its Dictionary warning; the Guide, the
//       Theory and About (with the CC BY credit of the piano samples) open;
//       Escape and the close button close each;
//   (c) the tempo can be typed: a click on the number opens a 60-200 field,
//       Enter commits, Escape cancels, 60 and 200 are accepted, 59 and 201 not;
//   (d) the transport's volume and the Audio window's are ONE state, and it
//       reaches the engine (Tone.Destination's ramp, mocked here);
//   (f) Escape closes the Assistant drawer, but with a window open over it,
//       Escape closes the window only;
//   the audio visualizer is a 60px band right under the transport;
//   no second note-name control next to "Sur les notes".
// The layout (sizes, no scroll, on top) is measured in Chromium by
// scripts/s1_probe.mjs (S1-20): jsdom does no layout.
import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

vi.hoisted(() => {
  // AppDesktop reads ?prototype=a once, when its module is evaluated.
  window.history.replaceState({}, "", "/?prototype=a");
});

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

vi.mock("../../audio/AudioEngine", () => ({
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
  masterAnalyser: { getValue: () => new Float32Array(8) },
}));

vi.mock("../../components/Visualizer/AudioVisualizer", () => ({
  default: (props) => <div data-testid="mock-visualizer" data-height={props.height} />,
}));
vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import * as Tone from "tone";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";
import { A_PRIME_ACCESS } from "../aPrimeAccess";

const FR = translations.fr;

async function renderApp(search = "?prototype=a") {
  window.history.replaceState({}, "", `/${search}`);
  render(
    <AppProvider>
      <Suspense fallback={<div data-testid="loading" />}>
        <AppDesktop />
      </Suspense>
    </AppProvider>
  );
  await waitFor(() => expect(document.querySelector('[data-prototype="a"]')).not.toBeNull());
  return document.querySelector('[data-prototype="a"]');
}

const fn = (id) => document.querySelector(`[data-fn="${id}"]`);

/** Visible as far as jsdom can tell (no layout here): in the document, and no
 * ancestor hidden, display: none or visibility: hidden. */
function isVisible(el) {
  if (!el || !el.isConnected) return false;
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (node.hidden) return false;
    const cs = window.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const escape = () => fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("A′-ACCÈS (a): every function of the list is in the page, once, visible", () => {
  it("carries every data-fn of the shared list (the drawer's own once the drawer is open)", async () => {
    await renderApp();
    const expected = A_PRIME_ACCESS.filter((f) => !f.needs && (!f.devOnly || import.meta.env.DEV));
    expect(expected.length).toBeGreaterThan(20);
    for (const f of expected) {
      const els = document.querySelectorAll(`[data-fn="${f.fn}"]`);
      expect(els.length, f.fn).toBe(1);
      expect(isVisible(els[0]), f.fn).toBe(true);
    }
  });

  it("carries the drawer's close button once the Assistant drawer is open", async () => {
    await renderApp("?prototype=a&drawer=open");
    for (const f of A_PRIME_ACCESS.filter((x) => x.needs === "drawer")) {
      expect(document.querySelectorAll(`[data-fn="${f.fn}"]`).length, f.fn).toBe(1);
      expect(isVisible(fn(f.fn)), f.fn).toBe(true);
    }
  });

  it("styles the Assistant button as its own (VMU-184), pressed while the drawer is open", async () => {
    await renderApp();
    const btn = fn("nav.studio-harmonie");
    expect(btn.classList.contains("proto-a__assistant")).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(fn("nav.studio-harmonie").classList.contains("is-active")).toBe(true);
    expect(fn("nav.studio-harmonie").getAttribute("aria-pressed")).toBe("true");
  });

  it("has no second note-name control: the header's EU / US toggle is not mounted next to 'Sur les notes'", async () => {
    await renderApp();
    expect(document.querySelector('[data-testid="header-notation-toggle"]')).toBeNull();
    expect(fn("nav.notation")).toBeNull();
    expect(document.querySelectorAll('[role="group"][aria-label="Sur les notes"]')).toHaveLength(1);
  });
});

describe("A′-ACCÈS (b): the classic windows open from A′, with the classic content, and close", () => {
  it("'Instruments & Audio' opens the master volume and the six mixer faders; Escape and ✕ close it", async () => {
    await renderApp();
    fireEvent.click(fn("son.ouvrir"));
    const modal = document.querySelector(".modal-container");
    expect(modal).not.toBeNull();
    expect(modal.querySelector(".modal-title").textContent).toContain("Instruments & Audio");
    const master = modal.querySelectorAll('input[type="range"][min="-40"][max="0"]');
    expect(master).toHaveLength(1);
    expect(modal.querySelectorAll('input[type="range"][orient="vertical"]')).toHaveLength(6);
    for (const name of ["Kick", "Snare/Clap", "Hi-Hat", "Bass Synth", "Piano", "Guitar"]) {
      expect(modal.textContent, name).toContain(name);
    }
    expect(modal.textContent).toContain("Shell Voicings");
    escape();
    expect(document.querySelector(".modal-container")).toBeNull();

    fireEvent.click(fn("son.ouvrir"));
    fireEvent.click(document.querySelector(".modal-container .modal-close-btn"));
    expect(document.querySelector(".modal-container")).toBeNull();
  });

  it("'Math & Rythmes' opens CompositionPanel in Studio (the euclidean circle), its warning in Dictionary; Escape closes it", async () => {
    await renderApp();
    fireEvent.click(fn("nav.mode-studio"));
    fireEvent.click(fn("composer.math-ouvrir"));
    let modal = document.querySelector(".modal-container");
    expect(modal).not.toBeNull();
    expect(modal.querySelector("#composition-panel")).not.toBeNull();
    expect(modal.querySelector(".euclidean-svg")).not.toBeNull();
    escape();
    expect(document.querySelector(".modal-container")).toBeNull();

    fireEvent.click(fn("nav.mode-dictionnaire"));
    fireEvent.click(fn("composer.math-ouvrir"));
    modal = document.querySelector(".modal-container");
    expect(modal.textContent).toContain(FR.dictNoRhythmWarning);
    fireEvent.click(modal.querySelector(".modal-close-btn"));
    expect(document.querySelector(".modal-container")).toBeNull();
  });

  it("the Guide opens and Escape closes it", async () => {
    await renderApp();
    fireEvent.click(fn("aide.guide"));
    expect(document.querySelector(".help-modal-overlay")).not.toBeNull();
    escape();
    expect(document.querySelector(".help-modal-overlay")).toBeNull();
  });

  it("the Theory opens and Escape closes it (it used to close by ✖ only)", async () => {
    await renderApp();
    fireEvent.click(fn("aide.theorie"));
    expect(document.querySelector(".theory-modal-content")).not.toBeNull();
    escape();
    expect(document.querySelector(".theory-modal-content")).toBeNull();
    fireEvent.click(fn("aide.theorie"));
    fireEvent.click(document.querySelector(".theory-modal-content .modal-close-btn"));
    expect(document.querySelector(".theory-modal-content")).toBeNull();
  });

  it("About opens with the CC BY credit of the piano samples, and Escape closes it", async () => {
    await renderApp();
    fireEvent.click(fn("aide.a-propos"));
    const credit = [...document.querySelectorAll(".modal-content a")].find((a) => /creativecommons\.org\/licenses\/by\/3\.0/.test(a.getAttribute("href")));
    expect(credit).toBeDefined();
    expect(credit.textContent).toBe(FR.samplesCredit);
    escape();
    expect(document.querySelector(".modal-content")).toBeNull();
  });
});

describe("A′-ACCÈS (c): the tempo can be typed (VMU-181), like the classic badge", () => {
  async function typeTempo(value, key) {
    fireEvent.click(document.querySelector('button[data-fn="jouer.tempo-saisie"]'));
    const input = document.querySelector('input[data-fn="jouer.tempo-saisie"]');
    expect(input, "the number opens a field").not.toBeNull();
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key });
    await tick();
    expect(document.querySelector('input[data-fn="jouer.tempo-saisie"]'), "the field closes").toBeNull();
    return document.querySelector('button[data-fn="jouer.tempo-saisie"]').textContent;
  }

  it("opens a 60-200 number field on a click on the number", async () => {
    await renderApp();
    fireEvent.click(document.querySelector('button[data-fn="jouer.tempo-saisie"]'));
    const input = document.querySelector('input[data-fn="jouer.tempo-saisie"]');
    expect(input.getAttribute("type")).toBe("number");
    expect(input.getAttribute("min")).toBe("60");
    expect(input.getAttribute("max")).toBe("200");
  });

  it("'90' + Enter shows 90; Escape cancels; 60 and 200 are accepted, 59 and 201 are not", async () => {
    await renderApp();
    expect(await typeTempo("90", "Enter")).toBe("90");
    expect(await typeTempo("150", "Escape")).toBe("90");
    expect(await typeTempo("60", "Enter")).toBe("60");
    expect(await typeTempo("59", "Enter")).toBe("60");
    expect(await typeTempo("200", "Enter")).toBe("200");
    expect(await typeTempo("201", "Enter")).toBe("200");
  });
});

describe("A′-ACCÈS (d): the transport's volume and the Audio window's are the same state", () => {
  it("moves together both ways, and reaches the engine", async () => {
    await renderApp();
    const slider = fn("son.volume-general");
    expect(slider.tagName).toBe("INPUT");
    expect(slider.getAttribute("type")).toBe("range");
    expect(slider.getAttribute("min")).toBe("-40");
    expect(slider.getAttribute("max")).toBe("0");
    expect(slider.value).toBe("-12");

    fireEvent.change(slider, { target: { value: "-20" } });
    expect(fn("son.volume-general").value).toBe("-20");
    expect(document.querySelector('[data-s1="transport"]').textContent).toContain("-20 dB");
    const ramp = Tone.Destination.volume.rampTo;
    expect(Number(ramp.mock.calls.at(-1)[0])).toBe(-20);

    fireEvent.click(fn("son.ouvrir"));
    const modalMaster = document.querySelector('.modal-container input[type="range"][min="-40"][max="0"]');
    expect(modalMaster.value).toBe("-20");
    fireEvent.change(modalMaster, { target: { value: "-30" } });
    escape();
    expect(fn("son.volume-general").value).toBe("-30");
    expect(document.querySelector('[data-s1="transport"]').textContent).toContain("-30 dB");
    expect(Number(ramp.mock.calls.at(-1)[0])).toBe(-30);
  });
});

describe("A′-ACCÈS (f): Escape closes the Assistant drawer, like the classic windows", () => {
  it("closes the open drawer", async () => {
    await renderApp("?prototype=a&drawer=open");
    expect(document.querySelector('[data-s1="drawer"]')).not.toBeNull();
    escape();
    expect(document.querySelector('[data-s1="drawer"]')).toBeNull();
  });

  it("with a window open over the drawer, Escape closes the window only, then the drawer", async () => {
    await renderApp("?prototype=a&drawer=open");
    fireEvent.click(fn("son.ouvrir"));
    expect(document.querySelector(".modal-container")).not.toBeNull();
    escape();
    expect(document.querySelector(".modal-container")).toBeNull();
    expect(document.querySelector('[data-s1="drawer"]')).not.toBeNull();
    escape();
    expect(document.querySelector('[data-s1="drawer"]')).toBeNull();
  });

  it("leaves the drawer open when Escape only cancels the tempo field", async () => {
    await renderApp("?prototype=a&drawer=open");
    fireEvent.click(document.querySelector('button[data-fn="jouer.tempo-saisie"]'));
    const input = document.querySelector('input[data-fn="jouer.tempo-saisie"]');
    fireEvent.keyDown(input, { key: "Escape" });
    await tick();
    expect(document.querySelector('[data-s1="drawer"]')).not.toBeNull();
  });
});

describe("A′-ACCÈS: the audio visualizer", () => {
  it("is a 60px band right under the transport, fed by the master analyser", async () => {
    await renderApp();
    const band = fn("son.visualiseur");
    expect(band.previousElementSibling).toBe(document.querySelector('[data-s1="transport"]'));
    const viz = band.querySelector('[data-testid="mock-visualizer"]');
    expect(viz).not.toBeNull();
    expect(viz.getAttribute("data-height")).toBe("60px");
  });
});
