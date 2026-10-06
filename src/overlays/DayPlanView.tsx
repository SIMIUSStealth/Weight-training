import { useState } from 'react'
import {
  BLOCKS,
  getSlot,
  setScheme,
  slotOptions,
  type BlockId,
  type ExerciseDef,
} from '../program/exercises'
import {
  addableForBlock,
  dayExercises,
  dayMuscles,
  getWeeklyPlan,
  muscleFrequency,
  WEEKDAYS_LONG,
} from '../program/plan'
import { weekStatuses } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Coach, Modal, muscleColor } from '../ui/components'
import { Check, ChevronLeft, Play, Plus, X } from '../ui/icons'
import type { DayPlan } from '../storage/types'

export function DayPlanView({ weekday }: { weekday: number }) {
  const settings = useStore((s) => s.settings)
  const sessions = useStore((s) => s.sessions)
  const activeSession = useStore((s) => s.activeSession)
  const toggleDayBlock = useStore((s) => s.toggleDayBlock)
  const addExerciseToDay = useStore((s) => s.addExerciseToDay)
  const removeExerciseFromDay = useStore((s) => s.removeExerciseFromDay)
  const swapExercise = useStore((s) => s.swapExercise)
  const startDay = useStore((s) => s.startDay)
  const resumeSession = useStore((s) => s.resumeSession)
  const openOverlay = useStore((s) => s.openOverlay)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [swapFor, setSwapFor] = useState<ExerciseDef | null>(null)
  const [addFor, setAddFor] = useState<BlockId | null>(null)

  const plan = getWeeklyPlan(settings.weeklyPlan)
  const day = plan[weekday]
  const exs = dayExercises(day, settings.program)
  const freq = muscleFrequency(plan, settings.program)
  const muscles = dayMuscles(day, settings.program)
  const status = weekStatuses(plan, sessions, activeSession)[weekday].status
  const activeOtherDay = !!activeSession && activeSession.weekday !== weekday

  // A section per block that's switched on or carries an added extra.
  const sections = BLOCKS.map((b) => ({
    block: b,
    on: day.blocks.includes(b.id),
    items: exs.filter((e) => getSlot(e.id)?.block === b.id),
  })).filter((s) => s.on || s.items.length > 0)

  const doneSession =
    status === 'done'
      ? sessions
          .filter((s) => s.completedAt && s.weekday === weekday)
          .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))[0]
      : undefined

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row" style={{ gap: 10 }}>
          <button className="icon-btn" onClick={closeOverlay} aria-label="back">
            <ChevronLeft size={20} />
          </button>
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: 17 }}>{WEEKDAYS_LONG[weekday]}</div>
            <div className="tiny faint">
              {day.blocks.length ? `${exs.length} exercises` : 'Rest day'}
            </div>
          </div>
          {status === 'done' && (
            <span className="chip" style={{ color: 'var(--success)' }}>
              <Check size={13} /> Done
            </span>
          )}
          {status === 'inprogress' && (
            <span className="chip" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>
              In progress
            </span>
          )}
        </div>
      </div>

      <div className="overlay-body">
        <div className="eyebrow">Routine</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {BLOCKS.map((b) => {
            const sel = day.blocks.includes(b.id)
            return (
              <button
                key={b.id}
                className="chip"
                style={{
                  border: '1px solid var(--border)',
                  background: sel ? 'var(--surface-3)' : 'var(--surface-2)',
                  color: sel ? 'var(--text)' : 'var(--faint)',
                  fontWeight: sel ? 700 : 600,
                  padding: '8px 13px',
                }}
                onClick={() => toggleDayBlock(weekday, b.id)}
              >
                {sel && <Check size={13} />}
                {b.short}
              </button>
            )
          })}
        </div>

        {muscles.length > 0 && (
          <div className="row wrap" style={{ gap: 10, marginTop: 12 }}>
            {muscles.map((m) => (
              <span
                key={m}
                className="tiny"
                style={{
                  fontWeight: 700,
                  color: freq[m] < 2 ? 'var(--accent-ink)' : 'var(--muted)',
                }}
              >
                <span
                  className="dot"
                  style={{ background: muscleColor(m), marginRight: 5 }}
                />
                {m} {freq[m]}×/wk
              </span>
            ))}
          </div>
        )}

        {sections.length === 0 ? (
          <Coach tone="info">
            Rest day. Tap a block above to train on this day — recovery is where
            muscle is actually built.
          </Coach>
        ) : (
          sections.map(({ block, on, items }) => (
            <div key={block.id}>
              <div className="eyebrow row between">
                <span>{block.name}</span>
                <span className="tiny faint" style={{ fontWeight: 700 }}>
                  {!on ? 'extras only' : block.optional ? 'optional' : ''}
                </span>
              </div>
              <div className="tiny faint" style={{ margin: '-4px 2px 8px' }}>
                {block.note}
              </div>
              <div className="card" style={{ padding: '4px 16px' }}>
                {items.map((e) => {
                  const slot = getSlot(e.id)
                  return (
                    <div className="list-row" key={e.id}>
                      <span
                        className="dot"
                        style={{ background: muscleColor(e.muscle), flexShrink: 0 }}
                      />
                      <div className="grow">
                        <div style={{ fontWeight: 700 }}>{e.name}</div>
                        <div className="tiny faint">
                          {setScheme(e)}
                          {slot?.pair ? ` · Pair ${slot.pair}` : ''}
                          {slot ? ` · ${slot.label}` : ''}
                        </div>
                      </div>
                      {slot && slot.optionIds.length > 1 && (
                        <button className="btn btn-sm" onClick={() => setSwapFor(e)}>
                          Swap
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        style={{ width: 36, height: 36, color: 'var(--danger)' }}
                        onClick={() => removeExerciseFromDay(weekday, e.id)}
                        aria-label="remove exercise"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="tiny faint" style={{ padding: '10px 0' }}>
                    No exercises — add one or turn the block off.
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-sm btn-block"
                  style={{ justifyContent: 'flex-start', color: 'var(--accent-ink)' }}
                  onClick={() => setAddFor(block.id)}
                >
                  <Plus size={16} /> Add to {block.short.toLowerCase()}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="overlay-foot">
        {activeOtherDay ? (
          <>
            <Coach tone="stall">
              Another workout is in progress. Finish or discard it before starting a
              different day.
            </Coach>
            <button
              className="btn btn-block btn-lg"
              style={{ marginTop: 10 }}
              onClick={resumeSession}
            >
              Resume that workout
            </button>
          </>
        ) : status === 'inprogress' ? (
          <button className="btn btn-primary btn-lg btn-block" onClick={resumeSession}>
            <Play size={20} /> Resume workout
          </button>
        ) : status === 'rest' ? (
          <div className="tiny faint" style={{ textAlign: 'center' }}>
            Switch on a block above to train this day.
          </div>
        ) : status === 'done' ? (
          <div className="row" style={{ gap: 10 }}>
            {doneSession && (
              <button
                className="btn btn-lg grow"
                onClick={() => openOverlay({ name: 'session', sessionId: doneSession.id })}
              >
                View
              </button>
            )}
            <button
              className="btn btn-primary btn-lg grow"
              disabled={exs.length === 0}
              onClick={() => startDay(weekday)}
            >
              Train again
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={exs.length === 0}
            onClick={() => startDay(weekday)}
          >
            <Play size={20} /> Start workout
          </button>
        )}
      </div>

      {swapFor && (
        <SwapModal
          exercise={swapFor}
          onClose={() => setSwapFor(null)}
          onSwap={(slotId, id) => {
            swapExercise(slotId, id)
            setSwapFor(null)
          }}
        />
      )}
      {addFor && (
        <Modal
          title={`Add to ${BLOCKS.find((b) => b.id === addFor)?.name ?? ''}`}
          onClose={() => setAddFor(null)}
        >
          <AddList
            block={addFor}
            day={day}
            program={settings.program}
            onPick={(id) => {
              addExerciseToDay(weekday, id)
              setAddFor(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function SwapModal({
  exercise,
  onClose,
  onSwap,
}: {
  exercise: ExerciseDef
  onClose: () => void
  onSwap: (slotId: string, exerciseId: string) => void
}) {
  const slot = getSlot(exercise.id)
  const options = slot ? slotOptions(slot.id) : []
  return (
    <Modal title={`Swap ${exercise.name}`} onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Same spot in the routine ({slot?.label}). Applies wherever this slot appears
        in your week; each variation keeps its own weight &amp; history.
      </p>
      <div className="card" style={{ padding: '4px 16px', marginBottom: 0 }}>
        {options.map((opt) => {
          const current = opt.id === exercise.id
          return (
            <button
              key={opt.id}
              className="list-row"
              style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
              disabled={current}
              onClick={() => slot && onSwap(slot.id, opt.id)}
            >
              <div className="grow">
                <div style={{ fontWeight: 700 }}>
                  {opt.name}
                  {current && (
                    <span className="chip" style={{ marginLeft: 8 }}>
                      current
                    </span>
                  )}
                </div>
                <div className="tiny faint">{setScheme(opt)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function AddList({
  block,
  day,
  program,
  onPick,
}: {
  block: BlockId
  day: DayPlan
  program?: Record<string, string>
  onPick: (id: string) => void
}) {
  const options = addableForBlock(block, day, program)
  if (options.length === 0) {
    return <div className="tiny faint">Everything from this block is already in the day.</div>
  }
  return (
    <div className="card" style={{ padding: '4px 16px', marginBottom: 0, maxHeight: '60vh', overflowY: 'auto' }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          className="list-row"
          style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
          onClick={() => onPick(opt.id)}
        >
          <div className="grow">
            <div style={{ fontWeight: 700 }}>{opt.name}</div>
            <div className="tiny faint">
              {setScheme(opt)} · {getSlot(opt.id)?.label}
            </div>
          </div>
          <Plus size={16} className="faint" />
        </button>
      ))}
    </div>
  )
}
