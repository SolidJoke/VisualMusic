import React from 'react';
import CustomSelect from '../Common/CustomSelect';
import { translations } from '../../i18n/translations';
import { log } from '../../utils/debug';

/**
 * The header's action controls, as their own component so they can be rendered
 * somewhere reachable on a phone.
 *
 * In the header alone they were unreachable below 768px: `.app-header-actions`
 * is a non-wrapping flex row, and `.app-container-inner` sets `overflow-x:
 * hidden` on mobile, so at 375px these controls laid out from x=302 to x=1100
 * with no way to scroll to them — the language selector among them. The mobile
 * drawer now renders this same component, and the header row is hidden there.
 */
export function HeaderActions({
  txt,
  lang,
  setLang,
  setShowHelp,
  setShowAbout,
  setShowTheory,
  exportDebugSnapshot,
  notation,
  setNotation
}) {
  return (
    <>
        {/*
          VMU-134: the only US/EU notation switch, moved here from
          DictionaryPanel so it is reachable from every screen (Studio
          included), not just the Dictionary panel it used to live in.
          Provisional placement (VMU-082's canvas may relocate it). Measured
          in-browser at 1280px that the header row already overflows before
          this control exists (165px, pre-existing, out of this ticket's
          scope) — the plain DualToggle (label + two always-visible pills,
          ~250px) would have added ~78px more. Using the row's own
          btn-header-action idiom instead, exactly like the theme switch
          above, keeps this to one ~150px button and doubles as "the style
          of the other header controls" the brief allows when DualToggle is
          too wide here.
        */}
        <button
          className="btn-header-action"
          data-testid="header-notation-toggle"
          onClick={() => {
            const next = notation === 'us' ? 'eu' : 'us';
            log("app", `Switching notation to ${next}`);
            setNotation(next);
          }}
          aria-label={txt.noteNamesLabel}
          title={txt.noteNamesLabel}
        >
          {notation === 'us' ? 'US (A, B, C)' : 'EU (Do, Ré)'}
        </button>

        <button
          className="btn-header-action"
          onClick={() => setShowHelp(true)}
          aria-label={txt.helpModal?.title || 'Aide'}
        >
          ❓ {txt.helpModal?.title || "Guide"}
        </button>

        <button
          onClick={() => setShowTheory(true)}
          className="btn-header-action"
        >
          {txt.guideTheoryBtn}
        </button>

        <CustomSelect
          options={Object.keys(translations).map(l => ({
            value: l,
            label: translations[l].langLabel || l.toUpperCase()
          }))}
          value={lang}
          onChange={setLang}
          className="header-lang-select"
        />

        <button
          onClick={() => setShowAbout(true)}
          className="btn-header-action"
        >
          {txt.about}
        </button>

        {import.meta.env.DEV && (
          <button
            onClick={exportDebugSnapshot}
            className="btn-header-action"
            title="Export debug state as JSON"
          >
            🐛 Debug
          </button>
        )}
    </>
  );
}

export default function AppHeader(props) {
  return (
    <div className="app-header">
      <h1 className="app-title">{props.txt.title}</h1>

      {/* Hidden below 768px — the same controls are rendered in the mobile
          drawer instead, where they fit. See HeaderActions above. */}
      <div className="app-header-actions">
        <HeaderActions {...props} />
      </div>
    </div>
  );
}