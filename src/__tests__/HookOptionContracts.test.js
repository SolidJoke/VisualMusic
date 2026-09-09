import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Every hook here takes a single options object — usePlaybackHandlers declares
 * 29 of them. JavaScript will not tell you when a call site forgets one: the
 * option is simply `undefined`, and the failure surfaces later as a TypeError
 * on click, or, worse, as a guarded no-op that silently disables a feature.
 *
 * That is not hypothetical. PR #94 restored five options AppDesktop had stopped
 * passing to usePlaybackHandlers — dropped by a refactor whose own commit
 * message read "558 tests passing". Among them, `setClickedChord`, guarded by
 * `if (setClickedChord)`, which meant clicking a chord in the Studio
 * progression stopped updating the fretboard entirely. Nothing noticed: not the
 * compiler (there is none), not eslint, not the suite.
 *
 * So this test does what a type checker would. It is a stopgap: VMU-004 types
 * the hook boundary properly, and this can go when it lands.
 *
 * Deliberately conservative, because a static test that cries wolf gets deleted:
 *   - only options declared WITHOUT a default are required;
 *   - a call site using a spread is skipped, since its keys aren't knowable here.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dir = SRC, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") sourceFiles(full, acc);
    } else if (/\.jsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** From the index of an opening brace, return its balanced body. */
function objectBody(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") i++;
        else if (src[i] === quote) break;
        i++;
      }
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i);
      i = end === -1 ? src.length : end + 1;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      if (--depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return null;
}

/** Split an object body on its top-level commas. */
function entries(body) {
  const out = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      buf += c;
      i++;
      while (i < body.length) {
        buf += body[i];
        if (body[i] === "\\") {
          i++;
          if (i < body.length) buf += body[i];
        } else if (body[i] === quote) break;
        i++;
      }
    } else if (c === "/" && body[i + 1] === "/") {
      while (i < body.length && body[i] !== "\n") i++;
    } else if (c === "/" && body[i + 1] === "*") {
      const end = body.indexOf("*/", i);
      i = end === -1 ? body.length : end + 1;
    } else if ("{[(".includes(c)) {
      depth++;
      buf += c;
    } else if ("}])".includes(c)) {
      depth--;
      buf += c;
    } else if (c === "," && depth === 0) {
      out.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  out.push(buf);
  return out.map((e) => e.trim()).filter(Boolean);
}

/** `foo`, `foo = 1`, `foo: bar`, `foo: bar = 1`, `...rest` */
function describeEntry(entry) {
  if (entry.startsWith("...")) return { name: entry.slice(3).trim(), spread: true };
  const colon = entry.indexOf(":");
  const equals = entry.indexOf("=");
  const cut = Math.min(colon === -1 ? Infinity : colon, equals === -1 ? Infinity : equals);
  return {
    name: entry.slice(0, cut === Infinity ? entry.length : cut).trim(),
    hasDefault: equals !== -1,
    spread: false
  };
}

const HOOK_DEFINITION =
  /(?:export\s+(?:default\s+)?function|function)\s+(use[A-Z]\w*)\s*\(\s*\{|export\s+const\s+(use[A-Z]\w*)\s*=\s*\(\s*\{/g;

describe("hook option contracts", () => {
  const files = sourceFiles();

  // hook name -> { file, required: string[] }
  const hooks = new Map();
  for (const file of files) {
    const src = fs.readFileSync(file, "utf-8");
    for (const m of src.matchAll(HOOK_DEFINITION)) {
      const name = m[1] || m[2];
      const body = objectBody(src, src.indexOf("{", m.index + m[0].length - 1));
      if (body == null) continue;
      const required = entries(body)
        .map(describeEntry)
        .filter((e) => !e.spread && !e.hasDefault)
        .map((e) => e.name);
      hooks.set(name, { file, required });
    }
  }

  it("trouve bien les hooks à options (garde-fou du garde-fou)", () => {
    // If the parser silently stops matching, the test below would pass by
    // finding nothing to check. Anchor it on a hook we know exists.
    expect(hooks.size).toBeGreaterThanOrEqual(5);
    expect(hooks.get("usePlaybackHandlers")?.required.length).toBeGreaterThan(20);
  });

  it("chaque site d'appel fournit les options déclarées sans valeur par défaut", () => {
    const violations = [];
    const checked = [];

    for (const file of files) {
      const src = fs.readFileSync(file, "utf-8");
      for (const [name, hook] of hooks) {
        if (file === hook.file) continue;
        const callSite = new RegExp(`\\b${name}\\s*\\(\\s*\\{`, "g");
        for (const m of src.matchAll(callSite)) {
          const body = objectBody(src, src.indexOf("{", m.index + m[0].length - 1));
          if (body == null) continue;
          const parsed = entries(body).map(describeEntry);
          if (parsed.some((e) => e.spread)) continue; // keys unknowable statically
          const supplied = new Set(parsed.map((e) => e.name));
          const missing = hook.required.filter((r) => !supplied.has(r));
          const where = `${path.relative(SRC, file).replace(/\\/g, "/")}`;
          checked.push(`${where} -> ${name}`);
          if (missing.length) {
            const line = src.slice(0, m.index).split("\n").length;
            violations.push(
              `${where}:${line} calls ${name}() without: ${missing.join(", ")}`
            );
          }
        }
      }
    }

    // A parser that quietly stops matching call sites would report zero
    // violations and look healthy. Anchor on call sites known to exist —
    // including useDebugExport, whose argument nests object literals and so
    // exercises the brace matching rather than line splitting.
    expect(checked).toContain("AppDesktop.jsx -> usePlaybackHandlers");
    expect(checked).toContain("AppDesktop.jsx -> useMusicEngine");
    expect(checked).toContain("AppDesktop.jsx -> useDebugExport");

    expect(violations).toEqual([]);
  });
});
