// VMU-182 (A′-ACCÈS item 5) — no label of A′ is hard-coded any more: every one
// comes from translations.js (namespace protoA), in FR, EN, PT and ZH.
//
// The audit (parity-audit-2026-10-05 § 1.4, nav.langue-a-prime) found about
// fifteen French labels written in PrototypeA.jsx: "Tempo", "battements / min",
// "Métronome : coupé / actif", "▶ Écouter", "▶ Lire la progression",
// "■ Arrêter", "Studio", "Dictionnaire", "aigus ↑", "sillet en haut, graves à
// gauche", "Fermer", "Sur les notes", "Noms Do Ré Mi"...
//
// What is asserted:
//   - the four languages carry the same protoA keys, none empty;
//   - switched to EN through A′'s own language control, the A′ page (text,
//     aria-label and title of everything outside the windows and outside the
//     drawer's classic panel, which have their own translations) holds none of
//     the French labels whose English differs — and none of the audit's list;
//   - it does hold the English ones.
// The bench's fixtures (?bench=1: "Scénarios S1", "États L1a" and their
// buttons) are test fixtures (registry: NON APPLICABLE), out of this check.
import { vi, describe, it, expect, afterEach } from "vitest";

vi.hoisted(() => {
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

vi.mock("../../components/Visualizer/AudioVisualizer", () => ({ default: () => <div data-testid="mock-visualizer" /> }));
vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";

const LANGS = ["fr", "en", "pt", "zh"];

/** "a.b" -> value, for every leaf string of an object. */
function leaves(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, leaves(v, key));
    else out[key] = v;
  }
  return out;
}

/** What A′ shows and names, outside the windows and the drawer's classic panel. */
function aPrimeWords(root) {
  const clone = root.cloneNode(true);
  for (const el of clone.querySelectorAll(".proto-a__drawer-body, .modal-overlay, .help-modal-overlay, [data-testid$='-stub']")) el.remove();
  const attrs = [...clone.querySelectorAll("[aria-label], [title]")].flatMap((el) => [el.getAttribute("aria-label"), el.getAttribute("title")]).filter(Boolean);
  return `${clone.textContent} | ${attrs.join(" | ")}`;
}

async function renderApp(search) {
  window.history.replaceState({}, "", `/${search}`);
  render(
    <AppProvider>
      <Suspense fallback={null}>
        <AppDesktop />
      </Suspense>
    </AppProvider>
  );
  await waitFor(() => expect(document.querySelector('[data-prototype="a"]')).not.toBeNull());
  return document.querySelector('[data-prototype="a"]');
}

function switchLanguage(lang) {
  const select = document.querySelector('[data-fn="nav.langue"] select');
  expect(select, "A′'s language control").not.toBeNull();
  fireEvent.change(select, { target: { value: lang } });
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-182: A′'s labels come from translations.js, in four languages", () => {
  it("has the same protoA keys in FR, EN, PT and ZH, none empty", () => {
    const fr = leaves(translations.fr.protoA);
    expect(Object.keys(fr).length).toBeGreaterThan(25);
    for (const lang of LANGS) {
      const l = leaves(translations[lang].protoA);
      expect(Object.keys(l).sort(), lang).toEqual(Object.keys(fr).sort());
      for (const [k, v] of Object.entries(l)) expect(typeof v === "string" && v.trim().length > 0, `${lang} ${k}`).toBe(true);
    }
  });

  it.each([
    ["Studio, drawer closed", "?prototype=a"],
    ["Dictionary, drawer open", "?prototype=a&scenario=cmaj&drawer=open"],
  ])("in EN, no French label of A′ is left (%s)", async (_label, search) => {
    const root = await renderApp(search);
    switchLanguage("en");
    const words = aPrimeWords(root);

    const fr = leaves(translations.fr.protoA);
    const en = leaves(translations.en.protoA);
    const left = Object.entries(fr).filter(([k, v]) => v !== en[k] && words.includes(v));
    expect(left, `French labels still shown in EN: ${left.map(([k, v]) => `${k}="${v}"`).join(", ")}`).toEqual([]);

    // The audit's own list, word for word (and the old rail's "Dico").
    for (const french of ["battements / min", "Métronome", "Écouter", "Lire la progression", "Arrêter", "Dico", "aigus", "sillet en haut", "Fermer", "Sur les notes", "Noms Do Ré Mi", "Dictionnaire", "Studio & Harmonie", "Volume général"]) {
      expect(words, french).not.toContain(french);
    }

    // And the English ones are there instead.
    expect(words).toContain(en.bpmUnit);
    expect(words).toContain(en.metronomeOff);
    expect(words).toContain(en.labelsCaption);
    expect(words).toContain(en.volume);
  });
});
