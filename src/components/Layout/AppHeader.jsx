import React from 'react';
import CustomSelect from '../Common/CustomSelect';
import { translations } from '../../i18n/translations';
import { log } from '../../utils/debug';

export default function AppHeader({
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
    <div className="app-header">
      <h1 className="app-title">{txt.title}</h1>

      <div className="app-header-actions">
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
      </div>
    </div>
  );
}