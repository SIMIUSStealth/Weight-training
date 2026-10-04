// The weekly plan: 7 days (Mon..Sun), each running a set of routine blocks.
// A day's exercises are derived from those blocks' slots (using the global
// per-slot choice), minus omitted slots, plus any added extras — always in
// routine order. Pure logic.

import {
  BLOCKS,
  EXERCISES_BY_ID,
  GYM_EXERCISES,
  MUSCLE_ORDER,
  SLOTS,
  SLOTS_BY_ID,
  isBlockId,
  type BlockId,
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

/** Monday-first weekday index of a date (Mon = 0 … Sun = 6). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Index of today, Monday = 0 … Sunday = 6. */
export function todayIndex(): number {
  return mondayIndex(new Date())
}

/** The full routine: the three pairs + the core triplet. */
export const ROUTINE: BlockId[] = ['pair-1', 'pair-2', 'pair-3', 'core']

/**
 * Default plan: the full routine on Mon / Wed / Fri — Wednesday doubles as the
 * leg day, Friday adds the isolations — rest otherwise.
 */
export function defaultWeeklyPlan(): DayPlan[] {
  const day = (...extra: BlockId[]): DayPlan => ({ blocks: [...ROUTINE, ...extra] })
  const rest = (): DayPlan => ({ blocks: [] })
  return [day(), rest(), day('leg-day'), rest(), day('isolation'), rest(), rest()]
}

/** True for a 7-day, block-based plan (the current schema). */
export function isCurrentPlan(plan?: DayPlan[]): plan is DayPlan[] {
  return (
    Array.isArray(plan) &&
    plan.length === 7 &&
    plan.every((d) => !!d && Array.isArray((d as Partial<DayPlan>).blocks))
  )
}

/**
 * Normalise a stored plan, or fall back to the default. Always length 7. A
 * pre-gym plan (muscle-group days) or anything malformed yields the default;
 * unknown block ids are dropped.
 */
export function getWeeklyPlan(plan?: DayPlan[]): DayPlan[] {
  if (!isCurrentPlan(plan)) return defaultWeeklyPlan()
  return plan.map((d) => {
    const blocks = d.blocks.filter(isBlockId)
    return blocks.length === d.blocks.length ? d : { ...d, blocks }
  })
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
  return def && !def.retired && def.slot === slotId ? def.id : slot.baseId
}

/** Ordered exercises for one day (block slots − omits + extras, routine order). */
export function dayExercises(
  day: DayPlan,
  program?: Record<string, string>,
): ExerciseDef[] {
  const out: ExerciseDef[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    const def = EXERCISES_BY_ID[id]
    if (def && !def.retired && !seen.has(id)) {
      seen.add(id)
      out.push(def)
    }
  }
  for (const slot of SLOTS) {
    if (day.blocks.includes(slot.block) && !day.omit?.includes(slot.id)) {
      push(selectedForSlot(slot.id, program))
    }
    // Extras sit next to their own slot, whether or not its block is on.
    for (const id of day.add ?? []) {
      if (EXERCISES_BY_ID[id]?.slot === slot.id) push(id)
    }
  }
  return out
}

/** Exercises of a block's slots not already in the day — candidates to add. */
export function addableForBlock(
  block: BlockId,
  day: DayPlan,
  program?: Record<string, string>,
): ExerciseDef[] {
  const present = new Set(dayExercises(day, program).map((e) => e.id))
  const slotIds = new Set(SLOTS.filter((s) => s.block === block).map((s) => s.id))
  return GYM_EXERCISES.filter((e) => slotIds.has(e.slot) && !present.has(e.id))
}

/** Every distinct exercise the plan can use across the week, in routine order. */
export function planExercises(
  plan: DayPlan[],
  program?: Record<string, string>,
): ExerciseDef[] {
  const ids = new Set<string>()
  for (const day of plan) for (const def of dayExercises(day, program)) ids.add(def.id)
  return GYM_EXERCISES.filter((e) => ids.has(e.id))
}

/** Number of training (non-rest) days in the plan. */
export function trainingDayCount(plan: DayPlan[]): number {
  return plan.filter((d) => d.blocks.length > 0).length
}

/** Muscles a day trains, in display order. */
export function dayMuscles(day: DayPlan, program?: Record<string, string>): Muscle[] {
  const set = new Set(dayExercises(day, program).map((e) => e.muscle))
  return MUSCLE_ORDER.filter((m) => set.has(m))
}

/** How many days per week each muscle is trained. */
export function muscleFrequency(
  plan: DayPlan[],
  program?: Record<string, string>,
): Record<Muscle, number> {
  const freq = {} as Record<Muscle, number>
  for (const m of MUSCLE_ORDER) freq[m] = 0
  for (const day of plan) for (const m of dayMuscles(day, program)) freq[m] += 1
  return freq
}

/** Short label for a day, e.g. "Full routine · Leg day" or "Pair 1 · Core". */
export function dayLabel(day: DayPlan): string {
  if (!day.blocks.length) return 'Rest day'
  const on = BLOCKS.filter((b) => day.blocks.includes(b.id))
  if (ROUTINE.every((id) => day.blocks.includes(id))) {
    const extras = on.filter((b) => !ROUTINE.includes(b.id)).map((b) => b.short)
    return ['Full routine', ...extras].join(' · ')
  }
  return on.map((b) => b.short).join(' · ')
}
