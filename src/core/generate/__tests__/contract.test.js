// @ts-check
// VMU-234 — the generator contract and the chain, as pure functions.
import { describe, it, expect, vi } from "vitest";
import { createStageCache, defineGenerator, NO_MARKS, runGenerators } from "../contract";
import { GENERATORS } from "../registry";
import { initialGeneratorSettings, settingsForNewStyle, updateGeneratorSettings, hasModifications } from "../studio";
import { buildStudioTimeline } from "../../timeline";
import { emptyChance, cycleChance } from "../../chance";

const doc = buildStudioTimeline({ brickIndex: 0, theme: "A" });
const context = { theme: "A", styleRoot: doc.key.rootValue, cycleSteps: 0, seed: 7 };
const NO_OVERRIDES = { customDrums: null, customRhythm: null, customProgression: null, suggestedBassTrack: null };

const fake = (id, kind, apply, reads = []) => defineGenerator({ id, kind, reads, initial: () => 0, isActive: (n) => n > 0, apply });

describe("VMU-234: the registry", () => {
  it("holds the order of before: progression, chance, transpose, groove", () => {
    expect(GENERATORS.map((g) => g.id)).toEqual(["progression", "chance", "transpose", "groove"]);
    expect(GENERATORS.map((g) => g.kind)).toEqual(["edit", "edit", "play", "play"]);
    expect(Object.isFrozen(GENERATORS)).toBe(true);
  });

  it("every generator, at its initial settings, gives back the very same document", () => {
    const settings = initialGeneratorSettings();
    for (const generator of GENERATORS) {
      expect(generator.apply(doc, settings[generator.id], context).doc).toBe(doc);
      expect(generator.isActive(settings[generator.id])).toBe(false);
    }
  });
});

describe("VMU-234: defineGenerator", () => {
  it("refuses a generator that does not follow the contract", () => {
    const ok = { id: "x", kind: "edit", reads: [], initial: () => 0, isActive: () => false, apply: (d) => ({ doc: d }) };
    expect(() => defineGenerator(ok)).not.toThrow();
    expect(() => defineGenerator({ ...ok, id: "" })).toThrow(/id/);
    expect(() => defineGenerator({ ...ok, kind: "other" })).toThrow(/kind/);
    expect(() => defineGenerator({ ...ok, reads: undefined })).toThrow(/reads/);
    expect(() => defineGenerator({ ...ok, apply: undefined })).toThrow(/apply/);
    expect(() => defineGenerator({ ...ok, forNewStyle: 3 })).toThrow(/forNewStyle/);
  });
});

describe("VMU-234: runGenerators", () => {
  const tag = (name) => (d, n) => (n ? { doc: { ...d, tags: [...(d.tags ?? []), name] } } : { doc: d });
  const registry = [fake("a", "edit", tag("a")), fake("b", "play", tag("b")), fake("c", "edit", tag("c"))];

  it("applies the registry in its order, each stage on the previous one's document", () => {
    const out = runGenerators(doc, { a: 1, b: 1, c: 1 }, context, { registry });
    expect(/** @type {any} */ (out.doc).tags).toEqual(["a", "b", "c"]);
  });

  it("\"hear the original\" leaves out the edit generators, never the play ones", () => {
    const out = runGenerators(doc, { a: 1, b: 1, c: 1 }, context, { registry, skipEdits: true });
    expect(/** @type {any} */ (out.doc).tags).toEqual(["b"]);
  });

  it("merges the marks of every stage into one list, sorted and without repeats", () => {
    const marks = (steps) => (d) => ({ doc: d, dropped: { kick: steps } });
    const out = runGenerators(doc, {}, context, { registry: [fake("x", "edit", marks([4, 0])), fake("y", "edit", marks([0, 2]))] });
    expect(out.dropped).toEqual({ kick: [0, 2, 4] });
    expect(out.modified).toBe(NO_MARKS);
  });

  it("with no mark, the marks are the one frozen constant", () => {
    expect(runGenerators(doc, { a: 0, b: 0, c: 0 }, context, { registry }).dropped).toBe(NO_MARKS);
  });

  it("the cache recomputes a stage only when its input, its settings or what it reads changes", () => {
    const apply = vi.fn((d, n) => ({ doc: n ? { ...d, n } : d }));
    const reg = [fake("g", "edit", apply, ["theme"])];
    const cache = createStageCache();
    const first = runGenerators(doc, { g: 1 }, context, { registry: reg, cache });
    const second = runGenerators(doc, { g: 1 }, { ...context, seed: 99, cycleSteps: 16 }, { registry: reg, cache });
    expect(second.doc).toBe(first.doc);
    expect(apply).toHaveBeenCalledTimes(1);
    runGenerators(doc, { g: 1 }, { ...context, theme: "B" }, { registry: reg, cache });
    expect(apply).toHaveBeenCalledTimes(2);
    runGenerators(doc, { g: 2 }, { ...context, theme: "B" }, { registry: reg, cache });
    expect(apply).toHaveBeenCalledTimes(3);
  });
});

describe("VMU-234: the Studio's settings", () => {
  it("one update returns the same object when it changes nothing", () => {
    const s = initialGeneratorSettings();
    expect(updateGeneratorSettings(s, "transpose", (k) => k)).toBe(s);
    expect(updateGeneratorSettings(s, "transpose", () => 5).transpose).toBe(5);
  });

  it("a change of style drops the edited chords and the chances, keeps the seed, the key and the groove", () => {
    const s = { ...initialGeneratorSettings(), transpose: 5, groove: { swing: 60, humanize: 10 } };
    expect(settingsForNewStyle(s)).toBe(s);
    const chance = cycleChance(emptyChance(42), "kick", 0);
    const edited = { ...s, progression: { A: [{ nns: "4", durationSteps: 16 }] }, chance };
    const next = settingsForNewStyle(edited);
    expect(next.progression).toBe(null);
    expect(next.chance).toEqual(emptyChance(42));
    expect(next.transpose).toBe(5);
    expect(next.groove).toBe(s.groove);
  });

  it("\"has edits\": an override or an active edit generator — never the key nor the groove", () => {
    const s = initialGeneratorSettings();
    expect(hasModifications(NO_OVERRIDES, s)).toBe(false);
    expect(hasModifications(NO_OVERRIDES, { ...s, transpose: 3, groove: { swing: 70, humanize: 50 } })).toBe(false);
    expect(hasModifications({ ...NO_OVERRIDES, customRhythm: [0, 4] }, s)).toBe(true);
    expect(hasModifications(NO_OVERRIDES, { ...s, progression: { B: [{ nns: "1", durationSteps: 16 }] } })).toBe(true);
    expect(hasModifications(NO_OVERRIDES, { ...s, chance: cycleChance(s.chance, "kick", 3) })).toBe(true);
  });
});
