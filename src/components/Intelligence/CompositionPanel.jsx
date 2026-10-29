import React, { useState, useEffect, useMemo, useRef } from "react";
import { EuclideanCircle } from "./EuclideanCircle";
import { PhasingVisualizer } from "./PhasingVisualizer";
import PolyrhythmAlgebraPanel from "./PolyrhythmAlgebraPanel";
import ExportTargetPanel from "./ExportTargetPanel";
import SectionTitle from "./SectionTitle";
import { translations } from "../../i18n/translations";

import {
  generateEuclideanRhythm,
  EUCLIDEAN_PRESETS,
  isSelfComplementary,
  generateIsorhythm,
  forcedRealignment,
  isBalanced,
  generateBalancedRhythm,
} from "../../core/compositionEngine";
import "./CompositionPanel.css";

/**
 * CompositionPanel Component
 * An interactive eurorack-style math composition helper module.
 */
export default function CompositionPanel({
  activeTracks,
  setSuggestedBassTrack,
  setCustomRhythm,
  setCustomDrums,
  currentStep = -1,
  txt: txtProp = {},
  // VMU-195-A: the window already carries the title; the panel draws its own
  // only when it is rendered without one. The playback props are the main
  // sequencer's (togglePlayback / isPlaying): "Listen" drives the very same
  // loop that already holds the rhythm sent live.
  hideTitle = false,
  isPlaying = false,
  togglePlayback
}) {
  // A language that lacks a word falls back on the English table, not on
  // loose literals scattered through the markup.
  const txt = { ...translations.en.comp, ...txtProp };

  // 1. Math State
  // The composer tools (gradual shift, melody, bar fit, layering) start folded;
  // their state lives here, so folding one away never switches it off.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [subdivisions, setSubdivisions] = useState(16);
  const [pulses, setPulses] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [showComplement, setShowComplement] = useState(true);
  const [showPhasing, setShowPhasing] = useState(false);
  const [phasingOffset, setPhasingOffset] = useState(0);
  const [showIsorhythm, setShowIsorhythm] = useState(false);
  const [isorhythmPitches, setIsorhythmPitches] = useState("C3, E3, G3, B3");
  const [showRealignment, setShowRealignment] = useState(false);
  const [realignmentBoundary, setRealignmentBoundary] = useState(16);
  const [selectedPreset, setSelectedPreset] = useState("");
  // COMP-08 — Polyrhythm Algebra state
  const [showPolyrhythm, setShowPolyrhythm] = useState(false);
  const [polyOps, setPolyOps] = useState([
    { k: 3, offset: 0, op: '+' },
    { k: 4, offset: 0, op: '+' },
  ]);

  // 2. Export Destination State
  const [exportTarget, setExportTarget] = useState("Kick"); // "Kick", "Snare", "Hat", "Bass", "Chords"
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // Keep pulses bound to subdivisions
  useEffect(() => {
    if (pulses > subdivisions) {
      setPulses(subdivisions);
    }
    if (rotation >= subdivisions) {
      setRotation(0);
    }
  }, [subdivisions]);

  // Handle Preset selection
  const handlePresetChange = (e) => {
    const presetKey = e.target.value;
    setSelectedPreset(presetKey);
    if (presetKey && EUCLIDEAN_PRESETS[presetKey]) {
      const { n, k, r } = EUCLIDEAN_PRESETS[presetKey];
      setSubdivisions(n);
      setPulses(k);
      setRotation(r || 0);
    }
  };

  // Generate pattern dynamically
  const rhythmResult = useMemo(() => {
    return generateEuclideanRhythm(subdivisions, pulses, rotation);
  }, [subdivisions, pulses, rotation]);

  const { pattern, complement, indices, complementIndices } = rhythmResult;

  const isorhythmResult = useMemo(() => {
    if (!showIsorhythm) return null;
    const colorArray = isorhythmPitches.split(",").map(s => s.trim()).filter(Boolean);
    return generateIsorhythm(pattern, colorArray);
  }, [showIsorhythm, pattern, isorhythmPitches]);

  const realignedPattern = useMemo(() => {
    if (!showRealignment) return null;
    return forcedRealignment(pattern, realignmentBoundary);
  }, [showRealignment, pattern, realignmentBoundary]);

  // COMP-08 — Polyrhythm Algebra computed values
  const polyrhythmResult = useMemo(() => {
    if (!showPolyrhythm) return null;
    return generateBalancedRhythm(subdivisions, polyOps);
  }, [showPolyrhythm, subdivisions, polyOps]);

  const balanceInfo = useMemo(() => {
    if (!showPolyrhythm || !polyrhythmResult) return null;
    return isBalanced(polyrhythmResult.pattern);
  }, [showPolyrhythm, polyrhythmResult]);

  // Local Playback State removed. We now rely on the Global Sequencer.
  const activeStep = currentStep;

  const isSelfComp = useMemo(() => {
    return isSelfComplementary(pattern);
  }, [pattern]);

  // Reset preset selection if user manually tweaks sliders
  const handleSliderChange = (setter, value) => {
    setSelectedPreset("");
    setter(value);
  };

  // Export to Sequencer Action (now called automatically)
  const handleExport = () => {
    let activeStepsToExport = [];
    let pitchStepsToExport = {};

    if (showIsorhythm && isorhythmResult) {
      isorhythmResult.sequence.forEach((note, idx) => {
        if (idx < 16) {
          if (note) {
            activeStepsToExport.push(idx);
            pitchStepsToExport[idx] = note;
          }
        }
      });
    } else if (showRealignment && realignedPattern) {
      realignedPattern.forEach((val, idx) => {
        if (idx < 16) {
          if (val === 1) {
            activeStepsToExport.push(idx);
            pitchStepsToExport[idx] = "R";
          }
        }
      });
    } else if (showPolyrhythm && polyrhythmResult) {
      polyrhythmResult.pattern.forEach((val, idx) => {
        if (idx < 16 && val === 1) {
           activeStepsToExport.push(idx);
           pitchStepsToExport[idx] = "R";
        }
      });
    } else {
      const steps = indices.filter(idx => idx < 16);
      activeStepsToExport = steps;
      steps.forEach(step => {
        pitchStepsToExport[step] = "R";
      });
    }

    if (exportTarget === "Bass") {
      setSuggestedBassTrack({
        name: "Bass",
        activeSteps: activeStepsToExport,
        pitchSteps: pitchStepsToExport
      });
    } else if (exportTarget === "Chords") {
      setCustomRhythm(activeStepsToExport);
    } else {
      // Drum target (Kick, Snare, Hat)
      setCustomDrums(prev => {
        const drums = prev ? { ...prev } : {};
        drums[exportTarget] = activeStepsToExport;
        return drums;
      });
    }

    // Trigger success notification animation
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 2000);
  };

  // Live export: the sequencer follows the panel, but only once the user has
  // changed something. Exporting on mount overwrote the style's kick the
  // moment the modal opened, before anything was touched (VMU-113, measured in
  // the browser). What decides is the export's content compared with the one
  // the panel opened with, not a "first run" flag: main.jsx renders in
  // StrictMode, which runs mount effects twice, and a flag would let the second
  // run export. Once armed, every change is exported, a return to the opening
  // value included.
  const exportSignature = JSON.stringify([
    exportTarget,
    pattern,
    showIsorhythm && isorhythmResult ? isorhythmResult.sequence : null,
    showRealignment && realignedPattern ? realignedPattern : null,
    showPolyrhythm && polyrhythmResult ? polyrhythmResult.pattern : null,
  ]);
  const openingSignature = useRef(exportSignature);
  const liveExportArmed = useRef(false);

  useEffect(() => {
    if (!liveExportArmed.current) {
      if (exportSignature === openingSignature.current) return;
      liveExportArmed.current = true;
    }
    handleExport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportSignature]);

  // Clear all overrides
  const handleClearOverrides = () => {
    setSuggestedBassTrack(null);
    setCustomRhythm(null);
    setCustomDrums(null);
  };

  const anyMode = showPhasing || showIsorhythm || showRealignment || showPolyrhythm;

  // A slider with its plain-word title, the maths notation beside it for those
  // who know it, the "?" (when it has a sentence) and the current value.
  const renderSlider = ({ id, notation, label, helpKey, min, max, value, onChange }) => (
    <div className="slider-group">
      <SectionTitle
        id={helpKey || id}
        name={label}
        htmlFor={`comp-${id}`}
        className="slider-title"
        help={helpKey ? txt[`help${helpKey[0].toUpperCase()}${helpKey.slice(1)}`] : undefined}
        helpLabel={txt.help}
        extra={<span className="lcd-value">{id === "shift" ? `+${value}` : value}</span>}
      >
        {label}
        {notation && <span className="math-note"> ({notation})</span>}
      </SectionTitle>
      <input
        id={`comp-${id}`}
        data-testid={`comp-slider-${id}`}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="retro-slider"
      />
    </div>
  );

  const modeSwitch = (id, label, checked, onChange) => (
    <div className="retro-switch-container">
      <label className="retro-switch" htmlFor={`comp-mode-${id}`}>
        <input id={`comp-mode-${id}`} data-testid={`comp-mode-${id}`} type="checkbox" checked={checked} onChange={onChange} />
        <span className="switch-slider"></span>
      </label>
      <label htmlFor={`comp-mode-${id}`} className="switch-label">{label}</label>
    </div>
  );

  return (
    <div className="composition-panel panel" id="composition-panel">
      {!hideTitle && (
        <div className="panel-header">
          <div className="panel-led-indicator pulse-slow"></div>
          <h3 data-testid="comp-title">{txt.title}</h3>
          <div className="eurorack-screw top-left"></div>
          <div className="eurorack-screw top-right"></div>
        </div>
      )}

      <div className="panel-body">
        {/* Row 1: Preset Select */}
        <div className="panel-section presets-section">
          <SectionTitle id="presets" name={txt.presets} htmlFor="comp-preset" help={txt.helpPresets} helpLabel={txt.help}>
            {txt.presets}
          </SectionTitle>
          <div className="select-container">
            <select
              id="comp-preset"
              data-testid="comp-preset"
              value={selectedPreset}
              onChange={handlePresetChange}
              className="retro-select"
            >
              <option value="">{txt.customGeo}</option>
              {Object.entries(EUCLIDEAN_PRESETS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} — {txt.origins?.[key] || value.genre} (E({value.k}, {value.n}))
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sliders */}
        <div className="panel-section sliders-section">
          <span className="section-label">{txt.geoParams}</span>
          {renderSlider({ id: "n", notation: "n", label: txt.subdivisions, helpKey: "subdivisions", min: 2, max: 32, value: subdivisions, onChange: (e) => handleSliderChange(setSubdivisions, parseInt(e.target.value)) })}
          {renderSlider({ id: "k", notation: "k", label: txt.pulses, helpKey: "pulses", min: 1, max: subdivisions, value: pulses, onChange: (e) => handleSliderChange(setPulses, parseInt(e.target.value)) })}
          {renderSlider({ id: "r", notation: "r", label: txt.rotation, helpKey: "rotation", min: 0, max: subdivisions - 1, value: rotation, onChange: (e) => handleSliderChange(setRotation, parseInt(e.target.value)) })}
        </div>

        {/* Row 3: Visualization Circle */}
        <div className="panel-section viz-section">
          <SectionTitle id="circle" name={txt.circle} Tag="span" help={txt.helpCircle} helpLabel={txt.help}>
            {txt.circle}
          </SectionTitle>
          <div className="circle-container">
            <EuclideanCircle
              pattern={showPolyrhythm && polyrhythmResult ? polyrhythmResult.pattern : pattern}
              n={subdivisions}
              highlightIndex={activeStep}
              showComplement={showComplement && !showPolyrhythm}
              sublabel={`${(showPolyrhythm && polyrhythmResult ? polyrhythmResult.pattern : pattern).filter((x) => x === 1).length} ${txt.hitsUnit}`}
              extraPolygons={showPolyrhythm && polyrhythmResult ? polyrhythmResult.polygons.map((poly, idx) => {
                // Rhythmic voices, not musical roles - spec F1-fondations-visuelles.md
                // §6: never --role-* (same rule as PolyrhythmAlgebraPanel.jsx's polyColors).
                const polyColors = ['var(--seq-kick)', 'var(--seq-snare)', 'var(--seq-hat)', 'var(--seq-chords)', 'var(--seq-bass)'];
                return { ...poly, color: polyColors[idx % polyColors.length] };
              }) : []}
            />
          </div>
          <div className="switch-group">
            {modeSwitch("complement", txt.showComp, showComplement, (e) => setShowComplement(e.target.checked))}
          </div>
        </div>

        {/* Row 4: Binary Grid Display */}
        <div className="panel-section grid-section">
          <span className="section-label">{txt.grid}</span>
          <div className="binary-grid" data-testid="comp-grid">
            {pattern.map((val, idx) => {
              const isActiveStep = activeStep >= 0 && (idx === activeStep % subdivisions);
              let ledClass = "grid-led";
              if (val === 1) ledClass += " led-active";
              else if (showComplement && complement[idx] === 1) ledClass += " led-complement";

              if (isActiveStep) ledClass += " led-cursor-active";

              return (
                <div key={idx} className="grid-cell">
                  <div className={ledClass}></div>
                  <span className="grid-index">{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 5: Send to the sequencer (live), and listen to it */}
        <ExportTargetPanel
          txt={txt}
          exportTarget={exportTarget}
          setExportTarget={setExportTarget}
          showExportSuccess={showExportSuccess}
          handleExport={handleExport}
          handleClearOverrides={handleClearOverrides}
          isPlaying={isPlaying}
          togglePlayback={togglePlayback}
        />

        {/* Row 6: the composers' tools, folded by default */}
        <div className="panel-section advanced-section">
          <SectionTitle id="advanced" name={txt.advanced} Tag="div" className="advanced-title" help={txt.helpAdvanced} helpLabel={txt.help}>
            <button
              type="button"
              className="retro-btn advanced-toggle"
              data-testid="comp-advanced-toggle"
              aria-expanded={advancedOpen}
              aria-controls="comp-advanced"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              <span aria-hidden="true">{advancedOpen ? "▾" : "▸"}</span> {txt.advanced}
              {anyMode && !advancedOpen && (
                <span className="advanced-on" data-testid="comp-advanced-active"> {txt.advancedOn}</span>
              )}
            </button>
          </SectionTitle>

          {advancedOpen && (
            <div id="comp-advanced" data-testid="comp-advanced" className="advanced-body">
              <div className="switch-group">
                {modeSwitch("phasing", txt.phasingMode, showPhasing, (e) => {
                  setShowPhasing(e.target.checked);
                  if (e.target.checked) {
                    setShowIsorhythm(false);
                    setShowRealignment(false);
                  }
                })}
                {modeSwitch("iso", txt.isoMode, showIsorhythm, (e) => {
                  setShowIsorhythm(e.target.checked);
                  if (e.target.checked) {
                    setShowPhasing(false);
                    setShowRealignment(false);
                  }
                })}
                {modeSwitch("mesh", txt.meshMode, showRealignment, (e) => {
                  setShowRealignment(e.target.checked);
                  if (e.target.checked) {
                    setShowPhasing(false);
                    setShowIsorhythm(false);
                    setShowPolyrhythm(false);
                  }
                })}
                {modeSwitch("poly", txt.polyAlg, showPolyrhythm, (e) => {
                  setShowPolyrhythm(e.target.checked);
                  if (e.target.checked) {
                    setShowPhasing(false);
                    setShowIsorhythm(false);
                    setShowRealignment(false);
                  }
                })}

                <div className="metadata-badge">
                  <span className="badge-title">{txt.symmetry}</span>
                  <span className={`badge-value ${isSelfComp ? "self-comp" : ""}`}>
                    {isSelfComp ? txt.selfComp : txt.asym}
                  </span>
                </div>
              </div>

              {showPhasing && (
                <div className="panel-section phasing-section" data-testid="comp-phasing-section">
                  <span className="section-label">{txt.phasingVis}</span>
                  {renderSlider({ id: "shift", label: txt.phasingShift, min: 0, max: subdivisions - 1, value: phasingOffset, onChange: (e) => setPhasingOffset(parseInt(e.target.value)) })}
                  <PhasingVisualizer
                    pattern={pattern}
                    currentOffset={phasingOffset}
                    currentStep={activeStep}
                  />
                </div>
              )}

              {showIsorhythm && (
                <div className="panel-section isorhythm-section" data-testid="comp-iso-section">
                  <span className="section-label">{txt.isoEngine}</span>

                  <div className="retro-input-container">
                    <label className="input-label" htmlFor="comp-iso-pitches">{txt.pitchSeq}</label>
                    <input
                      id="comp-iso-pitches"
                      data-testid="comp-iso-pitches"
                      type="text"
                      value={isorhythmPitches}
                      onChange={(e) => setIsorhythmPitches(e.target.value)}
                      className="retro-input-text"
                      placeholder="C3, E3, G3, B3"
                    />
                  </div>

                  {isorhythmResult && (
                    <div className="isorhythm-display">
                      <div className="isorhythm-lcd-row">
                        <div className="lcd-panel">
                          <span className="lcd-label">{txt.taleaPls}</span>
                          <span className="lcd-value">{isorhythmResult.pulses}</span>
                        </div>
                        <div className="lcd-panel">
                          <span className="lcd-label">{txt.colorLen}</span>
                          <span className="lcd-value">{isorhythmResult.colorLength}</span>
                        </div>
                        <div className="lcd-panel">
                          <span className="lcd-label">{txt.cycleSteps}</span>
                          <span className="lcd-value">{isorhythmResult.totalSteps}</span>
                        </div>
                      </div>

                      <div className="isorhythm-steps-grid">
                        {isorhythmResult.sequence.map((note, idx) => {
                          const isActive = activeStep >= 0 && (idx === activeStep % isorhythmResult.totalSteps);
                          return (
                            <div
                              key={idx}
                              className={`isorhythm-step-cell ${note ? "has-note" : "is-rest"} ${isActive ? "active-step" : ""}`}
                            >
                              <span className="step-idx">{idx + 1}</span>
                              <span className="step-note">{note || txt.rest}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showRealignment && (
                <div className="panel-section realignment-section" data-testid="comp-realign-section">
                  <span className="section-label">{txt.realignment}</span>

                  <div className="slider-group">
                    <SectionTitle
                      id="bound"
                      name={txt.metricBound}
                      htmlFor="comp-bound"
                      className="slider-title"
                      extra={<span className="lcd-value">{realignmentBoundary} {txt.steps}</span>}
                    >
                      {txt.metricBound}
                    </SectionTitle>
                    <input
                      id="comp-bound"
                      data-testid="comp-slider-bound"
                      type="range"
                      min="8"
                      max="64"
                      value={realignmentBoundary}
                      onChange={(e) => setRealignmentBoundary(parseInt(e.target.value))}
                      className="retro-slider"
                    />
                  </div>

                  {realignedPattern && (
                    <div className="realignment-display">
                      <div className="binary-grid">
                        {realignedPattern.map((val, idx) => {
                          const isActiveStep = activeStep >= 0 && (idx === activeStep % realignmentBoundary);
                          let ledClass = "grid-led";
                          if (val === 1) ledClass += " led-active";
                          if (isActiveStep) ledClass += " led-cursor-active";

                          return (
                            <div key={idx} className="grid-cell">
                              <div className={ledClass}></div>
                              <span className="grid-index">{idx + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COMP-08 — Polyrhythm Algebra Section */}
              <PolyrhythmAlgebraPanel
                showPolyrhythm={showPolyrhythm}
                txt={txt}
                balanceInfo={balanceInfo}
                polyOps={polyOps}
                setPolyOps={setPolyOps}
                subdivisions={subdivisions}
                polyrhythmResult={polyrhythmResult}
                activeStep={activeStep}
              />
            </div>
          )}
        </div>
      </div>

      {!hideTitle && (
        <>
          <div className="eurorack-screw bottom-left"></div>
          <div className="eurorack-screw bottom-right"></div>
        </>
      )}
    </div>
  );
}
