// The weekly plan: 7 days (Mon..Sun), each training a set of muscle groups.
// A day's exercises are derived from those groups' slots (using the global
// per-slot choice), minus omitted slots, plus any added extras. Pure logic.

import {
  ALL_EXERCISES,
  EXERCISES_BY_ID,
  MUSCLE_ORDER,
  SLOTS,
  SLOTS_BY_ID,
  type ExerciseDef,
  type Muscle,
} from './exercises'
import type { DayPlan } from '../storage/types'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const WEEKDAYS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/** Index of today, Monday = 0 … Sunday = 6. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

/** Default plan: full body on Mon / Wed / Fri, rest otherwise. */
export function defaultWeeklyPlan(): DayPlan[] {
  const full = (): DayPlan => ({ muscles: [...MUSCLE_ORDER] })
  const rest = (): DayPlan => ({ muscles: [] })
  return [full(), rest(), full(), rest(), full(), rest(), rest()]
}

/** Normalise stored plan (or fall back to the default). Always length 7. */
export function getWeeklyPlan(plan?: DayPlan[]): DayPlan[] {
  if (!plan || plan.length !== 7) return defaultWeeklyPlan()
  return plan
}

/** The exercise id currently chosen for a slot (honours a valid global swap). */
export function selectedForSlot(
  slotId: string,
  program?: Record<string, string>,
): string {
  const slot = SLOTS_BY_ID[slotId]
  if (!slot) return ''
  const chosen = program?.[slotId]
  const def = chosen ? EXERCISES_BY_ID[chosen] : undefined
  return def && def.slot === slotId ? def.id : slot.baseId
}

/** Ordered exercises for one day (slot defaults − omits + extras). */
export function dayExercises(
  day: DayPlan,
  program?: Record<string, string>,
): ExerciseDef[] {
  const out: ExerciseDef[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    const def = EXERCISES_BY_ID[id]
    if (def && !seen.has(id)) {
      seen.add(id)
      out.push(def)
    }
  }
  for (const muscle of MUSCLE_ORDER) {
    if (!day.muscles.includes(muscle)) continue
    for (const slot of SLOTS) {
      if (slot.muscle !== muscle || day.omit?.includes(slot.id)) continue
      push(selectedForSlot(slot.id, program))
    }
    for (const id of day.add ?? []) {
      const def = EXERCISES_BY_ID[id]
      if (def && def.muscle === muscle) push(id)
    }
  }
  return out
}

/** Exercises of a muscle not already in the day — candidates to add. */
export function addableForMuscle(
  muscle: Muscle,
  day: DayPlan,
  program?: Record<string, string>,
): ExerciseDef[] {
  const present = new Set(dayExercises(day, program).map((e) => e.id))
  return ALL_EXERCISES.filter((e) => e.muscle === muscle && !present.has(e.id))
}

/** Number of training (non-rest) days in the plan. */
export function trainingDayCount(plan: DayPlan[]): number {
  return plan.filter((d) => d.muscles.length > 0).length
}

/** How many days per week each muscle is trained. */
export function muscleFrequency(plan: DayPlan[]): Record<Muscle, number> {
  const freq = {} as Record<Muscle, number>
  for (const m of MUSCLE_ORDER) freq[m] = 0
  for (const day of plan) for (const m of day.muscles) freq[m] += 1
  return freq
}

/** Short label for a day's muscle groups, e.g. "Chest · Arms" or "Rest". */
export function dayLabel(day: DayPlan): string {
  if (!day.muscles.length) return 'Rest'
  return MUSCLE_ORDER.filter((m) => day.muscles.includes(m)).join(' · ')
}
