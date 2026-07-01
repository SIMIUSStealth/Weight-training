import { describe, it, expect } from 'vitest'
import {
  dayExercises,
  dayLabel,
  defaultWeeklyPlan,
  muscleFrequency,
  planExercises,
  trainingDayCount,
} from './plan'
import type { DayPlan } from '../storage/types'

describe('weekly plan', () => {
  it('default = full body Mon/Wed/Fri, rest otherwise', () => {
    const plan = defaultWeeklyPlan()
    expect(plan).toHaveLength(7)
    expect(trainingDayCount(plan)).toBe(3)
    expect(plan[0].muscles).toHaveLength(5) // Mon full body
    expect(plan[1].muscles).toHaveLength(0) // Tue rest
  })

  it('derives only the chosen muscles, in slot order', () => {
    const day: DayPlan = { muscles: ['Chest', 'Arms'] }
    expect(dayExercises(day).map((e) => e.id)).toEqual([
      'floor-press',
      'chest-flye',
      'biceps-curl',
      'triceps-extension',
    ])
  })

  it('respects omit and add', () => {
    const day: DayPlan = {
      muscles: ['Chest'],
      omit: ['chest-stretch'],
      add: ['squeeze-press'],
    }
    const ids = dayExercises(day).map((e) => e.id)
    expect(ids).toContain('floor-press')
    expect(ids).not.toContain('chest-flye') // omitted slot
    expect(ids).toContain('squeeze-press') // added extra
  })

  it('honours a global swap selection', () => {
    const ids = dayExercises({ muscles: ['Arms'] }, { 'arm-biceps': 'hammer-curl' }).map(
      (e) => e.id,
    )
    expect(ids).toContain('hammer-curl')
    expect(ids).not.toContain('biceps-curl')
  })

  it('rest day has no exercises', () => {
    expect(dayExercises({ muscles: [] })).toEqual([])
    expect(dayLabel({ muscles: [] })).toBe('Rest day')
  })

  it('labels days by their muscle groups', () => {
    expect(dayLabel({ muscles: ['Chest', 'Arms'] })).toBe('Chest · Arms')
    expect(dayLabel(defaultWeeklyPlan()[0])).toBe('Full body')
  })

  it('unions every exercise the plan can use, deduped', () => {
    const plan = defaultWeeklyPlan()
    plan[0].add = ['squeeze-press']
    const ids = planExercises(plan).map((e) => e.id)
    expect(ids).toContain('squeeze-press')
    expect(ids.filter((id) => id === 'floor-press')).toHaveLength(1) // 3 days, once
  })

  it('counts training days per muscle', () => {
    expect(muscleFrequency(defaultWeeklyPlan()).Chest).toBe(3)
  })
})
