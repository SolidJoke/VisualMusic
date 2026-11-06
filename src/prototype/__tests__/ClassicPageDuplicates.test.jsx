// VMU-216 — the classic page keeps the nine controls that A′ omits (A′ reaches
// each directly: SelectionRow, the piano head, the transport). The panels are
// rendered here WITHOUT the omitDirect prop (its default, false, is the classic
// page's own), so what is asserted is exactly the classic copies: the Studio's
// style and base octave, the Dictionary's root / family / octave and its chord /
// scale type, the played instrument and the master volume.
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import StudioPanel from "../../components/Panels/StudioPanel";
import DictionaryPanel from "../../components/Panels/DictionaryPanel";
import ControlPanel from "../../components/Panels/ControlPanel";
import PlaybackPanel from "../../components/Panels/PlaybackPanel";
import { BRICKS } from "../../core/bricks";
import { translations } from "../../i18n/translations";

const noop = () => {};
const fr = translations.fr;

afterEach(() => cleanup());

describe("VMU-216: the classic page keeps the nine controls", () => {
  it("the Studio's style and base octave are there without the prop", () => {
    const page = render(
      <AppProvider>
        <StudioPanel
          currentBrickIndex={0}
          setCurrentBrickIndex={noop}
          activeBrick={BRICKS[0]}
          currentTheme="A"
          setCurrentTheme={noop}
          chordOctaveOffset={0}
          setChordOctaveOffset={noop}
          setCurrentAbsoluteNotes={noop}
          activeProgression={BRICKS[0].nnsProgression}
          clickedChord={null}
          setClickedChord={noop}
          handleChordClick={noop}
          inversionText=""
          suggestedBassTrack={null}
          setSuggestedBassTrack={noop}
          setCustomProgression={noop}
          customRhythm={null}
          setCustomRhythm={noop}
          targetNotesPreset="majorMinor"
          setTargetNotesPreset={noop}
        />
      </AppProvider>
    ).container;
    expect(page.querySelector('[data-testid="studio-style"]'), "the style select").not.toBeNull();
    expect(page.querySelector('[data-testid="studio-octave"]'), "the base octave").not.toBeNull();
  });

  it("the Dictionary's root, family and octave are there for Chords, with the chord type", () => {
    const page = render(
      <AppProvider>
        <DictionaryPanel
          dictRoot={0}
          setDictRoot={noop}
          dictType="chord_major"
          setDictType={noop}
          playDictionaryAudio={noop}
          isPlaying={false}
          guitarFingering={null}
          bassFingering={null}
          harmonicMode={false}
          setHarmonicMode={noop}
          dictOctave={0}
          setDictOctave={noop}
          targetNotesPreset="majorMinor"
          setTargetNotesPreset={noop}
        />
      </AppProvider>
    ).container;
    expect(page.querySelector('[data-testid="select-root-note"]'), "the root note").not.toBeNull();
    expect(page.querySelector('[data-testid="select-family"]'), "the family").not.toBeNull();
    expect(page.querySelector('[data-testid="select-octave"]'), "the octave").not.toBeNull();
    expect(page.querySelector('[data-testid="select-chord-type"]'), "the chord type").not.toBeNull();
  });

  it("the Dictionary's root, family and octave are there for Scales, with the scale type", () => {
    const page = render(
      <AppProvider>
        <DictionaryPanel
          dictRoot={0}
          setDictRoot={noop}
          dictType="scale_major"
          setDictType={noop}
          playDictionaryAudio={noop}
          isPlaying={false}
          guitarFingering={null}
          bassFingering={null}
          harmonicMode={false}
          setHarmonicMode={noop}
          dictOctave={0}
          setDictOctave={noop}
          targetNotesPreset="majorMinor"
          setTargetNotesPreset={noop}
        />
      </AppProvider>
    ).container;
    expect(page.querySelector('[data-testid="select-root-note"]'), "the root note").not.toBeNull();
    expect(page.querySelector('[data-testid="select-family"]'), "the family").not.toBeNull();
    expect(page.querySelector('[data-testid="select-octave"]'), "the octave").not.toBeNull();
    expect(page.querySelector('[data-testid="select-scale-type"]'), "the scale type").not.toBeNull();
  });

  it("Instruments & Audio keeps the played instrument and the master volume", () => {
    const page = render(
      <AppProvider>
        <ControlPanel
          showFingering={false}
          setShowFingering={noop}
          showFingerNumbers={false}
          setShowFingerNumbers={noop}
          playbackInstrument="piano"
          setPlaybackInstrument={noop}
          appMode="studio"
          useShellVoicings={false}
          setUseShellVoicings={noop}
        />
        <PlaybackPanel
          appMode="studio"
          isPlaying={false}
          masterVolume={-12}
          setMasterVolume={noop}
          currentBpm={100}
          instrumentVolumes={{ kick: 0, snare: 0, hat: 0, bass: 0, piano: 0, guitar: 0 }}
          handleInstrumentVolumeChange={noop}
          displayMode="chord"
          setDisplayMode={noop}
          fretboardZone="all"
          setFretboardZone={noop}
          txt={fr}
        />
      </AppProvider>
    ).container;
    expect(page.querySelector('[data-testid="select-instrument"]'), "the played instrument").not.toBeNull();
    expect(page.querySelector('[data-testid="select-master-volume"]'), "the master volume").not.toBeNull();
  });
});
