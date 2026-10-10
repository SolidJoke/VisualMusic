// VMU-185 - the one owner of the lists the Assistant drawer and A′'s direct
// selectors both show (src/core/selectionOptions.js): the style menu's groups,
// the twelve root notes, the chord types and the scale types, and the rule that
// ties a dictionary family (note / chord / scale) to a dictType.
//
// Before VMU-185 these lived in StudioPanel (inline), DictionaryPanel
// (getGroupedScales / getGroupedChords, local, not exported) and DictionaryPanel
// (the family derived from dictType + handleFamilyChange); the row could only
// have copied them. The anchors below are the DATA's own counts (BRICKS, CHORDS,
// SCALES, NOTES), so a style or a chord added there appears in both places
// without another edit - and a list that forgets one fails here.
import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import { NOTES, SCALES, CHORDS } from "../theory";
import { translations } from "../../i18n/translations";
import {
  STYLE_GROUPS,
  styleOptions,
  rootNoteOptions,
  getGroupedScales,
  getGroupedChords,
  scaleOptions,
  chordOptions,
  familyOptions,
  dictFamily,
  dictTypeForFamily,
} from "../selectionOptions";

const leaves = (options) => options.flatMap((o) => (o.items ? o.items : [o]));

describe("selectionOptions: the style menu", () => {
  it("holds every style once, in the seven groups of the Studio, by index", () => {
    const options = styleOptions("fr");
    expect(options).toHaveLength(STYLE_GROUPS.length);
    expect(STYLE_GROUPS).toHaveLength(7);
    const items = leaves(options);
    expect(items).toHaveLength(BRICKS.length);
    expect(items.map((i) => i.value).sort((a, b) => a - b)).toEqual(BRICKS.map((_, i) => i));
  });

  it("names a style in the asked language, English when that language has none", () => {
    const pt = leaves(styleOptions("pt"));
    for (const item of pt) expect(item.label).toBe(BRICKS[item.value].name.pt);
    const zh = leaves(styleOptions("zh"));
    for (const item of zh) expect(item.label).toBe(BRICKS[item.value].name.zh);
    const nowhere = leaves(styleOptions("xx"));
    for (const item of nowhere) expect(item.label).toBe(BRICKS[item.value].name.en);
  });
});

describe("selectionOptions: root notes, chord types, scale types", () => {
  it("lists the twelve notes in EU or US names", () => {
    const eu = rootNoteOptions("eu");
    const us = rootNoteOptions("us");
    expect(eu).toHaveLength(12);
    expect(eu.map((o) => o.value)).toEqual(NOTES.map((n) => n.value));
    expect(eu.map((o) => o.label)).toEqual(NOTES.map((n) => n.eu));
    expect(us.map((o) => o.label)).toEqual(NOTES.map((n) => n.us));
    expect(eu[2].label).toBe("Ré");
    expect(us[2].label).toBe("D");
  });

  it("lists every chord and every scale of the data, each once, labelled by the page's table", () => {
    const txt = translations.fr;
    const chordItems = leaves(chordOptions(getGroupedChords(), txt));
    expect(chordItems.map((i) => i.value).sort()).toEqual(Object.keys(CHORDS).sort());
    const scaleItems = leaves(scaleOptions(getGroupedScales(), txt));
    expect(scaleItems.map((i) => i.value).sort()).toEqual(Object.keys(SCALES).sort());
    for (const item of [...chordItems, ...scaleItems]) {
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("keeps the groups the drawer had: chords by category order, scales by category order", () => {
    expect(getGroupedChords().map((g) => g.category)).toEqual(["triads", "seventh", "extended", "suspended"]);
    expect(getGroupedScales().map((g) => g.category)).toEqual(["diatonic", "pentatonic", "blues", "exotic", "symmetric"]);
  });
});

describe("selectionOptions: the family <-> dictType rule", () => {
  it("derives the family from dictType", () => {
    expect(dictFamily("single_note")).toBe("note");
    expect(dictFamily("chord_major")).toBe("chord");
    expect(dictFamily("chord_m7b5")).toBe("chord");
    expect(dictFamily("scale_major")).toBe("scale");
    expect(dictFamily("scale_blues")).toBe("scale");
    // Anything else is a scale, as the drawer always read it.
    expect(dictFamily(undefined)).toBe("scale");
    expect(dictFamily(null)).toBe("scale");
  });

  it("picks a family's first type: single_note, chord_major, scale_major", () => {
    expect(dictTypeForFamily("note")).toBe("single_note");
    expect(dictTypeForFamily("chord")).toBe("chord_major");
    expect(dictTypeForFamily("scale")).toBe("scale_major");
    expect(dictTypeForFamily("other")).toBeNull();
  });

  it("round-trips: a family's first type belongs to that family", () => {
    for (const family of ["note", "chord", "scale"]) {
      expect(dictFamily(dictTypeForFamily(family))).toBe(family);
    }
  });

  it("labels the three families from the page's table, with the drawer's fallbacks", () => {
    expect(familyOptions(translations.fr).map((f) => f.key)).toEqual(["note", "chord", "scale"]);
    expect(familyOptions(translations.fr).map((f) => f.label)).toEqual([
      translations.fr.familyNote,
      translations.fr.familyChord,
      translations.fr.familyScale,
    ]);
    expect(familyOptions({}).map((f) => f.label)).toEqual(["🎵 Note", "🎸 Accords", "🎹 Gammes"]);
  });
});
