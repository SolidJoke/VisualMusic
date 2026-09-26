import React, { useEffect, useState } from "react";
import "./PrototypeA.css";
import PianoKeyboard from "../components/Instruments/PianoKeyboard";
import Fretboard from "../components/Instruments/Fretboard";
import SequencerPanel from "../components/Panels/SequencerPanel";
import TheoryLegend from "../components/Panels/TheoryLegend";
import { MusicEngineProvider } from "../context/MusicEngineContext";
import { PlaybackProvider } from "../context/PlaybackContext";
import { S1_SCENARIOS, S1_LABEL_MODES } from "./s1Scenarios.js";

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
 *   drawer   = open
 */

function readParams() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return { scenario: p.get("scenario"), labels: p.get("labels"), drawer: p.get("drawer") };
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
}) {
  const [drawerOpen, setDrawerOpen] = useState(() => readParams().drawer === "open");

  const applyScenario = (s) => {
    setAppMode("dictionary");
    setDictRoot(s.dictRoot);
    setDictType(s.dictType);
  };
  const applyLabels = (m) => {
    setNotation(m.notation);
    setShowFingerNumbers(m.fingers);
  };

  // Once, on arrival: the URL's scenario and label mode.
  useEffect(() => {
    const { scenario, labels } = readParams();
    const s = S1_SCENARIOS.find((x) => x.id === scenario);
    if (s) applyScenario(s);
    const m = S1_LABEL_MODES.find((x) => x.id === labels);
    if (m) applyLabels(m);
    // Deliberately once: later changes come from the page's own buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentScenario =
    appMode === "dictionary" ? S1_SCENARIOS.find((s) => s.dictRoot === Number(dictRoot) && s.dictType === dictType) : null;
  const currentLabels = S1_LABEL_MODES.find((m) => m.notation === notation && m.fingers === Boolean(showFingerNumbers));

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
            <nav className="proto-a__rail" aria-label="Modes">
              <button
                type="button"
                className={`proto-a__rail-btn ${appMode === "studio" ? "is-active" : ""}`}
                onClick={() => setAppMode("studio")}
              >
                Studio
              </button>
              <button
                type="button"
                className={`proto-a__rail-btn ${appMode === "dictionary" ? "is-active" : ""}`}
                onClick={() => setAppMode("dictionary")}
              >
                Dico
              </button>
            </nav>

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

            <section className="proto-a__instrument" data-s1="piano" aria-label="Piano">
              <div className="proto-a__inst-head">
                <span className="proto-a__inst-title">{txt.instrumentPiano || "Piano"}</span>
                <span className="proto-a__muted">aigus ↑</span>
              </div>
              <PianoKeyboard orientation="vertical" />
            </section>

            <section className="proto-a__instrument" data-s1="guitar" aria-label="Guitare">
              <div className="proto-a__inst-head">
                <span className="proto-a__inst-title">{txt.instrumentGuitar || "Guitare"}</span>
                <span className="proto-a__muted">sillet en haut, graves à gauche</span>
              </div>
              <Fretboard instrument="guitar" orientation="vertical" />
            </section>

            <section className="proto-a__instrument" data-s1="bass" aria-label="Basse">
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
