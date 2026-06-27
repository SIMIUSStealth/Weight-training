// The progression engine — pure functions, no I/O. This is the part that turns
// a static routine into something that drives growth (Training Spec §4).
//
// Double progression: add reps toward the top of the range first; once all
// three sets hit the top, move up one rung on the dumbbell ladder. The plank
// is the same idea with time instead of reps and weight.

import {
  EXERCISES,
  type ExerciseDef,
  type ExerciseKind,
} from './exercises'
import { formatKg, isTopRung, nextRung } from './ladder'
import type {
  ExerciseLog,
  ExerciseProgress,
  SessionLog,
  SetLog,
} from '../storage/types'

// ---------- small helpers ----------

function doneSets(log: ExerciseLog): SetLog[] {
  return log.sets.filter((s) => s.done)
}

function setValue(s: SetLog, kind: ExerciseKind): number {
  return kind === 'time' ? s.seconds ?? 0 : s.reps ?? 0
}

/** Best (max) value across completed sets — the high-water mark for the day. */
export function bestSet(log: ExerciseLog, kind: ExerciseKind): number {
  const vals = doneSets(log).map((s) => setValue(s, kind))
  return vals.length ? Math.max(...vals) : 0
}

/** Worst (min) value across completed sets — the limiting set. */
export function worstSet(log: ExerciseLog, kind: ExerciseKind): number {
  const vals = doneSets(log).map((s) => setValue(s, kind))
  return vals.length ? Math.min(...vals) : 0
}

/** All `sets` working sets completed AND every one at or above `n`. */
function allSetsAtLeast(log: ExerciseLog, def: ExerciseDef, n: number): boolean {
  const done = doneSets(log)
  return done.length >= def.sets && done.every((s) => setValue(s, def.kind) >= n)
}

// ---------- initial state ----------

/** Fresh per-exercise progression state from the spec's starting points. */
export function initialProgress(): ExerciseProgress[] {
  return EXERCISES.map((def) => ({
    exerciseId: def.id,
    currentWeightKg: def.startWeightKg,
    targetSeconds: def.kind === 'time' ? def.startSeconds : undefined,
  }))
}

// ---------- applying progression at session commit ----------

export interface ProgressionResult {
  progress: ExerciseProgress
  leveledUp: boolean
  newWeightKg?: number
  newSeconds?: number
}

/**
 * Given the current state of an exercise and how it was just performed,
 * return the updated state. Level-up rule: all three sets at the top of the
 * range (reps) or at the target hold (plank) → climb one step.
 */
export function applyProgression(
  def: ExerciseDef,
  progress: ExerciseProgress,
  log: ExerciseLog,
): ProgressionResult {
  if (def.kind === 'time') {
    const target = progress.targetSeconds ?? def.startSeconds ?? 30
    if (allSetsAtLeast(log, def, target)) {
      const inc = def.timeIncrementSeconds ?? 10
      const newSeconds = target + inc
      return {
        progress: { ...progress, targetSeconds: newSeconds },
        leveledUp: true,
        newSeconds,
      }
    }
    return { progress, leveledUp: false }
  }

  // reps exercise — only count the level-up if it was done at the current rung
  const atCurrentWeight =
    Math.abs(log.weightKg - progress.currentWeightKg) < 1e-9
  if (
    atCurrentWeight &&
    allSetsAtLeast(log, def, def.repMax) &&
    !isTopRung(progress.currentWeightKg)
  ) {
    const newWeightKg = nextRung(progress.currentWeightKg)
    return {
      progress: { ...progress, currentWeightKg: newWeightKg },
      leveledUp: true,
      newWeightKg,
    }
  }
  return { progress, leveledUp: false }
}

// ---------- start-weight self-correction (the "adjust to your stats" bit) ----------

export type StartAssessment = 'too_light' | 'too_heavy' | null

/**
 * On the FIRST time an exercise is performed, a starting weight that is clearly
 * wrong shows up immediately: way over the top of the range (too light) or
 * unable to hold the bottom of the range (too heavy). Returns a nudge.
 */
export function assessStartWeight(
  def: ExerciseDef,
  log: ExerciseLog,
  hadPriorHistory: boolean,
): StartAssessment {
  if (hadPriorHistory || def.kind !== 'reps') return null
  const done = doneSets(log)
  if (!done.length) return null
  const worst = worstSet(log, def.kind)
  const best = bestSet(log, def.kind)
  if (worst < def.repMin) return 'too_heavy'
  if (best >= def.repMax + 3) return 'too_light'
  return null
}

// ---------- the recommendation shown for the NEXT session ----------

export interface Recommendation {
  exerciseId: string
  kind: ExerciseKind
  weightKg: number
  targetMin: number
  targetMax: number
  targetSeconds?: number
  /** Per-set values from the most recent completed session (to beat). */
  lastSets: number[]
  /** Weight used in that most recent completed session (kg). */
  lastWeightKg?: number
  hasHistory: boolean
  justLeveledUp: boolean
  stalled: boolean
  atTopRung: boolean
  /** One-line "what to chase" headline. */
  headline: string
  /** Optional coaching note (start nudge, stall/bridge, reassess). */
  coach?: string
}

/** Most-recent-first list of this exercise's logs across completed sessions. */
function exerciseLogsDesc(
  exerciseId: string,
  sessions: SessionLog[],
): { when: string; log: ExerciseLog }[] {
  return sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
    .map((s) => ({
      when: s.completedAt!,
      log: s.exercises.find((e) => e.exerciseId === exerciseId),
    }))
    .filter((x): x is { when: string; log: ExerciseLog } => !!x.log)
}

export function computeRecommendation(
  def: ExerciseDef,
  progress: ExerciseProgress,
  sessions: SessionLog[],
): Recommendation {
  const logs = exerciseLogsDesc(def.id, sessions)
  const weightKg = progress.currentWeightKg
  const targetSeconds =
    def.kind === 'time'
      ? progress.targetSeconds ?? def.startSeconds ?? 30
      : undefined
  const atTopRung = def.kind === 'reps' && isTopRung(weightKg)

  const base = {
    exerciseId: def.id,
    kind: def.kind,
    weightKg,
    targetMin: def.repMin,
    targetMax: def.repMax,
    targetSeconds,
    atTopRung,
  }

  if (!logs.length) {
    return {
      ...base,
      lastSets: [],
      hasHistory: false,
      justLeveledUp: false,
      stalled: false,
      headline:
        def.kind === 'time'
          ? `Hold ${targetSeconds}s × ${def.sets}`
          : `${def.repMin}–${def.repMax} reps × ${def.sets}`,
      coach:
        'First time on this one — the starting weight is an estimate. If it’s clearly too light or heavy, adjust; the system self-corrects within a session or two.',
    }
  }

  const last = logs[0].log
  const lastSets = doneSets(last).map((s) => setValue(s, def.kind))

  // Just leveled up? Last session was logged a rung lower (reps), or held the
  // previous (lower) plank target on every set.
  let justLeveledUp = false
  if (def.kind === 'reps') {
    justLeveledUp = last.weightKg < weightKg - 1e-9
  } else {
    const inc = def.timeIncrementSeconds ?? 10
    const prevTarget = (targetSeconds ?? 0) - inc
    justLeveledUp =
      doneSets(last).length >= def.sets && worstSet(last, def.kind) >= prevTarget
  }

  // Stall: three+ consecutive sessions at the current rung with no new best,
  // and not yet at the level-up threshold (reps only).
  let stalled = false
  if (def.kind === 'reps') {
    const runAtWeight: number[] = []
    for (const { log } of logs) {
      if (Math.abs(log.weightKg - weightKg) < 1e-9) {
        runAtWeight.push(bestSet(log, def.kind))
      } else break
    }
    if (runAtWeight.length >= 3) {
      const recent = runAtWeight[0]
      const prior = Math.max(runAtWeight[1], runAtWeight[2])
      stalled = recent <= prior && recent < def.repMax
    }
  }

  let headline: string
  let coach: string | undefined
  const beat = lastSets.join(' · ')

  if (def.kind === 'time') {
    headline = `Hold ${targetSeconds}s × ${def.sets}`
    if (justLeveledUp) {
      coach = `Target climbed to ${targetSeconds}s. Hold all ${def.sets} sets to level up again.`
    }
  } else if (justLeveledUp) {
    headline = `${formatKg(weightKg)} — build back to ${def.repMax}`
    coach = `Leveled up to ${formatKg(
      weightKg,
    )}. Reps will drop — that’s expected and correct. Work each set back to ${def.repMax}, then jump again.`
  } else if (stalled) {
    headline = beat ? `Beat ${beat}` : `${def.repMin}–${def.repMax} reps`
    coach = `Stalled at ${formatKg(
      weightKg,
    )}. Check protein, sleep, and rest days first. You can bridge — push past ${def.repMax} reps (up to ${
      def.repMax + 3
    }) to build the strength for the next rung.`
  } else if (atTopRung) {
    headline = beat ? `Beat ${beat}` : `${def.repMin}–${def.repMax} reps`
    coach = `Top of the dumbbell ladder for this lift. Keep adding reps for now, then reassess — swap the variation, shift the rep range, or add a 4th set.`
  } else {
    headline = beat ? `Beat ${beat}` : `${def.repMin}–${def.repMax} reps × ${def.sets}`
  }

  return {
    ...base,
    lastSets,
    lastWeightKg: last.weightKg,
    hasHistory: true,
    justLeveledUp,
    stalled,
    headline,
    coach,
  }
}
