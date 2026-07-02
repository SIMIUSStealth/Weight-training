import { useMemo } from 'react'
import { MUSCLE_ORDER } from '../program/exercises'
import {
  dayLabel,
  getWeeklyPlan,
  todayIndex,
  trainingDayCount,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from '../program/plan'
import {
  doneDaysThisWeek,
  overview,
  relativeDay,
  weekStatuses,
  weekStreak,
} from '../program/analytics'
import { useStore } from '../store/useStore'
import { performBackup, daysSince } from '../ui/backup'
import { Coach, MuscleChip } from '../ui/components'
import { Check, Download, Flame, Play } from '../ui/icons'

export function Today() {
  const sessions = useStore((s) => s.sessions)
  const settings = useStore((s) => s.settings)
  const activeSession = useStore((s) => s.activeSession)
  const openOverlay = useStore((s) => s.openOverlay)
  const resumeSession = useStore((s) => s.resumeSession)
  const startDay = useStore((s) => s.startDay)
  const getBackup = useStore((s) => s.getBackup)
  const recordBackup = useStore((s) => s.recordBackup)

  const plan = useMemo(() => getWeeklyPlan(settings.weeklyPlan), [settings.weeklyPlan])
  const statuses = useMemo(
    () => weekStatuses(plan, sessions, activeSession),
    [plan, sessions, activeSession],
  )
  const stats = useMemo(() => overview(sessions), [sessions])
  const streak = useMemo(() => weekStreak(plan, sessions), [plan, sessions])
  const target = trainingDayCount(plan)
  const doneThisWeek = doneDaysThisWeek(sessions)
  const today = todayIndex()

  // The next planned day to train: today if it's still to-do, else the first
  // to-do day scanning forward. Null when the week is finished (or all rest).
  const upNext = useMemo(() => {
    if (activeSession) return null
    for (let i = 0; i < 7; i++) {
      const d = (today + i) % 7
      if (statuses[d].status === 'todo') return d
    }
    return null
  }, [statuses, today, activeSession])

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

      {target > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="row" style={{ gap: 7 }}>
              <Flame
                size={18}
                style={{ color: streak > 0 ? 'var(--accent-ink)' : 'var(--faint)' }}
              />
              <span style={{ fontWeight: 800 }}>
                {streak > 0
                  ? `${streak}-week streak`
                  : 'Finish the week to start a streak'}
              </span>
            </span>
            <span className="small muted" style={{ fontWeight: 700 }}>
              {doneThisWeek}/{target} this week
            </span>
          </div>
          <div className="week-seg">
            {Array.from({ length: target }, (_, i) => (
              <span key={i} className={i < doneThisWeek ? 'on' : ''} />
            ))}
          </div>
        </div>
      )}

      {activeSession ? (
        <button className="btn btn-primary btn-lg btn-block" onClick={resumeSession}>
          <Play size={20} />
          Resume · {activeLabel} · {activeLeft} left
        </button>
      ) : upNext != null ? (
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => startDay(upNext)}
        >
          <Play size={20} />
          Start {upNext === today ? 'today' : WEEKDAYS_LONG[upNext]} ·{' '}
          {dayLabel(plan[upNext])}
        </button>
      ) : target > 0 ? (
        <Coach tone="up">
          Week complete — all {target} days done. Rest and grow; the streak is
          yours. 💪
        </Coach>
      ) : null}

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
