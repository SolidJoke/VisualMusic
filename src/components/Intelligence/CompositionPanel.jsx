import React, { useState, useEffect, useMemo, useRef } from "react";
import { EuclideanCircle } from "./EuclideanCircle";
import { PhasingVisualizer } from "./PhasingVisualizer";
import PolyrhythmAlgebraPanel from "./PolyrhythmAlgebraPanel";
import { balanceWordFor } from "./balanceWord";
import SectionTitle from "./SectionTitle";
import HelpButton from "./HelpButton";
import ExportTargetPanel from "./ExportTargetPanel";
import { translations } from "../../i18n/translations";

import {
  generateEuclideanRhythm,
  EUCLIDEAN_PRESETS,
  isSelfComplementary,
  generateIsorhythm,
  forcedRealignment,
  isBalanced,
  generateBalancedRhythm,
  lcm,
} from "../../core/compositionEngine";
import "./CompositionPanel.css";

/* Grey stacked rhythms are told apart by their stroke, never by track colours. */
const VOICE_DASH = ["", "10 6", "2 6", "12 5 2 5", "18 6"];

/* The track colour tokens, addressed statically so the CSS-variable scan can
   see each --seq-* name (a dynamic template would read as an undefined
   "--seq-"). */
const SEQ_TOKEN = {
  Kick: "var(--seq-kick)",
  Snare: "var(--seq-snare)",
  Hat: "var(--seq-hat)",
  Bass: "var(--seq-bass)",
  Chords: "var(--seq-chords)",
};

/* A small circle showing the preset's pattern (the "mini-cercle"). */
function MiniCircle({ n, k, size = 22 }) {
  const c = size / 2;
  const r = size / 2 - 3;
  const pat = useMemo(() => generateEuclideanRhythm(n, k, 0).pattern, [n, k]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="mini-circle">
      <circle cx={c} cy={c} r={r} className="mini-ring" />
      {pat.map((v, i) =>
        v ? (
          <circle
            key={i}
            cx={c + r * Math.sin((2 * Math.PI * i) / n)}
            cy={c - r * Math.cos((2 * Math.PI * i) / n)}
            r={2.6}
            className="mini-hit"
          />
        ) : null
      )}
    </svg>
  );
}

/**
 * CompositionPanel Component — variant B, "la phrase" (VMU-195-B).
 * The three sliders become one sentence whose numbers are set with − / +;
 * the circle becomes a wheel under a fixed marker; the preset dropdown becomes
 * "Essayer :" pills; the composer tools become four recipes; the footer says
 * "↺ Rythme du style · Envoyer maintenant · ● en direct sur …".
 */
export default function CompositionPanel({
  setSuggestedBassTrack,
  setCustomRhythm,
  setCustomDrums,
  currentStep = -1,
  txt: txtProp = {},
  hideTitle = false,
  isPlaying = false,
  togglePlayback
}) {
  // A language that lacks a word falls back on the English table.
  const txt = { ...translations.en.comp, ...txtProp };

  // 1. Math State — unchanged: the recipes (gradual shift, melody, bar fit,
  // layering) stay folded, their state lives here so folding never switches
  // one off.
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
  const [showPolyrhythm, setShowPolyrhythm] = useState(false);
  const [polyOps, setPolyOps] = useState([
    { k: 3, offset: 0, op: '+' },
    { k: 4, offset: 0, op: '+' },
  ]);

  // 2. Export Destination State
  const [exportTarget, setExportTarget] = useState("Kick");
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // Keep pulses and rotation bound to subdivisions.
  useEffect(() => {
    if (pulses > subdivisions) {
      setPulses(subdivisions);
    }
    if (rotation >= subdivisions) {
      setRotation(0);
    }
  }, [subdivisions]);

  // The phrase's − / + : one number each, clamped, and a manual change leaves
  // the "Essayer" pills (back to "mon rythme").
  const stepN = (delta) => {
    setSelectedPreset("");
    setSubdivisions(Math.max(2, Math.min(32, subdivisions + delta)));
  };
  const stepK = (delta) => {
    setSelectedPreset("");
    setPulses(Math.max(1, Math.min(subdivisions, pulses + delta)));
  };
  const stepR = (delta) => {
    setSelectedPreset("");
    setRotation(Math.max(0, Math.min(subdivisions - 1, rotation + delta)));
  };

  // Handle Preset selection (the "Essayer :" pills).
  const handlePresetChange = (presetKey) => {
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

  const { pattern, indices } = rhythmResult;

  const isorhythmResult = useMemo(() => {
    if (!showIsorhythm) return null;
    const colorArray = isorhythmPitches.split(",").map((s) => s.trim()).filter(Boolean);
    return generateIsorhythm(pattern, colorArray);
  }, [showIsorhythm, pattern, isorhythmPitches]);

  const realignedPattern = useMemo(() => {
    if (!showRealignment) return null;
    return forcedRealignment(pattern, realignmentBoundary);
  }, [showRealignment, pattern, realignmentBoundary]);

  const polyrhythmResult = useMemo(() => {
    if (!showPolyrhythm) return null;
    return generateBalancedRhythm(subdivisions, polyOps);
  }, [showPolyrhythm, subdivisions, polyOps]);

  const balanceInfo = useMemo(() => {
    if (!showPolyrhythm || !polyrhythmResult) return null;
    return isBalanced(polyrhythmResult.pattern);
  }, [showPolyrhythm, polyrhythmResult]);

  const balanceWord = useMemo(() => {
    if (!balanceInfo) return null;
    return balanceWordFor(balanceInfo.offset, {
      even: txt.balanceEven,
      almost: txt.balanceAlmost,
      tilted: txt.balanceTilted,
    });
  }, [balanceInfo, txt]);

  // The melody laid on the rhythm returns to its start after this many turns
  // of the rhythm: LCM(hits, notes) / hits.
  const isoTurns = useMemo(() => {
    if (!isorhythmResult || isorhythmResult.pulses === 0) return 1;
    return lcm(isorhythmResult.pulses, isorhythmResult.colorLength) / isorhythmResult.pulses;
  }, [isorhythmResult]);

  // The wheel always shows the ACTIVE mode's whole pattern.
  const displayPattern = useMemo(() => {
    if (showPolyrhythm && polyrhythmResult) return polyrhythmResult.pattern;
    if (showRealignment && realignedPattern) return realignedPattern;
    return pattern;
  }, [showPolyrhythm, polyrhythmResult, showRealignment, realignedPattern, pattern]);

  const extraPolygons = useMemo(() => {
    if (!showPolyrhythm || !polyrhythmResult) return [];
    return polyrhythmResult.polygons.map((poly, idx) => ({
      indices: poly.indices,
      dash: poly.op === '-' ? '2 6' : VOICE_DASH[idx % VOICE_DASH.length],
    }));
  }, [showPolyrhythm, polyrhythmResult]);

  const targetToken = SEQ_TOKEN[exportTarget] || SEQ_TOKEN.Kick;

  const activeStep = currentStep;

  const isSelfComp = useMemo(() => {
    return isSelfComplementary(pattern);
  }, [pattern]);

  // Export to Sequencer Action (now called automatically). VMU-208: the circle
  // is exported WHOLE with its cycle length.
  const handleExport = () => {
    let activeStepsToExport = [];
    let pitchStepsToExport = {};
    let cycleLength = subdivisions;

    if (showIsorhythm && isorhythmResult) {
      cycleLength = isorhythmResult.sequence.length;
      isorhythmResult.sequence.forEach((note, idx) => {
        if (note) {
          activeStepsToExport.push(idx);
          pitchStepsToExport[idx] = note;
        }
      });
    } else if (showRealignment && realignedPattern) {
      cycleLength = realignedPattern.length;
      realignedPattern.forEach((val, idx) => {
        if (val === 1) {
          activeStepsToExport.push(idx);
          pitchStepsToExport[idx] = "R";
        }
      });
    } else if (showPolyrhythm && polyrhythmResult) {
      cycleLength = polyrhythmResult.pattern.length;
      polyrhythmResult.pattern.forEach((val, idx) => {
        if (val === 1) {
          activeStepsToExport.push(idx);
          pitchStepsToExport[idx] = "R";
        }
      });
    } else {
      activeStepsToExport = indices;
      activeStepsToExport.forEach((step) => {
        pitchStepsToExport[step] = "R";
      });
    }

    if (exportTarget === "Bass") {
      setSuggestedBassTrack({
        name: "Bass",
        activeSteps: activeStepsToExport,
        pitchSteps: pitchStepsToExport,
        cycleLength
      });
    } else if (exportTarget === "Chords") {
      setCustomRhythm({ activeSteps: activeStepsToExport, cycleLength });
    } else {
      setCustomDrums(prev => {
        const drums = prev ? { ...prev } : {};
        drums[exportTarget] = { activeSteps: activeStepsToExport, cycleLength };
        return drums;
      });
    }

    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 2000);
  };

  // Live export: follow the panel once the user has changed something (VMU-113).
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

  const handleClearOverrides = () => {
    setSuggestedBassTrack(null);
    setCustomRhythm(null);
    setCustomDrums(null);
  };

  const anyMode = showPhasing || showIsorhythm || showRealignment || showPolyrhythm;

  // The four recipes, in order, with their one-line explanation.
  const RECIPES = [
    { id: "phasing", title: txt.recipePhase, say: txt.recipePhaseSay },
    { id: "iso", title: txt.recipeIso, say: txt.recipeIsoSay },
    { id: "mesh", title: txt.recipeMesh, say: txt.recipeMeshSay },
    { id: "poly", title: txt.recipePoly, say: txt.recipePolySay },
  ];

  const modeActive = { phasing: showPhasing, iso: showIsorhythm, mesh: showRealignment, poly: showPolyrhythm };

  // One recipe at a time (owner's decision, 2026-11-05): turning any recipe on
  // turns every other recipe off; turning one off leaves none on. The former
  // coexistences (poly with phasing / iso) stay as a possible future recipe,
  // VMU-210. handleExport's precedence can stay: it no longer meets two modes.
  const setMode = (id, on) => {
    setShowPhasing(on && id === "phasing");
    setShowIsorhythm(on && id === "iso");
    setShowRealignment(on && id === "mesh");
    setShowPolyrhythm(on && id === "poly");
  };

  const toggleMode = (id) => setMode(id, !modeActive[id]);

  // A − / + pair (44 × 44, Assistant gradient) around a value; the label's
  // help sentence rides as a tooltip.
  const Stepper = ({ id, label, help, value, min, max, onStep }) => (
    <span className="stp-grp" role="group" aria-label={label} title={help}>
      <button
        type="button"
        className="sbtn"
        data-testid={`comp-${id}-minus`}
        aria-label={`${label} −`}
        disabled={value <= min}
        onClick={() => onStep(-1)}
      >−</button>
      <span className="stp-val" data-testid={`comp-${id}-value`}>{value}</span>
      <button
        type="button"
        className="sbtn"
        data-testid={`comp-${id}-plus`}
        aria-label={`${label} +`}
        disabled={value >= max}
        onClick={() => onStep(1)}
      >+</button>
    </span>
  );

  // A slider with its plain-word title (kept for the recipes).
  const renderSlider = ({ id, label, min, max, value, onChange }) => (
    <div className="slider-group">
      <div className="section-head">
        <label className="slider-title" htmlFor={`comp-${id}`}>{label}</label>
        <span className="lcd-value">{value}</span>
      </div>
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

      <div className="panel-body phrase-body">
        {/* The phrase: "5 coups sur 16 cases, départ décalé de 0, joués par …". */}
        <div className="panel-section phrase-section">
          <div className="phrase-sentence" data-testid="comp-phrase">
            <Stepper id="k" label={txt.pulses} help={txt.helpPulses} value={pulses} min={1} max={subdivisions} onStep={stepK} />
            <span className="phrase-word">{txt.hitsUnit}</span>
            <HelpButton id="pulses" name={txt.pulses} help={txt.helpPulses} helpLabel={txt.help} />
            <span className="phrase-word">{txt.phraseOver}</span>
            <Stepper id="n" label={txt.subdivisions} help={txt.helpSubdivisions} value={subdivisions} min={2} max={32} onStep={stepN} />
            <span className="phrase-word">{txt.phraseSteps}</span>
            <span className="phrase-unit">
              <HelpButton id="subdivisions" name={txt.subdivisions} help={txt.helpSubdivisions} helpLabel={txt.help} />
              <span className="phrase-word">,</span>
            </span>
            <span className="phrase-word">{txt.phraseStart}</span>
            <Stepper id="r" label={txt.rotation} help={txt.helpRotation} value={rotation} min={0} max={subdivisions - 1} onStep={stepR} />
            <span className="phrase-unit">
              <HelpButton id="rotation" name={txt.rotation} help={txt.helpRotation} helpLabel={txt.help} />
              <span className="phrase-word">,</span>
            </span>
            <span className="phrase-word">{txt.phrasePlayedBy}</span>
            <select
              id="comp-target"
              data-testid="comp-target"
              value={exportTarget}
              onChange={(e) => setExportTarget(e.target.value)}
              className="retro-select phrase-target"
              aria-label={txt.phrasePlayedBy}
            >
              <option value="Kick">{txt.kick}</option>
              <option value="Snare">{txt.snare}</option>
              <option value="Hat">{txt.hat}</option>
              <option value="Bass">{txt.bass}</option>
              <option value="Chords">{txt.chordsOut}</option>
            </select>
          </div>
        </div>

        {/* The wheel under a fixed marker, its strip, the empty-cases toggle. */}
        <div className="panel-section viz-section">
          <SectionTitle id="circle" name={txt.circle} Tag="span" title={txt.helpCircle} help={txt.helpCircle} helpLabel={txt.help}>
            {txt.circle}
          </SectionTitle>
          <div className="circle-container">
            <EuclideanCircle
              pattern={displayPattern}
              n={displayPattern.length}
              currentStep={activeStep}
              showEmpty={showComplement && !showPolyrhythm}
              color={targetToken}
              extraPolygons={extraPolygons}
              balanceInfo={showPolyrhythm ? balanceInfo : null}
              balanceWord={showPolyrhythm ? balanceWord : null}
              sur={txt.sur}
              hitsUnit={txt.hitsUnit}
            />
          </div>

          <div className="wheel-foot">
            <button
              type="button"
              className="retro-btn empty-toggle"
              data-testid="comp-show-empty"
              aria-pressed={showComplement}
              onClick={() => setShowComplement((v) => !v)}
            >
              {showComplement ? (txt.hideComp || txt.showComp) : txt.showComp}
            </button>
            <span className="badge-sym" data-testid="comp-symmetry">
              {!showPolyrhythm && isSelfComp ? txt.symSame : !showPolyrhythm ? `${txt.symmetry} ${txt.asym}` : ""}
            </span>
          </div>

          <div
            className="euclidean-strip"
            data-testid="comp-grid"
            style={{ gridTemplateColumns: `repeat(${displayPattern.length}, 1fr)` }}
          >
            {displayPattern.map((val, idx) => {
              const isCurrent = activeStep >= 0 && idx === ((activeStep % displayPattern.length) + displayPattern.length) % displayPattern.length;
              return (
                <i
                  key={idx}
                  className={`strip-cell${val ? ' hit' : ''}${isCurrent ? ' now' : ''}`}
                  style={val ? { '--c': targetToken } : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* "Essayer :" — the world rhythms, and "mon rythme" when none is pressed. */}
        <div className="panel-section try-section">
          <SectionTitle id="presets" name={txt.tryLabel} Tag="span" title={txt.helpPresets} help={txt.helpPresets} helpLabel={txt.help}>
            {txt.tryLabel}
          </SectionTitle>
          <div className="trychips">
            <button
              type="button"
              className="trychip"
              data-testid="comp-preset-my"
              aria-pressed={selectedPreset === ""}
              title={txt.customGeo}
              onClick={() => handlePresetChange("")}
            >
              {txt.customGeo}
            </button>
            {Object.entries(EUCLIDEAN_PRESETS).map(([key, value]) => {
              const origin = txt.origins?.[key] || value.genre;
              return (
                <button
                  key={key}
                  type="button"
                  className="trychip"
                  data-testid={`comp-preset-${key}`}
                  aria-pressed={selectedPreset === key}
                  title={`${origin} — E(${value.k},${value.n})`}
                  onClick={() => handlePresetChange(key)}
                >
                  <MiniCircle n={value.n} k={value.k} />
                  {value.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* The recipes, folded under "Pour aller plus loin". */}
        <div className="panel-section advanced-section">
          <SectionTitle id="advanced" name={txt.advanced} Tag="div" className="advanced-title" title={txt.helpAdvanced} help={txt.helpAdvanced} helpLabel={txt.help}>
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
              <div className="recipes">
                {RECIPES.map(({ id, title, say }) => (
                  <button
                    key={id}
                    type="button"
                    className="recipe-btn"
                    data-testid={`comp-mode-${id}`}
                    aria-pressed={modeActive[id]}
                    onClick={() => toggleMode(id)}
                  >
                    <span className="recipe-text">
                      <b>{title}</b>
                      <small>{say}</small>
                    </span>
                  </button>
                ))}
              </div>

              {showPhasing && (
                <div className="mode-panel phasing-section" data-testid="comp-phasing-section">
                  <p className="mode-say">{txt.recipePhaseSay}</p>
                  {renderSlider({ id: "shift", label: txt.phasingShift, min: 0, max: subdivisions - 1, value: phasingOffset, onChange: (e) => setPhasingOffset(parseInt(e.target.value, 10)) })}
                  <PhasingVisualizer
                    pattern={pattern}
                    currentOffset={phasingOffset}
                    currentStep={activeStep}
                  />
                </div>
              )}

              {showIsorhythm && (
                <div className="mode-panel isorhythm-section" data-testid="comp-iso-section">
                  <p className="mode-say">
                    {isorhythmResult
                      ? `${isorhythmResult.colorLength} ${txt.isoNotesOver} ${isorhythmResult.pulses} ${txt.hitsUnit} : ${txt.isoReturnsAfter} ${isoTurns} ${isoTurns > 1 ? txt.isoTurnsMany : txt.isoTurnsOne}.`
                      : ""}
                  </p>
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
                      <p className="mode-hint">{txt.isoBassOnly}</p>
                    </div>
                  )}
                </div>
              )}

              {showRealignment && (
                <div className="mode-panel realignment-section" data-testid="comp-realign-section">
                  <p className="mode-say">{txt.recipeMeshSay}</p>
                  <div className="slider-group">
                    <div className="section-head">
                      <label className="slider-title" htmlFor="comp-bound">{txt.metricBound}</label>
                      <span className="lcd-value">{realignmentBoundary} {txt.steps}</span>
                    </div>
                    <input
                      id="comp-bound"
                      data-testid="comp-slider-bound"
                      type="range"
                      min="8"
                      max="64"
                      value={realignmentBoundary}
                      onChange={(e) => setRealignmentBoundary(parseInt(e.target.value, 10))}
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

        {/* Footer: "● en direct sur …", "Envoyer maintenant", listen, reset. */}
        <ExportTargetPanel
          txt={txt}
          exportTarget={exportTarget}
          showExportSuccess={showExportSuccess}
          handleExport={handleExport}
          handleClearOverrides={handleClearOverrides}
          isPlaying={isPlaying}
          togglePlayback={togglePlayback}
        />
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
