import { create } from 'zustand'
import {
  EXERCISES_BY_ID,
  effectiveDef,
  getExercise,
  isBlockId,
  slotFor,
  SLOTS,
  SLOTS_BY_ID,
  type BlockId,
  type ExerciseDef,
  type ExerciseKind,
} from '../program/exercises'
import {
  dayEntries,
  dayExercises,
  defaultWeeklyPlan,
  extraSlot,
  getWeeklyPlan,
  isCurrentPlan,
  planExercises,
  selectedForSlot,
  type DayEntry,
} from '../program/plan'
import { formatLoad, resolveIncrements, type Increments } from '../program/ladder'
import {
  MAX_SETS,
  applyProgression,
  assessStartWeight,
  defaultProgress,
  startingSets,
  type StartAssessment,
} from '../program/progression'
import { detectPRs, restampPRs } from '../program/records'
import { normalizeLoads } from '../program/sets'
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
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type BackupFile,
  type BodyStat,
  type DayPlan,
  type ExerciseLog,
  type ExerciseProgress,
  type PRRecord,
  type SessionLog,
  type Settings,
  type SetLog,
} from '../storage/types'

/** What the banner says when a write to the device fails. */
const SAVE_FAILED =
  'Couldn’t save to this device — your latest changes may be lost if the app closes. Back up now.'

/**
 * Run a write to the device without waiting on it. A failure (storage full,
 * evicted, a private tab) raises the save-error banner instead of passing
 * silently — the data is still in memory, so a backup can still rescue it.
 */
function save(write: Promise<unknown>): void {
  write.catch(() => useStore.setState({ saveError: SAVE_FAILED }))
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export type Tab = 'today' | 'progress' | 'history' | 'stretch' | 'settings'

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
  /** Personal records set this session. */
  prs: PRRecord[]
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
  /** Set when a write to the device failed, until dismissed. */
  saveError: string | null

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
  /**
   * Change the exercise's working load: the sets still to do follow it, the
   * ones already logged keep the load they were logged at.
   */
  setWorkingWeight: (exerciseId: string, weightKg: number) => void
  /**
   * Change one set's load — and, for a set still to do, the unlogged sets
   * after it (a load changed on set 2 is the load for set 3 too).
   */
  setSetWeight: (exerciseId: string, setIndex: number, weightKg: number) => void
  /** A note on an exercise in the workout in progress. */
  setExerciseNote: (exerciseId: string, note: string) => void
  /** Mid-workout edits (this session only — the weekly plan is untouched). */
  swapInSession: (exerciseId: string, toId: string) => void
  /** Add an exercise, into `slotId` (one that offers it) or its home slot. */
  addToSession: (exerciseId: string, slotId?: string) => void
  removeFromSession: (exerciseId: string) => void
  addSetToSession: (exerciseId: string) => void
  removeSetFromSession: (exerciseId: string) => void
  finishSession: () => SessionSummary | null
  /** Finish the performed exercises now and queue the untouched ones as a later part. */
  splitSession: () => SessionSummary | null

  // program / swaps
  swapExercise: (slotId: string, exerciseId: string) => void

  // weekly plan editing
  toggleDayBlock: (weekday: number, block: BlockId) => void
  /** Add an exercise to a day — for `slotId`, when picked from a block's list. */
  addExerciseToDay: (weekday: number, exerciseId: string, slotId?: string) => void
  removeExerciseFromDay: (weekday: number, exerciseId: string) => void

  // manual progression overrides
  setExerciseWeight: (exerciseId: string, weightKg: number) => void
  setTimeTarget: (exerciseId: string, seconds: number) => void

  // body stats
  upsertBodyStat: (stat: BodyStat) => void
  removeBodyStat: (date: string) => void

  // settings + data
  updateSettings: (patch: Partial<Settings>) => void
  deleteSession: (id: string) => void
  /**
   * Save an edited past session (reps, loads, notes, date). Current loads are
   * left alone; personal-record stamps are re-derived across the whole log.
   */
  updateSession: (session: SessionLog) => void
  dismissSaveError: () => void
  /** Build a backup object from the current in-memory state (synchronous). */
  getBackup: () => BackupFile
  /** Stamp "last backed up" as now. */
  recordBackup: () => void
  importData: (file: BackupFile) => Promise<void>
  resetEverything: () => Promise<void>
}

/**
 * A fresh log for one exercise in a slot, at the current load: the slot's set
 * count, or as many as were done there last time (see startingSets).
 */
function newLog(
  def: ExerciseDef,
  slotId: string,
  progress: Record<string, ExerciseProgress>,
  sessions: SessionLog[],
): ExerciseLog {
  return {
    exerciseId: def.id,
    slot: slotId,
    weightKg: progress[def.id]?.currentWeightKg ?? def.startWeightKg,
    sets: Array.from(
      { length: startingSets(effectiveDef(def, slotId), slotId, sessions) },
      () => ({ done: false }) as SetLog,
    ),
  }
}

function sessionFromEntries(
  entries: DayEntry[],
  progress: Record<string, ExerciseProgress>,
  weekday: number,
  sessions: SessionLog[],
): SessionLog {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    part: 1,
    weekday,
    exercises: entries.map((e) => newLog(e.def, e.slotId, progress, sessions)),
  }
}

/**
 * A workout left open: opened this long before its first set, or finished this
 * long after its last one, it is timed by the sets themselves instead.
 */
const IDLE_MS = 30 * 60_000

/**
 * When a workout ended: now — unless its last set was ticked off a good while
 * ago (Finish tapped the next morning, or days later), in which case it ended
 * with that set. Keeps the session on the day it was trained, in the right
 * week, with a real duration.
 */
function finishedAt(active: SessionLog, now = Date.now()): string {
  let last = 0
  for (const ex of active.exercises) {
    for (const s of ex.sets) {
      const t = s.done && s.at ? Date.parse(s.at) : NaN
      if (t > last) last = t
    }
  }
  // Never before the start, whatever the clock did in between.
  const from = Math.max(last, Date.parse(active.startedAt) || 0)
  return new Date(last && now - last > IDLE_MS ? Math.min(from, now) : now).toISOString()
}

/** Deep-ish copy of a weekly plan so edits never mutate stored state. */
function clonePlan(plan: DayPlan[]): DayPlan[] {
  return plan.map((d) => ({
    blocks: [...d.blocks],
    omit: d.omit ? [...d.omit] : undefined,
    add: d.add ? [...d.add] : undefined,
  }))
}

/** Slot ids of one routine block. */
function blockSlotIds(block: BlockId): Set<string> {
  return new Set(SLOTS.filter((s) => s.block === block).map((s) => s.id))
}

/**
 * Bring stored settings up to the current schema. v1 was the single-dumbbell
 * home program with muscle-group days: its weekly plan (and slot swaps, which
 * name home slots) can't carry over, so the gym week replaces them. v2 → v3:
 * the A/B program takes over Monday (Session A) and Wednesday (Session B);
 * the other days stay as they were. History, progress and every other
 * setting are kept.
 */
export function migrateSettings(settings: Settings): Settings {
  let next = settings
  if (!isCurrentPlan(next.weeklyPlan)) {
    next = { ...next, weeklyPlan: defaultWeeklyPlan() }
    if (next.program) {
      const program = Object.fromEntries(
        Object.entries(next.program).filter(([slotId]) => SLOTS_BY_ID[slotId]),
      )
      next = { ...next, program }
    }
  } else if ((next.version ?? 1) < 3) {
    const plan = clonePlan(next.weeklyPlan)
    plan[0] = { blocks: ['session-a'] }
    plan[2] = { blocks: ['session-b'] }
    next = { ...next, weeklyPlan: plan }
  }
  if ((next.version ?? 1) < SETTINGS_VERSION) next = { ...next, version: SETTINGS_VERSION }
  return next
}

/**
 * The A/B program names the loads to start from (14 kg assist on the pull-up,
 * 18 kg dumbbells on the bench, …) — they are these exercises' start loads.
 * Moving an install onto the program sets them once; progression takes over
 * from there.
 */
const AB_STATED_LOADS = [
  'pull-up',
  'db-bench-press',
  'cable-row',
  'machine-ab-crunch',
  'lat-pulldown',
  'shoulder-press',
  'dip',
]

/** Progress rows for the A/B program's stated loads (see AB_STATED_LOADS). */
function abStartLoads(progress: Record<string, ExerciseProgress>): ExerciseProgress[] {
  return AB_STATED_LOADS.map((id) => {
    const def = getExercise(id)
    return { ...(progress[id] ?? defaultProgress(def)), currentWeightKg: def.startWeightKg }
  })
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
  increments: Increments,
): CommitResult {
  const newProgress: Record<string, ExerciseProgress> = { ...progress }
  const levelUps: LevelUp[] = []
  const startNudges: SessionSummary['startNudges'] = []
  const committedExercises: ExerciseLog[] = []
  let setsLogged = 0
  let failureSets = 0

  for (const raw of active.exercises) {
    const doneCount = raw.sets.filter((s) => s.done).length
    if (doneCount === 0) continue
    // The working load is the one most sets were done at; the odd ones out
    // (a top set, a drop set) keep their own. Blank notes aren't kept.
    const { note, ...rest } = normalizeLoads(raw)
    const log: ExerciseLog = note?.trim() ? { ...rest, note: note.trim() } : rest
    setsLogged += doneCount
    failureSets += log.sets.filter((s) => s.done && s.rir === 0).length

    // Judged by the scheme of the slot it ran in (Session A's 3 × 8, …).
    const def = effectiveDef(getExercise(log.exerciseId), log.slot)
    const hadPrior = sessions.some(
      (s) =>
        s.completedAt &&
        s.exercises.some(
          (e) => e.exerciseId === log.exerciseId && e.sets.some((x) => x.done),
        ),
    )

    // A session from before an exercise had a progress row (e.g. imported)
    // commits against its defaults.
    const before = newProgress[log.exerciseId] ?? defaultProgress(def)
    const res = applyProgression(def, before, log, increments)
    newProgress[log.exerciseId] = res.progress

    const nudge = assessStartWeight(def, log, hadPrior)
    if (nudge) startNudges.push({ exerciseId: log.exerciseId, kind: nudge })

    if (res.leveledUp) {
      if (res.newSeconds != null) {
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
          from: formatLoad(def.equipment, before.currentWeightKg),
          to: formatLoad(def.equipment, res.newWeightKg ?? before.currentWeightKg),
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
  saveError: null,
  sessions: [],
  progress: {},
  bodyStats: [],
  settings: { ...DEFAULT_SETTINGS },
  activeSession: null,
  tab: 'today',
  overlay: null,

  init: async () => {
    const data = await loadAll()
    // Seed the gym week on first run; replace a pre-gym (v1) plan.
    const settings = migrateSettings(data.settings)
    if (settings !== data.settings) save(putSettings(settings))
    const loaded: Record<string, ExerciseProgress> = {}
    for (const p of data.progress) loaded[p.exerciseId] = p
    if ((data.settings.version ?? 1) < 3) {
      const restarted = abStartLoads(loaded)
      for (const p of restarted) loaded[p.exerciseId] = p
      save(putProgress(restarted))
    }
    // Make sure every exercise the plan can use has a progression row.
    const plan = getWeeklyPlan(settings.weeklyPlan)
    const { progress, seeded } = withSeededProgress(
      planExercises(plan, settings.program),
      loaded,
    )
    if (seeded.length) save(putProgress(seeded))
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
    if (!day || !day.blocks.length) return
    const entries = dayEntries(day, settings.program)
    if (!entries.length) return
    const res = withSeededProgress(
      entries.map((e) => e.def),
      progress,
    )
    if (res.seeded.length) save(putProgress(res.seeded))
    const session = sessionFromEntries(entries, res.progress, weekday, get().sessions)
    save(putActiveSession(session))
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
    save(putActiveSession(null))
    set({ activeSession: null, overlay: null })
  },

  updateSet: (exerciseId, setIndex, patch) => {
    const active = get().activeSession
    if (!active) return
    const now = new Date()
    const exercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex
      const sets = ex.sets.map((s, i) => {
        if (i !== setIndex) return s
        const merged: SetLog = { ...s, ...patch }
        // Stamp the moment a set is ticked off (kept through later rep / effort
        // edits, dropped if it's un-ticked) — see finishedAt.
        if (patch.done === true && !s.done) merged.at = now.toISOString()
        else if (patch.done === false) delete merged.at
        return merged
      })
      return { ...ex, sets }
    })
    const next = { ...active, exercises }
    // A split continuation is created at the moment of the split but may be
    // picked up hours or days later, and any workout can be opened long before
    // the first rep — re-stamp the start at the first logged set so the
    // session duration reflects the actual sitting.
    if (
      patch.done === true &&
      !active.exercises.some((ex) => ex.sets.some((s) => s.done)) &&
      ((active.part ?? 1) > 1 || now.getTime() - Date.parse(active.startedAt) > IDLE_MS)
    ) {
      next.startedAt = now.toISOString()
    }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  setWorkingWeight: (exerciseId, weightKg) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex
      const sets = ex.sets.map((s): SetLog => {
        // Logged at the old load: pin it there. Still to do: follow the new one.
        if (s.done) return s.weightKg == null ? { ...s, weightKg: ex.weightKg } : s
        const { weightKg: _own, ...rest } = s
        return rest
      })
      return { ...ex, weightKg, sets }
    })
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  setSetWeight: (exerciseId, setIndex, weightKg) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId || !ex.sets[setIndex]) return ex
      const carries = !ex.sets[setIndex].done
      const sets = ex.sets.map((s, i): SetLog =>
        i === setIndex || (carries && i > setIndex && !s.done) ? { ...s, weightKg } : s,
      )
      return { ...ex, sets }
    })
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  setExerciseNote: (exerciseId, note) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, note } : ex,
    )
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  swapInSession: (exerciseId, toId) => {
    const active = get().activeSession
    if (!active || exerciseId === toId) return
    const to = EXERCISES_BY_ID[toId]
    if (!to || to.retired) return
    if (active.exercises.some((e) => e.exerciseId === toId)) return
    const from = active.exercises.find((e) => e.exerciseId === exerciseId)
    // Never throw away logged sets — swap only an exercise not yet started.
    if (!from || from.sets.some((s) => s.done)) return
    const res = withSeededProgress([to], get().progress)
    if (res.seeded.length) save(putProgress(res.seeded))
    // The swap takes over the slot, so it keeps the session's block and scheme.
    const exercises = active.exercises.map((ex) =>
      ex.exerciseId === exerciseId
        ? {
            exerciseId: toId,
            slot: ex.slot,
            weightKg: res.progress[toId]?.currentWeightKg ?? to.startWeightKg,
            sets: Array.from({ length: Math.max(ex.sets.length, 1) }, () => ({ done: false }) as SetLog),
          }
        : ex,
    )
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next, progress: res.progress })
  },

  addToSession: (exerciseId, slotId) => {
    const active = get().activeSession
    const def = EXERCISES_BY_ID[exerciseId]
    const slot = slotFor(exerciseId, slotId)
    if (!active || !def || def.retired || !slot) return
    if (active.exercises.some((e) => e.exerciseId === exerciseId)) return
    const res = withSeededProgress([def], get().progress)
    if (res.seeded.length) save(putProgress(res.seeded))
    const log = newLog(def, slot.id, res.progress, get().sessions)
    // Slot it in at its place in the routine order.
    const order = (e: ExerciseLog) => {
      const s = slotFor(e.exerciseId, e.slot)
      const i = s ? SLOTS.indexOf(s) : -1
      return i === -1 ? SLOTS.length : i
    }
    const exercises = [...active.exercises]
    let at = exercises.findIndex((e) => order(e) > order(log))
    if (at === -1) at = exercises.length
    exercises.splice(at, 0, log)
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next, progress: res.progress })
  },

  removeFromSession: (exerciseId) => {
    const active = get().activeSession
    if (!active || active.exercises.length <= 1) return
    const next = {
      ...active,
      exercises: active.exercises.filter((e) => e.exerciseId !== exerciseId),
    }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  addSetToSession: (exerciseId) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) =>
      ex.exerciseId === exerciseId && ex.sets.length < MAX_SETS
        ? { ...ex, sets: [...ex.sets, { done: false } as SetLog] }
        : ex,
    )
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  removeSetFromSession: (exerciseId) => {
    const active = get().activeSession
    if (!active) return
    const exercises = active.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId || ex.sets.length <= 1) return ex
      // Drop the last set that isn't logged yet; logged sets are never lost.
      const i = ex.sets.map((s) => s.done).lastIndexOf(false)
      if (i === -1) return ex
      return { ...ex, sets: ex.sets.filter((_, j) => j !== i) }
    })
    const next = { ...active, exercises }
    save(putActiveSession(next))
    set({ activeSession: next })
  },

  finishSession: () => {
    const { activeSession, progress, sessions } = get()
    if (!activeSession) return null

    const r = commitActive(
      activeSession,
      sessions,
      progress,
      resolveIncrements(get().settings.increments),
    )
    if (r.committedExercises.length === 0) {
      // nothing was actually performed — discard the empty session
      save(putActiveSession(null))
      set({ activeSession: null, overlay: null })
      return null
    }

    const completedAt = finishedAt(activeSession)
    const finished: SessionLog = {
      ...activeSession,
      exercises: r.committedExercises,
      completedAt,
      part: activeSession.part ?? 1,
    }
    const prs = detectPRs(finished, sessions)
    if (prs.length) finished.prs = prs
    const summary: SessionSummary = {
      sessionId: finished.id,
      completedAt,
      durationMin: durationMinutes(activeSession.startedAt, completedAt),
      setsLogged: r.setsLogged,
      levelUps: r.levelUps,
      startNudges: r.startNudges,
      failureSets: r.failureSets,
      prs,
    }

    save(putSession(finished))
    save(putProgress(Object.values(r.newProgress)))
    save(putActiveSession(null))

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

    const r = commitActive(
      activeSession,
      sessions,
      progress,
      resolveIncrements(get().settings.increments),
    )
    // Nothing performed yet → nothing to commit; leave the workout as-is.
    if (r.committedExercises.length === 0) return null

    const groupId = activeSession.groupId ?? activeSession.id
    const part = activeSession.part ?? 1
    const completedAt = finishedAt(activeSession)

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
        slot: e.slot,
        weightKg: e.weightKg,
        sets: e.sets.map(() => ({ done: false }) as SetLog),
      })),
    }

    const prs = detectPRs(finished, sessions)
    if (prs.length) finished.prs = prs
    const summary: SessionSummary = {
      sessionId: finished.id,
      completedAt,
      durationMin: durationMinutes(activeSession.startedAt, completedAt),
      setsLogged: r.setsLogged,
      levelUps: r.levelUps,
      startNudges: r.startNudges,
      failureSets: r.failureSets,
      prs,
      split: { remaining: remaining.length, part: part + 1 },
    }

    save(putSession(finished))
    save(putProgress(Object.values(r.newProgress)))
    save(putActiveSession(partB))

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
    // Only to an option the slot offers.
    if (def.retired || !SLOTS_BY_ID[slotId]?.optionIds.includes(exerciseId)) return
    const program = { ...(get().settings.program ?? {}), [slotId]: exerciseId }
    get().updateSettings({ program })
    const res = withSeededProgress([def], get().progress)
    if (res.seeded.length) {
      save(putProgress(res.seeded))
      set({ progress: res.progress })
    }
  },

  toggleDayBlock: (weekday, block) => {
    if (!isBlockId(block)) return
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    if (day.blocks.includes(block)) {
      const slots = blockSlotIds(block)
      // The extras sitting in this block go with it. An id this build doesn't
      // know (a plan imported from another device/version) has no slot: dropped.
      const add = day.add?.filter((id) => {
        const s = extraSlot(id, day)
        return !!s && s.block !== block
      })
      day.blocks = day.blocks.filter((b) => b !== block)
      day.omit = day.omit?.filter((id) => !slots.has(id))
      day.add = add
    } else {
      day.blocks = [...day.blocks, block]
    }
    get().updateSettings({ weeklyPlan: plan })
    const res = withSeededProgress(
      dayExercises(day, get().settings.program),
      get().progress,
    )
    if (res.seeded.length) {
      save(putProgress(res.seeded))
      set({ progress: res.progress })
    }
  },

  addExerciseToDay: (weekday, exerciseId, slotId) => {
    const def = getExercise(exerciseId)
    if (def.retired) return // retired exercises can't be scheduled
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    // The current pick of a slot that's on but omitted just needs un-omitting;
    // anything else rides along as an extra (without switching on the rest of
    // its block).
    const program = get().settings.program
    const unOmit = (slotId ? [SLOTS_BY_ID[slotId]] : SLOTS).find(
      (s) =>
        !!s &&
        !s.extra &&
        day.blocks.includes(s.block) &&
        (day.omit ?? []).includes(s.id) &&
        selectedForSlot(s.id, program) === exerciseId,
    )
    if (unOmit) {
      day.omit = day.omit?.filter((id) => id !== unOmit.id)
    } else if (!(day.add ?? []).includes(exerciseId)) {
      day.add = [...(day.add ?? []), exerciseId]
    }
    get().updateSettings({ weeklyPlan: plan })
    const res = withSeededProgress([def], get().progress)
    if (res.seeded.length) {
      save(putProgress(res.seeded))
      set({ progress: res.progress })
    }
  },

  removeExerciseFromDay: (weekday, exerciseId) => {
    const plan = clonePlan(getWeeklyPlan(get().settings.weeklyPlan))
    const day = plan[weekday]
    if (!day) return
    const program = get().settings.program
    const touched = new Set<BlockId>()
    if ((day.add ?? []).includes(exerciseId)) {
      const extra = extraSlot(exerciseId, day)
      if (extra) touched.add(extra.block)
      day.add = (day.add ?? []).filter((id) => id !== exerciseId)
    }
    // Omit every slot on this day that currently picks it — an exercise can be
    // both added and slot-selected (added first, swapped in later), or picked
    // by two blocks that are both on, and removing it must clear all of them.
    for (const s of SLOTS) {
      if (
        !s.extra &&
        day.blocks.includes(s.block) &&
        selectedForSlot(s.id, program) === exerciseId &&
        !(day.omit ?? []).includes(s.id)
      ) {
        day.omit = [...(day.omit ?? []), s.id]
        touched.add(s.block)
      }
    }
    // Switch a block off entirely if it has no exercises left.
    const left = dayEntries(day, program)
    for (const block of touched) {
      if (!day.blocks.includes(block)) continue
      if (left.some((e) => SLOTS_BY_ID[e.slotId].block === block)) continue
      const slots = blockSlotIds(block)
      day.blocks = day.blocks.filter((b) => b !== block)
      day.omit = day.omit?.filter((id) => !slots.has(id))
    }
    get().updateSettings({ weeklyPlan: plan })
  },

  setExerciseWeight: (exerciseId, weightKg) => {
    const progress = { ...get().progress }
    const cur = progress[exerciseId]
    if (!cur) return
    const next = { ...cur, currentWeightKg: weightKg }
    progress[exerciseId] = next
    save(putProgress([next]))
    set({ progress })
  },

  setTimeTarget: (exerciseId, seconds) => {
    const progress = { ...get().progress }
    const cur = progress[exerciseId]
    if (!cur) return
    const next = { ...cur, targetSeconds: Math.max(0, seconds) }
    progress[exerciseId] = next
    save(putProgress([next]))
    set({ progress })
  },

  upsertBodyStat: (stat) => {
    const others = get().bodyStats.filter((b) => b.date !== stat.date)
    const bodyStats = [...others, stat].sort((a, b) =>
      a.date < b.date ? 1 : -1,
    )
    save(putBodyStat(stat))
    set({ bodyStats })
  },

  removeBodyStat: (date) => {
    save(dbDeleteBodyStat(date))
    set({ bodyStats: get().bodyStats.filter((b) => b.date !== date) })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    save(putSettings(settings))
    set({ settings })
  },

  deleteSession: (id) => {
    save(dbDeleteSession(id))
    const left = get().sessions.filter((s) => s.id !== id)
    // A record the deleted session held may now belong to a later one.
    const restamped = restampPRs(left)
    for (const s of restamped) save(putSession(s))
    const byId = new Map(restamped.map((s) => [s.id, s]))
    set({ sessions: left.map((s) => byId.get(s.id) ?? s), overlay: null })
  },

  updateSession: (session) => {
    if (!session.completedAt || !get().sessions.some((s) => s.id === session.id)) return
    const edited: SessionLog = {
      ...session,
      exercises: session.exercises
        .filter((e) => e.sets.some((s) => s.done))
        .map((e) => {
          const { note, ...rest } = normalizeLoads(e)
          return note?.trim() ? { ...rest, note: note.trim() } : rest
        }),
      notes: session.notes?.trim() || undefined,
    }
    const swapped = get().sessions.map((s) => (s.id === edited.id ? edited : s))
    const restamped = restampPRs(swapped)
    const byId = new Map(restamped.map((s) => [s.id, s]))
    const sessions = swapped.map((s) => byId.get(s.id) ?? s)
    save(putSession(byId.get(edited.id) ?? edited))
    for (const s of restamped) if (s.id !== edited.id) save(putSession(s))
    set({ sessions })
  },

  dismissSaveError: () => set({ saveError: null }),

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
