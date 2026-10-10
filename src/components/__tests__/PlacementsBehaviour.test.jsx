// INST-B1 — the position controls of the classic page, as a player sees them.
//
// Through the REAL hooks (useDictionaryMode -> useMusicEngine) and the REAL
// InstrumentView, PositionSelector and DictPositionPanel. The neck itself is
// replaced by a probe that prints the cells of the fingering it would draw
// (useFretboard hands Fretboard exactly `guitarFingering` / `bassFingering`)
// and whether it would show "out of range" (Fretboard.jsx: `fingering
// ?.isOutOfRange || isOutOfRange`). The hooks' outputs are spread into the
// context, as AppDesktop exposes them, so this harness does not depend on how
// the state is named — it reads what the page shows.
//
// Two kinds of tests, said per describe block:
//   CHARACTERIZATION — visible behaviour B1 must keep (green before and after),
//     except the ORDER of the positions, which B1 changes on purpose: the
//     "current order" tests pin today's order and are rewritten to the new one
//     (nut -> body) in the commit that changes it, so the diff shows the change.
//   RED FIRST — what B1 changes: a chosen chord shape kept across an octave
//     change, the out-of-range warning computed on the real shape, the label of
//     the default position.
//
// Domain values (standard tuning, Do = C, frets counted from the nut, 0 = open
// string): Do majeur on the guitar is the open shape x32010 (frets 0-3), the
// A shape barred at fret 3 (3-5), the E shape at fret 8 (8-10), the D shape at
// fret 10 (10-13). On the bass: root on the A string fret 3 (3-5), on the E
// string fret 8 (8-10), on the D string fret 10 (10-12). The Do major scale:
// five boxes starting at frets 0, 2, 4, 6, 8.
import React, { useEffect } from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";

vi.mock("../Visualizer/AudioVisualizer", () => ({ default: () => null }));
vi.mock("../Instruments/PianoKeyboard", () => ({ default: () => null }));
vi.mock("../Instruments/InstrumentBar", () => ({ default: () => null }));
vi.mock("../Panels/SequencerPanel", () => ({ default: () => null }));
vi.mock("../Panels/TheoryLegend", () => ({ default: () => null }));
vi.mock("../Intelligence/VoicingAlert", () => ({ default: () => null }));
vi.mock("../Instruments/Fretboard", async () => {
  const { useMusicEngineContext } = await import("../../context/MusicEngineContext");
  // The cells a fingering puts on the neck: a scale box lists them; a chord or
  // a note is a V2 map { [string]: { fret, status } } (useMusicEngine's toV2).
  function cellsOf(f) {
    if (!f) return [];
    if (Array.isArray(f.scaleFrets)) return f.scaleFrets.map((c) => [c.stringIndex, c.fret]);
    const out = [];
    for (const [s, v] of Object.entries(f.fingeringMap ?? {})) {
      if (v && typeof v === "object" && "status" in v && v.status !== "muted" && Number(v.fret) >= 0) {
        out.push([Number(s), Number(v.fret)]);
      }
    }
    return out;
  }
  return {
    default: function NeckProbe({ instrument }) {
      const ctx = useMusicEngineContext();
      const f = instrument === "bass" ? ctx.bassFingering : ctx.guitarFingering;
      const out = Boolean(f?.isOutOfRange || (instrument === "bass" ? ctx.isBassOutOfRange : ctx.isGuitarOutOfRange));
      const cells = cellsOf(f).map(([s, fret]) => `${s}:${fret}`).join(",");
      return <div data-testid={`neck-${instrument}`} data-cells={cells} data-out={String(out)} />;
    },
  };
});

import { useDictionaryMode } from "../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { AppProvider, useAppContext } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import { PlaybackProvider } from "../../context/PlaybackContext";
import InstrumentView from "../Panels/InstrumentView";
import DictPositionPanel from "../Panels/DictPositionPanel";
import { BRICKS } from "../../core/bricks";
import { translations } from "../../i18n/translations";

afterEach(cleanup);

const fr = translations.fr;
// BRICKS[0] is a standard-tuned style (what the page loads first).
const activeBrick = BRICKS[0];

/** AppDesktop's Dictionary wiring, reduced to the position controls. */
function Session({ ctlRef }) {
  const { notation } = useAppContext();
  const dict = useDictionaryMode();
  const engine = useMusicEngine({
    ...dict,
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "chord",
    dictActiveNotes: dict.activeNotes,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });
  // The latest render's hooks, for the test to drive (setDictType, ...).
  useEffect(() => {
    ctlRef.current = { dict, engine };
  });
  const value = {
    ...dict,
    ...engine,
    appMode: "dictionary",
    activeBrick,
    showFingering: true,
    collapsedSections: {},
    toggleSection: () => {},
    clickedChord: null,
    masterAnalyser: null,
    playbackInstrument: "piano",
    setPlaybackInstrument: () => {},
    playInstrument: () => {},
  };
  const family = dict.dictType === "single_note" ? "note" : dict.dictType.startsWith("chord_") ? "chord" : "scale";
  return (
    <MusicEngineProvider value={value}>
      <PlaybackProvider value={{ currentStep: 0, currentBpm: 120 }}>
        <InstrumentView />
        <div data-testid="window">
          <DictPositionPanel
            {...dict}
            {...engine}
            family={family}
            dictActiveNotes={dict.activeNotes}
          />
        </div>
      </PlaybackProvider>
    </MusicEngineProvider>
  );
}

function mount() {
  const ctl = { current: null };
  const { container } = render(
    <AppProvider>
      <Session ctlRef={ctl} />
    </AppProvider>
  );
  return { container, ctl };
}

function select(ctl, { root = 0, type, octave }) {
  act(() => {
    ctl.current.dict.setDictRoot(root);
    ctl.current.dict.setDictType(type);
  });
  if (octave !== undefined) act(() => ctl.current.dict.setDictOctave(octave));
}

function neck(container, id) {
  const el = container.querySelector(`[data-testid="neck-${id}"]`);
  const cells = el.dataset.cells ? el.dataset.cells.split(",").map((x) => x.split(":").map(Number)) : [];
  const frets = cells.map((c) => c[1]);
  return {
    cells,
    frets: frets.length ? [Math.min(...frets), Math.max(...frets)] : null,
    out: el.dataset.out === "true",
  };
}

function selector(container, id) {
  const section = container.querySelector(`#instrument-section-${id}-content`);
  const buttons = Array.from(section.querySelectorAll("button"));
  const next = buttons.find((b) => b.textContent.trim() === "›");
  return {
    next,
    label: next.previousElementSibling.textContent.trim(),
    chosen: buttons.some((b) => b.textContent.includes(fr.resetVoicing)),
    rootButton: (name) => buttons.find((b) => b.getAttribute("title") === `${fr.rootOnString} ${name}`),
  };
}

/** Clicks the position arrow from the default until it comes back to it. */
function cycle(container, id) {
  const steps = [];
  for (let i = 0; i < 8; i++) {
    fireEvent.click(selector(container, id).next);
    const s = selector(container, id);
    steps.push({ label: s.label, frets: neck(container, id).frets, chosen: s.chosen });
    if (!s.chosen) break;
  }
  return steps;
}

function windowOptions(container) {
  const blocks = Array.from(container.querySelectorAll('[data-testid="window"] .dictionary-fretboard-options'));
  return blocks.map((b) => Array.from(b.querySelectorAll("select option")).map((o) => o.textContent.trim()));
}

// ─── CHARACTERIZATION: kept as it is ────────────────────────────────────────

describe("INST-B1 — characterization: what the position controls do, kept", () => {
  it("Do majeur, guitar: the arrows offer the open shape and the E, A and D shapes — the same four shapes, wherever they sit in the list", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const steps = cycle(container, "guitar");
    const chosen = steps.filter((s) => s.chosen);
    expect(chosen.map((s) => `${s.label} ${s.frets.join("-")}`).sort()).toEqual([
      "La-forme (fr. 3) 3-5",
      "Mi-forme (fr. 8) 8-10",
      "Open 0-3",
      "Ré-forme (fr. 10) 10-13",
    ]);
    // Back to the default after the last one: the open shape again.
    expect(steps.at(-1)).toMatchObject({ chosen: false, frets: [0, 3] });
  });

  it("Do majeur, bass: the arrows offer the root on the E, A and D strings", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const chosen = cycle(container, "bass").filter((s) => s.chosen);
    expect(chosen.map((s) => `${s.label} ${s.frets.join("-")}`).sort()).toEqual([
      "Corde La 3-5",
      "Corde Mi 8-10",
      "Corde Ré 10-12",
    ]);
    expect(neck(container, "bass").frets).toEqual([3, 5]); // default: the A string
  });

  it("'Fondamentale sur Mi / La / Ré' moves the shape to that string, and off again goes back to the default", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const results = {};
    for (const name of ["Mi", "La", "Ré"]) {
      fireEvent.click(selector(container, "guitar").rootButton(name));
      results[name] = neck(container, "guitar").frets;
      expect(selector(container, "guitar").chosen).toBe(false); // the default, no index chosen
      fireEvent.click(selector(container, "guitar").rootButton(name));
    }
    expect(results).toEqual({ Mi: [8, 10], La: [3, 5], Ré: [10, 13] });
    expect(neck(container, "guitar").frets).toEqual([0, 3]);

    const bass = {};
    for (const name of ["Mi", "La", "Ré"]) {
      fireEvent.click(selector(container, "bass").rootButton(name));
      bass[name] = neck(container, "bass").frets;
      fireEvent.click(selector(container, "bass").rootButton(name));
    }
    expect(bass).toEqual({ Mi: [8, 10], La: [3, 5], Ré: [10, 12] });
  });

  it("Do major scale: the octave picks the position (C-06), guitar and bass", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    const lows = { guitar: [], bass: [] };
    for (let o = -3; o <= 3; o++) {
      act(() => ctl.current.dict.setDictOctave(o));
      lows.guitar.push(neck(container, "guitar").frets[0]);
      lows.bass.push(neck(container, "bass").frets[0]);
    }
    expect(lows.guitar).toEqual([0, 2, 2, 4, 7, 7, 8]);
    expect(lows.bass).toEqual([0, 2, 2, 5, 7, 7, 8]);
  });

  it("Do major scale: the arrows walk the five boxes from the nut to the body", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    const chosen = cycle(container, "guitar").filter((s) => s.chosen);
    expect(chosen.map((s) => s.frets)).toEqual([[0, 3], [2, 5], [4, 8], [7, 10], [8, 12]]);
    const bass = cycle(container, "bass").filter((s) => s.chosen);
    expect(bass.map((s) => s.frets[0])).toEqual([0, 2, 5, 7, 8]);
  });

  it("a chosen scale box is cleared by an octave change — the octave picks the box again (C-06, kept)", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    fireEvent.click(selector(container, "guitar").next); // first box, frets 0-3
    expect(neck(container, "guitar").frets).toEqual([0, 3]);
    act(() => ctl.current.dict.setDictOctave(3));
    expect(selector(container, "guitar").chosen).toBe(false);
    expect(neck(container, "guitar").frets).toEqual([8, 12]); // octave +3 -> last box
  });

  it("a chosen position is cleared by a change of root or of type", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    fireEvent.click(selector(container, "guitar").next);
    expect(selector(container, "guitar").chosen).toBe(true);
    act(() => ctl.current.dict.setDictRoot(2));
    expect(selector(container, "guitar").chosen).toBe(false);
    fireEvent.click(selector(container, "bass").next);
    expect(selector(container, "bass").chosen).toBe(true);
    act(() => ctl.current.dict.setDictType("chord_minor"));
    expect(selector(container, "bass").chosen).toBe(false);
  });

  it("a chosen NOTE position is cleared by an octave change: for a note the octave is the note itself (another pitch, other cells)", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "single_note" });
    fireEvent.click(selector(container, "guitar").next);
    expect(selector(container, "guitar").chosen).toBe(true);
    act(() => ctl.current.dict.setDictOctave(1));
    expect(selector(container, "guitar").chosen).toBe(false);
  });

  it("Do majeur at octave +1 and +2: the guitar and the bass draw the very same shape (the octave does not move it)", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major", octave: 1 });
    const at1 = { guitar: neck(container, "guitar").cells, bass: neck(container, "bass").cells };
    act(() => ctl.current.dict.setDictOctave(2));
    const at2 = { guitar: neck(container, "guitar").cells, bass: neck(container, "bass").cells };
    expect(at2).toEqual(at1);
    expect(neck(container, "guitar").frets).toEqual([3, 5]); // A shape, fret 3
  });

  it("the positions window lists the same shapes as the arrows", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const [guitar, bass] = windowOptions(container);
    expect(guitar.slice(1).map((l) => l.replace("-shape", "-forme")).sort()).toEqual(
      cycle(container, "guitar").filter((s) => s.chosen).map((s) => s.label).sort()
    );
    expect(bass.slice(1).sort()).toEqual(["Corde La", "Corde Mi", "Corde Ré"]);
  });
});

// ─── The ORDER of the positions: from the nut to the body (INST-B1) ─────────
// Before B1 these four tests pinned the old order — guitar open, E fr. 8,
// A fr. 3, D fr. 10 (first frets 0 8 3 10); bass E, A, D (8 3 10); note Do4
// from the low E string down (20 15 10 5 1) — and were rewritten here, in the
// commit that changes it.

describe("INST-B1 — the order of the positions: from the nut to the body", () => {
  it("Do majeur, guitar: open, A shape fret 3, E shape fret 8, D shape fret 10", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const chosen = cycle(container, "guitar").filter((s) => s.chosen);
    expect(chosen.map((s) => s.label)).toEqual(["Open", "La-forme (fr. 3)", "Mi-forme (fr. 8)", "Ré-forme (fr. 10)"]);
    expect(chosen.map((s) => s.frets[0])).toEqual([0, 3, 8, 10]);
  });

  it("Do majeur, bass: A string fret 3, E string fret 8, D string fret 10", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const chosen = cycle(container, "bass").filter((s) => s.chosen);
    expect(chosen.map((s) => s.label)).toEqual(["Corde La", "Corde Mi", "Corde Ré"]);
    expect(chosen.map((s) => s.frets[0])).toEqual([3, 8, 10]);
  });

  it("note Do4, guitar: from the B string (fret 1) to the low E string (fret 20)", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "single_note" });
    const chosen = cycle(container, "guitar").filter((s) => s.chosen);
    expect(chosen.map((s) => s.frets[0])).toEqual([1, 5, 10, 15, 20]);
  });

  it("the positions window, Do majeur: guitar open, A, E, D; bass A, E, D — the arrows' order", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const [guitar, bass] = windowOptions(container);
    expect(guitar.slice(1)).toEqual(["Open", "La-shape (fr. 3)", "Mi-shape (fr. 8)", "Ré-shape (fr. 10)"]);
    expect(bass.slice(1)).toEqual(["Corde La", "Corde Mi", "Corde Ré"]);
  });
});

// ─── RED FIRST: what B1 changes ─────────────────────────────────────────────

describe("INST-B1 — the octave no longer clears a chosen chord shape (red first)", () => {
  it("Do majeur: the E shape chosen at octave 0 is still the shape shown at octave +1", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    while (selector(container, "guitar").label !== "Mi-forme (fr. 8)") {
      fireEvent.click(selector(container, "guitar").next);
    }
    expect(neck(container, "guitar").frets).toEqual([8, 10]);
    act(() => ctl.current.dict.setDictOctave(1));
    expect(selector(container, "guitar").label).toBe("Mi-forme (fr. 8)");
    expect(selector(container, "guitar").chosen).toBe(true);
    expect(neck(container, "guitar").frets).toEqual([8, 10]);
  });
});

describe("INST-B1 — the out-of-range warning reads the shape actually played (red first)", () => {
  it("Do majeur, octaves -3..+3: the guitar and the bass play shapes inside their range, no warning anywhere", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const warned = [];
    for (let o = -3; o <= 3; o++) {
      act(() => ctl.current.dict.setDictOctave(o));
      for (const id of ["guitar", "bass"]) if (neck(container, id).out) warned.push(`${id} ${o}`);
    }
    expect(warned).toEqual([]);
  });

  it("Do major scale, octaves -3..+3: no warning either — the boxes shown are on the neck", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    const warned = [];
    for (let o = -3; o <= 3; o++) {
      act(() => ctl.current.dict.setDictOctave(o));
      for (const id of ["guitar", "bass"]) if (neck(container, id).out) warned.push(`${id} ${o}`);
    }
    expect(warned).toEqual([]);
  });
});

describe("INST-B1 — the label of the default position names the shape shown (red first)", () => {
  const auto = (label) => fr.positionDefault(label);

  it("translations: the four languages mark a default position, around the shape's own label", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const f = translations[lang].positionDefault;
      expect(typeof f).toBe("function");
      expect(f("Open")).toContain("Open");
      expect(f("Open")).not.toBe("Open");
    }
  });

  it("Do majeur, guitar: 'Open' at octave 0, the A shape at +1, the E shape with 'Fondamentale sur Mi'", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    expect(selector(container, "guitar").label).toBe(auto("Open"));
    act(() => ctl.current.dict.setDictOctave(1));
    expect(selector(container, "guitar").label).toBe(auto("La-forme (fr. 3)"));
    expect(neck(container, "guitar").frets).toEqual([3, 5]);
    fireEvent.click(selector(container, "guitar").rootButton("Mi"));
    expect(selector(container, "guitar").label).toBe(auto("Mi-forme (fr. 8)"));
    expect(neck(container, "guitar").frets).toEqual([8, 10]);
  });

  it("Do majeur, bass: the A string, shown by default", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    expect(selector(container, "bass").label).toBe(auto("Corde La"));
  });

  it("Do major scale: the box the octave picked, numbered from the nut ('3 sur 5' at octave 0)", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    expect(selector(container, "guitar").label).toBe(auto(`3 ${fr.voicingOf} 5`));
    expect(neck(container, "guitar").frets).toEqual([4, 8]);
    act(() => ctl.current.dict.setDictOctave(-3));
    expect(selector(container, "guitar").label).toBe(auto(`1 ${fr.voicingOf} 5`));
  });

  it("a chosen scale box reads 'n sur 5' — it read 'n eu 5', the notation code, under the arrows", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "scale_major" });
    fireEvent.click(selector(container, "guitar").next);
    expect(selector(container, "guitar").label).toBe(`1 ${fr.voicingOf} 5`);
  });

  it("a single note keeps 'Toutes les notes': with no position chosen every place of the note is lit", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "single_note" });
    expect(selector(container, "guitar").label).toBe(fr.voicingAllNotes);
    expect(neck(container, "guitar").cells).toEqual([]); // no fingering: the neck lights the note everywhere
  });

  it("the positions window's first entry is the same default label", () => {
    const { container, ctl } = mount();
    select(ctl, { type: "chord_major" });
    const [guitar, bass] = windowOptions(container);
    expect(guitar[0]).toBe(auto("Open"));
    expect(bass[0]).toBe(auto("Corde La"));
  });
});
