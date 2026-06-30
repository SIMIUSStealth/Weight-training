import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { overview } from '../program/analytics'

async function flush() {
  // let fire-and-forget IndexedDB writes settle
  await new Promise((r) => setTimeout(r, 60))
}

function logSet(exerciseId: string, i: number, value: number, time = false) {
  useStore
    .getState()
    .updateSet(exerciseId, i, time ? { seconds: value, done: true } : { reps: value, done: true })
}

describe('store: full workout → progression → persistence', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  it('levels up the right exercises, records nudges, and persists state', async () => {
    const s = useStore.getState()
    s.startSession()
    expect(useStore.getState().activeSession).not.toBeNull()

    // Floor Press: 3×12 at the starting 8 kg → should level up to 9 kg.
    logSet('floor-press', 0, 12)
    logSet('floor-press', 1, 12)
    logSet('floor-press', 2, 12)

    // Lateral Raise: 3×16 at 3,5 kg → level up AND flagged "too light".
    logSet('lateral-raise', 0, 16)
    logSet('lateral-raise', 1, 16)
    logSet('lateral-raise', 2, 16)

    // Plank: hold the 30 s target on all sets → target climbs to 40 s.
    logSet('plank', 0, 30, true)
    logSet('plank', 1, 32, true)
    logSet('plank', 2, 30, true)

    const summary = useStore.getState().finishSession()
    expect(summary).not.toBeNull()

    // in-memory progression
    const prog = useStore.getState().progress
    expect(prog['floor-press'].currentWeightKg).toBe(9)
    expect(prog['lateral-raise'].currentWeightKg).toBe(4.5)
    expect(prog['plank'].targetSeconds).toBe(40)

    // summary content
    const ids = summary!.levelUps.map((l) => l.exerciseId)
    expect(ids).toContain('floor-press')
    expect(ids).toContain('lateral-raise')
    expect(ids).toContain('plank')
    expect(summary!.startNudges).toContainEqual({
      exerciseId: 'lateral-raise',
      kind: 'too_light',
    })
    expect(summary!.setsLogged).toBe(9)

    // session recorded, active cleared
    expect(useStore.getState().sessions).toHaveLength(1)
    expect(useStore.getState().activeSession).toBeNull()

    // persistence: re-hydrate from IndexedDB and confirm the climb stuck
    await flush()
    await useStore.getState().init()
    expect(useStore.getState().progress['floor-press'].currentWeightKg).toBe(9)
    expect(useStore.getState().sessions).toHaveLength(1)
  })

  it('does not level up when sets fall short of the top', async () => {
    useStore.getState().startSession()
    logSet('biceps-curl', 0, 10)
    logSet('biceps-curl', 1, 9)
    logSet('biceps-curl', 2, 8)
    useStore.getState().finishSession()
    expect(useStore.getState().progress['biceps-curl'].currentWeightKg).toBe(8) // unchanged
  })
})

describe('store: backup', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  it('builds a backup from current state and stamps the time', async () => {
    const s = useStore.getState()
    s.startSession()
    logSet('floor-press', 0, 9)
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
})

describe('store: swapping exercises', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  it('swaps a slot, seeds progress, and builds the next session with the new exercise', () => {
    useStore.getState().swapExercise('arm-biceps', 'hammer-curl')
    expect(useStore.getState().settings.program?.['arm-biceps']).toBe('hammer-curl')
    expect(useStore.getState().progress['hammer-curl']?.currentWeightKg).toBe(8)

    useStore.getState().startSession()
    const ids = useStore.getState().activeSession!.exercises.map((e) => e.exerciseId)
    expect(ids).toHaveLength(11) // structure preserved
    expect(ids).toContain('hammer-curl')
    expect(ids).not.toContain('biceps-curl')
    expect(ids[0]).toBe('floor-press') // other slots untouched
  })

  it('rejects a swap to an exercise from a different slot', () => {
    useStore.getState().swapExercise('arm-biceps', 'plank') // plank is ab-core
    expect(useStore.getState().settings.program?.['arm-biceps']).toBeUndefined()
  })

  it('keeps each variation’s own progress when swapping back and forth', () => {
    const s = useStore.getState()
    s.swapExercise('arm-biceps', 'hammer-curl')
    s.setExerciseWeight('hammer-curl', 11.5)
    s.swapExercise('arm-biceps', 'biceps-curl') // back to base
    expect(useStore.getState().settings.program?.['arm-biceps']).toBe('biceps-curl')
    expect(useStore.getState().progress['hammer-curl'].currentWeightKg).toBe(11.5)
    expect(useStore.getState().progress['biceps-curl'].currentWeightKg).toBe(8)
  })
})

describe('store: splitting a workout into parts', () => {
  beforeEach(async () => {
    await useStore.getState().resetEverything()
  })

  it('commits performed exercises and queues the rest as Part 2', async () => {
    const s = useStore.getState()
    s.startSession()

    // Do only the first two exercises, then split.
    logSet('floor-press', 0, 10)
    logSet('floor-press', 1, 10)
    logSet('floor-press', 2, 10)
    logSet('chest-flye', 0, 10)
    logSet('chest-flye', 1, 10)
    logSet('chest-flye', 2, 9)

    const summary = useStore.getState().splitSession()
    expect(summary?.split).toEqual({ remaining: 9, part: 2 })

    // Part A is recorded with only the two performed exercises.
    const sessions = useStore.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises.map((e) => e.exerciseId)).toEqual([
      'floor-press',
      'chest-flye',
    ])

    // Part B is the active session: the 9 remaining exercises, part 2, same group.
    const partB = useStore.getState().activeSession!
    expect(partB).not.toBeNull()
    expect(partB.part).toBe(2)
    expect(partB.exercises).toHaveLength(9)
    expect(partB.groupId).toBe(sessions[0].groupId)
    expect(partB.exercises.every((e) => e.sets.every((x) => !x.done))).toBe(true)

    // Finish Part B → two sessions, but one logical workout for the week.
    logSet('overhead-press', 0, 9)
    useStore.getState().finishSession()
    const all = useStore.getState().sessions
    expect(all).toHaveLength(2)
    expect(overview(all).thisWeek).toBe(1)
    expect(overview(all).totalWorkouts).toBe(1)
  })
})
