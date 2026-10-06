import { describe, it, expect } from 'vitest'
import {
  ALL_EXERCISES,
  BLOCKS,
  EXERCISES_BY_ID,
  GYM_EXERCISES,
  SLOTS,
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
    expect(getBlock('db-bench-press')?.id).toBe('pair-1')
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

  it('mirrors the routine: compounds 3 × 5–8, core triplet 3 × 8–12, KB moves 30 s', () => {
    for (const slot of SLOTS) {
      for (const def of slotOptions(slot.id)) {
        if (slot.block.startsWith('pair')) expect([def.repMin, def.repMax]).toEqual([5, 8])
        if (slot.block === 'core') expect([def.repMin, def.repMax]).toEqual([8, 12])
        if (slot.block === 'kb-core') {
          expect(def.kind).toBe('time')
          expect(def.startSeconds).toBe(30)
        }
      }
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
