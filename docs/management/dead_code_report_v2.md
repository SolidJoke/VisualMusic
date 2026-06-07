# Dead Code Audit v2 — 2026-06-07

## Summary
| Metric | Count |
|--------|-------|
| Files scanned | 153 |
| Unused exports | 10 |
| Unused imports | 7 |
| Console.log (prod) | 8 |
| TODO/FIXME | 1 |
| Files >300 lines | 14 |

## Unused Exports
| File | Symbol | Confidence |
|------|--------|------------|
| src/core/bricks.js | BRICK_GROUPS | High |
| src/core/debugScale.js | absToName | High |
| src/core/debugScale.js | isDebugEnabled | High |
| src/core/debugScale.js | createFretboardSnapshot | High |
| src/core/fingeringLogic.js | INSTRUMENT_RANGES | High |
| src/core/fretboardUtils.js | getFretX | High |
| src/core/theory.js | getIntervalMetadata | High |
| src/core/theory.js | FINGERING_SHAPES | High |
| src/core/theory.js | CHORD_SCALE_MAP | High |
| src/core/tunings.js | DEFAULT_TUNING_NAME | High |

## Unused Imports
| File | Import | Line |
|------|--------|------|
| src/components/Intelligence/CompositionPanel.jsx | useCompositionPlayback | 4 |
| src/components/Panels/ControlPanel.jsx | Modal | 4 |
| src/components/Panels/StudioPanel.jsx | Modal | 9 |
| src/core/__tests__/tonalAdapter.test.js | resolveChordFromShortNameAdapter | 2 |
| src/core/__tests__/tonalAdapter.test.js | NOTES | 3 |
| src/hooks/__tests__/useDictionaryMode.test.jsx | V I | 2 |
| src/hooks/__tests__/useDictionaryMode.test.jsx | beforeEach | 2 |

## Console.log in Production
| File | Line | Content |
|------|------|--------|
| src/audio/AudioEngine.js | 104 | console.log("[AudioEngine] Guitar Sampler loaded ✓"); |
| src/audio/AudioEngine.js | 172 | console.log("[AudioEngine] Piano Sampler loaded ✓"); |
| src/core/debugScale.js | 49 | console.log(`  String ${si} (${reversedTuning[si]}): ${notes.join(', ')}`); |
| src/core/debugScale.js | 64 | console.log(labels.join('\n')); |
| src/core/debugScale.js | 76 | console.log(`[VM-PLAY] step=${index} → (no fretboard data, abs=${note})`); |
| src/core/debugScale.js | 79 | console.log( |
| src/core/debugScale.js | 112 | console.log('[VM-ACTIVE] Aucune note isActive sur le fretboard.'); |
| src/core/debugScale.js | 117 | console.log(`  ${absToName(c.absoluteValue)} — string=${c.stringIndex} fret=${c.fret} isPlaying=${c.isPlaying}`); |

## TODO/FIXME
| File | Line | Comment |
|------|------|--------|
| src/AppTablet.jsx | 9 | // TODO Phase 2 : Créer un layout optimisé tablette |

## Large Files (>300 lines)
| File | Lines | Suggestion |
|------|-------|------------|
| src/AppDesktop.jsx | 646 | Refactor |
| src/audio/AudioEngine.js | 376 | Refactor |
| src/audio/useSequencer.js | 341 | Refactor |
| src/components/Intelligence/CompositionPanel.jsx | 700 | Refactor |
| src/components/Panels/DictionaryPanel.jsx | 599 | Refactor |
| src/components/Panels/StudioPanel.jsx | 479 | Refactor |
| src/core/__tests__/compositionEngine.test.js | 321 | Refactor |
| src/core/compositionEngine.js | 420 | Refactor |
| src/core/fingeringLogic.js | 687 | Refactor |
| src/core/fretboardUtils.js | 354 | Refactor |
| src/core/harmonyEngine.js | 352 | Refactor |
| src/core/theory.js | 796 | Refactor |
| src/hooks/useMusicEngine.js | 358 | Refactor |
| src/i18n/translations.js | 1187 | Refactor |

## Top Recommendations
1. Remove unused imports to clean up the codebase.
2. Refactor large files like `src/AppDesktop.jsx`, `src/components/Intelligence/CompositionPanel.jsx`, and `src/core/theory.js` into smaller, more manageable components/modules.
3. Replace `console.log` statements in production files with proper logging mechanisms or remove them.
