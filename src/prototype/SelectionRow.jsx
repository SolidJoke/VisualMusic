import React, { useMemo } from "react";
import CustomSelect from "../components/Common/CustomSelect";
import {
  styleOptions,
  rootNoteOptions,
  getGroupedChords,
  getGroupedScales,
  chordOptions,
  scaleOptions,
  familyOptions,
  dictFamily,
  dictTypeForFamily,
} from "../core/selectionOptions";

/**
 * VMU-185 - the direct selectors of A′: the second row of the transport block
 * (PrototypeA.jsx, next to the tempo, the metronome and the volume).
 *
 *   Studio      the style menu.
 *   Dictionary  the family (a note / chords / scales), the root note, and the
 *               type of chord or of scale - none for a single note, which has
 *               no type.
 *
 * Gabriel (2026-10-10): the Assistant drawer holds these controls but hides the
 * necks and adds a step; he changes style, note or chord type "sans quitter le
 * clavier ou les manches".
 *
 * Nothing is owned here. The lists, their names and the family <-> dictType
 * rule are src/core/selectionOptions.js's, the very functions the drawer's
 * StudioPanel / DictionaryPanel / DictChordPanel call; the state and its setters
 * are the page's (AppDesktop's), the ones the drawer calls too. So a click here
 * does exactly what the same click in the drawer does (VMU-126's silent reset of
 * the Studio's edits when a style changes included - not fixed here), and the
 * open drawer shows the same state as this row.
 *
 * Parity-registry names (src/prototype/aPrimeAccess.js): composer.style,
 * dico.famille, dico.fondamentale, dico.type-accord, dico.type-gamme - each on
 * the visible control, and only where the control exists.
 *
 * Props:
 *   T                the page's own words (txt.protoA)
 *   txt              the page's whole table (the names of chords, scales, families)
 *   lang, notation  the page's language and note names
 *   isDictionary     the mode
 *   currentBrickIndex, setCurrentBrickIndex   the Studio's style (index in BRICKS)
 *   dictRoot, setDictRoot, dictType, setDictType   the Dictionary's selection
 */
export default function SelectionRow({
  T,
  txt,
  lang,
  notation,
  isDictionary,
  currentBrickIndex,
  setCurrentBrickIndex,
  dictRoot,
  setDictRoot,
  dictType,
  setDictType,
}) {
  const family = dictFamily(dictType);
  const styles = useMemo(() => styleOptions(lang), [lang]);
  const roots = useMemo(() => rootNoteOptions(notation), [notation]);
  const chords = useMemo(() => chordOptions(getGroupedChords(), txt), [txt]);
  const scales = useMemo(() => scaleOptions(getGroupedScales(), txt), [txt]);
  const families = useMemo(() => familyOptions(txt), [txt]);

  return (
    <div className="proto-a__selection" data-s1="selection" role="group" aria-label={T.selectionAria}>
      {!isDictionary && (
        <div className="proto-a__field proto-a__field--style" role="group" aria-label={T.selectionStyle}>
          <span className="proto-a__muted" aria-hidden="true">{T.selectionStyle}</span>
          <CustomSelect
            data-fn="composer.style"
            data-testid="selection-style"
            value={currentBrickIndex}
            onChange={(val) => setCurrentBrickIndex && setCurrentBrickIndex(Number(val))}
            options={styles}
          />
        </div>
      )}

      {isDictionary && (
        <>
          <div className="proto-a__field" role="group" aria-label={T.selectionFamily}>
            <span className="proto-a__muted" aria-hidden="true">{T.selectionFamily}</span>
            <div className="proto-a__family" data-fn="dico.famille">
              {families.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`proto-a__family-btn ${family === f.key ? "is-active" : ""}`}
                  aria-pressed={family === f.key}
                  onClick={() => setDictType(dictTypeForFamily(f.key))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="proto-a__field proto-a__field--root" role="group" aria-label={T.selectionRoot}>
            <span className="proto-a__muted" aria-hidden="true">{T.selectionRoot}</span>
            <CustomSelect
              data-fn="dico.fondamentale"
              data-testid="selection-root-note"
              value={dictRoot}
              onChange={(val) => setDictRoot(val)}
              options={roots}
            />
          </div>

          {family === "chord" && (
            <div className="proto-a__field proto-a__field--type" role="group" aria-label={T.selectionType}>
              <span className="proto-a__muted" aria-hidden="true">{T.selectionType}</span>
              <CustomSelect
                data-fn="dico.type-accord"
                data-testid="selection-chord-type"
                value={dictType}
                onChange={(val) => setDictType(val)}
                options={chords}
              />
            </div>
          )}

          {family === "scale" && (
            <div className="proto-a__field proto-a__field--type" role="group" aria-label={T.selectionType}>
              <span className="proto-a__muted" aria-hidden="true">{T.selectionType}</span>
              <CustomSelect
                data-fn="dico.type-gamme"
                data-testid="selection-scale-type"
                value={dictType}
                onChange={(val) => setDictType(val)}
                options={scales}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
