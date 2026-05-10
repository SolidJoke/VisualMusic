import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import InstrumentView from "../Panels/InstrumentView";
import { AppProvider } from "../../context/AppContext";

// Mock des composants enfants
vi.mock("../Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="audio-visualizer">AudioVisualizer</div>,
}));

vi.mock("../Sequencer/PianoRoll", () => ({
  default: () => <div data-testid="piano-roll">PianoRoll</div>,
}));

vi.mock("../Instruments/Fretboard", () => ({
  default: () => <div data-testid="fretboard">Fretboard</div>,
}));

vi.mock("../Instruments/PianoKeyboard", () => ({
  default: () => <div data-testid="piano-keyboard">PianoKeyboard</div>,
}));

describe("InstrumentView Smoke Test", () => {
  it("renders the active tab correctly in tabs layoutMode", () => {
    const dummyTxt = {
      tabDrums: "Drums",
      tabPiano: "Piano",
      tabGuitars: "Guitars",
      instrumentsScale: "Instrument Scales"
    };

    const html = renderToString(
      <AppProvider>
        <InstrumentView 
          layoutMode="tabs" 
          activeTab="piano" 
          masterAnalyser={null} 
          activeBrick={{}}
          availableGuitarFingerings={[]}
          availableBassFingerings={[]}
        />
      </AppProvider>
    );

    expect(html).toContain("PianoKeyboard");
    expect(html).not.toContain("PianoRoll");
    expect(html).not.toContain("Fretboard");
  });

  it("renders all instruments correctly in all layoutMode", () => {
    const dummyTxt = {
      tabDrums: "Drums",
      tabPiano: "Piano",
      tabGuitars: "Guitars",
      instrumentsScale: "Instrument Scales"
    };

    const html = renderToString(
      <AppProvider>
        <InstrumentView 
          layoutMode="all"
          appMode="studio"
          masterAnalyser={null}
          activeBrick={{}}
          availableGuitarFingerings={[]}
          availableBassFingerings={[]}
        />
      </AppProvider>
    );

    expect(html).toContain("PianoKeyboard");
    expect(html).toContain("PianoRoll");
    expect(html).toContain("Fretboard");
  });
});

