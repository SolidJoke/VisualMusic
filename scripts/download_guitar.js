import fs from 'fs';
import path from 'path';

const url = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/master/FatBoy/acoustic_guitar_nylon-mp3.js';
const targetDir = path.join(process.cwd(), 'public', 'samples', 'guitar');

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Fetching Midi.js Soundfont for Acoustic Guitar...');

fetch(url)
  .then(res => res.text())
  .then(text => {
    console.log('Downloaded JS file. Parsing...');
    // The file is JS: MIDI.Soundfont.acoustic_guitar_nylon = { "A2": "data:...
    // We can extract the JSON part
    const regex = /"([A-G][b#\w]*\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g;
    let match;
    const audioData = {};
    while ((match = regex.exec(text)) !== null) {
      audioData[match[1]] = match[2];
    }
    
    // We only need a few notes for Tone.js sampler to interpolate
    const notesToExtract = ['C2', 'E2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    
    let savedCount = 0;
    
    for (const [note, base64Data] of Object.entries(audioData)) {
      if (!notesToExtract.includes(note)) continue;
      
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${note}.mp3`;
      fs.writeFileSync(path.join(targetDir, filename), buffer);
      savedCount++;
      console.log(`Saved ${filename}`);
    }
    console.log(`Successfully saved ${savedCount} samples to ${targetDir}`);
  })
  .catch(err => {
    console.error('Failed to download or parse soundfont:', err);
    process.exit(1);
  });
