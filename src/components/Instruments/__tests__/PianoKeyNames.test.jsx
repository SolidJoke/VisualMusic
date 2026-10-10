// L1b-1a — every key of the vertical piano of A' carries its name (Gabriel,
// 2026-10: "le nom des notes à côté du clavier et des manches me plaît
// beaucoup ... y compris sur toutes les touches du piano"; he is a beginner).
//
// Before this slice the vertical keyboard named only its lit keys and each C
// ("Do4"): in Do majeur 7 of its 49 keys, in Sol#m7 9. The other keys were
// blank. What is asserted, through the REAL hooks in the order AppDesktop
// chains them (useDictionaryMode -> useMusicEngine) and the REAL PianoKeyboard
// (orientation="vertical"), in three states (nothing lit, Do majeur, Sol#m7):
//
//   1. 49 keys (29 white + 20 black), and every one of them has a non-empty
//      label: "49 touches nommées".
//   2. LITERAL anchors (domain values, not read back from the component): the
//      lowest key, a Ré#/Mib key and the Do keys read exactly "Do2" /
//      "Ré#" "Mib" / "Do3 Do5", in "Noms Do Ré Mi" (eu), and "C2" / "D#" "Eb" /
//      "C3 C5" in "Noms C D E" (us). A black key carries its sharp and its flat.
//   3. A key that is not played is a quiet grey one: its label carries
//      `note-label--unplayed` (the CSS gives it the two tokens); a played key
//      keeps its role colour and exactly the label it had.
//   4. Harmonic mode: the lit keys show what they showed (the rank line takes
//      the place of the name); only the unplayed keys are named, by name alone.
//
// jsdom does no layout and resolves no custom property: sizes, contrast and
// overlaps are the Playwright probe's job (scripts/s1_probe.mjs, S1-22).
import React, { useEffect } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useDictionaryMode } from "../../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider, useAppContext } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import PianoKeyboard from "../PianoKeyboard";
import { BRICKS } from "../../../core/bricks";

afterEach(cleanup);

const activeBrick = BRICKS[0];

const STATES = [
  { id: "nothing lit", nothing: true, lit: 0 },
  { id: "Do majeur", root: 0, type: "chord_major", lit: 3 },
  { id: "Sol#m7", root: 8, type: "chord_m7", lit: 4 },
];

/** AppDesktop's Dictionary wiring reduced to what the piano reads. */
function Session({ root, type, nothing, controls }) {
  const { notation, dispatch } = useAppContext();
  const dict = useDictionaryMode();

  useEffect(() => {
    dict.setDictRoot(root ?? 0);
    dict.setDictType(type ?? "chord_major");
    // Once, on mount: what DictionaryPanel's selectors do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const engine = useMusicEngine({
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: dict.dictRoot,
    dictType: nothing ? null : dict.dictType,
    dictActiveNotes: nothing ? [] : dict.activeNotes,
    dictOctave: dict.dictOctave,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });

  useEffect(() => {
    controls.current = { dispatch };
  });

  const value = {
    ...engine,
    appMode: "dictionary",
    activeBrick,
    dictType: nothing ? null : dict.dictType,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
    playbackInstrument: "piano",
  };

  return (
    <MusicEngineProvider value={value}>
      <PianoKeyboard orientation="vertical" />
    </MusicEngineProvider>
  );
}

/** Mounts one state; `notation` and `harmonic` are applied through the app's own reducer. */
function mount(state, { notation = "eu", harmonic = false } = {}) {
  const controls = { current: null };
  const { container } = render(
    <AppProvider>
      <Session root={state.root} type={state.type} nothing={state.nothing} controls={controls} />
    </AppProvider>
  );
  act(() => {
    if (notation !== "eu") controls.current.dispatch({ type: "SET_NOTATION", payload: notation });
    if (harmonic) controls.current.dispatch({ type: "SET_HARMONIC_MODE", payload: true });
  });
  return container;
}

const keysOf = (container) => Array.from(container.querySelectorAll(".piano-vertical .piano-key"));
const byPitch = (container, abs) => container.querySelector(`.piano-vertical .piano-key[data-abs="${abs}"]`);
const isLit = (el) => Array.from(el.classList).some((c) => c.startsWith("role-"));
const labelOf = (el) => el.querySelector(".note-label");
const text = (el) => (el?.textContent ?? "").trim();
/** The label's own parts, in order: a black key's sharp then its flat. */
const parts = (el) => Array.from(labelOf(el)?.children ?? []).map((c) => c.textContent.trim());

// MIDI, C4 = 60 (the app's own convention: midiToNoteName, getAbsoluteNoteValue).
const C2 = 36;
const C3 = 48;
const D_SHARP_3 = 51;
const C4 = 60;
const C5 = 72;

describe.each(STATES)("PianoKeyboard vertical, $id: every key is named (L1b-1a)", (state) => {
  it("has 49 keys (29 white, 20 black), each with a non-empty label", () => {
    const keys = mount(state).querySelectorAll(".piano-vertical .piano-key");
    expect(keys).toHaveLength(49);
    expect(Array.from(keys).filter((k) => k.classList.contains("white-key"))).toHaveLength(29);
    expect(Array.from(keys).filter((k) => k.classList.contains("black-key"))).toHaveLength(20);
    const unnamed = Array.from(keys).filter((k) => !text(labelOf(k)));
    expect(unnamed.map((k) => k.getAttribute("title"))).toEqual([]);
    expect(Array.from(keys).filter((k) => text(labelOf(k)))).toHaveLength(49);
  });

  it(`lights ${state.lit} key(s), the others stay unlit (premise of the anchors below)`, () => {
    const c = mount(state);
    expect(keysOf(c).filter(isLit)).toHaveLength(state.lit);
    // The keys the anchors read are not lit in this state.
    for (const abs of [C2, C3, D_SHARP_3, C5]) expect(isLit(byPitch(c, abs)), `pitch ${abs}`).toBe(false);
  });

  it.each([
    { notation: "eu", lowest: "Do2", sharpFlat: ["Ré#", "Mib"], c3: "Do3", c5: "Do5" },
    { notation: "us", lowest: "C2", sharpFlat: ["D#", "Eb"], c3: "C3", c5: "C5" },
  ])("names its keys in $notation notation (literal anchors)", ({ notation, lowest, sharpFlat, c3, c5 }) => {
    const c = mount(state, { notation });
    const pitches = keysOf(c).map((k) => Number(k.getAttribute("data-abs")));
    // The window of the default / Do majeur / Sol#m7 states is C2..C6.
    expect(Math.min(...pitches)).toBe(C2);
    expect(parts(byPitch(c, C2))).toEqual([lowest]);
    expect(parts(byPitch(c, D_SHARP_3))).toEqual(sharpFlat);
    expect(parts(byPitch(c, C3))).toEqual([c3]);
    expect(parts(byPitch(c, C5))).toEqual([c5]);
  });

  it("an unplayed key is quiet (note-label--unplayed); a played one is not", () => {
    const keys = keysOf(mount(state));
    for (const k of keys) {
      expect(labelOf(k).classList.contains("note-label--unplayed"), `${k.getAttribute("title")} @${k.getAttribute("data-abs")}`).toBe(!isLit(k));
    }
  });

  it("each unplayed C keeps its octave (Do2 ... Do6), the other unplayed keys carry the bare name", () => {
    const c = mount(state);
    const unplayedC = keysOf(c).filter((k) => !isLit(k) && Number(k.getAttribute("data-abs")) % 12 === 0);
    expect(unplayedC.length).toBeGreaterThanOrEqual(4);
    for (const k of unplayedC) {
      const octave = Number(k.getAttribute("data-abs")) / 12 - 1;
      expect(parts(k)).toEqual([`Do${octave}`]);
      expect(k.querySelector(".piano-octave-name")).not.toBeNull();
    }
    const unplayedWhite = keysOf(c).filter((k) => !isLit(k) && k.classList.contains("white-key") && Number(k.getAttribute("data-abs")) % 12 !== 0);
    for (const k of unplayedWhite) expect(parts(k)).toHaveLength(1);
    expect(parts(byPitch(c, C4)).join("")).not.toBe("");
  });
});

describe("PianoKeyboard vertical: a played key keeps its role colour and its label (L1b-1a)", () => {
  it("Do majeur: C4 E4 G4 read Do(1) Mi(3) Sol(5), as before", () => {
    const c = mount(STATES[1]);
    expect(keysOf(c).filter(isLit).map((k) => text(labelOf(k))).sort()).toEqual(["Do(1)", "Mi(3)", "Sol(5)"]);
    expect(keysOf(c).filter(isLit).every((k) => !labelOf(k).classList.contains("note-label--unplayed"))).toBe(true);
  });

  it("Sol#m7 in us notation: its four notes keep their labels", () => {
    const c = mount(STATES[2], { notation: "us" });
    const lit = keysOf(c).filter(isLit).map((k) => text(labelOf(k)));
    expect(lit).toHaveLength(4);
    expect(lit.every((t) => /^(G#|B|D#|F#)/.test(t))).toBe(true);
  });
});

describe("PianoKeyboard vertical, harmonic mode: only the unplayed keys are named (L1b-1a)", () => {
  it.each(STATES.slice(1))("$id: a lit key shows its rank line as before, an unplayed key shows its name alone", (state) => {
    const harmonicKeys = keysOf(mount(state, { harmonic: true }));
    const lit = harmonicKeys.filter(isLit);
    expect(lit).toHaveLength(state.lit);
    // The rank line takes the place of the name on a lit key (one line, "H<rank> ...¢").
    for (const k of lit) expect(text(labelOf(k)), k.getAttribute("title")).toMatch(/H\d+\s+[+-]?\d+¢/);
    // Every unplayed key is named, and only by its name: no rank, no cents.
    const unplayed = harmonicKeys.filter((k) => !isLit(k));
    expect(unplayed).toHaveLength(49 - state.lit);
    for (const k of unplayed) {
      expect(text(labelOf(k)), k.getAttribute("title")).not.toBe("");
      expect(text(labelOf(k))).not.toMatch(/H\d|¢/);
    }
    expect(parts(byPitch(harmonicKeys[0].closest(".piano-vertical"), D_SHARP_3))).toEqual(["Ré#", "Mib"]);
  });
});

describe("PianoKeyboard: the horizontal keyboard is not touched by L1b-1a", () => {
  it("carries no quiet label class", () => {
    const { container } = render(
      <AppProvider>
        <MusicEngineProvider value={{ realizationsByInstrument: { piano: [] } }}>
          <PianoKeyboard />
        </MusicEngineProvider>
      </AppProvider>
    );
    expect(container.querySelectorAll(".piano-container .piano-key").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".note-label--unplayed")).toHaveLength(0);
  });
});
