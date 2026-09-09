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
  uiTheme,
  setUiTheme,
  lang,
  setLang,
  setShowHelp,
  setShowAbout,
  setShowTheory,
  exportDebugSnapshot
}) {
  return (
    <>
        <button
          onClick={() => {
            const next = uiTheme === 'vintage' ? 'modern' : 'vintage';
            log("app", `Switching theme to ${next}`);
            setUiTheme(next);
          }}
          className="btn-header-action"
        >
          {uiTheme === 'vintage' ? '✨ Neon Monolith' : '🌿 Zen Studio'}
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
          theme={uiTheme}
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