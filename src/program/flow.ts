// Session flow — which exercise "Next" goes to. The pairs, the core triplet and
// the kettlebell circuit are run alternating (one set of each member, rest,
// round again) rather than as straight sets, so "Next" rotates through the
// group while its members still have sets left, then moves on in routine
// order. Pure logic.

import { getBlock } from './exercises'
import type { ExerciseLog } from '../storage/types'

/**
 * Inclusive [start, end] indices of the alternating group (a contiguous run
 * of exercises from one alternating block) around `index`, or null when the
 * exercise is done as straight sets.
 */
export function alternatingGroup(
  exercises: ExerciseLog[],
  index: number,
): [number, number] | null {
  const id = exercises[index]?.exerciseId
  const block = id ? getBlock(id) : undefined
  if (!block?.alternate) return null
  const same = (i: number) => getBlock(exercises[i].exerciseId)?.id === block.id
  let start = index
  let end = index
  while (start > 0 && same(start - 1)) start--
  while (end < exercises.length - 1 && same(end + 1)) end++
  return end > start ? [start, end] : null
}

const setsLeft = (log: ExerciseLog) => log.sets.some((s) => !s.done)
const setsDone = (log: ExerciseLog) => log.sets.some((s) => s.done)

/**
 * Where "Next" goes from `index`; null at the end of the session.
 *
 * Inside a group: the next member further on that still has sets left. Wrap
 * back to the group's start for the next round only once the current member
 * has a set logged — so just browsing past a group (or skipping an optional
 * pair) never traps you in it.
 */
export function nextExerciseIndex(
  exercises: ExerciseLog[],
  index: number,
): number | null {
  const group = alternatingGroup(exercises, index)
  if (group) {
    const [start, end] = group
    for (let i = index + 1; i <= end; i++) if (setsLeft(exercises[i])) return i
    if (setsDone(exercises[index])) {
      for (let i = start; i < index; i++) if (setsLeft(exercises[i])) return i
    }
    return end + 1 < exercises.length ? end + 1 : null
  }
  return index + 1 < exercises.length ? index + 1 : null
}

/** 1-based round the group is on (the fewest sets done by any member, + 1). */
export function groupRound(exercises: ExerciseLog[], group: [number, number]): number {
  const [start, end] = group
  let min = Infinity
  let total = 0
  for (let i = start; i <= end; i++) {
    const done = exercises[i].sets.filter((s) => s.done).length
    min = Math.min(min, done)
    total = Math.max(total, exercises[i].sets.length)
  }
  return Math.min(total, min + 1)
}
