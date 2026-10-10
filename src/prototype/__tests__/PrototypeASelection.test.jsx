// VMU-185 — the direct selectors of A′ (?prototype=a): the Studio's style, the
// Dictionary's family, root note and type (chord or scale), in the SAME block as
// the tempo, the metronome and the volume (the transport), on a second row.
//
// Gabriel, 2026-10-10: "le but est de pouvoir changer de style, note ou
// structure sans quitter le clavier ou les manches" - the Assistant drawer
// hides the necks and adds a step. Today these controls exist only in the
// drawer (StudioPanel / DictionaryPanel / DictChordPanel); the drawer keeps
// them, unchanged.
//
// What is asserted (PrototypeA rendered with its heavy children stubbed; the
// drawer's own panels rendered beside it for the "one owner" checks):
//   (a) Studio: the row holds the style menu and nothing of the Dictionary, and
//       it is a child of the transport block, whose top-row controls are
//       untouched;
//   (b) Dictionary: family + root note, and the type ONLY for Chords / Scales
//       (nothing for a single note);
//   (c) choosing a root note calls setDictRoot with that note's value;
//   (d) choosing Chords / Scales / Single note calls setDictType with
//       "chord_major" / "scale_major" / "single_note";
//   (e) choosing a style calls setCurrentBrickIndex with its index (a Number);
//   (f) ONE owner of the lists: the row's options are the drawer's (same values,
//       and as many as the data holds: BRICKS, CHORDS, SCALES, NOTES);
//   (g) the four languages hold the row's words;
//   (h) every data-fn is unique, and the five new ones are in the A′-ACCÈS list.
// The row's size, its place and what it does to the keyboard are measured in
// Chromium by scripts/s1_probe.mjs (S1-23): jsdom does no layout.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));
vi.mock("../../utils/debug", () => ({ log: vi.fn() }));

import PrototypeA from "../PrototypeA";
import StudioPanel from "../../components/Panels/StudioPanel";
import DictionaryPanel from "../../components/Panels/DictionaryPanel";
import { AppProvider } from "../../context/AppContext";
import { BRICKS } from "../../core/bricks";
import { NOTES, SCALES, CHORDS } from "../../core/theory";
import { translations } from "../../i18n/translations";
import { A_PRIME_ACCESS } from "../aPrimeAccess";

const noop = () => {};

/** Visible as far as jsdom can tell (no layout here): in the document, no ancestor hidden. */
function isVisible(el) {
  if (!el || !el.isConnected) return false;
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (node.hidden) return false;
    const cs = window.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}

function renderPage({
  appMode = "studio",
  lang = "fr",
  notation = "eu",
  dictRoot = 0,
  dictType = "chord_major",
  currentBrickIndex = 0,
  setDictRoot = noop,
  setDictType = noop,
  setCurrentBrickIndex = noop,
  withStudioState = true,
} = {}) {
  window.history.replaceState({}, "", "/?prototype=a");
  const studioState = withStudioState ? { currentBrickIndex, setCurrentBrickIndex } : {};
  return render(
    <PrototypeA
      txt={translations[lang]}
      lang={lang}
      notation={notation}
      setNotation={noop}
      appMode={appMode}
      setAppMode={noop}
      isPlaying={false}
      togglePlayback={noop}
      playDictionaryAudio={noop}
      currentBpm={100}
      handleBpmChange={noop}
      metronomeOn={false}
      toggleMetronome={noop}
      showFingerNumbers={false}
      setShowFingerNumbers={noop}
      dictRoot={dictRoot}
      dictType={dictType}
      setDictRoot={setDictRoot}
      setDictType={setDictType}
      {...studioState}
      timeline={[]}
      currentStep={0}
      activeBrick={null}
      chordOctaveOffset={0}
      musicEngineContextValue={{ activeNotes: [], guitarFingering: null, bassFingering: null }}
      playbackContextValue={{}}
      drawerPanel={null}
    />
  ).container;
}

const row = (page) => page.querySelector('[data-s1="selection"]');
const fnIn = (scope, id) => scope.querySelector(`[data-fn="${id}"]`);
/** The hidden native <select> CustomSelect keeps for tests and accessibility. */
const nativeOf = (el) => el.querySelector("select");
const valuesOf = (select) => [...select.querySelectorAll("option")].map((o) => o.value);
const headerText = (el) => el.querySelector(".custom-select-header .current-value").textContent.trim();
const sorted = (list) => [...list].sort();

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("VMU-185 (a): Studio - the style menu, in the transport block", () => {
  it("is a row of the transport block, holding the style menu and nothing of the Dictionary", () => {
    const page = renderPage({ appMode: "studio" });
    const strip = row(page);
    expect(strip, "the selection row").not.toBeNull();
    const transport = page.querySelector('[data-s1="transport"]');
    expect(strip.parentElement).toBe(transport);
    expect(transport.tagName).toBe("SECTION");
    const style = fnIn(strip, "composer.style");
    expect(style, "composer.style in the row").not.toBeNull();
    expect(isVisible(style)).toBe(true);
    for (const id of ["dico.fondamentale", "dico.famille", "dico.type-accord", "dico.type-gamme"]) {
      expect(fnIn(page, id), `${id} must not exist in the Studio`).toBeNull();
    }
  });

  it("leaves the top row exactly where it was: tempo, metronome, volume and the buttons are not in the new row", () => {
    const page = renderPage({ appMode: "studio" });
    const strip = row(page);
    const transport = page.querySelector('[data-s1="transport"]');
    for (const id of ["jouer.lecture", "jouer.tempo", "jouer.metronome", "son.volume-general", "composer.math-ouvrir", "son.ouvrir"]) {
      const el = fnIn(transport, id);
      expect(el, id).not.toBeNull();
      expect(strip.contains(el), `${id} must stay out of the row`).toBe(false);
    }
  });

  it("names the row for assistive technology, and the menu by its short label", () => {
    const page = renderPage({ appMode: "studio" });
    const strip = row(page);
    expect(strip.getAttribute("role")).toBe("group");
    expect(strip.getAttribute("aria-label")).toBe(translations.fr.protoA.selectionAria);
    expect(strip.textContent).toContain(translations.fr.protoA.selectionStyle);
    // Not the drawer's "1. Sélection du Style".
    expect(strip.textContent).not.toContain(translations.fr.styleSelection);
  });

  it("shows the current style, by its name in the page's language", () => {
    const page = renderPage({ appMode: "studio", currentBrickIndex: 5, lang: "en" });
    expect(headerText(fnIn(row(page), "composer.style"))).toBe(BRICKS[5].name.en);
  });
});

describe("VMU-185 (b): Dictionary - family and root note, the type only for Chords / Scales", () => {
  it("shows the family and the root note for every family, never the Studio's style", () => {
    for (const dictType of ["single_note", "chord_major", "scale_major"]) {
      const page = renderPage({ appMode: "dictionary", dictType });
      const strip = row(page);
      expect(strip, dictType).not.toBeNull();
      expect(strip.parentElement.getAttribute("data-s1"), dictType).toBe("transport");
      expect(isVisible(fnIn(strip, "dico.famille")), `${dictType}: famille`).toBe(true);
      expect(isVisible(fnIn(strip, "dico.fondamentale")), `${dictType}: fondamentale`).toBe(true);
      expect(fnIn(page, "composer.style"), `${dictType}: no style in the Dictionary`).toBeNull();
      cleanup();
    }
  });

  it("shows the chord type for Chords only, the scale type for Scales only, and no type for a single note", () => {
    const expectation = {
      single_note: { chord: false, scale: false },
      chord_major: { chord: true, scale: false },
      chord_m7: { chord: true, scale: false },
      scale_major: { chord: false, scale: true },
      scale_minor: { chord: false, scale: true },
    };
    for (const [dictType, want] of Object.entries(expectation)) {
      const page = renderPage({ appMode: "dictionary", dictType });
      expect(Boolean(fnIn(row(page), "dico.type-accord")), `${dictType}: chord type`).toBe(want.chord);
      expect(Boolean(fnIn(row(page), "dico.type-gamme")), `${dictType}: scale type`).toBe(want.scale);
      cleanup();
    }
  });

  it("offers three families, the pressed one being the family of dictType", () => {
    const labels = [translations.fr.familyNote, translations.fr.familyChord, translations.fr.familyScale];
    const pressedOf = { single_note: 0, chord_dim: 1, scale_blues: 2 };
    for (const [dictType, pressedIndex] of Object.entries(pressedOf)) {
      const page = renderPage({ appMode: "dictionary", dictType });
      const buttons = [...fnIn(row(page), "dico.famille").querySelectorAll("button")];
      expect(buttons.map((b) => b.textContent.trim()), dictType).toEqual(labels);
      expect(buttons.map((b) => b.getAttribute("aria-pressed")), dictType).toEqual(
        labels.map((_, i) => String(i === pressedIndex))
      );
      cleanup();
    }
  });

  it("shows the root note in the notation the page has (Do Ré Mi or C D E)", () => {
    const eu = renderPage({ appMode: "dictionary", dictRoot: 2, notation: "eu" });
    expect(headerText(fnIn(row(eu), "dico.fondamentale"))).toBe("Ré");
    cleanup();
    const us = renderPage({ appMode: "dictionary", dictRoot: 2, notation: "us" });
    expect(headerText(fnIn(row(us), "dico.fondamentale"))).toBe("D");
  });

  it("renders in the Dictionary without the Studio's state (the other A′ tests hand none)", () => {
    const page = renderPage({ appMode: "dictionary", withStudioState: false });
    expect(isVisible(fnIn(row(page), "dico.fondamentale"))).toBe(true);
    cleanup();
    const studio = renderPage({ appMode: "studio", withStudioState: false });
    expect(fnIn(row(studio), "composer.style")).not.toBeNull();
  });
});

describe("VMU-185 (c): choosing a root note", () => {
  it("calls setDictRoot with that note's value (Ré = 2), through the native select", () => {
    const setDictRoot = vi.fn();
    const page = renderPage({ appMode: "dictionary", setDictRoot });
    const re = NOTES.find((n) => n.eu === "Ré");
    expect(re.value).toBe(2);
    fireEvent.change(nativeOf(fnIn(row(page), "dico.fondamentale")), { target: { value: String(re.value) } });
    expect(setDictRoot).toHaveBeenCalledTimes(1);
    expect(setDictRoot).toHaveBeenLastCalledWith(2);
  });

  it("calls setDictRoot when the user clicks the note in the open list", () => {
    const setDictRoot = vi.fn();
    const setDictType = vi.fn();
    const page = renderPage({ appMode: "dictionary", setDictRoot, setDictType });
    fireEvent.click(fnIn(row(page), "dico.fondamentale").querySelector(".custom-select-header"));
    const item = [...document.body.querySelectorAll(".custom-select-body .select-item")].find((el) => el.textContent.trim() === "Sol");
    expect(item, "'Sol' in the open list").toBeTruthy();
    fireEvent.click(item);
    expect(setDictRoot).toHaveBeenLastCalledWith(7);
    expect(setDictType, "a root note changes the root only").not.toHaveBeenCalled();
  });
});

describe("VMU-185 (d): choosing a family", () => {
  const press = (page, label) => {
    const button = [...fnIn(row(page), "dico.famille").querySelectorAll("button")].find((b) => b.textContent.trim() === label);
    expect(button, label).toBeTruthy();
    fireEvent.click(button);
  };

  it("Chords -> setDictType('chord_major'), Scales -> 'scale_major', Single note -> 'single_note'", () => {
    const setDictType = vi.fn();
    const setDictRoot = vi.fn();
    const page = renderPage({ appMode: "dictionary", dictType: "scale_blues", setDictType, setDictRoot });
    press(page, translations.fr.familyChord);
    expect(setDictType).toHaveBeenLastCalledWith("chord_major");
    press(page, translations.fr.familyScale);
    expect(setDictType).toHaveBeenLastCalledWith("scale_major");
    press(page, translations.fr.familyNote);
    expect(setDictType).toHaveBeenLastCalledWith("single_note");
    expect(setDictType).toHaveBeenCalledTimes(3);
    expect(setDictRoot, "a family changes the type only").not.toHaveBeenCalled();
  });
});

describe("VMU-185 (e): choosing a style", () => {
  it("calls setCurrentBrickIndex with the style's index as a Number", () => {
    const setCurrentBrickIndex = vi.fn();
    const page = renderPage({ appMode: "studio", setCurrentBrickIndex });
    fireEvent.change(nativeOf(fnIn(row(page), "composer.style")), { target: { value: "9" } });
    expect(setCurrentBrickIndex).toHaveBeenCalledTimes(1);
    expect(setCurrentBrickIndex).toHaveBeenLastCalledWith(9);
    expect(typeof setCurrentBrickIndex.mock.calls[0][0]).toBe("number");
  });

  it("calls setCurrentBrickIndex when the user clicks a style in the open list", () => {
    const setCurrentBrickIndex = vi.fn();
    const page = renderPage({ appMode: "studio", lang: "en", setCurrentBrickIndex });
    fireEvent.click(fnIn(row(page), "composer.style").querySelector(".custom-select-header"));
    const index = 12;
    const item = [...document.body.querySelectorAll(".custom-select-body .select-item")].find((el) => el.textContent.trim() === BRICKS[index].name.en);
    expect(item, BRICKS[index].name.en).toBeTruthy();
    fireEvent.click(item);
    expect(setCurrentBrickIndex).toHaveBeenLastCalledWith(index);
  });
});

describe("VMU-185 (f): one owner of the lists - the row offers what the drawer offers", () => {
  const drawerStudio = () =>
    render(
      <AppProvider>
        <StudioPanel
          currentBrickIndex={0}
          setCurrentBrickIndex={vi.fn()}
          activeBrick={BRICKS[0]}
          currentTheme="A"
          setCurrentTheme={vi.fn()}
          chordOctaveOffset={0}
          setChordOctaveOffset={vi.fn()}
          setCurrentAbsoluteNotes={vi.fn()}
          activeProgression={BRICKS[0].nnsProgression}
          clickedChord={null}
          setClickedChord={vi.fn()}
          handleChordClick={vi.fn()}
          inversionText=""
          suggestedBassTrack={null}
          setSuggestedBassTrack={vi.fn()}
          setCustomProgression={vi.fn()}
          customRhythm={null}
          setCustomRhythm={vi.fn()}
          targetNotesPreset="majorMinor"
          setTargetNotesPreset={vi.fn()}
        />
      </AppProvider>
    ).container;
  const drawerDictionary = (dictType) =>
    render(
      <AppProvider>
        <DictionaryPanel
          dictRoot={0}
          setDictRoot={vi.fn()}
          dictType={dictType}
          setDictType={vi.fn()}
          playDictionaryAudio={vi.fn()}
          isPlaying={false}
          guitarFingering={null}
          bassFingering={null}
          harmonicMode={false}
          setHarmonicMode={vi.fn()}
          dictOctave={0}
          setDictOctave={vi.fn()}
          targetNotesPreset="majorMinor"
          setTargetNotesPreset={vi.fn()}
        />
      </AppProvider>
    ).container;
  /** The drawer's select that holds `marker` among its options. */
  const selectWith = (scope, marker) => [...scope.querySelectorAll("select")].find((s) => valuesOf(s).includes(marker));

  it("styles: as many as the data holds (BRICKS), and exactly the drawer's", () => {
    const band = renderPage({ appMode: "studio" });
    const bandValues = valuesOf(nativeOf(fnIn(row(band), "composer.style")));
    expect(bandValues).toHaveLength(BRICKS.length);
    expect(new Set(bandValues).size).toBe(BRICKS.length);
    cleanup();
    const drawer = drawerStudio();
    const drawerValues = valuesOf(selectWith(drawer, "0"));
    expect(drawerValues).toHaveLength(BRICKS.length);
    expect(sorted(bandValues)).toEqual(sorted(drawerValues));
  });

  it("styles: the row names each one the way the drawer does, in the page's language", () => {
    const band = renderPage({ appMode: "studio", lang: "pt" });
    for (const [i, brick] of BRICKS.entries()) {
      const option = nativeOf(fnIn(row(band), "composer.style")).querySelector(`option[value="${i}"]`);
      expect(option.textContent, `style ${i}`).toBe(brick.name.pt);
    }
  });

  it("root notes: the twelve of NOTES, the drawer's own", () => {
    const band = renderPage({ appMode: "dictionary" });
    const bandValues = valuesOf(nativeOf(fnIn(row(band), "dico.fondamentale")));
    expect(bandValues).toHaveLength(12);
    expect(bandValues).toEqual(NOTES.map((n) => String(n.value)));
    cleanup();
    const drawer = drawerDictionary("chord_major");
    expect(valuesOf(drawer.querySelector('[data-testid="select-root-note"]'))).toEqual(bandValues);
  });

  it("chord types: every chord of CHORDS, the drawer's own", () => {
    const band = renderPage({ appMode: "dictionary", dictType: "chord_major" });
    const bandValues = valuesOf(nativeOf(fnIn(row(band), "dico.type-accord")));
    expect(bandValues).toHaveLength(Object.keys(CHORDS).length);
    cleanup();
    const drawer = drawerDictionary("chord_major");
    expect(sorted(valuesOf(selectWith(drawer, "chord_major")))).toEqual(sorted(bandValues));
  });

  it("scale types: every scale of SCALES, the drawer's own", () => {
    const band = renderPage({ appMode: "dictionary", dictType: "scale_major" });
    const bandValues = valuesOf(nativeOf(fnIn(row(band), "dico.type-gamme")));
    expect(bandValues).toHaveLength(Object.keys(SCALES).length);
    cleanup();
    const drawer = drawerDictionary("scale_major");
    expect(sorted(valuesOf(selectWith(drawer, "scale_major")))).toEqual(sorted(bandValues));
  });

  it("the chord type and the scale type are not each other's lists", () => {
    const chords = renderPage({ appMode: "dictionary", dictType: "chord_major" });
    const chordValues = valuesOf(nativeOf(fnIn(row(chords), "dico.type-accord")));
    expect(chordValues.every((v) => v.startsWith("chord_"))).toBe(true);
    cleanup();
    const scales = renderPage({ appMode: "dictionary", dictType: "scale_major" });
    const scaleValues = valuesOf(nativeOf(fnIn(row(scales), "dico.type-gamme")));
    expect(scaleValues.every((v) => v.startsWith("scale_"))).toBe(true);
  });

  it("choosing a type sets dictType (and only it)", () => {
    const setDictType = vi.fn();
    const setDictRoot = vi.fn();
    const chords = renderPage({ appMode: "dictionary", dictType: "chord_major", setDictType, setDictRoot });
    fireEvent.change(nativeOf(fnIn(row(chords), "dico.type-accord")), { target: { value: "chord_minor" } });
    expect(setDictType).toHaveBeenLastCalledWith("chord_minor");
    cleanup();
    const scales = renderPage({ appMode: "dictionary", dictType: "scale_major", setDictType, setDictRoot });
    fireEvent.change(nativeOf(fnIn(row(scales), "dico.type-gamme")), { target: { value: "scale_minor" } });
    expect(setDictType).toHaveBeenLastCalledWith("scale_minor");
    expect(setDictType).toHaveBeenCalledTimes(2);
    expect(setDictRoot).not.toHaveBeenCalled();
  });
});

describe("VMU-185 (g): the four languages hold the row's words", () => {
  const KEYS = ["selectionAria", "selectionStyle", "selectionFamily", "selectionRoot", "selectionType"];

  it("has the five labels in FR, EN, PT and ZH, none empty, the tables' keys still equal", () => {
    const frKeys = Object.keys(translations.fr.protoA).sort();
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const table = translations[lang].protoA;
      for (const key of KEYS) {
        expect(typeof table[key], `${lang}.protoA.${key}`).toBe("string");
        expect(table[key].trim().length, `${lang}.protoA.${key}`).toBeGreaterThan(0);
      }
      expect(Object.keys(table).sort(), lang).toEqual(frKeys);
    }
  });

  it("writes them on the row, in the page's language", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const studio = renderPage({ appMode: "studio", lang });
      expect(row(studio).getAttribute("aria-label"), `${lang} aria`).toBe(translations[lang].protoA.selectionAria);
      expect(row(studio).textContent, `${lang} style`).toContain(translations[lang].protoA.selectionStyle);
      cleanup();
      const dict = renderPage({ appMode: "dictionary", lang, dictType: "chord_major" });
      for (const key of ["selectionFamily", "selectionRoot", "selectionType"]) {
        expect(row(dict).textContent, `${lang} ${key}`).toContain(translations[lang].protoA[key]);
      }
      cleanup();
    }
  });
});

describe("VMU-185 (h): data-fn - unique, and registered in the A′-ACCÈS list", () => {
  const ALL = ["composer.style", "dico.fondamentale", "dico.famille", "dico.type-accord", "dico.type-gamme"];
  const states = [
    { state: { appMode: "studio" }, present: ["composer.style"] },
    { state: { appMode: "dictionary", dictType: "single_note" }, present: ["dico.famille", "dico.fondamentale"] },
    { state: { appMode: "dictionary", dictType: "chord_major" }, present: ["dico.famille", "dico.fondamentale", "dico.type-accord"] },
    { state: { appMode: "dictionary", dictType: "scale_major" }, present: ["dico.famille", "dico.fondamentale", "dico.type-gamme"] },
  ];

  it("carries each of the five names once where it exists and nowhere else, and no data-fn twice, in any state", () => {
    for (const { state, present } of states) {
      const page = renderPage(state);
      const seen = new Map();
      for (const el of page.querySelectorAll("[data-fn]")) {
        const id = el.getAttribute("data-fn");
        seen.set(id, (seen.get(id) || 0) + 1);
      }
      const twice = [...seen].filter(([, n]) => n !== 1).map(([id, n]) => `${id} x${n}`);
      expect(twice, JSON.stringify(state)).toEqual([]);
      for (const id of ALL) {
        expect(seen.get(id) || 0, `${JSON.stringify(state)}: ${id}`).toBe(present.includes(id) ? 1 : 0);
      }
      cleanup();
    }
  });

  it("registers the five names with where 'centre' and the state each one needs", () => {
    const byFn = new Map(A_PRIME_ACCESS.map((f) => [f.fn, f]));
    const wanted = {
      "composer.style": "studio",
      "dico.fondamentale": "dictionary",
      "dico.famille": "dictionary",
      "dico.type-accord": "dictionary:chord",
      "dico.type-gamme": "dictionary:scale",
    };
    for (const [id, needs] of Object.entries(wanted)) {
      expect(byFn.get(id), id).toBeTruthy();
      expect(byFn.get(id).where, id).toBe("centre");
      expect(byFn.get(id).needs, id).toBe(needs);
    }
  });
});
