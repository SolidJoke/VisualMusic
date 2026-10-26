// L1b-1c — A′'s position panel, in isolation: InstrumentHead's label turned into
// a button that opens a small panel (Escape / a click outside close it, the
// focus returns to the button), and PositionPanel's content with spies on every
// setter, so the string indices are asserted directly: guitar Mi = idx 5,
// bass Mi = idx 3 (fingeringLogic.js indexes the strings from the high one).
//
// The whole page is exercised in PrototypePositionPanel.test.jsx; the layout
// (head still 100px, the panel over the neck, targets >= 48px) is measured in
// Chromium by scripts/s1_probe.mjs S1-26: jsdom does no layout.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import InstrumentHead from "../InstrumentHead";
import PositionPanel from "../PositionPanel";
import { positionPanelView } from "../../components/Instruments/positionPanel";
import { translations } from "../../i18n/translations";

afterEach(cleanup);

const T = translations.fr.protoA;
const fr = translations.fr;

const viewOf = (over = {}) =>
  positionPanelView({ instrumentType: "guitar", rootVal: 0, notation: "eu", isScaleMode: false, scaleAnchor: null, placementIndex: null, fingering: null, range: "Do3 – Mi4", ...over });

function mountPanel(over = {}, props = {}) {
  const spies = { setSelectedRootString: vi.fn(), setPlacementIndex: vi.fn(), setScaleAnchor: vi.fn() };
  const view = viewOf(over);
  const utils = render(
    <PositionPanel
      id={over.instrumentType || "guitar"}
      view={view}
      T={T}
      txt={fr}
      selectedRootString={null}
      placementIndex={over.placementIndex ?? null}
      {...spies}
      {...props}
    />
  );
  return { ...utils, spies };
}

const byFn = (id) => document.querySelector(`[data-fn="${id}"]`);

describe("L1b-1c — PositionPanel: every button calls the right setter with the right value", () => {
  it("guitar: Mi / La / Ré call setSelectedRootString(5 / 4 / 3) and clear the position", () => {
    const { spies } = mountPanel();
    for (const [idx, expected] of [[5, 5], [4, 4], [3, 3]]) {
      fireEvent.click(byFn(`jouer.position-fondamentale-corde-guitar-${idx}`));
      expect(spies.setSelectedRootString).toHaveBeenLastCalledWith(expected);
      expect(spies.setPlacementIndex).toHaveBeenLastCalledWith(null);
    }
  });

  it("bass: its Mi is idx 3, La 2, Ré 1 — not the guitar's strings", () => {
    const { spies } = mountPanel({ instrumentType: "bass" });
    expect(byFn("jouer.position-fondamentale-corde-bass-5")).toBeNull();
    for (const idx of [3, 2, 1]) {
      fireEvent.click(byFn(`jouer.position-fondamentale-corde-bass-${idx}`));
      expect(spies.setSelectedRootString).toHaveBeenLastCalledWith(idx);
    }
  });

  it("each string reads its note and its fret: Do -> Mi (fr.8), La (fr.3), Ré (fr.10)", () => {
    mountPanel();
    expect(byFn("jouer.position-fondamentale-corde-guitar-5").textContent).toBe("Mi (fr.8)");
    expect(byFn("jouer.position-fondamentale-corde-guitar-4").textContent).toBe("La (fr.3)");
    expect(byFn("jouer.position-fondamentale-corde-guitar-3").textContent).toBe("Ré (fr.10)");
  });

  it("the string in use is pressed; clicking it again frees it (null), as on the classic page", () => {
    const { spies } = mountPanel({}, { selectedRootString: 4 });
    expect(byFn("jouer.position-fondamentale-corde-guitar-4").getAttribute("aria-pressed")).toBe("true");
    expect(byFn("jouer.position-fondamentale-corde-guitar-5").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(byFn("jouer.position-fondamentale-corde-guitar-4"));
    expect(spies.setSelectedRootString).toHaveBeenLastCalledWith(null);
  });

  it("a chosen position unpresses the string (the classic isActive rule)", () => {
    mountPanel({ placementIndex: 1 }, { selectedRootString: 4 });
    expect(byFn("jouer.position-fondamentale-corde-guitar-4").getAttribute("aria-pressed")).toBe("false");
  });

  it("'Fondamentale sur' is absent for a scale", () => {
    mountPanel({ isScaleMode: true });
    expect(document.querySelector('[data-fn^="jouer.position-fondamentale-corde-"]')).toBeNull();
    expect(document.body.textContent).not.toContain(T.positionRootOn);
  });

  it("'Réinitialiser Position' only when an index is chosen, and it clears it", () => {
    mountPanel();
    expect(byFn("jouer.position-reinit-guitar")).toBeNull();
    cleanup();
    const { spies } = mountPanel({ placementIndex: 0 });
    fireEvent.click(byFn("jouer.position-reinit-guitar"));
    expect(spies.setPlacementIndex).toHaveBeenLastCalledWith(null);
  });

  it("'Réinitialiser le focus' only for a scale with an anchor, and it clears the anchor", () => {
    mountPanel({ isScaleMode: true, scaleAnchor: { string: 2, fret: 5 } });
    const { spies } = mountPanel({ isScaleMode: true, scaleAnchor: { string: 2, fret: 5 } });
    const resets = document.querySelectorAll('[data-fn="jouer.position-reinit-focus-guitar"]');
    fireEvent.click(resets[resets.length - 1]);
    expect(spies.setScaleAnchor).toHaveBeenLastCalledWith(null);
    cleanup();
    mountPanel({ isScaleMode: true, scaleAnchor: null });
    expect(byFn("jouer.position-reinit-focus-guitar")).toBeNull();
  });

  it("the alerts show under their own name, the graver alone", () => {
    mountPanel({ fingering: { isOutOfRange: true, difficultStretch: true } });
    const box = byFn("jouer.position-alertes-guitar");
    expect(box.textContent).toContain(fr.warningOutOfRange);
    expect(box.textContent).not.toContain(fr.warningDifficultStretch);
    cleanup();
    mountPanel({ fingering: { difficultStretch: true } });
    expect(byFn("jouer.position-alertes-guitar").textContent).toContain(fr.warningDifficultStretch);
    cleanup();
    mountPanel();
    expect(byFn("jouer.position-alertes-guitar")).toBeNull();
  });

  it("the barre legend is the guitar's; the bass panel has none", () => {
    const { container } = mountPanel();
    expect(container.textContent).toContain(T.positionBarre);
    cleanup();
    const bass = mountPanel({ instrumentType: "bass" });
    expect(bass.container.textContent).not.toContain(T.positionBarre);
  });

  it("the instrument's range is shown, and absent when empty", () => {
    mountPanel();
    expect(byFn("jouer.instrument-plage-guitar").textContent).toContain("Do3 – Mi4");
    cleanup();
    mountPanel({ range: "" });
    expect(byFn("jouer.instrument-plage-guitar")).toBeNull();
  });
});

describe("L1b-1c — InstrumentHead: the label opens the panel, Escape and a click outside close it", () => {
  function mountHead({ withPanel = true, alert = null } = {}) {
    const setting = {
      groupLabel: "Position",
      label: "Open (auto)",
      prev: { fn: "jouer.position-guitar-prec", label: "Prec", onClick: () => {} },
      next: { fn: "jouer.position-guitar-suiv", label: "Suiv", onClick: () => {} },
      panel: withPanel
        ? { fn: "jouer.position-panneau-guitar", title: "Options", alert, content: <div data-testid="panel-content"><button type="button">dedans</button></div> }
        : null,
    };
    return render(
      <div>
        <InstrumentHead id="guitar" name="Guitare" chooseTitle="Choisir" selected={false} onSelect={() => {}} setting={setting} />
        <button type="button" data-testid="outside">dehors</button>
      </div>
    );
  }
  const toggle = () => byFn("jouer.position-panneau-guitar");

  it("the label stays plain text when there is no panel", () => {
    mountHead({ withPanel: false });
    expect(toggle()).toBeNull();
    expect(document.querySelector(".proto-a__head-label").tagName).toBe("SPAN");
  });

  it("with a panel the label is a button inside the same row, closed at first, the text unchanged", () => {
    mountHead();
    expect(toggle().tagName).toBe("BUTTON");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[data-testid="panel-content"]')).toBeNull();
    expect(document.querySelector(".proto-a__head-label").textContent).toBe("Open (auto)");
    expect(document.querySelectorAll(".proto-a__inst-head > *").length).toBe(2);
  });

  it("a click opens (aria-expanded true) and a second one closes", () => {
    mountHead();
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[data-testid="panel-content"]')).not.toBeNull();
    expect(document.querySelectorAll(".proto-a__inst-head > *").length).toBe(2);
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[data-testid="panel-content"]')).toBeNull();
  });

  it("Escape closes it and the focus is back on the button", () => {
    mountHead();
    fireEvent.click(toggle());
    document.querySelector('[data-testid="panel-content"] button').focus();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(document.querySelector('[data-testid="panel-content"]')).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it("a press outside closes it; a press inside does not", () => {
    mountHead();
    fireEvent.click(toggle());
    fireEvent.pointerDown(document.querySelector('[data-testid="panel-content"] button'));
    expect(document.querySelector('[data-testid="panel-content"]')).not.toBeNull();
    fireEvent.pointerDown(document.querySelector('[data-testid="outside"]'));
    expect(document.querySelector('[data-testid="panel-content"]')).toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("an alert puts a warning sign next to the label with the alert's text as its name, panel closed", () => {
    mountHead({ alert: { kind: "outOfRange", text: "Voicing hors portée" } });
    const mark = toggle().querySelector('[role="img"]');
    expect(mark).not.toBeNull();
    expect(mark.textContent).toContain("⚠️");
    expect(mark.getAttribute("aria-label")).toBe("Voicing hors portée");
    expect(mark.getAttribute("title")).toBe("Voicing hors portée");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".proto-a__head-label").textContent).toBe("Open (auto)");
  });

  it("no alert, no sign", () => {
    mountHead();
    expect(toggle().querySelector('[role="img"]')).toBeNull();
  });
});
