import { useMemo } from 'react'
import { EXERCISES } from '../program/exercises'
import { computeRecommendation } from '../program/progression'
import { formatKg } from '../program/ladder'
import { formatSeconds, overview, relativeDay } from '../program/analytics'
import { useStore } from '../store/useStore'
import { performBackup, daysSince } from '../ui/backup'
import { muscleColor } from '../ui/components'
import { ArrowUp, Alert, Download, Flame, Play, Timer } from '../ui/icons'

export function Today() {
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const activeSession = useStore((s) => s.activeSession)
  const startSession = useStore((s) => s.startSession)
  const openOverlay = useStore((s) => s.openOverlay)
  const settings = useStore((s) => s.settings)
  const getBackup = useStore((s) => s.getBackup)
  const recordBackup = useStore((s) => s.recordBackup)

  const stats = useMemo(() => overview(sessions), [sessions])

  const sinceBackup = daysSince(settings.lastBackupAt)
  const backupOverdue =
    sessions.length > 0 && (sinceBackup == null || sinceBackup >= 7)
  const backupNow = async () => {
    const res = await performBackup(getBackup())
    if (res !== 'cancelled') recordBackup()
  }

  const recs = useMemo(
    () =>
      EXERCISES.map((def) => ({
        def,
        rec: computeRecommendation(def, progress[def.id]!, sessions),
      })),
    [progress, sessions],
  )

  const loggedSets = activeSession
    ? activeSession.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    : 0
  const exercisesLeft = activeSession
    ? activeSession.exercises.filter((e) => !e.sets.some((s) => s.done)).length
    : 0
  const part = activeSession?.part ?? 1
  const startLabel = !activeSession
    ? 'Start workout'
    : part > 1
      ? `Continue · Part ${part} · ${exercisesLeft} left`
      : `Resume workout · ${loggedSets} set${loggedSets === 1 ? '' : 's'} in`

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>{greeting}</h1>
          <div className="sub">
            {stats.lastSessionAt
              ? `Last session ${relativeDay(stats.lastSessionAt)}`
              : 'Ready when you are'}
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="num">{stats.thisWeek}/3</div>
          <div className="label">this week</div>
        </div>
        <div className="stat">
          <div className="num">{stats.totalWorkouts}</div>
          <div className="label">workouts</div>
        </div>
        <div className="stat">
          <div className="num">
            {stats.daysSinceLast == null ? '–' : `${stats.daysSinceLast}d`}
          </div>
          <div className="label">since last</div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={startSession}>
        <Play size={20} />
        {startLabel}
      </button>

      <div className="coach coach-info" style={{ marginTop: 12 }}>
        <span className="ico">
          <Flame size={17} />
        </span>
        <span>
          Full-body session, 11 movements, 3 sets each. Warm up ~5 min first.
          Take a rest day between sessions.
        </span>
      </div>

      {backupOverdue && (
        <div className="coach coach-stall" style={{ marginTop: 12 }}>
          <span className="ico">
            <Download size={17} />
          </span>
          <span className="grow">
            Back up your training —{' '}
            {sinceBackup == null
              ? 'you haven’t yet'
              : `last backup ${sinceBackup} days ago`}
            .
          </span>
          <button
            className="btn btn-sm"
            style={{ flexShrink: 0, alignSelf: 'center' }}
            onClick={backupNow}
          >
            Back up
          </button>
        </div>
      )}

      <div className="eyebrow">Today&rsquo;s targets</div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {recs.map(({ def, rec }) => (
          <button
            key={def.id}
            className="list-row"
            style={{ width: '100%', background: 'none', border: 0, color: 'inherit' }}
            onClick={() => openOverlay({ name: 'exercise', exerciseId: def.id })}
          >
            <span
              className="set-no"
              style={{ background: 'transparent', color: muscleColor(def.muscle) }}
            >
              ●
            </span>
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{def.name}</span>
                {rec.justLeveledUp && (
                  <span style={{ color: 'var(--success)' }}>
                    <ArrowUp size={15} />
                  </span>
                )}
                {rec.stalled && (
                  <span style={{ color: 'var(--accent)' }}>
                    <Alert size={15} />
                  </span>
                )}
              </div>
              <div className="small muted">{rec.headline}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {def.kind === 'time' ? (
                  <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Timer size={15} />
                    {formatSeconds(rec.targetSeconds ?? 0)}
                  </span>
                ) : def.bodyweight ? (
                  'body'
                ) : (
                  formatKg(rec.weightKg)
                )}
              </div>
              <div className="tiny faint">
                {def.sets}×{def.kind === 'time' ? 'hold' : `${def.repMin}-${def.repMax}`}
                {def.perArm ? ' · ea' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
