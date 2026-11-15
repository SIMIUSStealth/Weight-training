// The set table of the workout screen: one row per set — its number and last
// time's result, the load, the reps and a tick — and under it the effort
// ("reps left") chips.

import { Fragment } from 'react'
import type { ExerciseDef } from '../../program/exercises'
import { formatLoadShort } from '../../program/ladder'
import type { Recommendation } from '../../program/progression'
import { formatSeconds } from '../../program/analytics'
import { setKg } from '../../program/sets'
import { Stepper } from '../../ui/components'
import { Check } from '../../ui/icons'
import type { ExerciseLog } from '../../storage/types'
import type { Hold } from './timers'

// Reps-in-reserve options, shown most-in-reserve → to-failure.
const RIR_OPTIONS = [
  { v: 3, label: '3+' },
  { v: 2, label: '2' },
  { v: 1, label: '1' },
  { v: 0, label: 'Fail' },
]

/** "60kg" with the unit set small; "BW" as it is. */
function Load({ text }: { text: string }) {
  if (!text.endsWith('kg')) return <>{text}</>
  return (
    <>
      {text.slice(0, -2)}
      <span className="unit">kg</span>
    </>
  )
}

export function RepRows({
  def,
  exLog,
  rec,
  loaded,
  onReps,
  onToggle,
  onEffort,
  onWeight,
}: {
  def: ExerciseDef
  exLog: ExerciseLog
  rec: Recommendation
  loaded: boolean
  onReps: (setIndex: number, reps: number) => void
  /** Tick / un-tick a set; `reps` is what the row shows. */
  onToggle: (setIndex: number, reps: number) => void
  /** An effort chip: logs the set too if it isn't yet; undefined clears it. */
  onEffort: (setIndex: number, reps: number, rir: number | undefined) => void
  onWeight: (setIndex: number) => void
}) {
  // The set you're on: its effort chips log it in one tap.
  const current = exLog.sets.findIndex((s) => !s.done)
  return (
    <>
      <div className="set-head">
        <span className="c-meta">{rec.hasHistory ? 'Last' : 'Set'}</span>
        {loaded && <span className="c-kg">Load</span>}
        <span className="grow">{def.perArm ? 'Reps / side' : 'Reps'}</span>
        <span className="c-check" />
      </div>
      {exLog.sets.map((s, i) => {
        const value = s.reps ?? rec.lastSets[i] ?? def.repMin
        const kg = setKg(exLog, s)
        const own = Math.abs(kg - exLog.weightKg) > 1e-9
        return (
          <Fragment key={i}>
            <div className="set-row">
              <div className="set-meta">
                <div className="set-no">{i + 1}</div>
                {rec.lastSets[i] != null && (
                  <div className="tiny faint set-last">
                    {rec.lastSets[i]}
                    {loaded && (
                      <>
                        <br />
                        {formatLoadShort(def.equipment, rec.lastLoads[i])}
                      </>
                    )}
                  </div>
                )}
              </div>
              {loaded && (
                <button
                  className={'set-kg' + (own ? ' own' : '')}
                  onClick={() => onWeight(i)}
                  aria-label={`set ${i + 1} load`}
                >
                  <Load text={formatLoadShort(def.equipment, kg)} />
                </button>
              )}
              <div className="grow row" style={{ justifyContent: 'center' }}>
                <Stepper compact value={value} min={0} max={60} onChange={(v) => onReps(i, v)} />
              </div>
              <button
                className={'set-check' + (s.done ? ' done' : '')}
                onClick={() => onToggle(i, value)}
                aria-label="toggle done"
              >
                <Check size={22} />
              </button>
            </div>
            {(s.done || i === current) && (
              <div className="rir-strip">
                <span className="rir-label">{s.done ? 'reps left' : 'log · reps left'}</span>
                {RIR_OPTIONS.filter((o) => !s.done || s.rir == null || s.rir === o.v).map((o) => (
                  <button
                    key={o.v}
                    className={
                      'rir-chip' + (o.v === 0 ? ' fail' : '') + (s.done && s.rir === o.v ? ' on' : '')
                    }
                    aria-label={`${o.label} reps left, set ${i + 1}`}
                    onClick={() => onEffort(i, value, s.done && s.rir === o.v ? undefined : o.v)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </Fragment>
        )
      })}
    </>
  )
}

export function TimeRows({
  exLog,
  rec,
  target,
  isHold,
  hold,
  onStart,
  onToggle,
}: {
  exLog: ExerciseLog
  rec: Recommendation
  target: number
  /** An unloaded hold (plank), as opposed to timed work with a kettlebell. */
  isHold: boolean
  hold: Hold | null
  onStart: (setIndex: number) => void
  onToggle: (setIndex: number) => void
}) {
  return (
    <>
      {exLog.sets.map((s, i) => (
        <div className="set-row" key={i}>
          <div className="set-meta">
            <div className="set-no">{i + 1}</div>
            {rec.lastSets[i] != null && (
              <div className="tiny faint set-last">{formatSeconds(rec.lastSets[i])}</div>
            )}
          </div>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>
              {s.done ? formatSeconds(s.seconds ?? 0) : `Target ${formatSeconds(target)}`}
            </div>
            <div className="tiny faint">
              {s.done ? (isHold ? 'held' : 'done') : `tap ${isHold ? 'hold' : 'go'} for the countdown`}
            </div>
          </div>
          <button className="btn btn-sm" disabled={!!hold} onClick={() => onStart(i)}>
            {s.done ? 'Redo' : isHold ? 'Hold' : 'Go'}
          </button>
          <button
            className={'set-check' + (s.done ? ' done' : '')}
            onClick={() => onToggle(i)}
            aria-label="toggle done"
          >
            <Check size={22} />
          </button>
        </div>
      ))}
    </>
  )
}
