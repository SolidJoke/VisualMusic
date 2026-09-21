// VMU-146 — DOM probe. Renders the REAL useMusicEngine hook plus the REAL
// PianoKeyboard and Fretboard (guitar) components — no mocked music-engine
// values — so the CSS classes/labels this test asserts on are measured, not
// invented (per the brief's "Definition de terminé").
//
// Bug: at Studio arrival (nothing clicked, default style), the default-triad
// fallback in useMusicEngine.js wrote `order` as the note's RANK in the
// triad (1, 2, 3) instead of its harmonic DEGREE. Both PianoKeyboard.jsx and
// core/fretboardUtils.js read `order` as a degree, so the 3rd (rank 2)
// coloured role-extension and the 5th (rank 3) coloured role-third —
// exactly what the coordinator observed in the browser 2026-09-21 (Mi
// role-extension "2" violet, Sol role-third "3" vert).
//
// Scenario: BRICKS[0] "Pop Moderne (4 Accords)" — do majeur, scale_major —
// is the exact brick the coordinator's report names. clickedChord: null,
// isPlaying: false is "Studio at rest, default style, nothing clicked".
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import { BRICKS } from "../../core/bricks";

afterEach(cleanup);

const activeBrick = BRICKS[0]; // do majeur, scale_major (see file header)

function Harness({ clickedChord = null, currentAbsoluteNotes = [], targetNotesPreset = "majorMinor" }) {
  const musicState = useMusicEngine({
    appMode: "studio",
    activeBrick,
    clickedChord,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes,
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: 0,
    dictType: null,
    dictActiveNotes: [],
    dictOctave: 0,
    notation: "us",
    playbackInstrument: "piano",
    targetNotesPreset, // "majorMinor" (real app default, AppContext.jsx) unless overridden
  });

  const value = {
    ...musicState,
    appMode: "studio",
    activeBrick,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    dictType: null,
    showFingering: false,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };

  return (
    <AppProvider>
      <MusicEngineProvider value={value}>
        <PianoKeyboard />
        <Fretboard instrument="guitar" />
      </MusicEngineProvider>
    </AppProvider>
  );
}

/** Active (role-carrying) piano keys whose title starts with `letter /`, with their role class and displayed degree label. */
function pianoNoteInfo(container, letter) {
  return Array.from(container.querySelectorAll(".piano-key"))
    .filter((el) => el.getAttribute("title")?.startsWith(`${letter} /`))
    .map((el) => ({
      roleClasses: Array.from(el.classList).filter((c) => c.startsWith("role-")),
      order: el.querySelector(".note-order")?.textContent?.replace(/[()]/g, "") ?? null,
    }))
    .filter((k) => k.roleClasses.length > 0);
}

/** Active (role-carrying) guitar fretboard markers whose title starts with `letter /`, with their role class and label. */
function guitarNoteInfo(container, letter) {
  const root = container.querySelector(".fretboard-container.instrument-guitar");
  return Array.from(root.querySelectorAll(".note-marker"))
    .filter((el) => el.getAttribute("title")?.startsWith(`${letter} /`))
    .map((el) => ({
      roleClasses: Array.from(el.classList).filter((c) => c.startsWith("role-")),
      label: el.textContent,
    }));
}

describe("VMU-146 DOM probe — Studio arrival, nothing clicked, default triad (do mi sol)", () => {
  it("piano: do is role-root \"1\", mi is role-third \"3\" (not role-extension \"2\"), sol is role-fifth \"5\" (not role-third \"3\")", () => {
    const { container } = render(<Harness />);

    const doInfo = pianoNoteInfo(container, "C");
    expect(doInfo.length).toBeGreaterThan(0);
    for (const k of doInfo) {
      expect(k.roleClasses).toEqual(["role-root"]);
      expect(k.order).toBe("1");
    }

    const miInfo = pianoNoteInfo(container, "E");
    expect(miInfo.length).toBeGreaterThan(0);
    for (const k of miInfo) {
      expect(k.roleClasses).toEqual(["role-third"]);
      expect(k.order).toBe("3");
    }

    const solInfo = pianoNoteInfo(container, "G");
    expect(solInfo.length).toBeGreaterThan(0);
    for (const k of solInfo) {
      expect(k.roleClasses).toEqual(["role-fifth"]);
      expect(k.order).toBe("5");
    }
  });

  it("guitar fretboard: same roles as the piano — do root, mi third, sol fifth", () => {
    const { container } = render(<Harness />);

    const doInfo = guitarNoteInfo(container, "C");
    expect(doInfo.length).toBeGreaterThan(0);
    for (const m of doInfo) expect(m.roleClasses).toEqual(["role-root"]);

    const miInfo = guitarNoteInfo(container, "E");
    expect(miInfo.length).toBeGreaterThan(0);
    for (const m of miInfo) expect(m.roleClasses).toEqual(["role-third"]);

    const solInfo = guitarNoteInfo(container, "G");
    expect(solInfo.length).toBeGreaterThan(0);
    for (const m of solInfo) expect(m.roleClasses).toEqual(["role-fifth"]);
  });
});

// TDD point 3 of the brief — a clicked minor chord and a clicked augmented
// chord must colour identically on the piano and the guitar neck (the
// divergence the ticket's "second defaut" names: equality vs inclusion used
// to disagree on "b3"/"#5"). Absolute pitches below are hand-picked so their
// semitone-from-root matches the chord's own semitone table
// (core/theory.js resolveChordSemitones: chord_minor [0,3,7], chord_aug
// [0,4,8]) — see useMusicEngine.js:114-122's `effectiveAbsoluteNotes.map`.
describe("VMU-146 DOM probe — clicked minor chord (la mineur): piano and guitar agree", () => {
  const laMineur = { rootNote: { value: 9 }, nns: "m" }; // la mineur -> chord_minor
  const notes = [57, 60, 64]; // A3 (root), C4 (b3, semi 3), E4 (5, semi 7)

  it("the 3rd (do) and the 5th (mi) get the same role class on piano and guitar", () => {
    // targetNotesPreset "off": with a chord clicked, "majorMinor" marks the
    // chord's OWN third as role-target (VMU-123, correct, unrelated to this
    // ticket) — that would mask the very role-third class this test checks.
    const { container } = render(
      <Harness clickedChord={laMineur} currentAbsoluteNotes={notes} targetNotesPreset="off" />
    );

    const pianoThird = pianoNoteInfo(container, "C"); // b3 of A minor
    const guitarThird = guitarNoteInfo(container, "C");
    expect(pianoThird.length).toBeGreaterThan(0);
    expect(guitarThird.length).toBeGreaterThan(0);
    expect(pianoThird[0].roleClasses).toEqual(["role-third"]);
    for (const m of guitarThird) expect(m.roleClasses).toEqual(pianoThird[0].roleClasses);

    const pianoFifth = pianoNoteInfo(container, "E"); // 5th of A minor
    const guitarFifth = guitarNoteInfo(container, "E");
    expect(pianoFifth.length).toBeGreaterThan(0);
    expect(guitarFifth.length).toBeGreaterThan(0);
    expect(pianoFifth[0].roleClasses).toEqual(["role-fifth"]);
    for (const m of guitarFifth) expect(m.roleClasses).toEqual(pianoFifth[0].roleClasses);
  });
});

describe("VMU-146 DOM probe — clicked augmented chord: piano and guitar agree", () => {
  const doAug = { rootNote: { value: 0 }, nns: "aug" }; // do augmenté -> chord_aug
  const notes = [60, 64, 68]; // C4 (root), E4 (3, semi 4), G#4 (#5, semi 8)

  it("the 3rd (mi) and the augmented 5th (sol#) get the same role class on piano and guitar, whatever it is", () => {
    const { container } = render(
      <Harness clickedChord={doAug} currentAbsoluteNotes={notes} targetNotesPreset="off" />
    );

    const pianoThird = pianoNoteInfo(container, "E");
    const guitarThird = guitarNoteInfo(container, "E");
    expect(pianoThird.length).toBeGreaterThan(0);
    expect(guitarThird.length).toBeGreaterThan(0);
    for (const m of guitarThird) expect(m.roleClasses).toEqual(pianoThird[0].roleClasses);

    // Augmented 5th (G#): getChordIntervalLabel(2, 8) has no explicit case
    // and falls through to its own index+2 fallback (pre-existing, out of
    // VMU-146's scope) — this test does not assert WHICH role that becomes,
    // only that piano and guitar, both driven by the single rule, agree.
    const pianoFifth = pianoNoteInfo(container, "G#");
    const guitarFifth = guitarNoteInfo(container, "G#");
    expect(pianoFifth.length).toBeGreaterThan(0);
    expect(guitarFifth.length).toBeGreaterThan(0);
    for (const m of guitarFifth) expect(m.roleClasses).toEqual(pianoFifth[0].roleClasses);
  });
});
