import { create } from 'zustand'
import {
  EXERCISES,
  getExercise,
  type ExerciseKind,
} from '../program/exercises'
import { formatKg } from '../program/ladder'
import {
  applyProgression,
  assessStartWeight,
  type StartAssessment,
} from '../program/progression'
import { formatSeconds } from '../program/analytics'
import {
  deleteBodyStat as dbDeleteBodyStat,
  deleteSession as dbDeleteSession,
  exportBackup,
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
}

export type Overlay =
  | null
  | { name: 'workout' }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'session'; sessionId: string }
  | { name: 'summary'; summary: SessionSummary }

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
  startSession: () => void
  resumeSession: () => void
  cancelSession: () => void
  updateSet: (
    exerciseId: string,
    setIndex: number,
    patch: Partial<SetLog>,
  ) => void
  setWorkingWeight: (exerciseId: string, weightKg: number) => void
  setSessionBodyweight: (kg: number | undefined) => void
  finishSession: () => SessionSummary | null

  // manual progression overrides
  setExerciseWeight: (exerciseId: string, weightKg: number) => void
  setPlankTarget: (exerciseId: string, seconds: number) => void

  // body stats
  upsertBodyStat: (stat: BodyStat) => void
  removeBodyStat: (date: string) => void

  // settings + data
  updateSettings: (patch: Partial<Settings>) => void
  deleteSession: (id: string) => void
  exportData: () => Promise<BackupFile>
  importData: (file: BackupFile) => Promise<void>
  resetEverything: () => Promise<void>
}

function freshActiveSession(progress: Record<string, ExerciseProgress>): SessionLog {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    exercises: EXERCISES.map((def) => ({
      exerciseId: def.id,
      weightKg: progress[def.id]?.currentWeightKg ?? def.startWeightKg,
      sets: Array.from({ length: def.sets }, () => ({ done: false }) as SetLog),
    })),
  }
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
    const progress: Record<string, ExerciseProgress> = {}
    for (const p of data.progress) progress[p.exerciseId] = p
    set({
      loaded: true,
      sessions: data.sessions,
      progress,
      bodyStats: data.bodyStats,
      settings: data.settings,
      activeSession: data.activeSession,
    })
    void requestPersistentStorage()
  },

  setTab: (tab) => set({ tab, overlay: null }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),

  startSession: () => {
    const existing = get().activeSession
    const session = existing ?? freshActiveSession(get().progress)
    void putActiveSession(session)
    set({ activeSession: session, overlay: { name: 'workout' } })
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

  setSessionBodyweight: (kg) => {
    const active = get().activeSession
    if (!active) return
    const next = { ...active, bodyweightKg: kg }
    void putActiveSession(next)
    set({ activeSession: next })
  },

  finishSession: () => {
    const { activeSession, progress, sessions } = get()
    if (!activeSession) return null

    const newProgress: Record<string, ExerciseProgress> = { ...progress }
    const levelUps: LevelUp[] = []
    const startNudges: SessionSummary['startNudges'] = []
    let setsLogged = 0

    const committed = activeSession.exercises.map((log) => {
      const def = getExercise(log.exerciseId)
      const doneCount = log.sets.filter((s) => s.done).length
      setsLogged += doneCount
      if (doneCount === 0) return log // skipped — don't progress or judge it

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
        return {
          ...log,
          leveledUp: true,
          newWeightKg: res.newWeightKg,
          newSeconds: res.newSeconds,
        }
      }
      return log
    })

    const completedAt = new Date().toISOString()
    const finished: SessionLog = {
      ...activeSession,
      exercises: committed,
      completedAt,
    }
    const durationMin = Math.max(
      0,
      Math.round(
        (new Date(completedAt).getTime() -
          new Date(activeSession.startedAt).getTime()) /
          60000,
      ),
    )

    const summary: SessionSummary = {
      sessionId: finished.id,
      completedAt,
      durationMin,
      setsLogged,
      levelUps,
      startNudges,
    }

    void putSession(finished)
    void putProgress(Object.values(newProgress))
    void putActiveSession(null)

    set({
      sessions: [...sessions, finished],
      progress: newProgress,
      activeSession: null,
      overlay: { name: 'summary', summary },
    })
    return summary
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

  exportData: () => exportBackup(),

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
