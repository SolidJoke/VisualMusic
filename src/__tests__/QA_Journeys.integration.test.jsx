import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../context/AppContext";
import AppRouter from "../AppRouter";
import AppDesktop from "../AppDesktop";
import { BREAKPOINTS } from "../hooks/useBreakpoint";

// Mocking Tone.js with full context structure to prevent errors
vi.mock("tone", () => ({
  start: vi.fn(),
  now: vi.fn(() => 0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  context: { lookAhead: 0.1 },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  Draw: { schedule: vi.fn() },
  Destination: { volume: { value: 0, rampTo: vi.fn() } },
  Analyser: vi.fn(() => ({
    dispose: vi.fn(),
  })),
}));

// Mocking AudioEngine
vi.mock("../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  setBpm: vi.fn(),
  startAudioEngine: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

describe("QA Testing Sessions - Integration Journeys", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  describe("Journey 1 : Mode Dictionnaire (Stabilité Fretboard & Playback)", () => {
    it("devrait charger le dictionnaire, sélectionner Hirajoshi en C#, tester le playback et le mixer", async () => {
      // 1. Render AppDesktop with Desktop layout
      const { container } = render(
        <AppProvider>
          <AppDesktop />
        </AppProvider>
      );

      // 2. Open Studio Modal
      const studioBtn = screen.getByText(/Studio & Harmonie/i);
      fireEvent.click(studioBtn);

      // Verify default state is studio
      expect(screen.getByTestId("studio-panel")).toBeDefined();

      // 2. Basculer en mode Dictionnaire
      const dictBtn = screen.getByTestId("btn-mode-dictionary");
      fireEvent.click(dictBtn);
      expect(screen.getByTestId("dictionary-panel")).toBeDefined();

      // 3. Sélectionner C# (value 1) comme fondamentale
      const selectRoot = screen.getByTestId("select-root-note");
      fireEvent.change(selectRoot, { target: { value: "1" } });

      // 4. Sélectionner le type de dictionnaire Gammes (Note/Chord/Scale)
      const scaleSegmentBtn = screen.getByRole("button", { name: /gammes/i });
      fireEvent.click(scaleSegmentBtn);

      // Vérifier que le sélecteur de gammes est présent. 
      // Le composant Fretboard doit être affiché.
      const instrumentView = screen.getByTestId("instrument-view");
      expect(instrumentView).toBeDefined();

      // 5. Cliquer sur le bouton Play/Stop pour le Playback (Sidebar)
      const playbackBtn = document.querySelector(".btn-playback-premium");
      expect(playbackBtn).toBeDefined();
      fireEvent.click(playbackBtn);

      // 6. Ouvrir la modale Instrument & Audio puis le PlaybackPanel (Mixer)
      const audioBtn = screen.getByText(/Instruments & Audio/i);
      fireEvent.click(audioBtn);

      const sliders = document.querySelectorAll(".premium-slider");
      expect(sliders.length).toBeGreaterThan(0);
      
      // On teste qu'on peut changer la valeur d'un slider (ex: kick ou bass)
      const bassSlider = sliders[3]; // Bass synth ou autre instrument
      fireEvent.change(bassSlider, { target: { value: "-10" } });
      
      // Pas de crash !
      expect(screen.getByTestId("dictionary-panel")).toBeDefined();
    });
  });

  describe("Journey 2 : Mode Studio (Séquenceur & Voice Leading)", () => {
    it("devrait démarrer la progression, modifier le BPM et l'instrument", async () => {
      const { container } = render(
        <AppProvider>
          <AppDesktop />
        </AppProvider>
      );

      // 1. Ouvrir la modale et vérifier StudioPanel
      const studioBtn = screen.getByText(/Studio & Harmonie/i);
      fireEvent.click(studioBtn);
      expect(screen.getByTestId("studio-panel")).toBeDefined();

      // Lancer la lecture générale via la classe .btn-playback-premium
      const playBtn = document.querySelector(".btn-playback-premium");
      expect(playBtn).toBeDefined();
      fireEvent.click(playBtn);

      // Ouvrir le panneau de réglages instruments (nouvelle modale)
      const settingsBtn = screen.getByText(/Instruments & Audio/i);
      fireEvent.click(settingsBtn);

      // 3. Changer le preset d'instrument
      const pianoBtn = screen.getByRole("button", { name: /piano/i });
      fireEvent.click(pianoBtn);

      const guitarBtn = screen.getByRole("button", { name: /guit/i });
      fireEvent.click(guitarBtn);

      expect(screen.getByTestId("studio-panel")).toBeDefined();
    });
  });

  describe("Journey 3 : AppRouter & useBreakpoint Responsive", () => {
    const setupBreakpointMock = (breakpointName) => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        let matches = false;
        if (breakpointName === BREAKPOINTS.PHONE) {
          matches = query.includes("max-width: 767px");
        } else if (breakpointName === BREAKPOINTS.TABLET) {
          matches = query.includes("min-width: 768px") && query.includes("max-width: 2559px");
        } else if (breakpointName === BREAKPOINTS.DESKTOP) {
          matches = query.includes("min-width: 2560px");
        }
        return {
          matches,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
      });
    };

    it("devrait monter AppDesktop pour le breakpoint DESKTOP", async () => {
      setupBreakpointMock(BREAKPOINTS.DESKTOP);

      render(
        <AppProvider>
          <AppRouter />
        </AppProvider>
      );

      // Wait for it to be ready
      const studioBtn = await screen.findByText(/Studio & Harmonie/i);
      fireEvent.click(studioBtn);
      expect(await screen.findByTestId("studio-panel")).toBeDefined();
    });

    it("devrait monter AppTablet pour le breakpoint TABLET", async () => {
      setupBreakpointMock(BREAKPOINTS.TABLET);

      render(
        <AppProvider>
          <AppRouter />
        </AppProvider>
      );

      // Tablet s'affiche (AppTablet délègue actuellement à AppDesktop)
      const studioBtn = await screen.findByText(/Studio & Harmonie/i);
      fireEvent.click(studioBtn);
      expect(await screen.findByTestId("studio-panel")).toBeDefined();
    });

    it("devrait monter AppMobile pour le breakpoint PHONE", async () => {
      setupBreakpointMock(BREAKPOINTS.PHONE);

      render(
        <AppProvider>
          <AppRouter />
        </AppProvider>
      );

      // Mobile layout delegate to AppDesktop, so it renders the normal components
      const titles = await screen.findAllByRole("heading", { level: 1 });
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});
