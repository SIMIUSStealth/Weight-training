// Persisted data model. Everything lives on-device in IndexedDB; a single
// user, no accounts. All of it is JSON-serialisable so it can be exported and
// re-imported as a backup.

/** One logged set within an exercise. */
export interface SetLog {
  /** Reps achieved (reps exercises). */
  reps?: number
  /** Seconds held (the plank). */
  seconds?: number
  /** Whether the set was logged at all (skipped sets stay null/undefined). */
  done: boolean
}

/** One exercise as performed within a session. */
export interface ExerciseLog {
  exerciseId: string
  /** Working weight used this session, in kg (0 for bodyweight). */
  weightKg: number
  sets: SetLog[]
  /** Did this exercise level up (weight or plank time) at session commit? */
  leveledUp?: boolean
  /** New weight/time after level-up, for the summary screen. */
  newWeightKg?: number
  newSeconds?: number
}

/** A complete (or in-progress) training session. */
export interface SessionLog {
  id: string
  /** ISO date-time the session was started. */
  startedAt: string
  /** ISO date-time the session was completed, if finished. */
  completedAt?: string
  exercises: ExerciseLog[]
  bodyweightKg?: number
  notes?: string
  /**
   * Logical-workout id. Parts of one workout that was split across sittings
   * (Part A, Part B, …) share a groupId, so the weekly "3 workouts" count
   * treats them as one. Undefined = a standalone full session (its own group).
   */
  groupId?: string
  /** 1-based part index within the group (1 = the first sitting). */
  part?: number
}

/** Per-exercise progression state — the current rung each exercise sits on. */
export interface ExerciseProgress {
  exerciseId: string
  /** Current dumbbell weight in kg (0 for bodyweight movements). */
  currentWeightKg: number
  /** Current hold target in seconds (the plank). */
  targetSeconds?: number
  /** Set true once the user has confirmed/adjusted the starting weight. */
  startConfirmed?: boolean
}

/** A daily body-stats entry — the "raw materials" (Training Spec §1). */
export interface BodyStat {
  /** YYYY-MM-DD. */
  date: string
  bodyweightKg?: number
  proteinG?: number
  sleepHours?: number
  notes?: string
}

export interface Settings {
  /** Rest timer length between sets, in seconds (spec suggests ~75). */
  restSeconds: number
  /** Play a sound/vibrate when the rest timer ends. */
  restAlert: boolean
  /** Target bodyweight for protein guidance, in kg (optional). */
  bodyweightKg?: number
  /** ISO time of the last backup (export/share), for the weekly reminder. */
  lastBackupAt?: string
  /** Schema version, for future migrations. */
  version: number
}

export const DEFAULT_SETTINGS: Settings = {
  restSeconds: 75,
  restAlert: true,
  version: 1,
}

/** The full export/backup envelope. */
export interface BackupFile {
  app: 'iron-ladder'
  version: number
  exportedAt: string
  sessions: SessionLog[]
  progress: ExerciseProgress[]
  bodyStats: BodyStat[]
  settings: Settings
}
