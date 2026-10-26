import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PrototypeA.css";
import PianoKeyboard from "../components/Instruments/PianoKeyboard";
import Fretboard from "../components/Instruments/Fretboard";
import SequencerPanel from "../components/Panels/SequencerPanel";
import TheoryLegend from "../components/Panels/TheoryLegend";
import AudioVisualizer from "../components/Visualizer/AudioVisualizer";
import { HeaderActions } from "../components/Layout/AppHeader";
import { MusicEngineProvider } from "../context/MusicEngineContext";
import { PlaybackProvider } from "../context/PlaybackContext";
import { generateChordsFromNNS, formatPitchRange, midiToDisplayName } from "../core/theory";
import { realizationRange } from "../core/realization";
import { placementLabel, stepPlacement } from "../components/Instruments/placementLabel";
import { translations } from "../i18n/translations";
import { useBpmEditor } from "../hooks/useBpmEditor";
import { S1_SCENARIOS, S1_LABEL_MODES, S1_EXTRA_STATES } from "./s1Scenarios.js";
import InstrumentHead from "./InstrumentHead";
import PositionPanel from "./PositionPanel";
import { positionPanelView } from "../components/Instruments/positionPanel";
import SelectionRow from "./SelectionRow";

/**
 * S1 prototype — layout A′ at 3840px (VMU-135 / 035, VMU-155).
 *
 * A measuring bench, not the final screen: reached only through
 * `?prototype=a` (AppDesktop.jsx), linked nowhere in the interface. It
 * renders the REAL components over the REAL app state AppDesktop already
 * holds (dictionary selection, Studio timeline, label settings):
 *
 *   header (title, the two mode tabs, the label modes, the drawer button) ·
 *   centre (transport, current sequencer, legend) · vertical piano ·
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
 *   bench    = 1  (L1a-fix1) draws the scenario and L1a-state buttons. They
 *              are the S1 probe's fixtures — they put the page in a fixed
 *              state and do not follow what the user selects in Dictionary
 *              or Studio — so without it the page shows none. The label-mode
 *              buttons are NOT fixtures: a real function, in the header
 *              whatever the URL says. The parameters above work with or
 *              without bench.
 *
 * S1-15 (L1a, "toute note active a sa touche ou sa pastille"): each
 * instrument column carries what the engine asks it to show —
 * data-s1-notes on the piano (absolute pitches of its own realization, INST-A1),
 * data-s1-positions on a neck ("string:fret" of the fingering it is handed)
 * — so the probe checks the drawing against the engine, not against itself.
 *
 * A′-ACCÈS (Gabriel, 2026-10-06: "il manque toujours des features comme le
 * volume"): every function of the classic design is reachable here, in a
 * PROVISIONAL place, through the classic components themselves —
 *   header: the classic HeaderActions (Guide, Theory, language, About; the
 *     Debug export in the development build only), without its note-name
 *     toggle, which "Sur les notes" already is;
 *   transport: the tempo typed on a click (hooks/useBpmEditor.js, the
 *     sidebar badge's own logic), the master volume on the setter the
 *     "Instruments & Audio" window uses (VMU-025: a reader, not a new
 *     writer), the "Math & Rythmes" and "Instruments & Audio" buttons, which
 *     open the classic Modal windows AppDesktop builds once for both pages;
 *   the audio visualizer as a 60px band under the transport;
 *   Escape closes the drawer, unless a window is open over it (Escape then
 *     closes the window only).
 * Every interactive element carries its parity-registry name (data-fn,
 * src/prototype/aPrimeAccess.js), and every label comes from translations.js
 * (protoA, VMU-182) — the French table when `txt` has none (the unit tests).
 * The dock and zone B come later: not built here.
 *
 * L1b-1b — the column heads (InstrumentHead.jsx, 100px, two rows): the
 * instrument's name chooses the instrument that sounds, in both modes; ▶ plays
 * it (Dictionary only, playInstrument(id)); under them the instrument's own
 * setting. The piano's ‹ Octave ›: in the Dictionary the common octave, which
 * on this page sets the piano alone (AppDesktop passes pianoOwnsOctave: the
 * necks' default position no longer follows it, C-06 cut), its label the
 * piano's range. In the Studio (VMU-186, Gabriel's option B) the piano head has
 * no setting: the "Octave de base" of the Studio window - which also moves the
 * loop's chords and the MIDI export - is "Octave des accords" in the selection
 * row (SelectionRow.jsx), its label the base octave's C, its tooltip saying
 * those effects. The necks' ‹ Position ›: INST-B1's list (placementLabel.js, the
 * classic PositionSelector's words and cycle), shown when the fingering is
 * (showFingering); in the Studio the shape shown, read-only (the Studio does
 * not read the index). L1b-1c: that label is a button (the panel below) once
 * there is something to show. The captions ("aigus ↑", the neck's) are the columns'
 * tooltip and accessible name.
 *
 * VMU-185 — the direct selectors (SelectionRow.jsx): a second row of the
 * transport block, under the tempo / metronome / volume row, holds the Studio's
 * style menu, or the Dictionary's family, root note and chord / scale type.
 * Gabriel (2026-10-10): the Assistant drawer hides the necks, and he changes
 * style, note or structure "sans quitter le clavier ou les manches". The lists
 * and the family rule are src/core/selectionOptions.js's, shared with the
 * drawer's panels; the state and setters are the drawer's.
 */

/** The parity registry's name for each label-mode button (S1_LABEL_MODES ids). */
const LABEL_MODE_FN = {
  eu: "nav.noms-notes-eu",
  us: "nav.noms-notes-us",
  fingers: "nav.etiquettes-doigts",
};

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
  // VMU-126: the header tabs go through this when given (it asks before edits
  // are lost); applyScenario keeps the raw setAppMode above.
  onRequestAppMode,
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
  setCurrentAbsoluteNotes,
  activeProgression,
  clickedChord,
  handleChordClick,
  // A′-ACCÈS (see the header comment).
  headerProps,
  modals = null,
  modalOpen = false,
  onOpenMath,
  onOpenAudio,
  masterVolume = -12,
  setMasterVolume,
  // VMU-185: the direct selectors (SelectionRow.jsx) - the page's language and
  // the Studio's style, on the same state and setters the drawer's panels use.
  lang = "fr",
  currentBrickIndex,
  setCurrentBrickIndex,
}) {
  // Every label of the page (VMU-182). The French table stands in when the
  // caller hands no translations (the unit tests render with txt={}).
  const T = txt && txt.protoA ? txt.protoA : translations.fr.protoA;
  const [drawerOpen, setDrawerOpen] = useState(() => readParams().drawer === "open");
  const bpmEditor = useBpmEditor({ currentBpm, onCommit: handleBpmChange });

  // Escape closes the drawer, like the classic windows — but not when it
  // belongs to something on top of it: a window open over the drawer (it
  // closes alone, Modal.jsx / HelpModal.jsx / useEscapeKey.js), an open list
  // (CustomSelect closes it alone), a field being typed in (the tempo field
  // cancels). Listened to on `window` in the capture phase: it runs before
  // any of those, while the page still shows what Escape was pressed on.
  useEffect(() => {
    if (!drawerOpen || modalOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const target = e.target;
      const typing = "textarea, select, [contenteditable='true'], input[type='number'], input[type='text'], input:not([type])";
      if (target && typeof target.closest === "function" && target.closest(typing)) return;
      if (document.querySelector(".custom-select-container.is-open")) return;
      setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [drawerOpen, modalOpen]);
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
  // INST-A1: the piano's own realization, the one the keyboard draws — not
  // `activeNotes` (the chosen instrument's), which made the probe compare the
  // keyboard with the guitar's grip whenever the guitar was chosen.
  const s1Notes = (musicEngineContextValue?.realizationsByInstrument?.piano || [])
    .filter((n) => Number.isFinite(n?.absoluteValue))
    .map((n) => n.absoluteValue)
    .join(" ");
  const s1GuitarPositions = fingeringPositions(musicEngineContextValue?.guitarFingering);
  const s1BassPositions = fingeringPositions(musicEngineContextValue?.bassFingering);

  const handlePlay = () => {
    if (appMode === "dictionary" && playDictionaryAudio) playDictionaryAudio();
    else if (togglePlayback) togglePlayback();
  };

  // ─── L1b-1b: the column heads (see the header comment) ───────────────────
  const engine = musicEngineContextValue || {};
  const isDictionary = appMode === "dictionary";
  // The classic words of a position (voicingOf, shapeLabel, positionDefault...)
  // live in the page's main table; the French one when `txt` has none.
  const TX = txt && txt.protoA ? txt : translations.fr;
  const OCTAVE_MIN = -3;
  const OCTAVE_MAX = 3;
  const octave = Number(isDictionary ? dictOctave : chordOctaveOffset) || 0;
  const setOctave = (value) => {
    const v = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, value));
    if (isDictionary) {
      if (setDictOctave) setDictOctave(v);
      return;
    }
    // The Studio window's "Octave de base", with its own two calls
    // (StudioPanel.jsx): the offset — read by the loop (useSequencer) and the
    // MIDI export (SequencerPanel) — then the clicked chord's notes cleared, so
    // that the next chord is voiced at the new octave.
    if (setChordOctaveOffset) setChordOctaveOffset(v);
    if (setCurrentAbsoluteNotes) setCurrentAbsoluteNotes([]);
  };
  const octavePrev = { fn: "jouer.octave-piano-prec", label: T.octaveDown, disabled: octave <= OCTAVE_MIN, onClick: () => setOctave(octave - 1) };
  const octaveNext = { fn: "jouer.octave-piano-suiv", label: T.octaveUp, disabled: octave >= OCTAVE_MAX, onClick: () => setOctave(octave + 1) };
  // Dictionary: the piano head keeps its ‹ Octave › and its range. Studio
  // (VMU-186, Gabriel's option B): the same pair, with the same calls and the
  // same registry names, moves to the selection row as "Octave des accords" -
  // its value also shifts the loop's chords and the MIDI export, which the
  // piano head does not say - and the piano head keeps its name, with no setting.
  const pianoSetting = isDictionary
    ? {
        groupLabel: T.octaveGroup,
        label: formatPitchRange(realizationRange(engine.realizationsByInstrument?.piano), notation),
        prev: octavePrev,
        next: octaveNext,
      }
    : null;
  const chordOctaveSetting = isDictionary
    ? null
    : { groupLabel: T.chordOctaveGroup, help: T.chordOctaveHelp, label: midiToDisplayName(60 + 12 * octave, notation), prev: octavePrev, next: octaveNext };
  const isScaleMode = isDictionary && typeof dictType === "string" && dictType.includes("scale");
  // L1b-1c: the position panel, opened from the neck's label - the classic
  // PositionSelector's controls on the same state and setters (shared rules:
  // components/Instruments/positionPanel.js), and, with the fingering shown,
  // under the same conditions: the Dictionary, or the Studio once a chord is
  // clicked. The instrument's range is the classic tile's (formatPitchRange).
  const panelFor = (id, index) => {
    if (!isDictionary && !clickedChord) return null;
    const isGuitar = id === "guitar";
    const selectedRootString = isGuitar ? engine.selectedRootStringGuitar : engine.selectedRootStringBass;
    const setSelectedRootString = isGuitar ? engine.setSelectedRootStringGuitar : engine.setSelectedRootStringBass;
    const view = positionPanelView({
      instrumentType: id,
      rootVal: engine.currentRootValue,
      notation,
      isScaleMode,
      scaleAnchor: engine.scaleAnchor ?? null,
      placementIndex: index,
      fingering: isGuitar ? engine.guitarFingering : engine.bassFingering,
      range: formatPitchRange(realizationRange(engine.realizationsByInstrument?.[id]), notation),
    });
    if (!view.hasContent) return null;
    const alertText = view.alert === "outOfRange" ? TX.warningOutOfRange : view.alert === "difficultStretch" ? TX.warningDifficultStretch : null;
    return {
      fn: `jouer.position-panneau-${id}`,
      title: T.positionPanel,
      alert: alertText ? { kind: view.alert, text: alertText } : null,
      content: (
        <PositionPanel
          id={id}
          view={view}
          T={T}
          txt={TX}
          selectedRootString={selectedRootString ?? null}
          placementIndex={index}
          setSelectedRootString={(idx) => setSelectedRootString && setSelectedRootString(idx)}
          setPlacementIndex={(i) => engine.setPlacementIndex && engine.setPlacementIndex(id, i)}
          setScaleAnchor={(anchor) => engine.setScaleAnchor && engine.setScaleAnchor(anchor)}
        />
      ),
    };
  };
  const neckSetting = (id) => {
    if (!engine.showFingering) return null;
    const placements = engine.placementsByInstrument?.[id] ?? [];
    const index = engine.placementByInstrument?.[id]?.index ?? null;
    if (!isDictionary) {
      // The Studio shows the clicked (or playing) chord's default shape and
      // does not read the index: its label, without arrows; empty before any chord.
      return { groupLabel: T.positionGroup, label: placements.length ? placementLabel({ placements, placementIndex: null, isScaleMode: false, txt: TX }) : "", panel: panelFor(id, index) };
    }
    const go = (direction) => {
      const nextIndex = stepPlacement(placements, index, direction);
      if (nextIndex !== undefined && engine.setPlacementIndex) engine.setPlacementIndex(id, nextIndex);
    };
    return {
      groupLabel: T.positionGroup,
      label: placementLabel({ placements, placementIndex: index, isScaleMode, txt: TX }),
      prev: { fn: `jouer.position-${id}-prec`, label: T.positionPrev, disabled: placements.length === 0, onClick: () => go(-1) },
      next: { fn: `jouer.position-${id}-suiv`, label: T.positionNext, disabled: placements.length === 0, onClick: () => go(1) },
      panel: panelFor(id, index),
    };
  };
  const chosenInstrument = engine.playbackInstrument || "piano";
  const head = (id, name, setting) => (
    <InstrumentHead
      id={id}
      name={name}
      chooseTitle={T.chooseInstrument}
      selected={chosenInstrument === id}
      onSelect={() => engine.setPlaybackInstrument && engine.setPlaybackInstrument(id)}
      play={isDictionary ? { label: `${T.play} — ${name}`, onPlay: () => engine.playInstrument && engine.playInstrument(id) } : null}
      setting={setting}
    />
  );

  return (
    <MusicEngineProvider value={musicEngineContextValue}>
      <PlaybackProvider value={playbackContextValue}>
        <div className="proto-a" data-prototype="a">
          <header className="proto-a__header">
            <div className="proto-a__title">{T.title}</div>
            {/* The mode switch (it was the left rail): two tabs, right after the title. */}
            <nav className="proto-a__tabs" aria-label={T.modesAria}>
              <button
                type="button"
                className={`proto-a__tab ${appMode === "studio" ? "is-active" : ""}`}
                aria-label={T.tabStudioAria}
                aria-pressed={appMode === "studio"}
                data-fn="nav.mode-studio"
                onClick={() => (onRequestAppMode || setAppMode)("studio")}
              >
                {T.tabStudio}
              </button>
              <button
                type="button"
                className={`proto-a__tab ${appMode === "dictionary" ? "is-active" : ""}`}
                aria-label={T.tabDictionaryAria}
                aria-pressed={appMode === "dictionary"}
                data-fn="nav.mode-dictionnaire"
                onClick={() => (onRequestAppMode || setAppMode)("dictionary")}
              >
                {T.tabDictionary}
              </button>
            </nav>
            <div className="proto-a__spacer" />
            {/* The label modes: a real function (the note names / finger numbers
                shown on the keyboard and the necks), whatever the URL says. One
                control, three segments; their texts follow the language
                (VMU-182), S1_LABEL_MODES only gives what each one sets. */}
            <div className="proto-a__segmented">
              <span className="proto-a__muted" aria-hidden="true">{T.labelsCaption}</span>
              <div className="proto-a__segments" role="group" aria-label={T.labelsCaption}>
                {S1_LABEL_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`proto-a__segment ${currentLabels?.id === m.id ? "is-active" : ""}`}
                    aria-pressed={currentLabels?.id === m.id}
                    data-labels={m.id}
                    data-fn={LABEL_MODE_FN[m.id]}
                    onClick={() => applyLabels(m)}
                  >
                    {T.labelModes[m.id]}
                  </button>
                ))}
              </div>
            </div>
            {/* A′-ACCÈS: Guide, Theory, language, About — the classic header's
                own controls (HeaderActions), without its note-name toggle:
                "Sur les notes" above is that function here. Provisional place,
                until the header's "Aide / Réglages" (L1b-1). */}
            {headerProps && (
              <div className="proto-a__header-actions">
                <HeaderActions {...headerProps} showNotation={false} />
              </div>
            )}
            {/* VMU-184: put forward (mauve -> black gradient, tokens.css) until
                the Assistant melts into the dock. */}
            <button
              type="button"
              className={`proto-a__btn proto-a__assistant ${drawerOpen ? "is-active" : ""}`}
              aria-pressed={drawerOpen}
              data-testid="proto-drawer-toggle"
              data-fn="nav.studio-harmonie"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              {T.assistant} · {appMode === "dictionary" ? T.dictionary : T.studioHarmony}
            </button>
          </header>

          <div className="proto-a__grid">
            <main className="proto-a__center" data-s1="center">
              <section className="proto-a__panel proto-a__transport" data-s1="transport">
                <button type="button" className="proto-a__btn proto-a__btn--primary" data-fn="jouer.lecture" onClick={handlePlay}>
                  {isPlaying ? T.stop : appMode === "dictionary" ? T.listen : T.playProgression}
                </button>
                {/* Tempo: - n + (steps of 1), and a click on n types it (VMU-181,
                    the sidebar badge's logic: hooks/useBpmEditor.js). */}
                <div className="proto-a__tempo" role="group" aria-label={T.tempo} data-fn="jouer.tempo">
                  <span className="proto-a__muted" aria-hidden="true">{T.tempo}</span>
                  <button
                    type="button"
                    className="proto-a__btn proto-a__btn--square"
                    aria-label={T.tempoDown}
                    data-fn="jouer.tempo-moins"
                    onClick={() => handleBpmChange(Math.max(60, currentBpm - 1))}
                  >
                    −
                  </button>
                  {bpmEditor.editing ? (
                    <input
                      className="proto-a__bpm proto-a__bpm-input"
                      aria-label={T.tempoInput}
                      data-fn="jouer.tempo-saisie"
                      {...bpmEditor.inputProps}
                    />
                  ) : (
                    <button
                      type="button"
                      className="proto-a__bpm"
                      title={T.tempoEdit}
                      data-fn="jouer.tempo-saisie"
                      onClick={bpmEditor.start}
                    >
                      {currentBpm}
                    </button>
                  )}
                  <button
                    type="button"
                    className="proto-a__btn proto-a__btn--square"
                    aria-label={T.tempoUp}
                    data-fn="jouer.tempo-plus"
                    onClick={() => handleBpmChange(Math.min(200, currentBpm + 1))}
                  >
                    +
                  </button>
                  <span className="proto-a__muted">{T.bpmUnit}</span>
                </div>
                <button type="button" className="proto-a__btn" aria-pressed={metronomeOn} data-fn="jouer.metronome" onClick={toggleMetronome}>
                  {metronomeOn ? T.metronomeOn : T.metronomeOff}
                </button>
                {/* Master volume (-40..0 dB): the "Instruments & Audio" window's
                    own state and setter (VMU-025: a second reader, no writer of
                    its own — MasterVolumeSingleWriter.test.js). */}
                <label className="proto-a__volume">
                  <span className="proto-a__muted">{T.volume}</span>
                  <input
                    type="range"
                    min="-40"
                    max="0"
                    step="1"
                    className="proto-a__volume-slider"
                    value={Number(masterVolume)}
                    aria-label={T.volume}
                    data-fn="son.volume-general"
                    onChange={(e) => setMasterVolume && setMasterVolume(Number(e.target.value))}
                  />
                  <output className="proto-a__volume-value">
                    {Number(masterVolume)} {T.db}
                  </output>
                </label>
                <div className="proto-a__spacer" />
                {/* The two classic windows, as they are (provisional, until the dock). */}
                <button type="button" className="proto-a__btn" data-fn="composer.math-ouvrir" onClick={onOpenMath}>
                  {T.mathRhythms}
                </button>
                <button type="button" className="proto-a__btn" data-fn="son.ouvrir" onClick={onOpenAudio}>
                  {T.instrumentsAudio}
                </button>
                {/* VMU-185: a second row of this same block - the Studio's style,
                    the Dictionary's family, root note and type - so that they
                    change without opening the Assistant drawer (which hides the
                    necks). The top row above is untouched. */}
                <SelectionRow
                  T={T}
                  txt={TX}
                  lang={lang}
                  notation={notation}
                  isDictionary={isDictionary}
                  currentBrickIndex={currentBrickIndex}
                  setCurrentBrickIndex={setCurrentBrickIndex}
                  dictRoot={dictRoot}
                  setDictRoot={setDictRoot}
                  dictType={dictType}
                  setDictType={setDictType}
                  chordOctave={chordOctaveSetting}
                />
              </section>

              {/* The audio visualizer, a 60px band under the transport: the
                  centre column's content ends far above the keyboard's bottom,
                  so it adds no page height (S1-12, measured by S1-20). */}
              <section className="proto-a__visualizer" data-s1="visualizer" data-fn="son.visualiseur" aria-label={T.visualizer}>
                <AudioVisualizer analyser={musicEngineContextValue?.masterAnalyser} height="60px" />
              </section>

              {/* The probe's fixtures (bench=1 only): see the header comment.
                  Test fixtures (registry: NON APPLICABLE), in French, removed
                  with the bench (L1f). */}
              {bench && (
                <section className="proto-a__panel proto-a__controls" data-s1="scenarios" data-fn="proto.scenarios">
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
                </section>
              )}

              {bench && (
                <section className="proto-a__panel proto-a__controls" data-s1="states" data-fn="proto.etats">
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

              <section className="proto-a__sequencer" data-s1="sequencer" data-fn="composer.grilles">
                <SequencerPanel
                  timeline={timeline}
                  currentStep={currentStep}
                  currentBpm={currentBpm}
                  activeBrick={activeBrick}
                  chordOctaveOffset={chordOctaveOffset}
                />
              </section>

              <section className="proto-a__legend" data-s1="legend" data-fn="nav.legende">
                <TheoryLegend />
              </section>
            </main>

            {/* L1b-1b: the captions left the heads for the columns' tooltip
                and accessible name; the heads carry the name, ▶ and the setting. */}
            <section
              className="proto-a__instrument"
              data-s1="piano"
              data-s1-notes={s1Notes}
              data-fn="jouer.piano"
              aria-label={`${T.piano} — ${T.pianoCaption}`}
              title={T.pianoCaption}
            >
              {head("piano", T.piano, pianoSetting)}
              <PianoKeyboard orientation="vertical" />
            </section>

            <section
              className="proto-a__instrument"
              data-s1="guitar"
              data-s1-positions={s1GuitarPositions}
              data-fn="jouer.guitare"
              aria-label={`${T.guitar} — ${T.neckCaption}`}
              title={T.neckCaption}
            >
              {head("guitar", T.guitar, neckSetting("guitar"))}
              <Fretboard instrument="guitar" orientation="vertical" />
            </section>

            <section
              className="proto-a__instrument"
              data-s1="bass"
              data-s1-positions={s1BassPositions}
              data-fn="jouer.basse"
              aria-label={`${T.bass} — ${T.neckCaption}`}
              title={T.neckCaption}
            >
              {head("bass", T.bass, neckSetting("bass"))}
              <Fretboard instrument="bass" orientation="vertical" />
            </section>
          </div>

          {drawerOpen && (
            <aside className="proto-a__drawer" data-s1="drawer" aria-label={T.drawerAria}>
              <div className="proto-a__drawer-head">
                <span className="proto-a__inst-title">
                  {appMode === "dictionary" ? T.dictionary : T.studioHarmony}
                </span>
                <div className="proto-a__spacer" />
                <button type="button" className="proto-a__btn" data-fn="nav.fermer-fenetres" onClick={() => setDrawerOpen(false)}>
                  {T.close}
                </button>
              </div>
              <div className="proto-a__drawer-body">{drawerPanel}</div>
            </aside>
          )}

          {/* The classic windows (AppDesktop builds them once for both pages). */}
          {modals}
        </div>
      </PlaybackProvider>
    </MusicEngineProvider>
  );
}
