// Derived stats for the tracking screens — pure functions over the session log.

import { getExercise, MUSCLE_ORDER, type Muscle } from './exercises'
import { mondayIndex } from './plan'
import type { DayPlan, SessionLog } from '../storage/types'

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
  /** Per-set values (reps, or seconds for the plank). */
  sets: number[]
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
        sets: vals,
        isTime,
      } satisfies ExercisePoint
    })
    .filter((p): p is ExercisePoint => p !== null)
}

// ---------- session-level summaries ----------

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - mondayIndex(x))
  return x
}

/** Whole local-calendar days between an ISO timestamp and now (0 = today). */
function calendarDaysAgo(iso: string): number {
  const then = new Date(iso)
  then.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - then.getTime()) / 86_400_000)
}

export interface OverviewStats {
  /** Distinct logical workouts (split parts count as one). */
  totalWorkouts: number
  /** Distinct logical workouts trained this week (toward the base of 3). */
  thisWeek: number
  lastSessionAt: string | null
  daysSinceLast: number | null
}

/** The logical-workout key — parts of a split day share it. */
export function groupKey(s: SessionLog): string {
  return s.groupId ?? s.id
}

export function overview(sessions: SessionLog[]): OverviewStats {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
  const weekStart = startOfWeek(new Date())
  const allGroups = new Set(completed.map(groupKey))
  const weekGroups = new Set(
    completed
      .filter((s) => new Date(s.completedAt!) >= weekStart)
      .map(groupKey),
  )
  const lastSessionAt = completed[0]?.completedAt ?? null
  const daysSinceLast = lastSessionAt ? calendarDaysAgo(lastSessionAt) : null
  return {
    totalWorkouts: allGroups.size,
    thisWeek: weekGroups.size,
    lastSessionAt,
    daysSinceLast,
  }
}

// ---------- weekly training volume per muscle ----------

export interface MuscleVolume {
  muscle: Muscle
  /** Hard (completed) sets this week. */
  sets: number
  /** Distinct logical workouts that trained this muscle this week (split parts count once). */
  days: number
}

export type VolumeBand = 'low' | 'good' | 'high'

/** Rough hypertrophy landmark on weekly hard sets per muscle. */
export function volumeBand(sets: number): VolumeBand {
  if (sets === 0) return 'low'
  if (sets < 6) return 'low'
  if (sets > 22) return 'high'
  return 'good'
}

/** Completed sets and frequency per muscle for the current (Mon-based) week. */
export function weeklyVolume(sessions: SessionLog[]): MuscleVolume[] {
  const weekStart = startOfWeek(new Date())
  const acc = new Map<Muscle, { sets: number; days: Set<string> }>()
  for (const m of MUSCLE_ORDER) acc.set(m, { sets: 0, days: new Set() })

  for (const s of sessions) {
    if (!s.completedAt || new Date(s.completedAt) < weekStart) continue
    // Frequency counts logical workouts (groupKey), so split parts count once
    // and the tally is timezone-safe — consistent with overview() and the
    // "a split still counts as one workout" promise.
    const workout = groupKey(s)
    for (const ex of s.exercises) {
      const done = ex.sets.filter((x) => x.done).length
      if (!done) continue
      const rec = acc.get(getExercise(ex.exerciseId).muscle)!
      rec.sets += done
      rec.days.add(workout)
    }
  }

  return MUSCLE_ORDER.map((muscle) => ({
    muscle,
    sets: acc.get(muscle)!.sets,
    days: acc.get(muscle)!.days.size,
  }))
}

// ---------- weekly-plan day status ----------

export type DayStatus = 'rest' | 'todo' | 'inprogress' | 'done'

export interface WeekDayView {
  weekday: number
  muscles: Muscle[]
  status: DayStatus
}

function completedWeekdaysInWeek(
  sessions: SessionLog[],
  weekStart: Date,
): Set<number> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const days = new Set<number>()
  for (const s of sessions) {
    if (!s.completedAt) continue
    const when = new Date(s.completedAt)
    if (when < weekStart || when >= weekEnd) continue
    // Sessions logged before the weekly-plan feature carry no weekday tag —
    // fall back to the local calendar day they were completed on, so a user's
    // pre-existing history still marks days done.
    const weekday = s.weekday ?? mondayIndex(when)
    days.add(weekday)
  }
  return days
}

function completedWeekdaysThisWeek(sessions: SessionLog[]): Set<number> {
  return completedWeekdaysInWeek(sessions, startOfWeek(new Date()))
}

/**
 * Consecutive weeks the plan's training-day target was met. The current week
 * counts as soon as it hits the target; an unfinished current week doesn't
 * break the streak (it's still in play). Historical weeks are measured against
 * the CURRENT plan's target — a deliberate simplification.
 */
export function weekStreak(plan: DayPlan[], sessions: SessionLog[]): number {
  const target = plan.filter((d) => d.muscles.length > 0).length
  if (!target) return 0
  const thisStart = startOfWeek(new Date())
  let streak =
    completedWeekdaysInWeek(sessions, thisStart).size >= target ? 1 : 0
  for (let i = 1; i <= 520; i++) {
    const ws = new Date(thisStart)
    ws.setDate(ws.getDate() - 7 * i)
    if (completedWeekdaysInWeek(sessions, ws).size >= target) streak++
    else break
  }
  return streak
}

/** Per-weekday view for the current week: muscles + status. */
export function weekStatuses(
  plan: DayPlan[],
  sessions: SessionLog[],
  active: SessionLog | null,
): WeekDayView[] {
  const done = completedWeekdaysThisWeek(sessions)
  return plan.map((day, weekday) => {
    let status: DayStatus
    // An active session outranks everything — even a day whose muscles were
    // toggled off mid-workout must keep showing (and resuming) its session.
    if (active && active.weekday === weekday) status = 'inprogress'
    else if (!day.muscles.length) status = 'rest'
    else if (done.has(weekday)) status = 'done'
    else status = 'todo'
    return { weekday, muscles: day.muscles, status }
  })
}

/** Distinct planned days completed this week (toward the weekly target). */
export function doneDaysThisWeek(sessions: SessionLog[]): number {
  return completedWeekdaysThisWeek(sessions).size
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
  const days = calendarDaysAgo(iso)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
