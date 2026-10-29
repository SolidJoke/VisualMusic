import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import Modal from "../Common/Modal";
import { translations } from "../../i18n/translations";

// VMU-195-A. "Math & Rythmes" had to become readable for a beginner without
// losing a single function: one title, plain words, short help on click,
// the composer tools folded away, and a way to listen without closing it.

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

// The rhythm the last drum export would write, read through the functional
// updater the panel passes to setCustomDrums.
const lastKick = (setCustomDrums) => {
  const calls = setCustomDrums.mock.calls;
  return calls[calls.length - 1][0]({}).Kick;
};

describe("one title (VMU-195-A)", () => {
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

describe("plain words (VMU-195-A)", () => {
  it("shows the French words of the table, the advanced ones after unfolding", () => {
    setup({ txt: fr, togglePlayback: vi.fn(), isPlaying: false });
    for (const key of ["presets", "geoParams", "subdivisions", "pulses", "rotation", "showComp", "grid", "exportPanel", "target", "exportBtn", "resetAll", "live", "listen", "advanced"]) {
      expect(screen.getAllByText(fr[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
    expect(screen.getByText(fr.customGeo)).toBeTruthy();
    expect(screen.getByText(fr.subdivisions, { exact: false }).textContent).toContain("n");
    expect(screen.queryByText(fr.phasingMode)).toBeNull();
    expect(fr.exportSuccess).toBe("Envoyé !");
    expect(fr.stopListen).toBe("■ Arrêter");
    expect(fr.listen).toBe("▶ Écouter");
    expect(fr.live).toBe("La piste suit tes réglages en direct.");
    expect(fr.advanced).toBe("Pour aller plus loin");

    expand();
    for (const key of ["phasingMode", "isoMode", "meshMode", "polyAlg", "symmetry"]) {
      expect(screen.getAllByText(fr[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
    expect(screen.getByText(fr.asym)).toBeTruthy();
  });

  it("shows the English words of the table", () => {
    setup({ txt: en, togglePlayback: vi.fn(), isPlaying: false });
    for (const key of ["presets", "geoParams", "subdivisions", "pulses", "rotation", "showComp", "grid", "exportPanel", "target", "exportBtn", "resetAll", "live", "listen", "advanced"]) {
      expect(screen.getAllByText(en[key], { exact: false }).length, key).toBeGreaterThan(0);
    }
    expect(en.presets).toBe("World rhythms");
    expect(en.subdivisions).toBe("Number of steps");
    expect(en.pulses).toBe("Number of hits");
    expect(en.exportSuccess).toBe("Sent!");
    expect(en.live).toBe("The track follows your settings live.");
    expand();
    expect(screen.getByTestId("comp-mode-phasing")).toBeTruthy();
    expect(screen.getByText(en.phasingMode)).toBeTruthy();
    expect(screen.getByText(en.polyAlg)).toBeTruthy();
  });

  it("the success label comes from the table after a send", () => {
    setup({ txt: fr });
    fireEvent.click(screen.getByTestId("comp-send"));
    expect(screen.getByTestId("comp-send").textContent).toBe(fr.exportSuccess);
  });

  it("the world rhythms carry their origin from the engine's data", () => {
    setup({ txt: fr });
    const options = Array.from(screen.getByTestId("comp-preset").querySelectorAll("option")).map((o) => o.textContent);
    expect(options.some((t) => t.includes("Tresillo") && t.includes("Cub"))).toBe(true);
    expect(options.some((t) => t.includes("Samba") && t.includes("Brésil"))).toBe(true);
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

describe("the composer tools are folded away (VMU-195-A)", () => {
  it("'Go further' is closed by default and holds the four modes and the symmetry badge", () => {
    const { container } = setup({ txt: en });
    expect(advancedToggle().getAttribute("aria-expanded")).toBe("false");
    for (const mode of ["phasing", "iso", "mesh", "poly"]) {
      expect(screen.queryByTestId(`comp-mode-${mode}`)).toBeNull();
    }
    expect(container.querySelector(".metadata-badge")).toBeNull();

    expand();
    expect(advancedToggle().getAttribute("aria-expanded")).toBe("true");
    const body = screen.getByTestId("comp-advanced");
    for (const mode of ["phasing", "iso", "mesh", "poly"]) {
      expect(within(body).getByTestId(`comp-mode-${mode}`).checked).toBe(false);
    }
    expect(body.querySelector(".metadata-badge")).not.toBeNull();

    expand();
    expect(screen.queryByTestId("comp-advanced")).toBeNull();
  });

  it("while folded, the preset, the three settings, the circle, the steps and 'Send to' stay visible", () => {
    const { container } = setup({ txt: en });
    expect(screen.getByTestId("comp-preset")).toBeTruthy();
    for (const id of ["n", "k", "r"]) expect(screen.getByTestId(`comp-slider-${id}`)).toBeTruthy();
    expect(container.querySelector(".euclidean-svg")).not.toBeNull();
    expect(container.querySelector(".binary-grid")).not.toBeNull();
    expect(screen.getByTestId("comp-send")).toBeTruthy();
    expect(screen.getByTestId("comp-target")).toBeTruthy();
  });

  it("a mode switched on survives folding and unfolding, and is still what is sent", () => {
    const { setCustomDrums } = setup({ txt: en });
    expand();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    expect(screen.getByTestId("comp-iso-section")).toBeTruthy();
    const sentWhileOpen = lastKick(setCustomDrums);

    expand(); // fold
    expect(screen.queryByTestId("comp-mode-iso")).toBeNull();
    expect(screen.getByTestId("comp-advanced-active")).toBeTruthy();
    fireEvent.change(screen.getByTestId("comp-slider-k"), { target: { value: "7" } });
    expect(lastKick(setCustomDrums)).not.toEqual(sentWhileOpen);

    expand(); // unfold
    expect(screen.getByTestId("comp-mode-iso").checked).toBe(true);
    expect(screen.getByTestId("comp-iso-section")).toBeTruthy();
  });

  it("the modes still exclude each other once unfolded", () => {
    setup({ txt: en });
    expand();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    fireEvent.click(screen.getByTestId("comp-mode-mesh"));
    expect(screen.getByTestId("comp-mode-iso").checked).toBe(false);
    expect(screen.getByTestId("comp-mode-mesh").checked).toBe(true);
    expect(screen.queryByTestId("comp-iso-section")).toBeNull();
    expect(screen.getByTestId("comp-realign-section")).toBeTruthy();
  });
});

describe("listen without closing the window (VMU-195-A)", () => {
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

  it("the live sentence sits under 'Send to'", () => {
    setup({ txt: en });
    const exportSection = screen.getByTestId("comp-export");
    expect(within(exportSection).getByText(en.live)).toBeTruthy();
  });
});

describe("the live send is intact (VMU-195-A)", () => {
  it("a setting changed while the tools are folded still reaches the track", () => {
    const { setCustomDrums } = setup({ txt: en });
    expect(setCustomDrums).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("comp-slider-k"), { target: { value: "6" } });
    expect(lastKick(setCustomDrums)).toHaveLength(6);
  });

  it("changing the instrument sends to that instrument", () => {
    const { setSuggestedBassTrack } = setup({ txt: en });
    fireEvent.change(screen.getByTestId("comp-slider-k"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Bass" } });
    const last = setSuggestedBassTrack.mock.calls[setSuggestedBassTrack.mock.calls.length - 1][0];
    expect(last.name).toBe("Bass");
    expect(last.activeSteps).toHaveLength(4);
  });
});
