// The gym routine (Training Spec §3). Three short full-body workouts — A, B
// and C — each built as three PAIRS (superset two lifts, alternate sets), plus
// optional extras and the kettlebell core circuit. Each block is a list of
// SLOTS, and each slot is filled by one exercise from its options, the first
// being the default. Swaps stay within a slot; every exercise keeps its own
// weight and history.
//
// The single-dumbbell home program the app started with is retired to
// ./home-exercises.ts: still registered (so old sessions resolve), never offered.

import { HOME_EXERCISES } from './home-exercises'
import type { Equipment } from './ladder'

export type Muscle = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Forearms'

export type ExerciseKind = 'reps' | 'time'

export interface ExerciseDef {
  id: string
  name: string
  muscle: Muscle
  /** The routine slot this exercise fills (swaps stay within a slot). */
  slot: string
  /** Working sets (rounds, for the kettlebell circuit) — always 3. */
  sets: number
  kind: ExerciseKind
  /** Bottom of the rep range (reps exercises only). */
  repMin: number
  /** Top of the rep range — the per-set "level-up" target (reps exercises only). */
  repMax: number
  /** What the load is and which ladder it climbs (see ladder.ts). */
  equipment: Equipment
  /** Starting load in kg (0 = bodyweight / no load). */
  startWeightKg: number
  /** True when the rep target is per side (each arm / leg does the full count). */
  perArm: boolean
  /** Starting work time in seconds (time exercises only). */
  startSeconds?: number
  /**
   * Seconds added to the target each time all sets hit it (unloaded holds).
   * Loaded time work (the kettlebell circuit) keeps its time and climbs the
   * kettlebell instead.
   */
  timeIncrementSeconds?: number
  /** A short note on how the load is held / logged. */
  holdNote?: string
  formCue: string
  /** Retired (home-program) exercise: kept for history, never offered. */
  retired?: boolean
}

/** Note shown on two-dumbbell lifts. */
const ONE_DUMBBELL = 'Log the weight of ONE dumbbell.'
const ASSIST_NOTE =
  'Assisted machine = minus kg (the help it gives). Dip belt = plus kg. 0 = bodyweight.'

// ---------- routine blocks ----------

export type BlockId = 'day-a' | 'day-b' | 'day-c' | 'extras' | 'kb-core'

export interface Block {
  id: BlockId
  /** Full name, e.g. "Workout A · Squat & Bench". */
  name: string
  /** Short name for day labels, e.g. "Workout A". */
  short: string
  /**
   * Sets alternate between exercises (one set of each, then round again)
   * instead of straight sets — within each pair when the slots are paired,
   * otherwise across the whole block (the kettlebell circuit).
   */
  alternate: boolean
  /** Not essential — skip it on a short day. */
  optional: boolean
  /** How to run the block. */
  note: string
}

const PAIRS_NOTE =
  'Three pairs. Alternate the two lifts in a pair — one set of each, ~90 s rest — for three rounds, then on to the next pair.'

export const BLOCKS: readonly Block[] = [
  {
    id: 'day-a',
    name: 'Workout A · Squat & Bench',
    short: 'Workout A',
    alternate: true,
    optional: false,
    note: PAIRS_NOTE,
  },
  {
    id: 'day-b',
    name: 'Workout B · Hinge & Press',
    short: 'Workout B',
    alternate: true,
    optional: false,
    note: PAIRS_NOTE,
  },
  {
    id: 'day-c',
    name: 'Workout C · Leg Press & Chest',
    short: 'Workout C',
    alternate: true,
    optional: false,
    note: PAIRS_NOTE,
  },
  {
    id: 'extras',
    name: 'Extras',
    short: 'Extras',
    alternate: false,
    optional: true,
    note: 'Optional — straight sets. Tack one on when you have time to spare.',
  },
  {
    id: 'kb-core',
    name: 'Kettlebell core',
    short: 'KB core',
    alternate: true,
    optional: true,
    note: 'An optional core circuit: 30 s each, 2–3 rounds.',
  },
] as const

export const BLOCKS_BY_ID: Record<BlockId, Block> = Object.fromEntries(
  BLOCKS.map((b) => [b.id, b]),
) as Record<BlockId, Block>

export function isBlockId(v: unknown): v is BlockId {
  return typeof v === 'string' && v in BLOCKS_BY_ID
}

// ---------- the gym exercises ----------

/** Shared shape of the 30-second kettlebell circuit moves. */
function kb(
  id: string,
  name: string,
  startWeightKg: number,
  formCue: string,
): ExerciseDef {
  return {
    id,
    name,
    muscle: 'Core',
    slot: id,
    sets: 3,
    kind: 'time',
    repMin: 0,
    repMax: 0,
    equipment: 'kettlebell',
    startWeightKg,
    perArm: false,
    startSeconds: 30,
    formCue,
  }
}

export const GYM_EXERCISES: readonly ExerciseDef[] = [
  // ----- Squat, pull, bench (Workout A) -----
  {
    id: 'pull-up',
    name: 'Pull-up',
    muscle: 'Back',
    slot: 'pull',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'assisted',
    startWeightKg: 0,
    perArm: false,
    holdNote: ASSIST_NOTE,
    formCue:
      'Hang from the bar, hands just outside shoulder width, palms away. Pull until your chin clears the bar, then lower all the way to straight arms under control — no kipping. Can’t do 5 yet? Use the assisted machine and log the help as minus kg: the app walks you toward bodyweight, then adds weight. (The lat pulldown in Workout B is the stand-in on days you skip these.)',
  },
  {
    id: 'back-squat',
    name: 'Barbell Back Squat',
    muscle: 'Legs',
    slot: 'squat',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'barbell',
    startWeightKg: 40,
    perArm: false,
    formCue:
      'Bar on your upper back in the rack, feet about shoulder width, toes slightly out. Brace, then sit down and back until the hip crease is at or below the knee, knees tracking over the toes, chest tall. Drive up through mid-foot. Set the safety pins just below your bottom position.',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    muscle: 'Legs',
    slot: 'squat',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'dumbbell',
    startWeightKg: 14,
    perArm: false,
    holdNote: 'One dumbbell held vertically against the chest.',
    formCue:
      'Hold one dumbbell vertically against your chest, elbows down. Sit back and down between your knees until your thighs are at least parallel, chest tall, then drive up through mid-foot. The way to perfect the basic squat before (or between) barbell blocks.',
  },
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    muscle: 'Chest',
    slot: 'bench',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'barbell',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'Eyes under the bar, shoulder blades pinched together, feet planted. Lower the bar under control to mid-chest with the elbows ~45° from your sides, then press back up over the shoulders. Use the safety arms or a spotter.',
  },
  {
    id: 'db-bench-press',
    name: 'Dumbbell Bench Press',
    muscle: 'Chest',
    slot: 'bench',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'dumbbell',
    startWeightKg: 12,
    perArm: false,
    holdNote: ONE_DUMBBELL,
    formCue:
      'Flat bench, a dumbbell in each hand at chest level, shoulder blades back and down. Press up to straight arms, bringing the bells slightly together at the top, then lower slowly into a deep stretch.',
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    muscle: 'Chest',
    slot: 'bench',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'dumbbell',
    startWeightKg: 10,
    perArm: false,
    holdNote: ONE_DUMBBELL,
    formCue:
      'Bench at 30–45°. Press the dumbbells from upper-chest level to straight arms, lower under control. Shifts the work toward the upper chest and front shoulders.',
  },
  {
    id: 'decline-db-press',
    name: 'Decline Dumbbell Press',
    muscle: 'Chest',
    slot: 'bench',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'dumbbell',
    startWeightKg: 12,
    perArm: false,
    holdNote: ONE_DUMBBELL,
    formCue:
      'Bench slightly declined, feet hooked in. Press from lower-chest level to straight arms, lower under control. Shifts the work toward the lower chest.',
  },

  // ----- Dips and hinges (Workout B) -----
  {
    id: 'bench-dip',
    name: 'Bench Dip',
    muscle: 'Arms',
    slot: 'dips',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'bodyweight',
    startWeightKg: 0,
    perArm: false,
    holdNote: 'Plate on your lap = plus kg. 0 = bodyweight.',
    formCue:
      'Hands on the edge of a bench behind you, legs out in front. Lower by bending the elbows to about 90°, shoulders down and back, then press up to straight arms. Too easy? Rest a plate on your lap.',
  },
  {
    id: 'machine-dip',
    name: 'Machine Dip',
    muscle: 'Arms',
    slot: 'dips',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'machine',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'Seated dip machine, chest up, handles at your sides. Press down until the arms are straight, squeeze the triceps, then let the handles rise slowly back to about 90° at the elbow.',
  },
  {
    id: 'dip',
    name: 'Assisted Dip',
    muscle: 'Chest',
    slot: 'dips',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'assisted',
    startWeightKg: -35,
    perArm: false,
    holdNote: ASSIST_NOTE,
    formCue:
      'On the assisted dip machine, knees on the pad, arms locked, a slight forward lean. Lower until the shoulders are just below the elbows, then press back up to lockout. Each level-up takes away one pin of help — toward bodyweight, then weight on a belt.',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    muscle: 'Legs',
    slot: 'hinge',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'barbell',
    startWeightKg: 50,
    perArm: false,
    formCue:
      'Bar over mid-foot, hip-width stance. Hinge down and grip just outside the legs, back flat, lats tight. Push the floor away and stand tall by driving the hips through, then lower the bar back down the same path. Reset each rep.',
  },
  {
    id: 'barbell-rdl',
    name: 'Barbell RDL',
    muscle: 'Legs',
    slot: 'hinge',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'barbell',
    startWeightKg: 40,
    perArm: false,
    formCue:
      'Start standing with the bar. Soft knees, push the hips back and slide the bar down your thighs until the hamstrings are stretched (around mid-shin), back flat. Drive the hips forward to stand. Hinge, don’t squat.',
  },
  {
    id: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    muscle: 'Legs',
    slot: 'hinge',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'barbell',
    startWeightKg: 40,
    perArm: false,
    formCue:
      'Upper back on a bench, padded bar across your hips, feet flat. Drive the hips up until you’re straight from shoulders to knees, squeeze the glutes hard, lower under control. Chin tucked, ribs down.',
  },

  // ----- Rows and presses -----
  {
    id: 'cable-row',
    name: 'Close-Grip Cable Row',
    muscle: 'Back',
    slot: 'row',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'cable',
    startWeightKg: 35,
    perArm: false,
    formCue:
      'Seated at the cable with the V-handle, knees soft, chest tall. Pull the handle to your lower ribs, squeezing the shoulder blades together, then let the arms stretch forward without rounding your back.',
  },
  {
    id: 'machine-row',
    name: 'Machine Row',
    muscle: 'Back',
    slot: 'chest-row',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'machine',
    startWeightKg: 35,
    perArm: false,
    formCue:
      'Chest against the pad, grip the handles. Drive the elbows back past your torso, squeeze the shoulder blades, then return slowly to a full stretch.',
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    muscle: 'Back',
    slot: 'row',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'machine',
    startWeightKg: 20,
    perArm: false,
    holdNote: 'Log the plates you load (not the bar).',
    formCue:
      'Straddle the bar (or chest on the pad), hinged to about 45° with a flat back. Row the handle to your lower chest, squeeze, lower under control.',
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    muscle: 'Chest',
    slot: 'bench',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'machine',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'Seat set so the handles line up with mid-chest. Press forward to straight arms, then return slowly until you feel the chest stretch. Shoulder blades stay against the pad.',
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    muscle: 'Shoulders',
    slot: 'overhead',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'machine',
    startWeightKg: 25,
    perArm: false,
    formCue:
      'Shoulder press machine, seat set so the handles start at shoulder height. Press overhead to straight arms, lower under control back to shoulder level. Ribs down, back against the pad.',
  },
  {
    id: 'push-up',
    name: 'Push-up',
    muscle: 'Chest',
    slot: 'push-up',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'bodyweight',
    startWeightKg: 0,
    perArm: false,
    holdNote: 'Plate on your upper back = plus kg. 0 = bodyweight.',
    formCue:
      'Hands just outside shoulder width, body in one straight line. Lower until the chest nearly touches the floor, elbows ~45° from the body, then press up. Too easy for 8? A plate on the upper back makes it heavier.',
  },
  {
    id: 'diamond-push-up',
    name: 'Diamond Push-up',
    muscle: 'Arms',
    slot: 'push-up',
    sets: 3,
    kind: 'reps',
    repMin: 5,
    repMax: 8,
    equipment: 'bodyweight',
    startWeightKg: 0,
    perArm: false,
    holdNote: 'Plate on your upper back = plus kg. 0 = bodyweight.',
    formCue:
      'Hands together under your chest, thumbs and index fingers making a diamond. Lower with the elbows tucked back along your sides, then press up. Heavier on the triceps than a regular push-up.',
  },

  // ----- Arms, chest, lats -----
  {
    id: 'cable-pushdown',
    name: 'Cable Triceps Pushdown',
    muscle: 'Arms',
    slot: 'triceps',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 15,
    perArm: false,
    formCue:
      'High cable with the rope. Elbows pinned to your sides, push down until the arms are straight and spread the rope at the bottom, then let it rise slowly to about 90°. Only the forearms move.',
  },
  {
    id: 'bar-pushdown',
    name: 'Triceps Bar Pushdown',
    muscle: 'Arms',
    slot: 'triceps',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 20,
    perArm: false,
    formCue:
      'High cable with a straight or V-bar, overhand grip. Elbows pinned to your sides, press the bar down to straight arms, squeeze, return slowly. Don’t lean over the bar.',
  },
  {
    id: 'overhead-cable-extension',
    name: 'Overhead Cable Extension',
    muscle: 'Arms',
    slot: 'triceps',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 10,
    perArm: false,
    formCue:
      'Face away from the cable with the rope behind your head, elbows pointing forward. Extend overhead until the arms are straight, then return slowly into a deep stretch. Loads the long head of the triceps.',
  },
  {
    id: 'zottman-curl',
    name: 'Zottman Curl',
    muscle: 'Arms',
    slot: 'biceps',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'dumbbell',
    startWeightKg: 8,
    perArm: true,
    holdNote: ONE_DUMBBELL,
    formCue:
      'Curl the dumbbells up palms-up, rotate to palms-down at the top, and lower slowly with the overhand grip. Biceps on the way up, forearms on the way down.',
  },
  {
    id: 'biceps-curl',
    name: 'Biceps Curl',
    muscle: 'Arms',
    slot: 'biceps',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'dumbbell',
    startWeightKg: 8,
    perArm: true,
    holdNote: ONE_DUMBBELL,
    formCue:
      'Dumbbells at your sides, palms forward, elbows pinned. Curl up without swinging the torso and lower slowly — the lowering half builds as much as the lifting half.',
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck',
    muscle: 'Chest',
    slot: 'fly',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'machine',
    startWeightKg: 40,
    perArm: false,
    formCue:
      'Seat set so the handles sit at mid-chest height, shoulder blades pinned back against the pad, a soft fixed bend in the elbows. Sweep the handles together in an arc, squeeze for a beat, then open slowly to a chest stretch without letting the shoulders roll forward.',
  },
  {
    id: 'low-to-high-cable-fly',
    name: 'Low-to-High Cable Fly',
    muscle: 'Chest',
    slot: 'fly',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 5,
    perArm: false,
    holdNote: 'Log the weight of ONE stack.',
    formCue:
      'Cables set low, a handle in each hand, slight fixed bend in the elbows. Sweep the hands up and together to about chin height, squeezing the upper chest, then lower slowly to a stretch. For the upper chest.',
  },
  {
    id: 'high-to-low-cable-fly',
    name: 'High-to-Low Cable Fly',
    muscle: 'Chest',
    slot: 'fly',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 5,
    perArm: false,
    holdNote: 'Log the weight of ONE stack.',
    formCue:
      'Cables set high, split stance. With a slight fixed elbow bend, sweep the hands down and together in front of your hips, squeeze, return slowly. For the lower chest.',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscle: 'Back',
    slot: 'lats',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'Thighs locked under the pad, hands just outside shoulder width. Start each rep by pulling the shoulder blades DOWN (no shrug), then drive the elbows toward your back pockets and bring the bar to your collarbone — chest up, only a slight lean back (10–15°). Pause, then let it rise over 2–3 s to a full stretch, shoulders still down. Swinging your torso means it’s too heavy. First time: warm up light, then settle on the weight you can do 10 clean reps with ~2 to spare. Also the pull-up replacement.',
  },
  {
    id: 'close-grip-lat-pulldown',
    name: 'Close-Grip Lat Pulldown',
    muscle: 'Back',
    slot: 'lats',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'V-handle or close neutral grip. Pull to your upper chest with the elbows tight to your sides, squeeze the lats, return slowly to a full stretch.',
  },
  {
    id: 'wide-grip-lat-pulldown',
    name: 'Wide-Grip Lat Pulldown',
    muscle: 'Back',
    slot: 'lats',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 25,
    perArm: false,
    formCue:
      'Hands well outside shoulder width. Pull the bar to your upper chest, elbows driving down and out, chest up; control it back up to a full stretch.',
  },

  // ----- Legs -----
  {
    id: 'hamstring-curl',
    name: 'Hamstring Curl',
    muscle: 'Legs',
    slot: 'hamstring-curl',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'machine',
    startWeightKg: 25,
    perArm: false,
    formCue:
      'Lying or seated curl machine, pad just above the heels, knees lined up with the pivot. Curl the heels toward your glutes, squeeze, lower slowly. Hips stay down.',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscle: 'Legs',
    slot: 'leg-press',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'machine',
    startWeightKg: 130,
    perArm: false,
    formCue:
      'Back and hips flat against the pad, feet hip-width in the middle of the platform. Lower until the knees reach about 90° — stop before your hips peel off the seat — then press through the whole foot. Don’t snap the knees locked at the top.',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    muscle: 'Legs',
    slot: 'quads',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'machine',
    startWeightKg: 30,
    perArm: false,
    formCue:
      'Seated, pad on the front of the ankles, knees lined up with the pivot. Raise the legs until straight, squeeze the quads at the top, lower slowly. No kicking.',
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    muscle: 'Core',
    slot: 'leg-raise',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'none',
    startWeightKg: 0,
    perArm: false,
    formCue:
      'Hang from a bar (or use the captain’s chair). Raise the legs until the thighs pass parallel, curling the pelvis up at the top, then lower slowly without swinging. Bent knees are easier, straight legs harder.',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    muscle: 'Legs',
    slot: 'leg-press',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'dumbbell',
    startWeightKg: 10,
    perArm: true,
    holdNote: 'Log ONE dumbbell (per hand if you hold two).',
    formCue:
      'Rear foot on a bench behind you, dumbbell(s) in hand. Drop straight down over the front leg until the back knee nearly touches the floor, then push up through the front heel. Full count one leg, then switch.',
  },
  {
    id: 'machine-calf-raise',
    name: 'Calf Raise',
    muscle: 'Legs',
    slot: 'calves',
    sets: 3,
    kind: 'reps',
    repMin: 12,
    repMax: 20,
    equipment: 'machine',
    startWeightKg: 40,
    perArm: false,
    formCue:
      'Standing or seated calf machine, balls of the feet on the edge. Lower the heels into a deep stretch, rise as high as you can, pause at the top. Slow and full-range beats heavy and bouncy.',
  },

  // ----- Core -----
  {
    id: 'ab-machine',
    name: 'Abdominal Machine',
    muscle: 'Core',
    slot: 'abs',
    sets: 3,
    kind: 'reps',
    repMin: 6,
    repMax: 10,
    equipment: 'machine',
    startWeightKg: 55,
    perArm: false,
    formCue:
      'Seated crunch machine, chest against the pads (or handles by your head). Curl your ribs down toward your hips — round the spine, don’t just fold at the hips — squeeze the abs hard, then return slowly. Breathe out on the crunch.',
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    muscle: 'Core',
    slot: 'abs',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'none',
    startWeightKg: 0,
    perArm: false,
    formCue:
      'From your knees, roll the wheel out as far as you can without the lower back sagging (ribs down, glutes squeezed), then pull back in with the abs. Own 3 × 12, then roll out further — toward rollouts from standing.',
  },
  {
    id: 'pallof-press',
    name: 'Pallof Press',
    muscle: 'Core',
    slot: 'anti-rotation',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'cable',
    startWeightKg: 10,
    perArm: true,
    formCue:
      'Stand side-on to a cable at chest height, handle at your sternum. Press straight out and hold a beat, resisting the pull to rotate, then bring it back. Full count facing one way, then switch sides.',
  },
  {
    id: 'back-extension',
    name: 'Back Extension',
    muscle: 'Core',
    slot: 'extension',
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    equipment: 'bodyweight',
    startWeightKg: 0,
    perArm: false,
    holdNote: 'Plate held at your chest = plus kg. 0 = bodyweight.',
    formCue:
      'On the hyperextension bench, pad just below the hips. Lower the torso with a flat back, then rise until your body is a straight line — squeeze the glutes, don’t over-arch. Hold a plate at your chest to make it harder.',
  },

  // ----- Kettlebell core circuit (30 s each) -----
  kb(
    'kb-plank-pull-through',
    'Plank Pull-Through',
    12,
    'High plank, kettlebell just behind one hand. Reach under with the other hand and drag the bell across; alternate for the whole interval. Hips stay square and still — resisting the twist is the work.',
  ),
  kb(
    'kb-halo',
    'Kettlebell Halo',
    8,
    'Hold the bell upside down by the horns at chest height. Circle it slowly around your head, close to the skull, ribs down and glutes tight. Switch direction halfway.',
  ),
  kb(
    'kb-around-the-world',
    'Around the World',
    12,
    'Stand tall and pass the bell around your waist from hand to hand, hips and shoulders square — don’t let it pull you around. Switch direction halfway.',
  ),
  kb(
    'kb-shoveling',
    'Kettlebell Shoveling',
    12,
    'Staggered stance, bell held by the horns. Dig it low by your back hip and drive it up and across the body like shovelling, rotating through the trunk and pivoting the back foot. Switch sides halfway.',
  ),
  kb(
    'kb-swing',
    'Kettlebell Swing',
    16,
    'Hike the bell back between your legs, then snap the hips forward to float it to chest height — the arms are just ropes, the hips do the work. Flat back, brace hard at the top.',
  ),
  kb(
    'kb-iron-trident',
    'Iron Trident',
    12,
    'Do it the way you were coached: 30 s of steady, controlled work with the core braced and the bell kept close. End the interval early if your form breaks.',
  ),
  {
    id: 'plank',
    name: 'Plank',
    muscle: 'Core',
    slot: 'kb-plank',
    sets: 3,
    kind: 'time',
    repMin: 0,
    repMax: 0,
    equipment: 'none',
    startWeightKg: 0,
    perArm: false,
    startSeconds: 30,
    timeIncrementSeconds: 10,
    formCue:
      'No kettlebell for this one. Forearms down, body in one straight line from head to heels. Brace the abs, squeeze the glutes and keep breathing. Hold all three rounds for the full target and the target goes up.',
  },
  kb(
    'kb-situp-to-stand',
    'Sit-up to Stand',
    8,
    'Lie on your back holding the bell at your chest. Sit up, plant your feet and stand up in one flow (a hand on the floor is fine), then reverse back down with control. Works the legs as well as the core.',
  ),
]

// ---------- registry + lookups ----------

export const ALL_EXERCISES: readonly ExerciseDef[] = [
  ...GYM_EXERCISES,
  ...HOME_EXERCISES,
]

export const EXERCISES_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  ALL_EXERCISES.map((e) => [e.id, e]),
)

export function getExercise(id: string): ExerciseDef {
  const def = EXERCISES_BY_ID[id]
  if (!def) throw new Error(`Unknown exercise: ${id}`)
  return def
}

/** Display order of muscle groups (Forearms only appears in home-era history). */
export const MUSCLE_ORDER: Muscle[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Forearms',
]

// ---------- slots (swap groups), in routine order ----------

export interface Slot {
  id: string
  block: BlockId
  /** Human label for the slot, e.g. "Squat". */
  label: string
  /** Which pair (1–3) of a workout the slot sits in; its partner alternates with it. */
  pair?: number
  /** The default exercise id (first option). */
  baseId: string
  /** All exercise ids that can fill this slot, base first. */
  optionIds: string[]
}

function slot(
  id: string,
  block: BlockId,
  label: string,
  optionIds: string[],
  pair?: number,
): Slot {
  return { id, block, label, pair, baseId: optionIds[0], optionIds }
}

export const SLOTS: readonly Slot[] = [
  // Workout A — squat & bench
  slot('squat', 'day-a', 'Squat', ['back-squat', 'goblet-squat'], 1),
  slot('pull', 'day-a', 'Vertical pull', ['pull-up'], 1),
  slot(
    'bench',
    'day-a',
    'Bench press',
    ['bench-press', 'db-bench-press', 'incline-db-press', 'decline-db-press', 'machine-chest-press'],
    2,
  ),
  slot('row', 'day-a', 'Row', ['cable-row', 't-bar-row'], 2),
  slot('hamstring-curl', 'day-a', 'Hamstrings', ['hamstring-curl'], 3),
  slot('abs', 'day-a', 'Abs', ['ab-machine', 'ab-wheel-rollout'], 3),
  // Workout B — hinge & press
  slot('hinge', 'day-b', 'Hinge', ['barbell-rdl', 'deadlift', 'hip-thrust'], 1),
  slot(
    'lats',
    'day-b',
    'Lat pulldown',
    ['lat-pulldown', 'close-grip-lat-pulldown', 'wide-grip-lat-pulldown'],
    1,
  ),
  slot('overhead', 'day-b', 'Overhead press', ['shoulder-press'], 2),
  slot('dips', 'day-b', 'Dip', ['dip', 'machine-dip', 'bench-dip'], 2),
  slot('biceps', 'day-b', 'Biceps', ['zottman-curl', 'biceps-curl'], 3),
  slot('anti-rotation', 'day-b', 'Anti-rotation', ['pallof-press'], 3),
  // Workout C — leg press & chest
  slot('leg-press', 'day-c', 'Leg press', ['leg-press', 'bulgarian-split-squat'], 1),
  slot('chest-row', 'day-c', 'Chest-supported row', ['machine-row'], 1),
  slot(
    'fly',
    'day-c',
    'Chest fly',
    ['pec-deck', 'low-to-high-cable-fly', 'high-to-low-cable-fly'],
    2,
  ),
  slot(
    'triceps',
    'day-c',
    'Triceps',
    ['cable-pushdown', 'bar-pushdown', 'overhead-cable-extension'],
    2,
  ),
  slot('extension', 'day-c', 'Lower back', ['back-extension'], 3),
  slot('leg-raise', 'day-c', 'Abs', ['hanging-leg-raise'], 3),
  // Extras — straight sets, not scheduled by default
  slot('calves', 'extras', 'Calves', ['machine-calf-raise']),
  slot('quads', 'extras', 'Quads', ['leg-extension']),
  slot('push-up', 'extras', 'Push-up', ['push-up', 'diamond-push-up']),
  // Kettlebell core circuit
  slot('kb-plank-pull-through', 'kb-core', 'Kettlebell core', ['kb-plank-pull-through']),
  slot('kb-halo', 'kb-core', 'Kettlebell core', ['kb-halo']),
  slot('kb-around-the-world', 'kb-core', 'Kettlebell core', ['kb-around-the-world']),
  slot('kb-shoveling', 'kb-core', 'Kettlebell core', ['kb-shoveling']),
  slot('kb-swing', 'kb-core', 'Kettlebell core', ['kb-swing']),
  slot('kb-iron-trident', 'kb-core', 'Kettlebell core', ['kb-iron-trident']),
  slot('kb-plank', 'kb-core', 'Kettlebell core', ['plank']),
  slot('kb-situp-to-stand', 'kb-core', 'Kettlebell core', ['kb-situp-to-stand']),
]

export const SLOTS_BY_ID: Record<string, Slot> = Object.fromEntries(
  SLOTS.map((s) => [s.id, s]),
)

/** Which slot an exercise belongs to (undefined for retired exercises). */
export function getSlot(exerciseId: string): Slot | undefined {
  const def = EXERCISES_BY_ID[exerciseId]
  return def && !def.retired ? SLOTS_BY_ID[def.slot] : undefined
}

/** Which routine block an exercise belongs to (undefined for retired ones). */
export function getBlock(exerciseId: string): Block | undefined {
  const s = getSlot(exerciseId)
  return s ? BLOCKS_BY_ID[s.block] : undefined
}

/**
 * The alternating group an exercise runs in — its pair within a workout, or
 * the whole block for an unpaired alternating block (the kettlebell circuit).
 * Undefined for straight sets.
 */
export function alternateGroupKey(exerciseId: string): string | undefined {
  const s = getSlot(exerciseId)
  if (!s || !BLOCKS_BY_ID[s.block].alternate) return undefined
  return s.pair ? `${s.block}:${s.pair}` : s.block
}

/** All exercises that can fill a slot (base first). */
export function slotOptions(slotId: string): ExerciseDef[] {
  const s = SLOTS_BY_ID[slotId]
  return s ? s.optionIds.map((id) => EXERCISES_BY_ID[id]) : []
}

/** Compact set-scheme label, e.g. "3 × 5–8", "3 × 8–12 · ea" or "3 × 30s". */
export function setScheme(def: ExerciseDef): string {
  if (def.kind === 'time') {
    return def.equipment === 'none'
      ? `${def.sets} × hold`
      : `${def.sets} × ${def.startSeconds ?? 30}s`
  }
  return `${def.sets} × ${def.repMin}–${def.repMax}${def.perArm ? ' · ea' : ''}`
}
