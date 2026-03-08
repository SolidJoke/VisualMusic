import React, { useState, useEffect } from 'react';
import './App.css';
import PianoKeyboard from './components/Instruments/PianoKeyboard';
import Fretboard from './components/Instruments/Fretboard';
import PianoRoll from './components/Sequencer/PianoRoll';

// NOUVEAU : On importe NOTES pour générer notre menu déroulant alphabétique
import { getScaleNotes, generateChordsFromNNS, MODES, NOTES } from './core/theory';
import { BRICKS } from './core/bricks';

function App() {
  const [appMode, setAppMode] = useState('studio'); 
  const [notation, setNotation] = useState('us');

  // --- STATES DU MODE STUDIO ---
  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('scale'); 
  const [clickedChord, setClickedChord] = useState(null);
  const [layoutMode, setLayoutMode] = useState('all'); 
  const [activeTab, setActiveTab] = useState('sequencer');
  const [useRhythmVariation, setUseRhythmVariation] = useState(false);

  // --- STATES DU MODE DICTIONNAIRE (NOUVEAU) ---
  const [dictRoot, setDictRoot] = useState(0); // 0 = Do (C) par défaut
  const [dictType, setDictType] = useState('single_note'); 

  const activeBrick = BRICKS.at(Number(currentBrickIndex));
  
  useEffect(() => {
    if (appMode === 'studio') {
        document.documentElement.style.setProperty('--theme-primary', activeBrick.theme.primary);
        document.documentElement.style.setProperty('--theme-bg', activeBrick.theme.bg);
    } else {
        document.documentElement.style.setProperty('--theme-primary', '#ffd700'); 
        document.documentElement.style.setProperty('--theme-bg', '#1a1a1a'); 
    }
    setClickedChord(null);
    setUseRhythmVariation(false); 
  }, [currentBrickIndex, appMode, activeBrick]);

  // --- LE CERVEAU SÉPARÉ EN DEUX (AIGUILLAGE LOGIQUE) ---
  let activeNoteValues = new Array();
  let currentRootValue = 0;
  let targetValue = -1;

  if (appMode === 'studio') {
      const scaleNotes = getScaleNotes(activeBrick.rootValue, activeBrick.modeName);
      const modeData = Reflect.get(MODES, activeBrick.modeName);

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
      currentRootValue = clickedChord ? clickedChord.rootNote.value : activeBrick.rootValue;
      targetValue = !clickedChord ? (activeBrick.rootValue + modeData.targetInterval) % 12 : -1;

  } else {
      // LOGIQUE DU MODE DICTIONNAIRE
      currentRootValue = Number(dictRoot);
      
      if (dictType === 'scale_major') {
          const notes = getScaleNotes(currentRootValue, 'Ionian');
          notes.forEach(n => activeNoteValues.push(n.value));
      } else if (dictType === 'scale_minor') {
          const notes = getScaleNotes(currentRootValue, 'Aeolian');
          notes.forEach(n => activeNoteValues.push(n.value));
      } else if (dictType === 'chord_major') {
          activeNoteValues.push(currentRootValue, (currentRootValue + 4) % 12, (currentRootValue + 7) % 12);
      } else if (dictType === 'chord_minor') {
          activeNoteValues.push(currentRootValue, (currentRootValue + 3) % 12, (currentRootValue + 7) % 12);
      } else if (dictType === 'single_note') {
          activeNoteValues.push(currentRootValue);
      }
  }

  const activeDrums = useRhythmVariation && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks;

  return (
    <div className="app-container" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{color: '#fff'}}>🎛️ Vmu : VisualMusic Coach</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px', padding: '10px', backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333', flexWrap: 'wrap' }}>
          <button onClick={() => setAppMode('studio')} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', backgroundColor: appMode === 'studio' ? 'var(--theme-primary)' : '#222', color: appMode === 'studio' ? '#000' : '#fff', border: 'none', transition: 'all 0.3s' }}>
              🎛️ Mode Studio (Genres & Rythmes)
          </button>
          <button onClick={() => setAppMode('dictionary')} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', backgroundColor: appMode === 'dictionary' ? 'var(--theme-primary)' : '#222', color: appMode === 'dictionary' ? '#000' : '#fff', border: 'none', transition: 'all 0.3s' }}>
              📖 Mode Dictionnaire (Notes & Gammes)
          </button>
      </div>

      {appMode === 'studio' && (
          <>
              <div className="dashboard-panel" style={{ textAlign: 'center', maxWidth: '1600px' }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#fff' }}>1. Sélection du Style</h2>
                <select value={currentBrickIndex} onChange={(e) => setCurrentBrickIndex(e.target.value)} style={{ padding: '10px', fontSize: '18px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#222', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', fontWeight: 'bold', width: '80%' }}>
                  {BRICKS.map((brick, index) => (<option key={index} value={index}>{brick.name}</option>))}
                </select>
                
                <div style={{ marginTop: '15px' }}>
                    <span className="info-badge">⏱️ {activeBrick.bpm} BPM</span>
                    <span className="info-badge">🎵 Mode: {activeBrick.modeName}</span>
                    <span className="info-badge">🎸 Accordage: {activeBrick.tuning}</span>
                </div>
                
                <div className="effects-text">💡 <strong>Règle de Prod :</strong> {activeBrick.effects}</div>
                <div style={{ color: '#aaa', fontSize: '13px', marginTop: '5px', fontStyle: 'italic' }}>🎧 {activeBrick.examples}</div>
                
                <div style={{marginTop: '20px', color: '#fff', fontSize: '15px', backgroundColor: '#111', padding: '15px', borderRadius: '4px'}}>
                    <strong>Progression Magique : </strong> <br/><br/>
                    {generateChordsFromNNS(activeBrick.rootValue, activeBrick.modeName, activeBrick.nnsProgression).map((c, i) => {
                        const isSelected = clickedChord && clickedChord.nns === c.nns;
                        return (
                            <span key={i}>
                                <button onClick={() => setClickedChord(c)} style={{ background: isSelected ? 'var(--theme-primary)' : '#222', color: isSelected ? '#000' : 'var(--theme-primary)', border: '2px solid var(--theme-primary)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', margin: '0 5px', transition: 'all 0.2s' }}>
                                    {notation === 'us' ? c.chordNameUS : c.chordNameEU}
                                </button>
                                {i < activeBrick.nnsProgression.length - 1 ? ' ➜ ' : ''}
                            </span>
                        );
                    })}
                    {clickedChord && (<button onClick={() => setClickedChord(null)} style={{marginLeft: '15px', padding: '5px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px'}}>🔄 Revenir à la base</button>)}
                </div>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button onClick={() => setLayoutMode('all')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #777', backgroundColor: layoutMode === 'all' ? '#555' : '#222', color: '#fff', cursor: 'pointer' }}>👁️ Tout afficher</button>
                  <button onClick={() => setLayoutMode('tabs')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #777', backgroundColor: layoutMode === 'tabs' ? '#555' : '#222', color: '#fff', cursor: 'pointer' }}>🔍 Mode Focus</button>
              </div>

              {layoutMode === 'tabs' && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
                      <button onClick={() => setActiveTab('sequencer')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'sequencer' ? 'var(--theme-primary)' : '#333', color: activeTab === 'sequencer' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🥁 Séquenceurs</button>
                      <button onClick={() => setActiveTab('piano')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'piano' ? 'var(--theme-primary)' : '#333', color: activeTab === 'piano' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🎹 Piano</button>
                      <button onClick={() => setActiveTab('guitars')} style={{ padding: '10px', fontWeight: 'bold', backgroundColor: activeTab === 'guitars' ? 'var(--theme-primary)' : '#333', color: activeTab === 'guitars' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🎸 Guitares</button>
                  </div>
              )}
          </>
      )}

      {appMode === 'dictionary' && (
          <div className="dashboard-panel" style={{ textAlign: 'center', maxWidth: '1600px', backgroundColor: '#2a2a2a', border: '1px solid #ffd700' }}>
              <h2 style={{ margin: '0 0 15px 0', color: 'var(--theme-primary)' }}>📖 Explorateur Libre</h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Note de base (Fondamentale)</label>
                      <select value={dictRoot} onChange={(e) => setDictRoot(e.target.value)} style={{ padding: '10px', fontSize: '18px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#111', color: '#fff', border: '1px solid #555' }}>
                          {NOTES.map(n => (
                              <option key={n.value} value={n.value}>{notation === 'us' ? n.us : n.eu}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Type de structure</label>
                      <select value={dictType} onChange={(e) => setDictType(e.target.value)} style={{ padding: '10px', fontSize: '18px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#111', color: '#fff', border: '1px solid #555' }}>
                          <option value="single_note">Note Unique (Apprendre le manche)</option>
                          <option value="chord_major">Accord Majeur (1-3-5)</option>
                          <option value="chord_minor">Accord Mineur (1-b3-5)</option>
                          <option value="scale_major">Gamme Majeure (Ionian)</option>
                          <option value="scale_minor">Gamme Mineure (Aeolian)</option>
                      </select>
                  </div>
              </div>
          </div>
      )}


      <div style={{ marginBottom: '25px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => setNotation('us')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'us' ? 'var(--theme-primary)' : '#333', color: notation === 'us' ? '#000' : '#fff' }}>US (A, B, C)</button>
        <button onClick={() => setNotation('eu')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'eu' ? 'var(--theme-primary)' : '#333', color: notation === 'eu' ? '#000' : '#fff' }}>EU (Do, Ré, Mi)</button>
        
        {/* Les boutons Accord/Gamme n'ont de sens qu'en mode Studio ! */}
        {appMode === 'studio' && (
            <>
                <div style={{ borderLeft: '2px solid #555', margin: '0 10px' }}></div>
                <button onClick={() => setDisplayMode('chord')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'chord' ? 'var(--theme-primary)' : '#333', color: displayMode === 'chord' ? '#000' : '#fff' }}>🎸 Accord</button>
                <button onClick={() => setDisplayMode('scale')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'scale' ? 'var(--theme-primary)' : '#333', color: displayMode === 'scale' ? '#000' : '#fff' }}>🎹 Gamme</button>
            </>
        )}
      </div>
      
      {appMode === 'studio' && (layoutMode === 'all' || activeTab === 'sequencer') && (
          <div style={{width: '100%', maxWidth: '1600px', marginBottom: '30px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{color: 'var(--theme-primary)'}}>🥁 Boîte à Rythmes</h3>
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

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'piano' || activeTab === 'guitars') && (
          <div style={{ width: '100%', maxWidth: '1600px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#cf6679', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Fondamentale</span></div>
              
              {/* On n'affiche Bleu/Vert que si on ne cherche pas une Note Unique */}
              {dictType !== 'single_note' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#64b5f6', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Tierce</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#81c784', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Quinte</span></div>
                  </>
              )}

              {(appMode === 'studio' && displayMode === 'scale') || dictType.includes('scale') ? (
                  <>
                    {appMode === 'studio' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#ffd700', borderRadius: '50%', boxShadow: '0 0 10px #ffd700' }}></div><span style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>Note Magique (Target)</span></div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#e0e0e0', borderRadius: '50%' }}></div><span style={{ color: '#aaa', fontSize: '14px' }}>Gamme</span></div>
                  </>
              ) : null}
          </div>
      )}

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'piano') && (
          <PianoKeyboard activeNotes={activeNoteValues} numOctaves={2} notation={notation} rootValue={currentRootValue} targetValue={targetValue} />
      )}

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'guitars') && (
          <>
            <Fretboard instrument="guitar" activeNotes={activeNoteValues} notation={notation} rootValue={currentRootValue} targetValue={targetValue} />
            <Fretboard instrument="bass" activeNotes={activeNoteValues} notation={notation} rootValue={currentRootValue} targetValue={targetValue} />
          </>
      )}
    </div>
  );
}

export default App;