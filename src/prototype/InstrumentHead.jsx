import React, { useEffect, useId, useRef, useState } from "react";
import { PlayGlyph } from "../components/Instruments/InstrumentBar";

/**
 * L1b-1b — the head of one instrument column of A′ (?prototype=a), the same
 * for the piano, the guitar and the bass: --proto-head-h high (100px), two rows.
 *
 *   row 1  the instrument's name, a toggle: it chooses the instrument that
 *          sounds (aria-pressed = playbackInstrument), without playing it, in
 *          both modes; then ▶ (Dictionary only), which plays that instrument
 *          now and makes it the chosen one (playInstrument(id), INST-A2).
 *   row 2  the instrument's own setting: ‹ label › — the piano's octave, a
 *          neck's position — or, read-only, the label alone (the Studio's
 *          shape); empty when there is nothing to set (a neck without the
 *          fingering shown, or the Studio before any chord): the row keeps its
 *          height either way, so the three heads stay the same.
 *
 * L1b-1c: when `setting.panel` is given (the necks, once there is something to
 * show), the label is a button that opens a small panel over the top of the
 * neck, without adding height - the panel is out of the flow, anchored under the
 * row. Escape and a press outside close it, the focus returns to the button; a
 * warning sign next to the label shows an active alert with the panel closed.
 *
 * Presentational: what each control does, and every word it shows, comes from
 * PrototypeA (translations.js protoA, VMU-182). Each control carries its name in
 * the parity registry (data-fn, src/prototype/aPrimeAccess.js).
 *
 * @param {Object} props
 * @param {'piano'|'guitar'|'bass'} props.id
 * @param {string} props.name
 * @param {string} props.chooseTitle the name's tooltip: it chooses, it does not play
 * @param {boolean} props.selected
 * @param {() => void} props.onSelect
 * @param {{label: string, onPlay: () => void}|null} [props.play] ▶, or none
 * @param {{
 *   groupLabel: string,
 *   label: string|null,
 *   prev?: {fn: string, label: string, disabled?: boolean, onClick: () => void},
 *   next?: {fn: string, label: string, disabled?: boolean, onClick: () => void},
 *   panel?: {fn: string, title: string, alert: {kind: string, text: string}|null, content: React.ReactNode}|null,
 * }|null} [props.setting] row 2, or an empty row
 */
export default function InstrumentHead({ id, name, chooseTitle, selected, onSelect, play = null, setting = null }) {
  const panel = (setting && setting.panel) || null;
  const hasPanel = Boolean(panel);
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const panelOpen = open && hasPanel;
  // A panel that has nothing to show any more (the Studio before a chord) closes:
  // reset while rendering (React's way to adjust state to a prop), not in an effect.
  if (!hasPanel && open) setOpen(false);
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      if (buttonRef.current) buttonRef.current.focus();
    };
    const onPointerDown = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [panelOpen]);
  const arrow = (a, glyph) =>
    a ? (
      <button
        type="button"
        className="proto-a__head-btn proto-a__head-arrow"
        aria-label={a.label}
        title={a.label}
        data-fn={a.fn}
        disabled={Boolean(a.disabled)}
        onClick={a.onClick}
      >
        {glyph}
      </button>
    ) : null;
  const readOnly = setting && !setting.prev && !setting.next;

  return (
    <div className="proto-a__inst-head" data-head={id}>
      <div className="proto-a__head-row">
        <button
          type="button"
          className={`proto-a__head-name ${selected ? "is-active" : ""}`}
          aria-pressed={Boolean(selected)}
          title={chooseTitle}
          data-fn={`jouer.instrument-tuile-${id}`}
          onClick={onSelect}
        >
          {name}
        </button>
        {play && (
          <button
            type="button"
            className="proto-a__head-btn proto-a__head-play"
            aria-label={play.label}
            title={play.label}
            data-fn={`jouer.instrument-play-${id}`}
            onClick={play.onPlay}
          >
            <PlayGlyph />
          </button>
        )}
      </div>
      <div
        ref={rowRef}
        className={`proto-a__head-row proto-a__head-setting ${readOnly ? "is-readonly" : ""}`}
        role={setting ? "group" : undefined}
        aria-label={setting ? setting.groupLabel : undefined}
      >
        {setting && arrow(setting.prev, "‹")}
        {setting && !panel && <span className="proto-a__head-label">{setting.label || ""}</span>}
        {setting && panel && (
          <button
            ref={buttonRef}
            type="button"
            className="proto-a__head-labelbtn"
            title={panel.title}
            data-fn={panel.fn}
            aria-haspopup="dialog"
            aria-expanded={panelOpen}
            aria-controls={panelOpen ? panelId : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="proto-a__head-label">{setting.label || ""}</span>
            {panel.alert && (
              <span className="proto-a__head-warn" role="img" aria-label={panel.alert.text} title={panel.alert.text}>
                ⚠️
              </span>
            )}
            <span className="proto-a__head-caret" aria-hidden="true">▾</span>
          </button>
        )}
        {panelOpen && (
          <div id={panelId} className="proto-a__position-panel" role="dialog" aria-label={panel.title}>
            {panel.content}
          </div>
        )}
        {setting && arrow(setting.next, "›")}
      </div>
    </div>
  );
}
