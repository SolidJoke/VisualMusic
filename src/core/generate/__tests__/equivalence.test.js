// @ts-check
// VMU-234 — the generator chain plays EXACTLY what the hand-wired code of
// before played: the same document, byte for byte in JSON, the same marks,
// the same "has edits", for a sample of styles x settings (key, edited
// progression, chance, groove, the copy's drift, "hear the original").
//
// `oldPlayed` (./oldStudioChain.js) is a COPY of the computation
// hooks/useStudioMode.js held on main at b990c16, before VMU-234: the
// reference. Do not "fix" it.
import { describe, it, expect } from "vitest";
import { BRICKS } from "../../bricks";
import { buildStudioTimeline, studioSelection, DRUM_ROLES, MELODIC_ROLES } from "../../timeline";
import { loopLengthForCycle, maxCycleLength } from "../../loopWindow";
import { insertChordAfter, progressionFromDoc, replaceChord } from "../../progressionEdit";
import { cycleChance, emptyChance, isNeutral, setDensity } from "../../chance";
import { driftCopy } from "../../phasingDrift";
import { hasModifications, playedDocument } from "../studio";
import { oldPlayed, oldVariationOf } from "./oldStudioChain";
import { GENERATORS } from "../registry";
import { defineGenerator } from "../contract";

// ─── the new path: what useStudioMode now does ───────────────────────

/** useStudioMode's wiring after VMU-234, as one function. */
function newPlayed({ brickIndex, theme, overrides, customChords, chance, keyChoice, swing, humanize, listenOriginal }, registry = GENERATORS) {
  const settings = { progression: customChords, chance, transpose: keyChoice, groove: { swing, humanize } };
  const hasEdits = hasModifications(overrides, settings, registry);
  const isHearingOriginal = listenOriginal && hasEdits;
  const cycleSteps = maxCycleLength(overrides);
  const { lengthMeasures } = loopLengthForCycle(cycleSteps);
  const source = isHearingOriginal
    ? buildStudioTimeline({ brickIndex, theme })
    : buildStudioTimeline({ brickIndex, theme, overrides, lengthMeasures });
  const played = playedDocument(source, settings, { theme, styleRoot: BRICKS.at(Number(brickIndex)).rootValue, cycleSteps }, { hearOriginal: isHearingOriginal, registry });
  return { timeline: played.doc, chanceDropped: played.dropped, hasEdits, isHearingOriginal };
}

// ─── the sample ──────────────────────────────────────────────────────

const SEED = 0x2c1b3a7;
const PATTERN = [1, 0, 0, 1, 0, 0, 1, 0];

/** Every setting for one style and variation, by axis. */
function axesFor(brickIndex, theme) {
  const brick = BRICKS[brickIndex];
  const base = buildStudioTimeline({ brickIndex, theme });
  const variation = oldVariationOf(theme);
  const other = variation === "A" ? "B" : "A";

  const list = progressionFromDoc(base);
  const first = list[0]?.nns === "4" ? "5" : "4";
  const edited = insertChordAfter(replaceChord(list, 0, first), 0, "6", 8);

  const drums = base.tracks.filter((t) => DRUM_ROLES.includes(t.role)).map((t) => t.id);
  const melodic = base.tracks.filter((t) => MELODIC_ROLES.includes(t.role)).map((t) => t.id);
  let chance = emptyChance(SEED);
  if (drums[0]) {
    chance = cycleChance(chance, drums[0], 0);
    chance = cycleChance(chance, drums[0], 2);
    chance = cycleChance(cycleChance(chance, drums[0], 4), drums[0], 4);
  }
  chance = setDensity(chance, drums[1] ?? melodic[0] ?? drums[0], 60);
  if (melodic[0]) chance = setDensity(chance, melodic[0], 45);

  const drumName = studioSelection(brick, theme, {}).drums?.[0]?.name;
  const drift = driftCopy(PATTERN, 1, 2);

  return {
    keyChoice: [null, (brick.rootValue + 5) % 12],
    customChords: [null, { [variation]: edited }, { [other]: edited }],
    chance: [emptyChance(SEED), chance],
    groove: [
      { swing: 50, humanize: 0 },
      { swing: 66, humanize: 40 },
    ],
    overrides: [
      { customDrums: null, customRhythm: null, customProgression: null, suggestedBassTrack: null },
      drumName
        ? { customDrums: { [drumName]: { activeSteps: drift.activeSteps, cycleLength: drift.cycleLength } }, customRhythm: null, customProgression: null, suggestedBassTrack: null }
        : { customDrums: null, customRhythm: { activeSteps: [0, 3, 6], cycleLength: 8 }, customProgression: null, suggestedBassTrack: null },
    ],
    listenOriginal: [false, true],
  };
}

/** The full product of the axes, as inputs. */
function product(brickIndex, theme) {
  const axes = axesFor(brickIndex, theme);
  const out = [];
  for (const keyChoice of axes.keyChoice)
    for (const customChords of axes.customChords)
      for (const chance of axes.chance)
        for (const groove of axes.groove)
          for (const overrides of axes.overrides)
            for (const listenOriginal of axes.listenOriginal)
              out.push({ brickIndex, theme, keyChoice, customChords, chance, ...groove, overrides, listenOriginal });
  return out;
}

const json = (r) => JSON.stringify([r.timeline, r.chanceDropped, r.hasEdits, r.isHearingOriginal]);

/** The sample: the full product (96 cases) on every style, both variations. */
function sample() {
  const cases = [];
  BRICKS.forEach((_, brickIndex) => {
    for (const theme of ["A", "B"]) cases.push(...product(brickIndex, theme));
  });
  return cases;
}

const CASES = sample();

describe("VMU-234: the chain plays what the hand-wired code played", () => {
  it(`is identical, byte for byte in JSON, on ${CASES.length} cases over ${BRICKS.length} styles`, () => {
    const differ = [];
    for (const input of CASES) {
      if (json(oldPlayed(input)) !== json(newPlayed(input))) differ.push(input);
    }
    expect(differ.map((c) => `${c.brickIndex}${c.theme} key=${c.keyChoice} edit=${Boolean(c.customChords)} drift=${Boolean(c.overrides.customDrums || c.overrides.customRhythm)} listen=${c.listenOriginal}`)).toEqual([]);
  });

  it("the sample covers every axis in both of its values (or the test would prove less than it says)", () => {
    const seen = (pick) => new Set(CASES.map(pick));
    expect(seen((c) => c.keyChoice === null).size).toBe(2);
    expect(seen((c) => (c.customChords ? Object.keys(c.customChords)[0] === oldVariationOf(c.theme) : "none")).size).toBe(3);
    expect(seen((c) => isNeutral(c.chance)).size).toBe(2);
    expect(seen((c) => c.swing).size).toBe(2);
    expect(seen((c) => Boolean(c.overrides.customDrums || c.overrides.customRhythm)).size).toBe(2);
    expect(seen((c) => c.listenOriginal).size).toBe(2);
    // The chance really removes hits, the original really differs, and the
    // groove is really on the document, somewhere in the sample.
    expect(CASES.some((c) => Object.keys(newPlayed(c).chanceDropped).length > 0)).toBe(true);
    expect(CASES.some((c) => newPlayed(c).isHearingOriginal)).toBe(true);
    expect(CASES.some((c) => /** @type {any} */ (newPlayed(c).timeline).groove)).toBe(true);
  });
});

/** Every order of a list. */
function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((item, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [item, ...rest]));
}

/** The cases of the sample whose new-path document differs from the reference, for a registry. */
function differingWith(registry, cases) {
  return cases.filter((input) => json(oldPlayed(input)) !== json(newPlayed(input, registry))).length;
}

describe("VMU-234: what the order of the registry does today", () => {
  // A finding of VMU-234, held so that nobody relies on the opposite: the four
  // generators of today COMMUTE. The progression sets the chords and the
  // window (resolved in `doc.key`, so the key moves them either way), the
  // chance thins the drum and melodic tracks, the key moves `key` and the
  // chords, the groove adds one field. Every order gives the same document.
  // The order of the registry is still the order of before, and it becomes
  // observable with the first generator that does not commute (an
  // arpeggiator writes the notes the chance thins, VMU-224).
  const few = CASES.filter((c) => c.brickIndex < 2);
  it(`every one of the 24 orders of today's four plays the same, on ${few.length} cases`, () => {
    const orders = permutations([...GENERATORS]);
    expect(orders).toHaveLength(24);
    expect(orders.map((order) => differingWith(order, few))).toEqual(orders.map(() => 0));
  });

  it("the comparison is not blind: a broken chain is caught (the positive control, kept)", () => {
    const [progression, chance, transpose, groove] = ["progression", "chance", "transpose", "groove"].map((id) => GENERATORS.find((g) => g.id === id));
    // The key applied twice.
    expect(differingWith([progression, chance, transpose, transpose, groove], few)).toBeGreaterThan(0);
    // The chance left out.
    expect(differingWith([progression, transpose, groove], few)).toBeGreaterThan(0);
    // The groove turned into an edit: "hear the original" would drop it.
    const grooveAsEdit = defineGenerator({ ...groove, kind: "edit" });
    expect(differingWith([progression, chance, transpose, grooveAsEdit], few)).toBeGreaterThan(0);
  });
});
