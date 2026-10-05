/**
 * VMU-166 — the measurement scripts found the repository root with
 * `new URL(import.meta.url).pathname`. A URL path keeps its percent-encoding:
 * a clone under `C:\Users\RAOULD~1\...` (or any folder with a space) became
 * `RAOULD%7E1` / `%20` on disk, and every probe died on "Could not resolve
 * ...\vite.config.js" (observed by the coordinator, 2026-09-26, clone of
 * `main` under the temporary folder). `scripts/check-integrity.js` already
 * did it right, with fileURLToPath.
 *
 * Two checks:
 *   1. the shared helper the scripts now call decodes a file URL whose path
 *      has a space and a "~" back to the real folder (and the old formula,
 *      kept here as the positive control, does not);
 *   2. no script computes its root the old way any more, and every one that
 *      needs a root goes through the helper — seven at the time of writing.
 */
import { describe, it, expect } from "vitest";
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

describe("VMU-166 — scripts find the repository root from a path with a space or a ~", () => {
  // A repository living under a folder with both characters, as the
  // coordinator's temporary clone did (8.3 short name RAOULD~1, long name
  // "Raoul Duke").
  const fakeRepo = path.resolve(path.sep, "Users", "RAOULD~1", "Raoul Duke", "My Clone");
  const scriptUrl = pathToFileURL(path.join(fakeRepo, "scripts", "s1_probe.mjs")).href;

  it("the file URL really carries the encoded characters (premise)", () => {
    expect(scriptUrl).toContain("%20");
    expect(scriptUrl).toMatch(/RAOULD(%7E|~)1/);
  });

  it("positive control: the old .pathname formula gets it wrong", () => {
    expect(legacyRoot(scriptUrl)).not.toBe(fakeRepo);
  });

  it("repoRootFrom decodes it back to the real folder", async () => {
    // Imported the way node loads the scripts themselves (a file URL), and
    // inside the test so the two scans below still run if it is missing.
    const helperUrl = pathToFileURL(path.join(SCRIPTS, "lib", "repoRoot.mjs")).href;
    const { repoRootFrom } = await import(/* @vite-ignore */ helperUrl);
    expect(repoRootFrom(scriptUrl)).toBe(fakeRepo);
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
