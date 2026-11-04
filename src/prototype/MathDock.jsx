import React from "react";
import CompositionPanel from "../components/Intelligence/CompositionPanel";
import "./MathDock.css";

/**
 * MathDock — VMU-195 C, PR 1: the "Math & Rythmes" window becomes a dock, a
 * band at the bottom of A′'s centre column (after the sequencer, before the
 * legend), in the Studio only. The classic page (?layout=classic) keeps its
 * Modal exactly as today, and the Dictionary's transport button still opens
 * that Modal with its warning.
 *
 * It renders the SAME CompositionPanel the classic Modal renders — the same
 * props, the same state holders AppDesktop already owns (never a copy of the
 * state) — under its own header: ONE title "📐 Math & Rythmes" and a ✕ that
 * closes the dock. The three zones (wheel / phrase + Essayer + footer /
 * recipes) are laid out by MathDock.css with container queries: side by side
 * when the column is wide, stacked when it is narrow. `hideTitle` is always
 * on, so the window's title is the dock header's, not a second one.
 */
export default function MathDock({
  title,
  closeLabel = "Fermer",
  onClose,
  setSuggestedBassTrack,
  setCustomRhythm,
  setCustomDrums,
  currentStep,
  txt,
  isPlaying,
  togglePlayback,
}) {
  return (
    <section className="math-dock" data-s1="math-dock" aria-label={title}>
      <header className="math-dock__header">
        <h2 className="math-dock__title">{title}</h2>
        <button
          type="button"
          className="math-dock__close"
          data-fn="composer.math-fermer"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="math-dock__body">
        <CompositionPanel
          setSuggestedBassTrack={setSuggestedBassTrack}
          setCustomRhythm={setCustomRhythm}
          setCustomDrums={setCustomDrums}
          currentStep={currentStep}
          txt={txt}
          hideTitle
          isPlaying={isPlaying}
          togglePlayback={togglePlayback}
        />
      </div>
    </section>
  );
}
