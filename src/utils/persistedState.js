// @ts-check
// VMU-050 (first slice) - STUB written with the red tests: it stores and
// restores nothing yet. The real module replaces it in the next commit.

export const STORAGE_KEY = "visualmusic.state.v1";

/** @returns {Record<string, unknown>} */
export function loadPersisted() {
  return {};
}

/** @param {Record<string, unknown>} _partial */
export function savePersisted(_partial) {}
