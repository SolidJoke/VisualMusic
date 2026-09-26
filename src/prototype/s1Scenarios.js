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
