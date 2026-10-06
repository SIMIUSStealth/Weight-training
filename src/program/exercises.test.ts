import { describe, it, expect } from 'vitest'
import {
  ALL_EXERCISES,
  BLOCKS,
  EXERCISES_BY_ID,
  GYM_EXERCISES,
  SLOTS,
  alternateGroupKey,
  getBlock,
  getExercise,
  getSlot,
  setScheme,
  slotOptions,
} from './exercises'
import { GUIDES } from './guides'
import { HOME_EXERCISES } from './home-exercises'
import { ladderFor, rungIndex } from './ladder'
import { selectedForSlot } from './plan'

describe('slots & program selection', () => {
  it('honours a valid selection but ignores an id from another slot', () => {
    expect(selectedForSlot('biceps', { biceps: 'biceps-curl' })).toBe('biceps-curl')
    // plank belongs to the kettlebell circuit, so it is rejected → base remains
    expect(selectedForSlot('biceps', { biceps: 'plank' })).toBe('zottman-curl')
    // a retired home exercise never fills a gym slot
    expect(selectedForSlot('biceps', { biceps: 'hammer-curl' })).toBe('zottman-curl')
    // no selection → the base exercise
    expect(selectedForSlot('bench')).toBe('bench-press')
  })

  it('formats the set scheme consistently', () => {
    expect(setScheme(getExercise('bench-press'))).toBe('3 × 5–8')
    expect(setScheme(getExercise('pallof-press'))).toBe('3 × 8–12 · ea')
    expect(setScheme(getExercise('plank'))).toBe('3 × hold')
    expect(setScheme(getExercise('kb-swing'))).toBe('3 × 30s')
  })

  it('getSlot, getBlock and slotOptions are consistent (base first)', () => {
    expect(getSlot('db-bench-press')?.id).toBe('bench')
    expect(getBlock('db-bench-press')?.id).toBe('day-a')
    const opts = slotOptions('bench').map((e) => e.id)
    expect(opts[0]).toBe('bench-press')
    expect(opts).toContain('incline-db-press')
    // retired home exercises have no slot in the gym routine
    expect(getSlot('floor-press')).toBeUndefined()
  })

  it('every slot option exists, points back at its slot, and runs 3 sets', () => {
    for (const slot of SLOTS) {
      expect(slot.optionIds[0]).toBe(slot.baseId)
      expect(BLOCKS.some((b) => b.id === slot.block)).toBe(true)
      for (const id of slot.optionIds) {
        const def = getExercise(id)
        expect(def.slot).toBe(slot.id)
        expect(def.retired).toBeFalsy()
        expect(def.sets).toBe(3)
      }
    }
  })

  it('every gym exercise fills exactly one slot', () => {
    const offered = SLOTS.flatMap((s) => s.optionIds)
    expect(new Set(offered).size).toBe(offered.length)
    expect([...offered].sort()).toEqual(GYM_EXERCISES.map((e) => e.id).sort())
  })

  it('every start load sits on its default ladder', () => {
    for (const def of GYM_EXERCISES) {
      expect(rungIndex(def.startWeightKg, ladderFor(def.equipment))).toBeGreaterThanOrEqual(0)
    }
  })

  it('ids are unique across gym and retired home exercises', () => {
    const ids = ALL_EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(HOME_EXERCISES.every((e) => e.retired)).toBe(true)
    // the home lifts that carried over into the gym keep their history
    for (const id of ['plank', 'biceps-curl', 'goblet-squat', 'bulgarian-split-squat']) {
      expect(getExercise(id).retired).toBeFalsy()
    }
  })

  it('builds every workout from three pairs of two', () => {
    for (const block of ['day-a', 'day-b', 'day-c'] as const) {
      const slots = SLOTS.filter((s) => s.block === block)
      expect(slots.map((s) => s.pair)).toEqual([1, 1, 2, 2, 3, 3])
    }
    // straight-set and circuit blocks are unpaired
    expect(SLOTS.filter((s) => s.block === 'extras' || s.block === 'kb-core').every((s) => !s.pair)).toBe(true)
  })

  it('alternates within a pair, never across pairs', () => {
    expect(alternateGroupKey('back-squat')).toBe(alternateGroupKey('pull-up'))
    expect(alternateGroupKey('back-squat')).not.toBe(alternateGroupKey('bench-press'))
    expect(alternateGroupKey('kb-halo')).toBe(alternateGroupKey('plank'))
    expect(alternateGroupKey('machine-calf-raise')).toBeUndefined()
  })

  it('starts the added machines at the loads you actually use', () => {
    expect(getExercise('leg-press')).toMatchObject({ startWeightKg: 130, equipment: 'machine' })
    expect(getExercise('pec-deck')).toMatchObject({ startWeightKg: 40, equipment: 'machine' })
    expect(getExercise('ab-machine')).toMatchObject({ startWeightKg: 55, equipment: 'machine' })
    // 35 kg of help on the assisted dip machine
    expect(getExercise('dip')).toMatchObject({ startWeightKg: -35, equipment: 'assisted' })
    // and the reps you do sit inside each range
    expect(getExercise('leg-press').repMin).toBeLessThanOrEqual(10)
    expect(getExercise('pec-deck').repMin).toBeLessThanOrEqual(8)
    expect(getExercise('ab-machine').repMin).toBeLessThanOrEqual(7)
  })

  it('kettlebell circuit moves are 30 s', () => {
    for (const def of SLOTS.filter((s) => s.block === 'kb-core').flatMap((s) => slotOptions(s.id))) {
      expect(def.kind).toBe('time')
      expect(def.startSeconds).toBe(30)
    }
  })
})

describe('exercise guides', () => {
  it('every gym exercise has a one-line description', () => {
    for (const def of GYM_EXERCISES) {
      expect(GUIDES[def.id]?.about, def.id).toBeTruthy()
    }
  })

  it('guides only name real exercises, and links are https with a source', () => {
    for (const [id, g] of Object.entries(GUIDES)) {
      expect(EXERCISES_BY_ID[id], id).toBeDefined()
      if (g.url) {
        expect(g.url.startsWith('https://'), id).toBe(true)
        expect(g.source, id).toBeTruthy()
      }
    }
  })
})
