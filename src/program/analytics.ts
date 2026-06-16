// Derived stats for the tracking screens — pure functions over the session log.

import { getExercise } from './exercises'
import type { SessionLog } from '../storage/types'

export interface ExercisePoint {
  /** ISO date-time of the session. */
  date: string
  weightKg: number
  /** Best set: reps, or seconds for the plank. */
  best: number
  /** Sum across sets: reps, or seconds for the plank. */
  total: number
  /** Rough work done: weight × total reps (reps), or total seconds (plank). */
  load: number
  isTime: boolean
}

/** One chronological (oldest-first) point per completed session for an exercise. */
export function exerciseSeries(
  exerciseId: string,
  sessions: SessionLog[],
): ExercisePoint[] {
  const def = getExercise(exerciseId)
  const isTime = def.kind === 'time'
  return sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))
    .map((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId)
      if (!log) return null
      const done = log.sets.filter((x) => x.done)
      const vals = done.map((x) => (isTime ? x.seconds ?? 0 : x.reps ?? 0))
      const total = vals.reduce((a, b) => a + b, 0)
      const best = vals.length ? Math.max(...vals) : 0
      const load = isTime ? total : log.weightKg * total
      return {
        date: s.completedAt!,
        weightKg: log.weightKg,
        best,
        total,
        load,
        isTime,
      } satisfies ExercisePoint
    })
    .filter((p): p is ExercisePoint => p !== null)
}

// ---------- session-level summaries ----------

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setDate(x.getDate() - day)
  return x
}

export interface OverviewStats {
  totalSessions: number
  thisWeek: number
  lastSessionAt: string | null
  daysSinceLast: number | null
}

export function overview(sessions: SessionLog[]): OverviewStats {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
  const weekStart = startOfWeek(new Date())
  const thisWeek = completed.filter(
    (s) => new Date(s.completedAt!) >= weekStart,
  ).length
  const lastSessionAt = completed[0]?.completedAt ?? null
  let daysSinceLast: number | null = null
  if (lastSessionAt) {
    const ms = Date.now() - new Date(lastSessionAt).getTime()
    daysSinceLast = Math.floor(ms / 86_400_000)
  }
  return {
    totalSessions: completed.length,
    thisWeek,
    lastSessionAt,
    daysSinceLast,
  }
}

/** Format plank seconds as e.g. "1:05" or "45s". */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A short relative-date label, e.g. "today", "2d ago", "3 Jun". */
export function relativeDay(iso: string): string {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
