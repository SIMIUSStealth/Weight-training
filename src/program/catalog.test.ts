import { describe, expect, it } from 'vitest'
import { addableToWorkout, matchesSearch, pickerGroups } from './catalog'
import { GYM_EXERCISES, MUSCLE_ORDER } from './exercises'
import type { ExerciseLog } from '../storage/types'

const log = (exerciseId: string, slot?: string): ExerciseLog => ({
  exerciseId,
  slot,
  weightKg: 10,
  sets: [{ done: false }],
})
const sessionA = [log('pull-up', 'a-pull'), log('biceps-curl', 'a-biceps')]
const find = (list: ReturnType<typeof addableToWorkout>, id: string) =>
  list.find((e) => e.def.id === id)

describe('addableToWorkout', () => {
  it('lists every other gym exercise exactly once', () => {
    const list = addableToWorkout(sessionA)
    const ids = list.map((e) => e.def.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('pull-up')
    expect(ids).not.toContain('biceps-curl')
    expect(ids).toHaveLength(GYM_EXERCISES.length - 2)
    expect(list.every((e) => !e.def.retired)).toBe(true)
  })

  it('slots an exercise into the block the workout is running, else its home slot', () => {
    const inA = addableToWorkout(sessionA)
    expect(find(inA, 'db-shrug')!.slot.id).toBe('a-traps') // Session A's shrug
    expect(find(inA, 'lat-pulldown')!.slot.id).toBe('a-pull') // Session A's pull swap
    expect(find(inA, 'face-pull')!.slot.id).toBe('rear-delts') // not a Session A lift
    const pairs = addableToWorkout([log('cable-row')])
    expect(find(pairs, 'db-shrug')!.slot.id).toBe('traps')
    expect(find(pairs, 'lat-pulldown')!.slot.id).toBe('lats')
  })
})

describe('searching the picker', () => {
  const list = addableToWorkout([])
  const names = (query: string) =>
    pickerGroups(list, query).flatMap((g) => g.entries.map((e) => e.def.name))

  it('matches every word typed, at the start of a word, ignoring case and punctuation', () => {
    expect(names('shrug')).toEqual(['Barbell Shrug', 'Dumbbell Shrug'])
    expect(names('PULL up')).toEqual(['Pull-up'])
    expect(names('  ')).toHaveLength(list.length)
    expect(names('zzz')).toEqual([])
    // "row" must start a word: no "th-row", "g-row-th" style accidents.
    expect(names('row').every((n) => / row/i.test(` ${n}`))).toBe(true)
  })

  it('finds by muscle, kit and the usual abbreviation', () => {
    expect(names('legs').length).toBeGreaterThan(3)
    expect(names('kettle').length).toBeGreaterThan(3)
    expect(names('db bench')).toContain('Dumbbell Bench Press')
    expect(names('cable fly').every((n) => /cable fly/i.test(n))).toBe(true)
    expect(matchesSearch(find(list, 'face-pull')!, 'shoulders')).toBe(true)
  })
})

describe('pickerGroups', () => {
  const list = addableToWorkout([])

  it('groups by muscle in the usual order, by name within, with no empty groups', () => {
    const groups = pickerGroups(list)
    const order = groups.map((g) => g.muscle)
    expect(order).toEqual(MUSCLE_ORDER.filter((m) => order.includes(m)))
    expect(order).not.toContain('Forearms') // home-era only: nothing to add
    for (const g of groups) {
      const sorted = [...g.entries].sort((a, b) => a.def.name.localeCompare(b.def.name))
      expect(g.entries).toEqual(sorted)
      expect(g.entries.every((e) => e.def.muscle === g.muscle)).toBe(true)
    }
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(list.length)
  })

  it('narrows to one muscle, combined with the search', () => {
    expect(pickerGroups(list, '', 'Arms').map((g) => g.muscle)).toEqual(['Arms'])
    const curls = pickerGroups(list, 'curl', 'Arms').flatMap((g) => g.entries.map((e) => e.def.name))
    expect(curls).toEqual(['Biceps Curl', 'Zottman Curl'])
    expect(pickerGroups(list, 'curl', 'Chest')).toEqual([])
  })
})
