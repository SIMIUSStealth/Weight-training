import { describe, it, expect } from 'vitest'
import {
  WORKOUTS,
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
  it('default = Workout A Mon, B Wed, C Fri', () => {
    const plan = defaultWeeklyPlan()
    expect(plan).toHaveLength(7)
    expect(trainingDayCount(plan)).toBe(3)
    expect(plan[0].blocks).toEqual(['day-a'])
    expect(plan[1].blocks).toHaveLength(0) // Tue rest
    expect(plan[2].blocks).toEqual(['day-b'])
    expect(plan[4].blocks).toEqual(['day-c'])
    expect(plan.flatMap((d) => d.blocks)).toEqual(WORKOUTS)
  })

  it('runs each workout as three pairs, six exercises', () => {
    const [mon, , wed, , fri] = defaultWeeklyPlan().map((d) => dayExercises(d).map((e) => e.id))
    expect(mon).toEqual([
      'back-squat',
      'pull-up',
      'bench-press',
      'cable-row',
      'hamstring-curl',
      'ab-machine',
    ])
    expect(wed).toEqual([
      'barbell-rdl',
      'lat-pulldown',
      'shoulder-press',
      'dip',
      'zottman-curl',
      'pallof-press',
    ])
    expect(fri).toEqual([
      'leg-press',
      'machine-row',
      'pec-deck',
      'cable-pushdown',
      'back-extension',
      'hanging-leg-raise',
    ])
  })

  it('every workout is full body: legs, a push, a pull and core', () => {
    for (const day of defaultWeeklyPlan().filter((d) => d.blocks.length)) {
      const muscles = dayMuscles(day)
      for (const m of ['Legs', 'Back', 'Chest', 'Core'] as const) expect(muscles).toContain(m)
    }
  })

  it('respects omit and add — extras sit next to their slot', () => {
    const day: DayPlan = {
      blocks: ['day-a'],
      omit: ['pull'],
      add: ['incline-db-press', 'machine-calf-raise'],
    }
    expect(dayExercises(day).map((e) => e.id)).toEqual([
      'back-squat',
      'bench-press',
      'incline-db-press', // extra, beside its slot
      'cable-row',
      'hamstring-curl',
      'ab-machine',
      'machine-calf-raise', // from a block that's off — rides along alone
    ])
  })

  it('honours a global swap selection', () => {
    const ids = dayExercises({ blocks: ['day-a'] }, { bench: 'db-bench-press' }).map(
      (e) => e.id,
    )
    expect(ids).toContain('db-bench-press')
    expect(ids).not.toContain('bench-press')
  })

  it('offers what a block can add', () => {
    const day: DayPlan = { blocks: ['day-b'] }
    const ids = addableForBlock('day-b', day).map((e) => e.id)
    expect(ids).toContain('biceps-curl') // the alternative to the Zottman
    expect(ids).toContain('deadlift') // the alternative to the RDL
    expect(ids).not.toContain('zottman-curl') // already in the day
    expect(ids).not.toContain('bench-press') // another block
  })

  it('rest day has no exercises', () => {
    expect(dayExercises({ blocks: [] })).toEqual([])
    expect(dayLabel({ blocks: [] })).toBe('Rest day')
  })

  it('labels days by their blocks', () => {
    expect(dayLabel(defaultWeeklyPlan()[0])).toBe('Workout A · Squat & Bench')
    expect(dayLabel(defaultWeeklyPlan()[4])).toBe('Workout C · Leg Press & Chest')
    expect(dayLabel({ blocks: ['extras', 'day-b'] })).toBe('Workout B · Extras')
  })

  it('unions every exercise the plan can use, deduped', () => {
    const plan = defaultWeeklyPlan()
    plan[0].add = ['goblet-squat']
    plan[2].add = ['goblet-squat']
    const ids = planExercises(plan).map((e) => e.id)
    expect(ids.filter((id) => id === 'goblet-squat')).toHaveLength(1)
    expect(ids).toHaveLength(19) // 3 × 6 + the extra
  })

  it('counts training days per muscle', () => {
    const freq = muscleFrequency(defaultWeeklyPlan())
    expect(freq.Legs).toBe(3)
    expect(freq.Chest).toBe(3)
    expect(freq.Back).toBe(3)
    expect(freq.Core).toBe(3)
    expect(freq.Forearms).toBe(0)
    expect(dayMuscles({ blocks: ['extras'] })).toEqual(['Chest', 'Legs'])
  })

  it('replaces a pre-gym (muscle-group) plan with the gym week', () => {
    const old = Array.from({ length: 7 }, () => ({ muscles: ['Chest'] })) as never
    expect(getWeeklyPlan(old)).toEqual(defaultWeeklyPlan())
    expect(getWeeklyPlan(undefined)).toEqual(defaultWeeklyPlan())
  })

  it('drops unknown block ids from a stored plan', () => {
    const plan = defaultWeeklyPlan()
    plan[0] = { blocks: ['day-a', 'pair-1' as never] }
    expect(getWeeklyPlan(plan)[0].blocks).toEqual(['day-a'])
  })
})
