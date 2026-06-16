// On-device persistence. A single user, no accounts — everything lives in
// IndexedDB and can be exported / re-imported as a JSON backup so a new phone
// or a cleared browser never means lost history.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { initialProgress } from '../program/progression'
import {
  DEFAULT_SETTINGS,
  type BackupFile,
  type BodyStat,
  type ExerciseProgress,
  type SessionLog,
  type Settings,
} from './types'

interface IronLadderDB extends DBSchema {
  sessions: { key: string; value: SessionLog }
  progress: { key: string; value: ExerciseProgress }
  bodyStats: { key: string; value: BodyStat }
  meta: { key: string; value: unknown }
}

const DB_NAME = 'iron-ladder'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<IronLadderDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<IronLadderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'exerciseId' })
        }
        if (!db.objectStoreNames.contains('bodyStats')) {
          db.createObjectStore('bodyStats', { keyPath: 'date' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
      },
    })
  }
  return dbPromise
}

/**
 * Ask the browser to keep our storage durable (resists eviction under pressure).
 * Best-effort; iOS Safari grants it for installed PWAs.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* ignore */
  }
  return false
}

export interface AppData {
  sessions: SessionLog[]
  progress: ExerciseProgress[]
  bodyStats: BodyStat[]
  settings: Settings
  activeSession: SessionLog | null
}

/** Load everything, seeding fresh state on first run. */
export async function loadAll(): Promise<AppData> {
  const db = await getDB()
  let [sessions, progress, bodyStats] = await Promise.all([
    db.getAll('sessions'),
    db.getAll('progress'),
    db.getAll('bodyStats'),
  ])
  let settings = (await db.get('meta', 'settings')) as Settings | undefined
  const activeSession =
    ((await db.get('meta', 'activeSession')) as SessionLog | undefined) ?? null

  // First run: seed per-exercise progression and default settings.
  if (progress.length === 0) {
    progress = initialProgress()
    const tx = db.transaction('progress', 'readwrite')
    await Promise.all(progress.map((p) => tx.store.put(p)))
    await tx.done
  }
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS }
    await db.put('meta', settings, 'settings')
  }

  return { sessions, progress, bodyStats, settings, activeSession }
}

export async function putSession(session: SessionLog): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessions', id)
}

export async function putProgress(rows: ExerciseProgress[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('progress', 'readwrite')
  await Promise.all(rows.map((r) => tx.store.put(r)))
  await tx.done
}

export async function putBodyStat(stat: BodyStat): Promise<void> {
  const db = await getDB()
  await db.put('bodyStats', stat)
}

export async function deleteBodyStat(date: string): Promise<void> {
  const db = await getDB()
  await db.delete('bodyStats', date)
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('meta', settings, 'settings')
}

export async function putActiveSession(session: SessionLog | null): Promise<void> {
  const db = await getDB()
  if (session) await db.put('meta', session, 'activeSession')
  else await db.delete('meta', 'activeSession')
}

// ---------- backup / restore ----------

export async function exportBackup(): Promise<BackupFile> {
  const { sessions, progress, bodyStats, settings } = await loadAll()
  return {
    app: 'iron-ladder',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    sessions,
    progress,
    bodyStats,
    settings,
  }
}

export async function importBackup(file: BackupFile): Promise<void> {
  if (file.app !== 'iron-ladder') {
    throw new Error('Not an Iron Ladder backup file.')
  }
  const db = await getDB()
  // Replace everything wholesale.
  const tx = db.transaction(
    ['sessions', 'progress', 'bodyStats', 'meta'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('sessions').clear(),
    tx.objectStore('progress').clear(),
    tx.objectStore('bodyStats').clear(),
  ])
  await Promise.all([
    ...file.sessions.map((s) => tx.objectStore('sessions').put(s)),
    ...file.progress.map((p) => tx.objectStore('progress').put(p)),
    ...file.bodyStats.map((b) => tx.objectStore('bodyStats').put(b)),
    tx.objectStore('meta').put(file.settings, 'settings'),
  ])
  await tx.objectStore('meta').delete('activeSession')
  await tx.done
}

/** Wipe all data and reseed a clean program. */
export async function resetAll(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['sessions', 'progress', 'bodyStats', 'meta'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('sessions').clear(),
    tx.objectStore('progress').clear(),
    tx.objectStore('bodyStats').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}
