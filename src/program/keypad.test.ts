import { describe, it, expect } from 'vitest'
import { padEntry, padPress, padValue, type PadKey } from './keypad'

const type = (keys: PadKey[], start = '', fresh = false) =>
  keys.reduce((e, k, i) => padPress(e, k, fresh && i === 0), start)

describe('weight keypad', () => {
  it('starts from the current weight and replaces it on the first key', () => {
    expect(padEntry(22.5)).toBe('22,5')
    expect(padEntry(-10)).toBe('-10')
    expect(type(['3', '2', ',', '5'], '30', true)).toBe('32,5')
    expect(type(['del'], '30', true)).toBe('')
  })

  it('types decimals with a comma, at most two places, no leading zeros', () => {
    expect(type([',', '5'])).toBe('0,5')
    expect(type(['1', ',', '2', '5', '5'])).toBe('1,25')
    expect(type(['1', ',', ','])).toBe('1,')
    expect(type(['0', '7'])).toBe('7')
    expect(type(['1', '2', '3', '4'])).toBe('123')
  })

  it('deletes the last character', () => {
    expect(type(['del'], '22,5')).toBe('22,')
    expect(type(['del', 'del', 'del', 'del'], '22,5')).toBe('')
  })

  it('flips the sign for the assisted machine', () => {
    expect(type(['sign'], '10')).toBe('-10')
    expect(type(['sign', 'sign'], '10')).toBe('10')
    expect(type(['5'], '-1')).toBe('-15')
    expect(type(['del'], '-1')).toBe('')
  })

  it('accepts only loads the equipment can take', () => {
    expect(padValue('32,5', 'machine')).toBe(32.5)
    expect(padValue('1,25', 'dumbbell')).toBe(1.25)
    expect(padValue('', 'machine')).toBeNull()
    expect(padValue('-', 'assisted')).toBeNull()
    expect(padValue('501', 'barbell')).toBeNull()
    expect(padValue('-15', 'assisted')).toBe(-15)
    expect(padValue('-15', 'bodyweight')).toBeNull()
    expect(padValue('7,', 'cable')).toBe(7)
  })
})
