# Iron Ladder

A personal **gym strength coach** — an installable web app (PWA) that runs on
your iPhone, stores everything on-device, and drives **double progression** so
the work gets harder over time. Think "Runna, but for your gym routine."

It implements the training spec in [`docs/training-program.md`](docs/training-program.md):
three short full-body workouts — A (squat & bench), B (hinge & press) and C
(leg press & chest) — each three supersetted pairs, six exercises, 3 sets each,
every exercise climbing its own load ladder. (The original
single-dumbbell home program is retired but its history is kept:
[`docs/home-dumbbell-program.md`](docs/home-dumbbell-program.md).)

## What it does

- **Guided sessions** — step through the workout pair by pair, with form cues,
  a rest timer (~90 s), and a countdown for timed work (plank, kettlebell
  circuit). In a pair (and the circuit), **Next** alternates through the group
  round by round.
- **Double progression, automatic** — add reps toward the top of the range; once
  you hit all three sets at the top, it bumps you one step on that exercise's
  ladder: the next barbell plate, dumbbell, machine pin or kettlebell — or less
  help on the assisted pull-up / dip machine, then weight on a belt. Step sizes
  match your gym (Settings → Gym equipment).
- **Adaptive coaching** — detects stalls and suggests bridging / checking recovery,
  flags a starting load that was too light or heavy on day one, climbs the plank
  by +10 s, and tells you when an unloaded movement (ab wheel) needs a harder
  variation.
- **Tracking** — per-exercise charts (work and top set), session history, and
  bodyweight / protein / sleep logging (the "raw materials").
- **Yours, offline, portable** — IndexedDB storage, no account, plus one-tap
  JSON **export/import** so a new phone never means lost history.

## Put it on your iPhone

Once Pages is live (see below), on your iPhone:

1. Open the app URL in **Safari**: `https://simiusstealth.github.io/Weight-training/`
2. Tap the **Share** button → **Add to Home Screen**.
3. Launch it from the new icon — it runs full-screen like a native app and works
   offline. Your data lives on the phone.

> Back up occasionally from **Settings → Export**. To move to a new phone, export
> on the old one and **Import** on the new one.

## One-time GitHub Pages setup

The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every
push. To switch it on:

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. (If deploying from this feature branch) under **Settings → Environments →
   github-pages → Deployment branches**, allow this branch — or merge to `main`,
   which is already permitted.

The deploy job prints the live URL.

## Local development

```bash
npm install
npm run icons     # regenerate the PWA icons (only needed if you change the art)
npm run dev       # http://localhost:5173
npm test          # progression-engine unit tests
npm run build     # type-check + production build into dist/
```

## How it's built

- **React + TypeScript + Vite**, `vite-plugin-pwa` for the service worker + manifest.
- **Zustand** store wiring the engine, storage and navigation.
- **IndexedDB** (via `idb`) for persistence.
- No charting or UI-component dependency — charts and icons are hand-rolled SVG to
  keep the bundle small on mobile.

```
src/
  program/      the "fitness brain": ladders, exercises & routine blocks, plan,
                flow (pair alternation), progression (+ tests), analytics
  storage/      IndexedDB layer, data model, backup/restore
  store/        Zustand store (workout flow, progression commit, settings, data)
  screens/      Today · Progress · History · Settings
  overlays/     Workout · ExerciseDetail · SessionDetail · Summary
  ui/           icons, charts, shared components
```

The progression rules live in `src/program/progression.ts` and are covered by
`src/program/progression.test.ts`.
