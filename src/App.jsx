import React, { useState, useEffect } from 'react';
import './App.css';
import PianoKeyboard from './components/Instruments/PianoKeyboard';
import Fretboard from './components/Instruments/Fretboard';
import PianoRoll from './components/Sequencer/PianoRoll';

import { getScaleNotes, generateChordsFromNNS, MODES } from './core/theory';
import { BRICKS } from './core/bricks';

function App() {
  const [notation, setNotation] = useState('us');
  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('scale'); // Par défaut : gamme entière pour voir les Target Tones !
  const [clickedChord, setClickedChord] = useState(null);
  
  const [layoutMode, setLayoutMode] = useState('all'); 
  const [activeTab, setActiveTab] = useState('sequencer');
  // NOUVEAU : Toggle pour les variations rythmiques
  const [useRhythmVariation, setUseRhythmVariation] = useState(false);

  const activeBrick = BRICKS.at(Number(currentBrickIndex));
  
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', activeBrick.theme.primary);
    document.documentElement.style.setProperty('--theme-bg', activeBrick.theme.bg);
    setClickedChord(null);
    setUseRhythmVariation(false); // Reset au changement de genre
  }, [currentBrickIndex]);

  const scaleNotes = getScaleNotes(activeBrick.rootValue, activeBrick.modeName);
  const compatibleChords = generateChordsFromNNS(activeBrick.rootValue, activeBrick.modeName, activeBrick.nnsProgression);

  const activeNoteValues = new Array();

  if (displayMode === 'scale') {
      scaleNotes.forEach(note => { activeNoteValues.push(note.value); });
  } else {
      if (clickedChord) {
          const rootVal = clickedChord.rootNote.value;
          const isMinor = clickedChord.nns.includes('-');
          const isDim = clickedChord.nns.includes('°') || clickedChord.nns.includes('b5');
          let thirdInterval = (isMinor || isDim) ? 3 : 4; 
          let fifthInterval = isDim ? 6 : 7;
          activeNoteValues.push(rootVal, (rootVal + thirdInterval) % 12, (rootVal + fifthInterval) % 12);
      } else {
          activeNoteValues.push(scaleNotes.at(0).value, scaleNotes.at(2).value, scaleNotes.at(4).value);
      }
  }

  const currentRootValue = clickedChord ? clickedChord.rootNote.value : activeBrick.rootValue;
  
  // CALCUL DE LA NOTE MAGIQUE (Target Tone)
  const modeData = Reflect.get(MODES, activeBrick.modeName);
  // La note magique n'apparaît que si on n'a cliqué sur aucun accord spécifique
  const targetValue = !clickedChord ? (activeBrick.rootValue + modeData.targetInterval) % 12 : -1;

  // Sélection du bon tableau de batterie (Base ou Variation)
  const activeDrums = useRhythmVariation && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks;

  return (
    // LARGEUR ÉTENDUE ICI POUR L'ÉCRAN 4K (1600px au lieu de 800px)
    <div className="app-container" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <h1>🎛️ VisualMusic DAW</h1>
      
      <div className="dashboard-panel" style={{ textAlign: 'center', maxWidth: '1600px' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#fff' }}>1. Sélection du Style</h2>
        
        <select 
          value={currentBrickIndex} 
          onChange={(e) => setCurrentBrickIndex(e.target.value)}
          style={{ padding: '10px', fontSize: '18px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#222', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', fontWeight: 'bold', width: '80%' }}
        >
          {BRICKS.map((brick, index) => (
            <option key={index} value={index}>{brick.name}</option>
          ))}
        </select>
        
        <div style={{ marginTop: '15px' }}>
            <span className="info-badge">⏱️ {activeBrick.bpm} BPM</span>
            <span className="info-badge">🎵 Mode: {activeBrick.modeName} (Émotion: {modeData.emotion})</span>
            <span className="info-badge">🎸 Accordage: {activeBrick.tuning}</span>
        </div>
        
        <div className="effects-text">
            💡 <strong>Règle de Prod :</strong> {activeBrick.effects}
        </div>
        <div style={{ color: '#aaa', fontSize: '13px', marginTop: '5px', fontStyle: 'italic' }}>
            🎧 {activeBrick.examples}
        </div>
        
        <div style={{marginTop: '20px', color: '#fff', fontSize: '15px', backgroundColor: '#111', padding: '15px', borderRadius: '4px'}}>
            <strong>Progression Magique : </strong> <br/><br/>
            
            {compatibleChords.map((c, i) => {
                const isSelected = clickedChord && clickedChord.nns === c.nns;
                return (
                    <span key={i}>
                        <button onClick={() => setClickedChord(c)} style={{ background: isSelected ? 'var(--theme-primary)' : '#222', color: isSelected ? '#000' : 'var(--theme-primary)', border: '2px solid var(--theme-primary)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', margin: '0 5px', transition: 'all 0.2s' }}>
                            {notation === 'us' ? c.chordNameUS : c.chordNameEU}
                        </button>
                        {i < compatibleChords.length - 1 ? ' ➜ ' : ''}
                    </span>
                );
            })}
            
            {clickedChord && (
                <button onClick={() => setClickedChord(null)} style={{marginLeft: '15px', padding: '5px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px'}}>🔄 Revenir à la base</button>
            )}
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={() => setLayoutMode('all')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #777', backgroundColor: layoutMode === 'all' ? '#555' : '#222', color: '#fff', cursor: 'pointer' }}>👁️ Tout afficher</button>
          <button onClick={() => setLayoutMode('tabs')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #777', backgroundColor: layoutMode === 'tabs' ? '#555' : '#222', color: '#fff', cursor: 'pointer' }}>🔍 Mode Focus</button>
      </div>

      {layoutMode === 'tabs' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setActiveTab('sequencer')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'sequencer' ? 'var(--theme-primary)' : '#333', color: activeTab === 'sequencer' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🥁 Séquenceurs</button>
              <button onClick={() => setActiveTab('piano')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'piano' ? 'var(--theme-primary)' : '#333', color: activeTab === 'piano' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🎹 Piano</button>
              <button onClick={() => setActiveTab('guitars')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'guitars' ? 'var(--theme-primary)' : '#333', color: activeTab === 'guitars' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🎸 Guitares</button>
          </div>
      )}

      <div style={{ marginBottom: '25px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => setNotation('us')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'us' ? 'var(--theme-primary)' : '#333', color: notation === 'us' ? '#000' : '#fff' }}>US</button>
        <button onClick={() => setNotation('eu')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'eu' ? 'var(--theme-primary)' : '#333', color: notation === 'eu' ? '#000' : '#fff' }}>EU</button>
        <div style={{ borderLeft: '2px solid #555', margin: '0 10px' }}></div>
        <button onClick={() => setDisplayMode('chord')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'chord' ? 'var(--theme-primary)' : '#333', color: displayMode === 'chord' ? '#000' : '#fff' }}>🎸 Accord</button>
        <button onClick={() => setDisplayMode('scale')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'scale' ? 'var(--theme-primary)' : '#333', color: displayMode === 'scale' ? '#000' : '#fff' }}>🎹 Gamme</button>
      </div>
      
      {(layoutMode === 'all' || activeTab === 'sequencer') && (
          <div style={{width: '100%', maxWidth: '1600px', marginBottom: '30px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{color: 'var(--theme-primary)'}}>🥁 Boîte à Rythmes</h3>
                {/* BOUTONS VARIATION RYTHMIQUE */}
                <div>
                    <button onClick={() => setUseRhythmVariation(false)} style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: !useRhythmVariation ? '#666' : '#222', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>Rythme de Base</button>
                    <button onClick={() => setUseRhythmVariation(true)} style={{ padding: '5px 10px', backgroundColor: useRhythmVariation ? '#666' : '#222', color: '#fff', border: '1px solid #555', cursor: 'pointer' }}>Variation</button>
                </div>
            </div>
            
            <PianoRoll tracks={activeDrums} totalSteps={activeBrick.id === 'breakbeat' ? 16 : 16} />
            <h3 style={{color: 'var(--theme-primary)', marginTop: '30px'}}>🎹 Séquenceur Mélodique</h3>
            <PianoRoll tracks={activeBrick.melodyTracks} totalSteps={16} />
          </div>
      )}

      {(layoutMode === 'all' || activeTab === 'piano' || activeTab === 'guitars') && (
          <div style={{ width: '100%', maxWidth: '1600px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#cf6679', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Fondamentale</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#64b5f6', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Tierce</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#81c784', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Quinte</span></div>
              {displayMode === 'scale' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#ffd700', borderRadius: '50%', boxShadow: '0 0 10px #ffd700' }}></div><span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>Note Magique (Target)</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#e0e0e0', borderRadius: '50%' }}></div><span style={{ color: '#aaa', fontSize: '14px' }}>Gamme</span></div>
                  </>
              )}
          </div>
      )}

      {(layoutMode === 'all' || activeTab === 'piano') && (
          <PianoKeyboard activeNotes={activeNoteValues} numOctaves={2} notation={notation} rootValue={currentRootValue} targetValue={targetValue} />
      )}

      {(layoutMode === 'all' || activeTab === 'guitars') && (
          <>
            <Fretboard instrument="guitar" activeNotes={activeNoteValues} notation={notation} stringTuning={activeBrick.guitarStrings} rootValue={currentRootValue} targetValue={targetValue} />
            <Fretboard instrument="bass" activeNotes={activeNoteValues} notation={notation} stringTuning={activeBrick.bassStrings} rootValue={currentRootValue} targetValue={targetValue} />
          </>
      )}
    </div>
  );
}

export default App;