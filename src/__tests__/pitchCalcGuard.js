/**
 * VMU-147 — importable core of the VMU-140 "no hand-rolled pitch calc" guard.
 *
 * Extracted out of NoHandPitchCalc.test.js so the scanning and exception
 * logic can be imported and exercised (by another test, or by a standalone
 * script) without going through a test runner. This file lives in
 * `__tests__/` on purpose: `sourceFiles()` in NoHandPitchCalc.test.js already
 * excludes that directory from the scan, so this module is never scanned as
 * app source (it contains no pitch arithmetic itself, but the exclusion is
 * what makes the layout safe either way).
 *
 * Exception keying (VMU-147): the original guard keyed each exception on
 * `file:line`. A line shift caused by an unrelated edit above an exempted
 * site (a new comment, an added import) changes nothing about the exempted
 * line itself, but silently breaks the key — the exception goes stale and
 * the site reports as a brand-new unexcepted hit. That happened three times
 * across VMU-131, VMU-146 and VMU-144 (see NoHandPitchCalc.test.js's own
 * history and this ticket's brief). The fix: key on `file` + the exempted
 * line's own **normalized text**, not its line number. A line shift changes
 * no text, so the exception survives it. A change to the exempted line's own
 * text — the case that should actually break the exception — still does.
 */

/** Blank out line and block comments, preserving line structure; strings/template literals pass through untouched. */
export function stripComments(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        out += src[i];
        if (src[i] === "\\" && i + 1 < src.length) {
          i++;
          out += src[i];
        } else if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "/" && c2 === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Deliberately not anchored on the opening paren's content (e.g.
// `(Number(octave) + 1) * 12` nests a call inside it) — the closing shape
// `+ 1) * 12` alone is specific enough in practice.
const OCTAVE_BASE_FORMULA = /\+\s*1\)\s*\*\s*12/g;
const OCTAVE_BASES = "24|36|48|60|72|84|96"; // C1..C7, theory.js:75-78
const OCTAVE_LITERAL_ADD = new RegExp(`\\+\\s*(?:${OCTAVE_BASES})\\b`, "g");
const OCTAVE_LITERAL_TERNARY = new RegExp(`\\?\\s*(?:${OCTAVE_BASES})\\s*:\\s*(?:${OCTAVE_BASES})\\b`, "g");

/**
 * @param {string} src already comment-stripped
 * @returns {Array<{line: number, snippet: string}>}
 */
export function findHandPitchCalcs(src) {
  const hits = [];
  for (const re of [OCTAVE_BASE_FORMULA, OCTAVE_LITERAL_ADD, OCTAVE_LITERAL_TERNARY]) {
    re.lastIndex = 0;
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split("\n").length;
      hits.push({ line, snippet: m[0] });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

/**
 * Normalize a line of source text for exception-key comparison: trim both
 * edges, collapse any run of whitespace to a single space. Two occurrences
 * of the same statement that differ only in indentation or trailing
 * whitespace normalize to the same code; a real edit to the statement does
 * not.
 * @param {string} lineText
 * @returns {string}
 */
export function normalizeLine(lineText) {
  return lineText.trim().replace(/\s+/g, " ");
}

/**
 * Strip comments, scan for hand-rolled pitch calculations, and pair each hit
 * with its own normalized source line — the shape `checkExceptions` expects.
 * @param {string} file the key to record on each hit (e.g. "hooks/useMusicEngine.js")
 * @param {string} rawSrc the file's raw (not comment-stripped) source
 * @returns {Array<{file: string, code: string, line: number, snippet: string}>}
 */
export function collectHits(file, rawSrc) {
  const stripped = stripComments(rawSrc);
  const lines = stripped.split("\n");
  return findHandPitchCalcs(stripped).map((hit) => ({
    file,
    code: normalizeLine(lines[hit.line - 1] ?? ""),
    line: hit.line,
    snippet: hit.snippet,
  }));
}

/**
 * Pure matching of scan hits against the exceptions list. Matching key is
 * (file, normalized code) — never the line number, which is why this
 * survives an unrelated line shift (VMU-147's whole point).
 *
 * Each exception covers up to `count` (default 1) occurrences of the exact
 * same (file, code) pair, consumed in the order `hits` is given. Two or more
 * exceptions that happen to share the same (file, code) — e.g. two different
 * functions whose exempted line normalizes to identical text — are pooled
 * together: their counts add up, and if the pool goes entirely unused every
 * exception that fed it is reported stale (there is no way to attribute an
 * unused pool to just one of them; this is a known, accepted narrowing
 * versus a per-line key — see NoHandPitchCalc.test.js's EXCEPTIONS comment
 * on core/theory.js's two `const base = (octave + 1) * 12;` entries).
 *
 * @param {Array<{file: string, code: string, line?: number, snippet?: string}>} hits
 * @param {Array<{file: string, code: string, count?: number, reason?: string}>} exceptions
 * @returns {{unexcepted: Array<object>, stale: Array<object>, exceeded: Array<object>}}
 *   unexcepted — hits matching no exception (pool) at all.
 *   stale      — exceptions whose (file, code) pool matched zero hits (the exempted line is gone or changed).
 *   exceeded   — hits matching a pool whose combined allowed count is already used up.
 */
export function checkExceptions(hits, exceptions) {
  const keyOf = (file, code) => `${file}\u0000${code}`;

  const pools = new Map(); // key -> { exceptions: [...], remaining, used }
  for (const exception of exceptions) {
    const key = keyOf(exception.file, exception.code);
    if (!pools.has(key)) {
      pools.set(key, { exceptions: [], remaining: 0, used: 0 });
    }
    const pool = pools.get(key);
    pool.exceptions.push(exception);
    pool.remaining += exception.count ?? 1;
  }

  const unexcepted = [];
  const exceeded = [];

  for (const hit of hits) {
    const pool = pools.get(keyOf(hit.file, hit.code));
    if (!pool) {
      unexcepted.push(hit);
      continue;
    }
    pool.used += 1;
    if (pool.remaining <= 0) {
      exceeded.push(hit);
    } else {
      pool.remaining -= 1;
    }
  }

  const stale = [];
  for (const pool of pools.values()) {
    if (pool.used === 0) stale.push(...pool.exceptions);
  }

  return { unexcepted, stale, exceeded };
}
