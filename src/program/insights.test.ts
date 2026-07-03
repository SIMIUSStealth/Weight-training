import { describe, it, expect } from 'vitest'
import {
  fourWeekCompare,
  lifetimeStats,
  longestWeekStreak,
  strengthGains,
  urgencies,
} from './insights'
import { defaultWeeklyPlan } from './plan'
import type { DayPlan, SessionLog, SetLog } from '../storage/types'

const reps = (...rs: number[]): SetLog[] => rs.map((r) => ({ reps: r, done: true }))

function sess(
  id: string,
  when: Date,
  exerciseId: string,
  weightKg: number,
  sets: SetLog[],
  extra: Partial<SessionLog> = {},
): SessionLog {
  const iso = when.toISOString()
  return {
    id,
    startedAt: iso,
    completedAt: iso,
    exercises: [{ exerciseId, weightKg, sets }],
    ...extra,
  }
}

function daysAgo(n: number, from: Date): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d
}

const NOW = new Date('2026-07-02T12:00:00') // a Thursday

describe('lifetimeStats', () => {
  it('sums workouts (split-aware), sets, volume, and PRs', () => {
    const a = sess('a', daysAgo(3, NOW), 'floor-press', 8, reps(10, 10), {
      groupId: 'g1',
      prs: [{ exerciseId: 'floor-press', kind: 'reps', value: 10 }],
    })
    const b = sess('b', daysAgo(3, NOW), 'biceps-curl', 8, reps(10), { groupId: 'g1' })
    const stats = lifetimeStats([a, b])
    expect(stats.workouts).toBe(1) // same group
    expect(stats.sets).toBe(3)
    expect(stats.volumeKg).toBe(8 * 10 * 3)
    expect(stats.prs).toBe(1)
  })
})

describe('fourWeekCompare', () => {
  it('splits volume/workouts into recent vs previous 4-week windows', () => {
    const recent = sess('r', daysAgo(5, NOW), 'floor-press', 10, reps(10))
    const prev = sess('p', daysAgo(35, NOW), 'floor-press', 10, reps(20))
    const c = fourWeekCompare([recent, prev], NOW)
    expect(c.volumeKg).toBe(100)
    expect(c.prevVolumeKg).toBe(200)
    expect(c.workouts).toBe(1)
    expect(c.prevWorkouts).toBe(1)
  })
})

describe('strengthGains', () => {
  it('compares first-session est. 1RM to the recent best', () => {
    const s1 = sess('1', daysAgo(30, NOW), 'floor-press', 8, reps(8))
    const s2 = sess('2', daysAgo(3, NOW), 'floor-press', 9, reps(10))
    const [g] = strengthGains([s1, s2], ['floor-press'])
    expect(g.exerciseId).toBe('floor-press')
    expect(g.recentRM).toBeGreaterThan(g.firstRM)
    expect(g.pct).toBeGreaterThan(0)
  })

  it('needs at least two sessions', () => {
    const s1 = sess('1', daysAgo(3, NOW), 'floor-press', 8, reps(8))
    expect(strengthGains([s1], ['floor-press'])).toEqual([])
  })
})

describe('longestWeekStreak', () => {
  const monPlan: DayPlan[] = [
    { muscles: ['Chest'] },
    ...Array.from({ length: 6 }, () => ({ muscles: [] as never[] })),
  ]
  function monday(weeksAgo: number): Date {
    const d = new Date(NOW)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * weeksAgo)
    return d
  }
  it('finds the best historical run even if the current streak is broken', () => {
    const s = (w: number) =>
      sess(`w${w}`, monday(w), 'floor-press', 8, reps(8), { weekday: 0 })
    // weeks 5,4,3 hit; week 2 missed; week 1 hit; current week not yet
    const hist = [s(5), s(4), s(3), s(1)]
    expect(longestWeekStreak(monPlan, hist, NOW)).toBe(3)
  })
})

describe('urgencies', () => {
  const plan = defaultWeeklyPlan() // Mon/Wed/Fri full body
  const noProgress = {}

  it('flags a week that can no longer hit its target', () => {
    // Saturday, nothing trained: 3 remaining > 2 days left
    const sat = new Date('2026-07-04T12:00:00')
    const out = urgencies(plan, [], noProgress, [], sat)
    expect(out.some((u) => u.kind === 'cant-hit-week')).toBe(true)
  })

  it('flags a tight week (no slack) rather than a lost one', () => {
    // Friday, nothing trained: 3 remaining == 3 days left
    const fri = new Date('2026-07-03T12:00:00')
    const out = urgencies(plan, [], noProgress, [], fri)
    expect(out.some((u) => u.kind === 'tight-week')).toBe(true)
    expect(out.some((u) => u.kind === 'cant-hit-week')).toBe(false)
  })

  it('flags a training gap of 4+ days with the next planned day', () => {
    const last = sess('l', daysAgo(5, NOW), 'floor-press', 8, reps(8), { weekday: 0 })
    const out = urgencies(plan, [last], noProgress, [], NOW)
    const gap = out.find((u) => u.kind === 'gap')
    expect(gap).toBeTruthy()
    expect(gap!.message).toMatch(/5 days/)
  })

  it('flags stalled lifts via the progression engine', () => {
    const mk = (id: string, d: number) =>
      sess(id, daysAgo(d, NOW), 'biceps-curl', 8, reps(10, 9, 9))
    const sessions = [mk('a', 8), mk('b', 5), mk('c', 2)]
    const progress = {
      'biceps-curl': { exerciseId: 'biceps-curl', currentWeightKg: 8 },
    }
    const out = urgencies(plan, sessions, progress, ['biceps-curl'], NOW)
    const stalled = out.find((u) => u.kind === 'stalled')
    expect(stalled?.exerciseId).toBe('biceps-curl')
  })

  it('flags a muscle untrained for 10+ days (but not never-trained ones)', () => {
    const chest = sess('c', daysAgo(2, NOW), 'floor-press', 8, reps(8))
    const forearmsOld = sess('f', daysAgo(12, NOW), 'wrist-curl', 4.5, reps(12))
    const out = urgencies(plan, [chest, forearmsOld], noProgress, [], NOW)
    expect(out.some((u) => u.kind === 'neglected' && /Forearms/.test(u.message))).toBe(true)
    expect(out.some((u) => /Abs/.test(u.message))).toBe(false) // never trained
  })
})
