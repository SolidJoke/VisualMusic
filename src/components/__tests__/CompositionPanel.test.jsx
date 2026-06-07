import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";

vi.mock("../../hooks/useCompositionPlayback", () => ({
  useCompositionPlayback: () => ({
    isPlaying: false,
    togglePlayback: vi.fn(),
    bpm: 120,
    setBpm: vi.fn(),
    currentStep: -1
  })
}));

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

    // Default target is Kick drum, should call setCustomDrums
    fireEvent.click(exportBtn);
    expect(setCustomDrums).toHaveBeenCalledTimes(2);

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
