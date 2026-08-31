import React from 'react';
import VoicingAlert from '../Intelligence/VoicingAlert';
import CustomSelect from '../Common/CustomSelect';
import { resolveChordSemitones, resolveScaleSemitones } from '../../core/theory';
import { getAvailableGuitarFingerings, getAvailableBassFingerings, getAvailableScaleFingerings, getAvailableSingleNoteFingerings } from '../../core/fingeringLogic';
import { useAppContext } from '../../context/AppContext';

export default function DictPositionPanel({
  family,
  dictType,
  dictRoot,
  dictOctave,
  dictActiveNotes,
  guitarFingering,
  bassFingering,
  uiTheme,
  selectedVoicingIndexGuitar,
  setSelectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  setSelectedVoicingIndexBass
}) {
  const { txt, notation } = useAppContext();

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
                  value={selectedVoicingIndexGuitar}
                  onChange={setSelectedVoicingIndexGuitar}
                  options={(() => {
                    if (!dictType) return [];
                    if (family === "note") {
                      const midi = dictActiveNotes[0]?.absoluteValue;
                      if (midi === undefined || midi === null) return [];
                      const avail = getAvailableSingleNoteFingerings(midi, 'guitar', notation);
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: `${txt.posNoteString || "String"} ${p.stringName} - ${txt.posNoteFret || "Fret"} ${p.fret}` }))
                      ];
                    }
                    if (family === "scale") {
                      const avail = getAvailableScaleFingerings(dictRoot, dictType, 'guitar', ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], txt.voicingOf || 'of');
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: p.label }))
                      ];
                    }
                    const avail = getAvailableGuitarFingerings(dictRoot, dictType, dictOctave, notation);
                    return [
                      { value: null, label: txt.voicingAllNotes || "All positions" },
                      ...avail.map(p => ({ value: p.id, label: p.label }))
                    ];
                  })()}
                  theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
                />
                {guitarFingering?.isOutOfRange && (
                  <div className="range-warning" style={{ color: "#ff4d4d", fontSize: "0.8em", marginTop: "4px" }}>
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
                  value={selectedVoicingIndexBass}
                  onChange={setSelectedVoicingIndexBass}
                  options={(() => {
                    if (!dictType) return [];
                    if (family === "note") {
                      const midi = dictActiveNotes[0]?.absoluteValue;
                      if (midi === undefined || midi === null) return [];
                      const avail = getAvailableSingleNoteFingerings(midi, 'bass', notation);
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: `${txt.posNoteString || "String"} ${p.stringName} - ${txt.posNoteFret || "Fret"} ${p.fret}` }))
                      ];
                    }
                    if (family === "scale") {
                      const avail = getAvailableScaleFingerings(dictRoot, dictType, 'bass', ['E1', 'A1', 'D2', 'G2'], txt.voicingOf || 'of');
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: p.label }))
                      ];
                    }
                    const avail = getAvailableBassFingerings(dictRoot, dictType, dictOctave, notation);
                    return [
                      { value: null, label: txt.voicingAllNotes || "All positions" },
                      ...avail.map(p => ({ value: p.id, label: p.label }))
                    ];
                  })()}
                  theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
                />
                {bassFingering?.isOutOfRange && (
                  <div className="range-warning" style={{ color: "#ff4d4d", fontSize: "0.8em", marginTop: "4px" }}>
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
