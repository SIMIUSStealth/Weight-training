import { describe, it, expect } from 'vitest'
import { alternatingGroup, groupRound, nextExerciseIndex } from './flow'
import type { ExerciseLog } from '../storage/types'

// A session: Pair 1 (pull-up, squat, bench), an isolation, then the core triplet.
const IDS = [
  'pull-up',
  'back-squat',
  'bench-press',
  'cable-pushdown',
  'ab-wheel-rollout',
  'pallof-press',
  'back-extension',
]

function sessionWith(done: Record<string, number> = {}): ExerciseLog[] {
  return IDS.map((exerciseId) => ({
    exerciseId,
    weightKg: 0,
    sets: [0, 1, 2].map((i) => ({ done: i < (done[exerciseId] ?? 0) })),
  }))
}

describe('alternating groups', () => {
  it('groups a contiguous run from one alternating block', () => {
    const s = sessionWith()
    expect(alternatingGroup(s, 1)).toEqual([0, 2]) // Pair 1
    expect(alternatingGroup(s, 3)).toBeNull() // isolations are straight sets
    expect(alternatingGroup(s, 6)).toEqual([4, 6]) // core triplet
  })

  it('a lone member of an alternating block is just straight sets', () => {
    const lone: ExerciseLog[] = [{ exerciseId: 'pull-up', weightKg: 0, sets: [] }]
    expect(alternatingGroup(lone, 0)).toBeNull()
  })
})

describe('nextExerciseIndex', () => {
  it('rotates through a pair round by round', () => {
    // Round 1: pull-up → squat → bench, then back to pull-up.
    expect(nextExerciseIndex(sessionWith({ 'pull-up': 1 }), 0)).toBe(1)
    expect(nextExerciseIndex(sessionWith({ 'pull-up': 1, 'back-squat': 1 }), 1)).toBe(2)
    expect(
      nextExerciseIndex(sessionWith({ 'pull-up': 1, 'back-squat': 1, 'bench-press': 1 }), 2),
    ).toBe(0)
  })

  it('skips members that are finished', () => {
    const s = sessionWith({ 'pull-up': 3, 'back-squat': 2, 'bench-press': 3 })
    expect(nextExerciseIndex(s, 2)).toBe(1)
  })

  it('leaves the group once every member is done', () => {
    const s = sessionWith({ 'pull-up': 3, 'back-squat': 3, 'bench-press': 3 })
    expect(nextExerciseIndex(s, 2)).toBe(3)
  })

  it('never traps you: browsing past a group without logging moves on', () => {
    const s = sessionWith()
    expect(nextExerciseIndex(s, 0)).toBe(1)
    expect(nextExerciseIndex(s, 2)).toBe(3) // no set logged on bench → no wrap
  })

  it('straight-set exercises go in order; the end of the session is null', () => {
    const s = sessionWith()
    expect(nextExerciseIndex(s, 3)).toBe(4)
    const finished = sessionWith({
      'ab-wheel-rollout': 3,
      'pallof-press': 3,
      'back-extension': 3,
    })
    expect(nextExerciseIndex(finished, 6)).toBeNull()
  })

  it('reports the round the group is on', () => {
    expect(groupRound(sessionWith(), [0, 2])).toBe(1)
    expect(groupRound(sessionWith({ 'pull-up': 2, 'back-squat': 1, 'bench-press': 1 }), [0, 2])).toBe(2)
    expect(groupRound(sessionWith({ 'pull-up': 3, 'back-squat': 3, 'bench-press': 3 }), [0, 2])).toBe(3)
  })
})
