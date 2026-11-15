# Iron Ladder — Design System

The visual language of the app, written so it can be applied consistently by a
person or a coding agent. **Light theme only.** Use the tokens below (CSS
variables in `src/index.css`), never ad-hoc colors.

Aesthetic target: **a training logbook** — warm paper, black ink, ruled lines,
big stamped figures. It should read like something kept in a gym bag, not like a
SaaS dashboard. The app is used mid-set, so legibility and big tap targets beat
decoration.

## Principles

1. **Paper and ink.** A warm off-white page with near-black ink. Structure comes
   from rules (hairlines and one heavy ink rule per section), not from stacks of
   floating boxes.
2. **Lists are ruled, not carded.** Anything that is a list of like things —
   the week, lifts, level-ups — is a `.ledger`: rows separated by hairlines. A
   `.card` is for a group of *controls* that belong together (the set table, a
   settings group), and it is flat: one border, no shadow.
3. **Ink is the action, amber is the highlighter.** The primary button, a ticked
   set, a selected option are solid ink. Amber is never a button: it marks —
   progress, today, a set whose load differs.
4. **Figures are the heroes.** Loads, reps, timers and counts are set condensed
   and heavy (`.figure` / `.display`), always tabular. Labels stay small and
   quiet next to them.
5. **Colour means something.** Green = you levelled up. Red = destructive.
   Muscle pigments identify a muscle and appear only next to its name or on its
   data. Nothing is coloured for decoration.
6. **Motion is restrained.** One short fade per screen; press states are an
   immediate colour change, not a bounce or a scale.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#f2eee6` | page (paper) |
| `--surface` | `#fbf9f4` | cards, sheets, secondary buttons |
| `--surface-2` | `#e9e4d8` | control wells: steppers, keypad keys, notes |
| `--surface-3` | `#dad3c4` | pressed states, empty track |
| `--border` | `#dcd6c9` | hairlines |
| `--border-strong` | `#b5ad9c` | control outlines |
| `--text` / `--ink` | `#1b1914` | text, heavy rules, primary fills |
| `--on-ink` | `#fbf9f4` | text on ink |
| `--muted` | `#5c564b` | secondary text |
| `--faint` | `#7b7467` | tertiary text |
| `--accent` | `#f2a31b` | amber highlighter: progress, today, own-load mark |
| `--accent-dim` | `#f6e6c2` | caution note background |
| `--accent-ink` | `#9c4707` | amber as text/icon (legible on paper) |
| `--success` | `#2c6e3f` | level-ups, finish |
| `--success-dim` | `#e1ebd8` | level-up note background |
| `--danger` | `#b42c1e` | destructive |

Muscle pigments: chest `#c0432b`, back `#3b6a8e`, shoulders `#c9921a`,
arms `#5c8a47`, legs `#8a4875`, core `#2c8580`, forearms `#7a7468`.

## Typography

One family, **Archivo Variable**, using its width axis as the expressive tool:

- **Screen titles** (`.topbar h1`): expanded (`font-stretch: 118%`), 800, tight.
- **Figures** (`.figure`, `.display`, steppers, keypad, timers): condensed
  (`font-stretch: 78%`), 800, `tabular-nums`.
- **Everything else**: normal width. 16px base (prevents iOS zoom), 13px small,
  11.5px tiny.
- Section heads (`.eyebrow`) are sentence case, 13px/800, in ink, sitting on a
  heavy rule. No tracked-out grey capitals.

## Shape and depth

- Radius: `6px` cards and large buttons, `4px` controls. No pills.
- No shadows on the page. The only shadow (`--shadow`) lifts a bottom sheet.
- The rest timer is the one dark slab on screen — it should be findable at a
  glance from a metre away.

## Components

- **Section head** `.eyebrow`: label on a 1.5px ink rule. Followed by a
  `.ledger`, the rule doubles as the list's top edge.
- **Ledger** `.ledger` > `.ledger-row`: name left, figure right.
- **Card** `.card`: `--surface`, 1px `--border`, 6px radius.
- **Buttons**: primary = ink; secondary = paper with an outline; success
  (finish) = green; danger = red outline; ghost = text only.
- **Set tick** `.set-check`: outlined box, fills solid ink when done.
- **Options** (`.segmented`, `.ex-pill`, `.rir-chip`): selected = solid ink.
- **Coach notes** `.coach`: flat tinted block, no border. Green = progress,
  amber = caution, neutral = information.
- **Today** is marked with `.hl`, a stroke of amber under the text.

## Don't

- Shadowed white cards, one per item. Pill-shaped chips. Tracked-out grey
  uppercase labels. Icon-in-a-rounded-tile heroes.
- Amber buttons, or amber as small text (use `--accent-ink`).
- A coloured stripe down one edge of a box.
- Emoji in UI copy; greetings or filler headings where a fact would do.
- Colours outside the tokens; a second typeface.

## Agent guide

When changing UI: read tokens from `:root` in `src/index.css`; reuse the classes
in that file; keep the screenshot → compare → refine loop (Playwright at a
390×844 viewport) before shipping. Verify text contrast ≥ 4.5:1 on
`--bg`/`--surface`.
