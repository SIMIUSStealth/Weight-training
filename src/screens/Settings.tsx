import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Modal, Segmented, Stepper } from '../ui/components'
import { Download, Trash, Upload } from '../ui/icons'
import type { BackupFile } from '../storage/types'

export function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const resetEverything = useStore((s) => s.resetEverything)
  const sessions = useStore((s) => s.sessions)

  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const doExport = async () => {
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `iron-ladder-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus('Backup downloaded.')
    } catch {
      setStatus('Could not export.')
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text) as BackupFile
      await importData(json)
      setStatus('Backup restored.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="sub">Tune the app and look after your data.</div>
        </div>
      </div>

      <div className="eyebrow">Rest timer</div>
      <div className="card">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 700 }}>Between sets</div>
            <div className="tiny faint">Spec suggests ~75 seconds.</div>
          </div>
          <Stepper
            value={settings.restSeconds}
            min={30}
            max={210}
            step={15}
            unit="s"
            onChange={(v) => updateSettings({ restSeconds: v })}
          />
        </div>
        <div className="divider" />
        <div className="row between">
          <div style={{ fontWeight: 700 }}>Alert when rest ends</div>
          <div style={{ width: 130 }}>
            <Segmented
              value={settings.restAlert ? 'on' : 'off'}
              onChange={(v) => updateSettings({ restAlert: v === 'on' })}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="eyebrow">Your data</div>
      <div className="card">
        <div className="small muted" style={{ marginBottom: 12 }}>
          Everything is stored on this device. Export a backup to move to a new
          phone — or just to keep it safe.
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-block" onClick={doExport}>
            <Download size={18} /> Export
          </button>
          <button className="btn btn-block" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden-input"
          onChange={onFile}
        />
        {status && (
          <div className="tiny" style={{ marginTop: 10, color: 'var(--info)' }}>
            {status}
          </div>
        )}
      </div>

      <div className="eyebrow">The program</div>
      <button
        className="btn btn-block btn-ghost"
        style={{ justifyContent: 'space-between' }}
        onClick={() => setShowAbout((v) => !v)}
      >
        <span>How progression works</span>
        <span className="faint">{showAbout ? 'hide' : 'show'}</span>
      </button>
      {showAbout && (
        <div className="card fade-in" style={{ marginTop: 10 }}>
          <p className="small" style={{ marginTop: 0 }}>
            <strong>Double progression.</strong> Each session, add reps toward the
            top of the range on every set. Once all three sets hit the top, the app
            moves you up one rung on the dumbbell. Reps drop after a jump — work them
            back up, then climb again.
          </p>
          <p className="small">
            <strong>Effort drives growth.</strong> Take each working set to roughly
            1–3 reps short of failure. Keep form strict — a rep only counts if it
            looks like the cue.
          </p>
          <p className="small">
            <strong>Raw materials.</strong> Protein 1.6–2.2 g/kg/day, a slight
            calorie surplus, and 7–9 h sleep. Reassess the whole plan every 8–12
            weeks.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            3 sessions/week on non-consecutive days · ~40 min each · one adjustable
            dumbbell.
          </p>
        </div>
      )}

      <div className="eyebrow">Danger zone</div>
      <button
        className="btn btn-danger btn-block"
        onClick={() => setConfirmReset(true)}
      >
        <Trash size={18} /> Reset all data
      </button>
      <div className="tiny faint" style={{ textAlign: 'center', margin: '18px 0' }}>
        Iron Ladder · {sessions.length} sessions · v1
      </div>

      {confirmReset && (
        <Modal title="Reset everything?" onClose={() => setConfirmReset(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            This deletes all sessions, progress and body stats, and starts the
            program fresh from the spec&rsquo;s starting weights. Consider exporting a
            backup first.
          </p>
          <button
            className="btn btn-danger btn-block"
            onClick={async () => {
              await resetEverything()
              setConfirmReset(false)
              setStatus('All data reset.')
            }}
          >
            Yes, reset everything
          </button>
        </Modal>
      )}
    </div>
  )
}
