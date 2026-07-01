import { describe, it, expect } from 'vitest'
import { SLOTS, getExercise, getSlot, setScheme, slotOptions } from './exercises'
import { selectedForSlot } from './plan'

describe('slots & program selection', () => {
  it('honours a valid selection but ignores an id from another slot', () => {
    expect(selectedForSlot('arm-biceps', { 'arm-biceps': 'hammer-curl' })).toBe(
      'hammer-curl',
    )
    // plank belongs to ab-core, so it is rejected → base remains
    expect(selectedForSlot('arm-biceps', { 'arm-biceps': 'plank' })).toBe(
      'biceps-curl',
    )
    // no selection → the base exercise
    expect(selectedForSlot('chest-press')).toBe('floor-press')
  })

  it('formats the set scheme consistently', () => {
    expect(setScheme(getExercise('floor-press'))).toBe('3 × 8–12 · ea')
    expect(setScheme(getExercise('triceps-extension'))).toBe('3 × 8–12')
    expect(setScheme(getExercise('plank'))).toBe('3 × hold')
  })

  it('getSlot and slotOptions are consistent (base first)', () => {
    const slot = getSlot('hammer-curl')
    expect(slot?.id).toBe('arm-biceps')
    const opts = slotOptions('arm-biceps').map((e) => e.id)
    expect(opts[0]).toBe('biceps-curl')
    expect(opts).toContain('hammer-curl')
  })

  it('every option in a slot matches the base kind and slot (structure intact)', () => {
    for (const slot of SLOTS) {
      const base = getExercise(slot.baseId)
      expect(slot.optionIds[0]).toBe(slot.baseId)
      for (const id of slot.optionIds) {
        const def = getExercise(id)
        expect(def.slot).toBe(slot.id)
        expect(def.kind).toBe(base.kind) // time slots stay time, rep slots stay reps
        expect(def.sets).toBe(3)
        expect(def.muscle).toBe(base.muscle)
      }
    }
  })
})
