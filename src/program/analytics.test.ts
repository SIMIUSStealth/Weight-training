import { describe, it, expect } from 'vitest'
import {
  weeklyVolume,
  volumeBand,
  weekStatuses,
  doneDaysThisWeek,
} from './analytics'
import { defaultWeeklyPlan } from './plan'
import type { SessionLog, SetLog } from '../storage/types'

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
    expect(vol.find((v) => v.muscle === 'Chest')!.days).toBe(1) // same day
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
})
