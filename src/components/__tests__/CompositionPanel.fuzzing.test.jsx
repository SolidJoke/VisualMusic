import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";

/**
 * Fuzzing Test Suite for CompositionPanel (BUG-08/COMP-08 Investigation)
 * 
 * Ce fichier est destiné à être exécuté par Gemini Flash.
 * Il simule les interactions décrites par Gabriel pour déclencher le crash (changement d'options pendant la lecture).
 * Gemini Flash doit JUSTE lancer ces tests, capturer les logs de crash et les rapporter.
 */

// On mock le hook pour forcer un état de lecture (isPlaying: true) et un currentStep non nul.
vi.mock("../../hooks/useCompositionPlayback", () => ({
  useCompositionPlayback: () => ({
    isPlaying: true,
    togglePlayback: vi.fn(),
    bpm: 120,
    setBpm: vi.fn(),
    currentStep: 3 // Simule la tête de lecture en cours
  })
}));

describe("CompositionPanel Crash Fuzzer (Gemini Flash Task)", () => {
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
    currentStep: 3
  };

  it("should not crash when toggling Isorhythm Mode and changing color sequence during playback", () => {
    expect(() => {
      render(<CompositionPanel {...defaultProps} />);
      const isorhythmSwitch = screen.getByLabelText("ISORHYTHM MODE");
      fireEvent.click(isorhythmSwitch);
      
      const pitchInput = screen.getByPlaceholderText("C3, E3, G3, B3");
      fireEvent.change(pitchInput, { target: { value: "C3, D3" } });
    }).not.toThrow();
  });

  it("should not crash when toggling Phasing Mode and modifying offset during playback", () => {
    expect(() => {
      const { container } = render(<CompositionPanel {...defaultProps} />);
      const phasingLabel = screen.getByText("PHASING MODE");
      const phasingSwitch = phasingLabel.parentElement.querySelector("input[type='checkbox']");
      fireEvent.click(phasingSwitch);

      // Le slider d'offset est le 4ème slider dans le panneau en général
      const sliders = container.querySelectorAll("input[type='range']");
      if (sliders.length > 3) {
        fireEvent.change(sliders[3], { target: { value: "3" } });
      }
    }).not.toThrow();
  });

  it("should not crash when toggling Meshuggah Mode and changing metric boundary during playback", () => {
    expect(() => {
      const { container } = render(<CompositionPanel {...defaultProps} />);
      const meshuggahSwitch = screen.getByLabelText("Mode M");
      fireEvent.click(meshuggahSwitch);

      const sliders = container.querySelectorAll("input[type='range']");
      if (sliders.length > 3) {
        fireEvent.change(sliders[3], { target: { value: "11" } });
      }
    }).not.toThrow();
  });

  it("should not crash when toggling Polyrhythm Algebra, changing K and offset, and adding polygons during playback", () => {
    expect(() => {
      const { container } = render(<CompositionPanel {...defaultProps} />);
      const polySwitch = screen.getByLabelText("POLYRHYTHM ALGEBRA");
      fireEvent.click(polySwitch);

      // Ajouter un nouveau polygone
      const addBtn = screen.getByText("+ ADD POLYGON");
      fireEvent.click(addBtn);

      // Changer les valeurs des sliders (K et Offset)
      const sliders = container.querySelectorAll(".poly-slider");
      sliders.forEach(slider => {
        fireEvent.change(slider, { target: { value: "5" } });
      });
      
      // Changer le rythme de base pour tester le recalcul de balance
      const mainSliders = container.querySelectorAll(".retro-slider");
      fireEvent.change(mainSliders[0], { target: { value: "12" } }); // Subdivisions
    }).not.toThrow();
  });

  it("should not crash on rapid mode switching during active playback", () => {
    expect(() => {
      render(<CompositionPanel {...defaultProps} />);
      
      const isorhythmSwitch = screen.getByLabelText("ISORHYTHM MODE");
      const phasingLabel = screen.getByText("PHASING MODE");
      const phasingSwitch = phasingLabel.parentElement.querySelector("input[type='checkbox']");
      const meshuggahSwitch = screen.getByLabelText("Mode M");
      const polySwitch = screen.getByLabelText("POLYRHYTHM ALGEBRA");

      // Fuzzing: active/désactive rapidement les modes qui s'excluent mutuellement
      fireEvent.click(isorhythmSwitch);
      fireEvent.click(phasingSwitch);
      fireEvent.click(meshuggahSwitch);
      fireEvent.click(polySwitch);
      fireEvent.click(isorhythmSwitch);
    }).not.toThrow();
  });
  
  it("should not crash when changing preset while in a specific mode", () => {
    expect(() => {
      render(<CompositionPanel {...defaultProps} />);
      const polySwitch = screen.getByLabelText("POLYRHYTHM ALGEBRA");
      fireEvent.click(polySwitch);

      const select = screen.getAllByRole("combobox")[0]; // Rhythmic preset
      fireEvent.change(select, { target: { value: "cinquillo" } });
    }).not.toThrow();
  });
});
