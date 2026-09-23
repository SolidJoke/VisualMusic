# VisualMusic — decisions in force (for design work)

Maintained by the project coordinator (Mnémé). Last update: 2026-09-23. Code reference: `main` at `f6ac1b0`.
This file is the design brief's source of truth; the app code is the source of truth for current behaviour.

## Product frame (do not re-litigate)

- **Explorer / reminder, not a coach**: the app advises, it never models what the user knows.
- **One user today**: Gabriel, a **music beginner**. **No jargon without an explanation one click away.**
- **Three axes**: play, compose / improvise, sound.
- **Screens**: desktop **4K, 3840 CSS px wide** (LibreWolf, Gecko) and **phone** (Brave). Automated QA runs in Chromium.
- **Workflow B first**: VisualMusic guides, Gabriel writes his lines in **Ableton Live**. **C later**: sketch here, finish in Ableton.
- **Unit of work**: one 4/4 measure in **16 steps**, up to **8 measures**. MIDI export: one file per track.
- Studio and Dictionary are merged into one screen. No search bar. The audio visualiser, the DAW helper and "Math & Rythmes" are kept.
- **Listening**: headphones or hi-fi speakers with a subwoofer; phone speakers rarely (piano, sometimes guitar).

## Canvas VMU-082 — validated by Gabriel on 2026-09-21 (files in `canevas/`)

- **V1** for Note · Chord · Scale: a band that follows the selection, drawers under the instruments, instruments full width.
- **V3 "timeline"** for the Progression: chords on top, one row per track, reserved sketch rows for Bass and Melody,
  length adjustable up to 8 measures, **4 measures per page at 4K**, instruments follow the playhead,
  **Math is sent by an explicit gesture** to a row and a range of measures, **a single "Export MIDI"** over the set length.
- **Phone V1**: bottom sheet with 4 tabs (Selection · Play · Compose · Sound); BPM and metronome in Sound.
- Also decided: one "4 / 8 measures" setting (replaces Zoom and the 16/32/64 densities); inversion named by intent ("C in the bass");
  per-instrument register; title "VisualMusic"; **Play plays the selection** when there is no progression; Zen theme frozen;
  **reopen on the last content**; export follows the set length; on the phone the length is read-only.

## Claude Design feedback of 2026-09-23 — adopted as direction, with the coordinator's arbitration

Document: `claude-design-feedback-2026-09-23.md` (this folder). Four of its findings were checked against the code and are exact
(sidebar 340 px vs 180 px offset; `AppMobile.jsx` re-exports `AppDesktop`; `InfoTooltip` opens on hover only;
`--lg-bg` is `#050505` / `#151515`).

1. **Adopted as is, built first**: the transverse rules and visual foundations — OLED black, tokens only, contrast ≥ 4.5:1,
   4K type scale, tooltips on click / tap / keyboard, `<Term>` + glossary, a single transport, a sidebar that never covers content.
   They hold whatever the layout.
2. **Layout A "Workbench", vertical instruments at 4K** — adopted **subject to a measured prototype** (tranche S1).
   Fallback: **B "Console"** (instruments horizontal, full width — close to canvas V1).
   **The V3 timeline lives in the central column of A** (transport, timeline, legend, progression).
3. **Layout C "Focus + context"** below 3840 px and on the phone — to reconcile with the canvas's 4-tab bottom sheet.
4. **Still in force from the canvas** (the feedback does not cover them): V3, 4 / 8 measures, a single Export MIDI,
   Play plays the selection, Math sent by a gesture (= feedback P0-4: preview / apply / undo), reopen on the last content.

## Engine decisions that constrain the screens

- **Track model A** (2026-09-22): a track = 128 cells (8 measures × 16 steps). Editing a cell changes **only its measure**;
  a "copy this measure to…" gesture spreads it. A style is a **fill**, undoable ("Undo last fill", "Back to base").
- A measure with no chord is silent (chords and bass).
- Chord durations go down to **half a measure** (canvas `ChordCell`, `V3Playing`).

## Build order (tranches, one PR each)

Done: VMU-146 (degree colours), VMU-144 (instrument levels), T0 (guard), T1 (one step-dispatch source; exports unchanged).
Next: **F1** visual foundations → T2 audio owner → **F2** sidebar, tooltips, `<Term>`, single transport →
**S1** vertical-instrument prototype → T3 timeline model → **L1** 4K layout (A or B) → L2 phone / C → T4…T8 (persistence,
style as fill, Math over several measures, progression editing, V3 screen).
