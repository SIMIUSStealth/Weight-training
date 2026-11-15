import { describe, expect, it } from 'vitest'
import {
  calendarWeeks,
  compactNumber,
  localDateKey,
  monthRecap,
  monthSessions,
  moveSessionToDay,
  sessionDurationMin,
} from './history'
import type { SessionLog } from '../storage/types'

// Built from local-time parts, so the tests hold in any time zone.
const local = (y: number, m: number, d: number, h = 18, min = 0) =>
  new Date(y, m, d, h, min).toISOString()

function sess(id: string, completedAt: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id,
    startedAt: new Date(Date.parse(completedAt) - 50 * 60_000).toISOString(),
    completedAt,
    exercises: [
      {
        exerciseId: 'bench-press',
        weightKg: 40,
        sets: [
          { reps: 8, done: true },
          { reps: 5, done: true, weightKg: 50 },
          { done: false },
        ],
      },
    ],
    ...extra,
  }
}

describe('compactNumber', () => {
  it('keeps small totals whole and shortens big ones', () => {
    expect(compactNumber(1284)).toBe('1,284')
    expect(compactNumber(12_449)).toBe('12.4k')
    expect(compactNumber(1_240_000)).toBe('1.2M')
  })
})

describe('sessionDurationMin', () => {
  it('is the minutes between start and finish', () => {
    expect(sessionDurationMin(sess('a', local(2026, 10, 9)))).toBe(50)
  })

  it('is unknown for a session left open for days, or one not finished', () => {
    const stale = sess('a', local(2026, 10, 11), { startedAt: local(2026, 10, 9, 6) })
    expect(sessionDurationMin(stale)).toBeNull()
    expect(sessionDurationMin({ ...sess('b', local(2026, 10, 9)), completedAt: undefined })).toBeNull()
  })
})

describe('a month of history', () => {
  const sessions = [
    sess('oct', local(2026, 9, 30)),
    sess('nov-a', local(2026, 10, 9), { groupId: 'g', part: 1 }),
    sess('nov-b', local(2026, 10, 9, 20), { groupId: 'g', part: 2, prs: [{ exerciseId: 'bench-press', kind: 'reps', value: 8 }] }),
    sess('nov-c', local(2026, 10, 11)),
    { ...sess('open', local(2026, 10, 12)), completedAt: undefined },
  ]

  it('lists the month newest first', () => {
    expect(monthSessions(sessions, 2026, 10).map((s) => s.id)).toEqual(['nov-c', 'nov-b', 'nov-a'])
    expect(monthSessions(sessions, 2026, 11)).toEqual([])
  })

  it('recaps it: split parts are one workout, each day opens its latest session', () => {
    const r = monthRecap(sessions, 2026, 10)
    expect(r.workouts).toBe(2)
    expect(r.sets).toBe(6)
    expect(r.volumeKg).toBe(3 * (8 * 40 + 5 * 50))
    expect(r.prs).toBe(1)
    expect([...r.days.keys()].sort((a, b) => a - b)).toEqual([9, 11])
    expect(r.days.get(9)!.id).toBe('nov-b')
  })
})

describe('calendarWeeks', () => {
  it('lays a month out Monday-first with padding', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = calendarWeeks(2026, 10)
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1])
    expect(weeks[1][0]).toBe(2)
    expect(weeks.at(-1)).toEqual([30, null, null, null, null, null, null])
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    // February 2027 starts on a Monday: exactly four rows.
    expect(calendarWeeks(2027, 1)).toHaveLength(4)
  })
})

describe('moveSessionToDay', () => {
  it('shifts start, finish and set stamps together, keeping the time of day', () => {
    const s = sess('a', local(2026, 10, 11, 20, 7))
    s.exercises[0].sets[0].at = local(2026, 10, 11, 19, 40)
    const moved = moveSessionToDay(s, '2026-11-09')
    expect(localDateKey(new Date(moved.completedAt!))).toBe('2026-11-09')
    expect(new Date(moved.completedAt!).getHours()).toBe(20)
    expect(new Date(moved.completedAt!).getMinutes()).toBe(7)
    expect(sessionDurationMin(moved)).toBe(50)
    expect(localDateKey(new Date(moved.exercises[0].sets[0].at!))).toBe('2026-11-09')
    expect(moved.exercises[0].sets[1].at).toBeUndefined()
  })

  it('leaves the session alone for the same day or a bad date', () => {
    const s = sess('a', local(2026, 10, 11))
    expect(moveSessionToDay(s, '2026-11-11')).toBe(s)
    expect(moveSessionToDay(s, 'yesterday')).toBe(s)
  })
})
