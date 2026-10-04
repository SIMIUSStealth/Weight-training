import { describe, it, expect } from 'vitest'
import {
  ROUTINE,
  addableForBlock,
  dayExercises,
  dayLabel,
  dayMuscles,
  defaultWeeklyPlan,
  getWeeklyPlan,
  muscleFrequency,
  planExercises,
  trainingDayCount,
} from './plan'
import type { DayPlan } from '../storage/types'

describe('weekly plan', () => {
  it('default = the full routine Mon/Wed/Fri (Wed leg day, Fri isolations)', () => {
    const plan = defaultWeeklyPlan()
    expect(plan).toHaveLength(7)
    expect(trainingDayCount(plan)).toBe(3)
    expect(plan[0].blocks).toEqual(ROUTINE)
    expect(plan[1].blocks).toHaveLength(0) // Tue rest
    expect(plan[2].blocks).toContain('leg-day')
    expect(plan[4].blocks).toContain('isolation')
  })

  it('runs the routine in order: pairs, then core', () => {
    expect(dayExercises(defaultWeeklyPlan()[0]).map((e) => e.id)).toEqual([
      'pull-up',
      'back-squat',
      'bench-press',
      'bench-dip',
      'deadlift',
      'cable-row',
      'machine-chest-press',
      'ab-wheel-rollout',
      'pallof-press',
      'back-extension',
    ])
  })

  it('derives only the chosen blocks', () => {
    const day: DayPlan = { blocks: ['pair-1', 'core'] }
    expect(dayExercises(day).map((e) => e.id)).toEqual([
      'pull-up',
      'back-squat',
      'bench-press',
      'ab-wheel-rollout',
      'pallof-press',
      'back-extension',
    ])
  })

  it('respects omit and add — extras sit next to their slot', () => {
    const day: DayPlan = {
      blocks: ['pair-1'],
      omit: ['pull'],
      add: ['incline-db-press', 'lat-pulldown'],
    }
    expect(dayExercises(day).map((e) => e.id)).toEqual([
      'back-squat',
      'bench-press',
      'incline-db-press', // extra, beside its slot
      'lat-pulldown', // extra from a block that's off — no other isolations
    ])
  })

  it('honours a global swap selection', () => {
    const ids = dayExercises({ blocks: ['pair-1'] }, { bench: 'db-bench-press' }).map(
      (e) => e.id,
    )
    expect(ids).toContain('db-bench-press')
    expect(ids).not.toContain('bench-press')
  })

  it('offers what a block can add', () => {
    const day: DayPlan = { blocks: ['isolation'] }
    const ids = addableForBlock('isolation', day).map((e) => e.id)
    expect(ids).toContain('biceps-curl') // the alternative to the Zottman
    expect(ids).not.toContain('zottman-curl') // already in the day
    expect(ids).not.toContain('bench-press') // another block
  })

  it('rest day has no exercises', () => {
    expect(dayExercises({ blocks: [] })).toEqual([])
    expect(dayLabel({ blocks: [] })).toBe('Rest day')
  })

  it('labels days by their blocks', () => {
    expect(dayLabel(defaultWeeklyPlan()[0])).toBe('Full routine')
    expect(dayLabel(defaultWeeklyPlan()[2])).toBe('Full routine · Leg day')
    expect(dayLabel({ blocks: ['core', 'pair-1'] })).toBe('Pair 1 · Core')
    expect(dayLabel({ blocks: ['pair-1', 'pair-2', 'pair-3', 'kb-core'] })).toBe(
      'Pair 1 · Pair 2 · Pair 3 · KB core',
    )
  })

  it('unions every exercise the plan can use, deduped', () => {
    const plan = defaultWeeklyPlan()
    plan[0].add = ['goblet-squat']
    const ids = planExercises(plan).map((e) => e.id)
    expect(ids).toContain('goblet-squat')
    expect(ids).toContain('hamstring-curl') // Wednesday's leg day
    expect(ids.filter((id) => id === 'bench-press')).toHaveLength(1) // 3 days, once
  })

  it('counts training days per muscle', () => {
    const freq = muscleFrequency(defaultWeeklyPlan())
    expect(freq.Chest).toBe(3)
    expect(freq.Back).toBe(3)
    expect(freq.Forearms).toBe(0)
    expect(dayMuscles({ blocks: ['core'] })).toEqual(['Core'])
  })

  it('replaces a pre-gym (muscle-group) plan with the gym week', () => {
    const old = Array.from({ length: 7 }, () => ({ muscles: ['Chest'] })) as never
    expect(getWeeklyPlan(old)).toEqual(defaultWeeklyPlan())
    expect(getWeeklyPlan(undefined)).toEqual(defaultWeeklyPlan())
  })

  it('drops unknown block ids from a stored plan', () => {
    const plan = defaultWeeklyPlan()
    plan[0] = { blocks: ['pair-1', 'cardio' as never] }
    expect(getWeeklyPlan(plan)[0].blocks).toEqual(['pair-1'])
  })
})
