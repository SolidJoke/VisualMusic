---
project_name: "VisualMusic"
project_type: "Music Learning & Composition Web App"
target_audience: "Musicians, learners, composers (hobbyist to advanced)"
primary_use_case: "Visualize scales, chords, harmonic progressions across multiple instruments simultaneously"

# Design Tokens
colors:
  background_primary: "#0a0a0f"
  background_secondary: "#12121a"
  background_panel: "#1a1a2e"
  accent_primary: "#f59e0b"       # Warm amber — main CTA (Play button)
  accent_secondary: "#6366f1"     # Indigo — active mode indicator
  note_root: "#f59e0b"            # Amber — root note
  note_third: "#a78bfa"           # Violet — third
  note_fifth: "#34d399"           # Emerald — fifth
  note_extension: "#60a5fa"       # Blue — extensions (7th, 9th...)
  note_avoid: "#ef4444"           # Red — avoid notes
  text_primary: "#f1f5f9"
  text_secondary: "#94a3b8"
  text_muted: "#475569"
  border_subtle: "#1e293b"
  glow_amber: "rgba(245, 158, 11, 0.15)"

typography:
  font_ui: "Hanken Grotesk"        # All UI text, labels, controls
  font_technical: "JetBrains Mono" # BPM values, note names, fret numbers
  size_xs: "10px"
  size_sm: "12px"
  size_md: "14px"
  size_lg: "16px"
  size_xl: "20px"
  size_heading: "24px"
  weight_normal: 400
  weight_medium: 500
  weight_bold: 700

spacing:
  grid: "8px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"

border_radius:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "9999px"

shadows:
  panel: "0 4px 24px rgba(0,0,0,0.4)"
  glow_amber: "0 0 12px rgba(245,158,11,0.3)"
  glow_indigo: "0 0 12px rgba(99,102,241,0.3)"
---

# VisualMusic — Application Context for Stitch

## What is VisualMusic?

VisualMusic is a **professional music learning and composition web app**. It is NOT a generic music player or streaming app. It is a highly specialized tool that simultaneously displays musical theory information across multiple instruments in real time.

**Core concept**: The user selects a musical key, scale, and chord progression. VisualMusic then highlights the corresponding notes on a piano keyboard, guitar fretboard, and bass fretboard simultaneously, while playing them back through a step sequencer.

---

## The Two Modes — Critical Architecture Constraint

VisualMusic has **two fundamentally different operational modes**. Any UI design must account for both.

### Mode 1: Studio Mode
The "composer's cockpit". The user builds harmonic progressions chord by chord.

**Always visible panels (P0/P1):**
- **Fretboard** (guitar, 6 strings, 22 frets) — shows fingering positions for the current chord/scale
- **Piano Keyboard** (C3 to C5 range) — highlights notes of the current chord
- **Bass Fretboard** (4 strings) — shows bass line positions
- **Step Sequencer** — 8-16 step grid for rhythmic programming (like a mini DAW, similar to Ableton clip view)

**Collapsible panels (P2/P3):**
- **Studio Panel** — chord selector, voicing controls, harmonic analysis, Quick Start progressions
- **Control Panel** — global key/scale selector, tempo (BPM), instrument mix
- **Composition Panel** — advanced rhythm calculator ("Mode M"), polyrhythm settings
- **Harmonic Series Panel** — psychoacoustics visualization (partials, overtones)
- **Theory Legend** — color coding guide for note roles

**Sidebar (always present, collapsible at <1440px):**
- Mode toggle (Studio ↔ Dictionary)
- Play / Stop button (PRIMARY CTA — amber, always accessible)
- Instrument selector (Guitar / Piano / Bass / All)
- BPM control
- Volume/Mix controls

### Mode 2: Dictionary Mode
The "learning library". The user explores scales and chords in isolation.

**Always visible panels (P0/P1):**
- **Fretboard** (guitar) — scale/chord fingering
- **Piano Keyboard** — scale/chord highlights
- **Bass Fretboard** — scale on bass

**Collapsible panels (P2/P3):**
- **Dictionary Panel** — scale/chord family selector, octave selector, position selector
- **Voicing Alert** — playability score and warnings
- **Theory Legend**

---

## Critical UI Constraints

These are **hard constraints** that Stitch designs must respect. They cannot be removed or relocated.

1. **The Play button is the primary CTA** — always visible, always amber/orange, never hidden. It should visually dominate the sidebar.

2. **Fretboard + Piano must be visible simultaneously** — This is the core value proposition. Users need to see both at once. They can be stacked vertically or side by side but NEVER replaced by tabs in desktop/laptop mode.

3. **The Step Sequencer (Studio mode) is a grid** — It looks like a mini Ableton session. It has 8-16 columns × 3-4 rows (melody, chords, bass, drums). It needs horizontal space and cannot be compressed below a readable size.

4. **Note colors are semantic** — Root = amber, Third = violet, Fifth = emerald, Extensions = blue, Avoid = red. These colors must never be changed.

5. **Technical labels use monospace font** — Fret numbers, BPM values, note names (C, D#, Fm7...) always use JetBrains Mono.

6. **Dark mode only** — VisualMusic is always dark. Background #0a0a0f. No light mode variant needed.

7. **Two-column layout is fundamental on ≥1440px** — Left sidebar (controls) + Right main area (instruments). This is the core layout. Never single-column on desktop.

---

## Responsive Behavior Requirements

### ≥ 2560px (4K — Current state, already good)
- Full layout, all panels expanded
- Sidebar: ~320px wide, fixed
- Instruments area: flexible, full height
- Sequencer: full grid visible

### ≥ 1440px (QHD — TARGET for next Stitch screens)
**Pain point**: Secondary panels (Studio Panel, Composition Panel, Harmonic Series) take too much vertical space. Users scroll too much.

**Required behavior**:
- Sidebar remains fixed (~280px), Play button always visible at top
- Secondary panels (P2/P3) become collapsible with a toggle arrow — collapsed = just a header bar visible
- "Comprendre le mode harmonique" accordion: collapsed by default
- BPM and key controls stay visible in sidebar
- Instruments area: fretboard + piano stack vertically with comfortable spacing

### ≥ 1080px (FHD / Laptop — TARGET for next Stitch screens)
**Pain point**: Sidebar takes too much horizontal space. Fretboard gets squeezed. Panels overflow.

**Required behavior**:
- Sidebar compresses to ~220px OR becomes a collapsible drawer (icon-only mode)
- Toggle button to show/hide sidebar
- Only ONE of (Studio Panel / Dictionary Panel) visible at a time
- Sequencer: horizontal scroll enabled (don't compress the grid)
- Fretboard: maintains minimum 580px width, scrollable container if needed
- Piano: minimum 400px, can be hidden behind a toggle if really needed

### ≤ 768px (Mobile — future)
- Bottom navigation bar: Studio | Dictionary | Settings
- Instruments displayed one at a time (tabs: Guitar | Piano | Bass)
- Play button in bottom bar (thumb zone)
- Sequencer becomes a simplified view

---

## Inspiration References

- **Linear.app** — sidebar design, panel collapsing, typography
- **Ableton Live** — sequencer grid aesthetic, dark professional feel
- **Notion** — collapsible sections, clean information hierarchy
- **Duolingo** — progress clarity, action-oriented layout

**NOT**: Spotify (passive), SoundCloud (social), Garageband (too playful)

---

## What Bad Stitch Designs Look Like for This App

Avoid these patterns:
- Generic "music app" with album art or playlist views — VisualMusic has no media library
- Single instrument displayed at a time on desktop — defeats the purpose
- Bright/colorful UI with random accent colors — note colors are semantic, must not conflict
- Cards-based layout for the main area — instruments need structured grid/fretboard layout
- Hamburger menu hiding the Play button — Play is always accessible
- Rounded pill shapes for the sequencer cells — cells are square/rectangular (DAW aesthetic)

---

## Current Screenshots Reference

Screenshots of the current app (4K version that works well) are in:
`docs/design/screenshots/`

The current 4K design serves as the reference "good state". 1440p and 1080p need adaptation, not reinvention.
