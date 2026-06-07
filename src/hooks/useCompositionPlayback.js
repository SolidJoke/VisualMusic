import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { kickSynth, hatSynth, getPianoSynth } from "../audio/AudioEngine";

/**
 * Hook for playing back Euclidean rhythms independently of the main sequencer.
 * Uses Tone.js Transport for accurate timing.
 */
export function useCompositionPlayback(
  pattern,
  complement,
  showComplement,
  showPhasing = false,
  phasingOffset = 0,
  showIsorhythm = false,
  isorhythmResult = null,
  showRealignment = false,
  realignedPattern = null
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const stepRef = useRef(0);
  const loopIdRef = useRef(null);

  // Sync internal ref with external pattern length changes safely
  const patternLen = pattern.length;

  useEffect(() => {
    // Keep Tone.Transport BPM in sync with our local state if we want independence
    // Note: This will affect global Tone.Transport BPM as well.
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    if (isPlaying) {
      if (Tone.context.state !== "running") {
        Tone.start();
      }
      Tone.Transport.start();

      // Schedule a 16th note loop
      loopIdRef.current = Tone.Transport.scheduleRepeat((time) => {
        let activeLen = patternLen;
        
        if (showIsorhythm && isorhythmResult && isorhythmResult.sequence && isorhythmResult.sequence.length > 0) {
          activeLen = isorhythmResult.sequence.length;
        } else if (showRealignment && realignedPattern && realignedPattern.length > 0) {
          activeLen = realignedPattern.length;
        }

        const step = stepRef.current % activeLen;
        
        // Update UI
        Tone.Draw.schedule(() => {
          setCurrentStep(step);
        }, time);

        // Play sounds
        if (showIsorhythm && isorhythmResult && isorhythmResult.sequence && isorhythmResult.sequence.length > 0) {
          const note = isorhythmResult.sequence[step];
          if (note) {
            try {
              getPianoSynth().triggerAttackRelease(note, "16n", time, 0.7);
            } catch (err) {
              console.warn("Error playing isorhythm note:", err);
            }
          }
        } else if (showRealignment && realignedPattern && realignedPattern.length > 0) {
          if (realignedPattern[step] === 1) {
            kickSynth.triggerAttackRelease("C1", "16n", time, 0.8);
          }
        } else {
          // Classic Mode
          if (pattern[step] === 1) {
            kickSynth.triggerAttackRelease("C1", "16n", time, 0.8);
          }
          
          if (showPhasing && phasingOffset > 0) {
            const voice2Val = pattern[(step + phasingOffset) % patternLen];
            if (voice2Val === 1) {
              hatSynth.triggerAttackRelease("16n", time, 0.5);
            }
          } else if (showComplement && complement && complement[step] === 1) {
            hatSynth.triggerAttackRelease("16n", time, 0.5);
          }
        }

        stepRef.current = step + 1;
      }, "16n");

    } else {
      Tone.Transport.stop();
      setCurrentStep(-1);
      stepRef.current = 0;
      if (loopIdRef.current !== null) {
        Tone.Transport.clear(loopIdRef.current);
        loopIdRef.current = null;
      }
      try {
        const piano = getPianoSynth();
        if (piano.releaseAll) piano.releaseAll();
      } catch (e) {}
    }

    return () => {
      if (loopIdRef.current !== null) {
        Tone.Transport.clear(loopIdRef.current);
        loopIdRef.current = null;
      }
    };
  }, [
    isPlaying,
    pattern,
    complement,
    showComplement,
    showPhasing,
    phasingOffset,
    patternLen,
    showIsorhythm,
    isorhythmResult,
    showRealignment,
    realignedPattern
  ]);

  const togglePlayback = async () => {
    if (!isPlaying && Tone.context.state !== "running") {
      await Tone.start();
    }
    setIsPlaying(!isPlaying);
  };

  return {
    isPlaying,
    togglePlayback,
    bpm,
    setBpm,
    currentStep
  };
}
