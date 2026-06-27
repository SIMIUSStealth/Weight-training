import { getExercise } from '../program/exercises'
import { computeRecommendation } from '../program/progression'
import { formatKg, isTopRung, nextRung, prevRung } from '../program/ladder'
import { exerciseSeries, formatSeconds, relativeDay } from '../program/analytics'
import { useStore } from '../store/useStore'
import { LineChart } from '../ui/charts'
import { Coach, MuscleChip, muscleColor } from '../ui/components'
import { ChevronLeft, Minus, Plus } from '../ui/icons'

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const def = getExercise(exerciseId)
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const setExerciseWeight = useStore((s) => s.setExerciseWeight)
  const setPlankTarget = useStore((s) => s.setPlankTarget)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const p = progress[exerciseId]!
  const rec = computeRecommendation(def, p, sessions)
  const series = exerciseSeries(exerciseId, sessions)
  const color = muscleColor(def.muscle)

  const loadPoints = series.map((s) => ({
    label: relativeDay(s.date),
    y: s.load,
  }))
  const topPoints = series.map((s) => ({
    label: relativeDay(s.date),
    y: s.best,
  }))

  const isTime = def.kind === 'time'

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row" style={{ gap: 10 }}>
          <button className="icon-btn" onClick={closeOverlay} aria-label="back">
            <ChevronLeft size={20} />
          </button>
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: 17 }}>{def.name}</div>
          </div>
          <MuscleChip muscle={def.muscle} />
        </div>
      </div>

      <div className="overlay-body">
        {/* current setting + adjust */}
        <div className="card">
          <div className="row between">
            <div>
              <div className="tiny faint">
                {isTime ? 'TARGET HOLD' : def.bodyweight ? 'BODYWEIGHT' : 'CURRENT WEIGHT'}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>
                {isTime
                  ? formatSeconds(p.targetSeconds ?? def.startSeconds ?? 0)
                  : def.bodyweight
                    ? '—'
                    : formatKg(p.currentWeightKg)}
              </div>
              <div className="tiny muted">
                {def.sets} ×{' '}
                {isTime ? 'hold' : `${def.repMin}–${def.repMax}`}
                {def.perArm ? ' · each arm' : ''}
              </div>
            </div>
            {!def.bodyweight && !isTime && (
              <div className="stepper">
                <button
                  aria-label="lighter"
                  disabled={prevRung(p.currentWeightKg) === p.currentWeightKg}
                  onClick={() => setExerciseWeight(exerciseId, prevRung(p.currentWeightKg))}
                >
                  <Minus size={20} />
                </button>
                <div className="val" style={{ minWidth: 40, fontSize: 14 }}>
                  kg
                </div>
                <button
                  aria-label="heavier"
                  disabled={isTopRung(p.currentWeightKg)}
                  onClick={() => setExerciseWeight(exerciseId, nextRung(p.currentWeightKg))}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
            {isTime && (
              <div className="stepper">
                <button
                  aria-label="less"
                  onClick={() =>
                    setPlankTarget(
                      exerciseId,
                      Math.max(10, (p.targetSeconds ?? 30) - 10),
                    )
                  }
                >
                  <Minus size={20} />
                </button>
                <div className="val" style={{ minWidth: 40, fontSize: 14 }}>
                  sec
                </div>
                <button
                  aria-label="more"
                  onClick={() => setPlankTarget(exerciseId, (p.targetSeconds ?? 30) + 10)}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {rec.coach && (
          <Coach tone={rec.justLeveledUp ? 'up' : rec.stalled ? 'stall' : 'info'}>
            {rec.coach}
          </Coach>
        )}

        {/* charts */}
        {series.length >= 2 ? (
          <>
            <div className="eyebrow">{isTime ? 'Total hold' : 'Work per session'}</div>
            <div className="card">
              <LineChart
                points={loadPoints}
                color={color}
                formatY={(v) => (isTime ? formatSeconds(Math.round(v)) : String(Math.round(v)))}
              />
            </div>
            <div className="eyebrow">{isTime ? 'Best hold' : 'Top set (reps)'}</div>
            <div className="card">
              <LineChart
                points={topPoints}
                color={color}
                formatY={(v) => (isTime ? formatSeconds(Math.round(v)) : String(Math.round(v)))}
              />
            </div>
          </>
        ) : (
          <Coach tone="info">
            Log a couple of sessions and your progress charts will appear here.
          </Coach>
        )}

        {/* history */}
        {series.length > 0 && (
          <>
            <div className="eyebrow">History</div>
            <div className="card">
              {[...series].reverse().map((s, i) => (
                <div className="list-row" key={i} style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{relativeDay(s.date)}</div>
                    <div className="tiny faint">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                      {s.sets.map((v, j) => (
                        <span
                          key={j}
                          className="chip"
                          style={{ background: 'var(--surface-3)', fontWeight: 700 }}
                        >
                          {isTime ? formatSeconds(v) : `${v}${def.perArm ? '/arm' : ''}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>
                      {isTime ? formatSeconds(s.best) : `${s.total} reps`}
                    </div>
                    <div className="tiny faint">
                      {isTime ? `${def.sets} sets` : def.bodyweight ? '' : formatKg(s.weightKg)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* form */}
        <div className="eyebrow">Form</div>
        <div className="coach">
          <span>{def.formCue}</span>
        </div>
      </div>
    </div>
  )
}
