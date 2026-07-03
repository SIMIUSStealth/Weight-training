// Insights: motivating aggregates and "falling behind" urgency signals.
// Pure functions; date-dependent ones accept `now` so tests are deterministic.

import { getExercise, MUSCLE_ORDER, type Muscle } from './exercises'
import {
  completedWeekdaysInWeek,
  groupKey,
  startOfWeek,
} from './analytics'
import { mondayIndex, trainingDayCount, WEEKDAYS_LONG } from './plan'
import { computeRecommendation } from './progression'
import { epley1RM } from './records'
import type {
  DayPlan,
  ExerciseProgress,
  SessionLog,
} from '../storage/types'

// ---------- all-time totals ----------

export interface LifetimeStats {
  /** Distinct logical workouts (split parts count once). */
  workouts: number
  /** Total completed sets. */
  sets: number
  /** Total weight moved: Σ weight × reps over weighted sets, rounded kg. */
  volumeKg: number
  /** Personal records earned. */
  prs: number
}

export function lifetimeStats(sessions: SessionLog[]): LifetimeStats {
  const groups = new Set<string>()
  let sets = 0
  let volume = 0
  let prs = 0
  for (const s of sessions) {
    if (!s.completedAt) continue
    groups.add(groupKey(s))
    prs += s.prs?.length ?? 0
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.done) continue
        sets += 1
        if (ex.weightKg > 0 && (set.reps ?? 0) > 0) volume += ex.weightKg * set.reps!
      }
    }
  }
  return { workouts: groups.size, sets, volumeKg: Math.round(volume), prs }
}

/** Longest run of consecutive weeks that hit the plan's training-day target. */
export function longestWeekStreak(
  plan: DayPlan[],
  sessions: SessionLog[],
  now = new Date(),
): number {
  const target = trainingDayCount(plan)
  const completed = sessions.filter((s) => s.completedAt)
  if (!target || !completed.length) return 0
  const first = completed.reduce((a, b) =>
    a.completedAt! < b.completedAt! ? a : b,
  )
  const start = startOfWeek(new Date(first.completedAt!))
  const thisStart = startOfWeek(now)
  let best = 0
  let run = 0
  for (
    let ws = new Date(start);
    ws <= thisStart;
    ws.setDate(ws.getDate() + 7)
  ) {
    if (completedWeekdaysInWeek(completed, ws).size >= target) {
      run += 1
      best = Math.max(best, run)
    } else if (ws.getTime() !== thisStart.getTime()) {
      run = 0 // an unfinished CURRENT week doesn't break the run
    }
  }
  return best
}

// ---------- momentum: last 4 weeks vs the 4 before ----------

export interface PeriodCompare {
  volumeKg: number
  prevVolumeKg: number
  workouts: number
  prevWorkouts: number
}

export function fourWeekCompare(
  sessions: SessionLog[],
  now = new Date(),
): PeriodCompare {
  const DAY = 86_400_000
  const cutRecent = now.getTime() - 28 * DAY
  const cutPrev = now.getTime() - 56 * DAY
  const out: PeriodCompare = {
    volumeKg: 0,
    prevVolumeKg: 0,
    workouts: 0,
    prevWorkouts: 0,
  }
  const recentGroups = new Set<string>()
  const prevGroups = new Set<string>()
  for (const s of sessions) {
    if (!s.completedAt) continue
    const t = new Date(s.completedAt).getTime()
    if (t > now.getTime() || t <= cutPrev) continue
    const recent = t > cutRecent
    let vol = 0
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.done && ex.weightKg > 0 && (set.reps ?? 0) > 0) {
          vol += ex.weightKg * set.reps!
        }
      }
    }
    if (recent) {
      out.volumeKg += vol
      recentGroups.add(groupKey(s))
    } else {
      out.prevVolumeKg += vol
      prevGroups.add(groupKey(s))
    }
  }
  out.volumeKg = Math.round(out.volumeKg)
  out.prevVolumeKg = Math.round(out.prevVolumeKg)
  out.workouts = recentGroups.size
  out.prevWorkouts = prevGroups.size
  return out
}

// ---------- weekly volume trend (for the momentum chart) ----------

export interface WeekVolume {
  /** ISO of the week's Monday (local). */
  weekStart: string
  volumeKg: number
  workouts: number
}

/**
 * Total weight moved per week for the last `weeks` weeks, oldest-first and
 * including the (partial) current week — one bar per week for the trend chart.
 */
export function weeklyVolumeSeries(
  sessions: SessionLog[],
  weeks = 10,
  now = new Date(),
): WeekVolume[] {
  const thisMon = startOfWeek(now)
  const buckets: WeekVolume[] = []
  const index = new Map<number, WeekVolume>()
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(thisMon)
    ws.setDate(ws.getDate() - 7 * i)
    const b: WeekVolume = { weekStart: ws.toISOString(), volumeKg: 0, workouts: 0 }
    buckets.push(b)
    index.set(ws.getTime(), b)
  }
  const groupsByWeek = new Map<number, Set<string>>()
  for (const s of sessions) {
    if (!s.completedAt) continue
    const key = startOfWeek(new Date(s.completedAt)).getTime()
    const b = index.get(key)
    if (!b) continue
    let vol = 0
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.done && ex.weightKg > 0 && (set.reps ?? 0) > 0) {
          vol += ex.weightKg * set.reps!
        }
      }
    }
    b.volumeKg += vol
    if (!groupsByWeek.has(key)) groupsByWeek.set(key, new Set())
    groupsByWeek.get(key)!.add(groupKey(s))
  }
  for (const b of buckets) {
    b.volumeKg = Math.round(b.volumeKg)
    b.workouts = groupsByWeek.get(new Date(b.weekStart).getTime())?.size ?? 0
  }
  return buckets
}

// ---------- all-time set distribution across muscles ----------

export interface MuscleTotal {
  muscle: Muscle
  sets: number
}

/** Completed sets per muscle across all history, in the fixed muscle order. */
export function muscleSetTotals(sessions: SessionLog[]): MuscleTotal[] {
  const acc = new Map<Muscle, number>()
  for (const m of MUSCLE_ORDER) acc.set(m, 0)
  for (const s of sessions) {
    if (!s.completedAt) continue
    for (const ex of s.exercises) {
      const done = ex.sets.filter((x) => x.done).length
      if (!done) continue
      const m = getExercise(ex.exerciseId).muscle
      acc.set(m, (acc.get(m) ?? 0) + done)
    }
  }
  return MUSCLE_ORDER.map((muscle) => ({ muscle, sets: acc.get(muscle)! }))
}

// ---------- strength gains (est. 1RM, first session vs recent) ----------

export interface StrengthGain {
  exerciseId: string
  firstRM: number
  recentRM: number
  /** Percent change, rounded. */
  pct: number
}

export function strengthGains(
  sessions: SessionLog[],
  exerciseIds: string[],
): StrengthGain[] {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))
  const out: StrengthGain[] = []
  for (const id of exerciseIds) {
    if (getExercise(id).kind !== 'reps') continue
    const logs = completed
      .map((s) => s.exercises.find((e) => e.exerciseId === id))
      .filter(
        (l): l is NonNullable<typeof l> => !!l && l.sets.some((x) => x.done),
      )
    if (logs.length < 2) continue
    const bestRM = (log: (typeof logs)[number]) =>
      Math.max(
        ...log.sets.map((x) => (x.done ? epley1RM(log.weightKg, x.reps ?? 0) : 0)),
      )
    const firstRM = bestRM(logs[0])
    const recentRM = Math.max(...logs.slice(-3).map(bestRM))
    if (firstRM <= 0) continue
    out.push({
      exerciseId: id,
      firstRM,
      recentRM,
      pct: Math.round(((recentRM - firstRM) / firstRM) * 100),
    })
  }
  return out.sort((a, b) => b.pct - a.pct)
}

// ---------- urgency signals ----------

export interface Urgency {
  kind: 'cant-hit-week' | 'tight-week' | 'gap' | 'stalled' | 'neglected'
  message: string
  /** Set for per-exercise urgencies (stalled) so the UI can link to it. */
  exerciseId?: string
}

export function urgencies(
  plan: DayPlan[],
  sessions: SessionLog[],
  progress: Record<string, ExerciseProgress>,
  planExerciseIds: string[],
  now = new Date(),
): Urgency[] {
  const out: Urgency[] = []
  const completed = sessions.filter((s) => s.completedAt)
  const target = trainingDayCount(plan)
  const todayIdx = mondayIndex(now)

  // Week math: can the remaining planned days still fit into the week?
  if (target > 0) {
    const done = completedWeekdaysInWeek(completed, startOfWeek(now)).size
    const remaining = Math.max(0, target - done)
    const daysLeft = 7 - todayIdx // including today
    if (remaining > daysLeft) {
      out.push({
        kind: 'cant-hit-week',
        message: `${remaining} training days still planned but only ${daysLeft} day${
          daysLeft === 1 ? '' : 's'
        } left this week — the target is slipping. Get one in today.`,
      })
    } else if (remaining > 0 && remaining === daysLeft) {
      out.push({
        kind: 'tight-week',
        message: `No slack left: ${remaining} training day${
          remaining === 1 ? '' : 's'
        } in the last ${daysLeft} day${daysLeft === 1 ? '' : 's'} of the week. Every day counts now.`,
      })
    }
  }

  // Gap since the last workout.
  if (completed.length) {
    const last = completed.reduce((a, b) =>
      a.completedAt! > b.completedAt! ? a : b,
    )
    const lastDay = new Date(last.completedAt!)
    lastDay.setHours(0, 0, 0, 0)
    const today0 = new Date(now)
    today0.setHours(0, 0, 0, 0)
    const gapDays = Math.round((today0.getTime() - lastDay.getTime()) / 86_400_000)
    if (gapDays >= 4) {
      let nextName = ''
      for (let i = 0; i < 7; i++) {
        const d = (todayIdx + i) % 7
        if (plan[d]?.muscles.length) {
          nextName = i === 0 ? 'today' : WEEKDAYS_LONG[d]
          break
        }
      }
      out.push({
        kind: 'gap',
        message: `${gapDays} days since your last workout — momentum fades fast. ${
          nextName ? `Next planned: ${nextName}.` : ''
        }`,
      })
    }
  }

  // Stalled lifts (the engine already knows).
  for (const id of planExerciseIds) {
    const p = progress[id]
    if (!p) continue
    const def = getExercise(id)
    if (def.kind !== 'reps') continue
    if (computeRecommendation(def, p, sessions).stalled) {
      out.push({
        kind: 'stalled',
        exerciseId: id,
        message: `${def.name} has stalled for 3 sessions — bridge past the top of the range or swap a variation.`,
      })
    }
  }

  // Neglected muscles: trained before, but not in the last 10+ days.
  const planMuscles = new Set<Muscle>(plan.flatMap((d) => d.muscles))
  for (const muscle of MUSCLE_ORDER) {
    if (!planMuscles.has(muscle)) continue
    let lastTrained: number | null = null
    for (const s of completed) {
      for (const ex of s.exercises) {
        if (
          getExercise(ex.exerciseId).muscle === muscle &&
          ex.sets.some((x) => x.done)
        ) {
          const t = new Date(s.completedAt!).getTime()
          if (lastTrained === null || t > lastTrained) lastTrained = t
        }
      }
    }
    if (lastTrained !== null) {
      const days = Math.floor((now.getTime() - lastTrained) / 86_400_000)
      if (days >= 10) {
        out.push({
          kind: 'neglected',
          message: `${muscle}: ${days} days untrained — gains there are slipping away.`,
        })
      }
    }
  }

  return out
}
