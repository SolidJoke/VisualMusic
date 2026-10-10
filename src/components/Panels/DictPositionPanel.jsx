import React from 'react';
import VoicingAlert from '../Intelligence/VoicingAlert';
import CustomSelect from '../Common/CustomSelect';
import { resolveChordSemitones, resolveScaleSemitones } from '../../core/theory';
import { useAppContext } from '../../context/AppContext';

/**
 * INST-B1 — the window lists each neck's placements as the engine computed
 * them (useMusicEngine's placementsByInstrument, core/placements.js
 * listPlacements: nut -> body), the very entries the Position arrows step
 * through, in the same order; it used to call fingeringLogic.js itself (with
 * the standard tuning, whatever the style's). The first entry is the default
 * placement, named by the shape it shows (txt.positionDefault); a single note
 * has none, every place of it is lit ("Toutes les notes").
 */
function windowOptions(placements, txt) {
  const label = (p) => {
    if (p.fingering?.isScaleMode) return `${p.index + 1} ${txt.voicingOf || 'of'} ${placements.length}`;
    if (p.stringName !== undefined) return `${txt.posNoteString || "String"} ${p.stringName} - ${txt.posNoteFret || "Fret"} ${p.fret}`;
    return p.label;
  };
  const shown = placements.find((p) => p.isDefault);
  const defaultLabel = shown
    ? (typeof txt.positionDefault === "function" ? txt.positionDefault(label(shown)) : label(shown))
    : (txt.voicingAllNotes || "All positions");
  return [
    { value: null, label: defaultLabel },
    ...placements.map((p) => ({ value: p.index, label: label(p) })),
  ];
}

export default function DictPositionPanel({
  family,
  dictType,
  dictRoot,
  guitarFingering,
  bassFingering,
  placementsByInstrument = {},
  placementByInstrument = {},
  setPlacementIndex = () => {}
}) {
  const { txt } = useAppContext();

  return (
    <>
      {/* Shared Position Selectors (Guitar/Bass) for Chords and Scales */}
      {(family === "chord" || family === "scale" || family === "note") && (
        <div className="dict-panel__positions">

          {/* Voicing Alerts — non-blocking analysis banners */}
          {(guitarFingering || bassFingering) && (
            <div className="dict-panel__alerts" style={{ marginBottom: '1rem' }}>
              {guitarFingering && (
                <VoicingAlert
                  fingeringMap={guitarFingering?.fingeringMap}
                  instrument="guitar"
                  rootValue={Number(dictRoot)}
                  intervals={(() => {
                    if (family === "note") return [0];
                    if (family === 'scale') return resolveScaleSemitones(dictType);
                    const chordData = resolveChordSemitones(dictType);
                    return chordData ? chordData.semitones : null;
                  })()}
                />
              )}
              {bassFingering && (
                <VoicingAlert
                  fingeringMap={bassFingering?.fingeringMap}
                  instrument="bass"
                  rootValue={Number(dictRoot)}
                  intervals={(() => {
                    if (family === "note") return [0];
                    if (family === 'scale') return resolveScaleSemitones(dictType);
                    const chordData = resolveChordSemitones(dictType);
                    return chordData ? chordData.semitones : null;
                  })()}
                />
              )}
            </div>
          )}

          {/* Guitar Position Selector */}
          {dictType && (
            <div className="dictionary-fretboard-options">
              <div className="option-group">
                <label className="field-label">🎸 {txt.guitarPosition || "Guitar Position"}</label>
                <CustomSelect
                  value={placementByInstrument.guitar?.index ?? null}
                  onChange={(index) => setPlacementIndex("guitar", index)}
                  options={windowOptions(placementsByInstrument.guitar ?? [], txt)}
                />
                {guitarFingering?.isOutOfRange && (
                  <div className="range-warning" style={{ color: "var(--color-error)", fontSize: "0.8em", marginTop: "4px" }}>
                    ⚠️ {txt.outOfRangeGuitar || "Guitar range exceeded"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bass Position Selector */}
          {dictType && (
            <div className="dictionary-fretboard-options" style={{ marginTop: "0.5rem" }}>
              <div className="option-group">
                <label className="field-label">🎸 {txt.bassPosition || "Bass Position"}</label>
                <CustomSelect
                  value={placementByInstrument.bass?.index ?? null}
                  onChange={(index) => setPlacementIndex("bass", index)}
                  options={windowOptions(placementsByInstrument.bass ?? [], txt)}
                />
                {bassFingering?.isOutOfRange && (
                  <div className="range-warning" style={{ color: "var(--color-error)", fontSize: "0.8em", marginTop: "4px" }}>
                    ⚠️ {txt.outOfRangeBass || "Bass range exceeded"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
