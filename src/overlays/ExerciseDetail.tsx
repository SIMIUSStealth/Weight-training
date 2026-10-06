import { useMemo, useState } from 'react'
import {
  getExercise,
  getSlot,
  setScheme,
  slotOptions,
  type ExerciseDef,
} from '../program/exercises'
import { computeRecommendation, defaultProgress, isLoaded } from '../program/progression'
import { getGuide } from '../program/guides'
import { collectBests, tracksOneRM } from '../program/records'
import {
  formatKg,
  formatLoad,
  isTopRung,
  ladderFor,
  nextRung,
  prevRung,
  resolveIncrements,
} from '../program/ladder'
import { exerciseSeries, formatSeconds, relativeDay } from '../program/analytics'
import { useStore } from '../store/useStore'
import { LineChart } from '../ui/charts'
import { Coach, GuideLink, Modal, MuscleChip, muscleColor } from '../ui/components'
import { ChevronLeft, ChevronRight, Minus, Plus, Trophy } from '../ui/icons'

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const def = getExercise(exerciseId)
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const setExerciseWeight = useStore((s) => s.setExerciseWeight)
  const setTimeTarget = useStore((s) => s.setTimeTarget)
  const swapExercise = useStore((s) => s.swapExercise)
  const openOverlay = useStore((s) => s.openOverlay)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [swapTo, setSwapTo] = useState<ExerciseDef | null>(null)

  const p = progress[exerciseId] ?? defaultProgress(def)
  const slot = getSlot(exerciseId)
  const options = slot ? slotOptions(slot.id) : []
  const color = muscleColor(def.muscle)
  const increments = useMemo(
    () => resolveIncrements(settings.increments),
    [settings.increments],
  )
  const ladder = ladderFor(def.equipment, increments)
  const loaded = isLoaded(def)

  // Both walk the full session history — recompute only when the data does,
  // not on every stepper tap.
  const rec = useMemo(
    () => computeRecommendation(def, p, sessions, increments),
    [def, p, sessions, increments],
  )
  const { series, loadPoints, topPoints } = useMemo(() => {
    const series = exerciseSeries(exerciseId, sessions)
    return {
      series,
      loadPoints: series.map((s) => ({ label: relativeDay(s.date), y: s.load })),
      topPoints: series.map((s) => ({ label: relativeDay(s.date), y: s.best })),
    }
  }, [exerciseId, sessions])

  const bests = useMemo(() => collectBests(exerciseId, sessions), [exerciseId, sessions])
  const hasBests =
    def.kind === 'time' ? bests.longestHold > 0 : bests.best1RM > 0 || !!bests.topSet

  const isTime = def.kind === 'time'
  // Unloaded time = a hold whose target climbs; loaded time = kettlebell work.
  const isHold = isTime && !loaded
  const bestLabel = (() => {
    if (isTime) return `${formatSeconds(bests.longestHold)} ${isHold ? 'hold' : 'set'}`
    if (bests.best1RM > 0) {
      return `${bests.best1RMReps} × ${formatKg(bests.best1RMWeightKg ?? 0)} · est. 1RM ${formatKg(bests.best1RM)}`
    }
    const top = bests.topSet
    return top ? `${top.reps} reps @ ${formatLoad(def.equipment, top.weightKg)}` : ''
  })()

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
                {isHold
                  ? 'TARGET HOLD'
                  : !loaded
                    ? 'BODYWEIGHT'
                    : def.equipment === 'kettlebell'
                      ? 'KETTLEBELL'
                      : 'CURRENT LOAD'}
              </div>
              <div className="display" style={{ fontSize: 32, fontWeight: 800 }}>
                {isHold
                  ? formatSeconds(p.targetSeconds ?? def.startSeconds ?? 0)
                  : formatLoad(def.equipment, p.currentWeightKg)}
              </div>
              <div className="tiny muted">
                {def.sets} ×{' '}
                {isHold
                  ? 'hold'
                  : isTime
                    ? formatSeconds(p.targetSeconds ?? def.startSeconds ?? 30)
                    : `${def.repMin}–${def.repMax}`}
                {def.perArm ? ' · each side' : ''}
              </div>
            </div>
            {loaded && (
              <div className="stepper">
                <button
                  aria-label="lighter"
                  disabled={prevRung(p.currentWeightKg, ladder) === p.currentWeightKg}
                  onClick={() =>
                    setExerciseWeight(exerciseId, prevRung(p.currentWeightKg, ladder))
                  }
                >
                  <Minus size={20} />
                </button>
                <div className="val" style={{ minWidth: 40, fontSize: 14 }}>
                  kg
                </div>
                <button
                  aria-label="heavier"
                  disabled={isTopRung(p.currentWeightKg, ladder)}
                  onClick={() =>
                    setExerciseWeight(exerciseId, nextRung(p.currentWeightKg, ladder))
                  }
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
            {isHold && (
              <div className="stepper">
                <button
                  aria-label="less"
                  onClick={() =>
                    setTimeTarget(
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
                  onClick={() => setTimeTarget(exerciseId, (p.targetSeconds ?? 30) + 10)}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>
          {def.holdNote && (
            <div className="tiny faint" style={{ marginTop: 8 }}>
              {def.holdNote}
            </div>
          )}
        </div>

        {hasBests && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <div className="row between">
              <span className="row tiny faint" style={{ gap: 6, fontWeight: 700 }}>
                <Trophy size={14} /> ALL-TIME BEST
              </span>
              <span className="small" style={{ fontWeight: 700 }}>
                {bestLabel}
              </span>
            </div>
          </div>
        )}

        {rec.coach && (
          <Coach tone={rec.justLeveledUp ? 'up' : rec.stalled ? 'stall' : 'info'}>
            {rec.coach}
          </Coach>
        )}
        {rec.effortNote && <Coach tone="info">{rec.effortNote}</Coach>}

        {/* swap to a variation */}
        {slot && options.length > 1 && (
          <>
            <div className="eyebrow">Swap · {slot.label}</div>
            {(rec.stalled || (loaded && rec.atTopRung)) && (
              <Coach tone="info">
                Tapped out? Swapping for a variation restarts progress — exactly
                what the plan suggests every 8–12 weeks.
              </Coach>
            )}
            <div className="card" style={{ padding: '4px 16px' }}>
              {options.map((opt) => {
                const isCurrent = opt.id === exerciseId
                const seen = !!progress[opt.id]
                return (
                  <button
                    key={opt.id}
                    className="list-row"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 0,
                      color: 'inherit',
                      textAlign: 'left',
                    }}
                    disabled={isCurrent}
                    onClick={() => setSwapTo(opt)}
                  >
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>
                        {opt.name}
                        {isCurrent && (
                          <span className="chip" style={{ marginLeft: 8 }}>
                            current
                          </span>
                        )}
                      </div>
                      <div className="tiny faint">
                        {setScheme(opt)}
                        {seen && !isCurrent ? ' · has history' : ''}
                      </div>
                    </div>
                    {!isCurrent && <ChevronRight size={18} className="faint" />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* charts */}
        {series.length >= 2 ? (
          <>
            <div className="eyebrow">
              {isTime ? 'Total time' : tracksOneRM(def) ? 'Work per session' : 'Total reps'}
            </div>
            <div className="card">
              <LineChart
                points={loadPoints}
                color={color}
                formatY={(v) => (isTime ? formatSeconds(Math.round(v)) : String(Math.round(v)))}
              />
            </div>
            <div className="eyebrow">{isTime ? 'Best set (seconds)' : 'Top set (reps)'}</div>
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
                          {isTime ? formatSeconds(v) : `${v}${def.perArm ? '/side' : ''}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>
                      {isTime ? formatSeconds(s.best) : `${s.total} reps`}
                    </div>
                    <div className="tiny faint">
                      {isHold ? `${def.sets} sets` : formatLoad(def.equipment, s.weightKg)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* form */}
        <div className="eyebrow">Form</div>
        {getGuide(def.id) && (
          <p className="small muted" style={{ margin: '0 2px 10px' }}>
            {getGuide(def.id)!.about}
          </p>
        )}
        <div className="coach">
          <span>{def.formCue}</span>
        </div>
        <GuideLink exerciseId={def.id} />
      </div>

      {swapTo && slot && (
        <Modal title={`Swap to ${swapTo.name}?`} onClose={() => setSwapTo(null)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Replaces <strong>{def.name}</strong> in your{' '}
            <strong>{slot.label}</strong> slot from your next session.{' '}
            {progress[swapTo.id]
              ? 'Your saved progress for it returns where you left off.'
              : `It starts fresh at ${
                  swapTo.kind === 'time' && swapTo.equipment === 'none'
                    ? formatSeconds(swapTo.startSeconds ?? 30)
                    : formatLoad(swapTo.equipment, swapTo.startWeightKg)
                }.`}{' '}
            Your {def.name} history stays untouched.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              const id = swapTo.id
              swapExercise(slot.id, id)
              setSwapTo(null)
              openOverlay({ name: 'exercise', exerciseId: id })
            }}
          >
            Swap to {swapTo.name}
          </button>
        </Modal>
      )}
    </div>
  )
}
