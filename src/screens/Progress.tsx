import { useMemo, useState } from 'react'
import { MUSCLE_ORDER, getExercise, type ExerciseDef, type Muscle } from '../program/exercises'
import { getWeeklyPlan, planExercises } from '../program/plan'
import {
  exerciseSeries,
  formatSeconds,
  volumeBand,
  weeklyVolume,
  weekStreak,
  type ExercisePoint,
} from '../program/analytics'
import {
  fourWeekCompare,
  lifetimeStats,
  longestWeekStreak,
  muscleSetTotals,
  strengthGains,
  urgencies,
  weeklyVolumeSeries,
} from '../program/insights'
import { formatKg } from '../program/ladder'
import { epley1RM } from '../program/records'
import { useStore } from '../store/useStore'
import { BarChart, Sparkline } from '../ui/charts'
import { Coach, Segmented, muscleColor } from '../ui/components'
import { ChevronRight, Flame, Trophy } from '../ui/icons'
import type { DayPlan } from '../storage/types'

/** Compact kg for big totals: 1,284 · 12.4k · 1.2M. */
function compactKg(v: number): string {
  const n = Math.round(v)
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${+(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-US')
}

/** Plain count with a thousands separator once it grows. */
function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

/** Short "5 Jun" week label for the volume trend axis. */
function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Progress() {
  const settings = useStore((s) => s.settings)

  const [pane, setPane] = useState<'exercises' | 'insights'>('exercises')

  const plan = useMemo(() => getWeeklyPlan(settings.weeklyPlan), [settings.weeklyPlan])

  // Everything the weekly plan can train — including per-day added extras —
  // so no exercise with history is unreachable from this screen.
  const byMuscle = useMemo(() => {
    const defs = planExercises(plan, settings.program)
    const map = new Map<Muscle, ExerciseDef[]>()
    for (const m of MUSCLE_ORDER) map.set(m, [])
    for (const def of defs) map.get(def.muscle)!.push(def)
    return map
  }, [plan, settings.program])

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>Progress</h1>
          <div className="sub">
            {pane === 'exercises'
              ? 'Every lift climbs on its own.'
              : 'Numbers that keep you honest.'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={pane}
          onChange={setPane}
          options={[
            { value: 'exercises', label: 'Exercises' },
            { value: 'insights', label: 'Insights' },
          ]}
        />
      </div>

      {pane === 'exercises' ? (
        <ExercisesPane byMuscle={byMuscle} />
      ) : (
        <InsightsPane plan={plan} byMuscle={byMuscle} />
      )}
    </div>
  )
}

function ExercisesPane({ byMuscle }: { byMuscle: Map<Muscle, ExerciseDef[]> }) {
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const openOverlay = useStore((s) => s.openOverlay)

  const volume = useMemo(() => weeklyVolume(sessions), [sessions])

  // One pass over history per data change, not one sort per card per render.
  const seriesById = useMemo(() => {
    const map = new Map<string, ExercisePoint[]>()
    for (const defs of byMuscle.values()) {
      for (const def of defs) map.set(def.id, exerciseSeries(def.id, sessions))
    }
    return map
  }, [byMuscle, sessions])

  return (
    <>
      {sessions.length > 0 && (
        <>
          <div className="eyebrow">This week · volume</div>
          <div className="card">
            {volume.map((v, idx) => {
              const band = volumeBand(v.sets)
              const pct = Math.min(100, (v.sets / 24) * 100)
              const col = muscleColor(v.muscle)
              return (
                <div key={v.muscle} style={{ marginTop: idx === 0 ? 0 : 14 }}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span
                        style={{ width: 9, height: 9, borderRadius: '50%', background: col }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{v.muscle}</span>
                    </span>
                    <span
                      className="tiny"
                      style={{
                        fontWeight: 700,
                        color:
                          band === 'good'
                            ? 'var(--success)'
                            : band === 'high'
                              ? 'var(--accent-ink)'
                              : 'var(--faint)',
                      }}
                    >
                      {v.sets} sets{v.days > 0 ? ` · ${v.days}×` : ''}
                    </span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              )
            })}
            <div className="tiny faint" style={{ marginTop: 14 }}>
              Hard sets per muscle this week. ~10–20 is a productive range; train
              closer to failure and you need less.
            </div>
          </div>
        </>
      )}

      {MUSCLE_ORDER.map((muscle) => (
        <div key={muscle}>
          <div className="eyebrow">{muscle}</div>
          {byMuscle.get(muscle)!.map((def) => {
            const series = seriesById.get(def.id) ?? []
            const last = series[series.length - 1]
            const p = progress[def.id]
            const current =
              def.kind === 'time'
                ? formatSeconds(p?.targetSeconds ?? def.startSeconds ?? 0)
                : def.bodyweight
                  ? '—'
                  : formatKg(p?.currentWeightKg ?? def.startWeightKg)
            return (
              <button
                key={def.id}
                className="card tap"
                onClick={() => openOverlay({ name: 'exercise', exerciseId: def.id })}
              >
                <div className="row between">
                  <div className="row" style={{ gap: 9 }}>
                    <span
                      className="dot"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: muscleColor(def.muscle),
                      }}
                    />
                    <span className="card-title">{def.name}</span>
                  </div>
                  <ChevronRight size={18} className="faint" />
                </div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <div>
                    <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
                      {current}
                    </div>
                    <div className="tiny faint">
                      {series.length
                        ? `${series.length} session${series.length === 1 ? '' : 's'} · last ${
                            last.isTime ? formatSeconds(last.best) : `${last.total} reps`
                          }`
                        : 'not started'}
                    </div>
                  </div>
                  <div style={{ width: 120 }}>
                    <Sparkline
                      values={series.map((s) => s.load)}
                      color={muscleColor(def.muscle)}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

function InsightsPane({
  plan,
  byMuscle,
}: {
  plan: DayPlan[]
  byMuscle: Map<Muscle, ExerciseDef[]>
}) {
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const openOverlay = useStore((s) => s.openOverlay)

  const planIds = useMemo(
    () => [...byMuscle.values()].flat().map((d) => d.id),
    [byMuscle],
  )
  const alerts = useMemo(
    () => urgencies(plan, sessions, progress, planIds),
    [plan, sessions, progress, planIds],
  )
  const life = useMemo(() => lifetimeStats(sessions), [sessions])
  const streakNow = useMemo(() => weekStreak(plan, sessions), [plan, sessions])
  const bestStreak = useMemo(
    () => Math.max(longestWeekStreak(plan, sessions), streakNow),
    [plan, sessions, streakNow],
  )
  const momentum = useMemo(() => fourWeekCompare(sessions), [sessions])
  const volSeries = useMemo(() => weeklyVolumeSeries(sessions, 10), [sessions])
  const muscleTotals = useMemo(() => muscleSetTotals(sessions), [sessions])
  const gains = useMemo(
    () => strengthGains(sessions, planIds).filter((g) => g.pct > 0).slice(0, 3),
    [sessions, planIds],
  )
  // Est-1RM trajectory per top gain, for the row sparklines.
  const rmSeries = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const g of gains) {
      map.set(
        g.exerciseId,
        exerciseSeries(g.exerciseId, sessions).map((p) => epley1RM(p.weightKg, p.best)),
      )
    }
    return map
  }, [gains, sessions])

  const hasVolume = volSeries.some((w) => w.volumeKg > 0)
  const volColumns = volSeries.map((w, i) => ({
    label: i === volSeries.length - 1 ? 'this wk' : weekLabel(w.weekStart),
    value: w.volumeKg,
    highlight: i === volSeries.length - 1,
  }))
  const maxMuscle = Math.max(1, ...muscleTotals.map((m) => m.sets))

  const volPct =
    momentum.prevVolumeKg > 0
      ? Math.round(
          ((momentum.volumeKg - momentum.prevVolumeKg) / momentum.prevVolumeKg) * 100,
        )
      : null

  if (sessions.length === 0) {
    return (
      <Coach tone="info">
        Finish your first workout and this tab starts filling up — totals, momentum,
        strength gains, and warnings when something slips.
      </Coach>
    )
  }

  return (
    <>
      <div className="eyebrow">Needs attention</div>
      {alerts.length === 0 ? (
        <Coach tone="up">
          Nothing falling behind — the plan is on track. Keep stacking weeks. 💪
        </Coach>
      ) : (
        alerts.map((a, i) =>
          a.exerciseId ? (
            <button
              key={i}
              className="coach coach-stall"
              style={{ width: '100%', textAlign: 'left', marginBottom: 8, cursor: 'pointer' }}
              onClick={() => openOverlay({ name: 'exercise', exerciseId: a.exerciseId! })}
            >
              <span className="grow">{a.message}</span>
              <ChevronRight size={16} style={{ flexShrink: 0, alignSelf: 'center' }} />
            </button>
          ) : (
            <div key={i} className="coach coach-stall" style={{ marginBottom: 8 }}>
              <span>{a.message}</span>
            </div>
          ),
        )
      )}

      <div className="eyebrow">All time</div>
      <div className="tile-grid">
        <div className="tile">
          <div className="num">{life.workouts}</div>
          <div className="label">workouts</div>
        </div>
        <div className="tile">
          <div className="num">{compactKg(life.volumeKg)}</div>
          <div className="label">kg lifted</div>
        </div>
        <div className="tile">
          <div className="num row" style={{ gap: 6 }}>
            <Trophy size={19} style={{ color: 'var(--accent-ink)' }} /> {life.prs}
          </div>
          <div className="label">personal records</div>
        </div>
        <div className="tile">
          <div className="num row" style={{ gap: 6 }}>
            <Flame size={19} style={{ color: 'var(--accent-ink)' }} /> {bestStreak}
          </div>
          <div className="label">best week streak</div>
        </div>
      </div>

      <div className="eyebrow">Momentum · last 4 weeks vs previous</div>
      <div className="card">
        {hasVolume && (
          <>
            <div className="tiny faint" style={{ marginBottom: 2 }}>
              Weekly volume · kg moved
            </div>
            <BarChart columns={volColumns} formatValue={compactKg} />
            <div className="divider" />
          </>
        )}
        <div className="row between">
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
              {compactKg(momentum.volumeKg)} kg
            </div>
            <div className="tiny faint">moved in 4 weeks</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {volPct != null ? (
              <span className={volPct >= 0 ? 'delta-up' : 'delta-down'}>
                {volPct >= 0 ? '▲' : '▼'} {Math.abs(volPct)}%
              </span>
            ) : momentum.volumeKg > 0 ? (
              <span className="delta-up">new!</span>
            ) : (
              <span className="faint">—</span>
            )}
            <div className="tiny faint">
              vs {compactKg(momentum.prevVolumeKg)} kg before
            </div>
          </div>
        </div>
        <div className="divider" />
        <div className="row between">
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
              {momentum.workouts}
            </div>
            <div className="tiny faint">workouts in 4 weeks</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {momentum.workouts - momentum.prevWorkouts !== 0 ? (
              <span
                className={
                  momentum.workouts >= momentum.prevWorkouts ? 'delta-up' : 'delta-down'
                }
              >
                {momentum.workouts >= momentum.prevWorkouts ? '▲' : '▼'}{' '}
                {Math.abs(momentum.workouts - momentum.prevWorkouts)}
              </span>
            ) : (
              <span className="faint">=</span>
            )}
            <div className="tiny faint">vs {momentum.prevWorkouts} before</div>
          </div>
        </div>
      </div>

      <div className="eyebrow">Training balance · all-time sets</div>
      <div className="card">
        {muscleTotals.map((m, idx) => {
          const pct = Math.round((m.sets / maxMuscle) * 100)
          const col = muscleColor(m.muscle)
          return (
            <div key={m.muscle} style={{ marginTop: idx === 0 ? 0 : 12 }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span
                    style={{ width: 9, height: 9, borderRadius: '50%', background: col }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.muscle}</span>
                </span>
                <span
                  className="tiny"
                  style={{ fontWeight: 700, color: m.sets ? 'var(--muted)' : 'var(--faint)' }}
                >
                  {formatCount(m.sets)} sets
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${pct}%`, background: col }} />
              </div>
            </div>
          )
        })}
        <div className="tiny faint" style={{ marginTop: 14 }}>
          Every hard set you've logged, by muscle — the short bar is the group
          that could use more attention.
        </div>
      </div>

      <div className="eyebrow">Strength gains · est. 1RM</div>
      {gains.length === 0 ? (
        <div className="tiny faint" style={{ margin: '0 2px' }}>
          Log a few more sessions per exercise and your biggest climbers show up here.
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {gains.map((g) => (
            <button
              key={g.exerciseId}
              className="list-row"
              style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
              onClick={() => openOverlay({ name: 'exercise', exerciseId: g.exerciseId })}
            >
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getExercise(g.exerciseId).name}
                </div>
                <div className="tiny faint">
                  {formatKg(g.firstRM)} → {formatKg(g.recentRM)}
                </div>
              </div>
              <div style={{ width: 60, flexShrink: 0 }}>
                <Sparkline
                  values={rmSeries.get(g.exerciseId) ?? []}
                  color={muscleColor(getExercise(g.exerciseId).muscle)}
                  height={30}
                />
              </div>
              <span className="delta-up" style={{ flexShrink: 0 }}>
                ▲ {g.pct}%
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
