import { describe, expect, it } from 'vitest'
import { BAR_KG, platesPerSide, warmupSets } from './ladder'
import { sessionTitle } from './plan'
import { lastNote, normalizeLoads, sessionVolumeKg, setKg, setVolumeKg } from './sets'
import type { ExerciseLog, SessionLog, SetLog } from '../storage/types'

const set = (reps: number, weightKg?: number): SetLog =>
  weightKg == null ? { reps, done: true } : { reps, done: true, weightKg }
const log = (weightKg: number, sets: SetLog[], extra: Partial<ExerciseLog> = {}): ExerciseLog => ({
  exerciseId: 'bench-press',
  weightKg,
  sets,
  ...extra,
})
const session = (id: string, completedAt: string, exercises: ExerciseLog[]): SessionLog => ({
  id,
  startedAt: completedAt,
  completedAt,
  exercises,
})

describe('per-set loads', () => {
  it('a set is done at its own load, or the working load', () => {
    const l = log(40, [set(8), set(6, 45)])
    expect(l.sets.map((s) => setKg(l, s))).toEqual([40, 45])
    expect(l.sets.map((s) => setVolumeKg(l, s))).toEqual([320, 270])
    expect(sessionVolumeKg(session('s', '2026-01-01T10:00:00Z', [l]))).toBe(590)
  })

  it('counts no volume for unticked sets, assistance or bodyweight', () => {
    const assisted = log(-14, [set(8)], { exerciseId: 'pull-up' })
    expect(setVolumeKg(assisted, assisted.sets[0])).toBe(0)
    const open = log(40, [{ reps: 8, done: false }])
    expect(setVolumeKg(open, open.sets[0])).toBe(0)
  })
})

describe('normalizeLoads', () => {
  it('leaves an ordinary log exactly as it is', () => {
    const l = log(40, [set(8), set(8), set(7)])
    expect(normalizeLoads(l)).toBe(l)
    const untouched = log(40, [{ done: false, weightKg: 50 }])
    expect(normalizeLoads(untouched)).toBe(untouched)
  })

  it('makes the load most sets were done at the working load', () => {
    // Working load said 40, but every set was done at 45.
    expect(normalizeLoads(log(40, [set(8, 45), set(8, 45), set(7, 45)]))).toEqual(
      log(45, [set(8), set(8), set(7)]),
    )
    // One set at the old load, then the stack went up for the other two.
    expect(normalizeLoads(log(45, [set(10, 40), set(8), set(7)]))).toEqual(
      log(45, [set(10, 40), set(8), set(7)]),
    )
  })

  it('keeps a top set and a drop set as the odd ones out', () => {
    expect(normalizeLoads(log(60, [set(5, 70), set(8), set(8), set(12, 40)]))).toEqual(
      log(60, [set(5, 70), set(8), set(8), set(12, 40)]),
    )
  })

  it('breaks a tie towards the current working load, else the heaviest', () => {
    expect(normalizeLoads(log(40, [set(8), set(8, 45)])).weightKg).toBe(40)
    expect(normalizeLoads(log(30, [set(8, 40), set(8, 45)])).weightKg).toBe(45)
  })

  it('drops a load left on a set that was never done', () => {
    const out = normalizeLoads(log(40, [set(8, 45), set(8, 45), { done: false, weightKg: 50 }]))
    expect(out.weightKg).toBe(45)
    expect(out.sets[2]).toEqual({ done: false })
  })
})

describe('lastNote', () => {
  it('is the most recent note written on the exercise', () => {
    const a = session('a', '2026-01-01T10:00:00Z', [log(40, [set(8)], { note: 'seat 4' })])
    const b = session('b', '2026-01-03T10:00:00Z', [log(40, [set(8)], { note: '  ' })])
    const c = session('c', '2026-01-02T10:00:00Z', [log(40, [set(8)], { note: 'elbow niggle ' })])
    expect(lastNote('bench-press', [a, b, c])).toBe('elbow niggle')
    expect(lastNote('pull-up', [a, b, c])).toBeUndefined()
  })
})

describe('plates on the bar', () => {
  it('loads each side, heaviest plate first', () => {
    expect(platesPerSide(BAR_KG)).toEqual([])
    expect(platesPerSide(60)).toEqual([20])
    expect(platesPerSide(72.5)).toEqual([25, 1.25])
    expect(platesPerSide(100)).toEqual([25, 15])
    expect(platesPerSide(47.5)).toEqual([10, 2.5, 1.25])
  })

  it('says when a total cannot be loaded', () => {
    expect(platesPerSide(15)).toBeNull() // lighter than the bar
    expect(platesPerSide(41)).toBeNull() // no 0,5 kg plates
  })
})

describe('warm-up ramp', () => {
  it('ramps ~50 / 70 / 85 %, snapped down to real weights', () => {
    expect(warmupSets('barbell', 100)).toEqual([
      { weightKg: 50, reps: 8 },
      { weightKg: 70, reps: 5 },
      { weightKg: 85, reps: 2 },
    ])
    // Dumbbells in 2 kg steps: 9 → 8, 12,6 → 12, 15,3 → 14.
    expect(warmupSets('dumbbell', 18, { dumbbell: 2, barbell: 2.5, machine: 5, assist: 2 })).toEqual([
      { weightKg: 8, reps: 8 },
      { weightKg: 12, reps: 5 },
      { weightKg: 14, reps: 2 },
    ])
  })

  it('never goes under the lightest weight or up to the working load', () => {
    // 30 kg on the bar: half is under the empty bar, so the bar it is.
    expect(warmupSets('barbell', 30)).toEqual([
      { weightKg: 20, reps: 8 },
      { weightKg: 25, reps: 2 },
    ])
    expect(warmupSets('barbell', 20)).toEqual([]) // already the empty bar
  })

  it('has no ramp for bodyweight-relative or unloaded work', () => {
    expect(warmupSets('assisted', -14)).toEqual([])
    expect(warmupSets('bodyweight', 10)).toEqual([])
    expect(warmupSets('none', 0)).toEqual([])
  })
})

describe('sessionTitle', () => {
  const ex = (exerciseId: string, slot?: string): ExerciseLog => ({
    exerciseId,
    slot,
    weightKg: 10,
    sets: [set(8)],
  })

  it('names a session by the blocks it ran', () => {
    expect(sessionTitle(session('a', '2026-01-01T10:00:00Z', [ex('pull-up', 'a-pull'), ex('biceps-curl', 'a-biceps')]))).toBe('Session A')
    expect(sessionTitle(session('b', '2026-01-01T10:00:00Z', [ex('pull-up'), ex('cable-row')]))).toBe('Pair 1 · Pair 3')
  })

  it('marks a later part, and a home-era workout', () => {
    const part2 = { ...session('c', '2026-01-01T10:00:00Z', [ex('lat-pulldown', 'b-pull')]), part: 2 }
    expect(sessionTitle(part2)).toBe('Session B · Part 2')
    expect(sessionTitle(session('d', '2026-01-01T10:00:00Z', [ex('floor-press')]))).toBe('Home workout')
  })
})
