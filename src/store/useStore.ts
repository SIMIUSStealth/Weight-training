import { create } from 'zustand'
import {
  EXERCISES_BY_ID,
  getExercise,
  getSlot,
  SLOTS_BY_ID,
  type ExerciseDef,
  type ExerciseKind,
  type Muscle,
} from '../program/exercises'
import {
  dayExercises,
  defaultWeeklyPlan,
  getWeeklyPlan,
  planExercises,
  selectedForSlot,
} from '../program/plan'
import { formatKg } from '../program/ladder'
import {
  applyProgression,
  assessStartWeight,
  defaultProgress,
  type StartAssessment,
} from '../program/progression'
import { formatSeconds } from '../program/analytics'
import {
  deleteBodyStat as dbDeleteBodyStat,
  deleteSession as dbDeleteSession,
  importBackup,
  loadAll,
  putActiveSession,
  putBodyStat,
  putProgress,
  putSession,
  putSettings,
  requestPersistentStorage,
  resetAll as dbResetAll,
} from '../storage/db'
import type {
  BackupFile,
  BodyStat,
  DayPlan,
  ExerciseLog,
  ExerciseProgress,
  SessionLog,
  Settings,
  SetLog,
} from '../storage/types'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export type Tab = 'today' | 'progress' | 'history' | 'settings'

export interface LevelUp {
  exerciseId: string
  kind: ExerciseKind
  from: string
  to: string
}

export interface SessionSummary {
  sessionId: string
  completedAt: string
  durationMin: number
  setsLogged: number
  levelUps: LevelUp[]
  startNudges: { exerciseId: string; kind: Exclude<StartAssessment, null> }[]
  /** Number of sets taken to failure (RIR 0) this session, for a fatigue nudge. */
  failureSets: number
  /** Present when the session was split — the rest is queued as a later part. */
  split?: { remaining: number; part: number }
}

export type Overlay =
  | null
  | { name: 'workout' }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'session'; sessionId: string }
  | { name: 'summary'; summary: SessionSummary }
  | { name: 'day'; weekday: number }

interface StoreState {
  loaded: boolean
  sessions: SessionLog[]
  progress: Record<string, ExerciseProgress>
  bodyStats: BodyStat[]
  settings: Settings
  activeSession: SessionLog | null

  tab: Tab
  overlay: Overlay

  // lifecycle
  init: () => Promise<void>

  // navigation
  setTab: (tab: Tab) => void
  openOverlay: (overlay: Overlay) => void
  closeOverlay: () => void

  // workout flow
  startDay: (weekday: number) => void
  resumeSession: () => void
  cancelSession: () => void
  updateSet: (
    exerciseId: string,
    setIndex: number,
    patch: Partial<SetLog>,
  ) => void
  setWorkingWeight: (exerciseId: string, weightKg: number) => void
  finishSession: () => SessionSummary | null
  /** Finish the performed exercises now and queue the untouched ones as a later part. */
  splitSession: () => SessionSummary | null

  // program / swaps
  swapExercise: (slotId: string, exerciseId: string) => void

  // weekly plan editing
  toggleDayMuscle: (weekday: number, muscle: string) => void
  addExerciseToDay: (weekday: number, exerciseId: string) => void
  removeExerciseFromDay: (weekday: number, exerciseId: string) => void

  // manual progression overrides
  setExerciseWeight: (exerciseId: string, weightKg: number) => void
  setPlankTarget: (exerciseId: string, seconds: number) => void

  // body stats
  upsertBodyStat: (stat: BodyStat) => void
  removeBodyStat: (date: string) => void

  // settings + data
  updateSettings: (patch: Partial<Settings>) => void
  deleteSession: (id: string) => void
  /** Build a backup object from the current in-memory state (synchronous). */
  getBackup: () => BackupFile
  /** Stamp "last backed up" as now. */
  recordBackup: () => void
  importData: (file: BackupFile) => Promise<void>
  resetEverything: () => Promise<void>
}

function sessionFromExercises(
  defs: ExerciseDef[],
  progress: Record<string, ExerciseProgress>,
  weekday: number,
): SessionLog {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    part: 1,
    weekday,
    exercises: defs.map((def) => ({
      exerciseId: def.id,
      weightKg: progress[def.id]?.currentWeightKg ?? def.startWeightKg,
      sets: Array.from({ length: def.sets }, () => ({ done: false }) as SetLog),
    })),
  }
}

/** Deep-ish copy of a weekly plan so edits never mutate stored state. */
function clonePlan(plan: DayPlan[]): DayPlan[] {
  return plan.map((d) => ({
    muscles: [...d.muscles],
    omit: d.omit ? [...d.omit] : undefined,
    add: d.add ? [...d.add] : undefined,
  }))
}

/** Ensure every exercise in `defs` has a progression row, seeding any missing. */
function withSeededProgress(
  defs: ExerciseDef[],
  progress: Record<string, ExerciseProgress>,
): { progress: Record<string, ExerciseProgress>; seeded: ExerciseProgress[] } {
  const next = { ...progress }
  const seeded: ExerciseProgress[] = []
  for (const def of defs) {
    if (!next[def.id]) {
      const p = defaultProgress(def)
      next[def.id] = p
      seeded.push(p)
    }
  }
  return { progress: next, seeded }
}

interface CommitResult {
  /** Only the exercises that had at least one completed set. */
  committedExercises: ExerciseLog[]
  newProgress: Record<string, ExerciseProgress>
  levelUps: LevelUp[]
  startNudges: SessionSummary['startNudges']
  setsLogged: number
  failureSets: number
}

/**
 * Apply double-progression to every performed exercise in a session and collect
 * what changed. Untouched exercises (zero completed sets) are dropped from the
 * committed record — when splitting they carry over to the next part instead.
 */
function commitActive(
  active: SessionLog,
  sessions: SessionLog[],
  progress: Record<string, ExerciseProgress>,
): CommitResult {
  const newProgress: Record<string, ExerciseProgress> = { ...progress }
  const levelUps: LevelUp[] = []
  const startNudges: SessionSummary['startNudges'] = []
  const committedExercises: ExerciseLog[] = []
  let setsLogged = 0
  let failureSets = 0

  for (const log of active.exercises) {
    const doneCount = log.sets.filter((s) => s.done).length
    if (doneCount === 0) continue
    setsLogged += doneCount
    failureSets += log.sets.filter((s) => s.done && s.rir === 0).length

    const def = getExercise(log.exerciseId)
    const hadPrior = sessions.some(
      (s) =>
        s.completedAt &&
        s.exercises.some(
          (e) => e.exerciseId === log.exerciseId && e.sets.some((x) => x.done),
        ),
    )

    const before = newProgress[log.exerciseId]
    const res = applyProgression(def, before, log)
    newProgress[log.exerciseId] = res.progress

    const nudge = assessStartWeight(def, log, hadPrior)
    if (nudge) startNudges.push({ exerciseId: log.exerciseId, kind: nudge })

    if (res.leveledUp) {
      if (def.kind === 'time') {
        levelUps.push({
          exerciseId: log.exerciseId,
          kind: def.kind,
          from: formatSeconds(before.targetSeconds ?? def.startSeconds ?? 0),
          to: formatSeconds(res.newSeconds ?? 0),
        })
      } else {
        levelUps.push({
          exerciseId: log.exerciseId,
          kind: def.kind,
          from: formatKg(before.currentWeightKg),
          to: formatKg(res.newWeightKg ?? before.currentWeightKg),
        })
      }
      committedExercises.push({
        ...log,
        leveledUp: true,
        newWeightKg: res.newWeightKg,
        newSeconds: res.newSeconds,
      })
    } else {
      committedExercises.push(log)
    }
  }

  return {
    committedExercises,
    newProgress,
    levelUps,
    startNudges,
    setsLogged,
    failureSets,
  }
}

function durationMinutes(startedAt: string, completedAt: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 60000),
  )
}

export const useStore = create<StoreState>((set, get) => ({
  loaded: false,
  sessions: [],
  progress: {},
  bodyStats: [],
  settings: { restSeconds: 75, restAlert: true, version: 1 },
  activeSession: null,
  tab: 'today',
  overlay: null,

  init: async () => {
    const data = await loadAll()
    // Seed the default weekly plan on first run.
    let settings = data.settings
    if (!settings.weeklyPlan) {
      settings = { ...settings, weeklyPlan: defaultWeeklyPlan() }
      void putSettings(settings)
    }
    const loaded: Record<string, ExerciseProgress> = {}
    for (const p of data.progress) loaded[p.exerciseId] = p
    // Make sure every exercise the plan can use has a progression row.
    const plan = getWeeklyPlan(settings.weeklyPlan)
    const { progress, seeded } = withSeededProgress(
      planExercises(plan, settings.program),
      loaded,
    )
    if (seeded.length) void putProgress(seeded)
    set({
      loaded: true,
      sessions: data.sessions,
      progress,
      bodyStats: data.bodyStats,
      settings,
      activeSession: data.activeSession,
    })
    void requestPersistentStorage()
  },

  setTab: (tab) => set({ tab, overlay: null }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),

  startDay: (weekday) => {
    if (get().activeSession) return // finish or discard the current one first
    const { settings, progress } = get()
    const plan = getWeeklyPlan(settings.weeklyPlan)
    const day = plan[weekday]
    if (!day || !day.muscles.length) return
    const defs = dayExercises(day, settings.program)
    if (!defs.length) return
    const res = withSeededProgress(defs, progress)
    if (res.seeded.length) void putProgress(res.seeded)
    const session = sessionFromExercises(defs, res.progress, weekday)
    void putActiveSession(session)
    set({
      progress: res.progress,
      activeSession: session,
      overlay: { name: 'workout' },
    })
  },

  resumeSession: () => {
    if (get().activeSession) set({ overlay: { name: 'workout' } })
  },

  cancelSession: () => {
    void putActiveSession(null)
    set({ activeSession: null, overlay: null })
  },

  updateSet: (exerciseId, setIndex, patch) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex
      const sets = ex.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s))
      return { ...ex, sets }
    })
    const next = { ...active, exercises }
    // A split continuation is created at the moment of the split but may be
    // picked up hours or days later — re-stamp its start at the first logged
    // set so the session duration reflects the actual sitting.
    if (
      patch.done === true &&
      (active.part ?? 1) > 1 &&
      !active.exercises.some((ex) => ex.sets.some((s) => s.done))
    ) {
      next.startedAt = new Date().toISOString()
    }
    void putActiveSession(next)
    set({ activeSession: next })
  },

  setWorkingWeight: (exerciseId, weightKg) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, weightKg } : ex,
    )
    const next = { ...active, exercises }
    void putActiveSession(next)
    set({ activeSession: next })
  },

  finishSession: () => {
    const { activeSession, progress, sessions } = get()
    if (!activeSession) return null

    const r = commitActive(activeSession, sessions, progress)
    if (r.committedExercises.length === 0) {
      // nothing was actually performed — discard the empty session
      void putActiveSession(null)
      set({ activeSession: null, overlay: null })
      return null
    }

    const completedAt = new Date().toISOString()
    const finished: SessionLog = {
      ...activeSession,
      exercises: r.committedExercises,
      completedAt,
      part: activeSession.part ?? 1,
    }
    const summary: SessionSummary = {
      sessionId: finished.id,
      completedAt,
      durationMin: durationMinutes(activeSession.startedAt, completedAt),
      setsLogged: r.setsLogged,
      levelUps: r.levelUps,
      startNudges: r.startNudges,
      failureSets: r.failureSets,
    }

    void putSession(finished)
    void putProgress(Object.values(r.newProgress))
    void putActiveSession(null)

    set({
      sessions: [...sessions, finished],
      progress: r.newProgress,
      activeSession: null,
      overlay: { name: 'summary', summary },
    })
    return summary
  },

  splitSession: () => {
    const { activeSession, progress, sessions } = get()
    if (!activeSession) return null

    const remaining = activeSession.exercises.filter(
      (e) => !e.sets.some((s) => s.done),
    )
    // Nothing left untouched → this is just a normal finish.
    if (remaining.length === 0) return get().finishSession()

    const r = commitActive(activeSession, sessions, progress)
    // Nothing performed yet → nothing to commit; leave the workout as-is.
    if (r.committedExercises.length === 0) return null

    const groupId = activeSession.groupId ?? activeSession.id
    const part = activeSession.part ?? 1
    const completedAt = new Date().toISOString()

    const finished: SessionLog = {
      ...activeSession,
      exercises: r.committedExercises,
      completedAt,
      groupId,
      part,
    }
    const partB: SessionLog = {
      id: uid(),
      startedAt: new Date().toISOString(),
      groupId,
      part: part + 1,
      weekday: activeSession.weekday,
      exercises: remaining.map((e) => ({
        exerciseId: e.exerciseId,
        weightKg: e.weightKg,
        sets: e.sets.map(() => ({ done: false }) as SetLog),
      })),
    }

    const summary: SessionSummary = {
      sessionId: finished.id,
      completedAt,
      durationMin: durationMinutes(activeSession.startedAt, completedAt),
      setsLogged: r.setsLogged,
      levelUps: r.levelUps,
      startNudges: r.startNudges,
      failureSets: r.failureSets,
      split: { remaining: remaining.length, part: part + 1 },
    }

    void putSession(finished)
    void putProgress(Object.values(r.newProgress))
    void putActiveSession(partB)

    set({
      sessions: [...sessions, finished],
      progress: r.newProgress,
      activeSession: partB,
      overlay: { name: 'summary', summary },
    })
    return summary
  },

  swapExercise: (slotId, exerciseId) => {
    const def = getExercise(exerciseId)
    if (def.slot !== slotId) return // only swap within the same slot
    const program = { ...(get().settings.program ?? {}), [slotId]: exerciseId }
    get().updateSettings({ program })
    const res = withSeededProgress([def], get().progress)
    if (res.seeded.length) {
      void putProgress(res.seeded)
      set({ progress: res.progress })
    }
  },

  toggleDayMuscle: (weekday, muscle) => {
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    if (day.muscles.includes(muscle as Muscle)) {
      day.muscles = day.muscles.filter((m) => m !== muscle)
      day.omit = day.omit?.filter((id) => SLOTS_BY_ID[id]?.muscle !== muscle)
      // Lookup defensively — a plan imported from another device/version may
      // reference exercise ids this build doesn't know.
      day.add = day.add?.filter((id) => EXERCISES_BY_ID[id]?.muscle !== muscle)
    } else {
      day.muscles = [...day.muscles, muscle as Muscle]
    }
    get().updateSettings({ weeklyPlan: plan })
    const res = withSeededProgress(
      dayExercises(day, get().settings.program),
      get().progress,
    )
    if (res.seeded.length) {
      void putProgress(res.seeded)
      set({ progress: res.progress })
    }
  },

  addExerciseToDay: (weekday, exerciseId) => {
    const def = getExercise(exerciseId)
    const slot = getSlot(exerciseId)
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    if (!day.muscles.includes(def.muscle)) day.muscles = [...day.muscles, def.muscle]
    const isSlotDefault =
      slot && selectedForSlot(slot.id, get().settings.program) === exerciseId
    if (isSlotDefault) {
      day.omit = day.omit?.filter((id) => id !== slot.id)
    } else if (!(day.add ?? []).includes(exerciseId)) {
      day.add = [...(day.add ?? []), exerciseId]
    }
    get().updateSettings({ weeklyPlan: plan })
    const res = withSeededProgress([def], get().progress)
    if (res.seeded.length) {
      void putProgress(res.seeded)
      set({ progress: res.progress })
    }
  },

  removeExerciseFromDay: (weekday, exerciseId) => {
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    if ((day.add ?? []).includes(exerciseId)) {
      day.add = (day.add ?? []).filter((id) => id !== exerciseId)
    }
    // If the exercise is (also) the slot's current selection, omit the slot —
    // an exercise can be both added and slot-selected (added first, swapped in
    // later), and removing it must clear both in one tap.
    const slot = getSlot(exerciseId)
    if (
      slot &&
      selectedForSlot(slot.id, get().settings.program) === exerciseId &&
      !(day.omit ?? []).includes(slot.id)
    ) {
      day.omit = [...(day.omit ?? []), slot.id]
    }
    // Drop the muscle entirely if it has no exercises left.
    const muscle = getExercise(exerciseId).muscle
    const left = dayExercises(
      { ...day, muscles: [muscle] },
      get().settings.program,
    ).length
    if (left === 0) day.muscles = day.muscles.filter((m) => m !== muscle)
    get().updateSettings({ weeklyPlan: plan })
  },

  setExerciseWeight: (exerciseId, weightKg) => {
    const progress = { ...get().progress }
    const cur = progress[exerciseId]
    if (!cur) return
    const next = { ...cur, currentWeightKg: weightKg }
    progress[exerciseId] = next
    void putProgress([next])
    set({ progress })
  },

  setPlankTarget: (exerciseId, seconds) => {
    const progress = { ...get().progress }
    const cur = progress[exerciseId]
    if (!cur) return
    const next = { ...cur, targetSeconds: Math.max(0, seconds) }
    progress[exerciseId] = next
    void putProgress([next])
    set({ progress })
  },

  upsertBodyStat: (stat) => {
    const others = get().bodyStats.filter((b) => b.date !== stat.date)
    const bodyStats = [...others, stat].sort((a, b) =>
      a.date < b.date ? 1 : -1,
    )
    void putBodyStat(stat)
    set({ bodyStats })
  },

  removeBodyStat: (date) => {
    void dbDeleteBodyStat(date)
    set({ bodyStats: get().bodyStats.filter((b) => b.date !== date) })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    void putSettings(settings)
    set({ settings })
  },

  deleteSession: (id) => {
    void dbDeleteSession(id)
    set({ sessions: get().sessions.filter((s) => s.id !== id), overlay: null })
  },

  getBackup: () => {
    const { sessions, progress, bodyStats, settings } = get()
    return {
      app: 'iron-ladder',
      version: settings.version ?? 1,
      exportedAt: new Date().toISOString(),
      sessions,
      progress: Object.values(progress),
      bodyStats,
      settings,
    }
  },

  recordBackup: () =>
    get().updateSettings({ lastBackupAt: new Date().toISOString() }),

  importData: async (file) => {
    await importBackup(file)
    await get().init()
  },

  resetEverything: async () => {
    await dbResetAll()
    await get().init()
    set({ tab: 'today', overlay: null })
  },
}))
