# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-07

### Added
- Info Tooltips (`?`) for complex features (Shell Voicings, Playability Score, Suggest Bass, Progressions, Inversions) using Stitch's glassmorphic design language.
- Added missing translations for "Math & Rythmes" modal header and dictionary warning.

### Changed
- Complete UX/UI overhaul: Introduced Zen Studio (minimalist, off-black, pastel accents) and Neon Monolith (cyberpunk, glowing neon) themes.
- Redesigned Sidebar and Modal layout for cleaner margins and unified spacing.
- Improved color contrast across both themes for better accessibility.
- Set harmonic block in Studio mode to be collapsed by default.

## [0.9.0] - 2026-05-21

### Added
- Internationalization (i18n) for the Math Composition Assistant in FR, EN, PT, ZH.
- "Suggest Bass" button with AI integration in Studio mode.
- Extended octave selector range from -1/+1 to -3/+3 for scales and chords.

### Changed
- Ergonomic Sidebar Layout: Moved Mode Selector and Play button to the fixed header of the Sidebar for easier access.
- Moved BPM controller to an inline editable badge in the Sidebar header.
- Added visual Rail Icons (🎹 / 📖 and ⏵ animated play indicator) when the sidebar is collapsed.
- Enhanced UX with keyboard shortcuts: Space (Play/Stop), S (Studio Mode), D (Dictionary Mode).
- Fixed scroll-to-top behavior when switching modes.
- Audio Hook Architecture: Refactored the monolithic `usePlaybackHandlers` into smaller, specialized hooks (`useStudioPlayback`, `useDictionaryPlayback`, `useFretboardPlayback`).

### Fixed
- Fixed CSS flex-shrink issue hiding CompositionPanel.
- Resolved COMP-08 reference error in PhasingVisualizer.
- Fixed hardcoded translations in the Sidebar tooltips.
