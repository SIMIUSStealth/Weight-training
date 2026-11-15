import { useMemo, useState } from 'react'
import { getExercise } from '../program/exercises'
import {
  calendarWeeks,
  compactNumber,
  monthRecap,
  monthSessions,
  sessionDurationMin,
} from '../program/history'
import { sessionTitle } from '../program/plan'
import { sessionVolumeKg } from '../program/sets'
import { useStore } from '../store/useStore'
import { Sparkline } from '../ui/charts'
import { BodyModal, todayKey } from '../ui/BodyModal'
import { EmptyState } from '../ui/components'
import {
  ArrowUp,
  Body,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Trophy,
} from '../ui/icons'
import type { SessionLog } from '../storage/types'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** "52 min · 21 sets · 4.2k kg" — whichever parts the session has. */
function sessionFacts(s: SessionLog): string {
  const sets = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
  const min = sessionDurationMin(s)
  const volume = sessionVolumeKg(s)
  return [
    min != null ? `${min} min` : '',
    `${sets} sets`,
    volume > 0 ? `${compactNumber(volume)} kg` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

export function History() {
  const sessions = useStore((s) => s.sessions)
  const bodyStats = useStore((s) => s.bodyStats)
  const upsertBodyStat = useStore((s) => s.upsertBodyStat)
  const openOverlay = useStore((s) => s.openOverlay)

  const [editBody, setEditBody] = useState(false)
  // The month on show — the current one to begin with.
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const total = useMemo(() => sessions.filter((s) => s.completedAt).length, [sessions])
  const inMonth = useMemo(
    () => monthSessions(sessions, month.year, month.month),
    [sessions, month],
  )
  const recap = useMemo(() => monthRecap(sessions, month.year, month.month), [sessions, month])
  const weeks = useMemo(() => calendarWeeks(month.year, month.month), [month])

  const now = new Date()
  const isThisMonth = now.getFullYear() === month.year && now.getMonth() === month.month
  const step = (by: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + by, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const monthName = new Date(month.year, month.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

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
          <div className="sub">{total} session{total === 1 ? '' : 's'} logged</div>
        </div>
      </div>

      {/* the month: calendar + recap */}
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => step(-1)} aria-label="previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="card-title">{monthName}</div>
          <button
            className="icon-btn"
            onClick={() => step(1)}
            aria-label="next month"
            disabled={isThisMonth}
            style={{ opacity: isThisMonth ? 0.35 : 1 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="cal">
          {DAY_LETTERS.map((d, i) => (
            <span key={i} className="cal-head">
              {d}
            </span>
          ))}
          {weeks.flat().map((day, i) => {
            if (day == null) return <span key={i} />
            const session = recap.days.get(day)
            const today = isThisMonth && day === now.getDate()
            const cls = 'cal-day' + (session ? ' on' : '') + (today ? ' today' : '')
            return session ? (
              <button
                key={i}
                className={cls}
                aria-label={`session on day ${day}`}
                onClick={() => openOverlay({ name: 'session', sessionId: session.id })}
              >
                {day}
              </button>
            ) : (
              <span key={i} className={cls}>
                {day}
              </span>
            )
          })}
        </div>
        <div className="recap">
          <div>
            <div className="num">{recap.workouts}</div>
            <div className="label">workouts</div>
          </div>
          <div>
            <div className="num">{recap.sets}</div>
            <div className="label">sets</div>
          </div>
          <div>
            <div className="num">{compactNumber(recap.volumeKg)}</div>
            <div className="label">kg lifted</div>
          </div>
          <div>
            <div className="num">{recap.prs}</div>
            <div className="label">records</div>
          </div>
        </div>
      </div>

      {/* sessions of the month */}
      {total === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={30} className="faint" />}
          title="No sessions yet"
          sub="Finish your first workout and it’ll show up here."
        />
      ) : inMonth.length === 0 ? (
        <div className="center-empty small" style={{ padding: '18px 20px' }}>
          No sessions this month.
        </div>
      ) : (
        inMonth.map((s) => {
          const levelUps = s.exercises.filter((e) => e.leveledUp).length
          const names = s.exercises
            .filter((e) => e.sets.some((x) => x.done))
            .map((e) => getExercise(e.exerciseId).name)
          return (
            <button
              key={s.id}
              className="card tap"
              onClick={() => openOverlay({ name: 'session', sessionId: s.id })}
            >
              <div className="row between">
                <div className="card-title grow clip-line">{sessionTitle(s)}</div>
                <div className="row" style={{ gap: 6, flexShrink: 0 }}>
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
              <div className="tiny muted" style={{ marginTop: 3 }}>
                {new Date(s.completedAt!).toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {sessionFacts(s)}
              </div>
              <div className="tiny faint clip-line" style={{ marginTop: 6 }}>
                {names.join(' · ')}
              </div>
              {s.notes && (
                <div className="tiny muted clip-line" style={{ marginTop: 4, fontStyle: 'italic' }}>
                  {s.notes}
                </div>
              )}
            </button>
          )
        })
      )}

      {/* body & recovery */}
      <div className="card" style={{ marginTop: 6 }}>
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

      {editBody && (
        <BodyModal
          initial={bodyStats.find((b) => b.date === todayKey())}
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
