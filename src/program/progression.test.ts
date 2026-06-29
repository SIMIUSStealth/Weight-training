import { describe, it, expect } from 'vitest'
import {
  DUMBBELL_LADDER_KG,
  nextRung,
  prevRung,
  isTopRung,
  nearestRung,
  formatKg,
} from './ladder'
import { getExercise } from './exercises'
import {
  applyProgression,
  assessStartWeight,
  computeRecommendation,
  initialProgress,
} from './progression'
import type { ExerciseLog, SessionLog, SetLog, ExerciseProgress } from '../storage/types'

// ---------- test builders ----------

const reps = (...rs: number[]): SetLog[] => rs.map((r) => ({ reps: r, done: true }))
const secs = (...ss: number[]): SetLog[] => ss.map((s) => ({ seconds: s, done: true }))

function repLog(exerciseId: string, weightKg: number, sets: SetLog[]): ExerciseLog {
  return { exerciseId, weightKg, sets }
}

function session(id: string, completedAt: string, logs: ExerciseLog[]): SessionLog {
  return { id, startedAt: completedAt, completedAt, exercises: logs }
}

function progressFor(exerciseId: string): ExerciseProgress {
  return initialProgress().find((p) => p.exerciseId === exerciseId)!
}

// ---------- ladder ----------

describe('dumbbell ladder', () => {
  it('moves to adjacent rungs only', () => {
    expect(nextRung(8)).toBe(9)
    expect(nextRung(6.5)).toBe(8)
    expect(prevRung(8)).toBe(6.5)
    expect(prevRung(2.5)).toBe(2.5) // already at bottom
  })

  it('never advances past the top rung', () => {
    const top = DUMBBELL_LADDER_KG[DUMBBELL_LADDER_KG.length - 1]
    expect(top).toBe(24)
    expect(isTopRung(24)).toBe(true)
    expect(nextRung(24)).toBe(24)
  })

  it('snaps arbitrary weights to the nearest rung', () => {
    expect(nearestRung(7)).toBe(6.5)
    expect(nearestRung(12)).toBe(11.5)
  })

  it('formats decimals with a comma, like the spec', () => {
    expect(formatKg(5.5)).toBe('5,5 kg')
    expect(formatKg(8)).toBe('8 kg')
  })
})

// ---------- double progression (reps) ----------

describe('applyProgression — reps', () => {
  const floor = getExercise('floor-press') // 8-12, start 8kg

  it('levels up one rung when all three sets hit the top of the range', () => {
    const res = applyProgression(floor, progressFor('floor-press'), repLog('floor-press', 8, reps(12, 12, 12)))
    expect(res.leveledUp).toBe(true)
    expect(res.newWeightKg).toBe(9)
    expect(res.progress.currentWeightKg).toBe(9)
  })

  it('does NOT level up if any set falls short of the top', () => {
    const res = applyProgression(floor, progressFor('floor-press'), repLog('floor-press', 8, reps(12, 12, 11)))
    expect(res.leveledUp).toBe(false)
    expect(res.progress.currentWeightKg).toBe(8)
  })

  it('does not count a level-up logged at the wrong weight', () => {
    // Logged at 9kg while still officially on 8kg — ignored.
    const res = applyProgression(floor, progressFor('floor-press'), repLog('floor-press', 9, reps(12, 12, 12)))
    expect(res.leveledUp).toBe(false)
  })

  it('reps beyond the top still trigger the jump', () => {
    const res = applyProgression(floor, progressFor('floor-press'), repLog('floor-press', 8, reps(15, 14, 13)))
    expect(res.leveledUp).toBe(true)
    expect(res.newWeightKg).toBe(9)
  })

  it('does not advance past the top of the ladder', () => {
    const top: ExerciseProgress = { exerciseId: 'floor-press', currentWeightKg: 24 }
    const res = applyProgression(floor, top, repLog('floor-press', 24, reps(12, 12, 12)))
    expect(res.leveledUp).toBe(false)
    expect(res.progress.currentWeightKg).toBe(24)
  })
})

// ---------- plank (time) ----------

describe('applyProgression — plank', () => {
  const plank = getExercise('plank') // 30s start, +10s

  it('adds 10s when all sets hit the target hold', () => {
    const res = applyProgression(plank, progressFor('plank'), { exerciseId: 'plank', weightKg: 0, sets: secs(30, 32, 30) })
    expect(res.leveledUp).toBe(true)
    expect(res.newSeconds).toBe(40)
    expect(res.progress.targetSeconds).toBe(40)
  })

  it('does not climb if a set is short of target', () => {
    const res = applyProgression(plank, progressFor('plank'), { exerciseId: 'plank', weightKg: 0, sets: secs(30, 25, 30) })
    expect(res.leveledUp).toBe(false)
    expect(res.progress.targetSeconds).toBe(30)
  })
})

// ---------- start-weight self-correction ----------

describe('assessStartWeight', () => {
  const lat = getExercise('lateral-raise') // 8-12

  it('flags too light when smashing past the top on the first try', () => {
    expect(assessStartWeight(lat, repLog('lateral-raise', 3.5, reps(16, 15, 15)), false)).toBe('too_light')
  })

  it('flags too heavy when unable to hold the bottom of the range', () => {
    expect(assessStartWeight(lat, repLog('lateral-raise', 3.5, reps(7, 6, 5)), false)).toBe('too_heavy')
  })

  it('returns null for a sensible first session', () => {
    expect(assessStartWeight(lat, repLog('lateral-raise', 3.5, reps(10, 9, 8)), false)).toBeNull()
  })

  it('never fires once there is prior history', () => {
    expect(assessStartWeight(lat, repLog('lateral-raise', 3.5, reps(16, 16, 16)), true)).toBeNull()
  })
})

// ---------- recommendations for the next session ----------

describe('computeRecommendation', () => {
  const floor = getExercise('floor-press')

  it('coaches a first-time exercise about the estimated start weight', () => {
    const rec = computeRecommendation(floor, progressFor('floor-press'), [])
    expect(rec.hasHistory).toBe(false)
    expect(rec.coach).toMatch(/estimate/i)
  })

  it('says "beat last time" with the previous sets', () => {
    const sessions = [session('s1', '2026-01-01T10:00:00Z', [repLog('floor-press', 8, reps(10, 9, 9))])]
    const rec = computeRecommendation(floor, progressFor('floor-press'), sessions)
    expect(rec.headline).toContain('Beat 10 · 9 · 9')
    expect(rec.justLeveledUp).toBe(false)
    expect(rec.lastSets).toEqual([10, 9, 9])
    expect(rec.lastWeightKg).toBe(8)
  })

  it('fills a set you did not finish with your last completed value (never null)', () => {
    const partial: SetLog[] = [
      { reps: 10, done: true },
      { reps: 9, done: true },
      { done: false }, // never finished the 3rd set
    ]
    const sessions = [
      session('s1', '2026-01-01T10:00:00Z', [
        { exerciseId: 'floor-press', weightKg: 8, sets: partial },
      ]),
    ]
    const rec = computeRecommendation(floor, progressFor('floor-press'), sessions)
    expect(rec.lastSets).toHaveLength(3)
    expect(rec.lastSets).toEqual([10, 9, 9]) // 3rd falls back to last completed (9)
  })

  it('looks back to an earlier session for a set not completed recently', () => {
    const older = session('s1', '2026-01-01T10:00:00Z', [
      repLog('floor-press', 8, reps(11, 11, 11)),
    ])
    const recent = session('s2', '2026-01-03T10:00:00Z', [
      {
        exerciseId: 'floor-press',
        weightKg: 8,
        sets: [
          { reps: 12, done: true },
          { reps: 10, done: true },
          { done: false },
        ],
      },
    ])
    const rec = computeRecommendation(floor, progressFor('floor-press'), [older, recent])
    expect(rec.lastSets).toEqual([12, 10, 11]) // set 3 falls back to the older session
  })

  it('explains the rep drop right after a level-up', () => {
    // Last session logged at 8kg hit 3x12; progress now sits on 9kg.
    const sessions = [session('s1', '2026-01-03T10:00:00Z', [repLog('floor-press', 8, reps(12, 12, 12))])]
    const progress: ExerciseProgress = { exerciseId: 'floor-press', currentWeightKg: 9 }
    const rec = computeRecommendation(floor, progress, sessions)
    expect(rec.justLeveledUp).toBe(true)
    expect(rec.coach).toMatch(/expected/i)
  })

  it('detects a stall across three flat sessions and suggests bridging', () => {
    const sessions = [
      session('s3', '2026-01-05T10:00:00Z', [repLog('floor-press', 9, reps(10, 9, 9))]),
      session('s2', '2026-01-03T10:00:00Z', [repLog('floor-press', 9, reps(10, 10, 9))]),
      session('s1', '2026-01-01T10:00:00Z', [repLog('floor-press', 9, reps(10, 9, 9))]),
    ]
    const progress: ExerciseProgress = { exerciseId: 'floor-press', currentWeightKg: 9 }
    const rec = computeRecommendation(floor, progress, sessions)
    expect(rec.stalled).toBe(true)
    expect(rec.coach).toMatch(/bridge/i)
  })
})
