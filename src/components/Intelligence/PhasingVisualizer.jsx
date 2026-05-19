import React from "react";
import { generatePhasingStates } from "../../core/compositionEngine";
import "./PhasingVisualizer.css";

/**
 * PhasingVisualizer Component
 * Displays the gradual phase shifting between two identical rhythms
 * as pioneered by Steve Reich (e.g. Clapping Music).
 */
export function PhasingVisualizer({ pattern, currentOffset = 0, currentStep = -1 }) {
  if (!pattern || pattern.length === 0) return null;

  const states = generatePhasingStates(pattern);
  const n = pattern.length;

  // Voice 1 is always the base pattern
  const voice1 = states[0];
  // Voice 2 is the shifted pattern
  const voice2 = states[currentOffset % n] || [];

  return (
    <div className="phasing-visualizer">
      <div className="phasing-voice">
        <span className="voice-label">VOICE 1 (STATIC)</span>
        <div className="binary-grid">
          {voice1.map((val, idx) => {
            const isActiveStep = currentStep >= 0 && (idx === currentStep % n);
            let ledClass = "grid-led";
            if (val === 1) ledClass += " led-active";
            if (isActiveStep) ledClass += " led-cursor-active";

            return (
              <div key={`v1-${idx}`} className="grid-cell">
                <div className={ledClass}></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="phasing-voice">
        <span className="voice-label">VOICE 2 (SHIFT: +{currentOffset % n})</span>
        <div className="binary-grid">
          {voice2.map((val, idx) => {
            const isActiveStep = currentStep >= 0 && (idx === currentStep % n);
            let ledClass = "grid-led";
            if (val === 1) ledClass += " led-phasing"; // different color
            if (isActiveStep) ledClass += " led-cursor-active";

            return (
              <div key={`v2-${idx}`} className="grid-cell">
                <div className={ledClass}></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
