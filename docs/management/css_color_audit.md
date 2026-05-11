# CSS Color Token Audit - VisualMusic

This report identifies raw color values (Hex, RGB, HSL) used across the CSS files that are candidates for tokenization into the global design system.

## 📊 Summary
- **Total Raw Colors Found:** ~50 unique values
- **Most Used Color Type:** RGBA (for shadows/glass effects)
- **Primary Candidates for Tokenization:** Role colors (root, third, etc.) and semantic background colors.

---

## 🛠️ Global Tokens (Already in :root)
These are correctly tokenized in `App.css` and themes.

| Variable | Value (App.css) | Description |
| :--- | :--- | :--- |
| `--bg-deep` | `hsl(226, 25%, 4%)` | Primary background |
| `--accent` | `hsl(258, 70%, 72%)` | Electric Lavender |
| `--role-root` | `hsl(0, 85%, 65%)` | Musical Root |
| `--role-third` | `hsl(150, 80%, 60%)` | Musical Third |
| `--role-fifth` | `hsl(210, 85%, 65%)` | Musical Fifth |

---

## 🔍 Raw Color Audit (Candidates for Cleanup)

### 1. Hardcoded Theme Colors (Vintage)
`src/styles/vintage-theme.css`

- `#00e5ff` (LED Cyan) -> Should be `--led-cyan`
- `#ffb300` (LCD Amber) -> Should be `--led-amber`
- `#3e2723` (Wood Dark) -> Should be `--wood-dark`
- `#5d4037` (Wood Light) -> Should be `--wood-light`

### 2. Hardcoded Theme Colors (Modern/Liquid Glass)
`src/styles/modern-theme.css`

- `rgba(0, 229, 255, 0.2)` (Cyan border) -> Should use a tokenized accent.
- `rgba(10, 15, 25, 0.6)` (Panel BG) -> Should use `--bg-panel` with opacity.

### 3. Component-Specific Hardcoded Colors

#### Fretboard (`src/components/Instruments/Fretboard.css`)
- `#2c1e16` (Fretboard Brown) -> Candidate for `--fretboard-wood`
- `#1a110c` (Fretboard Border)
- `#e0d0b0` (Fretboard Dots) -> Candidate for `--fretboard-inlay`
- `#a0a0a0` (String color) -> Candidate for `--instrument-string`
- `rgba(178, 34, 34, 0.45)` (Guitar semantic color)
- `rgba(103, 58, 183, 0.45)` (Bass semantic color)

#### Piano Keyboard (`src/components/Instruments/PianoKeyboard.css`)
- `#eee`, `#fff` (White keys)
- `#333`, `#000` (Black keys)
- `rgba(255, 215, 0, 0.4)` (Active glow) -> Use `--accent-glow`

### 4. Semantic UI States
Found in various files:
- `#ff5252` (Mute X) -> Candidate for `--color-error`
- `#69f0ae` (Open O) -> Candidate for `--color-success`
- `#ff4444` (Out of range warning)

---

## 🚀 Recommendations
1. **Centralize Instrument Colors:** Move `#2c1e16` and instrument-specific semantic colors to global tokens.
2. **Standardize Glassmorphism:** Use `hsla(var(--accent-hue), ...)` for all accent-based glows instead of hardcoded `rgba`.
3. **Tokenize "Mute/Open" indicators:** Replace `#ff5252` and `#69f0ae` with `--color-error` and `--color-success`.
