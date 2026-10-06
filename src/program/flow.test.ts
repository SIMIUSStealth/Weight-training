import { describe, it, expect } from 'vitest'
import { alternatingGroup, groupRound, nextExerciseIndex } from './flow'
import type { ExerciseLog } from '../storage/types'

// A session: Workout A's first two pairs, a straight-set extra, then three
// kettlebell circuit moves (one alternating group across the whole block).
const IDS = [
  'back-squat',
  'pull-up',
  'bench-press',
  'cable-row',
  'machine-calf-raise',
  'kb-halo',
  'kb-swing',
  'plank',
]

function sessionWith(done: Record<string, number> = {}): ExerciseLog[] {
  return IDS.map((exerciseId) => ({
    exerciseId,
    weightKg: 0,
    sets: [0, 1, 2].map((i) => ({ done: i < (done[exerciseId] ?? 0) })),
  }))
}

describe('alternating groups', () => {
  it('groups each pair on its own, and an unpaired circuit as a whole', () => {
    const s = sessionWith()
    expect(alternatingGroup(s, 0)).toEqual([0, 1]) // pair 1
    expect(alternatingGroup(s, 1)).toEqual([0, 1])
    expect(alternatingGroup(s, 2)).toEqual([2, 3]) // pair 2 — not merged with pair 1
    expect(alternatingGroup(s, 4)).toBeNull() // extras are straight sets
    expect(alternatingGroup(s, 7)).toEqual([5, 7]) // kettlebell circuit
  })

  it('a lone member of a pair is just straight sets', () => {
    const lone: ExerciseLog[] = [{ exerciseId: 'pull-up', weightKg: 0, sets: [] }]
    expect(alternatingGroup(lone, 0)).toBeNull()
  })
})

describe('nextExerciseIndex', () => {
  it('rotates through a pair round by round', () => {
    expect(nextExerciseIndex(sessionWith({ 'back-squat': 1 }), 0)).toBe(1)
    expect(nextExerciseIndex(sessionWith({ 'back-squat': 1, 'pull-up': 1 }), 1)).toBe(0)
  })

  it('rotates through a circuit round by round', () => {
    expect(nextExerciseIndex(sessionWith({ 'kb-halo': 1, 'kb-swing': 1 }), 6)).toBe(7)
    expect(
      nextExerciseIndex(sessionWith({ 'kb-halo': 1, 'kb-swing': 1, plank: 1 }), 7),
    ).toBe(5)
  })

  it('skips members that are finished', () => {
    const s = sessionWith({ 'back-squat': 2, 'pull-up': 3 })
    expect(nextExerciseIndex(s, 1)).toBe(0)
  })

  it('leaves the pair once both are done', () => {
    const s = sessionWith({ 'back-squat': 3, 'pull-up': 3 })
    expect(nextExerciseIndex(s, 1)).toBe(2)
  })

  it('never traps you: browsing past a pair without logging moves on', () => {
    const s = sessionWith()
    expect(nextExerciseIndex(s, 0)).toBe(1)
    expect(nextExerciseIndex(s, 1)).toBe(2) // no set logged on the pull-up → no wrap
  })

  it('straight-set exercises go in order; the end of the session is null', () => {
    const s = sessionWith()
    expect(nextExerciseIndex(s, 4)).toBe(5)
    const finished = sessionWith({ 'kb-halo': 3, 'kb-swing': 3, plank: 3 })
    expect(nextExerciseIndex(finished, 7)).toBeNull()
  })

  it('moving on skips exercises that are already finished', () => {
    // Did the calf raise early (the machine was free).
    const s = sessionWith({
      'back-squat': 3,
      'pull-up': 3,
      'bench-press': 3,
      'cable-row': 3,
      'machine-calf-raise': 3,
    })
    expect(nextExerciseIndex(s, 3)).toBe(5)
    expect(nextExerciseIndex(sessionWith({ 'machine-calf-raise': 3 }), 3)).toBe(5)
  })

  it('nothing open further on is the end, even with skipped work behind', () => {
    const tail = sessionWith({
      'machine-calf-raise': 3,
      'kb-halo': 3,
      'kb-swing': 3,
      plank: 3,
    })
    expect(nextExerciseIndex(tail, 3)).toBeNull()
  })

  it('reports the round the group is on', () => {
    expect(groupRound(sessionWith(), [0, 1])).toBe(1)
    expect(groupRound(sessionWith({ 'back-squat': 2, 'pull-up': 1 }), [0, 1])).toBe(2)
    expect(groupRound(sessionWith({ 'back-squat': 3, 'pull-up': 3 }), [0, 1])).toBe(3)
  })
})
