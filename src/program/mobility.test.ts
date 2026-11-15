import { describe, expect, it } from 'vitest'
import { ROUTINES, exampleUrl } from './mobility'

describe('stretch & easy strength library', () => {
  it('has distinct routines, each short enough to actually do', () => {
    const ids = ROUTINES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of ROUTINES) {
      expect(r.moves.length, r.id).toBeGreaterThanOrEqual(4)
      expect(r.moves.length, r.id).toBeLessThanOrEqual(6)
      expect(r.minutes, r.id).toBeLessThanOrEqual(10)
      expect(r.about.length, r.id).toBeGreaterThan(20)
    }
  })

  it('opens on the back-of-the-knee routine, which carries a caution', () => {
    expect(ROUTINES[0].id).toBe('knee-back')
    expect(ROUTINES[0].caution).toMatch(/physio|GP/)
  })

  it('every move says how, how much and what it reaches, under its own id', () => {
    const moves = ROUTINES.flatMap((r) => r.moves)
    expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length)
    for (const m of moves) {
      expect(m.how.length, m.id).toBeGreaterThan(40)
      expect(m.dose, m.id).toMatch(/\d/)
      expect(m.target, m.id).toBeTruthy()
    }
  })

  it('links each move to a video search', () => {
    const move = ROUTINES[0].moves[0]
    expect(exampleUrl(move)).toBe(
      'https://www.youtube.com/results?search_query=gastrocnemius%20wall%20calf%20stretch',
    )
    expect(exampleUrl({ ...move, search: undefined })).toContain(encodeURIComponent(move.name))
  })
})
