import { useRef, useCallback } from "react";
import { NOTES, MODES, CHORDS, resolveScaleIntervals, getAbsoluteNoteValue, getClosestInversion, resolveChordSemitones, getChordNotesAbsolute, resolveNnsToChordType } from "../core/theory";
import { playDictionaryNote, getPianoSynth, startAudioEngine, setMasterVolume } from "../audio/AudioEngine";
import { getGuitarFingering, getBassFingering } from "../core/fingeringLogic";
import { calcActivePath } from "../core/fretboardLogic";
import { logScalePosition, logPlaybackSequence, logNotePlay } from "../core/debugScale";

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
  activeBrick,
  setClickedChord,
  chordOctaveOffset,
  selectedRootStringGuitar,
  selectedRootStringBass,
  setScaleAnchor,
  scaleAnchor,
  notation = 'us',
  dictOctave = 0
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
    if (setClickedChord) setClickedChord(c);
    const rootVal = c.rootNote.value;
    const chordType = resolveNnsToChordType(c.nns);
    
    let absolutePitches = [];
    
    if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
      // Calculate fingering LOCALLY to ensure it's in sync with the click
      const localFingering = (playbackInstrument === "guitar") 
        ? getGuitarFingering(rootVal, chordType, selectedRootStringGuitar)
        : getBassFingering(rootVal, chordType, selectedRootStringBass);

      const fingeringMap = localFingering?.fingeringMap;
      
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
      
      const baseOctave = 4 + (chordOctaveOffset || 0);
      absolutePitches = getClosestInversion(prevNotes, rootVal, thirdInterval, fifthInterval, baseOctave);
    }

    const notesToPlay = absolutePitches.map((n) => {
      const noteName = notation === 'eu' ? NOTES[n % 12].eu : NOTES[n % 12].us;
      return `${noteName}${Math.floor(n / 12)}`;
    });

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

    if (dictType?.includes("scale")) {
      // --- SINGLE SOURCE OF TRUTH for guitar/bass scale playback ---
      // When a position is selected (scaleFrets exists), both the audio notes
      // and the visual highlights are derived from the SAME scaleFrets data.
      // This eliminates the dual-pipeline desync that caused multi-fret highlighting.
      const currentFingering = (playbackInstrument === "guitar") ? guitarFingering
        : (playbackInstrument === "bass") ? bassFingering : null;

      if (currentFingering?.scaleFrets && (playbackInstrument === "guitar" || playbackInstrument === "bass")) {
        const tuning = playbackInstrument === "bass"
          ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
          : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);
        const reversedTuning = [...tuning].reverse();

        // Compute coordinate objects with real MIDI values from string tuning.
        // Sort by natural guitar traversal: string-by-string from low (high stringIndex)
        // to high (low stringIndex), then by fret ascending within each string.
        // This produces the linear scale path a guitarist actually plays in position.
        const allBoxNotes = currentFingering.scaleFrets.map(sf => {
          const openNote = getAbsoluteNoteValue(reversedTuning[sf.stringIndex]);
          return {
            absoluteValue: openNote + sf.fret,
            stringIndex: sf.stringIndex,
            fret: sf.fret,
            instrument: playbackInstrument
          };
        }).sort((a, b) => {
          // Primary: stringIndex descending (low/bass string first)
          if (b.stringIndex !== a.stringIndex) return b.stringIndex - a.stringIndex;
          // Secondary: fret ascending within same string
          return a.fret - b.fret;
        });

        // Deduplicate: when two positions produce the same pitch (unison),
        // keep only the first encountered in the traversal (lower string = natural fingering).
        // Example: B4 on string 2 fret 4 AND string 1 fret 0 → keep string 2 fret 4.
        const seenPitches = new Set();
        const boxNotes = allBoxNotes.filter(n => {
          if (seenPitches.has(n.absoluteValue)) return false;
          seenPitches.add(n.absoluteValue);
          return true;
        });

        // Debug: log position content
        logScalePosition(playbackInstrument, currentFingering.positionIndex ?? 0, currentFingering.scaleFrets, reversedTuning);

        // Ascending then descending
        absolutePitches = [...boxNotes];
        for (let i = boxNotes.length - 2; i >= 0; i--) {
          absolutePitches.push(boxNotes[i]);
        }

        // Debug: log full sequence
        logPlaybackSequence(absolutePitches);

        // Audio notes derived from the SAME objects (single source)
        notesToPlay = absolutePitches.map(p => {
          const noteName = NOTES[p.absoluteValue % 12].us;
          return `${noteName}${Math.floor(p.absoluteValue / 12)}`;
        });
      } else {
        // Fallback: piano or no position selected — use theoretical intervals
        const scaleData = resolveScaleIntervals(dictType);
        const intervals = scaleData ? scaleData.intervals : MODES["Ionian"].intervals;
        const baseOctave = 4 + (dictOctave || 0);
        let currentPitch = Number(dictRoot) + (baseOctave + 1) * 12;
        absolutePitches.push(currentPitch);

        intervals.forEach((interval) => {
          currentPitch += interval;
          absolutePitches.push(currentPitch);
        });

        for (let i = absolutePitches.length - 2; i >= 0; i--) {
          absolutePitches.push(absolutePitches[i]);
        }

        notesToPlay = absolutePitches.map((p) => {
          const val = typeof p === "object" ? p.absoluteValue : p;
          const noteName = NOTES[val % 12].us;
          return `${noteName}${Math.floor(val / 12)}`;
        });
      }
    } else if (dictType?.includes("chord")) {
      const currentFingering = (playbackInstrument === "guitar") ? guitarFingering : (playbackInstrument === "bass" ? bassFingering : null);
      const fingeringMap = currentFingering?.fingeringMap;
      
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
              const fret = parseInt(fretStr, 10);
              absolutePitches.push({
                absoluteValue: openNote + fret,
                stringIndex: strIdx,
                fret: fret,
                instrument: playbackInstrument
              });
            }
          });
        });
      }

      if (absolutePitches.length === 0) {
        const chordData = resolveChordSemitones(dictType);
        const semitones = chordData ? chordData.semitones : CHORDS["chord_major"].semitones;
        const baseOctave = 4 + (chordOctaveOffset || 0);
        absolutePitches = getChordNotesAbsolute(Number(dictRoot), semitones, baseOctave);
      }

      notesToPlay = absolutePitches.map((p) => {
        const val = typeof p === "object" ? p.absoluteValue : p;
        const noteName = NOTES[val % 12].us;
        return `${noteName}${Math.floor(val / 12)}`;
      });
    } else {
      const baseOctave = 4;
      absolutePitches = activeNotes.map((n) => n.value + baseOctave * 12);
      notesToPlay = absolutePitches.map((p) => {
        const val = typeof p === "object" ? p.absoluteValue : p;
        const noteName = NOTES[val % 12].us;
        return `${noteName}${Math.floor(val / 12)}`;
      });
    }

    playTokenRef.current += 1;
    const currentToken = playTokenRef.current;
    
    setCurrentlyPlayingNotes([]);

    if (dictType?.includes("chord")) {
      // AV-1: Play all notes simultaneously
      playDictionaryNote(playbackInstrument, notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      setTimeout(() => {
        if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
      }, 500);
    } else if (dictType?.includes("scale")) {
      const noteDuration = 60 / currentBpm;
      const stepTime = noteDuration / 2;
      
      // For guitar/bass without scaleFrets, try legacy fallback enrichment
      // (scaleFrets case is already handled above in the initial computation)
      if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
        const currentFingering = playbackInstrument === "guitar" ? guitarFingering : bassFingering;
        
        // Skip if scaleFrets already handled above (absolutePitches are already enriched objects)
        if (!currentFingering?.scaleFrets) {
          const tuning = playbackInstrument === "bass" 
            ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
            : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);

          if (currentFingering?.isScaleBox) {
            // Legacy fallback (should not be reached with new architecture, kept for safety)
            const reversedTuning = [...tuning].reverse();
            const startFret = currentFingering.startFret;
            const endFret = currentFingering.endFret;
            const scalePitchClasses = absolutePitches.map(p => typeof p === 'object' ? p.absoluteValue % 12 : p % 12);
            
            let boxNotes = [];
            for (let sIdx = reversedTuning.length - 1; sIdx >= 0; sIdx--) {
              const openNote = getAbsoluteNoteValue(reversedTuning[sIdx]);
              for (let fret = startFret; fret <= endFret; fret++) {
                const absPitch = openNote + fret;
                if (scalePitchClasses.includes(absPitch % 12)) {
                  boxNotes.push({ absoluteValue: absPitch, stringIndex: sIdx, fret, instrument: playbackInstrument });
                }
              }
            }
            boxNotes.sort((a, b) => a.absoluteValue - b.absoluteValue);
            const newPitches = [...boxNotes];
            for (let i = boxNotes.length - 2; i >= 0; i--) newPitches.push(boxNotes[i]);
            absolutePitches = newPitches;
          } else {
            const path = calcActivePath({
              contextualScaleAbsoluteValues: absolutePitches.map(p => ({ absoluteValue: typeof p === 'object' ? p.absoluteValue : p })),
              dictType,
              lastClickedContext: lastClickedContext || { instrument: playbackInstrument, stringIndex: 0, fret: 0 },
              instrument: playbackInstrument,
              strings: [...tuning].reverse(),
              numFrets: 22
            });

            // Map absolutePitches to path items where possible
            absolutePitches = absolutePitches.map((pitch, idx) => {
               const match = path[idx];
               return match ? { ...match, instrument: playbackInstrument } : pitch;
            });
          }
        }
      }
      
      absolutePitches.forEach((pitchOrObj, index) => {
        const pitch = typeof pitchOrObj === 'object' ? pitchOrObj.absoluteValue : pitchOrObj;
        setTimeout(() => {
          if (playTokenRef.current !== currentToken) return;
          
          const noteNameParts = NOTES[pitch % 12];
          const noteName = `${noteNameParts.us}${Math.floor(pitch / 12)}`;
          playDictionaryNote(playbackInstrument, noteName, "8n");
          
          // Use pitchOrObj directly — it IS the exact object at this index.
          // Do NOT re-search by absoluteValue: duplicates (descending notes) would
          // always resolve to the first ascending occurrence, causing a
          // stringIndex/fret mismatch and missing highlight on the way down.
          const pathItem = (playbackInstrument === "guitar" || playbackInstrument === "bass")
            && typeof pitchOrObj === 'object'
            ? pitchOrObj
            : null;

          // Debug: log each played note with its fretboard coordinates
          logNotePlay(pathItem ?? pitchOrObj, index);

          setCurrentlyPlayingNotes(pathItem ? [pathItem] : [pitch]);
          
          setTimeout(() => {
            if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
          }, Math.max(stepTime * 1000 - 50, 50));
          
        }, index * stepTime * 1000);
      });
    } else {
      const currentRootValue = Number(dictRoot);
      const noteNameParts = NOTES[currentRootValue % 12];
      const noteName = `${noteNameParts.us}4`;
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

    if (appMode === "dictionary" && (dictType?.includes("scale") || dictType?.includes("chord"))) {
      if (absNote % 12 === Number(dictRoot)) {
        let absolutePitches = [];
        if (dictType?.includes("scale")) {
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
                  const fret = parseInt(fretStr, 10);
                  absolutePitches.push({
                    absoluteValue: openNote + fret,
                    stringIndex: strIdx,
                    fret: fret
                  });
                }
              });
            });
          }

          if (absolutePitches.length === 0) {
            const chordData = resolveChordSemitones(dictType);
            const semitones = chordData ? chordData.semitones : [0, 4, 7];
            absolutePitches = semitones.map(s => absNote + s);
          }
          // Map absolutePitches to path items where possible
          if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
            const tuning = playbackInstrument === "bass" 
              ? (activeBrick?.bassStrings || ["E1", "A1", "D2", "G2"])
              : (activeBrick?.guitarStrings || ["E2", "A2", "D3", "G3", "B3", "E4"]);
            
            const path = calcActivePath({
              contextualScaleAbsoluteValues: absolutePitches.map(p => ({ absoluteValue: p })),
              dictType,
              lastClickedContext: lastClickedContext || context || { instrument: playbackInstrument, stringIndex: 0, fret: 0 },
              instrument: playbackInstrument,
              strings: [...tuning].reverse(),
              numFrets: 22
            });

            absolutePitches = absolutePitches.map((pitch, idx) => {
               const match = path[idx];
               return match || pitch;
            });
          }
        }

        const noteDuration = 60 / currentBpm;
        const stepTime = noteDuration / 2;

        if (dictType?.includes("chord")) {
          // AV-1: Simultaneous chord playback
          const notesToPlay = absolutePitches.map(p => {
            const val = typeof p === 'object' ? p.absoluteValue : p;
            const noteName = NOTES[val % 12].us;
            return `${noteName}${Math.floor(val / 12)}`;
          });
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

        absolutePitches.forEach((p, index) => {
          setTimeout(() => {
            if (playTokenRef.current !== currentToken) return;

            const pitch = typeof p === 'object' ? p.absoluteValue : p;
            const noteNameParts = NOTES[pitch % 12];
            const noteName = `${noteNameParts.us}${Math.floor(pitch / 12)}`;
            playDictionaryNote(playbackInstrument, noteName, "8n");
            
            setCurrentlyPlayingNotes([p]);
            
            setTimeout(() => {
              if (playTokenRef.current === currentToken) setCurrentlyPlayingNotes([]);
            }, Math.max(stepTime * 1000 - 50, 50));

          }, index * stepTime * 1000);
        });
        return;
      } else if (dictType?.includes("scale") && context?.instrument && setScaleAnchor) {
        // Scale Box Focus: If we click a note of the scale on the fretboard, anchor the box there
        const isNoteInScale = activeNotes.some(n => n.value === absNote % 12);
        if (isNoteInScale) {
          setScaleAnchor(prev => {
            if (prev && prev.stringIndex === context.stringIndex && prev.fret === context.fret) {
              return null;
            }
            return {
              stringIndex: context.stringIndex,
              fret: context.fret,
              absoluteValue: absNote
            };
          });
        }
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

