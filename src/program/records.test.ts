import { describe, it, expect } from 'vitest'
import { collectBests, detectPRs, epley1RM } from './records'
import type { SessionLog, SetLog } from '../storage/types'

const reps = (...rs: number[]): SetLog[] => rs.map((r) => ({ reps: r, done: true }))
const secs = (...ss: number[]): SetLog[] => ss.map((s) => ({ seconds: s, done: true }))

function sess(
  id: string,
  when: string,
  exerciseId: string,
  weightKg: number,
  sets: SetLog[],
): SessionLog {
  return {
    id,
    startedAt: when,
    completedAt: when,
    exercises: [{ exerciseId, weightKg, sets }],
  }
}

describe('epley1RM', () => {
  it('estimates weight × (1 + reps/30)', () => {
    expect(epley1RM(10, 10)).toBeCloseTo(13.33, 2)
    expect(epley1RM(0, 10)).toBe(0)
    expect(epley1RM(10, 0)).toBe(0)
  })
})

describe('collectBests', () => {
  it('tracks best reps per weight, best est. 1RM, and longest hold', () => {
    const history = [
      sess('a', '2026-01-01T10:00:00Z', 'floor-press', 8, reps(10, 9, 8)),
      sess('b', '2026-01-03T10:00:00Z', 'floor-press', 9, reps(8, 8, 7)),
      sess('c', '2026-01-05T10:00:00Z', 'plank', 0, secs(30, 40, 35)),
    ]
    const fp = collectBests('floor-press', history)
    expect(fp.repsAtWeight.get('8.00')).toBe(10)
    expect(fp.repsAtWeight.get('9.00')).toBe(8)
    expect(fp.best1RM).toBeCloseTo(epley1RM(9, 8), 5) // 11.4 beats 10.67 @8kg
    expect(fp.best1RMWeightKg).toBe(9)
    expect(collectBests('plank', history).longestHold).toBe(40)
  })
})

describe('detectPRs', () => {
  const prior = [sess('p1', '2026-01-01T10:00:00Z', 'floor-press', 8, reps(10, 9, 9))]

  it('sets no PRs on a first-ever session (baseline, not trophies)', () => {
    const first = sess('n', '2026-01-03T10:00:00Z', 'biceps-curl', 8, reps(12, 11, 10))
    expect(detectPRs(first, prior)).toEqual([]) // no biceps history at all
  })

  it('detects a rep PR at the same weight', () => {
    const next = sess('n', '2026-01-03T10:00:00Z', 'floor-press', 8, reps(11, 9, 9))
    const prs = detectPRs(next, prior)
    expect(prs).toContainEqual({
      exerciseId: 'floor-press',
      kind: 'reps',
      weightKg: 8,
      value: 11,
    })
    // 11 @ 8kg ≈ 10.93 beats prior best 10 @ 8kg ≈ 10.67 → also a 1RM PR
    expect(prs.some((p) => p.kind === 'onerm')).toBe(true)
  })

  it('detects a 1RM PR after moving up a rung, without a bogus rep PR', () => {
    const next = sess('n', '2026-01-03T10:00:00Z', 'floor-press', 9, reps(9, 8, 8))
    const prs = detectPRs(next, prior)
    expect(prs.filter((p) => p.kind === 'reps')).toEqual([]) // no prior sets @9kg
    const onerm = prs.find((p) => p.kind === 'onerm')
    expect(onerm?.value).toBeCloseTo(epley1RM(9, 9), 5)
  })

  it('no PR when performance merely matches the best', () => {
    const next = sess('n', '2026-01-03T10:00:00Z', 'floor-press', 8, reps(10, 9, 9))
    expect(detectPRs(next, prior)).toEqual([])
  })

  it('detects a hold PR against prior plank history', () => {
    const planks = [sess('p', '2026-01-01T10:00:00Z', 'plank', 0, secs(30, 30, 30))]
    const next = sess('n', '2026-01-03T10:00:00Z', 'plank', 0, secs(30, 45, 30))
    expect(detectPRs(next, planks)).toEqual([
      { exerciseId: 'plank', kind: 'hold', value: 45 },
    ])
  })

  it('a split Part B is measured against Part A too', () => {
    const partA = sess('a', '2026-01-03T10:00:00Z', 'floor-press', 8, reps(11, 10, 10))
    const partB = sess('b', '2026-01-03T20:00:00Z', 'floor-press', 8, reps(12, 10, 10))
    expect(detectPRs(partB, [...prior, partA]).find((p) => p.kind === 'reps')?.value).toBe(12)
    // and Part B merely matching Part A is not a PR
    const partB2 = sess('b2', '2026-01-03T20:00:00Z', 'floor-press', 8, reps(11, 10, 10))
    expect(detectPRs(partB2, [...prior, partA]).filter((p) => p.kind === 'reps')).toEqual([])
  })
})
