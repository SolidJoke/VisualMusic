/**
 * VMU-112 — instrument sections fold/unfold, replacing "Tout afficher /
 * Mode Focus".
 *
 * The two previous tests here ("renders the active tab correctly in tabs
 * layoutMode" / "renders all instruments correctly in all layoutMode") had
 * no object left: `layoutMode` and `activeTab` are gone from AppContext, and
 * InstrumentView no longer branches on them. They are replaced below by
 * tests of the fold/unfold behaviour that took their place. `renderToString`
 * cannot click a button, so this file switches to `@testing-library/react`.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, within } from "@testing-library/react";
import InstrumentView from "../Panels/InstrumentView";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import { PlaybackProvider } from "../../context/PlaybackContext";

// Leaf mocks, one per direct child InstrumentView renders, so a test can
// tell "mounted" from "not mounted" by querying a testid instead of parsing
// real fretboard/keyboard markup.
vi.mock("../Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="audio-visualizer">AudioVisualizer</div>,
}));
vi.mock("../Panels/SequencerPanel", () => ({
  default: () => <div data-testid="sequencer-panel">SequencerPanel</div>,
}));
vi.mock("../Panels/TheoryLegend", () => ({
  default: () => <div data-testid="theory-legend">TheoryLegend</div>,
}));
vi.mock("../Instruments/InstrumentBar", () => ({
  default: (props) => (
    <div data-testid="instrument-bar" data-selected={props.selected}>
      {props.groupLabel}
    </div>
  ),
}));
vi.mock("../Layout/PositionSelector", () => ({
  default: (props) => (
    <div data-testid={`position-selector-${props.instrumentType}`}>
      {props.instrumentType}
    </div>
  ),
}));
vi.mock("../Instruments/Fretboard", () => ({
  default: (props) => (
    <div data-testid={`fretboard-${props.instrument}`}>{props.instrument}</div>
  ),
}));
vi.mock("../Instruments/PianoKeyboard", () => ({
  default: () => <div data-testid="piano-keyboard">PianoKeyboard</div>,
}));
// Fold buttons must not depend on device width (§2.3: same behaviour on
// phone, no "one section open" accordion). Mocked true for the whole file —
// InstrumentBar is mocked above so its `compact` prop is inert here; the
// phone-specific per-tile/full-width split already has its own coverage in
// InstrumentBar.test.jsx.
vi.mock("../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => true,
  useLandscapeMode: () => false,
}));

afterEach(cleanup);

/**
 * Stands in for AppDesktop's wiring: owns `collapsedSections` and
 * `playbackInstrument` the way AppDesktop's `dispatch`-backed state does,
 * so clicking a fold button in the test exercises the same read-then-write
 * round trip a real session would.
 */
function Harness({ appMode = "studio", initialCollapsed = {}, overrides = {} }) {
  const [collapsedSections, setCollapsedSections] = React.useState(initialCollapsed);
  const [playbackInstrument, setPlaybackInstrumentState] = React.useState(
    overrides.playbackInstrument ?? "piano"
  );
  const toggleSection = (section) =>
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const setPlaybackInstrument = overrides.setPlaybackInstrument ?? setPlaybackInstrumentState;

  const value = {
    masterAnalyser: null,
    appMode,
    activeBrick: {},
    availableGuitarFingerings: [],
    availableBassFingerings: [],
    showFingering: true,
    clickedChord: null,
    realizationsByInstrument: {},
    ...overrides,
    // These two must always reflect the harness's own live state, never an
    // override: they are what makes fold clicks in a test actually re-render.
    playbackInstrument: overrides.playbackInstrument ?? playbackInstrument,
    setPlaybackInstrument,
    collapsedSections,
    toggleSection,
  };

  const playbackValue = { currentStep: 0, currentBpm: 120 };

  return (
    <AppProvider>
      <MusicEngineProvider value={value}>
        <PlaybackProvider value={playbackValue}>
          <InstrumentView />
        </PlaybackProvider>
      </MusicEngineProvider>
    </AppProvider>
  );
}

// Fold buttons are the only buttons InstrumentView renders directly that
// carry aria-controls pointing at a section's content id.
function getFoldButtons(container) {
  return within(container)
    .getAllByRole("button")
    .filter((btn) => btn.hasAttribute("aria-controls"));
}

function getFoldButtonByName(container, name) {
  return getFoldButtons(container).find((btn) =>
    btn.textContent.match(name)
  );
}

describe("InstrumentView — foldable sections (VMU-112)", () => {
  it('renders one fold button per section with aria-expanded="true" and aria-controls matching its content — Studio', () => {
    const { container } = render(<Harness appMode="studio" />);
    const buttons = getFoldButtons(container);
    expect(buttons).toHaveLength(4); // sequencer, piano, guitar, bass

    for (const btn of buttons) {
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      const contentId = btn.getAttribute("aria-controls");
      expect(contentId).toBeTruthy();
      expect(container.querySelector(`#${contentId}`)).not.toBeNull();
    }
  });

  it('renders one fold button per section with aria-expanded="true" and aria-controls matching its content — Dictionary', () => {
    const { container } = render(<Harness appMode="dictionary" />);
    const buttons = getFoldButtons(container);
    expect(buttons).toHaveLength(3); // piano, guitar, bass — no sequencer

    for (const btn of buttons) {
      expect(btn.getAttribute("aria-expanded")).toBe("true");
      const contentId = btn.getAttribute("aria-controls");
      expect(contentId).toBeTruthy();
      expect(container.querySelector(`#${contentId}`)).not.toBeNull();
    }
  });

  it("folding the guitar section unmounts the guitar fretboard and its position selector, and keeps piano and bass", () => {
    const { container, queryByTestId } = render(<Harness appMode="dictionary" />);
    expect(queryByTestId("fretboard-guitar")).not.toBeNull();
    expect(queryByTestId("position-selector-guitar")).not.toBeNull();

    const guitarBtn = getFoldButtonByName(container, /Guitare|Guitar/i);
    fireEvent.click(guitarBtn);

    expect(queryByTestId("fretboard-guitar")).toBeNull();
    expect(queryByTestId("position-selector-guitar")).toBeNull();
    // Piano and bass are untouched by folding guitar.
    expect(queryByTestId("piano-keyboard")).not.toBeNull();
    expect(queryByTestId("fretboard-bass")).not.toBeNull();
    expect(queryByTestId("position-selector-bass")).not.toBeNull();
  });

  it("folding a section does not change the played instrument", () => {
    const setPlaybackInstrument = vi.fn();
    const { container, queryByTestId } = render(
      <Harness
        appMode="dictionary"
        overrides={{ playbackInstrument: "guitar", setPlaybackInstrument }}
      />
    );

    const guitarBtn = getFoldButtonByName(container, /Guitare|Guitar/i);
    fireEvent.click(guitarBtn);

    expect(setPlaybackInstrument).not.toHaveBeenCalled();
    expect(queryByTestId("instrument-bar").getAttribute("data-selected")).toBe("guitar");
  });

  it("unfolding a section renders its content again", () => {
    const { container, queryByTestId } = render(<Harness appMode="dictionary" />);
    const guitarBtn = getFoldButtonByName(container, /Guitare|Guitar/i);

    fireEvent.click(guitarBtn); // fold
    expect(queryByTestId("fretboard-guitar")).toBeNull();

    fireEvent.click(guitarBtn); // unfold
    expect(queryByTestId("fretboard-guitar")).not.toBeNull();
  });

  it("fold state is kept when switching from studio to dictionary and back", () => {
    const { container, rerender, queryByTestId } = render(<Harness appMode="studio" />);
    const guitarBtn = getFoldButtonByName(container, /Guitare|Guitar/i);
    fireEvent.click(guitarBtn); // fold guitar in studio
    expect(queryByTestId("fretboard-guitar")).toBeNull();

    rerender(<Harness appMode="dictionary" />);
    expect(queryByTestId("fretboard-guitar")).toBeNull();

    rerender(<Harness appMode="studio" />);
    expect(queryByTestId("fretboard-guitar")).toBeNull();
  });

  it("the theory legend is hidden only when piano, guitar and bass are all folded", () => {
    const { container, queryByTestId } = render(<Harness appMode="dictionary" />);
    expect(queryByTestId("theory-legend")).not.toBeNull();

    fireEvent.click(getFoldButtonByName(container, /Piano/i));
    expect(queryByTestId("theory-legend")).not.toBeNull();

    fireEvent.click(getFoldButtonByName(container, /Guitare|Guitar/i));
    expect(queryByTestId("theory-legend")).not.toBeNull();

    fireEvent.click(getFoldButtonByName(container, /Basse|Bass/i));
    expect(queryByTestId("theory-legend")).toBeNull();

    // Unfolding any one of the three brings it back.
    fireEvent.click(getFoldButtonByName(container, /Basse|Bass/i));
    expect(queryByTestId("theory-legend")).not.toBeNull();
  });

  it("on a phone width (useMediaQuery mocked to true) the fold buttons are rendered", () => {
    const { container } = render(<Harness appMode="studio" />);
    expect(getFoldButtons(container)).toHaveLength(4);
  });
});

describe("InstrumentView — position selectors keep their default visibility (VMU-111 §5)", () => {
  // VMU-111 §5 decoupled the fretted-note LABEL (degree vs finger number)
  // from showFingering, which must otherwise be untouched: it still gates
  // the guitar/bass position selector here (InstrumentView.jsx:163/194) and
  // the voicing mask (fretboardUtils.js). This must fail if showFingering's
  // default were simply flipped to false.
  it("shows the guitar and bass position selectors by default in Studio mode with a chord clicked", () => {
    const { queryByTestId } = render(
      <Harness
        appMode="studio"
        overrides={{ clickedChord: { rootNote: { value: 0 }, nns: "I" } }}
      />
    );
    expect(queryByTestId("position-selector-guitar")).not.toBeNull();
    expect(queryByTestId("position-selector-bass")).not.toBeNull();
  });

  it("shows the guitar and bass position selectors by default in Dictionary mode", () => {
    const { queryByTestId } = render(<Harness appMode="dictionary" />);
    expect(queryByTestId("position-selector-guitar")).not.toBeNull();
    expect(queryByTestId("position-selector-bass")).not.toBeNull();
  });
});
