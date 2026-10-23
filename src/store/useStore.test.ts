import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { migrateSettings, useStore } from './useStore'
import { overview } from '../program/analytics'
import { ROUTINE, defaultWeeklyPlan } from '../program/plan'
import type { BackupFile, DayPlan, Settings } from '../storage/types'

async function flush() {
  // let fire-and-forget IndexedDB writes settle
  await new Promise((r) => setTimeout(r, 60))
}

function logSet(exerciseId: string, i: number, value: number, time = false) {
  useStore
    .getState()
    .updateSet(exerciseId, i, time ? { seconds: value, done: true } : { reps: value, done: true })
}

function logAll(exerciseId: string, ...values: number[]) {
  values.forEach((v, i) => logSet(exerciseId, i, v))
}

/**
 * The pairs routine on Monday and Wednesday (the default before the A/B
 * program took those days) — what most of these tests train.
 */
function pairsWeek(): DayPlan[] {
  const plan = defaultWeeklyPlan()
  plan[0] = { blocks: [...ROUTINE] }
  plan[2] = { blocks: [...ROUTINE, 'leg-day'] }
  return plan
}

async function resetToPairsWeek() {
  await useStore.getState().resetEverything()
  useStore.getState().updateSettings({ weeklyPlan: pairsWeek() })
}

// Monday on the pairs week: the full routine (Pairs 1–3 + core triplet), 10 exercises.
const MONDAY = [
  'pull-up',
  'back-squat',
  'bench-press',
  'bench-dip',
  'deadlift',
  'cable-row',
  'machine-chest-press',
  'ab-wheel-rollout',
  'pallof-press',
  'back-extension',
]

describe('store: full workout → progression → persistence', () => {
  beforeEach(resetToPairsWeek)

  it('starts the routine in order', () => {
    useStore.getState().startDay(0)
    const ids = useStore.getState().activeSession!.exercises.map((e) => e.exerciseId)
    expect(ids).toEqual(MONDAY)
  })

  it('levels up the right exercises, records nudges, and persists state', async () => {
    useStore.getState().startDay(0)

    // Bench: 3×8 at the starting 30 kg → next plate, 32,5 kg.
    logAll('bench-press', 8, 8, 8)
    // Machine chest press: 3×11 at 30 kg → level up AND flagged "too light".
    logAll('machine-chest-press', 11, 11, 11)
    // Pull-up: 3×8 at 14 kg assist → 2 kg less help.
    logAll('pull-up', 8, 8, 8)
    // Ab wheel: 3×12 — unloaded, so nothing to climb.
    logAll('ab-wheel-rollout', 12, 12, 12)

    const summary = useStore.getState().finishSession()
    expect(summary).not.toBeNull()

    const prog = useStore.getState().progress
    expect(prog['bench-press'].currentWeightKg).toBe(32.5)
    expect(prog['machine-chest-press'].currentWeightKg).toBe(35)
    expect(prog['pull-up'].currentWeightKg).toBe(-12)
    expect(prog['ab-wheel-rollout'].currentWeightKg).toBe(0)

    const ids = summary!.levelUps.map((l) => l.exerciseId)
    expect(ids).toEqual(['pull-up', 'bench-press', 'machine-chest-press'])
    expect(summary!.levelUps[0]).toMatchObject({ from: '14 kg assist', to: '12 kg assist' })
    expect(summary!.startNudges).toContainEqual({
      exerciseId: 'machine-chest-press',
      kind: 'too_light',
    })
    expect(summary!.setsLogged).toBe(12)

    expect(useStore.getState().sessions).toHaveLength(1)
    expect(useStore.getState().activeSession).toBeNull()

    // persistence: re-hydrate from IndexedDB and confirm the climb stuck
    await flush()
    await useStore.getState().init()
    expect(useStore.getState().progress['bench-press'].currentWeightKg).toBe(32.5)
    expect(useStore.getState().sessions).toHaveLength(1)
  })

  it('does not level up when sets fall short of the top', () => {
    useStore.getState().startDay(0)
    logAll('back-squat', 8, 7, 6)
    useStore.getState().finishSession()
    expect(useStore.getState().progress['back-squat'].currentWeightKg).toBe(40) // unchanged
  })

  it('climbs by the gym’s configured step', () => {
    useStore.getState().updateSettings({ increments: { barbell: 5 } })
    useStore.getState().startDay(0)
    logAll('bench-press', 8, 8, 8)
    useStore.getState().finishSession()
    expect(useStore.getState().progress['bench-press'].currentWeightKg).toBe(35)
  })

  it('runs the kettlebell circuit: next bell for full rounds, plank adds time', () => {
    const s = useStore.getState()
    s.toggleDayBlock(0, 'kb-core')
    s.startDay(0)
    logSet('kb-swing', 0, 30, true)
    logSet('kb-swing', 1, 30, true)
    logSet('kb-swing', 2, 30, true)
    logSet('plank', 0, 30, true)
    logSet('plank', 1, 32, true)
    logSet('plank', 2, 30, true)
    const summary = useStore.getState().finishSession()
    const prog = useStore.getState().progress
    expect(prog['kb-swing'].currentWeightKg).toBe(18)
    expect(prog['plank'].targetSeconds).toBe(40)
    expect(summary!.levelUps.find((l) => l.exerciseId === 'kb-swing')).toMatchObject({
      from: '16 kg',
      to: '18 kg',
    })
  })
})

describe('store: backup', () => {
  beforeEach(resetToPairsWeek)

  it('builds a backup from current state and stamps the time', () => {
    const s = useStore.getState()
    s.startDay(0)
    logSet('bench-press', 0, 6)
    s.finishSession()

    const backup = useStore.getState().getBackup()
    expect(backup.app).toBe('iron-ladder')
    expect(backup.sessions).toHaveLength(1)
    expect(backup.progress.length).toBeGreaterThan(0)
    expect(typeof backup.exportedAt).toBe('string')

    expect(useStore.getState().settings.lastBackupAt).toBeUndefined()
    useStore.getState().recordBackup()
    expect(useStore.getState().settings.lastBackupAt).toBeTruthy()
  })

  it('rejects a malformed backup without destroying existing data', async () => {
    const s = useStore.getState()
    s.startDay(0)
    logSet('bench-press', 0, 6)
    s.finishSession()
    await flush()

    // app tag right, but sessions array missing → must throw BEFORE clearing
    const bad = { app: 'iron-ladder', version: 1 } as never
    await expect(useStore.getState().importData(bad)).rejects.toThrow()

    await useStore.getState().init()
    expect(useStore.getState().sessions).toHaveLength(1) // history intact
  })
})

describe('store: moving from the home program to the gym', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  it('migrates v1 settings: gym week replaces the muscle-group plan, the rest is kept', () => {
    const v1 = {
      restSeconds: 75,
      restAlert: false,
      version: 1,
      weeklyPlan: Array.from({ length: 7 }, () => ({ muscles: ['Chest'] })),
      program: { 'arm-biceps': 'hammer-curl', bench: 'db-bench-press' },
    } as unknown as Settings
    const next = migrateSettings(v1)
    expect(next.weeklyPlan).toEqual(defaultWeeklyPlan())
    expect(next.program).toEqual({ bench: 'db-bench-press' }) // home slots dropped
    expect(next.version).toBe(3)
    expect(next.restSeconds).toBe(75)
    expect(next.restAlert).toBe(false)
    // already current → untouched (same object, no needless write)
    expect(migrateSettings(next)).toBe(next)
  })

  it('restores a home-era backup: history kept, gym week installed, training goes on', async () => {
    const homeSession = {
      id: 'home-1',
      startedAt: '2026-06-01T10:00:00Z',
      completedAt: '2026-06-01T10:40:00Z',
      exercises: [
        { exerciseId: 'floor-press', weightKg: 13.5, sets: [{ reps: 10, done: true }] },
        { exerciseId: 'biceps-curl', weightKg: 11.5, sets: [{ reps: 9, done: true }] },
      ],
    }
    const backup: BackupFile = {
      app: 'iron-ladder',
      version: 1,
      exportedAt: '2026-06-02T10:00:00Z',
      sessions: [homeSession],
      progress: [
        { exerciseId: 'floor-press', currentWeightKg: 13.5 },
        { exerciseId: 'biceps-curl', currentWeightKg: 11.5 },
      ],
      bodyStats: [],
      settings: {
        restSeconds: 75,
        restAlert: true,
        version: 1,
        weeklyPlan: Array.from({ length: 7 }, () => ({ muscles: ['Chest'] })),
      } as unknown as Settings,
    }
    await useStore.getState().importData(backup)

    const st = useStore.getState()
    expect(st.sessions).toHaveLength(1)
    expect(st.settings.weeklyPlan).toEqual(defaultWeeklyPlan())
    // Biceps curl carried over into the gym catalog with its weight.
    expect(st.progress['biceps-curl'].currentWeightKg).toBe(11.5)
    // The gym routine is seeded and trainable.
    expect(st.progress['bench-press'].currentWeightKg).toBe(30)
    st.startDay(0) // Session A
    logSet('db-bench-press', 0, 7)
    expect(useStore.getState().finishSession()).not.toBeNull()
    expect(useStore.getState().sessions).toHaveLength(2)
  })
})

describe('store: swapping exercises', () => {
  beforeEach(resetToPairsWeek)

  it('swaps a slot, seeds progress, and builds the next session with the new exercise', () => {
    useStore.getState().swapExercise('bench', 'db-bench-press')
    expect(useStore.getState().settings.program?.bench).toBe('db-bench-press')
    expect(useStore.getState().progress['db-bench-press']?.currentWeightKg).toBe(18)

    useStore.getState().startDay(0)
    const ids = useStore.getState().activeSession!.exercises.map((e) => e.exerciseId)
    expect(ids).toHaveLength(MONDAY.length) // structure preserved
    expect(ids).toContain('db-bench-press')
    expect(ids).not.toContain('bench-press')
    expect(ids[0]).toBe('pull-up') // other slots untouched
  })

  it('rejects a swap to another slot’s exercise or a retired one', () => {
    useStore.getState().swapExercise('bench', 'plank') // plank is the KB circuit's
    useStore.getState().swapExercise('biceps', 'hammer-curl') // home-program only
    expect(useStore.getState().settings.program?.bench).toBeUndefined()
    expect(useStore.getState().settings.program?.biceps).toBeUndefined()
  })

  it('keeps each variation’s own progress when swapping back and forth', () => {
    const s = useStore.getState()
    s.swapExercise('bench', 'db-bench-press')
    s.setExerciseWeight('db-bench-press', 16)
    s.swapExercise('bench', 'bench-press') // back to base
    expect(useStore.getState().settings.program?.bench).toBe('bench-press')
    expect(useStore.getState().progress['db-bench-press'].currentWeightKg).toBe(16)
    expect(useStore.getState().progress['bench-press'].currentWeightKg).toBe(30)
  })
})

describe('store: personal records', () => {
  beforeEach(resetToPairsWeek)

  it('first session sets the baseline; beating it earns a PR that is stamped and summarized', () => {
    const s = useStore.getState()
    s.startDay(0)
    logSet('bench-press', 0, 6)
    const first = useStore.getState().finishSession()
    expect(first!.prs).toEqual([]) // baseline, no trophies on day one

    useStore.getState().startDay(2)
    logSet('bench-press', 0, 7)
    const second = useStore.getState().finishSession()
    expect(second!.prs.some((p) => p.kind === 'reps' && p.value === 7)).toBe(true)
    expect(second!.prs.some((p) => p.kind === 'onerm')).toBe(true)

    const stored = useStore.getState().sessions.find((x) => x.id === second!.sessionId)
    expect(stored?.prs?.length).toBe(second!.prs.length) // persisted on the session
  })
})

describe('store: weekly plan', () => {
  beforeEach(resetToPairsWeek)

  it('startDay builds a session for that day’s blocks and tags the weekday', () => {
    const s = useStore.getState()
    // Default Monday is the full routine — pare it to Pair 1.
    s.toggleDayBlock(0, 'pair-2')
    s.toggleDayBlock(0, 'pair-3')
    s.toggleDayBlock(0, 'core')
    useStore.getState().startDay(0)
    const active = useStore.getState().activeSession!
    expect(active.weekday).toBe(0)
    expect(active.exercises.map((e) => e.exerciseId)).toEqual([
      'pull-up',
      'back-squat',
      'bench-press',
    ])
  })

  it('does not start a different day while one is in progress', () => {
    const s = useStore.getState()
    s.startDay(0)
    const firstId = useStore.getState().activeSession!.id
    s.startDay(2) // Wednesday — ignored: one workout at a time
    expect(useStore.getState().activeSession!.id).toBe(firstId)
    expect(useStore.getState().activeSession!.weekday).toBe(0)
  })

  it('adds and removes exercises within a day', () => {
    const s = useStore.getState()
    s.addExerciseToDay(0, 'incline-db-press')
    expect(useStore.getState().settings.weeklyPlan![0].add).toContain('incline-db-press')

    // An extra from a block that's off doesn't switch the whole block on.
    s.addExerciseToDay(0, 'hamstring-curl')
    const mon = useStore.getState().settings.weeklyPlan![0]
    expect(mon.add).toContain('hamstring-curl')
    expect(mon.blocks).not.toContain('leg-day')

    s.removeExerciseFromDay(0, 'bench-dip')
    expect(useStore.getState().settings.weeklyPlan![0].omit).toContain('dip')

    // Emptying the optional pair switches it off and clears its omits.
    s.removeExerciseFromDay(0, 'deadlift')
    const after = useStore.getState().settings.weeklyPlan![0]
    expect(after.blocks).not.toContain('pair-2')
    expect(after.omit ?? []).not.toContain('dip')

    // Re-adding a removed default un-omits it rather than duplicating it.
    s.removeExerciseFromDay(0, 'cable-row')
    s.addExerciseToDay(0, 'cable-row')
    const again = useStore.getState().settings.weeklyPlan![0]
    expect(again.omit ?? []).not.toContain('row')
    expect(again.add ?? []).not.toContain('cable-row')
  })

  it('add-ons come and go cleanly: removing then re-adding a crunch brings it back', () => {
    const s = useStore.getState()
    s.addExerciseToDay(0, 'machine-ab-crunch')
    s.removeExerciseFromDay(0, 'machine-ab-crunch')
    let mon = useStore.getState().settings.weeklyPlan![0]
    expect(mon.add ?? []).not.toContain('machine-ab-crunch')
    expect(mon.omit ?? []).not.toContain('flexion')
    s.addExerciseToDay(0, 'machine-ab-crunch')
    s.startDay(0)
    const ids = useStore.getState().activeSession!.exercises.map((e) => e.exerciseId)
    expect(ids).toContain('machine-ab-crunch')
    expect(ids).not.toContain('machine-ab-crunch-feet-anchored')
  })

  it('turning a block off drops its omits and extras', () => {
    const s = useStore.getState()
    s.addExerciseToDay(0, 'goblet-squat')
    s.removeExerciseFromDay(0, 'pull-up')
    s.toggleDayBlock(0, 'pair-1')
    const mon = useStore.getState().settings.weeklyPlan![0]
    expect(mon.blocks).not.toContain('pair-1')
    expect(mon.add ?? []).not.toContain('goblet-squat')
    expect(mon.omit ?? []).not.toContain('pull')
  })
})

describe('store: splitting a workout into parts', () => {
  beforeEach(resetToPairsWeek)

  it('commits performed exercises and queues the rest as Part 2', () => {
    const s = useStore.getState()
    s.startDay(0)

    // Do only the first two exercises, then split.
    logAll('pull-up', 6, 6, 5)
    logAll('back-squat', 8, 8, 7)

    const summary = useStore.getState().splitSession()
    expect(summary?.split).toEqual({ remaining: MONDAY.length - 2, part: 2 })

    // Part A is recorded with only the two performed exercises.
    const sessions = useStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises.map((e) => e.exerciseId)).toEqual(['pull-up', 'back-squat'])

    // Part B is the active session: the remaining exercises, part 2, same group.
    const partB = useStore.getState().activeSession!
    expect(partB.part).toBe(2)
    expect(partB.exercises).toHaveLength(MONDAY.length - 2)
    expect(partB.groupId).toBe(sessions[0].groupId)
    expect(partB.exercises.every((e) => e.sets.every((x) => !x.done))).toBe(true)

    // Finish Part B → two sessions, but one logical workout for the week.
    logSet('bench-press', 0, 7)
    useStore.getState().finishSession()
    const all = useStore.getState().sessions
    expect(all).toHaveLength(2)
    expect(overview(all).thisWeek).toBe(1)
    expect(overview(all).totalWorkouts).toBe(1)
  })
})

describe('store: editing a workout in progress', () => {
  beforeEach(resetToPairsWeek)

  const ids = () => useStore.getState().activeSession!.exercises.map((e) => e.exerciseId)

  it('swaps an exercise for this workout only, at its own load', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.swapInSession('bench-press', 'incline-db-press')
    expect(ids()[2]).toBe('incline-db-press')
    const log = useStore.getState().activeSession!.exercises[2]
    expect(log.weightKg).toBe(10)
    expect(useStore.getState().settings.program?.bench).toBeUndefined() // plan untouched
  })

  it('never swaps away an exercise with logged sets, or into a duplicate', () => {
    const s = useStore.getState()
    s.startDay(0)
    logSet('bench-press', 0, 6)
    s.swapInSession('bench-press', 'db-bench-press')
    expect(ids()).toContain('bench-press')
    s.swapInSession('back-squat', 'bench-press') // already in the workout
    expect(ids()).toContain('back-squat')
  })

  it('adds an exercise in routine order and removes one', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.addToSession('lat-pulldown') // isolation → after Pair 3, before core
    const after = ids()
    expect(after.indexOf('lat-pulldown')).toBe(after.indexOf('machine-chest-press') + 1)
    expect(useStore.getState().progress['lat-pulldown'].currentWeightKg).toBe(40)
    s.addToSession('lat-pulldown') // no duplicates
    expect(ids().filter((id) => id === 'lat-pulldown')).toHaveLength(1)
    s.removeFromSession('deadlift')
    expect(ids()).not.toContain('deadlift')
    expect(useStore.getState().settings.weeklyPlan![0].omit ?? []).toEqual([]) // plan untouched
  })

  it('adds and removes sets without ever dropping a logged one', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.addSetToSession('bench-press')
    const sets = () => useStore.getState().activeSession!.exercises[2].sets
    expect(sets()).toHaveLength(4)
    logSet('bench-press', 0, 6)
    s.removeSetFromSession('bench-press')
    s.removeSetFromSession('bench-press')
    s.removeSetFromSession('bench-press')
    expect(sets()).toHaveLength(1)
    expect(sets()[0].done).toBe(true)
  })

  it('an extra, lighter set does not block a level-up', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.addSetToSession('bench-press')
    logAll('bench-press', 8, 8, 8, 5)
    useStore.getState().finishSession()
    expect(useStore.getState().progress['bench-press'].currentWeightKg).toBe(32.5)
  })
})

describe('store: the A/B program', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  const active = () => useStore.getState().activeSession!
  const log = (id: string) => active().exercises.find((e) => e.exerciseId === id)!

  it('Monday runs Session A as written, at the stated loads', () => {
    useStore.getState().startDay(0)
    expect(active().exercises.map((e) => `${e.exerciseId}@${e.slot} ${e.weightKg} ×${e.sets.length}`)).toEqual([
      'single-leg-leg-press@a-legs 50 ×3',
      'pull-up@a-pull -14 ×3',
      'db-bench-press@a-press 18 ×3',
      'db-rdl@a-hinge 16 ×3',
      'cable-row@a-row 35 ×3',
      'machine-ab-crunch@a-abs 50 ×3',
      'biceps-curl@a-biceps 8 ×2', // optional finisher, 2 sets
      'cable-pushdown@a-triceps 15 ×2',
    ])
  })

  it('levels up by the session’s scheme: top of the range on every set → next step', () => {
    useStore.getState().startDay(0)
    logAll('db-bench-press', 8, 8, 8) // 3 × 8 → +2 kg per dumbbell
    logAll('pull-up', 8, 8, 8) // 3 × 6–8 → 2 kg less assist
    logAll('cable-row', 10, 10, 9) // 3 × 10 not there yet
    logAll('biceps-curl', 12, 12) // the finisher's 2 sets at the top
    useStore.getState().finishSession()
    const prog = useStore.getState().progress
    expect(prog['db-bench-press'].currentWeightKg).toBe(20)
    expect(prog['pull-up'].currentWeightKg).toBe(-12)
    expect(prog['cable-row'].currentWeightKg).toBe(35)
    expect(prog['biceps-curl'].currentWeightKg).toBe(10)

    useStore.getState().startDay(2) // Session B
    logAll('lat-pulldown', 10, 10, 10) // 3 × 8–10 → next plate
    logAll('shoulder-press', 8, 8, 8) // 3 × 8
    useStore.getState().finishSession()
    expect(useStore.getState().progress['lat-pulldown'].currentWeightKg).toBe(45)
    expect(useStore.getState().progress['shoulder-press'].currentWeightKg).toBe(30)
  })

  it('a swap keeps the session’s slot, scheme and straight sets', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.swapInSession('cable-row', 'machine-row') // the cable is taken
    expect(log('machine-row').slot).toBe('a-row')
    // Machine row is 3 × 5–8 elsewhere; here it's Session A's 3 × 10.
    logAll('machine-row', 8, 8, 8)
    useStore.getState().finishSession()
    expect(useStore.getState().progress['machine-row'].currentWeightKg).toBe(35) // no jump at 8
    expect(useStore.getState().settings.program?.['a-row']).toBeUndefined() // plan untouched
  })

  it('swapping in the plan changes one session, not the other', () => {
    const s = useStore.getState()
    s.swapExercise('a-pull', 'lat-pulldown')
    s.startDay(0)
    expect(active().exercises.map((e) => e.exerciseId)).toContain('lat-pulldown')
    s.cancelSession()
    s.startDay(2)
    expect(active().exercises[1]).toMatchObject({ exerciseId: 'lat-pulldown', slot: 'b-pull' })
    // Session B's dip slot can't take a pull.
    s.swapExercise('b-dip', 'pull-up')
    expect(useStore.getState().settings.program?.['b-dip']).toBeUndefined()
  })

  it('adds into a session’s slot and splits keep each slot', () => {
    const s = useStore.getState()
    s.startDay(0)
    s.addToSession('zottman-curl', 'a-biceps')
    expect(log('zottman-curl')).toMatchObject({ slot: 'a-biceps' })
    expect(log('zottman-curl').sets).toHaveLength(2)
    logAll('single-leg-leg-press', 10, 10, 10)
    useStore.getState().splitSession()
    expect(active().exercises.find((e) => e.exerciseId === 'pull-up')?.slot).toBe('a-pull')
  })

  it('removing a session’s exercise from the day omits its slot; re-adding brings it back', () => {
    const s = useStore.getState()
    s.removeExerciseFromDay(0, 'cable-pushdown')
    expect(useStore.getState().settings.weeklyPlan![0].omit).toEqual(['a-triceps'])
    s.addExerciseToDay(0, 'cable-pushdown', 'a-triceps')
    expect(useStore.getState().settings.weeklyPlan![0]).toEqual({ blocks: ['session-a'], omit: [] })
  })

  it('moves a v2 install onto the program: Mon/Wed replaced, Fri kept, stated loads set once', async () => {
    const v2Plan = pairsWeek()
    v2Plan[4] = { blocks: ['pair-1', 'core'], add: ['face-pull'] } // a customised Friday
    const backup: BackupFile = {
      app: 'iron-ladder',
      version: 2,
      exportedAt: '2026-10-20T10:00:00Z',
      sessions: [],
      progress: [
        { exerciseId: 'pull-up', currentWeightKg: 0 },
        { exerciseId: 'lat-pulldown', currentWeightKg: 35, startConfirmed: true },
        { exerciseId: 'bench-press', currentWeightKg: 42.5 },
      ],
      bodyStats: [],
      settings: { restSeconds: 90, restAlert: true, version: 2, weeklyPlan: v2Plan, increments: { machine: 5 } },
    }
    await useStore.getState().importData(backup)
    const st = useStore.getState()
    expect(st.settings.version).toBe(3)
    expect(st.settings.weeklyPlan![0]).toEqual({ blocks: ['session-a'] })
    expect(st.settings.weeklyPlan![2]).toEqual({ blocks: ['session-b'] })
    expect(st.settings.weeklyPlan![4]).toEqual(v2Plan[4])
    expect(st.progress['pull-up'].currentWeightKg).toBe(-14)
    expect(st.progress['lat-pulldown']).toMatchObject({ currentWeightKg: 40, startConfirmed: true })
    expect(st.progress['db-bench-press'].currentWeightKg).toBe(18)
    expect(st.progress['bench-press'].currentWeightKg).toBe(42.5) // not part of the program

    // Once on v3, a later level-up is never reset.
    st.setExerciseWeight('lat-pulldown', 45)
    await flush()
    await useStore.getState().init()
    expect(useStore.getState().progress['lat-pulldown'].currentWeightKg).toBe(45)
  })
})
