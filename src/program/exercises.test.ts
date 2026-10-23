import { describe, it, expect } from 'vitest'
import {
  AB_BLOCKS,
  ALL_EXERCISES,
  BLOCKS,
  EXERCISES_BY_ID,
  GYM_EXERCISES,
  SLOTS,
  blockFor,
  effectiveDef,
  getBlock,
  getExercise,
  getSlot,
  setScheme,
  slotFor,
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
    // the RDL moved to leg day, so an old Pair 2 swap to it falls back
    expect(selectedForSlot('hinge', { hinge: 'barbell-rdl' })).toBe('deadlift')
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

  it('every slot option exists, is a live gym exercise, and runs 3 sets', () => {
    for (const slot of SLOTS) {
      expect(slot.optionIds[0]).toBe(slot.baseId)
      expect(new Set(slot.optionIds).size).toBe(slot.optionIds.length)
      expect(BLOCKS.some((b) => b.id === slot.block)).toBe(true)
      for (const id of slot.optionIds) {
        const def = getExercise(id)
        expect(def.retired).toBeFalsy()
        expect(def.sets).toBe(3)
      }
    }
  })

  it('every gym exercise has a home slot that offers it, and every one is offered', () => {
    for (const def of GYM_EXERCISES) {
      expect(getSlot(def.id)?.optionIds, def.id).toContain(def.id)
    }
    const offered = new Set(SLOTS.flatMap((s) => s.optionIds))
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

  it('runs a fixed rep target as one number', () => {
    expect(setScheme(effectiveDef(getExercise('db-bench-press'), 'a-press'))).toBe('3 × 8')
    expect(setScheme(effectiveDef(getExercise('pallof-press'), 'b-core'))).toBe('3 × 10 · ea')
    expect(setScheme(effectiveDef(getExercise('lat-pulldown'), 'b-pull'))).toBe('3 × 8–10')
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

describe('Session A / B', () => {
  const lineup = (block: string) =>
    SLOTS.filter((s) => s.block === block).map((s) => {
      const def = effectiveDef(getExercise(s.baseId), s.id)
      return `${def.name} ${setScheme(def)}${def.restSeconds ? ` ${def.restSeconds}s` : ''}${
        s.optional ? ' (optional)' : ''
      }`
    })

  it('Session A: the program as written', () => {
    expect(lineup('session-a')).toEqual([
      'Single-Leg Leg Press 3 × 10 · ea 90s',
      'Pull-up 3 × 6–8 90s',
      'Dumbbell Bench Press 3 × 8 90s',
      'Dumbbell RDL 3 × 10 90s',
      'Close-Grip Cable Row 3 × 10 75s',
      'Abdominal Crunch Machine 3 × 10–12 60s',
      'Biceps Curl 2 × 8–12 · ea (optional)',
      'Cable Triceps Pushdown 2 × 8–12 (optional)',
    ])
  })

  it('Session B: the program as written', () => {
    expect(lineup('session-b')).toEqual([
      'Leg Press 3 × 10 90s',
      'Lat Pulldown 3 × 8–10 90s',
      'Shoulder Press 3 × 8 90s',
      'Back Extension 3 × 12 75s',
      'Dip 3 × 8 75s',
      'Pallof Press 3 × 10 · ea 60s',
      'Biceps Curl 2 × 8–12 · ea (optional)',
      'Cable Triceps Pushdown 2 × 8–12 (optional)',
    ])
  })

  it('starts from the stated loads', () => {
    const start = (id: string) => getExercise(id).startWeightKg
    expect(start('pull-up')).toBe(-14) // 14 kg assist
    expect(start('db-bench-press')).toBe(18)
    expect(start('cable-row')).toBe(35)
    expect(start('machine-ab-crunch')).toBe(50)
    expect(start('lat-pulldown')).toBe(40)
    expect(start('shoulder-press')).toBe(25)
    expect(start('dip')).toBe(-14)
  })

  it('every exercise can be swapped for a similar one — on other kit when it’s busy', () => {
    for (const slot of SLOTS.filter((s) => AB_BLOCKS.includes(s.block))) {
      expect(slot.optionIds.length, slot.id).toBeGreaterThanOrEqual(2)
      if (slot.optional) continue // the arm finisher: curls / pushdowns
      const kit = new Set(slotOptions(slot.id).map((d) => d.equipment))
      expect(kit.size, slot.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('a swap keeps the slot’s scheme; the exercise elsewhere keeps its own', () => {
    const press = effectiveDef(getExercise('machine-chest-press'), 'a-press')
    expect([press.sets, press.repMin, press.repMax, press.restSeconds]).toEqual([3, 8, 8, 90])
    expect(setScheme(effectiveDef(getExercise('machine-chest-press'), 'push'))).toBe('3 × 5–8')
    // A slot that doesn't offer the exercise changes nothing.
    expect(effectiveDef(getExercise('bench-press'), 'a-row')).toBe(getExercise('bench-press'))
    // Same pair, same object (safe for memos).
    expect(effectiveDef(getExercise('cable-row'), 'a-row')).toBe(
      effectiveDef(getExercise('cable-row'), 'a-row'),
    )
  })

  it('an exercise runs in the slot it was given, else its home', () => {
    expect(blockFor('pull-up', 'a-pull')?.id).toBe('session-a')
    expect(blockFor('pull-up')?.id).toBe('pair-1')
    expect(slotFor('pull-up', 'b-dip')?.id).toBe('pull') // b-dip doesn't offer it
    expect(BLOCKS.find((b) => b.id === 'session-a')?.alternate).toBe(false) // straight sets
  })
})
