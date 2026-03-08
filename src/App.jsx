import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PianoKeyboard from './components/Instruments/PianoKeyboard';
import Fretboard from './components/Instruments/Fretboard';
import PianoRoll from './components/Sequencer/PianoRoll';

import { getScaleNotes, generateChordsFromNNS, MODES, NOTES, getClosestInversion } from './core/theory';
import { BRICKS } from './core/bricks';
import * as Tone from 'tone';

const chordSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
}).toDestination();

const kickSynth = new Tone.MembraneSynth({ volume: -2 }).toDestination();
const snareSynth = new Tone.NoiseSynth({ volume: -10, noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0 } }).toDestination();
const hatFilter = new Tone.Filter(7000, "highpass").toDestination();
const hatSynth = new Tone.NoiseSynth({ 
    volume: -12, 
    noise: { type: 'white' }, 
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 } 
}).connect(hatFilter);

const bassSynth = new Tone.MonoSynth({
    volume: -6, oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0, baseFrequency: 60, octaves: 4 }
}).toDestination();

const noteNamesArray = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];


function App() {
  const [appMode, setAppMode] = useState('studio'); 
  const [notation, setNotation] = useState('us');
  // NOUVEAU : État pour gérer l'affichage de la fenêtre "À propos"
  const [showAbout, setShowAbout] = useState(false);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-12); 
  const [currentStep, setCurrentStep] = useState(-1);

  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('chord'); 
  const [clickedChord, setClickedChord] = useState(null);
  const [layoutMode, setLayoutMode] = useState('all'); 
  const [activeTab, setActiveTab] = useState('sequencer');
  const [currentTheme, setCurrentTheme] = useState('A');
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState(new Array());

  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState('single_note'); 
  const [fretboardZone, setFretboardZone] = useState('all');

  const activeBrick = BRICKS.at(Number(currentBrickIndex));
  
  const activeDrums = currentTheme === 'B' && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks;
  const activeMelody = currentTheme === 'B' && activeBrick.melodyTracksVariation ? activeBrick.melodyTracksVariation : activeBrick.melodyTracks;
  const activeProgression = currentTheme === 'B' && activeBrick.nnsProgressionVariation ? activeBrick.nnsProgressionVariation : activeBrick.nnsProgression;

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
              if (currentAbsoluteNotes.length === 3) activeNoteValues.push(currentAbsoluteNotes.at(0), currentAbsoluteNotes.at(1), currentAbsoluteNotes.at(2));
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

  const drumRef = useRef(activeDrums);
  const melodyRef = useRef(activeMelody);
  const rootRef = useRef(currentRootValue);
  const appModeRef = useRef(appMode);

  drumRef.current = activeDrums;
  melodyRef.current = activeMelody;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;

  useEffect(() => {
    if (appMode === 'studio') {
        document.documentElement.style.setProperty('--theme-primary', activeBrick.theme.primary);
        document.documentElement.style.setProperty('--theme-bg', activeBrick.theme.bg);
        Tone.Transport.bpm.value = activeBrick.bpm; 
    } else {
        document.documentElement.style.setProperty('--theme-primary', '#ffd700'); 
        document.documentElement.style.setProperty('--theme-bg', '#1a1a1a'); 
    }
    setClickedChord(null);
    setCurrentAbsoluteNotes(new Array()); 
    setCurrentTheme('A'); 
  }, [currentBrickIndex, appMode, activeBrick]);

  useEffect(() => { Tone.Destination.volume.value = masterVolume; }, [masterVolume]);

  useEffect(() => {
      let stepCounter = 0;
      
      const repeat = (time) => {
          Tone.Draw.schedule(() => setCurrentStep(stepCounter), time);

          if (appModeRef.current === 'dictionary') {
              stepCounter = (stepCounter + 1) % 16;
              return; 
          }

          const drums = drumRef.current;
          const melodies = melodyRef.current;
          const rootVal = rootRef.current;

          if (drums && drums.length > 0) {
              drums.forEach(track => {
                  if (track.activeSteps.includes(stepCounter)) {
                      let vel = track.lowVelocitySteps && track.lowVelocitySteps.includes(stepCounter) ? 0.3 : 0.8;
                      let name = track.name.toLowerCase();

                      if (name.includes('kick')) {
                          kickSynth.triggerAttackRelease("C1", "8n", time, vel);
                      } else if (name.includes('snare') || name.includes('clap') || name.includes('rim')) {
                          snareSynth.triggerAttackRelease("16n", time, vel);
                      } else {
                          hatSynth.triggerAttackRelease("32n", time, vel);
                      }
                  }
              });
          }

          if (melodies && melodies.length > 0) {
              melodies.forEach(track => {
                  if (track.activeSteps.includes(stepCounter)) {
                      let vel = track.lowVelocitySteps && track.lowVelocitySteps.includes(stepCounter) ? 0.4 : 0.9;
                      let octave = track.name.toLowerCase().includes('bass') ? 1 : 3;
                      let bassNote = `${noteNamesArray[rootVal % 12]}${octave}`; 
                      bassSynth.triggerAttackRelease(bassNote, "16n", time, vel);
                  }
              });
          }

          stepCounter = (stepCounter + 1) % 16;
      };

      if (isPlaying) {
          Tone.Transport.scheduleRepeat(repeat, "16n");
      } else {
          Tone.Transport.cancel();
          setCurrentStep(-1);
          stepCounter = 0;
      }

      return () => Tone.Transport.cancel();
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

      chordSynth.triggerAttackRelease(notesToPlay, "2n");
      setCurrentAbsoluteNotes(nextNotes);
  };

  return (
    <div className="app-container" style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      
      {/* LA FENÊTRE MODALE (POP-UP) À PROPOS */}
      {showAbout && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
              <div style={{ backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '12px', border: '1px solid var(--theme-primary)', maxWidth: '500px', width: '90%', textAlign: 'center', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <button 
                      onClick={() => setShowAbout(false)} 
                      style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
                  >
                      ✖
                  </button>
                  <h2 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>Vmu : VisualMusic Coach</h2>
                  <p style={{ color: '#ccc', lineHeight: '1.6', fontSize: '16px' }}>
                      Une application web interactive conçue pour aider les musiciens à comprendre la théorie musicale, à visualiser les gammes et les accords, et à s'entraîner sur des rythmes générés en temps réel.
                  </p>
                  <p style={{ color: '#fff', fontWeight: 'bold', margin: '20px 0' }}>
                      Créé et développé par Gabriel Resende.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
                      <a href="https://ko-fi.com/gabrielgsdresende" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#FF5E5B', color: '#fff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', transition: 'transform 0.2s' }} onMouseOver={e => e.target.style.transform = 'scale(1.05)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                          ☕ M'offrir un café sur Ko-fi
                      </a>
                      <a href="https://github.com/SolidJoke/VisualMusic" target="_blank" rel="noopener noreferrer" style={{ display: 'block', backgroundColor: '#333', color: '#fff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', border: '1px solid #555', transition: 'transform 0.2s' }} onMouseOver={e => e.target.style.transform = 'scale(1.05)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                          💻 Voir le code sur GitHub
                      </a>
                  </div>
              </div>
          </div>
      )}

      <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{color: '#fff'}}>🎛️ Vmu : VisualMusic Coach</h1>
              {/* BOUTON À PROPOS DANS LE HEADER */}
              <button 
                  onClick={() => setShowAbout(true)} 
                  style={{ padding: '8px 15px', backgroundColor: 'transparent', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                  onMouseOver={e => {e.target.style.backgroundColor = 'var(--theme-primary)'; e.target.style.color = '#000';}}
                  onMouseOut={e => {e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'var(--theme-primary)';}}
              >
                  ℹ️ À propos
              </button>
          </div>
          
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
                        <div style={{ marginBottom: '15px' }}>
                            <span style={{ color: '#ccc', marginRight: '10px', fontSize: '16px' }}>Thème (Rythme & Accords) :</span>
                            <button onClick={() => setCurrentTheme('A')} style={{ padding: '8px 15px', marginRight: '5px', backgroundColor: currentTheme === 'A' ? 'var(--theme-primary)' : '#222', color: currentTheme === 'A' ? '#000' : '#fff', border: '1px solid #555', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Variation A</button>
                            <button onClick={() => setCurrentTheme('B')} style={{ padding: '8px 15px', backgroundColor: currentTheme === 'B' ? 'var(--theme-primary)' : '#222', color: currentTheme === 'B' ? '#000' : '#fff', border: '1px solid #555', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>Variation B</button>
                        </div>

                        <strong>Progression Magique : </strong> <br/><br/>
                        {generateChordsFromNNS(activeBrick.rootValue, activeBrick.modeName, activeProgression).map((c, i) => {
                            const isSelected = clickedChord && clickedChord.nns === c.nns;
                            return (
                                <span key={i}>
                                    <button onClick={() => handleChordClick(c)} style={{ background: isSelected ? 'var(--theme-primary)' : '#222', color: isSelected ? '#000' : 'var(--theme-primary)', border: '2px solid var(--theme-primary)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', margin: '0 5px', transition: 'all 0.2s' }}>
                                        {notation === 'us' ? c.chordNameUS : c.chordNameEU}
                                    </button>
                                    {i < activeProgression.length - 1 ? ' ➜ ' : ''}
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
          
          {((appMode === 'studio' && displayMode === 'scale') || (appMode === 'dictionary' && dictType.includes('scale'))) && (
              <div style={{ maxWidth: '1600px', margin: '0 auto 20px auto', backgroundColor: '#1a237e', padding: '15px 25px', borderRadius: '8px', border: '1px solid #3949ab', textAlign: 'left', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#90caf9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                     💡 Guide d'Improvisation (La Méthode du Drone)
                  </h3>
                  <ul style={{ color: '#e3f2fd', margin: 0, paddingLeft: '20px', lineHeight: '1.6', fontSize: '15px' }}>
                      <li style={{ marginBottom: '8px' }}><strong>Étape 1 (Le Drone) :</strong> Joue la <span style={{color: '#cf6679', fontWeight: 'bold'}}>Fondamentale (Rouge)</span> dans les graves et laisse-la résonner. Cela crée ton centre de gravité musical.</li>
                      <li style={{ marginBottom: '8px' }}><strong>Étape 2 (L'Exploration) :</strong> Avec l'autre main, promène-toi librement sur les notes de la <span style={{color: '#78909c', fontWeight: 'bold'}}>Gamme (Bleu-gris)</span>. Écoute comment chaque note sonne par rapport à ta fondamentale.</li>
                      <li><strong>Étape 3 (La Couleur) :</strong> Insiste sur la <span style={{color: '#ffd700', fontWeight: 'bold'}}>Note Magique (Dorée)</span> ! C'est la note caractéristique (le "Character Tone") qui donne à ce mode son émotion unique.</li>
                  </ul>
              </div>
          )}

          {appMode === 'studio' && (layoutMode === 'all' || activeTab === 'sequencer') && (
              <div style={{width: '100%', maxWidth: '1600px', marginBottom: '30px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{color: 'var(--theme-primary)'}}>🥁 Boîte à Rythmes</h3>
                </div>
                <PianoRoll tracks={activeDrums} totalSteps={16} currentStep={currentStep} />
                <h3 style={{color: 'var(--theme-primary)', marginTop: '30px'}}>🎹 Séquenceur Mélodique</h3>
                <PianoRoll tracks={activeMelody} totalSteps={16} currentStep={currentStep} />
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

      <footer style={{
          marginTop: '60px',
          padding: '20px 0',
          borderTop: '1px solid #333',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
      }}>
          <div 
              title="Licence MIT&#10;&#10;L'autorisation est accordée, à titre gratuit, à toute personne obtenant une copie de ce logiciel et des fichiers de documentation associés, de commercialiser le Logiciel sans restriction..."
              style={{ cursor: 'help', transition: 'color 0.3s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
              © 2026 Gabriel Resende • Vmu (VisualMusic Coach)
          </div>
      </footer>
    </div>
  );
}

export default App;