// The exercise picker's list: every exercise you could add to a workout, once
// each, grouped by muscle and narrowed by a search. Pure logic.

import {
  GYM_EXERCISES,
  MUSCLE_ORDER,
  SLOTS,
  blockFor,
  getSlot,
  type ExerciseDef,
  type Muscle,
  type Slot,
} from './exercises'
import type { ExerciseLog } from '../storage/types'

export interface PickerEntry {
  def: ExerciseDef
  /** The slot it would fill — sets its sets, reps and rest. */
  slot: Slot
}

/**
 * Every exercise not yet in the workout, once each, with the slot it would
 * take: one in a block the workout is already running where there is one (a
 * shrug added to Session A runs as Session A's shrug), else its home slot.
 */
export function addableToWorkout(exercises: ExerciseLog[]): PickerEntry[] {
  const present = new Set(exercises.map((e) => e.exerciseId))
  const running = new Set(
    exercises.map((e) => blockFor(e.exerciseId, e.slot)?.id).filter((id) => id != null),
  )
  const out: PickerEntry[] = []
  for (const def of GYM_EXERCISES) {
    if (def.retired || present.has(def.id)) continue
    const slot =
      SLOTS.find((s) => running.has(s.block) && s.optionIds.includes(def.id)) ?? getSlot(def.id)
    if (slot) out.push({ def, slot })
  }
  return out
}

/** Lower-cased, accents stripped — "Pallof" finds "pallof", "pull up" finds "Pull-up". */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Whether an entry matches a search: every word typed must appear (as the
 * start of a word) in its name, muscle, slot or equipment — so "db press",
 * "cable", "legs" and "kettle" all find what you'd expect.
 */
export function matchesSearch(entry: PickerEntry, query: string): boolean {
  const words = fold(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const { def, slot } = entry
  const hay = ` ${fold(`${def.name} ${def.muscle} ${slot.label} ${def.equipment}`)}`
  // "db" is how dumbbell lifts are abbreviated everywhere but in their names.
  const text = def.equipment === 'dumbbell' ? `${hay} db` : hay
  return words.every((w) => text.includes(` ${w}`))
}

export interface PickerGroup {
  muscle: Muscle
  entries: PickerEntry[]
}

/**
 * The picker's contents: entries matching the search (and the muscle filter,
 * when one is on), grouped by muscle in the app's usual order and sorted by
 * name within each. Muscles with nothing to show are left out.
 */
export function pickerGroups(
  entries: PickerEntry[],
  query = '',
  muscle: Muscle | null = null,
): PickerGroup[] {
  const hits = entries.filter(
    (e) => (!muscle || e.def.muscle === muscle) && matchesSearch(e, query),
  )
  return MUSCLE_ORDER.map((m) => ({
    muscle: m,
    entries: hits
      .filter((e) => e.def.muscle === m)
      .sort((a, b) => a.def.name.localeCompare(b.def.name)),
  })).filter((g) => g.entries.length > 0)
}
