import { describe, it, expect } from "vitest";
import { translations } from "../../i18n/translations";

// VMU-195-A. The "Math & Rythmes" window was rewritten in plain language for a
// beginner. A reviewer replaced the FR label "Nombre de cases" with
// "SUBDIVISIONS (n)" and the whole suite stayed green: the owner's wording was
// guarded by nothing. This test pins the exact FR/EN strings, checks that the
// PT/ZH tables stay in step, and rejects the shouted all-caps jargon the old
// labels used.

const fr = translations.fr.comp;
const en = translations.en.comp;
const pt = translations.pt.comp;
const zh = translations.zh.comp;

// key, FR, EN — the owner's wording, not a paraphrase.
const LABELS = [
  ["presets", "Rythmes du monde", "World rhythms"],
  ["customGeo", "— Mon rythme —", "— My rhythm —"],
  ["geoParams", "Construire le rythme", "Build the rhythm"],
  ["subdivisions", "Nombre de cases", "Number of steps"],
  ["pulses", "Nombre de coups", "Number of hits"],
  ["rotation", "Décaler le départ", "Shift the start"],
  ["showComp", "Montrer les cases vides", "Show the empty steps"],
  ["grid", "Les cases du rythme", "The rhythm's steps"],
  ["exportPanel", "Envoyer vers", "Send to"],
  ["exportBtn", "Envoyer maintenant", "Send now"],
  ["resetAll", "Revenir au rythme du style", "Back to the style's rhythm"],
  ["advanced", "Pour aller plus loin", "Go further"],
  ["live", "La piste suit tes réglages en direct.", "The track follows your settings live."],
];

describe("Math & Rythmes — the owner's plain-language labels (VMU-195-A)", () => {
  for (const [key, frValue, enValue] of LABELS) {
    it(`FR comp.${key} stays "${frValue}"`, () => {
      expect(fr[key], `fr.comp.${key} is missing`).toBe(frValue);
    });

    it(`EN comp.${key} stays "${enValue}"`, () => {
      expect(en[key], `en.comp.${key} is missing`).toBe(enValue);
    });
  }
});

describe("Math & Rythmes — the other languages stay in step", () => {
  const frKeys = Object.keys(fr).sort();

  for (const [lang, table] of [
    ["pt", pt],
    ["zh", zh],
  ]) {
    it(`${lang}.comp has exactly the keys of fr.comp`, () => {
      expect(Object.keys(table).sort()).toEqual(frKeys);
    });

    it(`${lang}.comp has no empty string`, () => {
      const entries = Object.entries(table).filter(([, value]) => typeof value === "string");
      expect(entries.length).toBeGreaterThan(0);
      for (const [key, value] of entries) {
        expect(value.trim(), `${lang}.comp.${key} is empty`).not.toBe("");
      }
    });

    it(`${lang}.comp.origins matches fr.comp.origins and has no empty string`, () => {
      expect(Object.keys(table.origins).sort()).toEqual(Object.keys(fr.origins).sort());
      for (const [key, value] of Object.entries(table.origins)) {
        expect(value.trim(), `${lang}.comp.origins.${key} is empty`).not.toBe("");
      }
    });
  }
});

describe("Math & Rythmes — no shouted jargon labels", () => {
  // A value of uppercase letters, spaces and punctuation only, longer than 3
  // characters. `stop` / `play` are deliberate button text — not labels — and
  // are the only two entries exempted here.
  const BUTTON_TEXT = new Set(["stop", "play"]);
  const SHOUTED = /^[\p{Lu}\s\p{P}]+$/u;

  for (const [lang, table] of [
    ["fr", fr],
    ["en", en],
  ]) {
    it(`${lang}.comp has no all-caps value longer than 3 characters`, () => {
      const shouted = Object.entries(table)
        .filter(
          ([key, value]) =>
            typeof value === "string" &&
            !BUTTON_TEXT.has(key) &&
            value.length > 3 &&
            SHOUTED.test(value)
        )
        .map(([key, value]) => `${key}: ${value}`);
      expect(shouted).toEqual([]);
    });
  }
});
