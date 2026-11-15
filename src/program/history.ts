// The history screens' date maths — a month's calendar and recap, a
// session's duration, and moving a session to another day. Pure functions;
// everything is in the device's local time, the way a calendar reads.

import { groupKey } from './analytics'
import { sessionVolumeKg } from './sets'
import type { SessionLog } from '../storage/types'

/** "12.4k" / "1,284" — big totals, compact. */
export function compactNumber(v: number): string {
  const n = Math.round(v)
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${+(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-US')
}

const two = (n: number) => String(n).padStart(2, '0')

/** A date's local calendar day, YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/**
 * Minutes a session took, or null when the times don't describe a sitting
 * (older sessions finished hours or days after training).
 */
export function sessionDurationMin(session: SessionLog): number | null {
  if (!session.completedAt) return null
  const min = Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60_000)
  return min >= 1 && min <= 240 ? min : null
}

/** Completed sessions of one local month (`month` 0–11), newest first. */
export function monthSessions(sessions: SessionLog[], year: number, month: number): SessionLog[] {
  return sessions
    .filter((s) => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
}

export interface MonthRecap {
  /** Distinct workouts (parts of a split count once). */
  workouts: number
  sets: number
  volumeKg: number
  prs: number
  /** Days of the month (1–31) with a session, mapped to that day's latest one. */
  days: Map<number, SessionLog>
}

export function monthRecap(sessions: SessionLog[], year: number, month: number): MonthRecap {
  const inMonth = monthSessions(sessions, year, month)
  const days = new Map<number, SessionLog>()
  let sets = 0
  let volume = 0
  let prs = 0
  for (const s of inMonth) {
    const day = new Date(s.completedAt!).getDate()
    if (!days.has(day)) days.set(day, s) // newest first, so the first seen is the latest
    prs += s.prs?.length ?? 0
    volume += sessionVolumeKg(s)
    for (const e of s.exercises) sets += e.sets.filter((x) => x.done).length
  }
  return {
    workouts: new Set(inMonth.map(groupKey)).size,
    sets,
    volumeKg: Math.round(volume),
    prs,
    days,
  }
}

/** A month as rows of seven (Monday first): day numbers, null for the padding. */
export function calendarWeeks(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/**
 * The session moved to another local day (YYYY-MM-DD), same time of day: its
 * start, its end and its sets' time stamps all shift together. Unchanged for
 * a malformed date or a session not yet finished.
 */
export function moveSessionToDay(session: SessionLog, day: string): SessionLog {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m || !session.completedAt) return session
  const end = new Date(session.completedAt)
  const moved = new Date(end)
  moved.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const delta = moved.getTime() - end.getTime()
  if (!delta || Number.isNaN(delta)) return session
  const shift = (iso: string) => new Date(Date.parse(iso) + delta).toISOString()
  return {
    ...session,
    startedAt: shift(session.startedAt),
    completedAt: shift(session.completedAt),
    exercises: session.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => (s.at ? { ...s, at: shift(s.at) } : s)),
    })),
  }
}
