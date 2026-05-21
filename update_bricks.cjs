const fs = require('fs');
let content = fs.readFileSync('src/core/bricks.js', 'utf8');

const replacements = {
  '"Ionian"': '"scale_major"',
  '"Dorian"': '"scale_dorian"',
  '"Phrygian"': '"scale_phrygian"',
  '"Lydian"': '"scale_lydian"',
  '"Mixolydian"': '"scale_mixolydian"',
  '"Aeolian"': '"scale_minor"',
  '"Locrian"': '"scale_locrian"',
  '"PhrygianDominant"': '"scale_phrygian_dominant"'
};

for (const [oldVal, newVal] of Object.entries(replacements)) {
  const regex = new RegExp(`modeName:\\s*${oldVal}`, 'g');
  content = content.replace(regex, `scaleKey: ${newVal}`);
}

fs.writeFileSync('src/core/bricks.js', content);
console.log('bricks.js updated!');
