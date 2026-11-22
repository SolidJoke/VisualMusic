// @ts-check
import React, { useState } from "react";

/**
 * VMU-219 - "Les 7 accords de la tonalité": a row of seven pills under the
 * Studio's selection row, one per degree of the loop's key, each with the
 * chord's name and its Roman numeral.
 *
 * It is for the two ways people come to the Studio: someone who wants a piece
 * in five minutes and does not know what a "V" is, and someone who composes in
 * a DAW and wants to see which chords belong to the key of their project. A
 * touch plays the chord and shows it on the instrument (the page's own
 * handleChordClick - the Studio's chord buttons use the same one), and says in
 * one sentence what the chord does in the key. It never edits the loop.
 *
 * Nothing is owned here but which pill was touched last (the sentence under the
 * pills). The chords are core/keyChoice.js's (keyChordPills); the words are
 * translations.js's (protoA.keyChordPhrases, by the key's tonic quality).
 *
 * Parity-registry name: composer.accords-tonalite, on the group (src/prototype/aPrimeAccess.js).
 *
 * Props:
 *   T            the page's own words (txt.protoA)
 *   pills        keyChordPills(...): the seven chords, with `mode` ("major" | "minor")
 *   notation     "eu" | "us": the chord names
 *   onTouch      (pill) => void: plays and shows the chord
 *
 * The page remounts this row (a `key`) when the key changes, so the sentence of
 * a chord of the old key is never read under the new one.
 *
 * @param {Object} props
 * @param {Record<string, any>} props.T
 * @param {any[] & { mode: "major"|"minor" }} props.pills
 * @param {string} props.notation
 * @param {(pill: any) => void} props.onTouch
 */
export default function KeyChordsRow({ T, pills, notation, onTouch }) {
  const [touched, setTouched] = useState(/** @type {number|null} */ (null));
  const phrases = T.keyChordPhrases?.[pills.mode] || [];
  const sentence = (/** @type {any} */ pill) => `${pill.roman} : ${phrases[pill.degree - 1] ?? ""}`;
  const nameOf = (/** @type {any} */ pill) => (notation === "us" ? pill.chord.chordNameUS : pill.chord.chordNameEU);
  const shown = touched === null ? null : pills.find((pill) => pill.degree === touched);

  return (
    <div className="proto-a__keychords-row" data-s1="keychords">
      <span className="proto-a__muted">{T.keyChordsLabel}</span>
      <div
        className="proto-a__keychords"
        role="group"
        aria-label={T.keyChordsAria}
        data-testid="key-chords"
        data-fn="composer.accords-tonalite"
      >
        {pills.map((pill) => (
          <button
            key={pill.degree}
            type="button"
            className={`proto-a__keychord ${touched === pill.degree ? "is-active" : ""}`}
            aria-pressed={touched === pill.degree}
            aria-label={`${nameOf(pill)}, ${sentence(pill)}`}
            title={sentence(pill)}
            onClick={() => {
              setTouched(pill.degree);
              onTouch(pill);
            }}
          >
            <span className="proto-a__keychord-name">{nameOf(pill)}</span>
            <span className="proto-a__keychord-roman">{pill.roman}</span>
          </button>
        ))}
      </div>
      <span className="proto-a__keychord-phrase" data-testid="key-chord-phrase" aria-live="polite">
        {shown ? sentence(shown) : T.keyChordHint}
      </span>
    </div>
  );
}
