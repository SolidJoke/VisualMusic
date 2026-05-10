# VisualMusic Performance Dynamics (V1.0)

Derived from SAS Analysis (Doc 3 & 4).

## 1. Execution Modes

| Mode | Description | Audio Implementation |
| :--- | :--- | :--- |
| **Block** | Simultaneous strike | Zero delay between notes |
| **Strum** | Guitar stroke | 15-30ms cumulative delay (Bass to Treble) |
| **Arpeggio** | Sequential play | Slow sequence (e.g., 200ms between notes) |

## 2. Strumming Library (Presets)

*   **The Island Strum**: `D - D U - _ U D U` (Universal Folk/Pop)
*   **Reggae Skank**: `_ D - _ D - _ D - _ D` (Beats 2 and 4 only)
*   **Rock Standard**: `D - D - D U D U` (Straight energy)

## 3. Realism Parameters (The "Humanize" Engine)

### Velocity Weighting
*   **Downstroke (D)**: 100% velocity. Emphasis on low strings.
*   **Upstroke (U)**: 70% velocity. Emphasis on high strings.

### Timing Jitter
*   **Humanize**: Add random delay of **2-5ms** to every note trigger to avoid the "robot" effect.

### Visual Feedback
*   UI should display direction markers: `⊓` (Down) / `∨` (Up).
*   Markers should flash/animate in sync with the audio playback.
