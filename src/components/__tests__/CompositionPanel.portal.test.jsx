import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import { translations } from "../../i18n/translations";

// VMU-213 (part 2): CompositionPanel portals "Pour aller plus loin" (the
// advanced section) into an `advancedContainer` handed by A′'s recipes column.
// This file checks the portal alone: the section lands in the container, the
// same state drives the toggle and the recipes, and without a container nothing
// changes (the section stays inline, folded by default).

const renderPanel = (props = {}) =>
  render(
    <CompositionPanel
      activeTracks={{ drums: [], melody: [], progression: ["I"], rhythm: [0] }}
      setSuggestedBassTrack={vi.fn()}
      setCustomRhythm={vi.fn()}
      setCustomDrums={vi.fn()}
      currentStep={-1}
      txt={translations.fr.comp}
      {...props}
    />
  );

describe("CompositionPanel portal (VMU-213, part 2)", () => {
  it("portals the advanced section into advancedContainer, open by default", async () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    renderPanel({ advancedContainer: div });

    await waitFor(() =>
      expect(screen.getByTestId("comp-advanced-toggle").getAttribute("aria-expanded")).toBe("true")
    );
    expect(div.querySelector(".advanced-section")).not.toBeNull();
    expect(document.querySelector("#composition-panel .advanced-section")).toBeNull();

    fireEvent.click(div.querySelector('[data-testid="comp-mode-phasing"]'));
    expect(div.querySelector('[data-testid="comp-phasing-section"]')).not.toBeNull();
    expect(div.querySelector('[data-testid="comp-mode-phasing"]').getAttribute("aria-pressed")).toBe("true");

    div.remove();
  });

  it("stays inline and folded without advancedContainer", () => {
    renderPanel();
    const toggle = screen.getByTestId("comp-advanced-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("#composition-panel .advanced-section")).not.toBeNull();
    expect(document.querySelectorAll(".advanced-section")).toHaveLength(1);
  });
});
