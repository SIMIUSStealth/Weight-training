import { useMemo } from 'react'
import {
  getProgram,
  MUSCLE_ORDER,
  type ExerciseDef,
  type Muscle,
} from '../program/exercises'
import { exerciseSeries, formatSeconds } from '../program/analytics'
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

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>Progress</h1>
          <div className="sub">Every lift climbs on its own.</div>
        </div>
      </div>

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
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{current}</div>
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
