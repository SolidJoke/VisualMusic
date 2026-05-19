# QA Bug Investigation Report — VisualMusic

This report details the investigation of 3 critical bugs reported in VisualMusic.
The role of this investigation is strictly **QA (Read-Only)** — no code was modified. 
These detailed technical tickets are created to guide the developer AI in implementing robust fixes.

---

## 🐛 BUG-07: Studio Mode Sidebar Empty Rectangle
- **Composant** : `src/components/Layout/Sidebar.css` or `src/App.jsx` / `StudioPanel`
- **Priorité** : 🟡 P1
- **Statut** : ✅ INVESTIGATION TERMINÉE

### 🔬 Description & Symptômes
In Studio Mode, the sidebar contains an empty rectangular space that pushes valuable interactive controls down. This space appears to serve no functional purpose.

### 🔬 Diagnostic & Root Cause
The empty space is caused by `.magic-progression-container` in `App.css`. It uses `display: grid` with a fixed template of `repeat(2, auto)` for rows and 4 columns, designed for 8 items. However, most progressions (from `bricks.js`) only contain 4 items. The container still reserves space for the second row, creating a large visual void. The padding and background on the container make this empty area highly visible.

### 🛠️ Proposed Fix Steps
1. **Refactor CSS**: Modify `.magic-progression-container` to remove the hardcoded 2 rows (`grid-template-rows: auto`). Let the grid rows flow naturally based on content.
2. **Dynamic Rendering**: Alternatively, in `StudioPanel.jsx`, apply conditional classes or inline styles depending on `activeProgression.length <= 4` to toggle between a 1-row and 2-row layout.

---

## 🐛 BUG-08: Dictionary Mode Fretboard Width Doubled & String Markers Shifted
- **Composant** : `src/components/Instruments/Fretboard.jsx` / `Fretboard.css`
- **Priorité** : 🔴 P0 (Critical layout regression)
- **Statut** : ✅ INVESTIGATION TERMINÉE

### 🔬 Description & Symptômes
In Dictionary Mode, selecting a scale or chord and selecting a position doubles the width of the fretboard. Furthermore, the open/mute markers above the strings (`O`/`X` symbols) are shifted vertically downwards.

### 🔬 Diagnostic & Root Cause
1. **Width Doubled**: The `renderStatusRow` function returns a `div` (`.α6-status-row`) with `display: grid` and 23 columns. However, this element is placed directly inside the main `.fretboard` grid (which also has 23 columns) without being assigned `grid-column: 1 / -1`. As a result, it acts as a single grid item placed into the *first column* of the fretboard, forcing that single column to stretch to the width of 23 columns.
2. **Markers Shifted Down**: The `status-overlay-layer` (which holds the O/X markers) is placed inside `.α6-status-row` at `gridColumn: "1 / 2"`. Since the first row is populated with a spacer and 22 fret cells, the overlay is pushed to the implicit *second row*, shifting the markers downward by one row height.

### 🛠️ Proposed Fix Steps
1. **Fix Fretboard Width**: In `Fretboard.jsx`, ensure the `div` returned by `renderStatusRow()` is styled with `gridColumn: "1 / -1"` and `gridRow: "1 / -1"` (similar to `strings-layer`), and ensure it has `pointerEvents: "none"` so it doesn't block interactions.
2. **Fix Marker Position**: Inside `renderStatusRow`, apply `gridRow: "1"` to the `status-overlay-layer` so it anchors to the top row alongside the empty cells, preventing it from wrapping to row 2.

---

## 🐛 BUG-09: Dictionary Mode Scale Notes & Playback Animation Errors
- **Composant** : `src/core/fretboardUtils.js` / `src/hooks/useMusicEngine.js`
- **Priorité** : 🔴 P0 (Critical theoretical/visual regression)
- **Statut** : ✅ INVESTIGATION TERMINÉE

### 🔬 Description & Symptômes
In Dictionary Mode under "Scale" selection:
1. The fretboard renders notes that do not belong to the selected scale and pitch height.
2. During scale playback, incorrect note highlights are animated, which do not align with the audio being played.

### 🔬 Diagnostic & Root Cause
1. **Wrong Notes Rendered**: In `fretboardUtils.js` (`computeFretMetadata`), when checking if a note belongs to a scale box (`isScaleBox`), the `isVoicingMaskActive` logic only checks if the fret is within the box bounds: `α3 = fret >= α2.startFret && fret <= α2.endFret;`. It then sets `isActive = α3;`. This blindly activates *every single fret* in that physical rectangle on the fretboard, ignoring the actual notes of the scale. It bypasses the strict `α1` (fingering map) checks that standard chords use.
2. **Wrong Animation**: Because *all* notes in the bounding box are marked as "part of the voicing mask" (`α3 = true`), the animation filter `if (isPlaying && !α3)` fails to filter out anything within the box. Consequently, any playing absolute note will indiscriminately highlight all matching absolute notes in that region, or the wrong strings if there are overlapping notes.

### 🛠️ Proposed Fix Steps
1. **Enforce Strict Fingering for Scale Boxes**: Update `computeFretMetadata` in `fretboardUtils.js`. If `α2.isScaleBox` is true, do not simply use the `startFret`/`endFret` bounds to force `isActive`. Instead, check the actual fingering map (`α2.fingeringMap` or `α2.α10Map`) to verify if the specific string and fret are explicitly defined in the scale fingering.
2. **Filter Active Notes**: Ensure that `isActive` accurately reflects whether the note is *both* in the scale bounds *and* defined in the scale's fingering map. This will automatically fix the playback animation since `!α3` will correctly filter out non-scale notes during playback.
