/**
 * repoRoot.mjs — the repository root, from a script's own import.meta.url.
 *
 * VMU-166: the measurement scripts used
 *   path.resolve(path.dirname(new URL(import.meta.url).pathname)..., "..")
 * A URL path keeps its percent-encoding, so a clone under a folder with a
 * space or a "~" (C:\Users\RAOULD~1\..., "Raoul Duke") became "%20" / "%7E"
 * on disk, and every probe died on "Could not resolve ...\vite.config.js".
 * fileURLToPath decodes the URL and handles the Windows drive letter, which
 * the old regex patched by hand. scripts/check-integrity.js already did this.
 *
 * Decoding is not enough (coordinator's QA of #139): the decoded path keeps
 * the spelling the folder was reached by — the 8.3 short form RAOULD~1 —
 * while Vite resolves every file to its real path ("Raoul Duke"). Root and
 * files then disagree, Vite serves /src/main.jsx untransformed and the page
 * dies on "Unexpected token '<'". So the root is the folder's real form,
 * fs.realpathSync.native: long names, links resolved, true case. A folder
 * that does not exist has no real form: its decoded path is returned (any
 * other error is thrown).
 *
 * Every script lives directly in scripts/, so the root is one level up.
 * Covered by src/__tests__/ScriptRepoRoot.test.js.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} moduleUrl the calling script's import.meta.url
 * @param {{ realpath?: (p: string) => string }} [options] the resolver, for
 *   tests (default fs.realpathSync.native)
 * @returns {string} absolute real path of the repository root (the folder above scripts/)
 */
export function repoRootFrom(moduleUrl, { realpath = fs.realpathSync.native } = {}) {
  const decoded = path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..");
  try {
    return realpath(decoded);
  } catch (err) {
    if (err && err.code === "ENOENT") return decoded;
    throw err;
  }
}
