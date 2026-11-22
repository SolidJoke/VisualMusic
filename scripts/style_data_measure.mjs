#!/usr/bin/env node
// @ts-check
/**
 * style_data_measure.mjs — VMU-226: how rich, and how alike, the styles are.
 *
 * Reads src/data/bricks.json (or the file given as the first argument, e.g. a
 * copy of main's: `git show origin/main:src/data/bricks.json > /tmp/base.json`)
 * and prints, without touching anything:
 *   - how many chords each style's progressions hold;
 *   - how many distinct snare patterns there are, theme A and theme B;
 *   - the styles whose drums (or bass, or progression + key) are identical;
 *   - a poverty score per style, highest first — the order lot 2 of VMU-226
 *     and the following ones take the next styles to rework in.
 *
 * The score is deliberately plain, so it can be argued with (one point each,
 * theme A unless said):
 *   +2  the style has no theme B at all (B plays A again);
 *   +1  its drums are the same as another style's;
 *   +1  no ghost note or accent anywhere (A and B, drums and bass);
 *   +1  its bass line plays the root only (no `pitchSteps`);
 *   +1  three chords or fewer in the progression, counting each name once.
 * It measures what the data says, not how it sounds.
 *
 *   npm run style:data            # on the working tree's data
 *   node scripts/style_data_measure.mjs path/to/other/bricks.json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { repoRootFrom } from "./lib/repoRoot.mjs";

const ROOT = repoRootFrom(import.meta.url);
const file = process.argv[2] ?? path.join(ROOT, "src", "data", "bricks.json");
/** @type {any[]} */
const styles = JSON.parse(fs.readFileSync(file, "utf8"));

/** @param {number[]} steps */
const sorted = (steps) => [...(steps ?? [])].sort((a, b) => a - b);

/** @param {any[]|undefined} tracks */
const drumKey = (tracks) =>
  JSON.stringify(
    (tracks ?? [])
      .map((t) => [t.name, sorted(t.activeSteps), sorted(t.lowVelocitySteps ?? [])])
      .sort(),
  );

/**
 * The backbeat of a drum set: its Snare, Clap and Rim rows (playback sorts all
 * three into the snare voice), by name, steps and ghost steps.
 * @param {any[]|undefined} tracks
 */
const snareKey = (tracks) => {
  const rows = (tracks ?? []).filter((t) => /^(snare|clap|rim)$/i.test(t.name));
  if (rows.length === 0) return "no snare, clap or rim";
  return rows
    .map((t) => {
      const ghosts = sorted(t.lowVelocitySteps ?? []);
      return `${t.name} [${sorted(t.activeSteps)}]${ghosts.length ? ` ghost [${ghosts}]` : ""}`;
    })
    .join(" + ");
};

/** @param {string[]} labels @param {any[][]} groups */
const printGroups = (labels, groups) => {
  groups.forEach((g) => console.log("  ", g.map((i) => `${i}:${labels[i]}`).join("  =  ")));
  if (groups.length === 0) console.log("   (none)");
};

/**
 * @param {(style: any) => string} keyOf
 * @returns {number[][]} groups of two or more style indexes sharing a key
 */
const sameBy = (keyOf) => {
  /** @type {Map<string, number[]>} */
  const byKey = new Map();
  styles.forEach((s, i) => byKey.set(keyOf(s), [...(byKey.get(keyOf(s)) ?? []), i]));
  return [...byKey.values()].filter((g) => g.length > 1);
};

const names = styles.map((s) => s.name.en);

console.log(`# ${styles.length} styles from ${path.relative(ROOT, file) || file}\n`);

/** @type {Record<string, number>} */
const chordCounts = {};
styles.forEach((s) => {
  const k = `${s.nnsProgression.length} chords in A / ${s.nnsProgressionVariation ? s.nnsProgressionVariation.length : "no"} in B`;
  chordCounts[k] = (chordCounts[k] ?? 0) + 1;
});
console.log("## Chords per progression (styles per shape)");
Object.entries(chordCounts).forEach(([k, n]) => console.log(`   ${n} x ${k}`));
const distinct = styles.map((s) => new Set(s.nnsProgression).size);
console.log(`   distinct chord names in A, per style: ${distinct.join(" ")}\n`);

for (const [theme, pick] of /** @type {[string, (s: any) => any[]][]} */ ([
  ["A", (s) => s.drumTracks],
  ["B", (s) => s.drumTracksVariation ?? s.drumTracks],
])) {
  /** @type {Map<string, number[]>} */
  const patterns = new Map();
  styles.forEach((s, i) => patterns.set(snareKey(pick(s)), [...(patterns.get(snareKey(pick(s))) ?? []), i]));
  console.log(`## Snare patterns, theme ${theme}: ${patterns.size} distinct`);
  patterns.forEach((idx, key) => console.log(`   ${key}  in ${idx.length} styles`));
  console.log();
}

console.log("## Same drums, theme A");
printGroups(names, sameBy((s) => drumKey(s.drumTracks)));
console.log("\n## Same drums, theme B (A where a style has no B)");
printGroups(names, sameBy((s) => drumKey(s.drumTracksVariation ?? s.drumTracks)));
console.log("\n## Same bass line, theme A");
printGroups(
  names,
  sameBy((s) => JSON.stringify(s.melodyTracks.map((/** @type {any} */ t) => [t.name, sorted(t.activeSteps), t.pitchSteps ?? null]))),
);
console.log("\n## Same progression in the same key, theme A");
printGroups(names, sameBy((s) => JSON.stringify([s.rootValue, s.scaleKey, s.nnsProgression])));

const sameDrums = new Set(sameBy((s) => drumKey(s.drumTracks)).flat());
const scored = styles.map((s, i) => {
  const rows = [...s.drumTracks, ...(s.drumTracksVariation ?? []), ...s.melodyTracks, ...(s.melodyTracksVariation ?? [])];
  const parts = {
    noB: !s.drumTracksVariation && !s.melodyTracksVariation && !s.nnsProgressionVariation ? 2 : 0,
    sameDrums: sameDrums.has(i) ? 1 : 0,
    noGhost: rows.some((/** @type {any} */ t) => (t.lowVelocitySteps ?? []).length > 0) ? 0 : 1,
    rootOnlyBass: s.melodyTracks.some((/** @type {any} */ t) => t.pitchSteps) ? 0 : 1,
    fewChords: new Set(s.nnsProgression).size <= 3 ? 1 : 0,
  };
  return { i, score: Object.values(parts).reduce((a, b) => a + b, 0), parts };
});
scored.sort((a, b) => b.score - a.score || a.i - b.i);

console.log("\n## Poverty score (highest = poorest; ties by position)");
console.log("   idx  score  noB sameDrums noGhost rootBass fewChords  style");
scored.forEach(({ i, score, parts }) =>
  console.log(
    `   ${String(i).padStart(3)}  ${String(score).padStart(5)}  ${String(parts.noB).padStart(3)} ${String(parts.sameDrums).padStart(9)} ${String(parts.noGhost).padStart(7)} ${String(parts.rootOnlyBass).padStart(8)} ${String(parts.fewChords).padStart(9)}  ${names[i]}`,
  ),
);
