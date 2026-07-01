import { useState } from 'react'
import {
  getSlot,
  MUSCLE_ORDER,
  setScheme,
  slotOptions,
  type ExerciseDef,
  type Muscle,
} from '../program/exercises'
import {
  addableForMuscle,
  dayExercises,
  getWeeklyPlan,
  muscleFrequency,
  WEEKDAYS_LONG,
} from '../program/plan'
import { weekStatuses } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Coach, Modal, muscleColor } from '../ui/components'
import { Check, ChevronLeft, Play, Plus, X } from '../ui/icons'

export function DayPlanView({ weekday }: { weekday: number }) {
  const settings = useStore((s) => s.settings)
  const sessions = useStore((s) => s.sessions)
  const activeSession = useStore((s) => s.activeSession)
  const toggleDayMuscle = useStore((s) => s.toggleDayMuscle)
  const addExerciseToDay = useStore((s) => s.addExerciseToDay)
  const removeExerciseFromDay = useStore((s) => s.removeExerciseFromDay)
  const swapExercise = useStore((s) => s.swapExercise)
  const startDay = useStore((s) => s.startDay)
  const resumeSession = useStore((s) => s.resumeSession)
  const openOverlay = useStore((s) => s.openOverlay)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [swapFor, setSwapFor] = useState<ExerciseDef | null>(null)
  const [addFor, setAddFor] = useState<Muscle | null>(null)

  const plan = getWeeklyPlan(settings.weeklyPlan)
  const day = plan[weekday]
  const exs = dayExercises(day, settings.program)
  const freq = muscleFrequency(plan)
  const status = weekStatuses(plan, sessions, activeSession)[weekday].status
  const activeOtherDay = !!activeSession && activeSession.weekday !== weekday

  const groups = MUSCLE_ORDER.filter((m) => day.muscles.includes(m)).map((m) => ({
    muscle: m,
    items: exs.filter((e) => e.muscle === m),
  }))

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
              {day.muscles.length ? `${exs.length} exercises` : 'Rest day'}
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
        <div className="eyebrow">Muscle groups</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {MUSCLE_ORDER.map((m) => {
            const sel = day.muscles.includes(m)
            return (
              <button
                key={m}
                className="chip"
                style={{
                  border: '1px solid var(--border)',
                  background: sel ? 'var(--surface-3)' : 'var(--surface-2)',
                  color: sel ? 'var(--text)' : 'var(--faint)',
                  fontWeight: sel ? 700 : 600,
                  padding: '8px 13px',
                }}
                onClick={() => toggleDayMuscle(weekday, m)}
              >
                <span
                  className="dot"
                  style={{ background: sel ? muscleColor(m) : 'var(--faint)' }}
                />
                {m}
              </button>
            )
          })}
        </div>

        {day.muscles.length === 0 ? (
          <Coach tone="info">
            Rest day. Tap a muscle group above to train it on this day — recovery is
            where muscle is actually built.
          </Coach>
        ) : (
          groups.map((g) => (
            <div key={g.muscle}>
              <div className="eyebrow row between">
                <span>{g.muscle}</span>
                <span
                  className="tiny"
                  style={{
                    color: freq[g.muscle] < 2 ? 'var(--accent-ink)' : 'var(--faint)',
                    fontWeight: 700,
                  }}
                >
                  {freq[g.muscle]}×/week
                </span>
              </div>
              <div className="card" style={{ padding: '4px 16px' }}>
                {g.items.map((e) => (
                  <div className="list-row" key={e.id}>
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>{e.name}</div>
                      <div className="tiny faint">{setScheme(e)}</div>
                    </div>
                    <button className="btn btn-sm" onClick={() => setSwapFor(e)}>
                      Swap
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 36, height: 36, color: 'var(--danger)' }}
                      onClick={() => removeExerciseFromDay(weekday, e.id)}
                      aria-label="remove exercise"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {g.items.length === 0 && (
                  <div className="tiny faint" style={{ padding: '10px 0' }}>
                    No exercises — add one or turn the group off.
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-sm btn-block"
                  style={{ justifyContent: 'flex-start', color: 'var(--accent-ink)' }}
                  onClick={() => setAddFor(g.muscle)}
                >
                  <Plus size={16} /> Add {g.muscle.toLowerCase()} exercise
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
            Add a muscle group above to train this day.
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
        <Modal title={`Add ${addFor.toLowerCase()} exercise`} onClose={() => setAddFor(null)}>
          <AddList
            muscle={addFor}
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
        Same muscle, same rep model. Applies wherever this slot appears in your week;
        each variation keeps its own weight &amp; history.
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
  muscle,
  day,
  program,
  onPick,
}: {
  muscle: Muscle
  day: import('../storage/types').DayPlan
  program?: Record<string, string>
  onPick: (id: string) => void
}) {
  const options = addableForMuscle(muscle, day, program)
  if (options.length === 0) {
    return <div className="tiny faint">Every {muscle.toLowerCase()} exercise is already in this day.</div>
  }
  return (
    <div className="card" style={{ padding: '4px 16px', marginBottom: 0 }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          className="list-row"
          style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
          onClick={() => onPick(opt.id)}
        >
          <div className="grow">
            <div style={{ fontWeight: 700 }}>{opt.name}</div>
            <div className="tiny faint">{setScheme(opt)}</div>
          </div>
          <Plus size={16} className="faint" />
        </button>
      ))}
    </div>
  )
}
