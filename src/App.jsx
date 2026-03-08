import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PianoKeyboard from './components/Instruments/PianoKeyboard';
import Fretboard from './components/Instruments/Fretboard';
import PianoRoll from './components/Sequencer/PianoRoll';

import { getScaleNotes, generateChordsFromNNS, MODES, NOTES, getClosestInversion } from './core/theory';
import { BRICKS } from './core/bricks';
import * as Tone from 'tone';

// --- CRÉATION DES SYNTHÉTISEURS (Notre groupe de musiciens virtuels) ---
const chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
}).toDestination();

// La Batterie (Volumes ajustés pour un bon mixage)
const kickSynth = new Tone.MembraneSynth({ volume: -2 }).toDestination();
const snareSynth = new Tone.NoiseSynth({ volume: -10, noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0 } }).toDestination();
const hatSynth = new Tone.MetalSynth({ volume: -18, frequency: 200, envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination();

// Le Bassiste (Réglé avec Sustain à 0 pour la Psytrance et le groove)
const bassSynth = new Tone.MonoSynth({
    volume: -6, oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0, baseFrequency: 60, octaves: 4 }
}).toDestination();

const noteNamesArray = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];


function App() {
  const [appMode, setAppMode] = useState('studio'); 
  const [notation, setNotation] = useState('us');

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-12); 
  const [currentStep, setCurrentStep] = useState(-1); // Le curseur d'animation

  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('chord'); 
  const [clickedChord, setClickedChord] = useState(null);
  const [layoutMode, setLayoutMode] = useState('all'); 
  const [activeTab, setActiveTab] = useState('sequencer');
  const [useRhythmVariation, setUseRhythmVariation] = useState(false);
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState(new Array());

  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState('single_note'); 
  const [fretboardZone, setFretboardZone] = useState('all');

  const activeBrick = BRICKS.at(Number(currentBrickIndex));
  const activeDrums = useRhythmVariation && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks;

  // Calcul mathématique de la théorie (comme avant)
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
              if (currentAbsoluteNotes.length === 3) {
                  activeNoteValues.push(currentAbsoluteNotes.at(0), currentAbsoluteNotes.at(1), currentAbsoluteNotes.at(2));
              }
          } else {
              const n1 = scaleNotes.at(0).value;
              const n2 = scaleNotes.at(2).value;
              const n3 = scaleNotes.at(4).value;
              activeNoteValues.push(n1 + 12, n2 + (n2 < n1 ? 24 : 12), n3 + (n3 < n1 ? 24 : 12));
          }
      }
      currentRootValue = clickedChord ? clickedChord.rootNote.value : activeBrick.rootValue;
      targetValue = !clickedChord ? (activeBrick.rootValue + modeData.targetInterval) % 12 : -1;
  } else {
      currentRootValue = Number(dictRoot);
      if (dictType === 'scale_major') getScaleNotes(currentRootValue, 'Ionian').forEach(n => activeNoteValues.push(n.value));
      else if (dictType === 'scale_minor') getScaleNotes(currentRootValue, 'Aeolian').forEach(n => activeNoteValues.push(n.value));
      else if (dictType === 'chord_major') activeNoteValues.push(currentRootValue + 12, currentRootValue + 4 + 12, currentRootValue + 7 + 12);
      else if (dictType === 'chord_minor') activeNoteValues.push(currentRootValue + 12, currentRootValue + 3 + 12, currentRootValue + 7 + 12);
      else if (dictType === 'single_note') activeNoteValues.push(currentRootValue);
  }

  // REFS : Permettent à la boucle audio de toujours lire la dernière donnée sans se désynchroniser
  const drumRef = useRef(activeDrums);
  const melodyRef = useRef(activeBrick.melodyTracks);
  const rootRef = useRef(currentRootValue);

  drumRef.current = activeDrums;
  melodyRef.current = activeBrick.melodyTracks;
  rootRef.current = currentRootValue;

  // CHANGEMENT DE THÈME ET TEMPO
  useEffect(() => {
    if (appMode === 'studio') {
        document.documentElement.style.setProperty('--theme-primary', activeBrick.theme.primary);
        document.documentElement.style.setProperty('--theme-bg', activeBrick.theme.bg);
        Tone.Transport.bpm.value = activeBrick.bpm; // Le tempo change direct si on change de genre !
    } else {
        document.documentElement.style.setProperty('--theme-primary', '#ffd700'); 
        document.documentElement.style.setProperty('--theme-bg', '#1a1a1a'); 
    }
    setClickedChord(null);
    setUseRhythmVariation(false); 
    setCurrentAbsoluteNotes(new Array()); 
  }, [currentBrickIndex, appMode, activeBrick]);

  useEffect(() => { Tone.Destination.volume.value = masterVolume; }, [masterVolume]);

  // --- LA BOUCLE AUDIO PRINCIPALE (Le Métronome) ---
  useEffect(() => {
      let stepCounter = 0;
      
      const repeat = (time) => {
          const drums = drumRef.current;
          const melodies = melodyRef.current;
          const rootVal = rootRef.current;

          // 1. Jouer le Kick
          const kick = drums.find(d => d.name.toLowerCase().includes('kick'));
          if (kick && kick.activeSteps.includes(stepCounter)) kickSynth.triggerAttackRelease("C1", "8n", time);

          // 2. Jouer la Snare/Clap
          const snare = drums.find(d => d.name.toLowerCase().includes('snare') || d.name.toLowerCase().includes('clap'));
          if (snare && snare.activeSteps.includes(stepCounter)) snareSynth.triggerAttackRelease("16n", time);

          // 3. Jouer les Hi-Hats / Cymbales (Gestion de la vélocité)
          const hat = drums.find(d => d.name.toLowerCase().includes('hat') || d.name.toLowerCase().includes('clock'));
          if (hat && hat.activeSteps.includes(stepCounter)) {
              let vel = hat.lowVelocitySteps && hat.lowVelocitySteps.includes(stepCounter) ? 0.3 : 0.8;
              hatSynth.triggerAttackRelease("32n", time, vel);
          }

     // 4. Jouer la Basse et les Mélodies (CORRIGÉ)
          if (melodies && melodies.length > 0) {
              melodies.forEach(track => {
                  if (track.activeSteps.includes(stepCounter)) {
                      // On applique la vélocité réduite si c'est la première note après le kick (Règle Psytrance)
                      let vel = track.lowVelocitySteps && track.lowVelocitySteps.includes(stepCounter) ? 0.4 : 0.9;
                      
                      // On détecte si c'est une basse (Grave, Octave 1) ou une guitare/lead (Aigu, Octave 3)
                      let octave = track.name.toLowerCase().includes('bass') ? 1 : 3;
                      let bassNote = `${noteNamesArray[rootVal % 12]}${octave}`; 
                      
                      bassSynth.triggerAttackRelease(bassNote, "16n", time, vel);
                  }
              });
          }

          // 5. Animation visuelle UI
          Tone.Draw.schedule(() => {
              setCurrentStep(stepCounter);
          }, time);

          stepCounter = (stepCounter + 1) % 16;
      };

      // Si le bouton Play est pressé, on programme la boucle toutes les double-croches ("16n")
      if (isPlaying) {
          Tone.Transport.scheduleRepeat(repeat, "16n");
      } else {
          Tone.Transport.cancel();
          setCurrentStep(-1);
          stepCounter = 0;
      }

      return () => Tone.Transport.cancel(); // Nettoyage quand le composant se met à jour
  }, [isPlaying]);

  const togglePlayback = async () => {
      if (!isAudioReady) {
          await Tone.start();
          Tone.Destination.volume.value = masterVolume; 
          setIsAudioReady(true);
      }
      if (isPlaying) {
          Tone.Transport.pause();
          setIsPlaying(false);
      } else {
          Tone.Transport.start();
          setIsPlaying(true);
      }
  };

  const handleChordClick = async (c) => {
      setClickedChord(c);
      if (!isAudioReady) {
          await Tone.start();
          Tone.Destination.volume.value = masterVolume;
          setIsAudioReady(true);
      }
      const rootVal = c.rootNote.value;
      const isMinor = c.nns.includes('-');
      const isDim = c.nns.includes('°') || c.nns.includes('b5');
      let thirdInterval = (isMinor || isDim) ? 3 : 4; 
      let fifthInterval = isDim ? 6 : 7;
      
      const nextNotes = getClosestInversion(currentAbsoluteNotes, rootVal, thirdInterval, fifthInterval);
      const notesToPlay = nextNotes.map(n => `${noteNamesArray[n % 12]}${Math.floor(n / 12) + 3}`);

      // On ajoute un tout petit peu de douceur à l'accord
      chordSynth.triggerAttackRelease(notesToPlay, "2n");
      setCurrentAbsoluteNotes(nextNotes);
  };

  return (
    <div className="app-container" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{color: '#fff'}}>🎛️ Vmu : VisualMusic Coach</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', padding: '10px', backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333', flexWrap: 'wrap' }}>
          <button onClick={() => setAppMode('studio')} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', backgroundColor: appMode === 'studio' ? 'var(--theme-primary)' : '#222', color: appMode === 'studio' ? '#000' : '#fff', border: 'none', transition: 'all 0.3s' }}>🎛️ Mode Studio (Genres)</button>
          <button onClick={() => setAppMode('dictionary')} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', backgroundColor: appMode === 'dictionary' ? 'var(--theme-primary)' : '#222', color: appMode === 'dictionary' ? '#000' : '#fff', border: 'none', transition: 'all 0.3s' }}>📖 Mode Dictionnaire</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '25px', marginBottom: '30px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: `1px solid ${isPlaying ? '#4CAF50' : '#333'}`, transition: 'all 0.3s' }}>
          <button 
              onClick={togglePlayback}
              style={{ padding: '12px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: isPlaying ? '#e53935' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: isPlaying ? '0 0 15px rgba(229, 57, 53, 0.4)' : 'none' }}
          >
              {isPlaying ? '⏹️ STOP AUDIO' : '🔊 ACTIVER L\'AUDIO'}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                  🔊 Volume Master ({masterVolume} dB)
              </label>
              <input 
                  type="range" min="-40" max="0" value={masterVolume} 
                  onChange={(e) => setMasterVolume(e.target.value)}
                  style={{ cursor: 'pointer', width: '150px' }}
              />
          </div>
          
          {!isAudioReady && (
              <div style={{ color: '#ff9800', fontSize: '13px', fontStyle: 'italic', maxWidth: '200px', lineHeight: '1.4' }}>
                  👆 Cliquez pour lancer la boîte à rythmes et débloquer les accords.
              </div>
          )}
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
                                <button onClick={() => handleChordClick(c)} style={{ background: isSelected ? 'var(--theme-primary)' : '#222', color: isSelected ? '#000' : 'var(--theme-primary)', border: '2px solid var(--theme-primary)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', margin: '0 5px', transition: 'all 0.2s' }}>
                                    {notation === 'us' ? c.chordNameUS : c.chordNameEU}
                                </button>
                                {i < activeBrick.nnsProgression.length - 1 ? ' ➜ ' : ''}
                            </span>
                        );
                    })}
                    {clickedChord && (<button onClick={() => { setClickedChord(null); setCurrentAbsoluteNotes(new Array()); }} style={{marginLeft: '15px', padding: '5px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px'}}>🔄 Revenir à la base</button>)}
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
                          {NOTES.map(n => (<option key={n.value} value={n.value}>{notation === 'us' ? n.us : n.eu}</option>))}
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

      <div style={{ marginBottom: '25px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={() => setNotation('us')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'us' ? 'var(--theme-primary)' : '#333', color: notation === 'us' ? '#000' : '#fff' }}>US (A, B, C)</button>
        <button onClick={() => setNotation('eu')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: notation === 'eu' ? 'var(--theme-primary)' : '#333', color: notation === 'eu' ? '#000' : '#fff' }}>EU (Do, Ré, Mi)</button>
        
        {appMode === 'studio' && (
            <>
                <div style={{ borderLeft: '2px solid #555', margin: '0 10px', height: '30px' }}></div>
                <button onClick={() => setDisplayMode('chord')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'chord' ? 'var(--theme-primary)' : '#333', color: displayMode === 'chord' ? '#000' : '#fff' }}>🎸 Accord</button>
                <button onClick={() => setDisplayMode('scale')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', fontWeight: 'bold', backgroundColor: displayMode === 'scale' ? 'var(--theme-primary)' : '#333', color: displayMode === 'scale' ? '#000' : '#fff' }}>🎹 Gamme</button>
            </>
        )}

        {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'guitars') && (
            <>
                <div style={{ borderLeft: '2px solid #555', margin: '0 10px', height: '30px' }}></div>
                <span style={{ color: '#ccc', fontWeight: 'bold', marginRight: '5px' }}>Position Guitare :</span>
                <select value={fretboardZone} onChange={(e) => setFretboardZone(e.target.value)} style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#222', color: '#fff', border: '1px solid #555' }}>
                    <option value="all">Toutes les cases</option>
                    <option value="open">Ouverte (0-4)</option>
                    <option value="mid">Milieu (5-9)</option>
                    <option value="high">Aiguë (10-14)</option>
                </select>
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
            {/* L'INFO currentStep EST TRANSMISE ICI POUR L'ANIMATION */}
            <PianoRoll tracks={activeDrums} totalSteps={16} currentStep={currentStep} />
            <h3 style={{color: 'var(--theme-primary)', marginTop: '30px'}}>🎹 Séquenceur Mélodique</h3>
            <PianoRoll tracks={activeBrick.melodyTracks} totalSteps={16} currentStep={currentStep} />
          </div>
      )}

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'piano' || activeTab === 'guitars') && (
          <div style={{ width: '100%', maxWidth: '1600px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#cf6679', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Fondamentale</span></div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', backgroundColor: '#78909c', borderRadius: '50%' }}></div><span style={{ color: '#ccc', fontSize: '14px' }}>Gamme</span></div>
                  </>
              ) : null}
          </div>
      )}

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'piano') && (
          <PianoKeyboard activeNotes={activeNoteValues} numOctaves={3} notation={notation} rootValue={currentRootValue} targetValue={targetValue} />
      )}

      {(appMode === 'dictionary' || layoutMode === 'all' || activeTab === 'guitars') && (
          <>
            <Fretboard instrument="guitar" activeNotes={activeNoteValues} notation={notation} stringTuning={activeBrick.guitarStrings} rootValue={currentRootValue} targetValue={targetValue} fretboardZone={fretboardZone} />
            <Fretboard instrument="bass" activeNotes={activeNoteValues} notation={notation} stringTuning={activeBrick.bassStrings} rootValue={currentRootValue} targetValue={targetValue} fretboardZone={fretboardZone} />
          </>
      )}
    </div>
  );
}

export default App;