// src/core/__tests__/noHandSymbolRead.test.js
//
// VMU-162 — static guard. harmonyEngine.js must read every chord symbol
// through theory.js's single rule (parseChordSymbol / resolveNnsToChordType,
// PR #132, VMU-157/158), never by hand with `nns.includes(...)` or
// `nns.startsWith(...)`. Two hand-rolled readings were found in this file at
// `185318d` (getInversionType, calculatePlayabilityScore) — this guard fails
// if either reappears here, or in a new function added later.
//
// Red now (before the VMU-162 fix): harmonyEngine.js has no import from
// './theory' at all, and both functions read `nns` by hand.
//
// VMU-170 — the same guard, over the components. StudioPanel's
// `getChordQuality` read the symbol by hand (`nns.includes('m')`: "1maj7" came
// out minor), a third reading beside theory.js's and harmonyEngine's. No file
// under src/components/ may read a chord symbol, or a chord's written name, by
// hand either.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const harmonyEngineSrc = fs.readFileSync(path.join(__dirname, '../harmonyEngine.js'), 'utf8');

describe('VMU-162 — no hand-rolled chord-symbol reading in harmonyEngine.js', () => {
  it('never calls .includes/.startsWith/.endsWith directly on the raw `nns` string', () => {
    // A hand read looks like `nns.includes('m')` or `nns.startsWith('2')` —
    // a string method called directly on the raw symbol variable. Reading a
    // field parseChordSymbol already parsed out (symbol.type, symbol.degree,
    // symbol.accidental, symbol.suffix) is not a hand read — it IS the
    // single rule this guard exists to enforce the use of.
    const handReadPattern = /\bnns\.(includes|startsWith|endsWith)\(/;
    const match = harmonyEngineSrc.match(handReadPattern);
    expect(match === null, `found a hand-rolled read: "${match?.[0]}"`).toBe(true);
  });

  it('imports parseChordSymbol or resolveNnsToChordType from ./theory', () => {
    const importsTheorySingleRule =
      /import\s*\{[^}]*\b(parseChordSymbol|resolveNnsToChordType)\b[^}]*\}\s*from\s*['"]\.\/theory['"]/.test(
        harmonyEngineSrc,
      );
    expect(importsTheorySingleRule).toBe(true);
  });
});

// ─── VMU-170: the components ────────────────────────────────────────────────

const componentsDir = path.join(__dirname, '../../components');

/** The code of a source file with its comments taken out: a comment may name what it forbids. */
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

// A chord symbol is held in a variable or a field called nns (nns, c.nns,
// chord?.nns, nnsStr, currentNns), the name of a chord in chordNameUS / chordNameEU.
// `nnsProgression` is a list of symbols, not one: it is not matched.
const SYMBOL = String.raw`[\w$.?]*(?:nns(?:str|string|symbol|text)?|chordname(?:us|eu)?|chordsymbol)`;
// What reads a string by hand: asking what it contains, where it starts or
// ends, cutting it, matching or replacing in it.
const READ_METHODS = [
  'includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf', 'search', 'match', 'matchAll',
  'replace', 'replaceAll', 'split', 'slice', 'substring', 'substr', 'charAt', 'at',
].join('|');
const HAND_READ_PATTERNS = [
  // nns.includes('m'), c.nns.startsWith('2'), chord?.nns.match(/m/), chordNameUS.endsWith('7')
  new RegExp(String.raw`(?:${SYMBOL})\s*\??\.\s*(?:${READ_METHODS})\s*\(`, 'i'),
  // /m7/.test(nns), re.exec(c.nns)
  new RegExp(String.raw`\.\s*(?:test|exec)\(\s*(?:${SYMBOL})\s*[,)]`, 'i'),
];

/** The first hand read of a chord symbol in a piece of source, or null. */
function findHandSymbolRead(source) {
  const code = withoutComments(source);
  for (const pattern of HAND_READ_PATTERNS) {
    const match = code.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/** Every source file under a directory, tests aside: [absolute path, contents]. */
function sourceFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.(jsx?|tsx?)$/.test(entry) && !/(^|[\\/])__tests__[\\/]/.test(entry) && !/\.test\./.test(entry))
    .map((entry) => [entry, fs.readFileSync(path.join(dir, entry), 'utf8')]);
}

describe('VMU-170 — the detector (green before and after: the scan below cannot pass on nothing)', () => {
  it.each([
    ["nns.includes('m')"],
    ["c.nns.includes('-')"],
    ["clickedChord?.nns.startsWith('2')"],
    ["nnsStr.endsWith('7')"],
    ['currentNns.match(/m/)'],
    ["nns?.indexOf('b5')"],
    ['chord.nns .replace("m", "")'],
    ["chordNameUS.endsWith('7')"],
    ['/m7/.test(nns)'],
    ['symbolRe.exec(chord.nns)'],
  ])('finds a hand read: %s', (code) => {
    expect(findHandSymbolRead(`const x = ${code};`)).not.toBeNull();
  });

  it.each([
    ['toRoman(c.nns)'],
    ['getNextChordSuggestions(clickedChord.nns)'],
    ['resolveNnsToChordType(nns)'],
    ['parseChordSymbol(chord.nns)?.type'],
    ['clickedChord && clickedChord.nns === c.nns'],
    ["notation === 'us' ? c.chordNameUS : c.chordNameEU"],
    ["activeProgression.includes('5')"],
    ['brick.nnsProgression.slice(1)'],
    ['txt.nnsExplainTitle'],
  ])('does not flag: %s', (code) => {
    expect(findHandSymbolRead(`const x = ${code};`)).toBeNull();
  });

  it('does not read a comment as code', () => {
    expect(findHandSymbolRead("// used to be nns.includes('m')\nconst y = 1;")).toBeNull();
    expect(findHandSymbolRead("/* nns.startsWith('maj') */ const y = 1;")).toBeNull();
  });

  it('scans the components: StudioPanel and the Sequencer helper are among the files read', () => {
    const names = sourceFiles(componentsDir).map(([file]) => file.replace(/\\/g, '/'));
    expect(names.length).toBeGreaterThanOrEqual(30); // 39 at the time of writing
    expect(names).toContain('Panels/StudioPanel.jsx');
    expect(names).toContain('Sequencer/DAWHelper.jsx');
    expect(names.some((file) => file.includes('__tests__'))).toBe(false);
  });
});

describe('VMU-170 — no hand-rolled chord-symbol reading in src/components/', () => {
  it('no component calls a string method on a chord symbol or a chord name', () => {
    const found = sourceFiles(componentsDir)
      .map(([file, source]) => [file.replace(/\\/g, '/'), findHandSymbolRead(source)])
      .filter(([, match]) => match !== null)
      .map(([file, match]) => `${file}: "${match}"`);
    expect(found, 'a chord symbol is read by theory.js (parseChordSymbol / resolveNnsToChordType)').toEqual([]);
  });

  it('StudioPanel reads the quality of a chord through theory.js', () => {
    const studioPanel = fs.readFileSync(path.join(componentsDir, 'Panels/StudioPanel.jsx'), 'utf8');
    expect(/\b(parseChordSymbol|resolveNnsToChordType)\b/.test(withoutComments(studioPanel))).toBe(true);
  });
});
