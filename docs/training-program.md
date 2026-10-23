# Gym Routine — Training Spec

The training system the app implements: the routine's structure, the exercises
with their parameters, the equipment and how loads are logged, and the
progression rules. It is the "fitness brain" — written so a person can follow it
and an app can implement it. It contains no code.

The structure follows the r/bodyweightfitness Recommended Routine (pairs + a core
triplet), moved to a gym: barbells, dumbbells, machines, cables and kettlebells
replace the bodyweight-only steps where the gym does them better.

**Who it's for:** an adult training for strength and muscle, with a commercial
gym's equipment — the A/B program twice a week, the pairs routine on other days. (The single-dumbbell home program this
replaced is kept in [`home-dumbbell-program.md`](home-dumbbell-program.md).)

---

## 1. Philosophy

Unchanged from the home program, and still the point of the app:

- **Progressive overload is the engine** — over weeks the work must trend up: more
  reps, then more load.
- **Effort drives growth** — working sets end roughly 1–3 reps short of failure.
- **Consistency beats optimization** — a routine you run for a year beats a
  perfect one you abandon.
- **Recovery is part of the program** — non-consecutive training days; protein
  1.6–2.2 g/kg/day, a slight calorie surplus, 7–9 h sleep.

---

## 2. The routine

### The A/B program (Monday and Wednesday)

Two full-body sessions of **~50 minutes**, alternated about twice a week.
**Straight sets** — finish all sets of one exercise before moving on.

**Session A**

| # | Exercise | Sets × reps | Rest | Swaps (similar, other kit) |
|---|---|---|---|---|
| 1 | Single-leg leg press | 3 × 10 / side | 90 s | Bulgarian split squat · Leg press · Goblet squat |
| 2 | Assisted pull-up (14 kg assist) | 3 × 6–8 | 90 s | Lat pulldown · Close-grip pulldown |
| 3 | DB bench press (18 kg) | 3 × 8 | 90 s | Machine chest press · Incline DB press · Barbell bench · Push-up |
| 4 | DB Romanian deadlift | 3 × 10 | 90 s | Barbell RDL · Barbell hip thrust |
| 5 | Close-grip cable row (35 kg) | 3 × 10 | 75 s | Machine row · One-arm DB row · T-bar row |
| 6 | Ab crunch machine (50 kg) | 3 × 10–12 | 60 s | Kneeling cable crunch · Crunch machine (feet anchored) · Hanging leg raise |
| — | *Optional:* biceps curl + triceps pushdown | 2 sets each | — | Zottman curl · Bar pushdown · Overhead cable extension |

**Session B**

| # | Exercise | Sets × reps | Rest | Swaps (similar, other kit) |
|---|---|---|---|---|
| 1 | Leg press | 3 × 10 | 90 s | Goblet squat · Barbell back squat |
| 2 | Lat pulldown (40 kg) | 3 × 8–10 | 90 s | Close-grip / wide-grip pulldown · Assisted pull-up |
| 3 | Shoulder press (25 kg) | 3 × 8 | 90 s | DB shoulder press |
| 4 | Back extension | 3 × 12 | 75 s | DB Romanian deadlift · Barbell hip thrust |
| 5 | Assisted dip (14 kg assist) | 3 × 8 | 75 s | Machine dip · Bench dip |
| 6 | Pallof press | 3 × 10 / side | 60 s | Ab wheel rollout |
| — | *Optional:* biceps curl + triceps pushdown | 2 sets each | — | as Session A |

**How to run it**

- Alternate A and B, about 2× per week. Warm up 5 min before starting.
- Weeks 1–2: leave ~3 reps in the tank on leg work.
- Hit the top of the rep range on all sets → add load next time (+2 kg per
  dumbbell, +1 plate / pin, or −2 kg assist).
- Week 6: optional lighter week (2 sets each).

A swap takes over the slot's sets, reps and rest — swap the DB bench for the
machine chest press and it's still 3 × 8, 90 s — and keeps its own load and
history. The app counts the program's weeks from the first A or B workout and
says when it's a run-in week (1–2) or the lighter week (6).

### The pairs routine

**Strength work: 40–60 minutes.** A session is built from blocks, always in
this order:

| Block | What | Sets × reps | How |
|---|---|---|---|
| **Pair 1 · Compounds** | Pull-up progression · Squat progression · Compound bench press | 3 × 5–8 each | Alternate the three |
| **Pair 2** *(optional)* | Dip progression · Hinge progression | 3 × 5–8 each | Alternate |
| **Pair 3** | Row progression · Push *(optional)* | 3 × 5–8 each | Alternate |
| **Isolations** *(extra)* | Triceps extension · Biceps curl · Extra chest · Lats | 3 × 8–12 | Straight sets |
| **Leg day** *(extra)* | Leg press · Romanian deadlift · Hamstring curl · Leg raises · Bulgarian split squat · Calf raises | 3 × 8–12 (calves 12–20) | Straight sets |
| **Core triplet** | Anti-extension · Anti-rotation · Extension | 3 × 8–12 each | Alternate the three |
| **Kettlebell core** *(alternative)* | 8-move circuit | 30 s each, 2–3 rounds | Circuit |

**Alternating** (pairs, triplets, the circuit): one set of the first exercise,
rest, one set of the next, rest, … then round again until each has its three
sets. **Rest ~90 s** between sets. Isolations and leg-day extras are done as
straight sets.

The **kettlebell core circuit** replaces the anti-extension + anti-rotation part of
the core triplet (keep the back extension).

### Default week

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| Session A | rest | Session B | rest | Full routine + Isolations | rest | rest |

"Full routine" = Pairs 1–3 + the core triplet. Every day is editable: switch
blocks on/off, swap a slot's exercise, remove one, or add an extra from any block.

---

## 3. The exercises

Every exercise is **3 working sets** (the A/B program's arm finisher: 2). The
first option in each slot is the default; the others are swaps (each keeps its
own load and history). Start loads are the A/B program's stated loads where it
gives one, estimates otherwise — the app flags a clearly-wrong start after the
first session. The A/B program's own new lifts: single-leg leg press (50 kg),
DB Romanian deadlift (16 kg), one-arm DB row (18 kg), kneeling cable crunch
(25 kg), DB shoulder press (10 kg) — all estimates.

### Pair 1 · Compounds (3 × 5–8)

| Slot | Options | Equipment | Start |
|---|---|---|---|
| Pull-up progression | **Pull-up** | assisted / bodyweight / belt | 14 kg assist |
| Squat progression | **Barbell back squat** · Goblet squat | barbell · dumbbell | 40 kg · 14 kg |
| Compound bench press | **Barbell bench press** · Dumbbell bench · Incline dumbbell press (upper chest, front delts) · Decline dumbbell press (lower chest) | barbell · dumbbells | 30 kg · 18 / 10 / 12 kg |

With barbells available, the barbell squat (and deadlift) replace the bodyweight
squat/hinge progressions once the basic pattern is solid; the goblet squat stays
as the place to perfect it.

### Pair 2 · optional (3 × 5–8)

| Slot | Options | Equipment | Start |
|---|---|---|---|
| Dip progression | **Bench dip** · Machine dip · Dip (assisted → bodyweight → weighted) | bodyweight · machine · assisted | bodyweight · 30 kg · 14 kg assist |
| Hinge progression | **Deadlift** (also a compound) · Barbell hip thrust | barbell | 50 · 40 kg |

### Pair 3 (3 × 5–8)

| Slot | Options | Equipment | Start |
|---|---|---|---|
| Row progression | **Close-grip cable row** · Machine row · T-bar row | cable · machine | 35 · 35 · 20 kg |
| Push *(optional)* | **Machine chest press** · Shoulder press (machine) · Push-up · Diamond push-up | machine · bodyweight | 30 · 25 kg · bodyweight |

### Isolations (3 × 8–12) — extra toning

| Slot | Options | Start |
|---|---|---|
| Triceps extension | **Cable triceps pushdown** (rope) · Triceps bar pushdown · Overhead cable extension | 15 · 20 · 10 kg |
| Biceps curl | **Zottman curl** · Biceps curl | 8 kg dumbbells |
| Extra chest | **Low-to-high cable fly** (upper chest) · High-to-low cable fly (lower chest) | 5 kg per stack |
| Lats (also the pull-up replacement) | **Lat pulldown** · Close-grip · Wide-grip | 40 · 30 · 25 kg |

### Leg day extras (3 × 8–12)

| Slot | Options | Start |
|---|---|---|
| Leg press | **Leg press** (machine) | 130 kg |
| Romanian deadlift | **Barbell RDL** | 40 kg (estimate) |
| Hamstring curl | **Hamstring curl** (machine) | 25 kg |
| Leg raises | **Leg extension** (machine) · Hanging leg raise | 30 kg · bodyweight |
| Bulgarian split squat | **Bulgarian split squat** (per leg) | 10 kg dumbbell |
| Calf raises | **Calf raise** (machine), 3 × 12–20 | 40 kg |

### Core triplet (3 × 8–12)

| Slot | Exercise | Load |
|---|---|---|
| Anti-extension | **Ab wheel rollout** | bodyweight only |
| Anti-rotation | **Pallof press** (each side) | cable, 10 kg |
| Extension | **Back extension** (hyperextension bench) | bodyweight, + plate |
| Crunch *(add-on)* | **Ab crunch machine** · Feet anchored | 50 · 20 kg |

### Kettlebell core circuit (30 s each, 2–3 rounds)

Plank pull-through (12 kg) · Halo (8 kg) · Around the world (12 kg) · Shoveling
(12 kg) · Swing (16 kg) · Iron trident (12 kg) · Plank (no kettlebell) ·
Sit-up to stand (8 kg — works the legs too).

Form cues for every exercise live in the app (`src/program/exercises.ts`), with a
one-line description and a link to a form guide from a reputable exercise library
(ACE Fitness, ExRx.net, NASM, Catalyst Athletics) in `src/program/guides.ts`.

---

## 4. Equipment and how loads are logged

Each exercise climbs a **ladder** of the loads its equipment can actually make,
and progression only ever moves to the **adjacent rung**:

| Equipment | Logged load | Ladder |
|---|---|---|
| Barbell | everything on the bar, bar included | 20 kg up, in the gym's smallest jump (2,5 or 5 kg) |
| Dumbbells | **one** dumbbell | the rack's step (1, 2 or 2,5 kg) |
| Machines & cables | the stack (cable flies: one stack); T-bar row: plates loaded | one pin hole (2,5 or 5 kg) |
| Kettlebells | the bell | 4, 6, 8 … 24, 28, 32, 36, 40, 48 kg |
| Bodyweight lifts (push-ups, bench dips, back extension) | weight **added** — 0 = bodyweight | +2,5 kg steps |
| Assisted lifts (pull-up, dip) | **minus** = assisted-machine help, 0 = bodyweight, **plus** = belt | the machine's step (2, 2,5 or 5 kg) → 0 → +2,5 kg steps |
| Unloaded (ab wheel, hanging leg raise, plank) | nothing | — |

The four gym-specific step sizes are set once in **Settings → Gym equipment**.

---

## 5. Progression

**Double progression, per exercise, independently:**

1. Work in the rep range (the A/B sessions' own; 5–8 for the compounds, 8–12 for
   isolations and core). A fixed target like 3 × 8 is a range whose top is 8.
2. Each session, add reps toward the top of the range on every set.
3. All sets at the top → **next rung** next session: the next plate,
   dumbbell, pin or bell — or, on an assisted lift, **less assistance**
   (14 → 12 → … → 2 kg assist → bodyweight → +2,5 kg on a belt).
4. Reps drop after a jump — expected. Build back to the top, jump again.

Special cases:

- **Unloaded progressions** (ab wheel, hanging leg raise) have no load to add.
  Once you own 3 × top of range, make the movement harder (more range, a tougher
  variation, slower lowering).
- **Plank** (in the KB circuit): hold the target on all three rounds → +10 s.
- **Kettlebell circuit moves**: complete all three 30 s rounds → next bell; the
  time stays 30 s.
- **Stall** (no new best at a load for 3 sessions): check recovery first, then
  bridge — push 2–3 reps past the top before the jump — or swap the variation.
- **Starting loads** self-correct: smash past the top on day one → it climbs
  quickly; can't reach the bottom → drop a rung.

---

## 6. Running a session

- Go block by block. In alternating blocks, one set of each exercise per round,
  ~90 s rest between sets.
- Optional pieces (Pair 2, the Pair 3 push, isolations, leg-day extras) are the
  first to drop on a short day — finish early and the session still counts.
- Log every set (and, optionally, reps in reserve). "Beat last time" is the goal.
- Reassess every 8–12 weeks or when a lift stalls for good: swap the variation,
  shift the rep range, or add a set.

## 7. Safety

- Use the rack's safety pins for squats and the safety arms (or a spotter) for
  the bench.
- Discomfort is fine; sharp or joint-centred pain is not — stop that exercise.
- When in doubt, go lighter and add a rep.
