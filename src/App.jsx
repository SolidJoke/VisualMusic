import React, { useState, useEffect, useRef, useMemo } from "react";
import "./App.css";
import PianoKeyboard from "./components/Instruments/PianoKeyboard";
import Fretboard from "./components/Instruments/Fretboard";
import PianoRoll from "./components/Sequencer/PianoRoll";
import DAWHelper from "./components/Sequencer/DAWHelper";
import MixerStrip from "./components/Audio/MixerStrip";
import DictionaryPanel from "./components/Panels/DictionaryPanel";
import { useSequencer } from "./audio/useSequencer";
import { translations } from "./i18n/translations";

import {
  getScaleNotes,
  generateChordsFromNNS,
  MODES,
  NOTES,
  getClosestInversion,
  getAbsoluteNoteValue,
} from "./core/theory";
import { getGuitarFingering, getBassFingering } from "./core/fingeringLogic";
import { BRICKS } from "./core/bricks";
import * as Tone from "tone";

import {
  chordSynth,
  kickSynth,
  snareSynth,
  hatSynth,
  bassSynth,
  applyGenrePreset,
  initPianoSampler,
  getPianoSynth,
  setInstrumentVolume,
  playDictionaryNote,
  masterAnalyser,
} from "./audio/AudioEngine";
import AudioVisualizer from "./components/Visualizer/AudioVisualizer";

const noteNamesArray = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const toRoman = (nnsStr) => {
  if (!nnsStr || typeof nnsStr !== 'string') return "";
  const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII" };
  const baseNum = nnsStr.match(/[1-7]/)?.[0] || "1";
  let roman = map[baseNum];
  const isMinor = nnsStr.includes("-");
  const isDim = nnsStr.includes("°") || nnsStr.includes("b5");

  if (isMinor || isDim) roman = roman.toLowerCase();

  let prefix =
    nnsStr.includes("b") && !nnsStr.includes("b5")
      ? "b"
      : nnsStr.includes("#")
        ? "#"
        : "";
  let suffix = isDim ? "°" : isMinor ? "m" : "";

  return prefix + roman + suffix;
};


function App() {
  const [lang, setLang] = useState("fr");
  const txt = (translations && translations[lang]) || {};

  const [appMode, setAppMode] = useState("studio");
  const [notation, setNotation] = useState("us");
  const [chordDisplayMode, setChordDisplayMode] = useState("standard");
  const [showAbout, setShowAbout] = useState(false);
  const [showTheory, setShowTheory] = useState(false);
  const [showFingering, setShowFingering] = useState(false);
  const [fingeringMode, setFingeringMode] = useState("numeric"); // "numeric" (1-4) or "anatomic" (I,M,A,m)

  const playTokenRef = useRef(0);
  const [playbackInstrument, setPlaybackInstrument] = useState("piano");

  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState("chord");
  const [clickedChord, setClickedChord] = useState(null);
  const [layoutMode, setLayoutMode] = useState("all");
  const [activeTab, setActiveTab] = useState("sequencer");
  const [currentTheme, setCurrentTheme] = useState("A");
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState([]);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);

  const [chordOctaveOffset, setChordOctaveOffset] = useState(0);
  const [contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues] =
    useState([]);
  const [lastClickedContext, setLastClickedContext] = useState(null);
  const [singlePlayContext, setSinglePlayContext] = useState(null);

  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");

  // --- Expert Fingering Logic ---
  const guitarFingering = useMemo(() => {
    if (!showFingering || !clickedChord) return null;
    const rootVal = clickedChord.rootNote.value;
    const isMinor = clickedChord.nns.includes("-");
    return getGuitarFingering(rootVal, isMinor);
  }, [showFingering, clickedChord]);

  const bassFingering = useMemo(() => {
    if (!showFingering || !clickedChord) return null;
    const rootVal = clickedChord.rootNote.value;
    const isMinor = clickedChord.nns.includes("-");
    return getBassFingering(rootVal, isMinor);
  }, [showFingering, clickedChord]);

  const activeBrick = BRICKS.at(Number(currentBrickIndex));

  const activeDrums =
    currentTheme === "B" && activeBrick.drumTracksVariation
      ? activeBrick.drumTracksVariation
      : activeBrick.drumTracks;
  const activeMelody =
    currentTheme === "B" && activeBrick.melodyTracksVariation
      ? activeBrick.melodyTracksVariation
      : activeBrick.melodyTracks;
  const activeProgression =
    currentTheme === "B" && activeBrick.nnsProgressionVariation
      ? activeBrick.nnsProgressionVariation
      : activeBrick.nnsProgression;

  let activeNotes = [];
  let currentRootValue = 0;
  let targetValue = -1;

  if (appMode === "studio") {
    const scaleNotes = getScaleNotes(
      activeBrick.rootValue,
      activeBrick.modeName,
    );
    const modeData = Reflect.get(MODES, activeBrick.modeName);

    if (displayMode === "scale") {
      activeNotes = scaleNotes;
    } else {
      if (clickedChord) {
        activeNotes = currentAbsoluteNotes.map((val, idx) => ({
          value: val % 12,
          order: idx + 1,
          absoluteValue: val,
        }));
      } else {
        const n1 = scaleNotes.at(0).value;
        const n2 = scaleNotes.at(2).value;
        const n3 = scaleNotes.at(4).value;
        activeNotes.push(
          { value: n1, order: 1, absoluteValue: n1 + 48 },
          { value: n2, order: 2, absoluteValue: n2 + (n2 < n1 ? 60 : 48) },
          { value: n3, order: 3, absoluteValue: n3 + (n3 < n1 ? 60 : 48) },
        );
      }
    }
    currentRootValue = clickedChord
      ? clickedChord.rootNote.value
      : activeBrick.rootValue;
    targetValue = !clickedChord
      ? (activeBrick.rootValue + modeData.targetInterval) % 12
      : -1;
  } else {
    currentRootValue = Number(dictRoot);
    if (dictType === "scale_major")
      activeNotes = getScaleNotes(currentRootValue, "Ionian");
    else if (dictType === "scale_minor")
      activeNotes = getScaleNotes(currentRootValue, "Aeolian");
    else if (dictType === "chord_major")
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 4) % 12, order: 3 },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    else if (dictType === "chord_minor")
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 3) % 12, order: "b3" },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    else if (dictType === "single_note")
      activeNotes.push({ value: currentRootValue, order: null });
  }

  let inversionText = "";
  if (clickedChord && currentAbsoluteNotes.length > 0) {
    const bassNoteClass = currentAbsoluteNotes[0] % 12;
    const rootVal = clickedChord.rootNote.value;
    const isMinor = clickedChord.nns.includes("-");
    const isDim =
      clickedChord.nns.includes("°") || clickedChord.nns.includes("b5");

    const thirdVal = (rootVal + (isMinor || isDim ? 3 : 4)) % 12;
    const fifthVal = (rootVal + (isDim ? 6 : 7)) % 12;

    if (bassNoteClass === rootVal) inversionText = txt.invRoot;
    else if (bassNoteClass === thirdVal) inversionText = txt.invFirst;
    else if (bassNoteClass === fifthVal) inversionText = txt.invSecond;
    else inversionText = txt.invUnknown;
  }
  const {
    isAudioReady,
    setIsAudioReady,
    isPlaying,
    masterVolume,
    setMasterVolume,
    currentBpm,
    setCurrentBpm,
    instrumentVolumes,
    handleInstrumentVolumeChange,
    currentStep,
    togglePlayback,
    handleBpmChange,
    isPianoReady
  } = useSequencer({
    appMode,
    activeBrick,
    activeDrums,
    activeMelody,
    currentRootValue,
    setCurrentlyPlayingNotes,
  });

  useEffect(() => {
    if (appMode === "studio") {
      document.documentElement.style.setProperty(
        "--theme-primary",
        activeBrick.theme.primary,
      );
      document.documentElement.style.setProperty(
        "--theme-bg",
        activeBrick.theme.bg,
      );
      if (setCurrentBpm && Tone.Transport) {
        setCurrentBpm(activeBrick.bpm);
        Tone.Transport.bpm.value = activeBrick.bpm;
      }
      applyGenrePreset(activeBrick._group);
    } else {
      document.documentElement.style.setProperty("--theme-primary", "#ffd700");
      document.documentElement.style.setProperty("--theme-bg", "#1a1a1a");
    }
    setClickedChord(null);
    setCurrentAbsoluteNotes([]);
    setCurrentTheme("A");
  }, [currentBrickIndex, appMode, activeBrick, setCurrentBpm]);

  const handleChordClick = async (c, chordIndexInProgression) => {
    setClickedChord(c);
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }
    const rootVal = c.rootNote.value;
    const isMinor = c.nns.includes("-");
    const isDim = c.nns.includes("°") || c.nns.includes("b5");
    let thirdInterval = isMinor || isDim ? 3 : 4;
    let fifthInterval = isDim ? 6 : 7;

    // Reset voice-leading on first chord of progression to prevent octave drift
    const prevNotes = chordIndexInProgression === 0 ? [] : currentAbsoluteNotes;

    const nextNotes = getClosestInversion(
      prevNotes,
      rootVal,
      thirdInterval,
      fifthInterval,
    );
    const notesToPlay = nextNotes.map(
      (n) => `${noteNamesArray[n % 12]}${Math.floor(n / 12) - 1}`,
    );

    getPianoSynth().triggerAttackRelease(notesToPlay, "2n");
    setCurrentAbsoluteNotes(nextNotes);
    setCurrentlyPlayingNotes(nextNotes);
    setTimeout(() => setCurrentlyPlayingNotes([]), 500); // Duration of animation
  };

  const playDictionaryAudio = async () => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }

    let notesToPlay = [];
    let absolutePitches = [];

    if (dictType.includes("scale")) {
      const modeName = dictType === "scale_major" ? "Ionian" : "Aeolian";
      const intervals = MODES[modeName].intervals;
      let currentPitch = Number(dictRoot) + 4 * 12; // Start scale at octave 4
      absolutePitches.push(currentPitch);

      intervals.forEach((interval) => {
        currentPitch += interval;
        absolutePitches.push(currentPitch);
      });

      for (let i = absolutePitches.length - 2; i >= 0; i--) {
        absolutePitches.push(absolutePitches[i]);
      }

      notesToPlay = absolutePitches.map(
        (p) => `${noteNamesArray[p % 12]}${Math.floor(p / 12)}`,
      );
    } else {
      const baseOctave = 4;
      absolutePitches = activeNotes.map((n) => n.value + baseOctave * 12);
      notesToPlay = absolutePitches.map(
        (p) => `${noteNamesArray[p % 12]}${Math.floor(p / 12)}`,
      );
    }

    // Cancel any ongoing dictionary/fretboard sequence
    playTokenRef.current += 1;
    const currentToken = playTokenRef.current;
    
    // Immediately clear UI to prevent visual overlap
    setCurrentlyPlayingNotes([]);

    if (dictType.includes("chord")) {
      playDictionaryNote(playbackInstrument, notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      setTimeout(() => {
        if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
      }, 500);
    } else if (dictType.includes("scale")) {
      const noteDuration = 60 / currentBpm;
      const stepTime = noteDuration / 2;
      
      absolutePitches.forEach((pitch, index) => {
        setTimeout(() => {
          if (playTokenRef.current !== currentToken) return; // Abort if a new sequence started
          
          const noteName = `${noteNamesArray[pitch % 12]}${Math.floor(pitch / 12)}`;
          playDictionaryNote(playbackInstrument, noteName, "8n");
          setCurrentlyPlayingNotes([pitch]);
          
          setTimeout(() => {
            if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
          }, Math.max(stepTime * 1000 - 50, 50));
          
        }, index * stepTime * 1000);
      });
    } else {
      // Single note
      const noteName = `${noteNamesArray[currentRootValue % 12]}4`;
      const absNote = getAbsoluteNoteValue(noteName);
      playDictionaryNote(playbackInstrument, noteName, "2n");
      setCurrentlyPlayingNotes([absNote]);
      setTimeout(() => {
        if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
      }, 500);
    }
  };

  /**
   * Auto-selects the playback instrument when tapping a hardware UI element,
   * then delegates to playSingleNote. The context object already has `instrument`
   * set by Fretboard.jsx ({ instrument: "guitar"|"bass" }) and by PianoKeyboard.jsx
   * ({ instrument: "piano" }). We just synchronise the state selector.
   */
  const autoPlayNote = (noteName, context = null) => {
    // Auto-switch the global selector to match the clicked instrument UI
    if (context?.instrument && context.instrument !== playbackInstrument) {
      setPlaybackInstrument(context.instrument);
    }
    playSingleNote(noteName, context);
  };

  const playSingleNote = async (noteName, context = null) => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      setIsAudioReady(true);
    }

    const absNote = getAbsoluteNoteValue(noteName);

    // Cancel any ongoing dictionary/fretboard sequence
    playTokenRef.current += 1;
    const currentToken = playTokenRef.current;

    // Clear UI state to prepare for new note/scale
    setCurrentlyPlayingNotes([]);

    if (appMode === "dictionary" && dictType.includes("scale")) {
      if (absNote % 12 === Number(dictRoot)) {
        const modeName = dictType === "scale_major" ? "Ionian" : "Aeolian";
        const intervals = MODES[modeName].intervals;
        let currentPitch = absNote;
        const absolutePitches = [currentPitch];
        intervals.forEach((interval) => {
          currentPitch += interval;
          absolutePitches.push(currentPitch);
        });
        for (let i = absolutePitches.length - 2; i >= 0; i--) {
          absolutePitches.push(absolutePitches[i]);
        }

        const noteDuration = 60 / currentBpm;
        const stepTime = noteDuration / 2;
        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: p, order: i + 1 }));
        setContextualScaleAbsoluteValues(scaleObjs);
        setLastClickedContext(context);
        setSinglePlayContext(null); // scale playback: path logic handles highlighting

        absolutePitches.forEach((pitch, index) => {
          setTimeout(() => {
            if (playTokenRef.current !== currentToken) return; // Abort if interrupted

            const nName = `${noteNamesArray[pitch % 12]}${Math.floor(pitch / 12)}`;
            playDictionaryNote(playbackInstrument, nName, "8n");
            
            setCurrentlyPlayingNotes([pitch]);
            
            setTimeout(() => {
              if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
            }, Math.max(stepTime * 1000 - 50, 50));

          }, index * stepTime * 1000);
        });
        return;
      }
    }

    playDictionaryNote(playbackInstrument, noteName, "8n");
    setContextualScaleAbsoluteValues([]);
    setLastClickedContext(null);
    setSinglePlayContext(context ?? null); // remember exact fret position
    setCurrentlyPlayingNotes([absNote]);
    setTimeout(() => {
      if (playTokenRef.current === currentToken) {
        setCurrentlyPlayingNotes([]);
        setSinglePlayContext(null);
      }
    }, 500);
  };

  return (
    <div
      className="app-container"
      style={{
        maxWidth: "2560px",
        margin: "0 auto",
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {showAbout && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              padding: "40px",
              borderRadius: "12px",
              border: "1px solid var(--theme-primary)",
              maxWidth: "500px",
              width: "90%",
              textAlign: "center",
              position: "relative",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setShowAbout(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
            <h2 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
              Vmu : VisualMusic Coach
            </h2>
            <p style={{ color: "#ccc", lineHeight: "1.6", fontSize: "16px" }}>
              {txt.aboutDesc}
            </p>
            <p style={{ color: "#fff", fontWeight: "bold", margin: "20px 0" }}>
              {txt.createdBy}
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginTop: "30px",
              }}
            >
              <a
                href="https://ko-fi.com/gabrielgsdresende"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  backgroundColor: "#FF5E5B",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "18px",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              >
                {txt.kofi}
              </a>
              <a
                href="https://github.com/SolidJoke/VisualMusic"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  backgroundColor: "#333",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "18px",
                  border: "1px solid #555",
                  transition: "transform 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              >
                {txt.github}
              </a>
            </div>
          </div>
        </div>
      )}

      {showTheory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              padding: "30px",
              borderRadius: "12px",
              border: "1px solid var(--theme-primary)",
              maxWidth: "600px",
              width: "90%",
              position: "relative",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setShowTheory(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
            <h2
              style={{
                color: "var(--theme-primary)",
                marginTop: 0,
                textAlign: "center",
              }}
            >
              {txt.theoryModalTitle}
            </h2>

            <div
              style={{
                backgroundColor: "#222",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                borderLeft: "4px solid #90caf9",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#90caf9" }}>
                {txt.guideTitle}
              </h3>
              <ul
                style={{
                  color: "#e3f2fd",
                  margin: 0,
                  paddingLeft: "20px",
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
              >
                <li style={{ marginBottom: "8px" }}>{txt.guide1}</li>
                <li style={{ marginBottom: "8px" }}>{txt.guide2}</li>
                <li>{txt.guide3}</li>
              </ul>
            </div>

            <h3
              style={{
                color: "#fff",
                borderBottom: "1px solid #444",
                paddingBottom: "10px",
              }}
            >
              {txt.modesEmotionTitle}
            </h3>
            <ul
              style={{
                listStyleType: "none",
                padding: 0,
                color: "#ccc",
                lineHeight: "1.8",
              }}
            >
              <li>
                <strong style={{ color: "#fff" }}>Ionian :</strong>{" "}
                {MODES.Ionian.emotion} — {MODES.Ionian.description}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Dorian :</strong>{" "}
                {MODES.Dorian.emotion} (Note magique : {MODES.Dorian.magicNote})
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Phrygian :</strong>{" "}
                {MODES.Phrygian.emotion} (Note magique : {MODES.Phrygian.magicNote})
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Lydian :</strong>{" "}
                {MODES.Lydian.emotion} (Note magique : {MODES.Lydian.magicNote})
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Mixolydian :</strong>{" "}
                {MODES.Mixolydian.emotion} (Note magique : {MODES.Mixolydian.magicNote})
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Aeolian :</strong>{" "}
                {MODES.Aeolian.emotion}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Locrian :</strong>{" "}
                {MODES.Locrian.emotion}
              </li>
              <li>
                <strong style={{ color: "#fff" }}>Phrygian Dominant :</strong>{" "}
                {MODES.PhrygianDominant.emotion}
              </li>
            </ul>

            <h3
              style={{
                color: "var(--theme-primary)",
                borderBottom: "1px solid #444",
                paddingBottom: "10px",
                marginTop: "30px"
              }}
            >
              Nashville Number System (NNS)
            </h3>
            <p style={{ color: "#ccc", fontSize: "14px" }}>
              Le NNS remplace les noms de notes par des fonctions :
              <br />• <strong>1, 4, 5</strong> : Accords Majeurs (Repos, Départ, Tension).
              <br />• <strong>2-, 3-, 6-</strong> : Accords Mineurs.
              <br />• <strong>6-</strong> : La relative mineure (Profondeur).
            </p>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <h1 style={{ color: "#fff", margin: 0 }}>{txt.title}</h1>

          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              onClick={() => setShowTheory(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "#1a237e",
                color: "#90caf9",
                border: "1px solid #3949ab",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#283593")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#1a237e")
              }
            >
              {txt.guideTheoryBtn}
            </button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid var(--theme-primary)",
                cursor: "pointer",
                fontWeight: "bold",
                outline: "none",
              }}
            >
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="pt">🇵🇹 PT</option>
              <option value="zh">🇨🇳 ZH</option>
            </select>

            <button
              onClick={() => setShowAbout(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "transparent",
                color: "var(--theme-primary)",
                border: "1px solid var(--theme-primary)",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "var(--theme-primary)";
                e.target.style.color = "#000";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "var(--theme-primary)";
              }}
            >
              {txt.about}
            </button>
          </div>
        </div>

        <div className="main-layout-grid">
          {/* --- LEFT COLUMN --- */}
          <div className="layout-col layout-left">
            {appMode === "studio" && (
              <div
                className="dashboard-panel"
                style={{
                  textAlign: "center",
                  width: "100%",
                  boxSizing: "border-box",
                  maxWidth: "none",
                  margin: "0",
                }}
              >
                <h2 style={{ margin: "0 0 15px 0", color: "#fff" }}>
                  {txt.styleSelection}
                </h2>

                <select
                  value={currentBrickIndex}
                  onChange={(e) => setCurrentBrickIndex(e.target.value)}
                  style={{
                    padding: "10px",
                    fontSize: "18px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: "#222",
                    color: "var(--theme-primary)",
                    border: "1px solid var(--theme-primary)",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  <optgroup label="🎷 Jazz & Bossa">
                    {BRICKS.map((brick, index) => brick._group === 'jazz' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🌍 World & Groove">
                    {BRICKS.map((brick, index) => brick._group === 'world' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎤 Urban & Hip-Hop">
                    {BRICKS.map((brick, index) => brick._group === 'urban' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎓 Progressions Expertes (NNS)">
                    {BRICKS.map((brick, index) => brick._group === 'expert_progressions' && <option key={index} value={index}>{brick.name[lang] || brick.name.en}</option>)}
                  </optgroup>
                  <optgroup label="🎹 Pop & Funk">
                    {BRICKS.map((brick, index) => brick._group === 'pop' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎸 Rock & Metal">
                    {BRICKS.map((brick, index) => brick._group === 'rock' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                  <optgroup label="🎧 Electronic">
                    {BRICKS.map((brick, index) => brick._group === 'electronic' && <option key={index} value={index}>{brick.name[lang]}</option>)}
                  </optgroup>
                </select>

                <div style={{ marginTop: "15px" }}>
                  <span className="info-badge">
                    🎵 Mode: {activeBrick.modeName} ({MODES[activeBrick.modeName]?.emotion})
                  </span>
                  <span className="info-badge">
                    🎸 Tuning: {activeBrick.tuning || "Standard"}
                  </span>
                </div>

                <div className="effects-text">
                  💡 {activeBrick.effects?.[lang] || ""}
                </div>
                {activeBrick.inspiration?.[lang] && (
                  <div style={{ color: '#888', fontSize: '13px', marginTop: '6px', fontStyle: 'italic', paddingLeft: '12px' }}>
                    {activeBrick.inspiration[lang]}
                  </div>
                )}
                <div
                  style={{
                    color: "#aaa",
                    fontSize: "13px",
                    marginTop: "5px",
                    fontStyle: "italic",
                    textAlign: "left",
                    paddingLeft: "12px",
                  }}
                >
                  🎧 {activeBrick.examples?.[lang] || ""}
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    color: "#fff",
                    fontSize: "15px",
                    backgroundColor: "#111",
                    padding: "15px",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#ccc",
                          marginRight: "10px",
                          fontSize: "16px",
                        }}
                      >
                        {txt.theme}
                      </span>
                      <br />
                      <br />
                      <button
                        onClick={() => setCurrentTheme("A")}
                        style={{
                          padding: "8px 15px",
                          marginRight: "5px",
                          backgroundColor:
                            currentTheme === "A"
                              ? "var(--theme-primary)"
                              : "#222",
                          color: currentTheme === "A" ? "#000" : "#fff",
                          border: "1px solid #555",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {txt.varA}
                      </button>
                      <button
                        onClick={() => setCurrentTheme("B")}
                        style={{
                          padding: "8px 15px",
                          backgroundColor:
                            currentTheme === "B"
                              ? "var(--theme-primary)"
                              : "#222",
                          color: currentTheme === "B" ? "#000" : "#fff",
                          border: "1px solid #555",
                          cursor: "pointer",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {txt.varB}
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "#ccc",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        Octave Base:
                      </span>
                      <select
                        value={chordOctaveOffset}
                        onChange={(e) => {
                          setChordOctaveOffset(Number(e.target.value));
                          setCurrentAbsoluteNotes([]);
                        }}
                        style={{
                          padding: "6px",
                          fontSize: "13px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          backgroundColor: "#222",
                          color: "#fff",
                          border: "1px solid #555",
                        }}
                      >
                        <option value={-2}>-2 Oct.</option>
                        <option value={-1}>-1 Oct.</option>
                        <option value={0}>C4</option>
                        <option value={1}>+1 Oct.</option>
                        <option value={2}>+2 Oct.</option>
                      </select>
                    </div>
                  </div>
                  <strong>{txt.magicProg} </strong> <br />
                  <br />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    {generateChordsFromNNS(
                      activeBrick.rootValue,
                      activeBrick.modeName,
                      activeProgression,
                    ).map((c, i) => {
                      const isSelected =
                        clickedChord && clickedChord.nns === c.nns;
                      const chordText =
                        chordDisplayMode === "nns"
                          ? c.nns
                          : chordDisplayMode === "roman"
                            ? toRoman(c.nns)
                            : notation === "us"
                              ? c.chordNameUS
                              : c.chordNameEU;

                      return (
                        <span
                          key={i}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <button
                            onClick={() => handleChordClick(c, i)}
                            title={c.role}
                            style={{
                              background: isSelected
                                ? "var(--theme-primary)"
                                : "#222",
                              color: isSelected
                                ? "#000"
                                : "var(--theme-primary)",
                              border: "2px solid var(--theme-primary)",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "16px",
                              transition: "all 0.2s",
                              flexShrink: 0,
                            }}
                          >
                            {chordText}
                          </button>
                          {i < activeProgression.length - 1 ? (
                            <span style={{ margin: "0 5px" }}>➜</span>
                          ) : (
                            ""
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {clickedChord && (
                    <div style={{ marginTop: "15px" }}>
                      <button
                        onClick={() => {
                          setClickedChord(null);
                          setCurrentAbsoluteNotes([]);
                        }}
                        style={{
                          padding: "5px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          backgroundColor: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                        }}
                      >
                        {txt.backRoot}
                      </button>
                    </div>
                  )}
                  {inversionText && (
                    <div
                      style={{
                        marginTop: "15px",
                        fontSize: "14px",
                        color: "#90caf9",
                        fontStyle: "italic",
                      }}
                    >
                      🎹 {inversionText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {appMode === "dictionary" && (
              <DictionaryPanel
                dictRoot={dictRoot}
                setDictRoot={setDictRoot}
                dictType={dictType}
                setDictType={setDictType}
                notation={notation}
                playDictionaryAudio={playDictionaryAudio}
                txt={txt}
              />
            )}

            {/* NEW LEFT CONTROL PANEL ADDED HERE */}
            <div
              className="dashboard-panel"
              style={{
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setNotation("us")}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    fontWeight: "bold",
                    backgroundColor:
                      notation === "us" ? "var(--theme-primary)" : "#333",
                    color: notation === "us" ? "#000" : "#fff",
                  }}
                >
                  US (A,B,C)
                </button>
                <button
                  onClick={() => setNotation("eu")}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    fontWeight: "bold",
                    backgroundColor:
                      notation === "eu" ? "var(--theme-primary)" : "#333",
                    color: notation === "eu" ? "#000" : "#fff",
                  }}
                >
                  EU (Do,Ré)
                </button>
              </div>

              {/* NNS / CHORD DISPLAY TOGGLE */}
              <div
                style={{
                  display: "flex",
                  gap: "5px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: "5px"
                }}
              >
                {[
                  { id: "standard", label: "Chord" },
                  { id: "nns", label: "NNS (1,4,5)" },
                  { id: "roman", label: "Roman (I,IV,V)" }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setChordDisplayMode(m.id)}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "1px solid #444",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor:
                        chordDisplayMode === m.id ? "var(--theme-primary)" : "#222",
                      color: chordDisplayMode === m.id ? "#000" : "#ccc",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* FINGERING TOGGLE */}
              <div style={{ textAlign: "center", marginTop: "10px" }}>
                 <button
                    onClick={() => setShowFingering(!showFingering)}
                    style={{
                      padding: "10px 20px",
                      cursor: "pointer",
                      borderRadius: "20px",
                      border: showFingering ? "2px solid var(--theme-primary)" : "1px solid #555",
                      fontWeight: "bold",
                      backgroundColor: showFingering ? "var(--theme-primary)" : "transparent",
                      color: showFingering ? "#000" : "#fff",
                      transition: "all 0.3s ease",
                      fontSize: "14px",
                      width: "80%"
                    }}
                  >
                    {showFingering ? "✅ Mode Doigté (Expert)" : "🎓 Voir Doigtés (Expert)"}
                  </button>
                  {showFingering && (
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                      {[
                        { id: "numeric", label: "1-2-3-4" },
                        { id: "anatomic", label: "I-M-A-m" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setFingeringMode(m.id)}
                          style={{
                            padding: "4px 12px",
                            cursor: "pointer",
                            borderRadius: "12px",
                            border: fingeringMode === m.id ? "2px solid var(--theme-primary)" : "1px solid #555",
                            fontSize: "12px",
                            fontWeight: "bold",
                            backgroundColor: fingeringMode === m.id ? "var(--theme-primary)" : "transparent",
                            color: fingeringMode === m.id ? "#000" : "#ccc",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p style={{ color: "#888", fontSize: "11px", marginTop: "6px" }}>
                    {showFingering
                      ? fingeringMode === "numeric"
                        ? "Doigtés 1-4 : Index, Majeur, Annulaire, Auriculaire"
                        : "I=Index, M=Majeur, A=Annulaire, m=Auriculaire"
                      : "Affiche quel doigt utiliser sur le manche"}
                  </p>
              </div>

              {/* GLOBAL INSTRUMENT SELECTOR */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  marginTop: "10px"
                }}
              >
                {[
                  { id: "piano", label: "🎹 Piano" },
                  { id: "guitar", label: "🎸 Guit./Bass" },
                  { id: "bass", label: "🎸 Basse" }
                ].map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => setPlaybackInstrument(inst.id)}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        playbackInstrument === inst.id ? "var(--theme-primary)" : "#333",
                      color: playbackInstrument === inst.id ? "#000" : "#fff",
                    }}
                  >
                    {inst.label}
                  </button>
                ))}
              </div>

              {appMode === "studio" && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => setChordDisplayMode("standard")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        chordDisplayMode === "standard"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: chordDisplayMode === "standard" ? "#000" : "#fff",
                    }}
                  >
                    {txt.displayStandard}
                  </button>
                  <button
                    onClick={() => setChordDisplayMode("nns")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        chordDisplayMode === "nns"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: chordDisplayMode === "nns" ? "#000" : "#fff",
                    }}
                  >
                    {txt.displayNNS}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* --- CENTER COLUMN --- */}
          <div
            className="layout-col layout-center"
            style={{ alignItems: "center" }}
          >
            {/* Reactive Audio Visualizer Header */}
            <div style={{ width: "100%", marginBottom: "15px" }}>
              <AudioVisualizer analyser={masterAnalyser} height="80px" />
            </div>
            {layoutMode === "tabs" && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  gap: "10px",
                  marginBottom: "20px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setActiveTab("sequencer")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "sequencer"
                        ? "var(--theme-primary)"
                        : "#333",
                    color: activeTab === "sequencer" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabDrums}
                </button>
                <button
                  onClick={() => setActiveTab("piano")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "piano" ? "var(--theme-primary)" : "#333",
                    color: activeTab === "piano" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabPiano}
                </button>
                <button
                  onClick={() => setActiveTab("guitars")}
                  style={{
                    padding: "10px",
                    fontWeight: "bold",
                    backgroundColor:
                      activeTab === "guitars" ? "var(--theme-primary)" : "#333",
                    color: activeTab === "guitars" ? "#000" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {txt.tabGuitars}
                </button>
              </div>
            )}

            {appMode === "studio" &&
              (layoutMode === "all" || activeTab === "sequencer") && (
                <div
                  style={{
                    width: "100%",
                    marginBottom: "30px",
                    backgroundColor: "#1a1a1a",
                    padding: "15px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    boxSizing: "border-box",
                  }}
                >
                  <h3 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
                    {txt.drumMachine}
                  </h3>
                  <div className="scrollable-instrument">
                    <PianoRoll
                      tracks={activeDrums}
                      totalSteps={16}
                      currentStep={currentStep}
                    />
                  </div>
                  <h3
                    style={{ color: "var(--theme-primary)", marginTop: "30px" }}
                  >
                    {txt.melodicSeq}
                  </h3>
                  <div className="scrollable-instrument">
                    <PianoRoll
                      tracks={activeMelody}
                      totalSteps={16}
                      currentStep={currentStep}
                    />
                  </div>
                  <DAWHelper
                    drumTracks={activeDrums}
                    melodyTracks={activeMelody}
                    bpm={currentBpm}
                    genreName={activeBrick.name?.[lang] || activeBrick.name?.en || ""}
                    lang={lang}
                  />
                </div>
              )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "piano" ||
              activeTab === "guitars") && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  padding: "15px",
                  backgroundColor: "#1e1e1e",
                  borderRadius: "8px",
                  border: "1px solid #333",
                  marginBottom: "15px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      backgroundColor: "#cf6679",
                      borderRadius: "50%",
                    }}
                  ></div>
                  <span style={{ color: "#ccc", fontSize: "14px" }}>
                    {txt.labelRoot}
                  </span>
                </div>
                {dictType !== "single_note" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#64b5f6",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelThird}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#81c784",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelFifth}
                      </span>
                    </div>
                  </>
                )}
                {(appMode === "studio" && displayMode === "scale") ||
                (dictType && dictType.includes("scale")) ? (
                  <>
                    {appMode === "studio" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginLeft: "20px",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            backgroundColor: "#ffd700",
                            borderRadius: "50%",
                            boxShadow: "0 0 10px #ffd700",
                          }}
                        ></div>
                        <span
                          style={{
                            color: "#ffd700",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          {txt.labelTarget}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#78909c",
                          borderRadius: "50%",
                        }}
                      ></div>
                      <span style={{ color: "#ccc", fontSize: "14px" }}>
                        {txt.labelScale}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "piano") && (
              <div className="scrollable-instrument" style={{ width: "100%" }}>
                <PianoKeyboard
                  activeNotes={activeNotes}
                  numOctaves={3}
                  notation={notation}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  onNoteClick={autoPlayNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                />
              </div>
            )}

            {(appMode === "dictionary" ||
              layoutMode === "all" ||
              activeTab === "guitars") && (
              <div className="scrollable-instrument" style={{ width: "100%" }}>
                <Fretboard
                  instrument="guitar"
                  activeNotes={activeNotes}
                  notation={notation}
                  stringTuning={activeBrick.guitarStrings || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  fretboardZone={fretboardZone}
                  onNoteClick={autoPlayNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                  lastClickedContext={lastClickedContext}
                  singlePlayContext={singlePlayContext}
                  showFingering={showFingering}
                  fingeringMode={fingeringMode}
                  fingering={guitarFingering}
                />
                <br />
                <Fretboard
                  instrument="bass"
                  activeNotes={activeNotes}
                  notation={notation}
                  stringTuning={activeBrick.bassStrings || ['E1', 'A1', 'D2', 'G2']}
                  rootValue={currentRootValue}
                  targetValue={targetValue}
                  fretboardZone={fretboardZone}
                  onNoteClick={autoPlayNote}
                  currentlyPlayingNotes={currentlyPlayingNotes}
                  contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
                  dictType={appMode === "dictionary" ? dictType : null}
                  lastClickedContext={lastClickedContext}
                  singlePlayContext={singlePlayContext}
                  showFingering={showFingering}
                  fingeringMode={fingeringMode}
                  fingering={bassFingering}
                />
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="layout-col layout-right">
            <div
              className="dashboard-panel"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                backgroundColor: "#111",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <button
                onClick={() => setAppMode("studio")}
                style={{
                  padding: "15px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor:
                    appMode === "studio" ? "var(--theme-primary)" : "#222",
                  color: appMode === "studio" ? "#000" : "#fff",
                  border: "none",
                  transition: "all 0.3s",
                  width: "100%",
                }}
              >
                {txt.studioMode}
              </button>
              <button
                onClick={() => setAppMode("dictionary")}
                style={{
                  padding: "15px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor:
                    appMode === "dictionary" ? "var(--theme-primary)" : "#222",
                  color: appMode === "dictionary" ? "#000" : "#fff",
                  border: "none",
                  transition: "all 0.3s",
                  width: "100%",
                }}
              >
                {txt.dictMode}
              </button>
            </div>

            <div
              className="dashboard-panel"
              style={{
                padding: "25px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "25px",
                backgroundColor: "#1a1a1a",
                border: `1px solid ${isPlaying ? "#4CAF50" : "#333"}`,
                boxShadow: isPlaying
                  ? "0 0 15px rgba(76, 175, 80, 0.4)"
                  : "none",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              <button
                onClick={togglePlayback}
                style={{
                  padding: "15px",
                  width: "100%",
                  fontSize: "18px",
                  cursor: "pointer",
                  backgroundColor: isPlaying ? "#e53935" : "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  display: "flex",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: isPlaying
                    ? "0 0 15px rgba(229, 57, 53, 0.4)"
                    : "none",
                }}
              >
                {isPlaying ? txt.stopAudio : txt.enableAudio}
              </button>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "25px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <label
                    style={{
                      color: "#ccc",
                      fontSize: "14px",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    {txt.masterVol} ({masterVolume} dB)
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="0"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(e.target.value)}
                    style={{ cursor: "pointer", width: "100%" }}
                  />
                </div>

                {(
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <label
                      style={{
                        color: "var(--theme-primary)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      {txt.tempoBpm} : {currentBpm}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={currentBpm}
                      onChange={handleBpmChange}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        accentColor: "var(--theme-primary)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <MixerStrip
              instrumentVolumes={instrumentVolumes}
              handleInstrumentVolumeChange={handleInstrumentVolumeChange}
              isPlaying={isPlaying}
            />

            {/* NEW RIGHT CONTROL PANEL ADDED HERE */}
            <div
              className="dashboard-panel"
              style={{
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                width: "100%",
                boxSizing: "border-box",
                maxWidth: "none",
                margin: "0",
              }}
            >
              {appMode === "studio" && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => setDisplayMode("chord")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        displayMode === "chord"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: displayMode === "chord" ? "#000" : "#fff",
                    }}
                  >
                    {txt.chord}
                  </button>
                  <button
                    onClick={() => setDisplayMode("scale")}
                    style={{
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "bold",
                      backgroundColor:
                        displayMode === "scale"
                          ? "var(--theme-primary)"
                          : "#333",
                      color: displayMode === "scale" ? "#000" : "#fff",
                    }}
                  >
                    {txt.scale}
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => setLayoutMode("all")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #777",
                    backgroundColor: layoutMode === "all" ? "#555" : "#222",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {txt.showAll}
                </button>
                <button
                  onClick={() => setLayoutMode("tabs")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #777",
                    backgroundColor: layoutMode === "tabs" ? "#555" : "#222",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {txt.focusMode}
                </button>
              </div>

              {(appMode === "dictionary" ||
                layoutMode === "all" ||
                activeTab === "guitars") && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#ccc", fontWeight: "bold" }}>
                    {txt.guitarPos}
                  </span>
                  <select
                    value={fretboardZone}
                    onChange={(e) => setFretboardZone(e.target.value)}
                    style={{
                      padding: "8px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor: "#222",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    <option value="all">{txt.posAll}</option>
                    <option value="open">{txt.posOpen}</option>
                    <option value="mid">{txt.posMid}</option>
                    <option value="high">{txt.posHigh}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer
        style={{
          marginTop: "60px",
          padding: "20px 0",
          borderTop: "1px solid #333",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          title="Licence MIT"
          style={{ cursor: "help", transition: "color 0.3s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
        >
          © 2026 Gabriel Resende • Vmu (VisualMusic Coach)
        </div>
      </footer>
    </div>
  );
}

export default App;
