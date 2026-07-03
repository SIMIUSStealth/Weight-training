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
- **Insights tab in Progress** — "Needs attention" urgency feed (week-target
  slipping/tight, 4+ day training gap, stalled lifts, muscles 10+ days
  untrained) + motivation: all-time tiles (workouts, kg lifted, PRs, best week
  streak), 4-week momentum deltas, top est.-1RM strength gains.
- **Home-screen hero** — week streak (consecutive weeks hitting the plan's
  training-day target) + segmented week-progress bar + a one-tap "Start <next
  planned day>" button (offers catch-up days when you're behind).
- **Personal records** — rep PRs (most ever at a weight), estimated-1RM PRs
  (Epley), and longest-hold PRs, detected at session commit against prior
  history only (first session sets a quiet baseline). Celebrated in the
  summary, stamped on the session (trophy count in History), and an
  "all-time best" row on the exercise page.
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

## Hevy gap analysis (2026-07, analysis only)

Compared Iron Ladder against Hevy's advertised feature set and independent
reviews. Two structural takeaways:

1. **Iron Ladder's edge is coaching.** Reviewers consistently note Hevy "logs
   what you do but doesn't tell you what to do next" (no periodization or
   auto-regulation). Our double-progression engine, stall/bridge coaching,
   RIR-aware effort notes, and start-weight self-correction are the
   differentiator — deepen these rather than dilute them.
2. **Hevy's edge is logging polish + motivation loops.** The gaps worth
   closing are almost all cheap analytics/UX wins on data we already store.

Adoptable (prioritized):
- **Tier 1 — cheap, high impact**
  - ~~Live PR detection + celebration~~ → shipped (see above).
  - Estimated 1RM trend chart per exercise (Epley), alongside volume/top-set
    (the per-set 1RM math now exists in records.ts).
  - Warm-up set calculator: % of working weight snapped DOWN to ladder rungs
    (e.g. 50% × 8 before the first exercise) — the spec's warm-up, made concrete.
  - Per-exercise session notes ("felt strong", "elbow niggle") shown as
    last-time context next time.
  - Supersets: pair adjacent small-muscle slots (forearms, abs) to shorten
    sessions; a session-flow grouping, no engine change.
- **Tier 2 — medium**
  - Monthly report / year-in-review recap (extends the planned weekly recap).
  - Body measurements beyond weight (arms/chest/waist) on the History screen.
  - Custom exercises (user-defined name/muscle/rep-range → joins a slot).
  - Muscle-distribution trend (4-week volume history, not just current week).
- **Not adoptable in a PWA / by design**
  - Apple Watch app, home-screen widgets, Live Activities (native-only APIs).
  - Social feed, leaderboards, routine sharing, coach marketplace (single-user
    app by design).
  - Plate/barbell calculator (adjustable dumbbell — the ladder already is one).
  - Exercise video library (hosting out of scope; form cues + could link out).
