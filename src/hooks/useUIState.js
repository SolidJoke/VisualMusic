import { useState } from "react";

export function useUIState() {
  const [lang, setLang] = useState("fr");
  const [notation, setNotation] = useState("us");
  const [chordDisplayMode, setChordDisplayMode] = useState("standard");
  const [showAbout, setShowAbout] = useState(false);
  const [showTheory, setShowTheory] = useState(false);
  const [showFingering, setShowFingering] = useState(false);
  const [fingeringMode, setFingeringMode] = useState("numeric");
  const [playbackInstrument, setPlaybackInstrument] = useState("piano");
  const [layoutMode, setLayoutMode] = useState("all");
  const [activeTab, setActiveTab] = useState("sequencer");

  return {
    lang, setLang,
    notation, setNotation,
    chordDisplayMode, setChordDisplayMode,
    showAbout, setShowAbout,
    showTheory, setShowTheory,
    showFingering, setShowFingering,
    fingeringMode, setFingeringMode,
    playbackInstrument, setPlaybackInstrument,
    layoutMode, setLayoutMode,
    activeTab, setActiveTab
  };
}
