// VMU-189 - the drawer's family buttons must not reset the type when the
// family clicked is already the active one: a distracted click on "Gammes"
// used to send the chosen "scale_minor" back to "scale_major". Modeled on
// src/__tests__/DictionaryStability.test.jsx (same provider and props).
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { AppProvider } from "../../../context/AppContext";
import DictionaryPanel from "../DictionaryPanel";
import { translations } from "../../../i18n/translations";
import "@testing-library/jest-dom";

vi.mock("../../../utils/debug", () => ({ log: vi.fn() }));

describe("VMU-189: DictionaryPanel family guard", () => {
  beforeEach(() => {
    cleanup();
  });

  const renderPanel = (props = {}) => {
    return render(
      <AppProvider>
        <DictionaryPanel
          dictRoot={0}
          setDictRoot={vi.fn()}
          dictType="scale_minor"
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
          {...props}
        />
      </AppProvider>
    );
  };

  const familyButton = (label) => {
    const button = [...document.querySelectorAll(".btn-segment-group .btn-segment")]
      .find((b) => b.textContent.includes(label));
    expect(button, label).toBeTruthy();
    return button;
  };

  it("does nothing on the already active family, and switches on another", () => {
    const setDictType = vi.fn();
    renderPanel({ setDictType });

    fireEvent.click(familyButton(translations.fr.familyScale));
    expect(setDictType).not.toHaveBeenCalled();

    fireEvent.click(familyButton(translations.fr.familyChord));
    expect(setDictType).toHaveBeenCalledTimes(1);
    expect(setDictType).toHaveBeenCalledWith("chord_major");
  });
});
