// Personal records — pure functions over the session log.
//
// Three kinds of PR:
//  - 'reps':  more reps in a single set at a given weight than ever before at
//             that weight (the number double progression chases).
//  - 'onerm': best estimated 1RM (Epley) across any weight — catches "heavier
//             rung at fewer reps" strength gains the rep PR can't see.
//  - 'hold':  longest single hold (time exercises).
//
// A PR requires prior history of the same kind — a first-ever session sets the
// baseline quietly instead of raining trophies on day one.

import { getExercise } from './exercises'
import type { PRRecord, SessionLog } from '../storage/types'

/** Epley estimate: weight × (1 + reps/30). */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return weightKg * (1 + reps / 30)
}

export interface ExerciseBests {
  /** Best single-set reps per exact weight (kg key as string to avoid float keys). */
  repsAtWeight: Map<string, number>
  /** Best estimated 1RM and the set that produced it. */
  best1RM: number
  best1RMWeightKg?: number
  best1RMReps?: number
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
  for (const s of sessions) {
    if (!s.completedAt) continue
    for (const log of s.exercises) {
      if (log.exerciseId !== exerciseId) continue
      for (const set of log.sets) {
        if (!set.done) continue
        if (def.kind === 'time') {
          bests.longestHold = Math.max(bests.longestHold, set.seconds ?? 0)
        } else if ((set.reps ?? 0) > 0) {
          const key = weightKey(log.weightKg)
          const prev = bests.repsAtWeight.get(key) ?? 0
          if (set.reps! > prev) bests.repsAtWeight.set(key, set.reps!)
          const est = epley1RM(log.weightKg, set.reps!)
          if (est > bests.best1RM) {
            bests.best1RM = est
            bests.best1RMWeightKg = log.weightKg
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

    const bestReps = Math.max(...done.map((s) => s.reps ?? 0))
    if (bestReps <= 0) continue
    const priorAtWeight = bests.repsAtWeight.get(weightKey(log.weightKg))
    if (priorAtWeight != null && bestReps > priorAtWeight) {
      out.push({
        exerciseId: log.exerciseId,
        kind: 'reps',
        weightKg: log.weightKg,
        value: bestReps,
      })
    }
    const est = epley1RM(log.weightKg, bestReps)
    if (bests.best1RM > 0 && est > bests.best1RM + 1e-9) {
      out.push({
        exerciseId: log.exerciseId,
        kind: 'onerm',
        weightKg: log.weightKg,
        reps: bestReps,
        value: est,
      })
    }
  }
  return out
}
