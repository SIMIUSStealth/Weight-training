// The workout's bottom sheets: the overview of every exercise, adding one,
// swapping the current one, and the finish prompt.

import { Fragment } from 'react'
import {
  BLOCKS,
  SLOTS_BY_ID,
  blockFor,
  blockOptions,
  effectiveDef,
  getExercise,
  setScheme,
  slotOptions,
  type ExerciseDef,
  type Slot,
} from '../../program/exercises'
import { useStore } from '../../store/useStore'
import { Modal } from '../../ui/components'
import { Plus, X } from '../../ui/icons'
import type { ExerciseLog } from '../../storage/types'

const rowButton = {
  width: '100%',
  background: 'none',
  border: 0,
  color: 'inherit',
  textAlign: 'left',
} as const

export function OverviewSheet({
  exercises,
  index,
  onJump,
  onRemoved,
  onAdd,
  onClose,
}: {
  exercises: ExerciseLog[]
  index: number
  onJump: (i: number) => void
  /** After removing the exercise at `i` (the list is one shorter). */
  onRemoved: (i: number) => void
  onAdd: () => void
  onClose: () => void
}) {
  const removeFromSession = useStore((s) => s.removeFromSession)
  return (
    <Modal title="This workout" onClose={onClose}>
      <div style={{ maxHeight: '58vh', overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
        {exercises.map((e, i) => {
          const d = getExercise(e.exerciseId)
          const b = blockFor(e.exerciseId, e.slot)
          const done = e.sets.filter((s) => s.done).length
          const prev = exercises[i - 1]
          const prevBlock = prev ? blockFor(prev.exerciseId, prev.slot) : undefined
          return (
            <Fragment key={e.exerciseId}>
              {b && b.id !== prevBlock?.id && (
                <div className="eyebrow" style={{ margin: i === 0 ? '0 2px 6px' : '14px 2px 6px' }}>
                  {b.name}
                </div>
              )}
              <div
                className="list-row"
                style={{
                  borderRadius: 12,
                  padding: '8px 10px',
                  background: i === index ? 'var(--surface-2)' : undefined,
                }}
              >
                <button className="grow" style={{ ...rowButton, padding: 0 }} onClick={() => onJump(i)}>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div className="row" style={{ gap: 4, marginTop: 5 }}>
                    {e.sets.map((s, j) => (
                      <span
                        key={j}
                        className="dot"
                        style={{ background: s.done ? 'var(--success)' : 'var(--surface-3)' }}
                      />
                    ))}
                    <span className="tiny faint" style={{ marginLeft: 4 }}>
                      {done}/{e.sets.length} sets
                    </span>
                  </div>
                </button>
                {done === 0 && exercises.length > 1 && (
                  <button
                    className="icon-btn"
                    style={{ width: 36, height: 36, color: 'var(--danger)' }}
                    aria-label={`remove ${d.name}`}
                    onClick={() => {
                      removeFromSession(e.exerciseId)
                      onRemoved(i)
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </Fragment>
          )
        })}
      </div>
      <button className="btn btn-block" style={{ marginTop: 12 }} onClick={onAdd}>
        <Plus size={18} /> Add exercise
      </button>
      <div className="tiny faint" style={{ textAlign: 'center', marginTop: 8 }}>
        Changes apply to this workout only — your weekly plan stays as it is.
      </div>
    </Modal>
  )
}

export function AddSheet({ exercises, onClose }: { exercises: ExerciseLog[]; onClose: () => void }) {
  const addToSession = useStore((s) => s.addToSession)
  const inSession = new Set(exercises.map((e) => e.exerciseId))
  return (
    <Modal title="Add to this workout" onClose={onClose}>
      <div style={{ maxHeight: '62vh', overflowY: 'auto' }}>
        {BLOCKS.map((b) => {
          const opts = blockOptions(b.id).filter((o) => !inSession.has(o.def.id))
          if (!opts.length) return null
          return (
            <div key={b.id}>
              <div className="eyebrow" style={{ margin: '10px 2px 6px' }}>
                {b.name}
              </div>
              {opts.map(({ def: d, slotId }) => (
                <button
                  key={d.id}
                  className="list-row"
                  style={rowButton}
                  onClick={() => {
                    addToSession(d.id, slotId)
                    onClose()
                  }}
                >
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div className="tiny faint">
                      {setScheme(effectiveDef(d, slotId))} · {SLOTS_BY_ID[slotId].label}
                    </div>
                  </div>
                  <Plus size={16} className="faint" />
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export function SwapSheet({
  def,
  slot,
  exercises,
  onClose,
}: {
  def: ExerciseDef
  slot: Slot
  exercises: ExerciseLog[]
  onClose: () => void
}) {
  const swapInSession = useStore((s) => s.swapInSession)
  return (
    <Modal title={`Swap ${def.name}`} onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        For this workout only. Each variation keeps its own weight &amp; history.
      </p>
      {slotOptions(slot.id).map((opt) => {
        const current = opt.id === def.id
        const taken = !current && exercises.some((e) => e.exerciseId === opt.id)
        return (
          <button
            key={opt.id}
            className="list-row"
            style={rowButton}
            disabled={current || taken}
            onClick={() => {
              swapInSession(def.id, opt.id)
              onClose()
            }}
          >
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {opt.name}
                {current && (
                  <span className="chip" style={{ marginLeft: 8 }}>
                    current
                  </span>
                )}
                {taken && (
                  <span className="chip" style={{ marginLeft: 8 }}>
                    in workout
                  </span>
                )}
              </div>
              <div className="tiny faint">{setScheme(effectiveDef(opt, slot.id))}</div>
            </div>
          </button>
        )
      })}
    </Modal>
  )
}

/**
 * Finish prompt. With exercises still untouched it offers to split them into
 * a later part; with every set ticked it's the nudge to finish now — so the
 * workout doesn't sit open until the next one.
 */
export function FinishSheet({
  performed,
  untouched,
  total,
  part,
  onClose,
}: {
  performed: number
  untouched: number
  total: number
  part: number
  onClose: () => void
}) {
  const finishSession = useStore((s) => s.finishSession)
  const splitSession = useStore((s) => s.splitSession)
  if (untouched === 0) {
    return (
      <Modal title="All sets done" onClose={onClose}>
        <p className="small muted" style={{ marginTop: 0 }}>
          That&rsquo;s every set of the workout. Finish to save it and see what leveled up.
        </p>
        <button
          className="btn btn-success btn-block btn-lg"
          onClick={() => {
            onClose()
            finishSession()
          }}
        >
          Finish workout
        </button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>
          Not yet
        </button>
      </Modal>
    )
  }
  return (
    <Modal title="Finish here?" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        You&rsquo;ve done {performed} of {total} exercises. Save the remaining {untouched} as{' '}
        <strong>Part {part + 1}</strong> to finish later — it still counts as one workout for
        the week.
      </p>
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          onClose()
          splitSession()
        }}
      >
        Split — save {untouched} for later
      </button>
      <button
        className="btn btn-block"
        style={{ marginTop: 8 }}
        onClick={() => {
          onClose()
          finishSession()
        }}
      >
        Just finish for today
      </button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>
        Keep going
      </button>
    </Modal>
  )
}
