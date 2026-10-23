import { describe, it, expect } from 'vitest'
import {
  ROUTINE,
  abProgramWeek,
  addableForBlock,
  dayEntries,
  dayExercises,
  dayLabel,
  dayMuscles,
  defaultWeeklyPlan,
  getWeeklyPlan,
  muscleFrequency,
  planExercises,
  planSlotFor,
  trainingDayCount,
} from './plan'
import type { DayPlan, SessionLog } from '../storage/types'

describe('weekly plan', () => {
  it('default = Session A Mon, Session B Wed, the full routine + isolations Fri', () => {
    const plan = defaultWeeklyPlan()
    expect(plan).toHaveLength(7)
    expect(trainingDayCount(plan)).toBe(3)
    expect(plan[0].blocks).toEqual(['session-a'])
    expect(plan[1].blocks).toHaveLength(0) // Tue rest
    expect(plan[2].blocks).toEqual(['session-b'])
    expect(plan[4].blocks).toEqual([...ROUTINE, 'isolation'])
  })

  it('Monday runs Session A and Wednesday Session B, in the program’s order', () => {
    const [mon, , wed] = defaultWeeklyPlan()
    expect(dayEntries(mon).map((e) => `${e.def.id}@${e.slotId}`)).toEqual([
      'single-leg-leg-press@a-legs',
      'pull-up@a-pull',
      'db-bench-press@a-press',
      'db-rdl@a-hinge',
      'cable-row@a-row',
      'machine-ab-crunch@a-abs',
      'biceps-curl@a-biceps',
      'cable-pushdown@a-triceps',
    ])
    expect(dayExercises(wed).map((e) => e.id)).toEqual([
      'leg-press',
      'lat-pulldown',
      'shoulder-press',
      'back-extension',
      'dip',
      'pallof-press',
      'biceps-curl',
      'cable-pushdown',
    ])
  })

  it('a session swap is per slot: Session A’s pull leaves Session B alone', () => {
    const [mon, , wed] = defaultWeeklyPlan()
    const program = { 'a-pull': 'lat-pulldown', 'b-pull': 'pull-up' }
    expect(dayExercises(mon, program).map((e) => e.id)).toContain('lat-pulldown')
    expect(dayExercises(wed, program).map((e) => e.id)).toContain('pull-up')
    // The pairs' own pull slot still runs the pull-up.
    expect(dayExercises({ blocks: ['pair-1'] }, program)[0].id).toBe('pull-up')
  })

  it('an extra lands in the session that offers it, beside its slot', () => {
    const day: DayPlan = { blocks: ['session-a'], add: ['zottman-curl'] }
    const entries = dayEntries(day)
    const z = entries.find((e) => e.def.id === 'zottman-curl')!
    expect(z).toMatchObject({ slotId: 'a-biceps', added: true })
    expect(entries.map((e) => e.def.id).slice(-3)).toEqual([
      'biceps-curl',
      'zottman-curl',
      'cable-pushdown',
    ])
    // Its home block (isolations) isn't on, and isn't needed.
    expect(addableForBlock('session-a', day).map((o) => o.def.id)).not.toContain('zottman-curl')
    // With isolations on too, it stays in its own block.
    const both = dayEntries({ blocks: ['session-a', 'isolation'], add: ['face-pull'] })
    expect(both.find((e) => e.def.id === 'face-pull')?.slotId).toBe('rear-delts')
    const curls = dayEntries({ blocks: ['session-a', 'isolation'], omit: ['biceps'], add: ['zottman-curl'] })
    expect(curls.find((e) => e.def.id === 'zottman-curl')?.slotId).toBe('biceps')
  })

  it('an exercise’s page follows the slot the week runs it in', () => {
    const plan = defaultWeeklyPlan()
    expect(planSlotFor('pull-up', plan)?.id).toBe('a-pull') // Monday first
    expect(planSlotFor('lat-pulldown', plan)?.id).toBe('b-pull')
    expect(planSlotFor('t-bar-row', plan)?.id).toBe('row') // unused → home
  })

  it('runs the routine in order: pairs, then core', () => {
    expect(dayExercises({ blocks: ROUTINE }).map((e) => e.id)).toEqual([
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
    const ids = addableForBlock('isolation', day).map((o) => o.def.id)
    expect(ids).toContain('biceps-curl') // the alternative to the Zottman
    expect(ids).not.toContain('zottman-curl') // already in the day
    expect(ids).not.toContain('bench-press') // another block
  })

  it('add-ons (face pull, crunches) only appear when added', () => {
    const day: DayPlan = { blocks: ['isolation', 'core'] }
    const ids = dayExercises(day).map((e) => e.id)
    expect(ids).not.toContain('face-pull')
    expect(ids).not.toContain('machine-ab-crunch')
    expect(addableForBlock('isolation', day).map((o) => o.def.id)).toContain('face-pull')
    expect(addableForBlock('core', day).map((o) => o.def.id)).toEqual([
      'machine-ab-crunch',
      'machine-ab-crunch-feet-anchored',
    ])
    const added = dayExercises({ ...day, add: ['machine-ab-crunch-feet-anchored', 'face-pull'] })
    expect(added.map((e) => e.id).slice(-5)).toEqual([
      'face-pull', // after the lats slot
      'ab-wheel-rollout',
      'pallof-press',
      'back-extension',
      'machine-ab-crunch-feet-anchored', // after the core triplet
    ])
  })

  it('leg day opens with the leg press, then the RDL', () => {
    const ids = dayExercises({ blocks: ['leg-day'] }).map((e) => e.id)
    expect(ids).toEqual([
      'leg-press',
      'barbell-rdl',
      'hamstring-curl',
      'leg-extension',
      'bulgarian-split-squat',
      'machine-calf-raise',
    ])
    expect(dayExercises(defaultWeeklyPlan()[2]).map((e) => e.id)).toContain('leg-press')
  })

  it('rest day has no exercises', () => {
    expect(dayExercises({ blocks: [] })).toEqual([])
    expect(dayLabel({ blocks: [] })).toBe('Rest day')
  })

  it('labels days by their blocks', () => {
    expect(dayLabel(defaultWeeklyPlan()[0])).toBe('Session A')
    expect(dayLabel(defaultWeeklyPlan()[2])).toBe('Session B')
    expect(dayLabel(defaultWeeklyPlan()[4])).toBe('Full routine · Isolations')
    expect(dayLabel({ blocks: [...ROUTINE, 'leg-day'] })).toBe('Full routine · Leg day')
    expect(dayLabel({ blocks: ['core', 'pair-1'] })).toBe('Pair 1 · Core')
    expect(dayLabel({ blocks: ['pair-1', 'pair-2', 'pair-3', 'kb-core'] })).toBe(
      'Pair 1 · Pair 2 · Pair 3 · KB core',
    )
  })

  it('unions every exercise the plan can use, deduped', () => {
    const plan = defaultWeeklyPlan()
    plan[0].add = ['goblet-squat']
    plan[2] = { blocks: [...ROUTINE, 'leg-day'] }
    const ids = planExercises(plan).map((e) => e.id)
    expect(ids).toContain('goblet-squat')
    expect(ids).toContain('hamstring-curl') // Wednesday's leg day
    expect(ids.filter((id) => id === 'bench-press')).toHaveLength(1) // 2 days, once
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

describe('A/B program week', () => {
  const ab = (startedAt: string): SessionLog => ({
    id: startedAt,
    startedAt,
    completedAt: startedAt,
    exercises: [{ exerciseId: 'pull-up', slot: 'a-pull', weightKg: -14, sets: [] }],
  })
  const pairs: SessionLog = {
    id: 'p',
    startedAt: '2026-09-01T10:00:00',
    completedAt: '2026-09-01T11:00:00',
    exercises: [{ exerciseId: 'pull-up', weightKg: 0, sets: [] }], // no slot → home (Pair 1)
  }

  it('is week 1 until the first Session A or B', () => {
    expect(abProgramWeek([], new Date('2026-10-26T12:00:00'))).toBe(1)
    expect(abProgramWeek([pairs], new Date('2026-10-26T12:00:00'))).toBe(1)
  })

  it('counts whole weeks from the day of the first A/B workout', () => {
    const first = ab('2026-10-26T18:00:00') // a Monday evening
    const at = (d: string) => abProgramWeek([pairs, first, ab('2026-11-04T18:00:00')], new Date(d))
    expect(at('2026-10-26T20:00:00')).toBe(1)
    expect(at('2026-11-01T09:00:00')).toBe(1) // Sunday, day 6
    expect(at('2026-11-02T07:00:00')).toBe(2) // next Monday morning
    expect(at('2026-11-30T12:00:00')).toBe(6) // the optional lighter week
  })
})
