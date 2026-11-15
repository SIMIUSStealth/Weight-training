import { describe, it, expect } from 'vitest'
import {
  DUMBBELL_LADDER_KG,
  formatKg,
  formatLoad,
  formatLoadShort,
  isTopRung,
  ladderFor,
  nextRung,
  prevRung,
  resolveIncrements,
} from './ladder'
import { effectiveDef, getExercise, SLOTS } from './exercises'
import {
  applyProgression,
  assessStartWeight,
  computeRecommendation,
  defaultProgress,
  initialProgress,
  startingSets,
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
  return defaultProgress(getExercise(exerciseId))
}

// ---------- ladders ----------

describe('load ladders', () => {
  it('moves to adjacent rungs only (home dumbbell)', () => {
    const L = DUMBBELL_LADDER_KG
    expect(nextRung(8, L)).toBe(9)
    expect(nextRung(6.5, L)).toBe(8)
    expect(prevRung(8, L)).toBe(6.5)
    expect(prevRung(2.5, L)).toBe(2.5) // already at bottom
  })

  it('never advances past the top rung', () => {
    const L = DUMBBELL_LADDER_KG
    expect(isTopRung(24, L)).toBe(true)
    expect(nextRung(24, L)).toBe(24)
  })

  it('builds gym ladders from the configured steps', () => {
    const bar = ladderFor('barbell', resolveIncrements())
    expect(bar[0]).toBe(20) // the empty bar
    expect(nextRung(40, bar)).toBe(42.5)
    expect(nextRung(40, ladderFor('barbell', resolveIncrements({ barbell: 5 })))).toBe(45)
    expect(nextRung(35, ladderFor('cable'))).toBe(40) // default 5 kg stack
    expect(nextRung(35, ladderFor('cable', resolveIncrements({ machine: 2.5 })))).toBe(37.5)
    expect(nextRung(12, ladderFor('dumbbell'))).toBe(14)
    expect(nextRung(16, ladderFor('kettlebell'))).toBe(18)
    expect(nextRung(24, ladderFor('kettlebell'))).toBe(28)
    expect(ladderFor('none')).toEqual([0])
  })

  it('snaps an off-ladder weight to the neighbouring rungs', () => {
    // A 13,5 kg home-dumbbell weight on a 2 kg gym rack.
    const rack = ladderFor('dumbbell')
    expect(nextRung(13.5, rack)).toBe(14)
    expect(prevRung(13.5, rack)).toBe(12)
  })

  it('runs assisted lifts from assistance through bodyweight to added weight', () => {
    const L = ladderFor('assisted') // default: 2 kg less help per level-up
    expect(nextRung(-14, L)).toBe(-12)
    expect(prevRung(0, L)).toBe(-2)
    expect(nextRung(-2, L)).toBe(0)
    expect(nextRung(0, L)).toBe(2.5)
    expect(L[0]).toBeLessThan(0)
    // The machine's step is its own setting, apart from the stacks'.
    const five = ladderFor('assisted', resolveIncrements({ assist: 5, machine: 2.5 }))
    expect(nextRung(-10, five)).toBe(-5)
    // Plain bodyweight lifts only go up (added weight), never "assisted".
    expect(prevRung(0, ladderFor('bodyweight'))).toBe(0)
  })

  it('ignores stale or invalid stored increments', () => {
    expect(resolveIncrements({ dumbbell: 3 as never, machine: 2.5 })).toEqual({
      dumbbell: 2,
      barbell: 2.5,
      machine: 2.5,
      assist: 2,
    })
  })

  it('formats decimals with a comma, like the spec', () => {
    expect(formatKg(5.5)).toBe('5,5 kg')
    expect(formatKg(8)).toBe('8 kg')
    expect(formatKg(1.25)).toBe('1,25 kg')
  })

  it('formats relative loads the way a lifter says them', () => {
    expect(formatLoad('assisted', -10)).toBe('10 kg assist')
    expect(formatLoad('assisted', 0)).toBe('Bodyweight')
    expect(formatLoad('bodyweight', 2.5)).toBe('+2,5 kg')
    expect(formatLoad('barbell', 60)).toBe('60 kg')
    expect(formatLoadShort('assisted', -10)).toBe('−10kg')
    expect(formatLoadShort('bodyweight', 0)).toBe('BW')
  })
})

// ---------- the routine's starting state ----------

describe('initialProgress', () => {
  it('seeds every routine slot’s default exercise at its start load', () => {
    const rows = initialProgress()
    // One row each, even for an exercise two slots open with (the pull-up).
    expect(rows).toHaveLength(new Set(SLOTS.map((s) => s.baseId)).size)
    expect(new Set(rows.map((r) => r.exerciseId)).size).toBe(rows.length)
    expect(rows.find((r) => r.exerciseId === 'bench-press')?.currentWeightKg).toBe(30)
    expect(rows.find((r) => r.exerciseId === 'pull-up')?.currentWeightKg).toBe(-14) // 14 kg assist
    expect(rows.find((r) => r.exerciseId === 'single-leg-leg-press')).toBeDefined()
    expect(rows.find((r) => r.exerciseId === 'plank')?.targetSeconds).toBe(30)
  })
})

// ---------- double progression (reps) ----------

describe('applyProgression — reps', () => {
  const bench = getExercise('bench-press') // 5-8, start 30kg, barbell

  it('starts the leg press at 130 kg and keeps climbing past a stack’s 200 kg', () => {
    const press = getExercise('leg-press') // 8-12, machine
    const p = progressFor('leg-press')
    expect(p.currentWeightKg).toBe(130)
    expect(applyProgression(press, p, repLog('leg-press', 130, reps(10, 10, 10))).leveledUp).toBe(false)
    expect(applyProgression(press, p, repLog('leg-press', 130, reps(12, 12, 12))).newWeightKg).toBe(135)
    const heavy = { ...p, currentWeightKg: 200 }
    expect(applyProgression(press, heavy, repLog('leg-press', 200, reps(12, 12, 12))).newWeightKg).toBe(205)
  })

  it('levels up one rung when all three sets hit the top of the range', () => {
    const res = applyProgression(bench, progressFor('bench-press'), repLog('bench-press', 30, reps(8, 8, 8)))
    expect(res.leveledUp).toBe(true)
    expect(res.newWeightKg).toBe(32.5)
    expect(res.progress.currentWeightKg).toBe(32.5)
  })

  it('climbs by your gym’s step size', () => {
    const res = applyProgression(
      bench,
      progressFor('bench-press'),
      repLog('bench-press', 30, reps(8, 8, 8)),
      resolveIncrements({ barbell: 5 }),
    )
    expect(res.newWeightKg).toBe(35)
  })

  it('does NOT level up if any set falls short of the top', () => {
    const res = applyProgression(bench, progressFor('bench-press'), repLog('bench-press', 30, reps(8, 8, 7)))
    expect(res.leveledUp).toBe(false)
    expect(res.progress.currentWeightKg).toBe(30)
  })

  it('the load trained at becomes the current load', () => {
    const at = (kg: number, ...rs: number[]) =>
      applyProgression(bench, progressFor('bench-press'), repLog('bench-press', kg, reps(...rs)))
    // Officially on 30 kg, trained at 35: next session opens at 35, not 30.
    expect(at(35, 7, 6, 5)).toMatchObject({ leveledUp: false, progress: { currentWeightKg: 35 } })
    // A lighter day sticks too — progression builds back from where you are.
    expect(at(25, 7, 7, 6)).toMatchObject({ leveledUp: false, progress: { currentWeightKg: 25 } })
    // Top of the range at the trained load climbs from that load.
    expect(at(32.5, 8, 8, 8)).toMatchObject({ leveledUp: true, newWeightKg: 35 })
    // A typed in-between weight climbs to the next real rung.
    expect(at(31, 8, 8, 8)).toMatchObject({ leveledUp: true, newWeightKg: 32.5 })
    // Nothing logged: the load is left alone.
    const untouched = progressFor('bench-press')
    const res = applyProgression(bench, untouched, repLog('bench-press', 50, [{ done: false }]))
    expect(res.progress).toBe(untouched)
  })

  it('a lighter drop set never counts toward the level-up; a heavier set does', () => {
    const at30 = (sets: SetLog[]) =>
      applyProgression(bench, progressFor('bench-press'), repLog('bench-press', 30, sets))
    // Two sets at the top, then a drop set to 20 kg for 12: not three at the load.
    expect(at30([...reps(8, 8), { reps: 12, done: true, weightKg: 20 }]).leveledUp).toBe(false)
    expect(at30([...reps(8, 8), { reps: 8, done: true, weightKg: 35 }]).leveledUp).toBe(true)
  })

  it('reps beyond the top still trigger the jump', () => {
    const res = applyProgression(bench, progressFor('bench-press'), repLog('bench-press', 30, reps(10, 9, 8)))
    expect(res.leveledUp).toBe(true)
    expect(res.newWeightKg).toBe(32.5)
  })

  it('does not advance past the top of the ladder', () => {
    const floor = getExercise('floor-press') // retired home lift, home ladder
    const top: ExerciseProgress = { exerciseId: 'floor-press', currentWeightKg: 24 }
    const res = applyProgression(floor, top, repLog('floor-press', 24, reps(12, 12, 12)))
    expect(res.leveledUp).toBe(false)
    expect(res.progress.currentWeightKg).toBe(24)
  })

  it('walks an assisted pull-up toward bodyweight, then adds weight', () => {
    const pull = getExercise('pull-up')
    const start = applyProgression(pull, progressFor('pull-up'), repLog('pull-up', -14, reps(8, 8, 8)))
    expect(start.newWeightKg).toBe(-12) // 14 → 12 kg assist
    const assisted: ExerciseProgress = { exerciseId: 'pull-up', currentWeightKg: -2 }
    const a = applyProgression(pull, assisted, repLog('pull-up', -2, reps(8, 8, 8)))
    expect(a.newWeightKg).toBe(0)
    const b = applyProgression(pull, a.progress, repLog('pull-up', 0, reps(8, 8, 8)))
    expect(b.newWeightKg).toBe(2.5)
  })

  it('never climbs a weight on an unloaded bodyweight progression', () => {
    const wheel = getExercise('ab-wheel-rollout')
    const res = applyProgression(wheel, progressFor('ab-wheel-rollout'), repLog('ab-wheel-rollout', 0, reps(12, 12, 12)))
    expect(res.leveledUp).toBe(false)
    expect(res.progress.currentWeightKg).toBe(0)
  })
})

// ---------- kettlebell circuit (loaded time) ----------

describe('applyProgression — kettlebell circuit', () => {
  const swing = getExercise('kb-swing') // 30s, 16kg

  it('moves to the next bell when all rounds hit the full time', () => {
    const res = applyProgression(swing, progressFor('kb-swing'), { exerciseId: 'kb-swing', weightKg: 16, sets: secs(30, 30, 30) })
    expect(res.leveledUp).toBe(true)
    expect(res.newWeightKg).toBe(18)
    expect(res.newSeconds).toBeUndefined()
    expect(res.progress.targetSeconds).toBe(30) // the time stays put
  })

  it('stays on the bell when a round is cut short or only two were done', () => {
    const short = applyProgression(swing, progressFor('kb-swing'), { exerciseId: 'kb-swing', weightKg: 16, sets: secs(30, 22, 30) })
    expect(short.leveledUp).toBe(false)
    const two = applyProgression(swing, progressFor('kb-swing'), {
      exerciseId: 'kb-swing',
      weightKg: 16,
      sets: [...secs(30, 30), { done: false }],
    })
    expect(two.leveledUp).toBe(false)
  })

  it('explains the new bell on the next visit', () => {
    const sessions = [session('s1', '2026-01-01T10:00:00Z', [{ exerciseId: 'kb-swing', weightKg: 16, sets: secs(30, 30, 30) }])]
    const rec = computeRecommendation(swing, { exerciseId: 'kb-swing', currentWeightKg: 18, targetSeconds: 30 }, sessions)
    expect(rec.justLeveledUp).toBe(true)
    expect(rec.coach).toMatch(/18 kg/)
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
  const push = getExercise('cable-pushdown') // 8-12

  it('flags too light when smashing past the top on the first try', () => {
    expect(assessStartWeight(push, repLog('cable-pushdown', 15, reps(16, 15, 15)), false)).toBe('too_light')
  })

  it('flags too heavy when unable to hold the bottom of the range', () => {
    expect(assessStartWeight(push, repLog('cable-pushdown', 15, reps(7, 6, 5)), false)).toBe('too_heavy')
  })

  it('returns null for a sensible first session', () => {
    expect(assessStartWeight(push, repLog('cable-pushdown', 15, reps(10, 9, 8)), false)).toBeNull()
  })

  it('never fires once there is prior history', () => {
    expect(assessStartWeight(push, repLog('cable-pushdown', 15, reps(16, 16, 16)), true)).toBeNull()
  })

  it('never fires for an unloaded progression (there is no weight to fix)', () => {
    const wheel = getExercise('ab-wheel-rollout')
    expect(assessStartWeight(wheel, repLog('ab-wheel-rollout', 0, reps(4, 3, 3)), false)).toBeNull()
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
    expect(rec.lastLoads).toEqual([8, 8, 8])
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

  it('shows each set of last time at the load it was done at', () => {
    const top = session('s1', '2026-01-03T10:00:00Z', [
      {
        exerciseId: 'floor-press',
        weightKg: 8,
        sets: [{ reps: 6, done: true, weightKg: 10 }, ...reps(10, 9)],
      },
    ])
    const rec = computeRecommendation(floor, progressFor('floor-press'), [top])
    expect(rec.lastSets).toEqual([6, 10, 9])
    expect(rec.lastLoads).toEqual([10, 8, 8])
  })

  it('shows a number to beat for a set added on top of the scheme', () => {
    // The arm finisher is 2 sets by the program; a third was added last time.
    const curl = effectiveDef(getExercise('biceps-curl'), 'a-biceps')
    expect(curl.sets).toBe(2)
    const sessions = [
      session('s1', '2026-01-01T10:00:00Z', [repLog('biceps-curl', 10, reps(9, 8, 8))]),
      session('s2', '2026-01-03T10:00:00Z', [repLog('biceps-curl', 10, reps(8, 6, 5))]),
    ]
    const rec = computeRecommendation(curl, progressFor('biceps-curl'), sessions)
    expect(rec.lastSets).toEqual([8, 6, 5])
    // Back at two sets, the older third no longer lingers.
    const two = session('s3', '2026-01-05T10:00:00Z', [repLog('biceps-curl', 10, reps(9, 7))])
    expect(
      computeRecommendation(curl, progressFor('biceps-curl'), [...sessions, two]).lastSets,
    ).toEqual([9, 7])
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

  it('tells you to make an unloaded lift harder once you own the top of the range', () => {
    const wheel = getExercise('ab-wheel-rollout')
    const sessions = [session('s1', '2026-01-01T10:00:00Z', [repLog('ab-wheel-rollout', 0, reps(12, 12, 12))])]
    const rec = computeRecommendation(wheel, progressFor('ab-wheel-rollout'), sessions)
    expect(rec.coach).toMatch(/harder/i)
    const notYet = [session('s1', '2026-01-01T10:00:00Z', [repLog('ab-wheel-rollout', 0, reps(12, 10, 9))])]
    expect(computeRecommendation(wheel, progressFor('ab-wheel-rollout'), notYet).coach).toBeUndefined()
  })

  it('names assisted loads in coaching after a level-up', () => {
    const pull = getExercise('pull-up')
    const sessions = [session('s1', '2026-01-01T10:00:00Z', [repLog('pull-up', -10, reps(8, 8, 8))])]
    const rec = computeRecommendation(pull, { exerciseId: 'pull-up', currentWeightKg: -5 }, sessions)
    expect(rec.justLeveledUp).toBe(true)
    expect(rec.coach).toMatch(/5 kg assist/)
  })

  it('plank justLeveledUp fires only for the session that triggered the level-up', () => {
    const plank = getExercise('plank')
    const progress: ExerciseProgress = { exerciseId: 'plank', targetSeconds: 40, currentWeightKg: 0 }
    // The session that raised 30s→40s carries the level-up stamp.
    const trigger = session('s1', '2026-01-01T10:00:00Z', [
      {
        exerciseId: 'plank',
        weightKg: 0,
        sets: secs(30, 31, 30),
        leveledUp: true,
        newSeconds: 40,
      },
    ])
    expect(computeRecommendation(plank, progress, [trigger]).justLeveledUp).toBe(true)

    // A later session that held 35s (≥ old target, < new) must NOT re-fire it.
    const later = session('s2', '2026-01-03T10:00:00Z', [
      { exerciseId: 'plank', weightKg: 0, sets: secs(35, 33, 36) },
    ])
    expect(
      computeRecommendation(plank, progress, [trigger, later]).justLeveledUp,
    ).toBe(false)
  })

  it('flags too-easy effort when last session left 3+ in reserve', () => {
    const sets: SetLog[] = [
      { reps: 10, rir: 3, done: true },
      { reps: 10, rir: 3, done: true },
      { reps: 9, rir: 3, done: true },
    ]
    const sessions = [
      session('s1', '2026-01-01T10:00:00Z', [
        { exerciseId: 'floor-press', weightKg: 8, sets },
      ]),
    ]
    const rec = computeRecommendation(floor, progressFor('floor-press'), sessions)
    expect(rec.effortNote).toMatch(/too easy|reserve/i)
  })

  it('nudges to leave reps in reserve when every set went to failure', () => {
    const sets: SetLog[] = [
      { reps: 11, rir: 0, done: true },
      { reps: 10, rir: 0, done: true },
      { reps: 9, rir: 0, done: true },
    ]
    const sessions = [
      session('s1', '2026-01-01T10:00:00Z', [
        { exerciseId: 'floor-press', weightKg: 8, sets },
      ]),
    ]
    const rec = computeRecommendation(floor, progressFor('floor-press'), sessions)
    expect(rec.effortNote).toMatch(/failure|reserve/i)
  })
})

// ---------- set count carried over ----------

describe('startingSets', () => {
  const curl = effectiveDef(getExercise('biceps-curl'), 'a-biceps') // 2 sets
  const inSlot = (id: string, when: string, slot: string, sets: SetLog[]): SessionLog =>
    session(id, when, [{ exerciseId: 'biceps-curl', slot, weightKg: 10, sets }])

  it('is the program’s count with no history in the slot', () => {
    expect(startingSets(curl, 'a-biceps', [])).toBe(2)
    // Three sets in another slot (Session B's finisher) don't count here.
    const b = inSlot('s1', '2026-01-01T10:00:00Z', 'b-biceps', reps(8, 8, 8))
    expect(startingSets(curl, 'a-biceps', [b])).toBe(2)
  })

  it('opens with as many sets as were done there last time', () => {
    const three = inSlot('s1', '2026-01-01T10:00:00Z', 'a-biceps', reps(8, 6, 6))
    expect(startingSets(curl, 'a-biceps', [three])).toBe(3)
    // Whichever exercise filled the slot — the count belongs to the slot.
    const swapped = session('s2', '2026-01-02T10:00:00Z', [
      { exerciseId: 'zottman-curl', slot: 'a-biceps', weightKg: 8, sets: reps(8, 8, 8, 8) },
    ])
    expect(startingSets(curl, 'a-biceps', [three, swapped])).toBe(4)
  })

  it('follows the most recent session, and never drops below the program', () => {
    const three = inSlot('s1', '2026-01-01T10:00:00Z', 'a-biceps', reps(8, 6, 6))
    const two = inSlot('s2', '2026-01-03T10:00:00Z', 'a-biceps', reps(9, 7))
    const cutShort = inSlot('s3', '2026-01-05T10:00:00Z', 'a-biceps', [
      { reps: 9, done: true },
      { done: false },
    ])
    expect(startingSets(curl, 'a-biceps', [two, three])).toBe(2) // order-independent
    expect(startingSets(curl, 'a-biceps', [three, two, cutShort])).toBe(2)
    // Sets left unticked aren't counted; an unfinished session is ignored.
    const open: SessionLog = { ...inSlot('s4', '', 'a-biceps', reps(8, 8, 8, 8)), completedAt: undefined }
    expect(startingSets(curl, 'a-biceps', [three, open])).toBe(3)
  })
})
