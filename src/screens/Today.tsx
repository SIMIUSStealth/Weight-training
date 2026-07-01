import { useMemo } from 'react'
import { MUSCLE_ORDER } from '../program/exercises'
import {
  dayLabel,
  getWeeklyPlan,
  todayIndex,
  trainingDayCount,
  WEEKDAYS,
} from '../program/plan'
import {
  doneDaysThisWeek,
  overview,
  relativeDay,
  weekStatuses,
} from '../program/analytics'
import { useStore } from '../store/useStore'
import { performBackup, daysSince } from '../ui/backup'
import { MuscleChip } from '../ui/components'
import { Check, Download, Play } from '../ui/icons'

export function Today() {
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const activeSession = useStore((s) => s.activeSession)
  const openOverlay = useStore((s) => s.openOverlay)
  const resumeSession = useStore((s) => s.resumeSession)
  const getBackup = useStore((s) => s.getBackup)
  const recordBackup = useStore((s) => s.recordBackup)

  const plan = useMemo(() => getWeeklyPlan(settings.weeklyPlan), [settings.weeklyPlan])
  const statuses = useMemo(
    () => weekStatuses(plan, sessions, activeSession),
    [plan, sessions, activeSession],
  )
  const stats = useMemo(() => overview(sessions), [sessions])
  const target = trainingDayCount(plan)
  const doneThisWeek = doneDaysThisWeek(sessions)
  const today = todayIndex()

  const sinceBackup = daysSince(settings.lastBackupAt)
  const backupOverdue = sessions.length > 0 && (sinceBackup == null || sinceBackup >= 7)
  const backupNow = async () => {
    const res = await performBackup(getBackup())
    if (res !== 'cancelled') recordBackup()
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const activeLeft = activeSession
    ? activeSession.exercises.filter((e) => !e.sets.some((s) => s.done)).length
    : 0
  const activeLabel =
    activeSession && activeSession.weekday != null
      ? dayLabel(plan[activeSession.weekday])
      : 'Workout'

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
          <div className="num">
            {doneThisWeek}/{target}
          </div>
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

      {activeSession && (
        <button className="btn btn-primary btn-lg btn-block" onClick={resumeSession}>
          <Play size={20} />
          Resume · {activeLabel} · {activeLeft} left
        </button>
      )}

      {backupOverdue && (
        <div className="coach coach-stall" style={{ marginTop: 12 }}>
          <span className="ico">
            <Download size={17} />
          </span>
          <span className="grow">
            Back up your training —{' '}
            {sinceBackup == null ? 'you haven’t yet' : `last backup ${sinceBackup} days ago`}.
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

      <div className="eyebrow">Your week</div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {statuses.map((d) => {
          const isToday = d.weekday === today
          const isFull = d.muscles.length === MUSCLE_ORDER.length
          return (
            <button
              key={d.weekday}
              className="list-row"
              style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
              onClick={() => openOverlay({ name: 'day', weekday: d.weekday })}
            >
              <div style={{ width: 44, flexShrink: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: isToday ? 'var(--accent-ink)' : 'var(--text)',
                  }}
                >
                  {WEEKDAYS[d.weekday]}
                </div>
                {isToday && (
                  <div className="tiny" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>
                    today
                  </div>
                )}
              </div>

              <div className="grow">
                {d.status === 'rest' ? (
                  <span className="muted small">Rest day</span>
                ) : isFull ? (
                  <span style={{ fontWeight: 600 }}>Full body</span>
                ) : (
                  <div className="row wrap" style={{ gap: 6 }}>
                    {MUSCLE_ORDER.filter((m) => d.muscles.includes(m)).map((m) => (
                      <MuscleChip key={m} muscle={m} />
                    ))}
                  </div>
                )}
              </div>

              {d.status === 'done' && (
                <span className="chip" style={{ color: 'var(--success)' }}>
                  <Check size={13} /> Done
                </span>
              )}
              {d.status === 'inprogress' && (
                <span className="chip" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>
                  In progress
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="tiny faint" style={{ textAlign: 'center', marginTop: 14 }}>
        Tap a day to train it or edit its exercises.
      </div>
    </div>
  )
}
