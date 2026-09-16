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

  it("renders correctly with default presets and sliders", () => {
    const { container } = render(<CompositionPanel {...defaultProps} />);

    // Check main title is present
    expect(screen.getByText("MATH COMPOSITION ASSISTANT")).toBeTruthy();

    // Check select preset dropdown exists
    const select = screen.getAllByRole("combobox")[0]; // first select is preset selector
    expect(select).toBeTruthy();

    // Check subdivisions slider
    const subLabel = screen.getByText("SUBDIVISIONS (n)");
    expect(subLabel).toBeTruthy();

    // Check pulses slider
    const pulsesLabel = screen.getByText("PULSES / BEATS (k)");
    expect(pulsesLabel).toBeTruthy();

    // Check export button
    expect(container.querySelector(".export-btn")).toBeTruthy();
  });

  it("updates parameters when choosing a rhythmic preset", () => {
    const { container } = render(<CompositionPanel {...defaultProps} />);

    const select = screen.getAllByRole("combobox")[0];

    // Choose "Tresillo" from presets
    fireEvent.change(select, { target: { value: "tresillo" } });

    // Tresillo is E(3,8)
    const lcds = container.querySelectorAll(".lcd-value");
    expect(lcds[0].textContent).toBe("8"); // Subdivisions
    expect(lcds[1].textContent).toBe("3"); // Pulses
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
    // click. This asserted 2 calls, and passed: the second was the export the
    // panel fired on mount, which overwrote the style's kick the moment the
    // modal opened (VMU-113). The test was certifying the bug.
    fireEvent.click(exportBtn);
    expect(setCustomDrums).toHaveBeenCalledTimes(1);

    // E(5,16) yields indices [0, 3, 6, 9, 12]
    const drumSetterArg = setCustomDrums.mock.calls[0][0];
    const dummyPrev = {};
    const result = drumSetterArg(dummyPrev);
    expect(result.Kick).toEqual([0, 3, 6, 9, 12]);
  });

  it("calls setSuggestedBassTrack when exporting to Bass", () => {
    const setSuggestedBassTrack = vi.fn();

    const { container } = render(
      <CompositionPanel
        {...defaultProps}
        setSuggestedBassTrack={setSuggestedBassTrack}
      />
    );

    // Select Bass target
    const selects = screen.getAllByRole("combobox");
    const targetSelect = selects[1]; // second select is the target selector
    fireEvent.change(targetSelect, { target: { value: "Bass" } });

    const exportBtn = container.querySelector(".export-btn");
    fireEvent.click(exportBtn);

    expect(setSuggestedBassTrack).toHaveBeenCalledTimes(2);
    expect(setSuggestedBassTrack.mock.calls[0][0].name).toBe("Bass");
    expect(setSuggestedBassTrack.mock.calls[0][0].activeSteps).toEqual([0, 3, 6, 9, 12]);
  });

  it("clears all overrides when clicking RESET ALL OVERRIDES", () => {
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

    const resetBtn = screen.getByText("RESET ALL OVERRIDES");
    fireEvent.click(resetBtn);

    expect(setSuggestedBassTrack).toHaveBeenCalledWith(null);
    expect(setCustomRhythm).toHaveBeenCalledWith(null);
    expect(setCustomDrums).toHaveBeenCalledWith(null);
  });

  it("handles Isorhythm Mode toggle and mutual exclusion", () => {
    render(<CompositionPanel {...defaultProps} />);

    // By default, Isorhythm section should not be present
    expect(screen.queryByText("ISORHYTHM ENGINE (TALEA & COLOR)")).toBeNull();

    // Toggle Isorhythm switch
    const isorhythmSwitch = screen.getByLabelText("ISORHYTHM MODE");
    fireEvent.click(isorhythmSwitch);

    // Isorhythm section should now be visible
    expect(screen.getByText("ISORHYTHM ENGINE (TALEA & COLOR)")).toBeTruthy();
    expect(screen.getByText("PITCH COLOR SEQUENCE:")).toBeTruthy();

    // Toggle Forced Realignment switch (Mode M)
    const realignmentSwitch = screen.getByLabelText("Mode M");
    fireEvent.click(realignmentSwitch);

    // Forced Realignment section should now be visible
    expect(screen.getByText("FORCED REALIGNMENT (CALCULATRICE M)")).toBeTruthy();

    // Isorhythm section should be closed due to mutual exclusion
    expect(screen.queryByText("ISORHYTHM ENGINE (TALEA & COLOR)")).toBeNull();
  });
});

// VMU-113. The panel lives in a modal that mounts its content on opening. An
// effect exported the current rhythm on every render-time change, mount
// included, so opening "Math & Rythmes" replaced the style's kick with E(5,16)
// before the user touched anything. Measured in the browser on d54badb: kick
// steps 0,8 -> 0,3,6,9,12 on opening, still there after closing.
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

  // The rhythm the last drum export would write, read through the functional
  // updater the panel passes to setCustomDrums.
  const lastKick = (setCustomDrums) => {
    const calls = setCustomDrums.mock.calls;
    return calls[calls.length - 1][0]({}).Kick;
  };

  const pulsesSlider = (container) => container.querySelectorAll('input[type="range"]')[1];

  it("opening the panel calls no sequencer setter", () => {
    const { setSuggestedBassTrack, setCustomRhythm, setCustomDrums } = renderPanel();

    expect(setCustomDrums).not.toHaveBeenCalled();
    expect(setCustomRhythm).not.toHaveBeenCalled();
    expect(setSuggestedBassTrack).not.toHaveBeenCalled();
  });

  it("opening the panel under StrictMode calls no sequencer setter either", () => {
    // main.jsx renders the app in StrictMode, which runs mount effects twice in
    // development. A "skip the first run" flag would export on the second.
    const { setCustomDrums } = renderPanel((node) => <React.StrictMode>{node}</React.StrictMode>);

    expect(setCustomDrums).not.toHaveBeenCalled();
  });

  it("a change made by the user is still exported live", () => {
    const { container, setCustomDrums } = renderPanel();

    fireEvent.change(pulsesSlider(container), { target: { value: "6" } });

    // E(6,16): six onsets among sixteen steps, whatever the rotation.
    expect(setCustomDrums).toHaveBeenCalled();
    const kick = lastKick(setCustomDrums);
    expect(kick).toHaveLength(6);
    expect(new Set(kick).size).toBe(6);
    expect(kick.every((step) => step >= 0 && step < 16)).toBe(true);
  });

  it("returning to the opening value after a change still exports it", () => {
    // Once the user has changed something, the sequencer must follow the panel
    // even back to where it started; otherwise the track keeps E(6,16) while
    // the panel shows E(5,16).
    const { container, setCustomDrums } = renderPanel();

    fireEvent.change(pulsesSlider(container), { target: { value: "6" } });
    fireEvent.change(pulsesSlider(container), { target: { value: "5" } });

    expect(lastKick(setCustomDrums)).toHaveLength(5);
  });
});
