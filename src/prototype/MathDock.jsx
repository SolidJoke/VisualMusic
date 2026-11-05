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
 * VMU-213 (part 2): the dock is now always there in the Studio (no transport
 * button, no ✕, no Escape: the dock cannot be closed). It renders the SAME
 * CompositionPanel the classic Modal renders — the same props, the same state
 * holders AppDesktop already owns (never a copy of the state) — under its own
 * header: ONE title "📐 Math & Rythmes". Its three zones (wheel / phrase +
 * Essayer + footer) are laid out by MathDock.css; "Pour aller plus loin" has
 * left the dock for A′'s recipes column, which the caller hands as
 * `advancedContainer` (a DOM node the CompositionPanel portals the section
 * into, open by default). `hideTitle` is always on, so the window's title is
 * the dock header's, not a second one.
 */
export default function MathDock({
  title,
  advancedContainer,
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
          advancedContainer={advancedContainer}
        />
      </div>
    </section>
  );
}
