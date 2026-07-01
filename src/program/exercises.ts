// The session: eleven slots in a fixed order (Training Spec §3), each filled by
// a base exercise or a single-dumbbell alternative that hits the same muscle in
// the same rep/time model. Order is deliberate — largest muscles first, smallest
// and most fatigue-sensitive last: chest -> shoulders -> arms -> forearms -> abs.

export type Muscle = 'Chest' | 'Shoulders' | 'Arms' | 'Forearms' | 'Abs'

export type ExerciseKind = 'reps' | 'time'

export interface ExerciseDef {
  id: string
  name: string
  muscle: Muscle
  /** The session slot this exercise can fill (swaps stay within a slot). */
  slot: string
  /** Display order within the session (1-based, follows the slot). */
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
  /** Bodyweight movement with no weight progression (planks/holds). */
  bodyweight: boolean
  /** Starting hold target in seconds (time exercises only). */
  startSeconds?: number
  /** Seconds added to the target each time all sets hit it (time exercises). */
  timeIncrementSeconds?: number
  /** A short cue on how to hold / weight is not the point. */
  holdNote?: string
  formCue: string
}

// ---------- the 11 base exercises (the default program) ----------

export const EXERCISES: readonly ExerciseDef[] = [
  {
    id: 'floor-press',
    name: 'Floor Press',
    muscle: 'Chest',
    slot: 'chest-press',
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
    slot: 'chest-stretch',
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
    slot: 'shoulder-press',
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
    slot: 'shoulder-raise',
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
    slot: 'arm-biceps',
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
    slot: 'arm-triceps',
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
    slot: 'forearm-flexor',
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
    slot: 'forearm-extensor',
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
    slot: 'ab-crunch',
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
    slot: 'ab-rotation',
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
    slot: 'ab-core',
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

// ---------- single-dumbbell alternatives (swap targets) ----------

export const ALTERNATIVE_EXERCISES: readonly ExerciseDef[] = [
  // Chest press
  {
    id: 'squeeze-press',
    name: 'Squeeze Press',
    muscle: 'Chest',
    slot: 'chest-press',
    order: 1,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 8,
    perArm: false,
    bodyweight: false,
    holdNote: 'One dumbbell held vertically, squeezed between both palms.',
    formCue:
      'On your back, hold one dumbbell vertically, sandwiched between your palms at chest level. Press straight up while squeezing your palms together hard — the squeeze is what drives the chest. Lower under control.',
  },
  // Chest stretch
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell Pullover',
    muscle: 'Chest',
    slot: 'chest-stretch',
    order: 2,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 6.5,
    perArm: false,
    bodyweight: false,
    holdNote: 'Both hands cupping one end of the dumbbell.',
    formCue:
      'On your back, both hands cupping one end of the dumbbell over your chest, slight bend in the elbows. Lower it back over and behind your head until you feel the stretch, then pull it back over your chest. Light and controlled.',
  },
  // Shoulder press
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    muscle: 'Shoulders',
    slot: 'shoulder-press',
    order: 3,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 6.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Start at shoulder height with your palm facing you. Press up while rotating the palm to face forward at the top; reverse on the way down. Ribs down, no leaning back.',
  },
  // Shoulder raise
  {
    id: 'front-raise',
    name: 'Front Raise',
    muscle: 'Shoulders',
    slot: 'shoulder-raise',
    order: 4,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 3.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Raise the dumbbell straight out in front to shoulder height, arm almost straight. No swinging — control it up and down. Hits the front of the shoulder.',
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear-Delt Fly',
    muscle: 'Shoulders',
    slot: 'shoulder-raise',
    order: 4,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 3.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Hinge forward at the hips, back flat. With a slight, fixed elbow bend, raise the dumbbell out to the side until level with your back, squeezing the rear shoulder. Strict and light — great for shoulder balance.',
  },
  // Biceps
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    muscle: 'Arms',
    slot: 'arm-biceps',
    order: 5,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 8,
    perArm: true,
    bodyweight: false,
    formCue:
      'Curl with a neutral grip — palm facing in, thumb up, like holding a hammer. No torso swing; lower under control. Builds the biceps and the brachialis underneath.',
  },
  {
    id: 'concentration-curl',
    name: 'Concentration Curl',
    muscle: 'Arms',
    slot: 'arm-biceps',
    order: 5,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 6.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Seated, elbow braced against the inside of your thigh. Curl the dumbbell up with a hard squeeze at the top, lower slowly. Strict isolation — no momentum at all.',
  },
  // Triceps
  {
    id: 'triceps-kickback',
    name: 'Triceps Kickback',
    muscle: 'Arms',
    slot: 'arm-triceps',
    order: 6,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 5.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Hinge forward, upper arm pinned parallel to your torso and still. Extend the forearm straight back until the arm locks out, squeeze the triceps, return under control. Only the forearm moves.',
  },
  {
    id: 'single-arm-oh-ext',
    name: 'Single-Arm Overhead Extension',
    muscle: 'Arms',
    slot: 'arm-triceps',
    order: 6,
    sets: 3,
    kind: 'reps',
    repMin: 8,
    repMax: 12,
    startWeightKg: 5.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'One dumbbell in one hand overhead, upper arm vertical and still. Lower it behind your head, then extend straight up. Keep the elbow pointing forward, not flaring out.',
  },
  // Forearm flexors
  {
    id: 'behind-back-wrist-curl',
    name: 'Behind-the-Back Wrist Curl',
    muscle: 'Forearms',
    slot: 'forearm-flexor',
    order: 7,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 5.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Stand holding the dumbbell behind your back, palm facing back, arm straight. Curl it up using only the wrist, then lower for a full stretch. Small range, strict.',
  },
  // Forearm extensors
  {
    id: 'reverse-curl',
    name: 'Reverse Curl',
    muscle: 'Forearms',
    slot: 'forearm-extensor',
    order: 8,
    sets: 3,
    kind: 'reps',
    repMin: 10,
    repMax: 15,
    startWeightKg: 4.5,
    perArm: true,
    bodyweight: false,
    formCue:
      'Curl with a palm-down (overhand) grip, elbow tucked at your side. Lift to about chest height and lower slowly. Targets the top of the forearm and the brachioradialis — expect to use less than a normal curl.',
  },
  // Abs crunch
  {
    id: 'weighted-situp',
    name: 'Weighted Sit-up',
    muscle: 'Abs',
    slot: 'ab-crunch',
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
      'Full sit-up holding the dumbbell on your chest. Curl all the way up, then lower with control to the floor. Don’t yank with the neck or throw with the hips.',
  },
  // Abs rotation
  {
    id: 'weighted-side-bend',
    name: 'Weighted Side Bend',
    muscle: 'Abs',
    slot: 'ab-rotation',
    order: 10,
    sets: 3,
    kind: 'reps',
    repMin: 12,
    repMax: 15,
    startWeightKg: 8,
    perArm: true,
    bodyweight: false,
    formCue:
      'Stand tall, dumbbell in one hand at your side. Bend sideways toward that hand, then pull straight back up using the opposite obliques. Full count one side, then switch. No leaning forward or back.',
  },
  {
    id: 'wood-chop',
    name: 'Wood Chop',
    muscle: 'Abs',
    slot: 'ab-rotation',
    order: 10,
    sets: 3,
    kind: 'reps',
    repMin: 12,
    repMax: 15,
    startWeightKg: 5.5,
    perArm: false,
    bodyweight: false,
    holdNote: 'Both hands; do the full count on one side, then the other.',
    formCue:
      'Both hands on the dumbbell. From low by one hip, sweep it diagonally up and across to above the opposite shoulder, rotating through the trunk, then back down. Full count one side, then switch.',
  },
  // Abs core hold
  {
    id: 'side-plank',
    name: 'Side Plank',
    muscle: 'Abs',
    slot: 'ab-core',
    order: 11,
    sets: 3,
    kind: 'time',
    repMin: 0,
    repMax: 0,
    startWeightKg: 0,
    perArm: false,
    bodyweight: true,
    startSeconds: 20,
    timeIncrementSeconds: 10,
    holdNote: 'Hold each side for the target.',
    formCue:
      'On one forearm, body in a straight line, hips stacked and lifted. Brace the side abs and hold the target, then switch sides. Bodyweight only — the duration climbs.',
  },
  {
    id: 'hollow-hold',
    name: 'Hollow Hold',
    muscle: 'Abs',
    slot: 'ab-core',
    order: 11,
    sets: 3,
    kind: 'time',
    repMin: 0,
    repMax: 0,
    startWeightKg: 0,
    perArm: false,
    bodyweight: true,
    startSeconds: 20,
    timeIncrementSeconds: 10,
    formCue:
      'On your back, lower back pressed flat into the floor, arms and legs extended and lifted into a shallow “banana”. Hold and keep breathing. Higher arms/legs = easier, lower = harder.',
  },
] as const

// ---------- registry + lookups ----------

export const ALL_EXERCISES: readonly ExerciseDef[] = [
  ...EXERCISES,
  ...ALTERNATIVE_EXERCISES,
]

export const EXERCISES_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  ALL_EXERCISES.map((e) => [e.id, e]),
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

// ---------- slots (swap groups) ----------

export interface Slot {
  id: string
  order: number
  muscle: Muscle
  /** Short human label for the slot, e.g. "Chest · press". */
  label: string
  /** The default exercise id (first option). */
  baseId: string
  /** All exercise ids that can fill this slot, base first. */
  optionIds: string[]
}

export const SLOTS: readonly Slot[] = [
  { id: 'chest-press', order: 1, muscle: 'Chest', label: 'Chest · press', baseId: 'floor-press', optionIds: ['floor-press', 'squeeze-press'] },
  { id: 'chest-stretch', order: 2, muscle: 'Chest', label: 'Chest · stretch', baseId: 'chest-flye', optionIds: ['chest-flye', 'dumbbell-pullover'] },
  { id: 'shoulder-press', order: 3, muscle: 'Shoulders', label: 'Shoulders · press', baseId: 'overhead-press', optionIds: ['overhead-press', 'arnold-press'] },
  { id: 'shoulder-raise', order: 4, muscle: 'Shoulders', label: 'Shoulders · raise', baseId: 'lateral-raise', optionIds: ['lateral-raise', 'front-raise', 'rear-delt-fly'] },
  { id: 'arm-biceps', order: 5, muscle: 'Arms', label: 'Arms · biceps', baseId: 'biceps-curl', optionIds: ['biceps-curl', 'hammer-curl', 'concentration-curl'] },
  { id: 'arm-triceps', order: 6, muscle: 'Arms', label: 'Arms · triceps', baseId: 'triceps-extension', optionIds: ['triceps-extension', 'triceps-kickback', 'single-arm-oh-ext'] },
  { id: 'forearm-flexor', order: 7, muscle: 'Forearms', label: 'Forearms · flexors', baseId: 'wrist-curl', optionIds: ['wrist-curl', 'behind-back-wrist-curl'] },
  { id: 'forearm-extensor', order: 8, muscle: 'Forearms', label: 'Forearms · extensors', baseId: 'reverse-wrist-curl', optionIds: ['reverse-wrist-curl', 'reverse-curl'] },
  { id: 'ab-crunch', order: 9, muscle: 'Abs', label: 'Abs · flexion', baseId: 'weighted-crunch', optionIds: ['weighted-crunch', 'weighted-situp'] },
  { id: 'ab-rotation', order: 10, muscle: 'Abs', label: 'Abs · rotation', baseId: 'russian-twist', optionIds: ['russian-twist', 'weighted-side-bend', 'wood-chop'] },
  { id: 'ab-core', order: 11, muscle: 'Abs', label: 'Abs · core hold', baseId: 'plank', optionIds: ['plank', 'side-plank', 'hollow-hold'] },
] as const

export const SLOTS_BY_ID: Record<string, Slot> = Object.fromEntries(
  SLOTS.map((s) => [s.id, s]),
)

/** Which slot an exercise belongs to. */
export function getSlot(exerciseId: string): Slot | undefined {
  const def = EXERCISES_BY_ID[exerciseId]
  return def ? SLOTS_BY_ID[def.slot] : undefined
}

/** All exercises that can fill a slot (base first). */
export function slotOptions(slotId: string): ExerciseDef[] {
  const slot = SLOTS_BY_ID[slotId]
  return slot ? slot.optionIds.map((id) => EXERCISES_BY_ID[id]) : []
}

/** Compact set-scheme label, e.g. "3 × 8–12 · ea" or "3 × hold". */
export function setScheme(def: ExerciseDef): string {
  if (def.kind === 'time') return `${def.sets} × hold`
  return `${def.sets} × ${def.repMin}–${def.repMax}${def.perArm ? ' · ea' : ''}`
}
