import { useMemo } from 'react'
import {
  getProgram,
  MUSCLE_ORDER,
  type ExerciseDef,
  type Muscle,
} from '../program/exercises'
import {
  exerciseSeries,
  formatSeconds,
  volumeBand,
  weeklyVolume,
} from '../program/analytics'
import { formatKg } from '../program/ladder'
import { useStore } from '../store/useStore'
import { Sparkline } from '../ui/charts'
import { muscleColor } from '../ui/components'
import { ChevronRight } from '../ui/icons'

export function Progress() {
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const openOverlay = useStore((s) => s.openOverlay)

  const byMuscle = useMemo(() => {
    const program = getProgram(settings.program)
    const map = new Map<Muscle, ExerciseDef[]>()
    for (const m of MUSCLE_ORDER) map.set(m, [])
    for (const def of program) map.get(def.muscle)!.push(def)
    return map
  }, [settings.program])

  const volume = useMemo(() => weeklyVolume(sessions), [sessions])

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>Progress</h1>
          <div className="sub">Every lift climbs on its own.</div>
        </div>
      </div>

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
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: col,
                        }}
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
            const series = exerciseSeries(def.id, sessions)
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
                            last.isTime
                              ? formatSeconds(last.best)
                              : `${last.total} reps`
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
    </div>
  )
}
