import { useMemo, useState } from 'react'
import { relativeDay } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Sparkline } from '../ui/charts'
import { EmptyState, Modal } from '../ui/components'
import { ArrowUp, Body, ChevronRight, History as HistoryIcon, Trophy } from '../ui/icons'
import type { BodyStat } from '../storage/types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function History() {
  const sessions = useStore((s) => s.sessions)
  const bodyStats = useStore((s) => s.bodyStats)
  const upsertBodyStat = useStore((s) => s.upsertBodyStat)
  const openOverlay = useStore((s) => s.openOverlay)

  const [editBody, setEditBody] = useState(false)

  const completed = useMemo(
    () =>
      sessions
        .filter((s) => s.completedAt)
        .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1)),
    [sessions],
  )

  const bwSeries = useMemo(
    () =>
      [...bodyStats]
        .filter((b) => b.bodyweightKg != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((b) => b.bodyweightKg!),
    [bodyStats],
  )
  const latestBw = bwSeries[bwSeries.length - 1]

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>History</h1>
          <div className="sub">{completed.length} sessions logged</div>
        </div>
      </div>

      {/* body & recovery */}
      <div className="card">
        <div className="row between">
          <div className="row" style={{ gap: 8 }}>
            <Body size={18} className="muted" />
            <span className="card-title">Body &amp; recovery</span>
          </div>
          <button className="btn btn-sm" onClick={() => setEditBody(true)}>
            Log today
          </button>
        </div>
        {bwSeries.length > 0 ? (
          <div className="row between" style={{ marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {latestBw}
                <span className="muted small"> kg</span>
              </div>
              <div className="tiny faint">latest bodyweight</div>
            </div>
            <div style={{ width: 130 }}>
              <Sparkline values={bwSeries} color="var(--info)" />
            </div>
          </div>
        ) : (
          <div className="small muted" style={{ marginTop: 8 }}>
            Track bodyweight, protein and sleep — the raw materials growth is built
            from.
          </div>
        )}
      </div>

      {/* sessions */}
      {completed.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={30} className="faint" />}
          title="No sessions yet"
          sub="Finish your first workout and it’ll show up here."
        />
      ) : (
        completed.map((s) => {
          const sets = s.exercises.reduce(
            (n, e) => n + e.sets.filter((x) => x.done).length,
            0,
          )
          const levelUps = s.exercises.filter((e) => e.leveledUp).length
          return (
            <button
              key={s.id}
              className="card tap"
              onClick={() => openOverlay({ name: 'session', sessionId: s.id })}
            >
              <div className="row between">
                <div>
                  <div className="card-title">
                    {new Date(s.completedAt!).toLocaleDateString(undefined, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="tiny faint">
                    {relativeDay(s.completedAt!)} · {sets} sets
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {(s.prs?.length ?? 0) > 0 && (
                    <span className="chip" style={{ color: 'var(--accent-ink)' }}>
                      <Trophy size={13} /> {s.prs!.length}
                    </span>
                  )}
                  {levelUps > 0 && (
                    <span className="chip" style={{ color: 'var(--success)' }}>
                      <ArrowUp size={13} /> {levelUps}
                    </span>
                  )}
                  <ChevronRight size={18} className="faint" />
                </div>
              </div>
            </button>
          )
        })
      )}

      {editBody && (
        <BodyModal
          initial={bodyStats.find((b) => b.date === today())}
          onClose={() => setEditBody(false)}
          onSave={(stat) => {
            upsertBodyStat(stat)
            setEditBody(false)
          }}
        />
      )}
    </div>
  )
}

function BodyModal({
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
            date: today(),
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
