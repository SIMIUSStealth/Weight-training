// Personal records — pure functions over the session log.
//
// Three kinds of PR:
//  - 'reps':  more reps in a single set at a given weight than ever before at
//             that weight (the number double progression chases).
//  - 'onerm': best estimated 1RM (Epley) across any weight — catches "heavier
//             rung at fewer reps" strength gains the rep PR can't see. Only for
//             absolute loads (bar, dumbbell, stack): a 1RM of "+5 kg on a dip
//             belt" or of an assisted pull-up means nothing.
//  - 'hold':  longest single hold (time exercises).
//
// A PR requires prior history of the same kind — a first-ever session sets the
// baseline quietly instead of raining trophies on day one.

import { getExercise, type ExerciseDef } from './exercises'
import { isRelativeLoad } from './ladder'
import { setKg } from './sets'
import type { PRRecord, SessionLog } from '../storage/types'

/** Epley estimate: weight × (1 + reps/30). */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return weightKg * (1 + reps / 30)
}

/** Whether an estimated 1RM is meaningful for this exercise. */
export function tracksOneRM(def: ExerciseDef): boolean {
  return def.kind === 'reps' && def.equipment !== 'none' && !isRelativeLoad(def.equipment)
}

export interface ExerciseBests {
  /** Best single-set reps per exact weight (kg key as string to avoid float keys). */
  repsAtWeight: Map<string, number>
  /** Best estimated 1RM and the set that produced it. */
  best1RM: number
  best1RMWeightKg?: number
  best1RMReps?: number
  /** Heaviest set ever (most reps at that load) — the bodyweight-lift "best". */
  topSet?: { weightKg: number; reps: number }
  /** Longest single hold in seconds (time exercises). */
  longestHold: number
}

const weightKey = (kg: number) => kg.toFixed(2)

/** All-time bests for one exercise across completed sessions. */
export function collectBests(
  exerciseId: string,
  sessions: SessionLog[],
): ExerciseBests {
  const bests: ExerciseBests = {
    repsAtWeight: new Map(),
    best1RM: 0,
    longestHold: 0,
  }
  const def = getExercise(exerciseId)
  const oneRM = tracksOneRM(def)
  for (const s of sessions) {
    if (!s.completedAt) continue
    for (const log of s.exercises) {
      if (log.exerciseId !== exerciseId) continue
      for (const set of log.sets) {
        if (!set.done) continue
        if (def.kind === 'time') {
          bests.longestHold = Math.max(bests.longestHold, set.seconds ?? 0)
        } else if ((set.reps ?? 0) > 0) {
          const kg = setKg(log, set)
          const key = weightKey(kg)
          const prev = bests.repsAtWeight.get(key) ?? 0
          if (set.reps! > prev) bests.repsAtWeight.set(key, set.reps!)
          const top = bests.topSet
          if (
            !top ||
            kg > top.weightKg + 1e-9 ||
            (Math.abs(kg - top.weightKg) < 1e-9 && set.reps! > top.reps)
          ) {
            bests.topSet = { weightKg: kg, reps: set.reps! }
          }
          const est = oneRM ? epley1RM(kg, set.reps!) : 0
          if (est > bests.best1RM) {
            bests.best1RM = est
            bests.best1RMWeightKg = kg
            bests.best1RMReps = set.reps!
          }
        }
      }
    }
  }
  return bests
}

/** PRs set by `finished` measured against `prior` completed sessions only. */
export function detectPRs(
  finished: SessionLog,
  prior: SessionLog[],
): PRRecord[] {
  const out: PRRecord[] = []
  for (const log of finished.exercises) {
    const done = log.sets.filter((s) => s.done)
    if (!done.length) continue
    const def = getExercise(log.exerciseId)
    const bests = collectBests(log.exerciseId, prior)

    if (def.kind === 'time') {
      const best = Math.max(...done.map((s) => s.seconds ?? 0))
      if (bests.longestHold > 0 && best > bests.longestHold) {
        out.push({ exerciseId: log.exerciseId, kind: 'hold', value: best })
      }
      continue
    }

    // Most reps at each load used this session (a top set and its back-off
    // sets are different loads), in the order the loads were first used.
    const bestAt = new Map<string, { kg: number; reps: number }>()
    for (const s of done) {
      const reps = s.reps ?? 0
      if (reps <= 0) continue
      const kg = setKg(log, s)
      const cur = bestAt.get(weightKey(kg))
      if (!cur || reps > cur.reps) bestAt.set(weightKey(kg), { kg, reps })
    }
    if (!bestAt.size) continue
    for (const [key, { kg, reps }] of bestAt) {
      const priorAtWeight = bests.repsAtWeight.get(key)
      if (priorAtWeight != null && reps > priorAtWeight) {
        out.push({ exerciseId: log.exerciseId, kind: 'reps', weightKg: kg, value: reps })
      }
    }
    if (tracksOneRM(def)) {
      let top = { kg: 0, reps: 0, est: 0 }
      for (const { kg, reps } of bestAt.values()) {
        const est = epley1RM(kg, reps)
        if (est > top.est) top = { kg, reps, est }
      }
      if (bests.best1RM > 0 && top.est > bests.best1RM + 1e-9) {
        out.push({
          exerciseId: log.exerciseId,
          kind: 'onerm',
          weightKg: top.kg,
          reps: top.reps,
          value: top.est,
        })
      }
    }
  }
  return out
}

/**
 * Re-derive every session's PR stamps from the log as it stands — after a
 * past session is edited, re-dated or deleted, what counted as a record at
 * the time may no longer be one (and a later session may now hold it).
 * Returns only the sessions whose stamps changed.
 */
export function restampPRs(sessions: SessionLog[]): SessionLog[] {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))
  const changed: SessionLog[] = []
  const prior: SessionLog[] = []
  for (const s of completed) {
    const prs = detectPRs(s, prior)
    prior.push(s)
    if (JSON.stringify(prs) === JSON.stringify(s.prs ?? [])) continue
    const { prs: _old, ...rest } = s
    changed.push(prs.length ? { ...rest, prs } : rest)
  }
  return changed
}
