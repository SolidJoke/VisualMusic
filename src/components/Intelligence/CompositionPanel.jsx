import React, { useState, useEffect, useMemo } from "react";
import { EuclideanCircle } from "./EuclideanCircle";
import { PhasingVisualizer } from "./PhasingVisualizer";
import { useCompositionPlayback } from "../../hooks/useCompositionPlayback";
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
  currentStep = -1
}) {
  // 1. Math State
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

  // Local Playback State
  const { isPlaying, togglePlayback, bpm, setBpm, currentStep: internalStep } = useCompositionPlayback(
    pattern,
    complement,
    showComplement,
    showPhasing,
    phasingOffset,
    showIsorhythm,
    isorhythmResult,
    showRealignment,
    realignedPattern
  );

  const activeStep = isPlaying ? internalStep : currentStep;

  const isSelfComp = useMemo(() => {
    return isSelfComplementary(pattern);
  }, [pattern]);

  // Reset preset selection if user manually tweaks sliders
  const handleSliderChange = (setter, value) => {
    setSelectedPreset("");
    setter(value);
  };

  // Export to Sequencer Action
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

  // Clear all overrides
  const handleClearOverrides = () => {
    setSuggestedBassTrack(null);
    setCustomRhythm(null);
    setCustomDrums(null);
  };

  return (
    <div className="composition-panel" id="composition-panel">
      <div className="panel-header">
        <div className="panel-led-indicator pulse-slow"></div>
        <h3>MATH COMPOSITION ASSISTANT</h3>
        <div className="eurorack-screw top-left"></div>
        <div className="eurorack-screw top-right"></div>
      </div>

      <div className="panel-body">
        {/* Row 1: Preset Select */}
        <div className="panel-section presets-section">
          <label className="section-label">RHYTHMIC PRESETS</label>
          <div className="select-container">
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="retro-select"
            >
              <option value="">-- CUSTOM GEOMETRY --</option>
              {Object.entries(EUCLIDEAN_PRESETS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} (E({value.k}, {value.n}))
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sliders & Controls */}
        <div className="panel-section sliders-section">
          <label className="section-label">GEOMETRIC PARAMETERS</label>

          <div className="slider-group">
            <div className="slider-header">
              <span>SUBDIVISIONS (n)</span>
              <span className="lcd-value">{subdivisions}</span>
            </div>
            <input
              type="range"
              min="2"
              max="32"
              value={subdivisions}
              onChange={(e) => handleSliderChange(setSubdivisions, parseInt(e.target.value))}
              className="retro-slider"
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span>PULSES / BEATS (k)</span>
              <span className="lcd-value">{pulses}</span>
            </div>
            <input
              type="range"
              min="1"
              max={subdivisions}
              value={pulses}
              onChange={(e) => handleSliderChange(setPulses, parseInt(e.target.value))}
              className="retro-slider"
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span>ROTATION / SHIFT (r)</span>
              <span className="lcd-value">{rotation}</span>
            </div>
            <input
              type="range"
              min="0"
              max={subdivisions - 1}
              value={rotation}
              onChange={(e) => handleSliderChange(setRotation, parseInt(e.target.value))}
              className="retro-slider"
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="panel-section playback-section">
            <button onClick={togglePlayback} className={`retro-btn ${isPlaying ? "active" : ""}`}>
                {isPlaying ? "STOP" : "PLAY"}
            </button>
            <div className="slider-group">
                <span>BPM: {bpm}</span>
                <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} />
            </div>
        </div>

        {/* Row 3: Visualization Circle */}
        <div className="panel-section viz-section">
          <div className="circle-container">
            <EuclideanCircle
              pattern={showPolyrhythm && polyrhythmResult ? polyrhythmResult.pattern : pattern}
              n={subdivisions}
              highlightIndex={activeStep}
              showComplement={showComplement && !showPolyrhythm}
              extraPolygons={showPolyrhythm && polyrhythmResult ? polyrhythmResult.polygons.map((poly, idx) => {
                const polyColors = ['#a78bfa', '#f59e0b', '#34d399', '#f87171', '#60a5fa'];
                return { ...poly, color: polyColors[idx % polyColors.length] };
              }) : []}
            />
          </div>

          {/* Toggle Switches */}
          <div className="switch-group">
            <div className="retro-switch-container">
              <label className="retro-switch">
                <input
                  type="checkbox"
                  checked={showComplement}
                  onChange={(e) => setShowComplement(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
              <span className="switch-label">SHOW COMPLEMENTS</span>
            </div>

            <div className="retro-switch-container">
              <label className="retro-switch">
                <input
                  type="checkbox"
                  checked={showPhasing}
                  onChange={(e) => {
                    setShowPhasing(e.target.checked);
                    if (e.target.checked) {
                      setShowIsorhythm(false);
                      setShowRealignment(false);
                    }
                  }}
                />
                <span className="switch-slider"></span>
              </label>
              <span className="switch-label">PHASING MODE</span>
            </div>

            <div className="retro-switch-container">
              <label className="retro-switch" htmlFor="isorhythm-mode-switch">
                <input
                  id="isorhythm-mode-switch"
                  type="checkbox"
                  checked={showIsorhythm}
                  onChange={(e) => {
                    setShowIsorhythm(e.target.checked);
                    if (e.target.checked) {
                      setShowPhasing(false);
                      setShowRealignment(false);
                    }
                  }}
                />
                <span className="switch-slider"></span>
              </label>
              <label htmlFor="isorhythm-mode-switch" className="switch-label">ISORHYTHM MODE</label>
            </div>

            <div className="retro-switch-container">
              <label className="retro-switch" htmlFor="meshuggah-mode-switch">
                <input
                  id="meshuggah-mode-switch"
                  type="checkbox"
                  checked={showRealignment}
                  onChange={(e) => {
                    setShowRealignment(e.target.checked);
                    if (e.target.checked) {
                      setShowPhasing(false);
                      setShowIsorhythm(false);
                      setShowPolyrhythm(false);
                    }
                  }}
                />
                <span className="switch-slider"></span>
              </label>
              <label htmlFor="meshuggah-mode-switch" className="switch-label">MESHUGGAH MODE</label>
            </div>

            <div className="retro-switch-container">
              <label className="retro-switch" htmlFor="polyrhythm-mode-switch">
                <input
                  id="polyrhythm-mode-switch"
                  type="checkbox"
                  checked={showPolyrhythm}
                  onChange={(e) => {
                    setShowPolyrhythm(e.target.checked);
                    if (e.target.checked) {
                      setShowPhasing(false);
                      setShowIsorhythm(false);
                      setShowRealignment(false);
                    }
                  }}
                />
                <span className="switch-slider"></span>
              </label>
              <label htmlFor="polyrhythm-mode-switch" className="switch-label">POLYRHYTHM ALGEBRA</label>
            </div>

            <div className="metadata-badge">
              <span className="badge-title">SYMMETRY:</span>
              <span className={`badge-value ${isSelfComp ? "self-comp" : ""}`}>
                {isSelfComp ? "SELF-COMPLEMENTARY" : "ASYMMETRICAL"}
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: Binary Grid Display */}
        <div className="panel-section grid-section">
          <label className="section-label">BINARY RHYTHM MATRIX</label>
          <div className="binary-grid">
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

        {showPhasing && (
          <div className="panel-section phasing-section">
            <label className="section-label">PHASING VISUALIZER (STEVE REICH)</label>
            <div className="slider-group">
              <div className="slider-header">
                <span>PHASING SHIFT</span>
                <span className="lcd-value">+{phasingOffset}</span>
              </div>
              <input
                type="range"
                min="0"
                max={subdivisions - 1}
                value={phasingOffset}
                onChange={(e) => setPhasingOffset(parseInt(e.target.value))}
                className="retro-slider"
              />
            </div>
            <PhasingVisualizer 
              pattern={pattern} 
              currentOffset={phasingOffset} 
              currentStep={activeStep} 
            />
          </div>
        )}

        {showIsorhythm && (
          <div className="panel-section isorhythm-section">
            <label className="section-label">ISORHYTHM ENGINE (TALEA & COLOR)</label>
            
            <div className="retro-input-container">
              <span className="input-label">PITCH COLOR SEQUENCE:</span>
              <input
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
                    <span className="lcd-label">TALEA PLS:</span>
                    <span className="lcd-value">{isorhythmResult.pulses}</span>
                  </div>
                  <div className="lcd-panel">
                    <span className="lcd-label">COLOR LEN:</span>
                    <span className="lcd-value">{isorhythmResult.colorLength}</span>
                  </div>
                  <div className="lcd-panel">
                    <span className="lcd-label">CYCLE STEPS:</span>
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
                        <span className="step-note">{note || "REST"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {showRealignment && (
          <div className="panel-section realignment-section">
            <label className="section-label">FORCED REALIGNMENT (MESHUGGAH CALCULATOR)</label>
            
            <div className="slider-group">
              <div className="slider-header">
                <span>METRIC BOUNDARY</span>
                <span className="lcd-value">{realignmentBoundary} STEPS</span>
              </div>
              <input
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
        {showPolyrhythm && (
          <div className="panel-section polyrhythm-section">
            <label className="section-label">POLYRHYTHM ALGEBRA (ANDREW MILNE)</label>

            {/* Balance indicator */}
            {balanceInfo && (
              <div className={`balance-indicator ${balanceInfo.isBalanced ? 'balanced' : 'unbalanced'}`}>
                <span className="lcd-label">BARYCENTER:</span>
                <span className="lcd-value balance-status">
                  {balanceInfo.isBalanced ? '✦ PERFECTLY BALANCED' : `⊕ OFFSET ${(balanceInfo.offset * 100).toFixed(1)}%`}
                </span>
              </div>
            )}

            {/* Polygon operations editor */}
            <div className="poly-ops-editor">
              <span className="input-label">POLYGON OPERATIONS:</span>
              {polyOps.map((op, idx) => {
                const polyColors = ['#a78bfa', '#f59e0b', '#34d399', '#f87171', '#60a5fa'];
                const color = polyColors[idx % polyColors.length];
                return (
                  <div key={idx} className="poly-op-row" style={{ borderLeft: `3px solid ${color}` }}>
                    <span className="poly-op-label" style={{ color }}>{idx === 0 ? '▲' : idx === 1 ? '■' : '●'}-{idx + 1}</span>

                    <div className="poly-op-field">
                      <span>k</span>
                      <input
                        type="range"
                        min="1"
                        max={subdivisions}
                        value={op.k}
                        onChange={(e) => {
                          const newOps = [...polyOps];
                          newOps[idx] = { ...op, k: parseInt(e.target.value) };
                          setPolyOps(newOps);
                        }}
                        className="retro-slider poly-slider"
                      />
                      <span className="lcd-value">{op.k}</span>
                    </div>

                    <div className="poly-op-field">
                      <span>⊕</span>
                      <input
                        type="range"
                        min="0"
                        max={subdivisions - 1}
                        value={op.offset}
                        onChange={(e) => {
                          const newOps = [...polyOps];
                          newOps[idx] = { ...op, offset: parseInt(e.target.value) };
                          setPolyOps(newOps);
                        }}
                        className="retro-slider poly-slider"
                      />
                      <span className="lcd-value">{op.offset}</span>
                    </div>

                    <select
                      value={op.op}
                      onChange={(e) => {
                        const newOps = [...polyOps];
                        newOps[idx] = { ...op, op: e.target.value };
                        setPolyOps(newOps);
                      }}
                      className="retro-select mini poly-op-select"
                    >
                      <option value="+">+ ADD</option>
                      <option value="-">- SUB</option>
                    </select>

                    {polyOps.length > 1 && (
                      <button
                        onClick={() => setPolyOps(polyOps.filter((_, i) => i !== idx))}
                        className="retro-btn danger-btn poly-remove-btn"
                        title="Remove this polygon"
                      >×</button>
                    )}
                  </div>
                );
              })}

              {polyOps.length < 5 && (
                <button
                  onClick={() => setPolyOps([...polyOps, { k: 3, offset: 0, op: '+' }])}
                  className="retro-btn poly-add-btn"
                >
                  + ADD POLYGON
                </button>
              )}
            </div>

            {/* Result binary grid */}
            {polyrhythmResult && (
              <div className="polyrhythm-result">
                <span className="input-label">ALGEBRAIC RESULT:</span>
                <div className="binary-grid">
                  {polyrhythmResult.pattern.map((val, idx) => {
                    const isActiveStep = activeStep >= 0 && (idx === activeStep % subdivisions);
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

        {/* Row 5: Export to Sequencer */}
        <div className="panel-section export-section">
          <label className="section-label">SEQUENCER EXPORT PANEL</label>
          
          <div className="export-controls">
            <div className="target-select">
              <span>TARGET:</span>
              <select
                value={exportTarget}
                onChange={(e) => setExportTarget(e.target.value)}
                className="retro-select mini"
              >
                <option value="Kick">KICK DRUM</option>
                <option value="Snare">SNARE DRUM</option>
                <option value="Hat">HI-HAT</option>
                <option value="Bass">BASS LINE</option>
                <option value="Chords">CHORD RHYTHM</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              className={`retro-btn export-btn ${showExportSuccess ? "success" : ""}`}
            >
              {showExportSuccess ? "RHYTHM DEPLOYED !" : "EXPORT TO TRACK"}
            </button>
          </div>

          <div className="clear-container">
            <button
              onClick={handleClearOverrides}
              className="retro-btn clear-btn"
              title="Reset all tracks back to original brick rhythm patterns"
            >
              RESET ALL OVERRIDES
            </button>
          </div>
        </div>
      </div>

      <div className="eurorack-screw bottom-left"></div>
      <div className="eurorack-screw bottom-right"></div>
    </div>
  );
}
