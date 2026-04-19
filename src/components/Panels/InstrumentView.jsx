import React from 'react';
import AudioVisualizer from "../Visualizer/AudioVisualizer";
import PianoRoll from "../Sequencer/PianoRoll";
import DAWHelper from "../Sequencer/DAWHelper";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";

const InstrumentView = ({
  masterAnalyser,
  layoutMode,
  activeTab,
  setActiveTab,
  appMode,
  displayMode,
  activeDrums,
  activeMelody,
  currentStep,
  currentBpm,
  activeBrick,
  lang,
  dictType,
  currentRootValue,
  targetValue,
  activeNotes,
  notation,
  autoPlayNote,
  currentlyPlayingNotes,
  contextualScaleAbsoluteValues,
  showFingering,
  fingeringMode,
  clickedChord,
  selectedRootString,
  setSelectedRootString,
  guitarFingering,
  bassFingering,
  fretboardZone,
  lastClickedContext,
  singlePlayContext,
  txt
}) => {
  return (
    <div
      className="layout-col layout-center"
      style={{ alignItems: "center" }}
    >
      {/* Reactive Audio Visualizer Header */}
      <div style={{ width: "100%", marginBottom: "15px" }}>
        <AudioVisualizer analyser={masterAnalyser} height="80px" />
      </div>
      {layoutMode === "tabs" && (
        <div style={{ width: "100%", display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("sequencer")}
            className={`btn-tab${activeTab === "sequencer" ? " btn-tab--active" : ""}`}
          >
            {txt.tabDrums}
          </button>
          <button
            onClick={() => setActiveTab("piano")}
            className={`btn-tab${activeTab === "piano" ? " btn-tab--active" : ""}`}
          >
            {txt.tabPiano}
          </button>
          <button
            onClick={() => setActiveTab("guitars")}
            className={`btn-tab${activeTab === "guitars" ? " btn-tab--active" : ""}`}
          >
            {txt.tabGuitars}
          </button>
        </div>
      )}

      {appMode === "studio" &&
        (layoutMode === "all" || activeTab === "sequencer") && (
          <div
            style={{
              width: "100%",
              marginBottom: "30px",
              backgroundColor: "var(--bg-panel)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
              {txt.drumMachine}
            </h3>
            <div className="scrollable-instrument">
              <PianoRoll
                tracks={activeDrums}
                totalSteps={16}
                currentStep={currentStep}
              />
            </div>
            <h3
              style={{ color: "var(--theme-primary)", marginTop: "30px" }}
            >
              {txt.melodicSeq}
            </h3>
            <div className="scrollable-instrument">
              <PianoRoll
                tracks={activeMelody}
                totalSteps={16}
                currentStep={currentStep}
              />
            </div>
            <DAWHelper
              drumTracks={activeDrums}
              melodyTracks={activeMelody}
              bpm={currentBpm}
              genreName={activeBrick.name?.[lang] || activeBrick.name?.en || ""}
              lang={lang}
            />
          </div>
        )}

      {(appMode === "dictionary" ||
        layoutMode === "all" ||
        activeTab === "piano" ||
        activeTab === "guitars") && (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            padding: "15px",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "8px",
            border: "1px solid var(--border-default)",
            marginBottom: "15px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "var(--role-root)",
                borderRadius: "50%",
              }}
            ></div>
            <span style={{ color: "#ccc", fontSize: "14px" }}>
              {txt.labelRoot}
            </span>
          </div>
          {dictType !== "single_note" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: "var(--role-third)",
                    borderRadius: "50%",
                  }}
                ></div>
                <span style={{ color: "#ccc", fontSize: "14px" }}>
                  {txt.labelThird}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: "var(--role-fifth)",
                    borderRadius: "50%",
                  }}
                ></div>
                <span style={{ color: "#ccc", fontSize: "14px" }}>
                  {txt.labelFifth}
                </span>
              </div>
            </>
          )}
          {(appMode === "studio" && displayMode === "scale") ||
          (dictType && dictType.includes("scale")) ? (
            <>
              {appMode === "studio" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginLeft: "20px",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      backgroundColor: "var(--role-target)",
                      boxShadow: "0 0 10px var(--role-target)",
                      borderRadius: "50%",
                    }}
                  ></div>
                  <span
                    style={{
                      color: "#ffd700",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {txt.labelTarget}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: "var(--role-scale)",
                    borderRadius: "50%",
                  }}
                ></div>
                <span style={{ color: "#ccc", fontSize: "14px" }}>
                  {txt.labelScale}
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {(appMode === "dictionary" ||
        layoutMode === "all" ||
        activeTab === "piano") && (
        <div className="scrollable-instrument" style={{ width: "100%" }}>
          <PianoKeyboard
            activeNotes={activeNotes}
            numOctaves={3}
            notation={notation}
            rootValue={currentRootValue}
            targetValue={targetValue}
            onNoteClick={autoPlayNote}
            currentlyPlayingNotes={currentlyPlayingNotes}
            contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
            dictType={appMode === "dictionary" ? dictType : null}
          />
        </div>
      )}

      {(appMode === "dictionary" ||
        layoutMode === "all" ||
        activeTab === "guitars") && (
        <div className="scrollable-instrument" style={{ width: "100%", paddingLeft: "35px" }}>
          {showFingering && ((appMode === "studio" && clickedChord) || (appMode === "dictionary" && !dictType.includes("scale"))) && (
            <div style={{ marginBottom: "15px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", marginLeft: "-35px" }}>
                <span style={{ color: "#d4c4a8", fontSize: "14px", fontWeight: "bold" }}>{txt.rootStringLabel}</span>
                {[
                  { idx: 5, label: "E", openVal: 4 },
                  { idx: 4, label: "A", openVal: 9 },
                  { idx: 3, label: "D", openVal: 2 },
                ].map(str => {
                  const rootVal = appMode === "dictionary" ? currentRootValue : clickedChord.rootNote.value;
                  const rootInThisString = (rootVal - str.openVal + 12) % 12;
                  const fretText = rootInThisString === 0 ? txt.fretOpen : `${txt.fretPrefix}${rootInThisString}`;
                  const isActive = selectedRootString === str.idx;
                  return (
                    <button
                      key={str.idx}
                      onClick={() => setSelectedRootString(isActive ? null : str.idx)}
                      style={{
                        padding: "5px 12px",
                        background: isActive ? "var(--theme-primary)" : "#222",
                        color: isActive ? "#fff" : "#ccc",
                        border: `1px solid ${isActive ? "var(--theme-primary)" : "#555"}`,
                        borderRadius: "15px",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "all 0.2s"
                      }}
                    >
                      {str.label} ({fretText})
                    </button>
                  );
                })}
              </div>
              {guitarFingering?.outOfRange && (
                  <div style={{ color: "#e74c3c", fontSize: "13px", fontWeight: "bold" }}>{txt.warningOutOfRange}</div>
              )}
              {guitarFingering?.difficultStretch && !guitarFingering?.outOfRange && (
                  <div style={{ color: "#f39c12", fontSize: "13px", fontWeight: "bold" }}>{txt.warningDifficultStretch}</div>
              )}
            </div>
          )}
          <Fretboard
            instrument="guitar"
            activeNotes={activeNotes}
            notation={notation}
            stringTuning={activeBrick.guitarStrings || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']}
            rootValue={currentRootValue}
            targetValue={targetValue}
            fretboardZone={fretboardZone}
            onNoteClick={autoPlayNote}
            currentlyPlayingNotes={currentlyPlayingNotes}
            contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
            dictType={appMode === "dictionary" ? dictType : null}
            lastClickedContext={lastClickedContext}
            singlePlayContext={singlePlayContext}
            showFingering={showFingering}
            fingeringMode={fingeringMode}
            fingering={guitarFingering?.fingeringMap}
          />
          <br />
          <Fretboard
            instrument="bass"
            activeNotes={activeNotes}
            notation={notation}
            stringTuning={activeBrick.bassStrings || ['E1', 'A1', 'D2', 'G2']}
            rootValue={currentRootValue}
            targetValue={targetValue}
            fretboardZone={fretboardZone}
            onNoteClick={autoPlayNote}
            currentlyPlayingNotes={currentlyPlayingNotes}
            contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
            dictType={appMode === "dictionary" ? dictType : null}
            lastClickedContext={lastClickedContext}
            singlePlayContext={singlePlayContext}
            showFingering={showFingering}
            fingeringMode={fingeringMode}
            fingering={bassFingering}
          />
        </div>
      )}
    </div>
  );
};

export default InstrumentView;
