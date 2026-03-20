# Project Architecture & Musical Knowledge

This document serves as a reference for the core principles and architecture of the VisualMusic Coach (Vmu) project.

## Core Musical Concepts

### Nashville Number System (NNS)
Vmu uses the NNS to analyze harmonic progressions.
- **Numbers**: Represent the scale degree (1, 2, 3, etc.).
- **Roman Numerals**: I, IV, V (Majeur), ii, vi (Mineur).
- **Function**: Focus on the relationship between chords rather than absolute notes.

### Psychology of Modes
Each mode has a specific emotional "color" used in the UI:
- **Ionian**: Happy, Triumphant.
- **Dorian**: Jazzy, Nostalgic.
- **Phrygian**: Dark, Exotic.
- **Mixolydian**: Bluesy.
- **Aeolian**: Melancholic, Epic.

### Voice Leading
- **Algorithmic Goal**: Move to the closest inversion of the next chord.
- **Technical Implementation**: Inversions (Root, 1st, 2nd) are calculated to minimize note distance.

## Technical Architecture

### Stack
- **Frontend**: React.js (Vite).
- **Audio**: Tone.js for real-time synthesis and sequencing.
- **Styling**: Dynamic CSS variables based on the musical genre.

### Core Logic
- `src/core/theory.js`: Handles musical theory calculations (scales, intervals, chord construction).
- `src/core/bricks.js`: Contains the fundamental musical "blocks" used for generating rhythm and harmony.

### Component Structure
- `src/components/Instruments/`: Contains UI for `PianoKeyboard.jsx`, `Fretboard.jsx`, and potentially other instrument visualizations.
- `src/components/Sequencer/`: Manages the playback engine, timing, and rhythmic patterns.

## Workflow & Standards

### Git Workflow
- **No `main` mutations**: All changes must occur in feature or fix branches.
- **Manual Merging**: I will provide the PR URL and the user will perform the final merge.
- **Code Quality**: Every PR must undergo a review for quality and regression risks before being proposed for merging.

### Deployment (Netlify)
- **Production Builds**: Updates to the production site are triggered by changes in the `dist` folder.
- **Build Command**: `npm run build` must be executed to refresh the `dist` directory.

## Technical Details
- **Tone.js Integration**: Real-time synthesis and sample playback.
- **Dynamic Styling**: Styles are adjusted via CSS variables injected at runtime to match the selected musical mode/emotion.
