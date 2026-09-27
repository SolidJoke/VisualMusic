// VMU-160 — DOM probe. Renders the REAL useDictionaryMode + useMusicEngine
// hooks plus the REAL PianoKeyboard and Fretboard(guitar) components — no
// mocked music-engine values — for Sol#m7 (G#m7) in Dictionary mode, guitar
// fingering auto-selected (no selectedVoicingIndexGuitar override), exactly
// how a user opening the Dictionary and picking G#m7 would see it.
//
// Bug (S1 report, "Trouvé en passant", 2026-09-26; ticket text confirmed by
// the coordinator) — the b7 (F#) of G#m7 renders as "role-scale" (hollow
// dot) on the guitar and "role-extension" (filled violet) on the piano.
//
// Root cause [code, coordinator's reading confirmed by this test's own
// trace]: in Dictionary mode, `useFretboard.js`'s `activeNotes` is the
// SAME generic, `playbackInstrument`-keyed realization the piano reads
// (`useMusicEngine.js`'s `realization.notes`), NOT the guitar's own
// fingering-based realization (`realizationsByInstrument.guitar`, which
// DOES carry a correct order per note via `core/realization.js`). With
// `playbackInstrument` defaulting to "piano", that shared array's absolute
// pitches sit in the piano's theoretical register (baseOctave 4) — a
// register the guitar's real fretted notes (`resolveVoicingMask`, an
// octave or two lower) never match. `core/fretboardUtils.js`'s
// `resolveActiveState` then finds no `activeNote` for the guitar's b7, so
// `resolveRoleAndLabel` falls back to a raw-interval check that only
// recognises root(0)/third(3,4)/fifth(7) and labels everything else
// "role-scale" when active — the same family of bug as VMU-146
// (`getRoleForDegreeLabel`, single rule label -> role), this time in the
// fallback branch that runs when no order was found at all.
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { useDictionaryMode } from "../../hooks/useDictionaryMode";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import { BRICKS } from "../../core/bricks";

afterEach(cleanup);

const activeBrick = BRICKS[0];

function Harness() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}

function Inner() {
  const dict = useDictionaryMode();
  const { dictRoot, setDictRoot, dictType, setDictType, dictOctave } = dict;

  // Sol#m7 (G#m7): root=8, dictType="chord_m7". Set once, on mount — exactly
  // what DictionaryPanel's selectors do when a user picks root and type.
  React.useEffect(() => {
    setDictRoot(8);
    setDictType("chord_m7");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const musicState = useMusicEngine({
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
    dictRoot,
    dictType,
    dictActiveNotes: dict.activeNotes,
    dictOctave,
    notation: "us",
    playbackInstrument: "piano", // the real app's default (AppContext.jsx)
    targetNotesPreset: "off",
  });

  const value = {
    ...musicState,
    appMode: "dictionary",
    activeBrick,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    dictType,
    showFingering: false,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };

  return (
    <MusicEngineProvider value={value}>
      <PianoKeyboard />
      <Fretboard instrument="guitar" />
    </MusicEngineProvider>
  );
}

/** Active (role-carrying) piano keys whose title starts with `letter /`. */
function pianoRoles(container, letter) {
  return Array.from(container.querySelectorAll(".piano-key"))
    .filter((el) => el.getAttribute("title")?.startsWith(`${letter} /`))
    .map((el) => Array.from(el.classList).filter((c) => c.startsWith("role-")))
    .filter((roles) => roles.length > 0);
}

/** Active guitar fretboard markers whose title starts with `letter /`. */
function guitarRoles(container, letter) {
  const root = container.querySelector(".fretboard-container.instrument-guitar");
  return Array.from(root.querySelectorAll(".note-marker"))
    .filter((el) => el.getAttribute("title")?.startsWith(`${letter} /`))
    .map((el) => Array.from(el.classList).filter((c) => c.startsWith("role-")));
}

describe("VMU-160 — Sol#m7 (G#m7), Dictionary: guitar and piano agree on the b7's role", () => {
  it("F# (the b7) is role-extension on BOTH piano and guitar — not role-scale on the guitar", () => {
    const { container } = render(<Harness />);

    const pianoFSharp = pianoRoles(container, "F#");
    const guitarFSharp = guitarRoles(container, "F#");

    expect(pianoFSharp.length, "piano should show an active F# key").toBeGreaterThan(0);
    expect(guitarFSharp.length, "guitar should show an active F# marker (part of the m7_E fingering)").toBeGreaterThan(0);

    expect(pianoFSharp[0]).toEqual(["role-extension"]);
    for (const roles of guitarFSharp) {
      expect(roles, "guitar's F# (b7) must read the same role as the piano's").toEqual(["role-extension"]);
    }
  });
});
