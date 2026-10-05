/**
 * VMU-166 — the measurement scripts found the repository root with
 * `new URL(import.meta.url).pathname`. A URL path keeps its percent-encoding:
 * a clone under `C:\Users\RAOULD~1\...` (or any folder with a space) became
 * `RAOULD%7E1` / `%20` on disk, and every probe died on "Could not resolve
 * ...\vite.config.js" (observed by the coordinator, 2026-09-26, clone of
 * `main` under the temporary folder). `scripts/check-integrity.js` already
 * did it right, with fileURLToPath.
 *
 * fileURLToPath alone was not enough (coordinator's QA of #139, measured in
 * that same clone at 9a46221): the decoded root keeps the spelling it was
 * reached by, the 8.3 short form `C:\Users\RAOULD~1\...`, while Vite resolves
 * every file to its real path `C:\Users\Raoul Duke\...`. The two no longer
 * match, Vite serves /src/main.jsx untransformed ("Failed to load url
 * /src/main.jsx (resolved id: C:/Users/Raoul Duke/...)"), the page throws
 * "Unexpected token '<'" and every state times out. With the root taken
 * through fs.realpathSync.native, the same probe passes from the same path.
 *
 * Checks:
 *   1. the helper decodes a file URL whose path has a space and a "~" (and
 *      the old formula, kept here as the positive control, does not);
 *   2. it returns the folder's REAL form: with an injected resolver (the 8.3
 *      case cannot be built here: short names are off on the dev volume and
 *      do not exist on the CI's), and on a real filesystem through a
 *      directory link whose spelling differs from its target;
 *   3. a folder that does not exist (nothing to resolve) gives the decoded
 *      path, so the helper never fails on its own input;
 *   4. no script computes its root the old way any more, and every one that
 *      needs a root goes through the helper — seven at the time of writing.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = path.join(REPO, "scripts");

// The seven scripts the coordinator listed at 250b668 (VMU-166 brief note).
const SCRIPTS_WITH_A_ROOT = [
  "audio_measure.mjs",
  "layout_probe.mjs",
  "style_probe.mjs",
  "s1_probe.mjs",
  "metronome_probe.mjs",
  "tempo_probe.mjs",
  "quickstart_probe.mjs",
];

/** The formula every script used before VMU-166, verbatim. */
function legacyRoot(moduleUrl) {
  return path.resolve(path.dirname(new URL(moduleUrl).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
}

/** Imported the way node loads the scripts themselves (a file URL), and
 * inside each test so the scans below still run if it is missing. */
async function loadHelper() {
  const helperUrl = pathToFileURL(path.join(SCRIPTS, "lib", "repoRoot.mjs")).href;
  return import(/* @vite-ignore */ helperUrl);
}

// Fixture folder for the real-filesystem check: inside the repository (the
// executor may not write elsewhere), gitignored (*.local), removed afterwards.
const FIXTURE = path.join(REPO, "repo-root-test.local");

afterAll(() => {
  const alias = path.join(FIXTURE, "alias ~1 dir");
  try {
    // The link first, on its own, so nothing ever walks through it.
    if (fs.lstatSync(alias).isSymbolicLink()) fs.unlinkSync(alias);
  } catch {
    // not created
  }
  fs.rmSync(FIXTURE, { recursive: true, force: true });
});

describe("VMU-166 — scripts find the repository root from a path with a space or a ~", () => {
  // A repository living under a folder with both characters, as the
  // coordinator's temporary clone did (8.3 short name RAOULD~1, long name
  // "Raoul Duke"). It does not exist on this machine.
  const fakeRepo = path.resolve(path.sep, "Users", "RAOULD~1", "Raoul Duke", "My Clone");
  const scriptUrl = pathToFileURL(path.join(fakeRepo, "scripts", "s1_probe.mjs")).href;

  it("the file URL really carries the encoded characters (premise)", () => {
    expect(scriptUrl).toContain("%20");
    expect(scriptUrl).toMatch(/RAOULD(%7E|~)1/);
  });

  it("positive control: the old .pathname formula gets it wrong", () => {
    expect(legacyRoot(scriptUrl)).not.toBe(fakeRepo);
  });

  it("repoRootFrom decodes it back to the folder (which does not exist: nothing to resolve, the decoded path)", async () => {
    const { repoRootFrom } = await loadHelper();
    expect(repoRootFrom(scriptUrl)).toBe(fakeRepo);
  });

  it("repoRootFrom returns the folder's real form, as the resolver gives it (the 8.3 case)", async () => {
    const { repoRootFrom } = await loadHelper();
    const longForm = path.resolve(path.sep, "Users", "Raoul Duke", "Raoul Duke", "My Clone");
    const asked = [];
    const realpath = (p) => {
      asked.push(p);
      return p === fakeRepo ? longForm : p;
    };
    expect(repoRootFrom(scriptUrl, { realpath })).toBe(longForm);
    // It resolves the DECODED folder, not the URL.
    expect(asked).toEqual([fakeRepo]);
  });

  it("only a missing folder falls back to the decoded path; any other resolver error is not swallowed", async () => {
    const { repoRootFrom } = await loadHelper();
    const failWith = (code) => () => {
      const e = new Error(code);
      // @ts-ignore — node's error shape
      e.code = code;
      throw e;
    };
    expect(repoRootFrom(scriptUrl, { realpath: failWith("ENOENT") })).toBe(fakeRepo);
    expect(() => repoRootFrom(scriptUrl, { realpath: failWith("EACCES") })).toThrow("EACCES");
  });

  it("on a real filesystem: reached through a directory link whose name has a space and a ~, the root is the link's target", async () => {
    const { repoRootFrom } = await loadHelper();
    const realDir = path.join(FIXTURE, "real dir");
    const alias = path.join(FIXTURE, "alias ~1 dir");
    fs.mkdirSync(path.join(realDir, "scripts"), { recursive: true });
    // "junction": no privilege needed on Windows; ignored elsewhere (a plain
    // directory symlink).
    fs.symlinkSync(realDir, alias, "junction");
    const aliasUrl = pathToFileURL(path.join(alias, "scripts", "style_probe.mjs")).href;
    const expected = fs.realpathSync.native(realDir);
    // Premise: the spelling the script is reached by is not the real form.
    expect(path.resolve(alias)).not.toBe(expected);
    expect(aliasUrl).toContain("%20");
    expect(repoRootFrom(aliasUrl)).toBe(expected);
  });

  it("no script computes its root with new URL(import.meta.url).pathname", () => {
    const offenders = fs
      .readdirSync(SCRIPTS)
      .filter((f) => /\.(m?js|cjs)$/.test(f))
      .filter((f) => /new URL\(import\.meta\.url\)\.pathname/.test(fs.readFileSync(path.join(SCRIPTS, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the seven scripts that need a root all take it from repoRootFrom(import.meta.url)", () => {
    const missing = SCRIPTS_WITH_A_ROOT.filter(
      (f) => !/const ROOT = repoRootFrom\(import\.meta\.url\);/.test(fs.readFileSync(path.join(SCRIPTS, f), "utf8"))
    );
    expect(missing).toEqual([]);
  });
});
