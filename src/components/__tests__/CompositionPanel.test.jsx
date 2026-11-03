import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";

describe("CompositionPanel Component", () => {
  const defaultProps = {
    activeTracks: {
      drums: [],
      melody: [],
      progression: ["I"],
      rhythm: [0]
    },
    setSuggestedBassTrack: vi.fn(),
    setCustomRhythm: vi.fn(),
    setCustomDrums: vi.fn(),
    currentStep: -1
  };

  it("renders the phrase steppers, the instrument and the send button", () => {
    const { container } = render(<CompositionPanel {...defaultProps} />);

    // Main title is present (stable hook, not the wording).
    expect(screen.getByTestId("comp-title")).toBeTruthy();

    // The instrument is the one select ("joués par …").
    expect(screen.getByTestId("comp-target")).toBeTruthy();

    // The three numbers of the phrase have their − / + pairs.
    expect(screen.getByTestId("comp-k-value").textContent).toBe("5");
    expect(screen.getByTestId("comp-n-value").textContent).toBe("16");
    expect(screen.getByTestId("comp-r-value").textContent).toBe("0");

    // Send button.
    expect(container.querySelector(".export-btn")).toBeTruthy();
  });

  it("sets n and k when choosing a rhythmic pill", () => {
    render(<CompositionPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId("comp-preset-tresillo"));

    // Tresillo is E(3,8).
    expect(screen.getByTestId("comp-n-value").textContent).toBe("8");
    expect(screen.getByTestId("comp-k-value").textContent).toBe("3");
  });

  it("calls export handlers correctly for different targets", () => {
    const setSuggestedBassTrack = vi.fn();
    const setCustomRhythm = vi.fn();
    const setCustomDrums = vi.fn();

    const { container } = render(
      <CompositionPanel
        {...defaultProps}
        setSuggestedBassTrack={setSuggestedBassTrack}
        setCustomRhythm={setCustomRhythm}
        setCustomDrums={setCustomDrums}
      />
    );

    const exportBtn = container.querySelector(".export-btn");

    // Default target is Kick drum, should call setCustomDrums — once, for the
    // click (opening the window writes nothing, VMU-113).
    fireEvent.click(exportBtn);
    expect(setCustomDrums).toHaveBeenCalledTimes(1);

    // E(5,16) yields indices [0, 3, 6, 9, 12], sent whole with their cycle length.
    const drumSetterArg = setCustomDrums.mock.calls[0][0];
    const result = drumSetterArg({});
    expect(result.Kick).toEqual({ activeSteps: [0, 3, 6, 9, 12], cycleLength: 16 });
  });

  it("calls setSuggestedBassTrack when exporting to Bass", () => {
    const setSuggestedBassTrack = vi.fn();

    const { container } = render(
      <CompositionPanel
        {...defaultProps}
        setSuggestedBassTrack={setSuggestedBassTrack}
      />
    );

    // The one select is the instrument of the phrase.
    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Bass" } });

    const exportBtn = container.querySelector(".export-btn");
    fireEvent.click(exportBtn);

    expect(setSuggestedBassTrack).toHaveBeenCalledTimes(2);
    expect(setSuggestedBassTrack.mock.calls[0][0].name).toBe("Bass");
    expect(setSuggestedBassTrack.mock.calls[0][0].activeSteps).toEqual([0, 3, 6, 9, 12]);
  });

  it("clears all overrides when clicking the reset button", () => {
    const setSuggestedBassTrack = vi.fn();
    const setCustomRhythm = vi.fn();
    const setCustomDrums = vi.fn();

    render(
      <CompositionPanel
        {...defaultProps}
        setSuggestedBassTrack={setSuggestedBassTrack}
        setCustomRhythm={setCustomRhythm}
        setCustomDrums={setCustomDrums}
      />
    );

    fireEvent.click(screen.getByTestId("comp-reset"));

    expect(setSuggestedBassTrack).toHaveBeenCalledWith(null);
    expect(setCustomRhythm).toHaveBeenCalledWith(null);
    expect(setCustomDrums).toHaveBeenCalledWith(null);
  });

  it("handles each recipe and its exact exclusion of the others (four-row rule)", () => {
    // The marker each recipe leaves visible when it is switched on: its own
    // section for the first three, the polyrhythm editor for "Empiler des
    // rythmes" (which has no comp-*-section test id).
    const section = {
      phasing: "comp-phasing-section",
      iso: "comp-iso-section",
      mesh: "comp-realign-section",
      poly: "comp-poly-add",
    };
    // Turning a recipe on switches off every other recipe except the ones
    // listed here — the HEAD rule restored for VMU-195-B: phasing and iso
    // leave poly on, mesh and poly switch everything else off.
    const leavesOn = {
      phasing: ["poly"],
      iso: ["poly"],
      mesh: [],
      poly: [],
    };

    for (const [target, kept] of Object.entries(leavesOn)) {
      for (const other of Object.keys(section)) {
        if (other === target) continue;

        const { unmount } = render(<CompositionPanel {...defaultProps} />);
        // The recipes are folded by default: unfold them first.
        fireEvent.click(screen.getByTestId("comp-advanced-toggle"));

        // Switch the other recipe on first, so the target must either keep it
        // on or switch it off.
        fireEvent.click(screen.getByTestId(`comp-mode-${other}`));
        expect(screen.getByTestId(section[other])).toBeTruthy();

        fireEvent.click(screen.getByTestId(`comp-mode-${target}`));
        expect(screen.getByTestId(section[target])).toBeTruthy();

        if (kept.includes(other)) {
          expect(screen.getByTestId(section[other])).toBeTruthy();
        } else {
          expect(screen.queryByTestId(section[other])).toBeNull();
        }
        unmount();
      }
    }
  });
});

// VMU-113. The panel lives in a modal that mounts its content on opening. An
// effect exported the current rhythm on every render-time change, mount
// included, so opening "Math & Rythmes" replaced the style's kick with E(5,16)
// before the user touched anything. The phrase's − / + must keep the same
// guarantee: opening writes nothing.
describe("CompositionPanel — opening writes nothing to the sequencer (VMU-113)", () => {
  const renderPanel = (wrap = (node) => node) => {
    const setters = {
      setSuggestedBassTrack: vi.fn(),
      setCustomRhythm: vi.fn(),
      setCustomDrums: vi.fn(),
    };
    const utils = render(
      wrap(
        <CompositionPanel
          activeTracks={{ drums: [], melody: [], progression: ["I"], rhythm: [0] }}
          currentStep={-1}
          {...setters}
        />
      )
    );
    return { ...utils, ...setters };
  };

  const lastKick = (setCustomDrums) => {
    const calls = setCustomDrums.mock.calls;
    return calls[calls.length - 1][0]({}).Kick;
  };

  it("opening the panel calls no sequencer setter", () => {
    const { setSuggestedBassTrack, setCustomRhythm, setCustomDrums } = renderPanel();

    expect(setCustomDrums).not.toHaveBeenCalled();
    expect(setCustomRhythm).not.toHaveBeenCalled();
    expect(setSuggestedBassTrack).not.toHaveBeenCalled();
  });

  it("opening the panel under StrictMode calls no sequencer setter either", () => {
    const { setCustomDrums } = renderPanel((node) => <React.StrictMode>{node}</React.StrictMode>);

    expect(setCustomDrums).not.toHaveBeenCalled();
  });

  it("a change made by the user with the − / + is still exported live", () => {
    const { setCustomDrums } = renderPanel();

    fireEvent.click(screen.getByTestId("comp-k-plus"));

    // E(6,16): six onsets among sixteen steps, whatever the rotation.
    expect(setCustomDrums).toHaveBeenCalled();
    const kick = lastKick(setCustomDrums);
    expect(kick.cycleLength).toBe(16);
    expect(kick.activeSteps).toHaveLength(6);
    expect(new Set(kick.activeSteps).size).toBe(6);
    expect(kick.activeSteps.every((step) => step >= 0 && step < 16)).toBe(true);
  });

  it("returning to the opening value after a change still exports it", () => {
    const { setCustomDrums } = renderPanel();

    fireEvent.click(screen.getByTestId("comp-k-plus"));
    fireEvent.click(screen.getByTestId("comp-k-minus"));

    expect(lastKick(setCustomDrums).activeSteps).toHaveLength(5);
  });
});
