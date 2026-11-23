// @ts-check
import React, { useState } from "react";
import KeyChordsRow from "./KeyChordsRow";
import { keyChordPills } from "../core/keyChoice";
import { chordsInWindow, describeChord, loopSteps, STEPS_PER_MEASURE, TIMELINE_LENGTHS, MAX_STEPS } from "../core/timeline";
import { generateChordsFromNNS, getNextChordSuggestions, toRoman } from "../core/theory";
import {
  chordsLength,
  insertChordAfter,
  isRepeat,
  playingChordIndex,
  progressionFromDoc,
  removeChord,
  replaceChord,
  resizeChords,
  setChordDuration,
  totalSteps,
} from "../core/progressionEdit";

/**
 * VMU-127 (lot 1) — the chord row at the head of the Studio's timeline: the
 * progression the loop plays, one box per chord, its width its duration (a
 * whole measure, or half of one). Touching a chord opens a small choice under
 * the row: the 7 chords of the key (VMU-219's pills) to replace it, "insert
 * after", "remove", "1 measure / ½ measure", and the next chords the theory
 * suggests, each placed after it in one touch. Above the row, the loop's
 * length: 1, 2, 4 or 8 measures.
 *
 * What it draws is the timeline document itself (useStudioMode's `timeline`):
 * the chords that start inside the window (core/timeline.js chordsInWindow),
 * and during playback the one covering the step that plays (chordAt) — the
 * very chord dispatch.js sounds and the MIDI export writes. It never computes
 * a chord of its own.
 *
 * Every edit goes through `editChords(operation)` with an operation of
 * core/progressionEdit.js; the first one copies what plays (useStudioMode).
 * Repeats — the copies a window adds after the edited chords — are drawn
 * dimmed and are not buttons: their source is the chord to touch.
 *
 * The row is ONE line: 4 measures a page (2 on a phone), the canvas validated
 * on 2026-09-21 (VMU-082, "4 mesures par page en 4K"); an 8-measure loop has
 * two pages, and during playback the row shows the page that plays. A chord
 * across a page's end is drawn on both. The help and the choice open over the
 * sequencers, not in the flow: at 3840 x 2045 the Studio fitted the window
 * with about 6px to spare, and the row's one line is all it may add (the A′
 * sequencer's spacing is tightened by as much, SequencerPanel `tight`).
 *
 * Parity registry: composer.progression (the row and its choice) and
 * composer.progression-longueur (the length); the controls of the choice exist
 * only once a chord is touched and are not registered one by one, as the pills
 * of composer.accords-tonalite are not.
 *
 * @param {Object} props
 * @param {Record<string, any>} props.T the page's own words (txt.protoA)
 * @param {import("../core/timeline").TimelineDoc} props.timeline what plays
 * @param {number} props.currentStep the step playback is on (-1 or stale when stopped)
 * @param {boolean} props.isPlaying
 * @param {import("../core/progressionEdit").EditedChord[]|null} props.editedChords
 *   the edited list of the variation that plays, null before a first edit
 * @param {(operation: (list: import("../core/progressionEdit").EditedChord[]) => import("../core/progressionEdit").EditedChord[]) => void} props.editChords
 * @param {string} props.notation "eu" | "us"
 * @param {(chord: any, index: number) => void} [props.onHear] plays and shows a
 *   chord (the page's handleChordClick)
 * @param {number} [props.measuresPerLine] measures a page: 4, or 2 on a phone
 */
export default function ChordLane({ T, timeline, currentStep, isPlaying, editedChords, editChords, notation, onHear, measuresPerLine = 4 }) {
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const [helpOpen, setHelpOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSteps = Math.min(timeline?.lengthMeasures ?? 4, measuresPerLine) * STEPS_PER_MEASURE;
  const pageCount = timeline ? Math.ceil(loopSteps(timeline) / pageSteps) : 1;
  if (!timeline || !timeline.key) return null;
  // During playback the row shows the page that plays, as the piano rolls do;
  // stopped, the page the user chose.
  const following = isPlaying && Number.isInteger(currentStep) && currentStep >= 0;
  const shownPage = following ? Math.floor(currentStep / pageSteps) % pageCount : Math.min(page, pageCount - 1);

  const key = timeline.key;
  const windowSteps = loopSteps(timeline);
  const spans = chordsInWindow(timeline).map((span) => ({ ...span, endStep: Math.min(span.endStep, windowSteps) }));
  // The list the next edit starts from: the edit, or a copy of what plays.
  const list = editedChords ?? progressionFromDoc(timeline);
  const nameOf = (/** @type {any} */ shown) => (notation === "us" ? shown.chordNameUS : shown.chordNameEU);
  const shownAt = spans.map(({ chord }) => describeChord(key, chord));
  const playingIndex = isPlaying ? playingChordIndex(timeline, currentStep) : null;
  const pills = keyChordPills(key.rootValue, key.scaleKey);
  const phrases = T.keyChordPhrases?.[pills.mode] || [];

  // The page shown: 4 measures (2 on a phone); a chord across a page's end is
  // drawn on both pages, each piece its own.
  const from = shownPage * pageSteps;
  const pieces = spans
    .map((span, index) => ({ index, start: Math.max(span.startStep, from), end: Math.min(span.endStep, from + pageSteps), span }))
    .filter((piece) => piece.end > piece.start);

  const isSelectable = (/** @type {number} */ index) => index < list.length && !isRepeat(editedChords, index);
  const choice = selected !== null && isSelectable(selected) ? selected : null;
  const fits = (/** @type {number} */ steps) => totalSteps(list) + steps <= MAX_STEPS;
  const chordsLen = editedChords ? chordsLength(editedChords) : timeline.lengthMeasures;
  // The window holds repeats: say why, and how to make them editable.
  const loopLonger = Boolean(editedChords) && windowSteps > totalSteps(/** @type {any[]} */ (editedChords));
  const loopNote = T.chordLoopLonger.replace("{n}", String(timeline.lengthMeasures));

  const hear = (/** @type {string} */ nns) => {
    if (!onHear) return;
    const [chord] = generateChordsFromNNS(key.rootValue, key.scaleKey, [nns]);
    if (chord) onHear(chord, 0);
  };
  const durationLabel = (/** @type {number} */ steps) => (steps >= STEPS_PER_MEASURE ? T.chordDurationWhole : T.chordDurationHalf);

  return (
    <section className="proto-a__chords" data-s1="chord-lane" data-fn="composer.progression" aria-label={T.chordLaneAria} data-playing-index={playingIndex ?? ""} data-playing-name={playingIndex !== null && shownAt[playingIndex] ? nameOf(shownAt[playingIndex]) : ""}>
      <div className="proto-a__chords-bar">
        <span className="proto-a__inst-title">{T.chordLaneTitle}</span>
        <button
          type="button"
          className={`proto-a__btn proto-a__btn--square ${helpOpen ? "is-active" : ""}`}
          aria-expanded={helpOpen}
          aria-label={T.chordLaneHelpButton}
          title={T.chordLaneHelpButton}
          data-fn="composer.progression-aide"
          onClick={() => setHelpOpen((open) => !open)}
        >
          ?
        </button>
        <div className="proto-a__chords-boxes" style={{ gridTemplateColumns: `repeat(${pageSteps / 8}, minmax(0, 1fr))` }}>
          {pieces.map(({ index, start, end, span }) => {
            const shown = shownAt[index];
            const column = `${(start - from) / 8 + 1} / span ${(end - start) / 8}`;
            const playing = playingIndex === index;
            const attrs = {
              "data-chord-index": index,
              "data-start-step": span.startStep,
              "data-end-step": span.endStep,
              "data-chord-name": nameOf(shown),
              // What the box stands for, for the probes: the root and the type
              // its name is drawn from (timeline.js describeChord).
              "data-chord-root": span.chord.rootPc,
              "data-chord-type": span.chord.type,
            };
            const label = (
              <>
                <span className="proto-a__chord-name">{nameOf(shown)}</span>
                <span className="proto-a__chord-roman">{toRoman(shown.nns)}</span>
              </>
            );
            if (!isSelectable(index)) {
              return (
                <div key={`${index}-${start}`} className={`proto-a__chord is-repeat ${playing ? "is-playing" : ""}`} style={{ gridColumn: column }} title={T.chordRepeatHint} {...attrs}>
                  {label}
                </div>
              );
            }
            return (
              <button
                key={`${index}-${start}`}
                type="button"
                className={`proto-a__chord ${choice === index ? "is-active" : ""} ${playing ? "is-playing" : ""}`}
                style={{ gridColumn: column }}
                aria-pressed={choice === index}
                aria-label={`${T.chordPickerTitle.replace("{n}", String(index + 1))} : ${nameOf(shown)}, ${durationLabel(span.endStep - span.startStep)}`}
                onClick={() => {
                  setSelected(choice === index ? null : index);
                  if (choice !== index && onHear) onHear(shown, index);
                }}
                {...attrs}
              >
                {label}
              </button>
            );
          })}
        </div>
        {loopLonger && (
          <button
            type="button"
            className="proto-a__btn proto-a__btn--square"
            data-testid="chord-loop-note"
            aria-label={loopNote}
            title={loopNote}
            onClick={() => setHelpOpen(true)}
          >
            ↻
          </button>
        )}
        {pageCount > 1 && (
          <div className="proto-a__segments" role="group" aria-label={T.chordPagesGroup} data-testid="chord-pages">
            {Array.from({ length: pageCount }, (_, p) => (
              <button
                key={p}
                type="button"
                className={`proto-a__segment ${shownPage === p ? "is-active" : ""}`}
                aria-pressed={shownPage === p}
                aria-label={T.chordPage.replace("{n}", String(p + 1)).replace("{from}", String(p * (pageSteps / STEPS_PER_MEASURE) + 1)).replace("{to}", String((p + 1) * (pageSteps / STEPS_PER_MEASURE)))}
                data-page={p}
                onClick={() => setPage(p)}
              >
                {p + 1}
              </button>
            ))}
          </div>
        )}
        <div className="proto-a__chords-length" role="group" aria-label={T.chordLengthGroup} title={T.chordLengthHelp} data-fn="composer.progression-longueur">
          <span className="proto-a__muted">{T.chordLengthGroup}</span>
          <div className="proto-a__segments">
            {TIMELINE_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                className={`proto-a__segment ${chordsLen === n ? "is-active" : ""}`}
                aria-pressed={chordsLen === n}
                aria-label={`${n} ${n > 1 ? T.chordMeasures : T.chordMeasure}`}
                data-length={n}
                onClick={() => {
                  setSelected(null);
                  editChords((l) => resizeChords(l, n));
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="proto-a__muted">{T.chordMeasures}</span>
        </div>
      </div>
      {/* The help and the choice open OVER what follows (absolute, under
          the bar): the row keeps its one line, the page its height. */}
      {helpOpen && (
        <div className="proto-a__chords-pop proto-a__chords-help" role="note">
          <p>{T.chordLaneHelp}</p>
          {loopLonger && <p>{loopNote}</p>}
          <button type="button" className="proto-a__btn" onClick={() => setHelpOpen(false)}>
            {T.close}
          </button>
        </div>
      )}

      {choice !== null && (
        <ChordChoice
          T={T}
          index={choice}
          list={list}
          name={nameOf(shownAt[choice])}
          roman={toRoman(shownAt[choice].nns)}
          nns={shownAt[choice].nns}
          pills={pills}
          phrases={phrases}
          notation={notation}
          fits={fits}
          keyRoot={key.rootValue}
          scaleKey={key.scaleKey}
          onReplace={(nns) => {
            editChords((l) => replaceChord(l, choice, nns));
            hear(nns);
          }}
          onInsertAfter={(nns) => {
            const steps = fits(STEPS_PER_MEASURE) ? STEPS_PER_MEASURE : STEPS_PER_MEASURE / 2;
            editChords((l) => insertChordAfter(l, choice, nns, steps));
            setSelected(choice + 1);
            hear(nns);
          }}
          onRemove={() => {
            editChords((l) => removeChord(l, choice));
            setSelected(null);
          }}
          onDuration={(steps) => editChords((l) => setChordDuration(l, choice, steps))}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/**
 * The French reasons theory.js's getNextChordSuggestions gives, mapped to the
 * page's own words (it is read, not changed, by this ticket).
 *
 * @param {Record<string, any>} T
 * @param {string} reason
 */
function reasonText(T, reason) {
  const R = T.chordReasons || {};
  if (reason.startsWith("Enchaînement diatonique")) return R.diatonic ?? reason;
  const aim = /^Transformation en dominante pour viser (.+)$/.exec(reason);
  if (aim) return (R.dominantFor ?? reason).replace("{target}", aim[1]);
  if (reason.startsWith("Mouvement vers la dominante")) return R.toDominant ?? reason;
  if (reason.startsWith("Mouvement vers la relative mineure")) return R.toRelative ?? reason;
  if (reason.startsWith("Résolution naturelle")) return R.secondary ?? reason;
  return reason;
}

/**
 * The choice under the row, for the touched chord.
 *
 * @param {Object} props
 * @param {Record<string, any>} props.T
 * @param {number} props.index
 * @param {import("../core/progressionEdit").EditedChord[]} props.list
 * @param {string} props.name
 * @param {string} props.roman
 * @param {string} props.nns
 * @param {any[] & { mode: "major"|"minor" }} props.pills
 * @param {string[]} props.phrases
 * @param {string} props.notation
 * @param {(steps: number) => boolean} props.fits
 * @param {number} props.keyRoot
 * @param {string} props.scaleKey
 * @param {(nns: string) => void} props.onReplace
 * @param {(nns: string) => void} props.onInsertAfter
 * @param {() => void} props.onRemove
 * @param {(steps: number) => void} props.onDuration
 * @param {() => void} props.onClose
 */
function ChordChoice({ T, index, list, name, roman, nns, pills, phrases, notation, fits, keyRoot, scaleKey, onReplace, onInsertAfter, onRemove, onDuration, onClose }) {
  const current = list[index];
  const half = STEPS_PER_MEASURE / 2;
  const suggestions = getNextChordSuggestions(nns)
    .map((/** @type {{ chord: string, reason: string }} */ s) => {
      const [chord] = generateChordsFromNNS(keyRoot, scaleKey, [s.chord]);
      if (!chord) return null;
      const pill = pills.find((p) => p.chord.rootNote?.value === chord.rootNote?.value && p.nns === chord.nns);
      return {
        nns: chord.nns,
        roman: toRoman(s.chord),
        name: notation === "us" ? chord.chordNameUS : chord.chordNameEU,
        // A chord of the key says what it does in plain words (the pills'
        // phrases); another one keeps the theory's reason.
        why: pill ? phrases[pill.degree - 1] ?? reasonText(T, s.reason) : reasonText(T, s.reason),
      };
    })
    .filter(Boolean);

  return (
    <div className="proto-a__chords-pop proto-a__chord-choice" data-testid="chord-choice" aria-label={`${T.chordPickerTitle.replace("{n}", String(index + 1))} : ${name}`}>
      <div className="proto-a__chord-choice-head">
        <span className="proto-a__inst-title">
          {T.chordPickerTitle.replace("{n}", String(index + 1))} : {name} ({roman})
        </span>
        <div className="proto-a__spacer" />
        <button type="button" className="proto-a__btn" data-fn="composer.progression-fermer" onClick={onClose}>
          {T.close}
        </button>
      </div>
      <KeyChordsRow
        T={{ ...T, keyChordsLabel: T.chordReplaceLabel, keyChordsAria: T.chordReplaceAria, keyChordHint: T.chordReplaceHint }}
        pills={pills}
        notation={notation}
        onTouch={(pill) => onReplace(pill.nns)}
        fn="composer.progression-remplacer"
        testId="chord-replace"
        s1="chord-replace"
      />
      <div className="proto-a__chord-actions">
        <button
          type="button"
          className="proto-a__btn"
          data-fn="composer.progression-inserer"
          disabled={!fits(half)}
          title={fits(half) ? T.chordInsertHint : T.chordFull}
          onClick={() => onInsertAfter(current.nns)}
        >
          {T.chordInsertAfter}
        </button>
        <button type="button" className="proto-a__btn" data-fn="composer.progression-retirer" disabled={list.length <= 1} onClick={onRemove}>
          {T.chordRemove}
        </button>
        <div className="proto-a__chords-length" role="group" aria-label={T.chordDurationGroup} data-fn="composer.progression-duree">
          <span className="proto-a__muted">{T.chordDurationGroup}</span>
          <div className="proto-a__segments">
            {[STEPS_PER_MEASURE, half].map((steps) => (
              <button
                key={steps}
                type="button"
                className={`proto-a__segment ${current.durationSteps === steps ? "is-active" : ""}`}
                aria-pressed={current.durationSteps === steps}
                data-duration={steps}
                disabled={current.durationSteps !== steps && !fits(steps - current.durationSteps)}
                onClick={() => onDuration(steps)}
              >
                {steps === STEPS_PER_MEASURE ? T.chordDurationWhole : T.chordDurationHalf}
              </button>
            ))}
          </div>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="proto-a__chord-suggestions" role="group" aria-label={T.chordSuggestionsLabel} data-fn="composer.progression-suggestions">
          <span className="proto-a__muted">{T.chordSuggestionsLabel}</span>
          {suggestions.map((s) => s && (
            <button
              key={s.nns}
              type="button"
              className="proto-a__btn proto-a__chord-suggestion"
              data-suggestion={s.nns}
              disabled={!fits(half)}
              aria-label={`${T.chordPlaceAfter} : ${s.name} (${s.roman}), ${s.why}`}
              onClick={() => onInsertAfter(s.nns)}
            >
              <span className="proto-a__chord-name">
                {s.name} <span className="proto-a__chord-roman">{s.roman}</span>
              </span>
              <span className="proto-a__chord-why">{s.why}</span>
              <span className="proto-a__chord-place">{T.chordPlaceAfter}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
