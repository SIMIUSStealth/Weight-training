// Log today's body & recovery numbers — bodyweight, protein, sleep.

import { useState } from 'react'
import { localDateKey } from '../program/history'
import { Modal } from './components'
import type { BodyStat } from '../storage/types'

/** Today's local calendar date, YYYY-MM-DD (not UTC's — that's yesterday until 1–2 am here). */
export function todayKey(): string {
  return localDateKey(new Date())
}

export function BodyModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: BodyStat
  onClose: () => void
  onSave: (stat: BodyStat) => void
}) {
  const [bw, setBw] = useState(initial?.bodyweightKg?.toString() ?? '')
  const [protein, setProtein] = useState(initial?.proteinG?.toString() ?? '')
  const [sleep, setSleep] = useState(initial?.sleepHours?.toString() ?? '')

  const num = (s: string) => {
    const v = parseFloat(s.replace(',', '.'))
    return Number.isFinite(v) ? v : undefined
  }

  return (
    <Modal title="Log today" onClose={onClose}>
      <div className="field">
        <label>Bodyweight (kg)</label>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          value={bw}
          onChange={(e) => setBw(e.target.value)}
          placeholder="e.g. 78.5"
        />
      </div>
      <div className="field">
        <label>Protein (g)</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="aim 1.6–2.2 g/kg"
        />
      </div>
      <div className="field">
        <label>Sleep (hours)</label>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          placeholder="aim 7–9"
        />
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() =>
          onSave({
            ...initial,
            date: todayKey(),
            bodyweightKg: num(bw),
            proteinG: num(protein),
            sleepHours: num(sleep),
          })
        }
      >
        Save
      </button>
    </Modal>
  )
}
