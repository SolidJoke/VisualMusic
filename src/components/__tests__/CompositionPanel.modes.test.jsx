import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import { translations } from "../../i18n/translations";

// VMU-195-D, one recipe at a time (owner's decision, 2026-11-05): turning any
// recipe on turns every other recipe off; turning one off leaves none on.
const RECIPES = ["phasing", "iso", "mesh", "poly"];

const renderOpen = (setters = {}) => {
  const utils = render(
    <CompositionPanel
      activeTracks={{ drums: [], melody: [], progression: ["I"], rhythm: [0] }}
      setSuggestedBassTrack={vi.fn()}
      setCustomRhythm={vi.fn()}
      setCustomDrums={vi.fn()}
      currentStep={-1}
      txt={translations.fr.comp}
      {...setters}
    />
  );
  fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
  return utils;
};

const press = (id) => screen.getByTestId(`comp-mode-${id}`).getAttribute("aria-pressed");
const click = (id) => fireEvent.click(screen.getByTestId(`comp-mode-${id}`));

describe("one recipe at a time (owner's decision, 2026-11-05)", () => {
  for (const a of RECIPES) {
    for (const b of RECIPES) {
      if (a === b) continue;
      it(`${a} then ${b}: only ${b} stays on, then off leaves none`, () => {
        renderOpen();
        click(a);
        expect(press(a)).toBe("true");

        click(b);
        expect(press(b)).toBe("true");
        for (const c of RECIPES) {
          expect(press(c)).toBe(c === b ? "true" : "false");
        }

        click(b);
        for (const c of RECIPES) {
          expect(press(c)).toBe("false");
        }
      });
    }
  }

  it("poly then iso: the export sends the melody's steps, and the wheel is not the stack", () => {
    const setCustomDrums = vi.fn();
    const { container } = renderOpen({ setCustomDrums });
    click("poly");
    click("iso");

    expect(press("iso")).toBe("true");
    expect(press("poly")).toBe("false");

    // The export receives the iso melody's steps: 5 hits over 4 notes repeat
    // every LCM(5,4)/5 = 4 turns of the 16-step pattern -> a 64-step cycle,
    // 20 sounded steps.
    const kick = setCustomDrums.mock.calls[setCustomDrums.mock.calls.length - 1][0]({}).Kick;
    expect(kick.cycleLength).toBe(64);
    expect(kick.activeSteps).toHaveLength(20);

    // The wheel is no longer the stack: no stacked polygon, and the strip keeps
    // the base 16-step pattern. (displayPattern does not follow iso — it returns
    // the base `pattern`, so the wheel and the export do NOT fully agree; this is
    // reported, not changed, per the brief.)
    expect(container.querySelector(".euclidean-polygon-stacked")).toBeNull();
    expect(screen.getByTestId("comp-grid").style.gridTemplateColumns).toBe("repeat(16, 1fr)");
  });
});
