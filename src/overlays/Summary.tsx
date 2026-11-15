import { getExercise } from '../program/exercises'
import { formatKg, formatLoad, ladderFor, prevRung, resolveIncrements } from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { useState } from 'react'
import { useStore, type SessionSummary } from '../store/useStore'
import { BodyModal, todayKey } from '../ui/BodyModal'
import { daysSince, performBackup } from '../ui/backup'
import { Coach } from '../ui/components'
import { ArrowUp, Body, Check, Download, Info, Trophy } from '../ui/icons'
import type { PRRecord } from '../storage/types'

function prLabel(pr: PRRecord): string {
  if (pr.kind === 'hold') return `${formatSeconds(pr.value)} — longest set yet`
  if (pr.kind === 'reps') {
    const equipment = getExercise(pr.exerciseId).equipment
    return `${pr.value} reps @ ${formatLoad(equipment, pr.weightKg ?? 0)} — most ever at this load`
  }
  return `est. 1RM ${formatKg(pr.value)} — all-time strength best`
}

export function Summary({ summary }: { summary: SessionSummary }) {
  const progress = useStore((s) => s.progress)
  // Select the raw setting — a selector returning a fresh object each call
  // would re-render forever.
  const storedIncrements = useStore((s) => s.settings.increments)
  const increments = resolveIncrements(storedIncrements)
  const setExerciseWeight = useStore((s) => s.setExerciseWeight)
  const setTab = useStore((s) => s.setTab)
  const closeOverlay = useStore((s) => s.closeOverlay)
  const resumeSession = useStore((s) => s.resumeSession)
  const session = useStore((s) => s.sessions.find((x) => x.id === summary.sessionId))
  const updateSession = useStore((s) => s.updateSession)
  const bodyToday = useStore((s) => s.bodyStats.find((b) => b.date === todayKey()))
  const upsertBodyStat = useStore((s) => s.upsertBodyStat)
  const lastBackupAt = useStore((s) => s.settings.lastBackupAt)
  const getBackup = useStore((s) => s.getBackup)
  const recordBackup = useStore((s) => s.recordBackup)
  const [note, setNote] = useState(session?.notes ?? '')
  const [editBody, setEditBody] = useState(false)

  const sinceBackup = daysSince(lastBackupAt)
  const backupDue = sinceBackup == null || sinceBackup >= 7
  const backupNow = async () => {
    const res = await performBackup(getBackup())
    if (res !== 'cancelled') recordBackup()
  }
  const saveNote = () => {
    if (session && note.trim() !== (session.notes ?? '')) updateSession({ ...session, notes: note })
  }

  const done = () => {
    saveNote()
    closeOverlay()
    setTab('today')
  }

  return (
    <div className="overlay">
      <div className="overlay-body" style={{ paddingTop: 'calc(var(--safe-top) + 28px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--success-dim)',
              color: 'var(--success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={34} />
          </div>
          <h1 style={{ margin: '14px 0 2px' }}>
            {summary.split ? `Part ${summary.split.part - 1} logged` : 'Session logged'}
          </h1>
          <div className="muted small">
            {summary.setsLogged} sets
            {summary.durationMin > 0 ? ` · ${summary.durationMin} min` : ''}
          </div>
        </div>

        {summary.split && (
          <div className="coach coach-info" style={{ marginBottom: 4 }}>
            <span className="ico">
              <Info size={17} />
            </span>
            <span>
              {summary.split.remaining} exercise
              {summary.split.remaining === 1 ? '' : 's'} saved as{' '}
              <strong>Part {summary.split.part}</strong> — finish them whenever. It
              still counts as one workout this week.
            </span>
          </div>
        )}

        {summary.prs.length > 0 && (
          <>
            <div className="eyebrow">
              <span className="row" style={{ gap: 6 }}>
                <Trophy size={14} /> Personal records ({summary.prs.length})
              </span>
            </div>
            <div className="card">
              {[...new Set(summary.prs.map((p) => p.exerciseId))].map((exId) => (
                <div className="set-row" key={exId} style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent-ink)', marginTop: 2 }}>
                    <Trophy size={20} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{getExercise(exId).name}</div>
                    {summary.prs
                      .filter((p) => p.exerciseId === exId)
                      .map((p) => (
                        <div className="tiny muted" key={p.kind} style={{ marginTop: 2 }}>
                          {prLabel(p)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {summary.levelUps.length > 0 ? (
          <>
            <div className="eyebrow">
              <span className="row" style={{ gap: 6 }}>
                <ArrowUp size={14} /> Leveled up ({summary.levelUps.length})
              </span>
            </div>
            <div className="card">
              {summary.levelUps.map((lu) => (
                <div className="set-row" key={lu.exerciseId}>
                  <span style={{ color: 'var(--success)' }}>
                    <ArrowUp size={20} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{getExercise(lu.exerciseId).name}</div>
                    <div className="tiny faint">
                      {getExercise(lu.exerciseId).equipment === 'none'
                        ? 'hold target raised'
                        : 'load raised'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800 }}>
                    <span className="muted" style={{ fontWeight: 600 }}>
                      {lu.from}
                    </span>{' '}
                    → {lu.to}
                  </div>
                </div>
              ))}
            </div>
            <Coach tone="up">
              After a jump your reps will drop — that&rsquo;s expected. Work them back
              to the top of the range, then climb again.
            </Coach>
          </>
        ) : summary.prs.length > 0 ? null : (
          <Coach tone="info">
            No level-ups this time — that&rsquo;s normal. Beat at least one set next
            session and you&rsquo;re trending the right way.
          </Coach>
        )}

        {summary.failureSets >= 6 && (
          <Coach tone="stall">
            You took {summary.failureSets} sets to failure. Strong — but leaving
            1–2 reps in reserve on most sets keeps fatigue down, so you can train
            each muscle more often.
          </Coach>
        )}

        {summary.startNudges.length > 0 && (
          <>
            <div className="eyebrow">Starting weight check</div>
            {summary.startNudges.map((n) => {
              const def = getExercise(n.exerciseId)
              const cur = progress[n.exerciseId]?.currentWeightKg ?? def.startWeightKg
              if (n.kind === 'too_heavy') {
                const drop = prevRung(cur, ladderFor(def.equipment, increments))
                return (
                  <div className="card" key={n.exerciseId}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{def.name}</div>
                    <div className="small muted" style={{ marginBottom: 10 }}>
                      You couldn&rsquo;t hold the bottom of the range — the start weight
                      looks a touch heavy.
                    </div>
                    {drop !== cur ? (
                      <button
                        className="btn btn-sm btn-block"
                        onClick={() => setExerciseWeight(n.exerciseId, drop)}
                      >
                        Drop to {formatLoad(def.equipment, drop)}
                      </button>
                    ) : (
                      <div className="tiny faint">Already at the lightest setting.</div>
                    )}
                  </div>
                )
              }
              return (
                <div className="card" key={n.exerciseId}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{def.name}</div>
                  <div className="small muted">
                    That looked easy — the start weight is light. You&rsquo;ll keep
                    leveling up over the next session or two until it bites.
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* while it's fresh: a note, today's body stats, a backup */}
        <div className="eyebrow">Wrap up</div>
        <input
          className="input"
          type="text"
          maxLength={300}
          value={note}
          placeholder="Session note — how did it go?"
          aria-label="session note"
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
        />
        <div className="card" style={{ marginTop: 10, padding: '12px 16px' }}>
          <div className="row between">
            <span className="row" style={{ gap: 8 }}>
              <Body size={18} className="muted" />
              <span className="small" style={{ fontWeight: 700 }}>
                {bodyToday?.bodyweightKg != null
                  ? `Bodyweight ${bodyToday.bodyweightKg} kg`
                  : 'Bodyweight, protein, sleep'}
              </span>
            </span>
            <button className="btn btn-sm" onClick={() => setEditBody(true)}>
              {bodyToday ? 'Edit' : 'Log today'}
            </button>
          </div>
          {backupDue && (
            <>
              <div className="divider" style={{ margin: '12px 0' }} />
              <div className="row between">
                <span className="row" style={{ gap: 8 }}>
                  <Download size={18} className="muted" />
                  <span className="small" style={{ fontWeight: 700 }}>
                    {sinceBackup == null ? 'Never backed up' : `Last backup ${sinceBackup} days ago`}
                  </span>
                </span>
                <button className="btn btn-sm" onClick={backupNow}>
                  Back up
                </button>
              </div>
            </>
          )}
        </div>

        {summary.split ? (
          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => {
                saveNote()
                closeOverlay()
                resumeSession()
              }}
            >
              Continue Part {summary.split.part} now
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={done}>
              Later
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 24 }} onClick={done}>
            Done
          </button>
        )}
      </div>

      {editBody && (
        <BodyModal
          initial={bodyToday}
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
