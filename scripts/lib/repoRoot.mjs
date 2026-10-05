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
 * Every script lives directly in scripts/, so the root is one level up.
 * Covered by src/__tests__/ScriptRepoRoot.test.js.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} moduleUrl the calling script's import.meta.url
 * @returns {string} absolute path of the repository root (the folder above scripts/)
 */
export function repoRootFrom(moduleUrl) {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..");
}
