// VMU-160 — property over the whole chord catalog. For every chord of
// core/theory.js's CHORDS and every root (0-11), in Dictionary mode with the
// real hooks and the real PianoKeyboard / Fretboard(guitar) components (the
// app's default: playbackInstrument "piano", guitar fingering auto-selected),
// the guitar and the piano give each pitch class the same role.
//
// Only pitch classes lit on BOTH instruments are compared: a note the piano
// shows above its visible octaves, or a chord with no guitar fingering, is
// not a role disagreement. The test also asserts it really compared a
// non-trivial number of cases, so an empty comparison cannot pass.
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
import { CHORDS } from "../../core/theory";

afterEach(cleanup);

const activeBrick = BRICKS[0];

function Inner({ root, type }) {
  const dict = useDictionaryMode();
  const { dictRoot, setDictRoot, dictType, setDictType, dictOctave } = dict;
  React.useEffect(() => {
    setDictRoot(root);
    setDictType(type);
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
    playbackInstrument: "piano",
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

function rolesByPitchClass(elements) {
  const map = new Map();
  for (const el of elements) {
    const pc = el.getAttribute("title")?.split(" / ")[0];
    const roles = Array.from(el.classList).filter((c) => c.startsWith("role-"));
    if (!pc || roles.length === 0) continue;
    if (!map.has(pc)) map.set(pc, new Set());
    roles.forEach((r) => map.get(pc).add(r));
  }
  return map;
}

/** Renders one chord/root and returns { compared, divergences }. */
function probe(root, type) {
  const { container, unmount } = render(
    <AppProvider>
      <Inner root={root} type={type} />
    </AppProvider>,
  );
  const piano = rolesByPitchClass(container.querySelectorAll(".piano-key"));
  const guitar = rolesByPitchClass(
    container.querySelectorAll(".fretboard-container.instrument-guitar .note-marker"),
  );
  let compared = 0;
  const divergences = [];
  for (const [pc, pianoRoles] of piano) {
    if (!guitar.has(pc)) continue;
    compared++;
    const a = [...pianoRoles].sort().join(",");
    const b = [...guitar.get(pc)].sort().join(",");
    if (a !== b) divergences.push(`${type} root ${root} ${pc}: piano ${a} / guitar ${b}`);
  }
  unmount();
  return { compared, divergences };
}

describe("VMU-160 — catalog property: guitar and piano give each pitch class the same role", () => {
  it("every chord of CHORDS x every root", () => {
    let compared = 0;
    let cases = 0;
    const divergences = [];
    for (const type of Object.keys(CHORDS)) {
      for (let root = 0; root < 12; root++) {
        const r = probe(root, type);
        cases++;
        compared += r.compared;
        divergences.push(...r.divergences);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`VMU-160 catalog: ${cases} chord/root cases, ${compared} pitch classes compared, ${divergences.length} divergences`);
    if (divergences.length) console.log(divergences.join("\n")); // eslint-disable-line no-console
    expect(cases).toBe(Object.keys(CHORDS).length * 12);
    expect(compared).toBeGreaterThan(cases); // non-trivial comparison
    expect(divergences).toEqual([]);
  }, 120000);
});
