import { describe, it, expect } from 'vitest'
import {
  weeklyVolume,
  volumeBand,
  weekStatuses,
  doneDaysThisWeek,
  weekStreak,
} from './analytics'
import { defaultWeeklyPlan } from './plan'
import type { DayPlan, SessionLog, SetLog } from '../storage/types'

const doneSets = (n: number): SetLog[] =>
  Array.from({ length: n }, () => ({ reps: 10, done: true }) as SetLog)

function thisWeekSession(exs: { id: string; sets: number }[], i = 0): SessionLog {
  const now = new Date().toISOString()
  return {
    id: `s-${now}-${i}`,
    startedAt: now,
    completedAt: now,
    exercises: exs.map((e) => ({
      exerciseId: e.id,
      weightKg: 8,
      sets: doneSets(e.sets),
    })),
  }
}

describe('weeklyVolume', () => {
  it('sums completed sets per muscle for the current week', () => {
    const sessions = [
      thisWeekSession(
        [
          { id: 'floor-press', sets: 3 },
          { id: 'chest-flye', sets: 3 },
          { id: 'biceps-curl', sets: 3 },
        ],
        0,
      ),
      thisWeekSession([{ id: 'floor-press', sets: 3 }], 1),
    ]
    const vol = weeklyVolume(sessions)
    expect(vol.find((v) => v.muscle === 'Chest')!.sets).toBe(9) // 3+3 + 3
    expect(vol.find((v) => v.muscle === 'Arms')!.sets).toBe(3)
    // Frequency counts logical workouts: two separate sessions = trained twice.
    expect(vol.find((v) => v.muscle === 'Chest')!.days).toBe(2)
  })

  it('ignores sessions before this week', () => {
    const old: SessionLog = {
      id: 'old',
      startedAt: '2020-01-01T00:00:00Z',
      completedAt: '2020-01-01T00:00:00Z',
      exercises: [{ exerciseId: 'floor-press', weightKg: 8, sets: doneSets(3) }],
    }
    expect(weeklyVolume([old]).find((v) => v.muscle === 'Chest')!.sets).toBe(0)
  })

  it('bands weekly sets into low / good / high', () => {
    expect(volumeBand(0)).toBe('low')
    expect(volumeBand(5)).toBe('low')
    expect(volumeBand(12)).toBe('good')
    expect(volumeBand(25)).toBe('high')
  })
})

describe('weekStatuses', () => {
  it('marks rest / todo / inprogress / done for the week', () => {
    const now = new Date().toISOString()
    const plan = defaultWeeklyPlan() // train Mon / Wed / Fri
    const active: SessionLog = {
      id: 'a',
      startedAt: now,
      weekday: 0,
      exercises: [],
    }
    const doneWed: SessionLog = {
      id: 'w',
      startedAt: now,
      completedAt: now,
      weekday: 2,
      exercises: [{ exerciseId: 'floor-press', weightKg: 8, sets: doneSets(1) }],
    }
    const st = weekStatuses(plan, [doneWed], active)
    expect(st[0].status).toBe('inprogress') // Mon active
    expect(st[1].status).toBe('rest') // Tue
    expect(st[2].status).toBe('done') // Wed completed
    expect(st[4].status).toBe('todo') // Fri planned, not done
    expect(doneDaysThisWeek([doneWed])).toBe(1)
  })

  it('an active session outranks rest — muscles toggled off mid-workout stay visible', () => {
    const now = new Date().toISOString()
    const plan = defaultWeeklyPlan()
    plan[0] = { muscles: [] } // Monday edited to rest while its session runs
    const active: SessionLog = { id: 'a', startedAt: now, weekday: 0, exercises: [] }
    expect(weekStatuses(plan, [], active)[0].status).toBe('inprogress')
  })

  it('falls back to the completion date for pre-update sessions without a weekday tag', () => {
    const now = new Date()
    const legacy: SessionLog = {
      id: 'old',
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      exercises: [{ exerciseId: 'floor-press', weightKg: 8, sets: doneSets(1) }],
    }
    const todayIdx = (now.getDay() + 6) % 7
    const plan = defaultWeeklyPlan()
    plan[todayIdx] = { muscles: ['Chest'] } // ensure today is a training day
    expect(doneDaysThisWeek([legacy])).toBe(1)
    expect(weekStatuses(plan, [legacy], null)[todayIdx].status).toBe('done')
  })
})

describe('weekStreak', () => {
  // A one-training-day plan (Monday) keeps the fixtures simple.
  const plan: DayPlan[] = [
    { muscles: ['Chest'] },
    { muscles: [] },
    { muscles: [] },
    { muscles: [] },
    { muscles: [] },
    { muscles: [] },
    { muscles: [] },
  ]

  /** A completed Monday-tagged session `weeksAgo` weeks back. */
  function mondaySession(weeksAgo: number): SessionLog {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * weeksAgo) // that week's Monday
    const iso = d.toISOString()
    return {
      id: `w${weeksAgo}`,
      startedAt: iso,
      completedAt: iso,
      weekday: 0,
      exercises: [{ exerciseId: 'floor-press', weightKg: 8, sets: doneSets(1) }],
    }
  }

  it('counts consecutive completed weeks, including this one once it hits target', () => {
    expect(weekStreak(plan, [mondaySession(0)])).toBe(1)
    expect(weekStreak(plan, [mondaySession(0), mondaySession(1)])).toBe(2)
  })

  it('an unfinished current week does not break the streak', () => {
    expect(weekStreak(plan, [mondaySession(1), mondaySession(2)])).toBe(2)
  })

  it('a missed week resets the streak', () => {
    // weeks 1 and 3 trained, week 2 missed → only last week counts
    expect(weekStreak(plan, [mondaySession(1), mondaySession(3)])).toBe(1)
  })

  it('no training days planned → no streak', () => {
    const rest: DayPlan[] = Array.from({ length: 7 }, () => ({ muscles: [] }))
    expect(weekStreak(rest, [mondaySession(0)])).toBe(0)
  })
})

describe('weeklyVolume frequency', () => {
  it('counts split parts as one workout', () => {
    const now = new Date().toISOString()
    const mk = (id: string): SessionLog => ({
      id,
      startedAt: now,
      completedAt: now,
      groupId: 'g1',
      weekday: 0,
      exercises: [{ exerciseId: 'floor-press', weightKg: 8, sets: doneSets(3) }],
    })
    const vol = weeklyVolume([mk('a'), mk('b')])
    const chest = vol.find((v) => v.muscle === 'Chest')!
    expect(chest.sets).toBe(6) // volume adds up
    expect(chest.days).toBe(1) // but it's one logical workout
  })
})
