/**
 * What a neck's position panel decides — shared by the classic page's
 * PositionSelector (components/Layout/PositionSelector.jsx) and A′'s position
 * panel (src/prototype/PositionPanel.jsx, L1b-1c), next to placementLabel.js
 * (the label and the cycle): one copy of the rules, so the two pages cannot
 * disagree. Pure: no React, no state.
 *
 * Strings are fingeringLogic.js' indices, counted from the high string: on the
 * guitar the low E, A and D strings are 5, 4 and 3; the bass (E A D G) 3, 2, 1.
 */
import { NOTES } from "../../core/theory";

/** The three strings a root can be put on, per neck: index and open-string pitch class. */
const ROOT_STRINGS = {
  guitar: [{ idx: 5, openVal: 4 }, { idx: 4, openVal: 9 }, { idx: 3, openVal: 2 }],
  bass: [{ idx: 3, openVal: 4 }, { idx: 2, openVal: 9 }, { idx: 1, openVal: 2 }],
};

/**
 * "Fondamentale sur": for a root, each string it can go on, its note name in the
 * page's notation and the fret the root lies on (0 = the open string).
 *
 * @param {{instrumentType: string, rootVal: number, notation: string}} args
 * @returns {Array<{idx: number, openVal: number, label: string, fret: number, isOpen: boolean}>}
 */
export function rootStringChoices({ instrumentType, rootVal, notation }) {
  const strings = instrumentType === "guitar" ? ROOT_STRINGS.guitar : ROOT_STRINGS.bass;
  return strings.map((s) => {
    const note = NOTES[s.openVal % 12];
    const fret = (rootVal - s.openVal + 12) % 12;
    return { ...s, label: notation === "eu" ? note.eu : note.us, fret, isOpen: fret === 0 };
  });
}

/**
 * Which warning a fingering earns — the guitar only, the graver one alone. The
 * engine hands out `isOutOfRange` (fingeringLogic.js, useMusicEngine.js); the
 * classic page read `outOfRange`, which nothing produces, and never warned.
 *
 * @param {{instrumentType: string, fingering?: any}} args
 */
export function positionAlerts({ instrumentType, fingering }) {
  if (instrumentType !== "guitar") return { outOfRange: false, difficultStretch: false };
  const outOfRange = Boolean(fingering?.isOutOfRange);
  return { outOfRange, difficultStretch: Boolean(fingering?.difficultStretch) && !outOfRange };
}

/**
 * When each reset is offered: the focus one for a scale with an anchor, the
 * position one as soon as a position is chosen (index 0 included).
 *
 * @param {{isScaleMode: boolean, scaleAnchor?: any, placementIndex: number|null}} args
 */
export function positionResets({ isScaleMode, scaleAnchor, placementIndex }) {
  return { focus: Boolean(isScaleMode && scaleAnchor), position: placementIndex !== null };
}

/**
 * Everything the panel shows for one neck, and whether it is worth opening.
 * `range` is the instrument's range as the instrument bar's tile writes it
 * (formatPitchRange(realizationRange(...)): empty when it has none).
 *
 * @param {Object} args
 * @param {string} args.instrumentType 'guitar' | 'bass'
 * @param {number} args.rootVal
 * @param {string} args.notation
 * @param {boolean} args.isScaleMode
 * @param {any} [args.scaleAnchor]
 * @param {number|null} args.placementIndex
 * @param {any} [args.fingering]
 * @param {string} [args.range]
 */
export function positionPanelView({ instrumentType, rootVal, notation, isScaleMode, scaleAnchor = null, placementIndex, fingering = null, range = "" }) {
  const rootStrings = isScaleMode ? null : rootStringChoices({ instrumentType, rootVal, notation });
  const resets = positionResets({ isScaleMode, scaleAnchor, placementIndex });
  const alerts = positionAlerts({ instrumentType, fingering });
  const barre = instrumentType === "guitar";
  const alert = alerts.outOfRange ? "outOfRange" : alerts.difficultStretch ? "difficultStretch" : null;
  const hasContent = Boolean(rootStrings || resets.focus || resets.position || alert || barre || range);
  return { rootStrings, resets, alerts, alert, barre, range, hasContent };
}
