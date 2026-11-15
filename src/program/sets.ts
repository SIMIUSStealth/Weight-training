// Per-set loads and what's derived from them — pure functions.
//
// An exercise log carries one working load (ExerciseLog.weightKg); a set done
// at a different one (a heavier top set, a drop set, a load changed halfway
// through) carries its own in SetLog.weightKg. Everything that needs a set's
// weight goes through setKg().

import type { ExerciseLog, SessionLog, SetLog } from '../storage/types'

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** The load a set was done at: its own, or the exercise's working load. */
export function setKg(log: ExerciseLog, set: SetLog): number {
  return set.weightKg ?? log.weightKg
}

/** Weight moved by one set, kg × reps — 0 unless done at a positive load. */
export function setVolumeKg(log: ExerciseLog, set: SetLog): number {
  const kg = setKg(log, set)
  return set.done && kg > 0 && (set.reps ?? 0) > 0 ? kg * set.reps! : 0
}

/** Weight moved by a whole session, kg (absolute loads only). */
export function sessionVolumeKg(session: SessionLog): number {
  let total = 0
  for (const log of session.exercises) for (const set of log.sets) total += setVolumeKg(log, set)
  return total
}

/**
 * Tidy a log's loads: the working load becomes the one most of the logged
 * sets were done at (a tie keeps the current working load if it's among them,
 * else the heaviest), and only the sets that differ keep a load of their own.
 * A log with nothing logged is returned as it is.
 */
export function normalizeLoads(log: ExerciseLog): ExerciseLog {
  const done = log.sets.filter((s) => s.done)
  if (!done.length) return log
  const counts: { kg: number; n: number }[] = []
  for (const s of done) {
    const kg = setKg(log, s)
    const hit = counts.find((c) => same(c.kg, kg))
    if (hit) hit.n += 1
    else counts.push({ kg, n: 1 })
  }
  const most = Math.max(...counts.map((c) => c.n))
  const tied = counts.filter((c) => c.n === most).map((c) => c.kg)
  const working = tied.some((kg) => same(kg, log.weightKg)) ? log.weightKg : Math.max(...tied)
  const sets = log.sets.map((s): SetLog => {
    const kg = setKg(log, s)
    const { weightKg: _own, ...rest } = s
    return s.done && !same(kg, working) ? { ...rest, weightKg: kg } : rest
  })
  const unchanged =
    same(working, log.weightKg) && sets.every((s, i) => s.weightKg === log.sets[i].weightKg)
  return unchanged ? log : { ...log, weightKg: working, sets }
}

/** The note left on an exercise the last time one was written, if any. */
export function lastNote(exerciseId: string, sessions: SessionLog[]): string | undefined {
  let when = ''
  let note: string | undefined
  for (const s of sessions) {
    if (!s.completedAt || s.completedAt <= when) continue
    const log = s.exercises.find((e) => e.exerciseId === exerciseId && e.note?.trim())
    if (!log) continue
    when = s.completedAt
    note = log.note!.trim()
  }
  return note
}
