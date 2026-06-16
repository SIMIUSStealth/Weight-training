import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'

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
