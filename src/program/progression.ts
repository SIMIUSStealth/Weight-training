// The progression engine — pure functions, no I/O. This is the part that turns
// a static routine into something that drives growth (Training Spec §4).
//
// Double progression: add reps toward the top of the range first; once all
// three sets hit the top, move up one rung on the exercise's load ladder
// (barbell, dumbbell rack, stack, kettlebell, or assistance → bodyweight →
// added weight). Timed work is the same idea: an unloaded hold climbs in
// seconds, the kettlebell circuit climbs to the next bell.

import {
  SLOTS,
  getExercise,
  repTarget,
  type ExerciseDef,
  type ExerciseKind,
} from './exercises'
import {
  DEFAULT_INCREMENTS,
  formatLoad,
  isTopRung,
  ladderFor,
  nextRung,
  type Increments,
} from './ladder'
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

/**
 * At least the program's `sets` working sets completed at or above `n`. Extra
 * sets added mid-workout count toward it but never block a level-up.
 */
function allSetsAtLeast(log: ExerciseLog, def: ExerciseDef, n: number): boolean {
  return doneSets(log).filter((s) => setValue(s, def.kind) >= n).length >= def.sets
}

// ---------- initial state ----------

/** A starting progression row for one exercise (its first rung). */
export function defaultProgress(def: ExerciseDef): ExerciseProgress {
  return {
    exerciseId: def.id,
    currentWeightKg: def.startWeightKg,
    targetSeconds: def.kind === 'time' ? def.startSeconds : undefined,
  }
}

/** Fresh per-exercise progression state: every routine slot's default exercise. */
export function initialProgress(): ExerciseProgress[] {
  return [...new Set(SLOTS.map((s) => s.baseId))].map((id) => defaultProgress(getExercise(id)))
}

/** The most sets one exercise can hold in a workout. */
export const MAX_SETS = 10

/**
 * How many sets a slot opens a workout with: the program's count, or more when
 * you did more the last time you trained this slot — sets added on top of the
 * scheme carry over instead of having to be re-added every session. It only
 * ever grows the count: a cut-short or lighter day doesn't shrink the plan,
 * and one session back at the program's count resets it.
 */
export function startingSets(
  def: ExerciseDef,
  slotId: string,
  sessions: SessionLog[],
): number {
  let when = ''
  let done = 0
  for (const s of sessions) {
    if (!s.completedAt || s.completedAt <= when) continue
    const log = s.exercises.find((e) => e.slot === slotId && e.sets.some((x) => x.done))
    if (!log) continue
    when = s.completedAt
    done = log.sets.filter((x) => x.done).length
  }
  return Math.min(MAX_SETS, Math.max(def.sets, done))
}

/** True when the exercise carries a load that climbs a ladder. */
export function isLoaded(def: ExerciseDef): boolean {
  return def.equipment !== 'none'
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
 * range (reps) or at the target time (timed work) → climb one step.
 */
export function applyProgression(
  def: ExerciseDef,
  progress: ExerciseProgress,
  log: ExerciseLog,
  increments: Increments = DEFAULT_INCREMENTS,
): ProgressionResult {
  const ladder = ladderFor(def.equipment, increments)
  // The load you trained at is your load. A weight changed mid-workout (the
  // stack felt light, the dumbbells were taken, a typed in-between weight) is
  // where the next session opens and where a level-up climbs from — not a
  // one-off the app forgets, leaving the old load to be corrected every time.
  const trainedKg =
    isLoaded(def) && doneSets(log).length ? log.weightKg : progress.currentWeightKg
  const here: ExerciseProgress =
    Math.abs(trainedKg - progress.currentWeightKg) < 1e-9
      ? progress
      : { ...progress, currentWeightKg: trainedKg }
  const stay: ProgressionResult = { progress: here, leveledUp: false }
  const climb = (): ProgressionResult => {
    const newWeightKg = nextRung(trainedKg, ladder)
    // Already on (or typed past) the top of the ladder: nowhere to climb.
    if (newWeightKg <= trainedKg + 1e-9) return stay
    return {
      progress: { ...progress, currentWeightKg: newWeightKg },
      leveledUp: true,
      newWeightKg,
    }
  }

  if (def.kind === 'time') {
    const target = progress.targetSeconds ?? def.startSeconds ?? 30
    if (isLoaded(def)) {
      // Loaded time work (kettlebell): same time, next bell.
      return allSetsAtLeast(log, def, target) ? climb() : stay
    }
    if (allSetsAtLeast(log, def, target)) {
      const inc = def.timeIncrementSeconds ?? 10
      const newSeconds = target + inc
      return {
        progress: { ...progress, targetSeconds: newSeconds },
        leveledUp: true,
        newSeconds,
      }
    }
    return stay
  }

  // reps exercise (an unloaded one sits on a one-rung ladder: it never climbs
  // a weight — the coach suggests a harder variation instead)
  return allSetsAtLeast(log, def, def.repMax) ? climb() : stay
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
  if (hadPriorHistory || def.kind !== 'reps' || !isLoaded(def)) return null
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
  /** Optional effort note from last session's reps-in-reserve. */
  effortNote?: string
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
  increments: Increments = DEFAULT_INCREMENTS,
): Recommendation {
  const logs = exerciseLogsDesc(def.id, sessions)
  const weightKg = progress.currentWeightKg
  const loaded = isLoaded(def)
  const load = formatLoad(def.equipment, weightKg)
  const targetSeconds =
    def.kind === 'time'
      ? progress.targetSeconds ?? def.startSeconds ?? 30
      : undefined
  const atTopRung =
    loaded && isTopRung(weightKg, ladderFor(def.equipment, increments))

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
          : `${repTarget(def)} reps × ${def.sets}`,
      coach: loaded
        ? 'First time on this one — the starting load is an estimate. If it’s clearly too light or heavy, adjust it; the system self-corrects within a session or two.'
        : 'First time on this one — find a range of motion you can control and log what you get.',
    }
  }

  const last = logs[0].log

  // Per-set "last completed" values. For each set position, take the most
  // recent session where THAT set was actually completed; if a position has
  // never been completed, fall back to the most recent completed set overall.
  // This way the workout always shows a real number to beat — never a blank
  // for a set you didn't finish last time.
  const completedLogs = logs.map((l) => l.log)
  let lastCompletedValue: number | undefined
  for (const log of completedLogs) {
    for (let i = log.sets.length - 1; i >= 0; i--) {
      if (log.sets[i]?.done) {
        lastCompletedValue = setValue(log.sets[i], def.kind)
        break
      }
    }
    if (lastCompletedValue !== undefined) break
  }
  // Cover every set done last time, not just the program's count — a set
  // added on top of the scheme (a third round of a 2-set finisher) is still a
  // number to beat.
  const lastCount = last.sets.map((s) => s.done).lastIndexOf(true) + 1
  const lastSets: number[] = []
  for (let i = 0; i < Math.max(def.sets, lastCount); i++) {
    let v: number | undefined
    for (const log of completedLogs) {
      if (log.sets[i]?.done) {
        v = setValue(log.sets[i], def.kind)
        break
      }
    }
    const filled = v ?? lastCompletedValue
    if (filled !== undefined) lastSets.push(filled)
  }

  // Effort signal from last session's reps-in-reserve (proximity to failure is
  // the strongest growth lever for a given volume).
  let effortNote: string | undefined
  if (def.kind === 'reps') {
    const rirs = doneSets(last)
      .map((s) => s.rir)
      .filter((r): r is number => r != null)
    if (rirs.length) {
      const hardest = Math.min(...rirs) // fewest reps left = closest to failure
      const toFailure = rirs.filter((r) => r === 0).length
      if (hardest >= 3) {
        effortNote =
          'Last time you left 3+ in reserve on every set — too easy to drive much growth. Push to 1–2 reps short of failure, or move up a rung.'
      } else if (toFailure >= def.sets) {
        effortNote =
          'Every set went to failure last time. Leaving 1–2 in reserve lets you recover and train this more often — fatigue is the limiter, not heroics.'
      }
    }
  }

  // Just leveled up? Last session was logged a rung lower (anything loaded),
  // or was the session whose commit raised the hold target to its current
  // value (unloaded holds) — the level-up stamp is exact, unlike re-deriving
  // it from hold durations, which stays true for every later session too.
  let justLeveledUp = false
  if (loaded) {
    justLeveledUp = last.weightKg < weightKg - 1e-9
  } else if (def.kind === 'time') {
    justLeveledUp = last.leveledUp === true && last.newSeconds === targetSeconds
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

  if (def.kind === 'time' && loaded) {
    headline = `${load} · ${targetSeconds}s × ${def.sets}`
    if (justLeveledUp) {
      coach = `Up to ${load}. Same ${targetSeconds}s — complete all ${def.sets} rounds to climb again.`
    } else if (atTopRung) {
      coach = 'Heaviest bell on the rack for this one — slow the reps down or add a round.'
    }
  } else if (def.kind === 'time') {
    headline = `Hold ${targetSeconds}s × ${def.sets}`
    if (justLeveledUp) {
      coach = `Target climbed to ${targetSeconds}s. Hold all ${def.sets} sets to level up again.`
    }
  } else if (justLeveledUp) {
    headline = `${load} — build back to ${def.repMax}`
    coach = `Leveled up to ${load}. Reps will drop — that’s expected and correct. Work each set back to ${def.repMax}, then jump again.`
  } else if (stalled) {
    headline = beat ? `Beat ${beat}` : `${repTarget(def)} reps`
    coach = loaded
      ? `Stalled at ${load}. Check protein, sleep, and rest days first. You can bridge — push past ${def.repMax} reps (up to ${
          def.repMax + 3
        }) to build the strength for the next rung.`
      : 'Stalled for 3 sessions. Check protein, sleep, and rest days first; if it sticks, shorten the range or use an easier variation and build back up.'
  } else if (!loaded) {
    headline = beat ? `Beat ${beat}` : `${repTarget(def)} reps × ${def.sets}`
    if (allSetsAtLeast(last, def, def.repMax)) {
      coach = `You own ${def.sets} × ${def.repMax}. Bodyweight only — make it harder: a tougher variation, more range, or a slower lowering.`
    }
  } else if (atTopRung) {
    headline = beat ? `Beat ${beat}` : `${repTarget(def)} reps`
    coach = `Top of the ladder for this lift. Keep adding reps for now, then reassess — swap the variation, shift the rep range, or add a 4th set.`
  } else {
    headline = beat ? `Beat ${beat}` : `${repTarget(def)} reps × ${def.sets}`
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
    effortNote,
  }
}
