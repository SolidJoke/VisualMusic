import { useRef, useCallback } from "react";
import { NOTES, MODES, resolveScaleIntervals, getAbsoluteNoteValue, getClosestInversion } from "../core/theory";
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
  setPlaybackInstrument
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
    const isMinor = c.nns.includes("-");
    const isDim = c.nns.includes("°") || c.nns.includes("b5");
    let thirdInterval = isMinor || isDim ? 3 : 4;
    let fifthInterval = isDim ? 6 : 7;

    const prevNotes = chordIndexInProgression === 0 ? [] : currentAbsoluteNotes;

    const nextNotes = getClosestInversion(
      prevNotes,
      rootVal,
      thirdInterval,
      fifthInterval,
    );
    const notesToPlay = nextNotes.map(
      (n) => `${NOTES[n % 12].us}${Math.floor(n / 12) - 1}`,
    );

    getPianoSynth().triggerAttackRelease(notesToPlay, "2n");
    setCurrentAbsoluteNotes(nextNotes);
    setCurrentlyPlayingNotes(nextNotes);
    setTimeout(() => {
      // Need a token check? The original didn't use playTokenRef here, but it's fine.
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

    if (appMode === "dictionary" && dictType.includes("scale")) {
      if (absNote % 12 === Number(dictRoot)) {
        const scaleData = resolveScaleIntervals(dictType);
        const intervals = scaleData ? scaleData.intervals : MODES["Ionian"].intervals;
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
