// A crash screen with a way out. Everything lives on this device, so a render
// error must never be a blank page: this catches it and offers a backup
// (read straight from storage — the in-memory state may be what broke) and a
// reload.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { loadAll } from '../storage/db'
import { performBackup } from './backup'
import type { BackupFile } from '../storage/types'

/** A backup built from what's stored, bypassing the app's state. */
async function backupFromStorage(): Promise<BackupFile> {
  const data = await loadAll()
  return {
    app: 'iron-ladder',
    version: data.settings.version ?? 1,
    exportedAt: new Date().toISOString(),
    sessions: data.sessions,
    progress: data.progress,
    bodyStats: data.bodyStats,
    settings: data.settings,
  }
}

interface State {
  error: Error | null
  status: string | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, status: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Iron Ladder crashed:', error, info.componentStack)
  }

  private backup = async () => {
    try {
      const res = await performBackup(await backupFromStorage())
      this.setState({ status: res === 'cancelled' ? null : 'Backup saved. ✓' })
    } catch {
      this.setState({ status: 'Couldn’t read your data for a backup.' })
    }
  }

  render() {
    const { error, status } = this.state
    if (!error) return this.props.children
    return (
      <div className="app">
        <div className="screen" style={{ paddingTop: 'calc(var(--safe-top) + 48px)' }}>
          <h1 style={{ marginBottom: 6 }}>Something went wrong</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            The app hit an error it couldn&rsquo;t recover from. Your training log is still
            stored on this device — save a backup first, then reload.
          </p>
          <button className="btn btn-primary btn-block btn-lg" onClick={this.backup}>
            Save a backup
          </button>
          <button
            className="btn btn-block"
            style={{ marginTop: 10 }}
            onClick={() => window.location.reload()}
          >
            Reload the app
          </button>
          {status && (
            <div className="small" style={{ marginTop: 12, color: 'var(--info)' }}>
              {status}
            </div>
          )}
          <div className="coach" style={{ marginTop: 18 }}>
            <span className="tiny" style={{ wordBreak: 'break-word' }}>
              {error.message || String(error)}
            </span>
          </div>
        </div>
      </div>
    )
  }
}
