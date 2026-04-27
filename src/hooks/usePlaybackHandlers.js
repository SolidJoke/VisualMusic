import { useRef, useCallback } from "react";
import { NOTES, MODES, CHORDS, resolveScaleIntervals, getAbsoluteNoteValue, getClosestInversion, resolveChordSemitones, getChordNotesAbsolute, resolveNnsToChordType } from "../core/theory";
import { playDictionaryNote, getPianoSynth, startAudioEngine, setMasterVolume } from "../audio/AudioEngine";

export function usePlaybackHandlers({
  isAudioReady,
  setIsAudioReady,
  masterVolume,
  currentBpm,
  activeNotes,
  appMode,
  currentAbsoluteNotes,
  setCurrentAbsoluteNotes,
  setCurrentlyPlayingNotes,
  setContextualScaleAbsoluteValues,
  setLastClickedContext,
  setSinglePlayContext,
  dictRoot,
  dictType,
  playbackInstrument,
  setPlaybackInstrument,
  guitarFingering,
  bassFingering,
  activeBrick
}) {
  const playTokenRef = useRef(0);

  const ensureAudioReady = async () => {
    if (!isAudioReady) {
      await startAudioEngine();
      setMasterVolume(masterVolume);
      setIsAudioReady(true);
    }
  };

  const handleChordClick = async (c, chordIndexInProgression) => {
    await ensureAudioReady();
    const rootVal = c.rootNote.value;
    const chordType = resolveNnsToChordType(c.nns);
    
    let absolutePitches = [];
    
    if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
      const currentFingering = playbackInstrument === "guitar" ? guitarFingering : bassFingering;
      const fingeringMap = (playbackInstrument === "guitar") ? currentFingering?.fingeringMap : currentFingering;
      
      if (fingeringMap) {
        const tuning = playbackInstrument === "bass" 
          ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
          : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);
        
        const reversedTuning = [...tuning].reverse();
        Object.entries(fingeringMap).forEach(([strIdxStr, fretMap]) => {
          const strIdx = parseInt(strIdxStr, 10);
          const openNote = getAbsoluteNoteValue(reversedTuning[strIdx]);
          Object.entries(fretMap).forEach(([fretStr, finger]) => {
            if (finger !== 'X') {
              absolutePitches.push(openNote + parseInt(fretStr, 10));
            }
          });
        });
      }
    }

    if (absolutePitches.length === 0) {
      const isMinor = c.nns.includes("-");
      const isDim = c.nns.includes("°") || c.nns.includes("b5");
      let thirdInterval = isMinor || isDim ? 3 : 4;
      let fifthInterval = isDim ? 6 : 7;
      const prevNotes = chordIndexInProgression === 0 ? [] : currentAbsoluteNotes;
      absolutePitches = getClosestInversion(prevNotes, rootVal, thirdInterval, fifthInterval);
    }

    const notesToPlay = absolutePitches.map(
      (n) => `${NOTES[n % 12].us}${Math.floor(n / 12)}`,
    );

    playDictionaryNote(playbackInstrument, notesToPlay, "2n");
    setCurrentAbsoluteNotes(absolutePitches);
    setCurrentlyPlayingNotes(absolutePitches);
    setTimeout(() => {
      setCurrentlyPlayingNotes([]);
    }, 500);
  };

  const playDictionaryAudio = async () => {
    await ensureAudioReady();

    let notesToPlay = [];
    let absolutePitches = [];

    if (dictType.includes("scale")) {
      const scaleData = resolveScaleIntervals(dictType);
      const intervals = scaleData ? scaleData.intervals : MODES["Ionian"].intervals;
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
        (p) => `${NOTES[p % 12].us}${Math.floor(p / 12)}`,
      );
    } else if (dictType.includes("chord")) {
      // AV-3: Use fingering if instrument is guitar or bass
      const currentFingering = playbackInstrument === "guitar" ? guitarFingering : (playbackInstrument === "bass" ? bassFingering : null);
      const fingeringMap = (playbackInstrument === "guitar") ? currentFingering?.fingeringMap : currentFingering;
      
      if (fingeringMap && (playbackInstrument === "guitar" || playbackInstrument === "bass")) {
        const tuning = playbackInstrument === "bass" 
          ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
          : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);
        
        const reversedTuning = [...tuning].reverse();
        Object.entries(fingeringMap).forEach(([strIdxStr, fretMap]) => {
          const strIdx = parseInt(strIdxStr, 10);
          const openNote = getAbsoluteNoteValue(reversedTuning[strIdx]);
          Object.entries(fretMap).forEach(([fretStr, finger]) => {
            if (finger !== 'X') {
              absolutePitches.push(openNote + parseInt(fretStr, 10));
            }
          });
        });
      }

      // Fallback if no fingering or piano
      if (absolutePitches.length === 0) {
        const chordData = resolveChordSemitones(dictType);
        const semitones = chordData ? chordData.semitones : CHORDS["chord_major"].semitones;
        const baseOctave = 4;
        absolutePitches = getChordNotesAbsolute(Number(dictRoot), semitones, baseOctave);
      }

      notesToPlay = absolutePitches.map(
        (p) => `${NOTES[p % 12].us}${Math.floor(p / 12)}`,
      );
    } else {
      const baseOctave = 4;
      absolutePitches = activeNotes.map((n) => n.value + baseOctave * 12);
      notesToPlay = absolutePitches.map(
        (p) => `${NOTES[p % 12].us}${Math.floor(p / 12)}`,
      );
    }

    playTokenRef.current += 1;
    const currentToken = playTokenRef.current;
    
    setCurrentlyPlayingNotes([]);

    if (dictType.includes("chord")) {
      // AV-1: Play all notes simultaneously
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
          if (playTokenRef.current !== currentToken) return;
          
          const noteName = `${NOTES[pitch % 12].us}${Math.floor(pitch / 12)}`;
          playDictionaryNote(playbackInstrument, noteName, "8n");
          setCurrentlyPlayingNotes([pitch]);
          
          setTimeout(() => {
            if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
          }, Math.max(stepTime * 1000 - 50, 50));
          
        }, index * stepTime * 1000);
      });
    } else {
      const currentRootValue = Number(dictRoot);
      const noteName = `${NOTES[currentRootValue % 12].us}4`;
      const absNote = getAbsoluteNoteValue(noteName);
      playDictionaryNote(playbackInstrument, noteName, "2n");
      setCurrentlyPlayingNotes([absNote]);
      setTimeout(() => {
        if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
      }, 500);
    }
  };

  const playSingleNoteRef = useRef(null);

  const playSingleNote = async (noteName, context = null) => {
    await ensureAudioReady();

    const absNote = getAbsoluteNoteValue(noteName);

    playTokenRef.current += 1;
    const currentToken = playTokenRef.current;

    setCurrentlyPlayingNotes([]);

    if (appMode === "dictionary" && (dictType.includes("scale") || dictType.includes("chord"))) {
      if (absNote % 12 === Number(dictRoot)) {
        let absolutePitches = [];
        if (dictType.includes("scale")) {
          const scaleData = resolveScaleIntervals(dictType);
          const intervals = scaleData ? scaleData.intervals : MODES["Ionian"].intervals;
          let currentPitch = absNote;
          absolutePitches.push(currentPitch);
          intervals.forEach((interval) => {
            currentPitch += interval;
            absolutePitches.push(currentPitch);
          });
          // Only scales get the round trip
          for (let i = absolutePitches.length - 2; i >= 0; i--) {
            absolutePitches.push(absolutePitches[i]);
          }
        } else {
          // AV-3: Chord voicing aware audio
          const inst = context?.instrument || playbackInstrument;
          const currentFingering = inst === "guitar" ? guitarFingering : (inst === "bass" ? bassFingering : null);

          if (currentFingering?.fingeringMap && (inst === "guitar" || inst === "bass")) {
            const tuning = inst === "bass" 
              ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
              : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);
            
            const reversedTuning = [...tuning].reverse();
            Object.entries(currentFingering.fingeringMap).forEach(([strIdxStr, fretMap]) => {
              const strIdx = parseInt(strIdxStr, 10);
              const openNote = getAbsoluteNoteValue(reversedTuning[strIdx]);
              Object.entries(fretMap).forEach(([fretStr, finger]) => {
                if (finger !== 'X') {
                  absolutePitches.push(openNote + parseInt(fretStr, 10));
                }
              });
            });
          }

          if (absolutePitches.length === 0) {
            const chordData = resolveChordSemitones(dictType);
            const semitones = chordData ? chordData.semitones : [0, 4, 7];
            absolutePitches = semitones.map(s => absNote + s);
          }
        }

        const noteDuration = 60 / currentBpm;
        const stepTime = noteDuration / 2;

        if (dictType.includes("chord")) {
          // AV-1: Simultaneous chord playback
          const notesToPlay = absolutePitches.map(p => `${NOTES[p % 12].us}${Math.floor(p / 12)}`);
          playDictionaryNote(playbackInstrument, notesToPlay, "2n");
          setCurrentlyPlayingNotes(absolutePitches);
          setTimeout(() => {
            if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
          }, 500);
          return;
        }

        // Scale: sequential playback (arpeggio)
        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: p, order: i + 1 }));
        setContextualScaleAbsoluteValues(scaleObjs);
        setLastClickedContext(context);
        setSinglePlayContext(null);

        absolutePitches.forEach((pitch, index) => {
          setTimeout(() => {
            if (playTokenRef.current !== currentToken) return;

            const nName = `${NOTES[pitch % 12].us}${Math.floor(pitch / 12)}`;
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
    setSinglePlayContext(context ?? null);
    setCurrentlyPlayingNotes([absNote]);
    setTimeout(() => {
      if (playTokenRef.current === currentToken) {
        setCurrentlyPlayingNotes([]);
        setSinglePlayContext(null);
      }
    }, 500);
  };

  playSingleNoteRef.current = playSingleNote;

  const autoPlayNote = useCallback((noteName, context = null) => {
    if (context?.instrument && context.instrument !== playbackInstrument) {
      setPlaybackInstrument(context.instrument);
    }
    playSingleNoteRef.current?.(noteName, context);
  }, [playbackInstrument, setPlaybackInstrument]);

  return {
    handleChordClick,
    playDictionaryAudio,
    playSingleNote,
    autoPlayNote,
    ensureAudioReady
  };
}

