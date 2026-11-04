import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import Modal from "../Common/Modal";
import { translations } from "../../i18n/translations";

// VMU-195-B. "Math & Rythmes" became a phrase ("5 coups sur 16 cases, départ
// décalé de 0, joués par …"), the circle a wheel, the presets "Essayer :" pills,
// the composer tools four recipes, and every "?" became a tooltip on its label.
// None of the beginner-readability goals of VMU-195-A disappear.

const fr = translations.fr.comp;
const en = translations.en.comp;

const setup = (extra = {}) => {
  const setters = {
    setSuggestedBassTrack: vi.fn(),
    setCustomRhythm: vi.fn(),
    setCustomDrums: vi.fn(),
  };
  const props = {
    activeTracks: { drums: [], melody: [], progression: ["I"], rhythm: [0] },
    currentStep: -1,
    ...setters,
    ...extra,
  };
  const utils = render(<CompositionPanel {...props} />);
  return { ...utils, ...setters };
};

const advancedToggle = () => screen.getByTestId("comp-advanced-toggle");
const expand = () => fireEvent.click(advancedToggle());

const lastKick = (setCustomDrums) => {
  const calls = setCustomDrums.mock.calls;
  return calls[calls.length - 1][0]({}).Kick;
};

describe("one title (VMU-195-B)", () => {
  it("inside the window (hideTitle) the panel draws no title of its own", () => {
    const { container } = setup({ hideTitle: true });
    expect(container.querySelector(".panel__header")).toBeNull();
    expect(container.querySelector("h3")).toBeNull();
    expect(container.querySelector(".panel-led-indicator")).toBeNull();
    expect(container.querySelector(".eurorack-screw")).toBeNull();
  });

  it("outside a window the panel keeps exactly one title", () => {
    const { container } = setup();
    expect(screen.getAllByTestId("comp-title")).toHaveLength(1);
    expect(screen.getByTestId("comp-title").textContent).toBe(en.title);
    expect(container.querySelectorAll("h3")).toHaveLength(1);
  });

  it("Modal accepts a `wide` flag that adds a class to this window only", () => {
    const wideRender = render(
      <Modal isOpen onClose={() => {}} title="t" columns wide>
        <p>x</p>
      </Modal>
    );
    expect(document.querySelector(".modal-container.modal-container--wide")).not.toBeNull();
    wideRender.unmount();
    render(
      <Modal isOpen onClose={() => {}} title="t" columns>
        <p>x</p>
      </Modal>
    );
    expect(document.querySelector(".modal-container--wide")).toBeNull();
  });
});

describe("the phrase and its plain words (VMU-195-B)", () => {
  it("shows the French phrase, the pills, the recipes after unfolding", () => {
    setup({ txt: fr, togglePlayback: vi.fn(), isPlaying: false });

    for (const key of ["phraseHits", "phraseSteps", "phraseStart", "phrasePlayedBy", "tryLabel", "hideComp", "resetAll", "liveOn", "advanced", "kick"]) {
      expect(screen.getAllByText(fr[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
    expect(screen.getByText(fr.customGeo)).toBeTruthy();
    // The three numbers of the phrase.
    for (const id of ["k", "n", "r"]) expect(screen.getByTestId(`comp-${id}-value`)).toBeTruthy();
    expect(screen.queryByText(fr.recipePhase)).toBeNull();

    expand();
    for (const key of ["recipePhase", "recipeIso", "recipeMesh", "recipePoly"]) {
      expect(screen.getAllByText(fr[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
  });

  it("shows the English phrase and recipes", () => {
    setup({ txt: en, togglePlayback: vi.fn(), isPlaying: false });

    for (const key of ["phraseHits", "phraseSteps", "phraseStart", "phrasePlayedBy", "tryLabel", "hideComp", "resetAll", "liveOn", "advanced"]) {
      expect(screen.getAllByText(en[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
    expect(en.phraseHits).toBe("hits over");
    expect(en.phraseSteps).toBe("steps");
    expect(en.phrasePlayedBy).toBe("played by");
    expect(en.resetAll).toBe("↺ Style rhythm");

    expand();
    expect(screen.getByTestId("comp-mode-phasing")).toBeTruthy();
    expect(screen.getByText(en.recipePhase)).toBeTruthy();
    expect(screen.getByText(en.recipePoly)).toBeTruthy();
  });

  it("the success label comes from the table after a send", () => {
    setup({ txt: fr });
    fireEvent.click(screen.getByTestId("comp-send"));
    expect(screen.getByTestId("comp-send").textContent).toBe(fr.exportSuccess);
  });

  it("the world rhythms carry their origin and notation in the pill's tooltip", () => {
    setup({ txt: fr });
    const tresillo = screen.getByTestId("comp-preset-tresillo");
    expect(tresillo.textContent).toContain("Tresillo");
    expect(tresillo.getAttribute("title")).toContain("Cub");
    expect(tresillo.getAttribute("title")).toContain("E(3,8)");
    const samba = screen.getByTestId("comp-preset-samba");
    expect(samba.getAttribute("title")).toContain("Brésil");
    expect(samba.getAttribute("title")).toContain("E(7,16)");
  });

  it.each(["fr", "en", "pt", "zh"])("the %s table has every key, none empty", (lang) => {
    const flat = (o, p = "") =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
    const reference = flat(translations.fr.comp).map(([k]) => k);
    const table = Object.fromEntries(flat(translations[lang].comp));
    for (const key of reference) {
      expect(typeof table[key], `${lang}.${key}`).toBe("string");
      expect(table[key].trim().length, `${lang}.${key}`).toBeGreaterThan(0);
    }
    for (const key of ["advanced", "live", "listen", "stopListen", "help", "circle", "helpPresets", "helpSubdivisions", "helpPulses", "helpRotation", "helpCircle", "helpAdvanced", "helpExport"]) {
      expect(reference, key).toContain(key);
    }
  });

  it.each(["pt", "zh"])("the %s words are no longer the English ones", (lang) => {
    expect(translations[lang].comp.subdivisions).not.toBe(en.subdivisions);
    expect(translations[lang].comp.exportBtn).not.toBe(en.exportBtn);
    expect(translations[lang].comp.helpPulses).not.toBe(en.helpPulses);
  });
});

describe("the title tooltip stays beside the drawn ? (VMU-195-B)", () => {
  it("each label still carries its help sentence as a title", () => {
    setup({ txt: en });
    expect(screen.getByText(en.circle).getAttribute("title")).toBe(en.helpCircle);
    expect(screen.getByText(en.tryLabel).getAttribute("title")).toBe(en.helpPresets);
    expect(screen.getByTestId("comp-k-value").parentElement.getAttribute("title")).toBe(en.helpPulses);
    expect(screen.getByTestId("comp-n-value").parentElement.getAttribute("title")).toBe(en.helpSubdivisions);
    expect(screen.getByTestId("comp-r-value").parentElement.getAttribute("title")).toBe(en.helpRotation);
    expect(advancedToggle().parentElement.getAttribute("title")).toBe(en.helpAdvanced);
    expect(screen.getByTestId("comp-send").getAttribute("title")).toBe(en.helpExport);
  });
});

describe("short help on click (VMU-195-A)", () => {
  const HELPS = ["presets", "subdivisions", "pulses", "rotation", "circle", "advanced", "export"];
  const helpKey = { presets: "helpPresets", subdivisions: "helpSubdivisions", pulses: "helpPulses", rotation: "helpRotation", circle: "helpCircle", advanced: "helpAdvanced", export: "helpExport" };

  it.each(HELPS)("the ? next to '%s' unfolds its sentence and a second click folds it", (id) => {
    setup({ txt: en });
    const button = screen.getByTestId(`comp-help-${id}`);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBeTruthy();
    expect(screen.queryByTestId(`comp-help-text-${id}`)).toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId(`comp-help-text-${id}`).textContent).toBe(en[helpKey[id]]);

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId(`comp-help-text-${id}`)).toBeNull();
  });

  it("the French sentences are the ones written for a beginner", () => {
    setup({ txt: fr });
    fireEvent.click(screen.getByTestId("comp-help-subdivisions"));
    expect(screen.getByTestId("comp-help-text-subdivisions").textContent).toBe("La longueur du motif. 16 cases = une mesure en doubles croches.");
    fireEvent.click(screen.getByTestId("comp-help-presets"));
    expect(screen.getByTestId("comp-help-text-presets").textContent).toContain("répartir des coups le plus régulièrement possible");
  });

  it("Escape folds every open help", () => {
    setup({ txt: en });
    fireEvent.click(screen.getByTestId("comp-help-pulses"));
    fireEvent.click(screen.getByTestId("comp-help-export"));
    expect(screen.queryAllByRole("note")).toHaveLength(2);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryAllByRole("note")).toHaveLength(0);
    expect(screen.getByTestId("comp-help-pulses").getAttribute("aria-expanded")).toBe("false");
  });

  it("Escape folds the help first and only then closes the window", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="t" columns wide>
        <CompositionPanel
          activeTracks={{}}
          setSuggestedBassTrack={vi.fn()}
          setCustomRhythm={vi.fn()}
          setCustomDrums={vi.fn()}
          hideTitle
          txt={en}
        />
      </Modal>
    );
    fireEvent.click(screen.getByTestId("comp-help-rotation"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId("comp-help-text-rotation")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("every ? button is a real button, named, with a sentence that is not shown by hover", () => {
    setup({ txt: en });
    for (const id of HELPS) {
      const button = screen.getByTestId(`comp-help-${id}`);
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("type")).toBe("button");
      expect(button.hasAttribute("title")).toBe(false);
    }
  });
});

describe("the recipes are folded away (VMU-195-B)", () => {
  it("'Go further' is closed by default and holds the four recipes", () => {
    setup({ txt: en });
    expect(advancedToggle().getAttribute("aria-expanded")).toBe("false");
    for (const mode of ["phasing", "iso", "mesh", "poly"]) {
      expect(screen.queryByTestId(`comp-mode-${mode}`)).toBeNull();
    }

    expand();
    expect(advancedToggle().getAttribute("aria-expanded")).toBe("true");
    const body = screen.getByTestId("comp-advanced");
    for (const mode of ["phasing", "iso", "mesh", "poly"]) {
      expect(within(body).getByTestId(`comp-mode-${mode}`).getAttribute("aria-pressed")).toBe("false");
    }

    expand();
    expect(screen.queryByTestId("comp-advanced")).toBeNull();
  });

  it("while folded, the phrase, the circle, the strip and the send stay visible", () => {
    const { container } = setup({ txt: en });
    for (const id of ["k", "n", "r"]) expect(screen.getByTestId(`comp-${id}-value`)).toBeTruthy();
    expect(container.querySelector(".euclidean-svg")).not.toBeNull();
    expect(container.querySelector(".euclidean-strip")).not.toBeNull();
    expect(screen.getByTestId("comp-send")).toBeTruthy();
    expect(screen.getByTestId("comp-target")).toBeTruthy();
  });

  it("a recipe switched on survives folding and unfolding, and is still what is sent", () => {
    const { setCustomDrums } = setup({ txt: en });
    expand();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    expect(screen.getByTestId("comp-iso-section")).toBeTruthy();
    const sentWhileOpen = lastKick(setCustomDrums);

    expand(); // fold
    expect(screen.queryByTestId("comp-mode-iso")).toBeNull();
    expect(screen.getByTestId("comp-advanced-active")).toBeTruthy();
    fireEvent.click(screen.getByTestId("comp-k-plus"));
    expect(lastKick(setCustomDrums)).not.toEqual(sentWhileOpen);

    expand(); // unfold
    expect(screen.getByTestId("comp-mode-iso").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("comp-iso-section")).toBeTruthy();
  });

  it("the recipes still exclude each other once unfolded", () => {
    setup({ txt: en });
    expand();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    fireEvent.click(screen.getByTestId("comp-mode-mesh"));
    expect(screen.getByTestId("comp-mode-iso").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("comp-mode-mesh").getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("comp-iso-section")).toBeNull();
    expect(screen.getByTestId("comp-realign-section")).toBeTruthy();
  });
});

describe("listen without closing the window (VMU-195-B)", () => {
  it("'Listen' calls the main playback and becomes 'Stop' while it plays", () => {
    const togglePlayback = vi.fn();
    const { rerender } = render(
      <CompositionPanel activeTracks={{}} setSuggestedBassTrack={vi.fn()} setCustomRhythm={vi.fn()} setCustomDrums={vi.fn()} txt={en} isPlaying={false} togglePlayback={togglePlayback} />
    );
    const button = screen.getByTestId("comp-listen");
    expect(button.textContent).toBe(en.listen);
    fireEvent.click(button);
    expect(togglePlayback).toHaveBeenCalledTimes(1);

    rerender(
      <CompositionPanel activeTracks={{}} setSuggestedBassTrack={vi.fn()} setCustomRhythm={vi.fn()} setCustomDrums={vi.fn()} txt={en} isPlaying togglePlayback={togglePlayback} />
    );
    expect(screen.getByTestId("comp-listen").textContent).toBe(en.stopListen);
    fireEvent.click(screen.getByTestId("comp-listen"));
    expect(togglePlayback).toHaveBeenCalledTimes(2);
  });

  it("pressing 'Listen' sends nothing to the track by itself", () => {
    const { setCustomDrums, setCustomRhythm, setSuggestedBassTrack } = setup({ txt: en, togglePlayback: vi.fn(), isPlaying: false });
    fireEvent.click(screen.getByTestId("comp-listen"));
    expect(setCustomDrums).not.toHaveBeenCalled();
    expect(setCustomRhythm).not.toHaveBeenCalled();
    expect(setSuggestedBassTrack).not.toHaveBeenCalled();
  });

  it("without a playback prop the panel offers no Listen button", () => {
    setup({ txt: en });
    expect(screen.queryByTestId("comp-listen")).toBeNull();
  });

  it("the live sentence sits in the footer as '● en direct sur …'", () => {
    setup({ txt: en });
    const exportSection = screen.getByTestId("comp-export");
    expect(within(exportSection).getByText(en.liveOn, { exact: false })).toBeTruthy();
    expect(within(exportSection).getByTestId("comp-live-note").textContent).toContain(en.liveOn);
  });
});

describe("the live send is intact (VMU-195-B)", () => {
  it("a change made with the − / + while the tools are folded still reaches the track", () => {
    const { setCustomDrums } = setup({ txt: en });
    expect(setCustomDrums).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("comp-k-plus"));
    expect(lastKick(setCustomDrums).activeSteps).toHaveLength(6);
  });

  it("changing the instrument sends to that instrument", () => {
    const { setSuggestedBassTrack } = setup({ txt: en });
    fireEvent.click(screen.getByTestId("comp-k-minus"));
    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Bass" } });
    const last = setSuggestedBassTrack.mock.calls[setSuggestedBassTrack.mock.calls.length - 1][0];
    expect(last.name).toBe("Bass");
    expect(last.activeSteps).toHaveLength(4);
  });
});
