// The session: eleven movements in a fixed order (Training Spec §3).
// Order is deliberate — largest muscles first, smallest / most fatigue-
// sensitive last: chest -> shoulders -> arms -> forearms -> abs.

export type Muscle = 'Chest' | 'Shoulders' | 'Arms' | 'Forearms' | 'Abs'

export type ExerciseKind = 'reps' | 'time'

export interface ExerciseDef {
  id: string
  name: string
  muscle: Muscle
  /** Display order within the session (1-based in the spec). */
  order: number
  /** Working sets — always 3 in this program. */
  sets: number
  kind: ExerciseKind
  /** Bottom of the rep range (reps exercises only). */
  repMin: number
  /** Top of the rep range — the per-set "level-up" target (reps exercises only). */
  repMax: number
  /** Starting dumbbell weight in kg. 0 for bodyweight movements. */
  startWeightKg: number
  /** True when the rep target is per side (do the full count with each arm). */
  perArm: boolean
  /** Bodyweight movement with no weight progression (the plank). */
  bodyweight: boolean
  /** Starting hold target in seconds (time exercises only). */
  startSeconds?: number
  /** Seconds added to the target each time all sets hit it (time exercises). */
  timeIncrementSeconds?: number
  /** A short cue on how to hold / weight is not the point. */
  holdNote?: string
  formCue: string
}

export const EXERCISES: readonly ExerciseDef[] = [
  {
    id: 'floor-press',
    name: 'Floor Press',
    muscle: 'Chest',
    order: 1,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 8,
    perArm: true,
    bodyweight: false,
    formCue:
      'On your back, dumbbell at chest level, press straight up. Lower until your upper arm taps the floor, then drive up. The floor caps the range and protects the shoulder.',
  },
  {
    id: 'chest-flye',
    name: 'Chest Flye',
    muscle: 'Chest',
    order: 2,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 5.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'On your back, arm slightly bent and fixed at that angle. Open out wide toward the floor, feel the stretch across the chest, then squeeze back up over your chest. Light weight — this is a stretch movement, not a press.',
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    muscle: 'Shoulders',
    order: 3,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 6.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'From shoulder height, press to locked out overhead. Keep your ribs down and don’t lean back — the work should be in the shoulder, not the lower back.',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    muscle: 'Shoulders',
    order: 4,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 3.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Raise the dumbbell out to the side up to shoulder height, leading with the elbow. No swinging or heaving — if you need momentum, the weight is too heavy. The side delt is small; keep it strict and light.',
  },
  {
    id: 'biceps-curl',
    name: 'Biceps Curl',
    muscle: 'Arms',
    order: 5,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 8,
    perArm: true,
    bodyweight: false,
    formCue:
      'Curl up without swinging the torso. Lower slowly and under control — the lowering half builds as much as the lifting half.',
  },
  {
    id: 'triceps-extension',
    name: 'Triceps Extension',
    muscle: 'Arms',
    order: 6,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 9,
    perArm: false,
    bodyweight: false,
    holdNote: 'Both hands cupping one end of the dumbbell, behind your head.',
    formCue:
      'Both hands cupping one end of the dumbbell, held behind your head. Extend straight up, keeping the elbows pointing forward and still. Only the forearms move.',
  },
  {
    id: 'wrist-curl',
    name: 'Wrist Curl',
    muscle: 'Forearms',
    order: 7,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 4.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Forearm resting on your thigh, palm up, hand off the edge of the knee. Curl the weight up using only the wrist. Full range, controlled.',
  },
  {
    id: 'reverse-wrist-curl',
    name: 'Reverse Wrist Curl',
    muscle: 'Forearms',
    order: 8,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 2.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Same position as the wrist curl, palm down. Lift the back of the hand toward you. This is a weak movement — expect to use very little weight, and that’s correct.',
  },
  {
    id: 'weighted-crunch',
    name: 'Weighted Crunch',
    muscle: 'Abs',
    order: 9,
    sets: 3,
    kind: 'reps',
    repMin: 12,
    repMax: 15,
    startWeightKg: 5.5,
    perArm: false,
    bodyweight: false,
    holdNote: 'Hold the dumbbell on your chest.',
    formCue:
      'Hold the dumbbell on your chest. Crunch up, squeeze the abs hard at the top, lower with control. Don’t yank with the neck.',
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    muscle: 'Abs',
    order: 10,
    sets: 3,
    kind: 'reps',
    repMin: 14,
    repMax: 20,
    startWeightKg: 4.5,
    perArm: false,
    bodyweight: false,
    holdNote: 'Held at the chest. Count every touch as one rep (left + right = two).',
    formCue:
      'Lean back with feet off the floor, holding the dumbbell. Rotate from hip to hip, touching near the floor each side. Count every touch as one rep (so a left + right is two).',
  },
  {
    id: 'plank',
    name: 'Plank',
    muscle: 'Abs',
    order: 11,
    sets: 3,
    kind: 'time',
    repMin: 0,
    repMax: 0,
    startWeightKg: 0,
    perArm: false,
    bodyweight: true,
    startSeconds: 30,
    timeIncrementSeconds: 10,
    formCue:
      'Forearms down, body in one straight line from head to heels. Hold steady, brace the abs, and keep breathing. When you can hold all three sets for the full target, the target goes up.',
  },
] as const

export const EXERCISES_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)

export function getExercise(id: string): ExerciseDef {
  const def = EXERCISES_BY_ID[id]
  if (!def) throw new Error(`Unknown exercise: ${id}`)
  return def
}

export const MUSCLE_ORDER: Muscle[] = [
  'Chest',
  'Shoulders',
  'Arms',
  'Forearms',
  'Abs',
]
