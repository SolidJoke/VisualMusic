/**
 * VMU-112 — "Tout afficher / Mode Focus" is removed from PlaybackPanel, and
 * the guitar-position ("Position guitare") zone selector — previously gated
 * on `layoutMode === "all" || activeTab === "guitars"` — no longer depends
 * on either prop: it renders in both app modes.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import PlaybackPanel from "../Panels/PlaybackPanel";
import { AppProvider } from "../../context/AppContext";

vi.mock("../Panels/MixerPanel", () => ({
  default: () => <div data-testid="mixer-panel">MixerPanel</div>,
}));

afterEach(cleanup);

const baseTxt = {
  masterVol: "Volume",
  chord: "Accord",
  scale: "Gamme",
  guitarPos: "Position guitare",
  posAll: "Toutes",
  posOpen: "Ouvertes",
  posMid: "Médianes",
  posHigh: "Hautes",
  // Sentinels: if these ever render, the old controls came back.
  showAll: "SHOULD-NOT-RENDER-SHOWALL",
  focusMode: "SHOULD-NOT-RENDER-FOCUSMODE",
};

function renderPanel(props = {}) {
  return render(
    <AppProvider>
      <PlaybackPanel
        appMode="studio"
        isPlaying={false}
        masterVolume={-12}
        setMasterVolume={vi.fn()}
        currentBpm={120}
        instrumentVolumes={{}}
        handleInstrumentVolumeChange={vi.fn()}
        displayMode="chord"
        setDisplayMode={vi.fn()}
        fretboardZone="all"
        setFretboardZone={vi.fn()}
        txt={baseTxt}
        {...props}
      />
    </AppProvider>
  );
}

describe("PlaybackPanel (VMU-112)", () => {
  it("does not render the Show All / Focus Mode controls", () => {
    const { queryByText } = renderPanel({ appMode: "studio" });
    expect(queryByText("SHOULD-NOT-RENDER-SHOWALL")).toBeNull();
    expect(queryByText("SHOULD-NOT-RENDER-FOCUSMODE")).toBeNull();
  });

  it("renders the fretboard zone selector in studio mode", () => {
    // Before VMU-112 this needed layoutMode === "all" or
    // activeTab === "guitars"; neither prop exists any more, and the
    // selector must still show up in studio mode.
    const { getByText } = renderPanel({ appMode: "studio" });
    expect(getByText("Position guitare")).not.toBeNull();
  });

  it("renders the fretboard zone selector in dictionary mode too", () => {
    const { getByText } = renderPanel({ appMode: "dictionary" });
    expect(getByText("Position guitare")).not.toBeNull();
  });
});
