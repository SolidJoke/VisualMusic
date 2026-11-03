// VMU-200 — every note the Studio loop publishes carries its instrument.
//
// playStepEvents used to return bare MIDI numbers; every instrument then read
// them as its own, so the piano flashed the bass line and both necks lit the
// piano's chord notes. Chord notes are now the piano's; melodic notes (all
// played on the bass synth) are the bass's and ask the neck to place them
// near the drawn shape (`nearShape`).
import { describe, it, expect, vi } from 'vitest';
import { playStepEvents } from '../playStep';

function makeSynths() {
  return {
    kickSynth: { triggerAttackRelease: vi.fn() },
    snareSynth: { triggerAttackRelease: vi.fn() },
    hatSynth: { triggerAttackRelease: vi.fn() },
    bassSynth: { triggerAttackRelease: vi.fn() },
    playDictionaryNote: vi.fn(),
  };
}

const TIME = 3.5;

describe('playStepEvents — the notes it returns are tagged with their instrument', () => {
  it('tags chord notes piano and the melodic note bass with nearShape', () => {
    const synths = makeSynths();
    const events = [
      {
        voice: 'chords', instrument: 'piano', role: 'chords', track: 'Chords',
        midi: [60, 64, 67], durationSteps: 4, velocity: 1,
      },
      {
        voice: 'melody', instrument: 'bass', role: 'bass', track: 'Bass',
        midi: [36], durationSteps: 1, velocity: 0.8,
      },
    ];

    expect(playStepEvents(synths, events, TIME)).toEqual([
      { absoluteValue: 60, instrument: 'piano' },
      { absoluteValue: 64, instrument: 'piano' },
      { absoluteValue: 67, instrument: 'piano' },
      { absoluteValue: 36, instrument: 'bass', nearShape: true },
    ]);
  });

  it('plays exactly the same synth calls as before (the tag is only in the return value)', () => {
    const synths = makeSynths();
    playStepEvents(
      synths,
      [
        {
          voice: 'drums', instrument: 'kick', role: 'kick', track: 'Kick',
          midi: [36], durationSteps: 2, velocity: 1,
        },
        {
          voice: 'chords', instrument: 'piano', role: 'chords', track: 'Chords',
          midi: [60, 64, 67], durationSteps: 4, velocity: 1,
        },
        {
          voice: 'melody', instrument: 'bass', role: 'bass', track: 'Bass',
          midi: [36], durationSteps: 1, velocity: 0.8,
        },
      ],
      TIME,
    );

    expect(synths.kickSynth.triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(synths.kickSynth.triggerAttackRelease).toHaveBeenCalledWith('C1', '8n', TIME, 1);
    expect(synths.playDictionaryNote).toHaveBeenCalledTimes(1);
    expect(synths.playDictionaryNote).toHaveBeenCalledWith('piano', ['C4', 'E4', 'G4'], '4n', TIME);
    expect(synths.bassSynth.triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(synths.bassSynth.triggerAttackRelease).toHaveBeenCalledWith('C2', '16n', TIME, 0.8);
    expect(synths.snareSynth.triggerAttackRelease).not.toHaveBeenCalled();
    expect(synths.hatSynth.triggerAttackRelease).not.toHaveBeenCalled();
  });
});

describe('playStepEvents — VMU-209 the chord voice follows the chosen instrument', () => {
  const chordEvent = () => ({
    voice: 'chords', instrument: 'piano', role: 'chords', track: 'Chords',
    midi: [60, 64, 67], durationSteps: 4, velocity: 1,
  });

  it('piano (the default: no options) plays the chord midi exactly as before', () => {
    const synths = makeSynths();
    expect(playStepEvents(synths, [chordEvent()], TIME)).toEqual([
      { absoluteValue: 60, instrument: 'piano' },
      { absoluteValue: 64, instrument: 'piano' },
      { absoluteValue: 67, instrument: 'piano' },
    ]);
    expect(synths.playDictionaryNote).toHaveBeenCalledWith('piano', ['C4', 'E4', 'G4'], '4n', TIME);
  });

  it('guitar plays the grip cells, not the chord fold, tagged guitar with nearShape', () => {
    const synths = makeSynths();
    const grip = [
      { absoluteValue: 64, stringIndex: 0, fret: 0 },
      { absoluteValue: 60, stringIndex: 1, fret: 1 },
      { absoluteValue: 55, stringIndex: 2, fret: 0 },
      { absoluteValue: 52, stringIndex: 3, fret: 2 },
      { absoluteValue: 48, stringIndex: 4, fret: 3 },
    ];
    expect(playStepEvents(synths, [chordEvent()], TIME, { chordInstrument: 'guitar', guitarNotes: grip })).toEqual([
      { absoluteValue: 64, instrument: 'guitar', nearShape: true },
      { absoluteValue: 60, instrument: 'guitar', nearShape: true },
      { absoluteValue: 55, instrument: 'guitar', nearShape: true },
      { absoluteValue: 52, instrument: 'guitar', nearShape: true },
      { absoluteValue: 48, instrument: 'guitar', nearShape: true },
    ]);
    expect(synths.playDictionaryNote).toHaveBeenCalledWith('guitar', ['E4', 'C4', 'G3', 'E3', 'C3'], '4n', TIME);
  });

  it('bass keeps the chord on the piano (its loop voice is its bass line)', () => {
    const synths = makeSynths();
    // useSequencer maps every non-guitar choice to chordInstrument "piano".
    playStepEvents(synths, [chordEvent()], TIME, { chordInstrument: 'piano', guitarNotes: null });
    expect(synths.playDictionaryNote).toHaveBeenCalledWith('piano', ['C4', 'E4', 'G4'], '4n', TIME);
  });
});
