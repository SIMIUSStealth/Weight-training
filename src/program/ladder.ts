// Load ladders. Every loaded exercise climbs a fixed ladder of available
// settings — its "rungs". Progression only ever moves to the ADJACENT rung and
// never skips one (Training Spec §4). Each kind of gym equipment has its own
// ladder; the step sizes that differ from gym to gym (the dumbbell rack, the
// smallest barbell jump, machine/cable stacks) come from Settings.

export type Equipment =
  /** Olympic bar + plates; load = everything on the bar (20 kg bar included). */
  | 'barbell'
  /** Gym dumbbell rack; load = one dumbbell. */
  | 'dumbbell'
  /** Selectorised or plate-loaded machine; load = the stack / plates. */
  | 'machine'
  /** Cable stack; load = one stack. */
  | 'cable'
  /** Fixed kettlebell sizes. */
  | 'kettlebell'
  /** Bodyweight reps; load = weight ADDED (0 = just bodyweight). */
  | 'bodyweight'
  /** Bodyweight reps; minus = assisted-machine help, plus = added weight. */
  | 'assisted'
  /** The old adjustable home dumbbell (retired home program). */
  | 'home-dumbbell'
  /** No load at all — timed holds, bodyweight-only progressions. */
  | 'none'

/** Step sizes that vary between gyms (kg). */
export interface Increments {
  dumbbell: number
  barbell: number
  /** Machines and cables. */
  machine: number
}

export const DEFAULT_INCREMENTS: Increments = { dumbbell: 2, barbell: 2.5, machine: 5 }

/** The choices offered in Settings. */
export const INCREMENT_OPTIONS: Record<keyof Increments, number[]> = {
  dumbbell: [1, 2, 2.5],
  barbell: [2.5, 5],
  machine: [2.5, 5],
}

/** Stored (possibly partial / stale) increments → a complete, valid set. */
export function resolveIncrements(stored?: Partial<Increments>): Increments {
  const pick = (k: keyof Increments) => {
    const v = stored?.[k]
    return typeof v === 'number' && INCREMENT_OPTIONS[k].includes(v) ? v : DEFAULT_INCREMENTS[k]
  }
  return { dumbbell: pick('dumbbell'), barbell: pick('barbell'), machine: pick('machine') }
}

// The adjustable home dumbbell's settings (the retired home program).
export const DUMBBELL_LADDER_KG: readonly number[] = [
  2.5, 3.5, 4.5, 5.5, 6.5, 8, 9, 10, 11.5, 13.5, 16, 18, 20.5, 22.5, 24,
] as const

export const KETTLEBELL_LADDER_KG: readonly number[] = [
  4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48,
] as const

/** Plates added to a bodyweight lift (belt, plate on the back / lap). */
const ADDED_STEP_KG = 2.5
const ADDED_MAX_KG = 60
const ASSIST_MAX_KG = 60

/** from, from+step, … up to and including `to` (rounded to avoid float drift). */
function steps(from: number, to: number, step: number): number[] {
  const out: number[] = []
  for (let i = 0; ; i++) {
    const w = Math.round((from + i * step) * 100) / 100
    if (w > to + 1e-9) break
    out.push(w)
  }
  return out
}

/** Every rung available for a piece of equipment, lightest first. */
export function ladderFor(
  equipment: Equipment,
  increments: Increments = DEFAULT_INCREMENTS,
): readonly number[] {
  switch (equipment) {
    case 'barbell':
      return steps(20, 300, increments.barbell)
    case 'dumbbell':
      return steps(increments.dumbbell, 60, increments.dumbbell)
    case 'machine':
    case 'cable':
      return steps(increments.machine, 200, increments.machine)
    case 'kettlebell':
      return KETTLEBELL_LADDER_KG
    case 'bodyweight':
      return steps(0, ADDED_MAX_KG, ADDED_STEP_KG)
    case 'assisted':
      return [
        ...steps(increments.machine, ASSIST_MAX_KG, increments.machine)
          .map((w) => -w)
          .reverse(),
        ...steps(0, ADDED_MAX_KG, ADDED_STEP_KG),
      ]
    case 'home-dumbbell':
      return DUMBBELL_LADDER_KG
    case 'none':
      return [0]
  }
}

/** Index of a weight on the ladder, or -1 if it is not an exact rung. */
export function rungIndex(weightKg: number, ladder: readonly number[]): number {
  return ladder.findIndex((w) => Math.abs(w - weightKg) < 1e-9)
}

/** The next rung up, or the same weight if already at the top. */
export function nextRung(weightKg: number, ladder: readonly number[]): number {
  const i = rungIndex(weightKg, ladder)
  if (i === -1) {
    // Not an exact rung — snap up to the first rung strictly greater.
    const up = ladder.find((w) => w > weightKg)
    return up ?? ladder[ladder.length - 1]
  }
  return ladder[Math.min(i + 1, ladder.length - 1)]
}

/** The next rung down, or the same weight if already at the bottom. */
export function prevRung(weightKg: number, ladder: readonly number[]): number {
  const i = rungIndex(weightKg, ladder)
  if (i === -1) {
    const downs = ladder.filter((w) => w < weightKg)
    return downs.length ? downs[downs.length - 1] : ladder[0]
  }
  return ladder[Math.max(i - 1, 0)]
}

export function isTopRung(weightKg: number, ladder: readonly number[]): boolean {
  return rungIndex(weightKg, ladder) === ladder.length - 1
}

/**
 * Format a weight the way the spec writes it (comma decimals, e.g. "5,5 kg").
 * Up to two decimals, so a typed 1,25 kg micro-plate load reads true.
 */
export function formatKg(weightKg: number): string {
  return `${String(Math.round(weightKg * 100) / 100).replace('.', ',')} kg`
}

/** True when the load is relative to bodyweight (added / assisted). */
export function isRelativeLoad(equipment: Equipment): boolean {
  return equipment === 'bodyweight' || equipment === 'assisted'
}

/**
 * A load as the lifter thinks of it: "60 kg" on a bar, "Bodyweight",
 * "10 kg assist" on the assisted machine, "+5 kg" on a dip belt.
 */
export function formatLoad(equipment: Equipment, weightKg: number): string {
  if (equipment === 'none') return 'Bodyweight'
  if (!isRelativeLoad(equipment)) return formatKg(weightKg)
  if (Math.abs(weightKg) < 1e-9) return 'Bodyweight'
  if (weightKg < 0) return `${formatKg(-weightKg)} assist`
  return `+${formatKg(weightKg)}`
}

/** Compact load for tight spots ("60kg", "BW", "−10kg", "+5kg"). */
export function formatLoadShort(equipment: Equipment, weightKg: number): string {
  if (equipment === 'none') return 'BW'
  if (!isRelativeLoad(equipment)) return formatKg(weightKg).replace(' ', '')
  if (Math.abs(weightKg) < 1e-9) return 'BW'
  const kg = formatKg(Math.abs(weightKg)).replace(' ', '')
  return weightKg < 0 ? `−${kg}` : `+${kg}`
}
