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
