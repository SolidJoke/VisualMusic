import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PrototypeA.css";
import PianoKeyboard from "../components/Instruments/PianoKeyboard";
import Fretboard from "../components/Instruments/Fretboard";
import SequencerPanel from "../components/Panels/SequencerPanel";
import TheoryLegend from "../components/Panels/TheoryLegend";
import { MusicEngineProvider } from "../context/MusicEngineContext";
import { PlaybackProvider } from "../context/PlaybackContext";
import { generateChordsFromNNS } from "../core/theory";
import { S1_SCENARIOS, S1_LABEL_MODES, S1_EXTRA_STATES } from "./s1Scenarios.js";

/**
 * S1 prototype — layout A′ at 3840px (VMU-135 / 035, VMU-155).
 *
 * A measuring bench, not the final screen: reached only through
 * `?prototype=a` (AppDesktop.jsx), linked nowhere in the interface. It
 * renders the REAL components over the REAL app state AppDesktop already
 * holds (dictionary selection, Studio timeline, label settings):
 *
 *   rail · centre (transport, current sequencer, legend) · vertical piano ·
 *   vertical guitar · vertical bass · assistant as a drawer laid over the
 *   instruments (the Studio / Dictionary panel of the "Studio & Harmonie"
 *   popup), never over the centre column.
 *
 * URL parameters (read once, applied through the app's own setters, so the
 * probe and Gabriel reach a scenario the same way):
 *   scenario = cmaj | gsm7 | cmajscale | apenta  (the four S1 scenarios)
 *   labels   = eu | us | fingers                 (label modes the app has)
 *   state    = an S1_EXTRA_STATES id (L1a: octave +3, Studio octave +2,
 *              harmonic mode); the Studio one waits for a first click on
 *              the page before its chord sounds (browser audio rule)
 *   drawer   = open
 *   bench    = 1  (L1a-fix1) draws the scenario / label-mode / state buttons.
 *              They are the S1 probe's fixtures — they put the page in a
 *              fixed state and do not follow what the user selects in
 *              Dictionary or Studio — so without it the page shows none.
 *              The three parameters above work with or without it.
 *
 * S1-15 (L1a, "toute note active a sa touche ou sa pastille"): each
 * instrument column carries what the engine asks it to show —
 * data-s1-notes on the piano (absolute pitches of the notes it is handed),
 * data-s1-positions on a neck ("string:fret" of the fingering it is handed)
 * — so the probe checks the drawing against the engine, not against itself.
 */

function readParams() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    scenario: p.get("scenario"),
    labels: p.get("labels"),
    state: p.get("state"),
    drawer: p.get("drawer"),
    bench: p.get("bench") === "1",
  };
}

/** "string:fret" of every sounding position of a fingering (chord grip or scale box). */
function fingeringPositions(fingering) {
  if (!fingering) return "";
  if (Array.isArray(fingering.scaleFrets)) {
    return fingering.scaleFrets.map((p) => `${p.stringIndex}:${p.fret}`).join(" ");
  }
  const map = fingering.fingeringMap || {};
  return Object.entries(map)
    .filter(([, s]) => s && (s.status === "played" || s.status === "open") && Number.isFinite(Number(s.fret)))
    .map(([stringIndex, s]) => `${stringIndex}:${s.fret}`)
    .join(" ");
}

export default function PrototypeA({
  txt,
  notation,
  setNotation,
  appMode,
  setAppMode,
  isPlaying,
  togglePlayback,
  playDictionaryAudio,
  currentBpm,
  handleBpmChange,
  metronomeOn,
  toggleMetronome,
  showFingerNumbers,
  setShowFingerNumbers,
  dictRoot,
  dictType,
  setDictRoot,
  setDictType,
  timeline,
  currentStep,
  activeBrick,
  chordOctaveOffset,
  musicEngineContextValue,
  playbackContextValue,
  drawerPanel,
  // L1a states (S1_EXTRA_STATES): the same setters the drawer's panels use.
  dictOctave = 0,
  setDictOctave,
  harmonicMode = false,
  setHarmonicMode,
  setChordOctaveOffset,
  activeProgression,
  clickedChord,
  handleChordClick,
}) {
  const [drawerOpen, setDrawerOpen] = useState(() => readParams().drawer === "open");
  // The probe's fixture buttons: read once, like the other URL parameters.
  const [bench] = useState(() => readParams().bench);
  // A Studio state's chord is clicked once the base octave it needs is in
  // place: handleChordClick reads the octave of the render it comes from.
  const pendingChordRef = useRef(null);
  const [chordRequest, setChordRequest] = useState(0);

  // The Studio's chord buttons (StudioPanel.jsx) are built the same way.
  const progressionChords = useMemo(
    () => (activeBrick ? generateChordsFromNNS(activeBrick.rootValue, activeBrick.scaleKey, activeProgression || []) : []),
    [activeBrick, activeProgression]
  );

  // A scenario is a whole Dictionary state: octave 0 and harmonic mode off
  // unless an L1a state asks otherwise.
  const applyScenario = (s, { octave = 0, harmonic = false } = {}) => {
    setAppMode("dictionary");
    setDictRoot(s.dictRoot);
    setDictType(s.dictType);
    if (setDictOctave) setDictOctave(octave);
    if (setHarmonicMode) setHarmonicMode(harmonic);
  };
  const applyLabels = (m) => {
    setNotation(m.notation);
    setShowFingerNumbers(m.fingers);
  };
  const applyExtraState = (x) => {
    if (x.studio) {
      setAppMode("studio");
      if (setHarmonicMode) setHarmonicMode(false);
      if (setChordOctaveOffset) setChordOctaveOffset(x.studio.chordOctaveOffset);
      pendingChordRef.current = x.studio;
      setChordRequest((n) => n + 1);
      return;
    }
    const s = S1_SCENARIOS.find((sc) => sc.id === x.scenario);
    if (s) applyScenario(s, { octave: x.dictOctave ?? 0, harmonic: Boolean(x.harmonic) });
  };

  // Once, on arrival: the URL's scenario (or L1a state) and label mode.
  useEffect(() => {
    const { scenario, labels, state } = readParams();
    const s = S1_SCENARIOS.find((x) => x.id === scenario);
    if (s) applyScenario(s);
    const x = S1_EXTRA_STATES.find((e) => e.id === state);
    if (x) applyExtraState(x);
    const m = S1_LABEL_MODES.find((x) => x.id === labels);
    if (m) applyLabels(m);
    // Deliberately once: later changes come from the page's own buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The pending Studio chord, once the mode and the base octave it needs are
  // the ones this render closed over.
  useEffect(() => {
    const pending = pendingChordRef.current;
    if (!pending || appMode !== "studio" || chordOctaveOffset !== pending.chordOctaveOffset) return;
    const chord = progressionChords[pending.chordIndex];
    pendingChordRef.current = null;
    if (chord && handleChordClick) handleChordClick(chord, pending.chordIndex);
  }, [chordRequest, appMode, chordOctaveOffset, progressionChords, handleChordClick]);

  const currentScenario =
    appMode === "dictionary" ? S1_SCENARIOS.find((s) => s.dictRoot === Number(dictRoot) && s.dictType === dictType) : null;
  const currentLabels = S1_LABEL_MODES.find((m) => m.notation === notation && m.fingers === Boolean(showFingerNumbers));
  const isExtraStateActive = (x) => {
    if (x.studio) {
      const chord = progressionChords[x.studio.chordIndex];
      return (
        appMode === "studio" &&
        chordOctaveOffset === x.studio.chordOctaveOffset &&
        Boolean(chord && clickedChord && clickedChord.nns === chord.nns)
      );
    }
    return (
      currentScenario?.id === x.scenario &&
      Number(dictOctave) === (x.dictOctave ?? 0) &&
      Boolean(harmonicMode) === Boolean(x.harmonic)
    );
  };

  // S1-15: what the engine hands each instrument (see the header comment).
  const s1Notes = (musicEngineContextValue?.activeNotes || [])
    .filter((n) => Number.isFinite(n?.absoluteValue))
    .map((n) => n.absoluteValue)
    .join(" ");
  const s1GuitarPositions = fingeringPositions(musicEngineContextValue?.guitarFingering);
  const s1BassPositions = fingeringPositions(musicEngineContextValue?.bassFingering);

  const handlePlay = () => {
    if (appMode === "dictionary" && playDictionaryAudio) playDictionaryAudio();
    else if (togglePlayback) togglePlayback();
  };

  return (
    <MusicEngineProvider value={musicEngineContextValue}>
      <PlaybackProvider value={playbackContextValue}>
        <div className="proto-a" data-prototype="a">
          <header className="proto-a__header">
            <div className="proto-a__title">VisualMusic</div>
            {/* The mode switch (it was the left rail): two tabs, right after the title. */}
            <nav className="proto-a__tabs" aria-label="Modes">
              <button
                type="button"
                className={`proto-a__tab ${appMode === "studio" ? "is-active" : ""}`}
                aria-label="Mode Studio"
                aria-pressed={appMode === "studio"}
                onClick={() => setAppMode("studio")}
              >
                Studio
              </button>
              <button
                type="button"
                className={`proto-a__tab ${appMode === "dictionary" ? "is-active" : ""}`}
                aria-label="Mode Dictionnaire"
                aria-pressed={appMode === "dictionary"}
                onClick={() => setAppMode("dictionary")}
              >
                {txt.sidebar?.dictionary || "Dictionnaire"}
              </button>
            </nav>
            <div className="proto-a__subtitle">Prototype A′ · banc de mesure S1</div>
            <div className="proto-a__spacer" />
            <button
              type="button"
              className={`proto-a__btn ${drawerOpen ? "is-active" : ""}`}
              aria-pressed={drawerOpen}
              data-testid="proto-drawer-toggle"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              Assistant · {appMode === "dictionary" ? (txt.sidebar?.dictionary || "Dictionnaire") : "Studio & Harmonie"}
            </button>
          </header>

          <div className="proto-a__grid">
            <main className="proto-a__center" data-s1="center">
              <section className="proto-a__panel proto-a__transport" data-s1="transport">
                <button type="button" className="proto-a__btn proto-a__btn--primary" onClick={handlePlay}>
                  {isPlaying ? "■ Arrêter" : appMode === "dictionary" ? "▶ Écouter" : "▶ Lire la progression"}
                </button>
                <span className="proto-a__muted">Tempo</span>
                <button
                  type="button"
                  className="proto-a__btn proto-a__btn--square"
                  aria-label="Tempo moins"
                  onClick={() => handleBpmChange(Math.max(60, currentBpm - 1))}
                >
                  −
                </button>
                <span className="proto-a__bpm">{currentBpm}</span>
                <button
                  type="button"
                  className="proto-a__btn proto-a__btn--square"
                  aria-label="Tempo plus"
                  onClick={() => handleBpmChange(Math.min(200, currentBpm + 1))}
                >
                  +
                </button>
                <span className="proto-a__muted">battements / min</span>
                <button type="button" className="proto-a__btn" aria-pressed={metronomeOn} onClick={toggleMetronome}>
                  Métronome : {metronomeOn ? "actif" : "coupé"}
                </button>
              </section>

              {/* The probe's fixtures (bench=1 only): see the header comment. */}
              {bench && (
                <section className="proto-a__panel proto-a__controls" data-s1="scenarios">
                  <span className="proto-a__muted">Scénarios S1</span>
                  {S1_SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`proto-a__btn ${currentScenario?.id === s.id ? "is-active" : ""}`}
                      data-scenario={s.id}
                      onClick={() => applyScenario(s)}
                    >
                      {s.label}
                    </button>
                  ))}
                  <div className="proto-a__spacer" />
                  <span className="proto-a__muted">Sur les notes</span>
                  {S1_LABEL_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`proto-a__btn ${currentLabels?.id === m.id ? "is-active" : ""}`}
                      data-labels={m.id}
                      onClick={() => applyLabels(m)}
                    >
                      {m.label}
                    </button>
                  ))}
                </section>
              )}

              {bench && (
                <section className="proto-a__panel proto-a__controls" data-s1="states">
                  <span className="proto-a__muted">États L1a</span>
                  {S1_EXTRA_STATES.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={`proto-a__btn ${isExtraStateActive(x) ? "is-active" : ""}`}
                      data-state={x.id}
                      onClick={() => applyExtraState(x)}
                    >
                      {x.label}
                    </button>
                  ))}
                </section>
              )}

              <section className="proto-a__sequencer" data-s1="sequencer">
                <SequencerPanel
                  timeline={timeline}
                  currentStep={currentStep}
                  currentBpm={currentBpm}
                  activeBrick={activeBrick}
                  chordOctaveOffset={chordOctaveOffset}
                />
              </section>

              <section className="proto-a__legend" data-s1="legend">
                <TheoryLegend />
              </section>
            </main>

            <section className="proto-a__instrument" data-s1="piano" data-s1-notes={s1Notes} aria-label="Piano">
              <div className="proto-a__inst-head">
                <span className="proto-a__inst-title">{txt.instrumentPiano || "Piano"}</span>
                <span className="proto-a__muted">aigus ↑</span>
              </div>
              <PianoKeyboard orientation="vertical" />
            </section>

            <section className="proto-a__instrument" data-s1="guitar" data-s1-positions={s1GuitarPositions} aria-label="Guitare">
              <div className="proto-a__inst-head">
                <span className="proto-a__inst-title">{txt.instrumentGuitar || "Guitare"}</span>
                <span className="proto-a__muted">sillet en haut, graves à gauche</span>
              </div>
              <Fretboard instrument="guitar" orientation="vertical" />
            </section>

            <section className="proto-a__instrument" data-s1="bass" data-s1-positions={s1BassPositions} aria-label="Basse">
              <div className="proto-a__inst-head">
                <span className="proto-a__inst-title">{txt.instrumentBass || "Basse"}</span>
                <span className="proto-a__muted">sillet en haut, graves à gauche</span>
              </div>
              <Fretboard instrument="bass" orientation="vertical" />
            </section>
          </div>

          {drawerOpen && (
            <aside className="proto-a__drawer" data-s1="drawer" aria-label="Assistant">
              <div className="proto-a__drawer-head">
                <span className="proto-a__inst-title">
                  {appMode === "dictionary" ? (txt.sidebar?.dictionary || "Dictionnaire") : "Studio & Harmonie"}
                </span>
                <div className="proto-a__spacer" />
                <button type="button" className="proto-a__btn" onClick={() => setDrawerOpen(false)}>
                  Fermer
                </button>
              </div>
              <div className="proto-a__drawer-body">{drawerPanel}</div>
            </aside>
          )}
        </div>
      </PlaybackProvider>
    </MusicEngineProvider>
  );
}
