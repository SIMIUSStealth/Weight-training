# Iron Ladder — Design System

The visual language of the app, written so it can be applied consistently by a
person or a coding agent. **Light theme only.** Be prescriptive: use the tokens
below (CSS variables in `src/index.css`), never ad-hoc colors. Aesthetic target:
**crisp, calm, and airy** — Apple Fitness / Linear clarity, not flashy. The app
is used mid-set, so legibility and big tap targets beat decoration.

## Principles

1. **Off-white canvas, white cards.** The page is a soft off-white; content sits
   on clean white cards with a hairline border and a whisper of shadow. Never
   pure-white pages or heavy drop shadows.
2. **One accent, used sparingly.** Amber is the brand. Use the bright amber only
   as a *fill* (one primary action per screen). For amber *text/icons* use the
   dark "ink" amber so it stays legible on white.
3. **Strong type hierarchy, few sizes.** Big bold display numbers, small quiet
   labels. A distinctive display font for headings/metrics; the system font for
   body and UI (correct + legible on iOS).
4. **8-pt spacing rhythm.** Generous whitespace; let things breathe.
5. **Soft depth.** Hairline borders + one subtle shadow token. No glows, no
   gradients-as-decoration.
6. **Motion is restrained.** One staggered page-load fade per screen; quick
   press feedback. No scattered micro-animations.

## Color tokens (light)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#f4f6f8` | page canvas (off-white) |
| `--surface` | `#ffffff` | cards, sheets, nav |
| `--surface-2` | `#eef1f4` | insets, steppers, secondary buttons |
| `--surface-3` | `#e3e7ec` | chips, pressed states |
| `--border` | `#e6eaef` | hairline borders |
| `--border-strong` | `#d3d9e0` | dividers needing weight |
| `--text` | `#131720` | primary text (≈15:1 on bg) |
| `--muted` | `#5a6573` | secondary text |
| `--faint` | `#97a1af` | tertiary text, icons-at-rest |
| `--accent` | `#f5a623` | amber **fill** only (primary buttons, progress) |
| `--accent-press` | `#e0930f` | pressed amber fill |
| `--accent-ink` | `#b4530a` | amber **text/icons** on white (legible) |
| `--on-accent` | `#2a1505` | text on amber fill |
| `--success` | `#15924f` | level-ups, positive |
| `--success-dim` | `#e6f5ec` | success surfaces |
| `--danger` | `#d92d20` | destructive |
| `--info` | `#2563eb` | informational |

Muscle dots: chest `#ef4444`, shoulders `#f59e0b`, arms `#10b981`,
forearms `#3b82f6`, abs `#8b5cf6`.

## Typography

- `--font-display`: **Bricolage Grotesque Variable** — headings (`h1`), the stat
  numbers, weights, and timers. Weights 600–800. Tight tracking (`-0.02em`).
- Body / UI: system stack (`-apple-system`, SF Pro …). 16px base (prevents iOS
  zoom), 13px small, 11.5px tiny.
- Numbers that change use `font-variant-numeric: tabular-nums`.
- Hierarchy by **weight + size jumps**, not color. Labels are uppercase 11px
  `--faint` with `0.06em` tracking.

## Spacing, radius, elevation

- Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32.
- Radius: cards `16px` (`--radius`), controls `11px` (`--radius-sm`), pills `999px`.
- Elevation: `--shadow-sm` (cards) `0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.05)`;
  `--shadow` (sheets/popovers) `0 10px 30px rgba(16,24,40,.10)`.

## Components

- **Card:** white, 1px `--border`, `--shadow-sm`, 16px radius, 16px padding.
- **Primary button:** amber fill, `--on-accent` text, 700 weight. One per screen.
- **Secondary button:** `--surface-2` fill, `--border`, `--text`.
- **Success button** (finish): `--success` fill, white text.
- **Nav (bottom):** white, blurred, hairline top border. Active item = `--accent-ink`.
- **Coach notes:** tinted surfaces — up=green, stall=amber, info=blue — never the
  hard dark boxes.
- **Inputs/steppers:** `--surface-2`, focus ring = `--accent`.

## Do / Don't

- ✅ Off-white page, white cards, hairline borders, one amber action.
- ✅ Big display numerals, quiet uppercase labels, lots of air.
- ❌ Pure-white pages, heavy shadows, multiple accent colors competing.
- ❌ Amber as small text/icon on white (use `--accent-ink`).
- ❌ Inter/Roboto for headings; decorative gradients; cluttered dashboards.

## Agent guide

When changing UI: read tokens from `:root` in `src/index.css`; reuse the classes
in that file; keep the screenshot → compare → refine loop (Playwright at a
390×844 viewport) before shipping. Verify text contrast ≥ 4.5:1 on `--bg`/`--surface`.
