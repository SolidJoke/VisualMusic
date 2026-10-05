/**
 * The S1 scenarios and label modes, shared by the prototype page
 * (PrototypeA.jsx) and the probe that measures it (scripts/s1_probe.mjs):
 * one list, so the probe cannot test a scenario the page does not offer.
 * Plain data, no import: node reads this file directly.
 */

export const S1_SCENARIOS = [
  { id: "cmaj", label: "Do majeur", dictRoot: 0, dictType: "chord_major" },
  { id: "gsm7", label: "Sol♯m7", dictRoot: 8, dictType: "chord_m7" },
  { id: "cmajscale", label: "Gamme de Do majeur", dictRoot: 0, dictType: "scale_major" },
  { id: "apenta", label: "La pentatonique mineure", dictRoot: 9, dictType: "scale_pentatonic_minor" },
];

// The label modes the app can actually show (S1 brief: "dis lesquels existent
// vraiment"). There is no "degrees" switch in the app: a degree replaces the
// name by itself wherever the engine knows one (chord tones, a scale's root),
// see core/fretboardUtils.js resolveRoleAndLabel. Finger numbers are the
// showFingerNumbers setting (ControlPanel.jsx), chords only.
export const S1_LABEL_MODES = [
  { id: "eu", label: "Noms Do Ré Mi", notation: "eu", fingers: false },
  { id: "us", label: "Noms C D E", notation: "us", fingers: false },
  { id: "fingers", label: "Doigts", notation: "eu", fingers: true },
];

// L1a — states the four scenarios do not reach (L1 study, fact 0.4 and
// "mode harmonique"): the Dictionary's octave selector at +3, the Studio's
// base octave at +2 with a chord clicked, and the harmonic mode. Each is a
// button of the prototype page (data-state="<id>"), so the probe and Gabriel
// reach it the same way; the Studio one plays its chord, which needs a real
// click (no audio context starts without one).
//   scenario   — one of S1_SCENARIOS above (Dictionary states)
//   dictOctave — the Dictionary's octave selector, -3..+3
//   harmonic   — the Dictionary's harmonic mode
//   studio     — { chordOctaveOffset, chordIndex }: the Studio's "Octave de
//                base", then a click on that chord of the style's progression
export const S1_EXTRA_STATES = [
  { id: "dict-oct3", label: "Do majeur · octave +3", scenario: "cmaj", dictOctave: 3 },
  { id: "studio-oct2", label: "Studio · octave +2 · 1er accord", studio: { chordOctaveOffset: 2, chordIndex: 0 } },
  { id: "harm-cmaj", label: "Harmonique · Do majeur", scenario: "cmaj", harmonic: true },
  { id: "harm-gsm7", label: "Harmonique · Sol♯m7", scenario: "gsm7", harmonic: true },
  { id: "harm-cmajscale", label: "Harmonique · gamme de Do", scenario: "cmajscale", harmonic: true },
  { id: "harm-apenta", label: "Harmonique · La penta mineure", scenario: "apenta", harmonic: true },
];
