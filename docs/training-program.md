# Gym Routine — Training Spec

The training system the app implements: the routine's structure, the exercises
with their parameters, the equipment and how loads are logged, and the
progression rules. It is the "fitness brain" — written so a person can follow it
and an app can implement it. It contains no code.

The structure follows the r/bodyweightfitness Recommended Routine (pairs + a core
triplet), moved to a gym: barbells, dumbbells, machines, cables and kettlebells
replace the bodyweight-only steps where the gym does them better.

**Who it's for:** an adult training for strength and muscle, 3 sessions per week,
with a commercial gym's equipment. (The single-dumbbell home program this
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

**Three short full-body workouts — A, B and C — about 45 minutes each**, three
times a week. Every workout is **three pairs, six exercises**: each pair
supersets two lifts that don't compete (legs with a pull, a push with a pull,
a small leg or arm move with core), so you rest one while working the other.
Every session hits legs, a push, a pull and core.

| Pair | Workout A · Squat & Bench | Workout B · Hinge & Press | Workout C · Leg Press & Chest |
|---|---|---|---|
| **1** | Barbell back squat · Pull-up (assisted) | Barbell RDL · Lat pulldown | Leg press · Machine row |
| **2** | Barbell bench press · Close-grip cable row | Shoulder press · Assisted dip | Pec deck · Cable triceps pushdown |
| **3** | Hamstring curl · Abdominal machine | Zottman curl · Pallof press | Back extension · Hanging leg raise |

**Alternating**: one set of the first lift, rest ~90 s, one set of the second,
rest, … three rounds, then move to the next pair. 6 exercises × 3 sets = 18
working sets a session.

**Optional extras** (straight sets, not scheduled by default): calf raise, leg
extension, push-up. The **kettlebell core circuit** is an optional block too.

### Default week

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| Workout A | rest | Workout B | rest | Workout C | rest | rest |

Per week: legs, back, chest and core 3×; arms 2×; shoulders 1× directly (plus
every press). Every day is editable: switch blocks on/off, swap a slot's
exercise, remove one, or add an extra.

---

## 3. The exercises

Every exercise is **3 working sets**. The first option in each slot is the
default; the others are swaps (each keeps its own load and history). Start loads
are estimates — the app flags a clearly-wrong start after the first session —
except the leg press, pec deck, abdominal machine and assisted dip, which start
at the loads you actually use.

### Workout A · Squat & Bench

| Pair | Slot | Options | Sets × reps | Start |
|---|---|---|---|---|
| 1 | Squat | **Barbell back squat** · Goblet squat | 3 × 5–8 | 40 kg · 14 kg |
| 1 | Vertical pull | **Pull-up** (assisted → bodyweight → belt) | 3 × 5–8 | bodyweight |
| 2 | Bench press | **Barbell bench press** · Dumbbell bench · Incline DB · Decline DB · Machine chest press | 3 × 5–8 | 30 kg · 12 / 10 / 12 kg · 30 kg |
| 2 | Row | **Close-grip cable row** · T-bar row | 3 × 5–8 | 35 · 20 kg |
| 3 | Hamstrings | **Hamstring curl** (machine) | 3 × 8–12 | 25 kg |
| 3 | Abs | **Abdominal machine** · Ab wheel rollout | 3 × 6–10 · 3 × 8–12 | 55 kg · bodyweight |

### Workout B · Hinge & Press

| Pair | Slot | Options | Sets × reps | Start |
|---|---|---|---|---|
| 1 | Hinge | **Barbell RDL** · Deadlift · Barbell hip thrust | 3 × 5–8 | 40 · 50 · 40 kg |
| 1 | Lat pulldown | **Lat pulldown** · Close-grip · Wide-grip | 3 × 8–12 | 30 · 30 · 25 kg |
| 2 | Overhead press | **Shoulder press** (machine) | 3 × 5–8 | 25 kg |
| 2 | Dip | **Assisted dip** · Machine dip (seated) · Bench dip | 3 × 5–8 | 35 kg assist · 30 kg · bodyweight |
| 3 | Biceps | **Zottman curl** · Biceps curl | 3 × 8–12 | 8 kg dumbbells |
| 3 | Anti-rotation | **Pallof press** (each side) | 3 × 8–12 | 10 kg |

### Workout C · Leg Press & Chest

| Pair | Slot | Options | Sets × reps | Start |
|---|---|---|---|---|
| 1 | Leg press | **Leg press** · Bulgarian split squat (per leg) | 3 × 8–12 | 130 kg · 10 kg dumbbell |
| 1 | Chest-supported row | **Machine row** | 3 × 5–8 | 35 kg |
| 2 | Chest fly | **Pec deck** · Low-to-high cable fly · High-to-low cable fly | 3 × 8–12 | 40 kg · 5 kg per stack |
| 2 | Triceps | **Cable triceps pushdown** (rope) · Triceps bar pushdown · Overhead cable extension | 3 × 8–12 | 15 · 20 · 10 kg |
| 3 | Lower back | **Back extension** | 3 × 8–12 | bodyweight, + plate |
| 3 | Abs | **Hanging leg raise** | 3 × 8–12 | bodyweight |

### Extras (straight sets, optional)

| Slot | Options | Sets × reps | Start |
|---|---|---|---|
| Calves | **Calf raise** (machine) | 3 × 12–20 | 40 kg |
| Quads | **Leg extension** (machine) | 3 × 8–12 | 30 kg |
| Push-up | **Push-up** · Diamond push-up | 3 × 5–8 | bodyweight |

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
| Assisted lifts (pull-up, dip) | **minus** = assisted-machine help, 0 = bodyweight, **plus** = belt | assistance in pin steps → 0 → +2,5 kg steps |
| Unloaded (ab wheel, hanging leg raise, plank) | nothing | — |

The three gym-specific step sizes are set once in **Settings → Gym equipment**.

**Typing a weight in.** When a machine's real steps don't match the ladder,
tap the load (in a workout or on the exercise page) and type the exact weight,
e.g. 37,5 kg. A load typed in mid-workout becomes the exercise's weight when
the workout is finished; the next level-up then moves to the next rung above
it.

---

## 5. Progression

**Double progression, per exercise, independently:**

1. Work in the rep range (5–8 for the barbell and bodyweight compounds, 8–12 for
   machines, cables and core; the abdominal machine 6–10).
2. Each session, add reps toward the top of the range on every set.
3. All three sets at the top → **next rung** next session: the next plate,
   dumbbell, pin or bell — or, on an assisted lift, **less assistance**
   (−10 → −5 → bodyweight → +2,5 kg on a belt).
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

- Go pair by pair: one set of each exercise per round, ~90 s rest between
  sets, three rounds.
- Short on time? Drop pair 3 — finish early and the session still counts.
- Log every set (and, optionally, reps in reserve). "Beat last time" is the goal.
- Reassess every 8–12 weeks or when a lift stalls for good: swap the variation,
  shift the rep range, or add a set.

## 7. Safety

- Use the rack's safety pins for squats and the safety arms (or a spotter) for
  the bench.
- Discomfort is fine; sharp or joint-centred pain is not — stop that exercise.
- When in doubt, go lighter and add a rep.
