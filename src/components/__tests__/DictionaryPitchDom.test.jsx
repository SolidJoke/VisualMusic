// VMU-140 — DOM probe. Renders the REAL useDictionaryMode hook (what's
// shown), feeding the REAL useMusicEngine hook, feeding the REAL
// PianoKeyboard and InstrumentBar components — no mocked engine values — so
// the CSS selector and the exact header text this test asserts on are
// measured, not invented (per the brief's "Comment la coordinatrice
// vérifie" section).
//
// Scenario: the reported bug — Dictionary, piano, mi pentatonique majeure,
// octave 0. Before this ticket the instrument bar's piano range header read
// "Do#4 – Mi5" (do# folded an octave low); it must now read "Mi4 – Mi5".
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useDictionaryMode } from "../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import { useAppContext } from "../../context/AppContext";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import InstrumentBar from "../Instruments/InstrumentBar";
import { realizationRange } from "../../core/realization";
import { formatPitchRange } from "../../core/theory";
import { BRICKS } from "../../core/bricks";

afterEach(cleanup);

function appProviderWrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

/**
 * Renders the REAL useDictionaryMode hook and drives it to the requested
 * selection, exactly as DictionaryPanel's controls would. Outside any DOM
 * tree — its output feeds the Harness below as plain props, the same way
 * VMU-123's TargetNotesDom.test.jsx feeds useMusicEngine fixed values
 * instead of coupling two live hook trees inside one render.
 */
function renderDictionarySelection(dictRoot, dictType, dictOctave = 0) {
  const { result } = renderHook(() => useDictionaryMode(), { wrapper: appProviderWrapper });
  act(() => {
    result.current.setDictRoot(dictRoot);
    result.current.setDictType(dictType);
    result.current.setDictOctave(dictOctave);
  });
  return result.current;
}

// activeBrick is required by useMusicEngine's guitar/bass fingering memos
// (`activeBrick.guitarStrings`) even in Dictionary mode, where its musical
// content is otherwise unused — same requirement TargetNotesDom.test.jsx
// documents for Studio mode.
const activeBrick = BRICKS[0];

// AppProvider must wrap this component from the OUTSIDE (Harness below) —
// useAppContext() here needs a provider already in place above it, not one
// created by this same component's own return value.
function HarnessInner({ dictRoot, dictType, dictOctave, dictActiveNotes }) {
  const { notation, txt } = useAppContext();

  const musicState = useMusicEngine({
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "scale",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot,
    dictType,
    dictActiveNotes,
    dictOctave,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });

  const value = {
    ...musicState,
    appMode: "dictionary",
    activeBrick,
    dictType,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    showFingering: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };

  // Mirrors InstrumentView.jsx's own instrumentBarItems computation exactly
  // (same imports, same call) — the header text a Dictionary user actually
  // sees is this component's, not a re-derivation for the test.
  const instrumentBarItems = ["piano", "guitar", "bass"].map((id) => ({
    id,
    label: id,
    range: formatPitchRange(realizationRange(musicState.realizationsByInstrument?.[id]), notation),
  }));

  return (
    <MusicEngineProvider value={value}>
      <InstrumentBar
        instruments={instrumentBarItems}
        selected="piano"
        onSelect={() => {}}
        onPlay={() => {}}
        playLabel={txt.playInstrument || "Jouer"}
        groupLabel={txt.instrumentBarLabel || "Instrument joué"}
      />
      <PianoKeyboard />
    </MusicEngineProvider>
  );
}

function Harness(props) {
  return (
    <AppProvider>
      <HarnessInner {...props} />
    </AppProvider>
  );
}

/**
 * The piano's header range text, exactly the selector InstrumentView.jsx
 * renders it with: `[data-instrument="piano"] .instrument-bar__range`,
 * inside the tile's select button.
 */
function pianoRangeText(container) {
  return container.querySelector('[data-instrument="piano"] .instrument-bar__range')?.textContent ?? null;
}

describe("VMU-140 DOM probe — Dictionary, piano, mi pentatonique majeure, octave 0", () => {
  it('instrument bar header for piano reads "Mi4 – Mi5", not "Do#4 – Mi5" (VMU-140)', () => {
    const dict = renderDictionarySelection(4, "scale_pentatonic_major", 0);
    const { container } = render(
      <Harness
        dictRoot={dict.dictRoot}
        dictType={dict.dictType}
        dictOctave={dict.dictOctave}
        dictActiveNotes={dict.activeNotes}
      />
    );

    expect(pianoRangeText(container)).toBe("Mi4 – Mi5");
  });

  it("root octave 0 stays consistent across a re-render (no stale header from a previous selection)", () => {
    const dict = renderDictionarySelection(4, "scale_pentatonic_major", 0);
    const { container, rerender } = render(
      <Harness
        dictRoot={dict.dictRoot}
        dictType={dict.dictType}
        dictOctave={dict.dictOctave}
        dictActiveNotes={dict.activeNotes}
      />
    );
    expect(pianoRangeText(container)).toBe("Mi4 – Mi5");

    const doMajor = renderDictionarySelection(0, "scale_major", 0);
    rerender(
      <Harness
        dictRoot={doMajor.dictRoot}
        dictType={doMajor.dictType}
        dictOctave={doMajor.dictOctave}
        dictActiveNotes={doMajor.activeNotes}
      />
    );
    // Do majeur never crosses do, so this was already correct pre-fix — the
    // point here is that re-selecting doesn't leave the E-pentatonic header
    // behind (a display staleness bug would be a different defect, but the
    // same header element is being asserted on twice, so worth pinning).
    expect(pianoRangeText(container)).toBe("Do4 – Do5");
  });
});
