
import { getAvailableGuitarFingerings } from './src/core/fingeringLogic.js';

const rootVal = 9; // A
const chordType = 'chord_major';
const octave = 0;

const avail = getAvailableGuitarFingerings(rootVal, chordType, octave);
console.log('Available Fingerings for A Major:');
avail.forEach(p => {
  console.log(`ID: ${p.id}, Label: ${p.label}`);
  console.log('Fingering Map:', JSON.stringify(p.fingering.fingeringMap, null, 2));
});
