# Iron Ladder — Roadmap

Running list of shipped features and the backlog, so ideas aren't lost.

## Shipped

- Guided session flow (11 slots, weight stepping on the ladder, rest timer,
  plank countdown, form cues, finish/split into parts).
- Double-progression engine (auto level-up, stall detection + bridge coaching,
  start-weight self-correction, plank time progression).
- Per-set "last time" (gap-filled — never blank).
- Progress charts + history; bodyweight / protein / sleep logging.
- Exercise swaps (slot-based single-dumbbell variations, independent progress).
- One-tap share backup + weekly reminder + "last backed up".
- Light, token-driven design (`DESIGN.md`), app-shell layout.
- **Effort / reps-in-reserve (RIR) logging + effort-aware coaching.**
- **Per-muscle weekly volume tracker.**
- **Weekly plan / split routine** — a Mon–Sun calendar of muscle-group days
  (rest/to-do/in-progress/done), tap any day to train or edit it (toggle groups,
  swap/add/remove exercises), with a per-muscle frequency hint. Splitting a day
  shows it as "in progress," not a new entry; one workout open at a time.

## Backlog (prioritized)

### From the "20 lb of muscle" video (training-only)
- **Training style: Volume vs Intensity** — a setting that reshapes the routine:
  Volume = 3–4 sets stop ~2–3 short; Intensity = 1–2 sets to failure. Drives set
  count + the effort target. (Subsumes "add a 4th set / adjust sets per exercise".)
- **Experience level (beginner / intermediate / advanced)** — tunes volume
  targets, progression aggressiveness, and how often to nudge a variation swap.
- **Lagging-muscle insight** — flag the slowest-progressing muscle and suggest the
  legit dumbbell levers (add a set there, or swap to a fresh variation).

### Coaching / intelligence
- **Deload & reassessment coaching** — detect multi-lift stalls → suggest a lighter
  week; nudge a variation swap / rep-range change at the 8–12 week mark.
- **Guided warm-up** at session start (the spec's ~5 min).
- **Schedule awareness** — "trained yesterday — rest builds muscle" / "it's been 5
  days", plus a simple M/W/F view.

### Motivation
- **PRs, streaks & weekly recap** — personal records, training streak, weekly digest
  (could become the body of the backup email).

### Data safety
- **Automatic weekly backup** — hands-off to email (3rd-party service) or Google
  Drive (your own cloud). One-tap reminder already shipped.
- **Edit a past session** (fix a mis-logged rep) + an **error boundary** with a
  one-tap export escape hatch.

### Polish
- **First-run calibration** wizard (bodyweight + dial in starting weights).
- **Session notes** ("felt strong / shoulder twinge").
- **In-app "new version — refresh" prompt** when a deploy lands.
- **Mid-workout swap** (currently swaps apply to the next session).
- Show RIR/effort in exercise history (per-set chips).

### Not feasible / out of scope
- Apple Health sync (needs a native app).
- True scheduled push reminders (needs a server).
- A/B program split (fights the plan's single full-body session 3×/week).
