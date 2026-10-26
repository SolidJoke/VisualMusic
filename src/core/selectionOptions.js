// src/core/selectionOptions.js
//
// VMU-185 - the ONE owner of the lists the Assistant drawer and A′'s direct
// selectors (src/prototype/SelectionRow.jsx) both show: the Studio's style menu,
// the twelve root notes, the chord types, the scale types, and the rule that
// ties a dictionary family (note / chord / scale) to a dictType.
//
// Before this file the style menu was built inline in StudioPanel, the grouped
// scales and chords were local functions of DictionaryPanel, and the family was
// derived from dictType in DictionaryPanel (with its own handleFamilyChange):
// a second place could only have copied them, and a style or a chord added to
// the data would have appeared in one place and not the other. Both places now
// call these functions, so there is nothing to keep in step by hand
// (src/prototype/__tests__/PrototypeASelection.test.jsx counts the options of
// each place against BRICKS, CHORDS, SCALES and NOTES).
//
// Plain functions over the data tables; no React, no state. Shapes are the
// ones CustomSelect takes: [{ value, label }] or [{ label, items: [{ value,
// label }] }].
import { BRICKS } from "./bricks";
import { NOTES, SCALES, SCALE_CATEGORIES, CHORDS, CHORD_CATEGORIES } from "./theory";
import { SCALE_LABEL_MAP, CHORD_LABEL_MAP } from "./constants";

/** The Studio's seven style groups, in the order the menu shows them (bricks.json `_group`). */
export const STYLE_GROUPS = [
  { group: "jazz", label: "🎷 Jazz & Bossa" },
  { group: "world", label: "🌍 World & Groove" },
  { group: "urban", label: "🎤 Urban & Hip-Hop" },
  { group: "expert_progressions", label: "🎓 Progressions Expertes (NNS)" },
  { group: "pop", label: "🎹 Pop & Funk" },
  { group: "rock", label: "🎸 Rock & Metal" },
  { group: "electronic", label: "🎧 Electronic" },
];

/**
 * The style menu: one entry per style of BRICKS, valued by its index in BRICKS
 * (that index is the Studio's `currentBrickIndex`), named in the page's
 * language, English when that language has no name for it.
 */
export function styleOptions(lang) {
  return STYLE_GROUPS.map(({ group, label }) => ({
    label,
    items: BRICKS.filter((b) => b._group === group).map((b) => ({
      value: BRICKS.indexOf(b),
      label: b.name[lang] || b.name.en,
    })),
  }));
}

/** The twelve root notes, named in the page's notation ("eu": Do Ré Mi, "us": C D E). */
export function rootNoteOptions(notation) {
  return NOTES.map((n) => ({ value: n.value, label: notation === "us" ? n.us : n.eu }));
}

// Group keys by category, in the categories' own order; a category nobody uses is left out.
function groupByCategory(table, categories) {
  const groups = {};
  Object.entries(table).forEach(([key, entry]) => {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(key);
  });
  return Object.entries(categories)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([cat]) => groups[cat])
    .map(([cat, meta]) => ({ category: cat, labelKey: meta.labelKey, items: groups[cat] }));
}

/** The scales, grouped by category: [{ category, labelKey, items: [scaleKey] }]. */
export function getGroupedScales() {
  return groupByCategory(SCALES, SCALE_CATEGORIES);
}

/** The chords, grouped by category: [{ category, labelKey, items: [chordKey] }]. */
export function getGroupedChords() {
  return groupByCategory(CHORDS, CHORD_CATEGORIES);
}

/** getGroupedScales() as CustomSelect options, named by the page's table `txt`. */
export function scaleOptions(groups, txt) {
  return groups.map((group) => ({
    label: txt[group.labelKey] || group.category,
    items: group.items.map((scaleKey) => ({
      value: scaleKey,
      label: txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey,
    })),
  }));
}

/** getGroupedChords() as CustomSelect options, named by the page's table `txt`. */
export function chordOptions(groups, txt) {
  return groups.map((group) => ({
    label: txt[group.labelKey] || group.category,
    items: group.items.map((chordKey) => ({
      value: chordKey,
      label: txt[CHORD_LABEL_MAP[chordKey]] || CHORDS[chordKey]?.key || chordKey,
    })),
  }));
}

/** The dictionary families, in order: a single note, a chord, a scale. */
export const DICT_FAMILIES = ["note", "chord", "scale"];

/** The three families as { key, label }, named by the page's table (with the drawer's fallbacks). */
export function familyOptions(txt) {
  return [
    { key: "note", label: txt.familyNote || "🎵 Note" },
    { key: "chord", label: txt.familyChord || "🎸 Accords" },
    { key: "scale", label: txt.familyScale || "🎹 Gammes" },
  ];
}

/** The family a dictType belongs to: "single_note" is a note, "chord_*" a chord, anything else a scale. */
export function dictFamily(dictType) {
  if (dictType === "single_note") return "note";
  if (dictType && typeof dictType === "string" && dictType.startsWith("chord_")) return "chord";
  return "scale";
}

/** The dictType a family starts on when it is chosen, or null for an unknown family. */
export function dictTypeForFamily(family) {
  if (family === "note") return "single_note";
  if (family === "chord") return "chord_major";
  if (family === "scale") return "scale_major";
  return null;
}

/** The dictType a family click must set - null when that family is already active (VMU-189). */
export function dictTypeOnFamilyClick(family, dictType) {
  if (family === dictFamily(dictType)) return null;
  return dictTypeForFamily(family);
}
