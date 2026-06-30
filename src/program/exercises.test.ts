import { describe, it, expect } from 'vitest'
import {
  EXERCISES,
  SLOTS,
  getExercise,
  getProgram,
  getSlot,
  slotOptions,
} from './exercises'

describe('slots & program selection', () => {
  it('default program is the 11 base exercises, in slot order', () => {
    const prog = getProgram()
    expect(prog).toHaveLength(11)
    expect(prog.map((e) => e.id)).toEqual(EXERCISES.map((e) => e.id))
  })

  it('honours a valid selection but ignores an id from another slot', () => {
    // arm-biceps is the 5th slot (index 4)
    expect(getProgram({ 'arm-biceps': 'hammer-curl' })[4].id).toBe('hammer-curl')
    // plank belongs to ab-core, so it is rejected → base remains
    expect(getProgram({ 'arm-biceps': 'plank' })[4].id).toBe('biceps-curl')
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
