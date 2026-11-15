// The workout's bottom sheets: the overview of every exercise, adding one,
// swapping the current one, and the finish prompt.

import { Fragment, useEffect, useMemo, useState } from 'react'
import { addableToWorkout, pickerGroups } from '../../program/catalog'
import {
  blockFor,
  effectiveDef,
  getExercise,
  setScheme,
  slotOptions,
  type ExerciseDef,
  type Muscle,
  type Slot,
} from '../../program/exercises'
import { useStore } from '../../store/useStore'
import { Modal, muscleColor } from '../../ui/components'
import { Plus, Search, X } from '../../ui/icons'
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

/**
 * How much of the bottom of the screen the on-screen keyboard covers, in px —
 * so a list in a bottom sheet can still be scrolled clear of it.
 */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () =>
      setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

/**
 * Pick an exercise to add: every exercise not yet in the workout, grouped by
 * muscle, with a search box and a muscle filter.
 */
export function AddSheet({ exercises, onClose }: { exercises: ExerciseLog[]; onClose: () => void }) {
  const addToSession = useStore((s) => s.addToSession)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const keyboard = useKeyboardInset()

  const all = useMemo(() => addableToWorkout(exercises), [exercises])
  const muscles = useMemo(() => pickerGroups(all).map((g) => g.muscle), [all])
  const groups = useMemo(() => pickerGroups(all, query, muscle), [all, query, muscle])

  return (
    <Modal title="Add to this workout" onClose={onClose}>
      <div className="search-box">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="search exercises"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query && (
          <button aria-label="clear search" onClick={() => setQuery('')}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="pick-chips" role="tablist" aria-label="muscle group">
        <button
          role="tab"
          aria-selected={muscle === null}
          className={'ex-pill' + (muscle === null ? ' on' : '')}
          onClick={() => setMuscle(null)}
        >
          All
        </button>
        {muscles.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={muscle === m}
            className={'ex-pill' + (muscle === m ? ' on' : '')}
            onClick={() => setMuscle(muscle === m ? null : m)}
          >
            <span className="dot" style={{ background: muscleColor(m) }} />
            {m}
          </button>
        ))}
      </div>
      {/* a fixed height, so the sheet doesn't jump as the results narrow */}
      <div className="pick-list" style={{ paddingBottom: keyboard }}>
        {groups.length === 0 ? (
          <div className="center-empty small" style={{ padding: '28px 12px' }}>
            {query.trim() ? (
              <>
                Nothing matches &ldquo;{query.trim()}&rdquo;
                {muscle ? ` in ${muscle}` : ''}.
              </>
            ) : (
              'Every exercise is already in this workout.'
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.muscle}>
              <div className="pick-head">
                <span className="dot" style={{ background: muscleColor(g.muscle) }} />
                {g.muscle}
                <span className="count">{g.entries.length}</span>
              </div>
              {g.entries.map(({ def: d, slot }) => (
                <button
                  key={d.id}
                  className="list-row"
                  style={rowButton}
                  onClick={() => {
                    addToSession(d.id, slot.id)
                    onClose()
                  }}
                >
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div className="tiny faint">
                      {setScheme(effectiveDef(d, slot.id))} · {slot.label}
                    </div>
                  </div>
                  <Plus size={16} className="faint" />
                </button>
              ))}
            </div>
          ))
        )}
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
