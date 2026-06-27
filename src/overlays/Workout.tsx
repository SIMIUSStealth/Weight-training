import { useEffect, useMemo, useRef, useState } from 'react'
import { getExercise } from '../program/exercises'
import { computeRecommendation } from '../program/progression'
import { formatKg, isTopRung, nextRung, prevRung } from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Coach, Modal, MuscleChip, Stepper } from '../ui/components'
import { Check, ChevronLeft, Minus, Plus, Timer, X } from '../ui/icons'

function beep(freq = 880, dur = 0.45) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.start()
    o.stop(ctx.currentTime + dur + 0.02)
  } catch {
    /* ignore */
  }
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* ignore */
  }
}

const READY_SECONDS = 3

type Hold = { setIndex: number; phase: 'ready' | 'hold'; remaining: number }

export function Workout() {
  const activeSession = useStore((s) => s.activeSession)
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const updateSet = useStore((s) => s.updateSet)
  const setWorkingWeight = useStore((s) => s.setWorkingWeight)
  const finishSession = useStore((s) => s.finishSession)
  const splitSession = useStore((s) => s.splitSession)
  const cancelSession = useStore((s) => s.cancelSession)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [index, setIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [rest, setRest] = useState<number | null>(null)
  const [hold, setHold] = useState<Hold | null>(null)
  const [finishPrompt, setFinishPrompt] = useState(false)
  const alerted = useRef(false)
  const prevPhase = useRef<Hold['phase'] | null>(null)

  const exercises = activeSession?.exercises ?? []
  const exLog = exercises[index]
  const def = exLog ? getExercise(exLog.exerciseId) : null
  const rec = useMemo(
    () => (def ? computeRecommendation(def, progress[def.id]!, sessions) : null),
    [def, progress, sessions],
  )
  const target = rec?.targetSeconds ?? def?.startSeconds ?? 30

  // Rest countdown.
  useEffect(() => {
    if (rest === null) return
    if (rest <= 0) {
      if (!alerted.current) {
        alerted.current = true
        if (settings.restAlert) {
          vibrate(220)
          beep()
        }
      }
      const clear = setTimeout(() => setRest(null), 900)
      return () => clearTimeout(clear)
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000)
    return () => clearTimeout(t)
  }, [rest, settings.restAlert])

  // Plank countdown: 3-2-1 get-ready, then count DOWN from the target.
  useEffect(() => {
    if (!hold) return
    if (hold.phase === 'hold' && hold.remaining <= 0) return // finished — handled below
    const t = setTimeout(() => {
      setHold((h) => {
        if (!h) return null
        if (h.phase === 'ready') {
          if (h.remaining > 1) return { ...h, remaining: h.remaining - 1 }
          return { setIndex: h.setIndex, phase: 'hold', remaining: target } // go!
        }
        return { ...h, remaining: h.remaining - 1 }
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [hold, target])

  // Cue the start of the hold, and complete it when the countdown hits zero.
  useEffect(() => {
    const phase = hold?.phase ?? null
    if (phase === 'hold' && prevPhase.current === 'ready' && settings.restAlert) {
      vibrate(90)
      beep(660, 0.18)
    }
    prevPhase.current = phase
    if (hold && def && hold.phase === 'hold' && hold.remaining <= 0) {
      logHold(hold.setIndex, target, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold])

  if (!activeSession || !exLog || !def || !rec) return null

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  )
  const performed = exercises.filter((e) => e.sets.some((s) => s.done))
  const untouched = exercises.filter((e) => !e.sets.some((s) => s.done))
  const part = activeSession.part ?? 1

  const startRest = () => {
    alerted.current = false
    setRest(settings.restSeconds)
  }

  const toggleRepDone = (setIndex: number, fallback: number) => {
    const cur = exLog.sets[setIndex]
    if (cur.done) {
      updateSet(def.id, setIndex, { done: false })
    } else {
      updateSet(def.id, setIndex, { reps: cur.reps ?? fallback, done: true })
      startRest()
    }
  }

  function logHold(setIndex: number, seconds: number, alert: boolean) {
    if (!def) return
    updateSet(def.id, setIndex, { seconds, done: true })
    setHold(null)
    if (alert && settings.restAlert) {
      vibrate(220)
      beep()
    }
    startRest()
  }

  const startHold = (setIndex: number) =>
    setHold({ setIndex, phase: 'ready', remaining: READY_SECONDS })

  const stopHold = () => {
    if (!hold) return
    if (hold.phase === 'ready') {
      setHold(null)
      return
    }
    const held = Math.max(1, target - hold.remaining)
    logHold(hold.setIndex, held, false)
  }

  const togglePlankDone = (setIndex: number) => {
    const cur = exLog.sets[setIndex]
    if (cur.done) {
      updateSet(def.id, setIndex, { done: false })
    } else {
      updateSet(def.id, setIndex, { seconds: cur.seconds ?? target, done: true })
      startRest()
    }
  }

  const go = (next: number) => {
    setIndex(Math.min(exercises.length - 1, Math.max(0, next)))
    setShowForm(false)
    setRest(null)
    setHold(null)
  }

  const attemptFinish = () => {
    if (performed.length === 0) {
      cancelSession()
      return
    }
    if (untouched.length === 0) {
      finishSession()
      return
    }
    setFinishPrompt(true)
  }

  const isLast = index === exercises.length - 1
  const weight = exLog.weightKg
  const shortKg = (kg?: number) =>
    kg == null ? '' : formatKg(kg).replace(' ', '')

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row between">
          <button className="icon-btn" onClick={closeOverlay} aria-label="minimize">
            <X size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800 }}>
              Workout{part > 1 ? ` · Part ${part}` : ''}
            </div>
            <div className="tiny faint">
              {index + 1} / {exercises.length} · {doneSets}/{totalSets} sets
            </div>
          </div>
          <button className="btn btn-success btn-sm" onClick={attemptFinish}>
            Finish
          </button>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <span style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
      </div>

      <div className="overlay-body" key={def.id}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <MuscleChip muscle={def.muscle} />
          <span className="tiny faint">Exercise {def.order}</span>
        </div>
        <h1 style={{ fontSize: 24, margin: '2px 0 10px' }}>{def.name}</h1>

        {/* working weight / plank target */}
        <div className="card">
          <div className="row between">
            <div>
              <div className="tiny faint">
                {def.kind === 'time'
                  ? 'TARGET HOLD'
                  : def.bodyweight
                    ? 'BODYWEIGHT'
                    : 'WORKING WEIGHT'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                {def.kind === 'time'
                  ? formatSeconds(target)
                  : def.bodyweight
                    ? '—'
                    : formatKg(weight)}
              </div>
              <div className="tiny muted">
                {def.kind === 'time'
                  ? `${def.sets} sets · hold steady`
                  : `${def.sets} × ${def.repMin}–${def.repMax} reps${
                      def.perArm ? ' · each arm' : ''
                    }`}
              </div>
            </div>
            {def.kind !== 'time' && !def.bodyweight && (
              <div className="stepper">
                <button
                  aria-label="lighter"
                  disabled={prevRung(weight) === weight}
                  onClick={() => setWorkingWeight(def.id, prevRung(weight))}
                >
                  <Minus size={20} />
                </button>
                <div className="val" style={{ minWidth: 44, fontSize: 15 }}>
                  kg
                </div>
                <button
                  aria-label="heavier"
                  disabled={isTopRung(weight)}
                  onClick={() => setWorkingWeight(def.id, nextRung(weight))}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* coaching */}
        <div style={{ marginBottom: 12 }}>
          {rec.justLeveledUp && <Coach tone="up">{rec.coach}</Coach>}
          {rec.stalled && <Coach tone="stall">{rec.coach}</Coach>}
          {!rec.justLeveledUp && !rec.stalled && rec.coach && (
            <Coach tone="info">{rec.coach}</Coach>
          )}
        </div>

        {/* plank live countdown */}
        {def.kind === 'time' && hold && (
          <div className="hold-timer card">
            {hold.phase === 'ready' ? (
              <>
                <div className="tiny faint">GET READY</div>
                <div className="hold-clock">{hold.remaining}</div>
              </>
            ) : (
              <>
                <div className="tiny faint">HOLD</div>
                <div className="hold-clock">{formatSeconds(Math.max(0, hold.remaining))}</div>
              </>
            )}
            <button className="btn btn-danger btn-block" onClick={stopHold} style={{ marginTop: 8 }}>
              {hold.phase === 'ready' ? 'Cancel' : `Stop & log set ${hold.setIndex + 1}`}
            </button>
          </div>
        )}

        {/* sets */}
        {rec.hasHistory && (
          <div className="tiny faint" style={{ margin: '0 2px 6px' }}>
            Grey = last session ({def.kind === 'time' ? 'hold' : 'reps @ kg'})
          </div>
        )}
        <div className="card">
          {def.kind === 'time'
            ? exLog.sets.map((s, i) => (
                <div className="set-row" key={i}>
                  <div style={{ width: 52, textAlign: 'center' }}>
                    <div className="set-no" style={{ margin: '0 auto' }}>
                      {i + 1}
                    </div>
                    {rec.lastSets[i] != null && (
                      <div className="tiny faint" style={{ marginTop: 5 }}>
                        {formatSeconds(rec.lastSets[i])}
                      </div>
                    )}
                  </div>
                  <div className="grow">
                    <div style={{ fontWeight: 800 }}>
                      {s.done ? formatSeconds(s.seconds ?? 0) : `Target ${formatSeconds(target)}`}
                    </div>
                    <div className="tiny faint">{s.done ? 'held' : 'tap hold for the countdown'}</div>
                  </div>
                  <button className="btn btn-sm" disabled={!!hold} onClick={() => startHold(i)}>
                    {s.done ? 'Redo' : 'Hold'}
                  </button>
                  <button
                    className={'set-check' + (s.done ? ' done' : '')}
                    onClick={() => togglePlankDone(i)}
                    aria-label="toggle done"
                  >
                    <Check size={22} />
                  </button>
                </div>
              ))
            : exLog.sets.map((s, i) => {
                const fallback = rec.lastSets[i] ?? def.repMin
                const value = s.reps ?? fallback
                return (
                  <div className="set-row" key={i}>
                    <div style={{ width: 52, textAlign: 'center' }}>
                      <div className="set-no" style={{ margin: '0 auto' }}>
                        {i + 1}
                      </div>
                      {rec.lastSets[i] != null && (
                        <div className="tiny faint" style={{ marginTop: 5, lineHeight: 1.15 }}>
                          {rec.lastSets[i]}
                          <br />
                          {shortKg(rec.lastWeightKg)}
                        </div>
                      )}
                    </div>
                    <div className="grow row" style={{ justifyContent: 'center' }}>
                      <Stepper
                        value={value}
                        min={0}
                        max={60}
                        onChange={(v) => updateSet(def.id, i, { reps: v })}
                        unit={def.perArm ? '/arm' : 'reps'}
                      />
                    </div>
                    <button
                      className={'set-check' + (s.done ? ' done' : '')}
                      onClick={() => toggleRepDone(i, fallback)}
                      aria-label="toggle done"
                    >
                      <Check size={22} />
                    </button>
                  </div>
                )
              })}
        </div>

        {/* form cue */}
        <button
          className="btn btn-ghost btn-block btn-sm"
          onClick={() => setShowForm((v) => !v)}
          style={{ justifyContent: 'space-between' }}
        >
          <span>How to perform</span>
          <span className="faint">{showForm ? 'hide' : 'show'}</span>
        </button>
        {showForm && (
          <div className="coach" style={{ marginTop: 8 }}>
            <span>{def.formCue}</span>
          </div>
        )}

        <button
          className="btn btn-danger btn-block btn-sm"
          style={{ marginTop: 22, opacity: 0.8 }}
          onClick={cancelSession}
        >
          Discard workout
        </button>
      </div>

      <div className="overlay-foot">
        {rest !== null && (
          <div className="rest-sheet" style={{ marginBottom: 10 }}>
            <Timer size={22} />
            <div className="rest-time">{rest <= 0 ? 'Go!' : formatSeconds(rest)}</div>
            <div className="grow" />
            <button
              className="btn btn-sm"
              onClick={() => {
                alerted.current = false
                setRest((r) => (r === null ? null : r + 15))
              }}
            >
              +15s
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setRest(null)}>
              Skip
            </button>
          </div>
        )}
        <div className="row" style={{ gap: 10 }}>
          <button
            className="icon-btn"
            style={{ width: 52, height: 52 }}
            disabled={index === 0}
            onClick={() => go(index - 1)}
            aria-label="previous exercise"
          >
            <ChevronLeft size={22} />
          </button>
          {isLast ? (
            <button className="btn btn-success btn-lg grow" onClick={attemptFinish}>
              Finish workout
            </button>
          ) : (
            <button className="btn btn-primary btn-lg grow" onClick={() => go(index + 1)}>
              Next: {getExercise(exercises[index + 1].exerciseId).name}
            </button>
          )}
        </div>
      </div>

      {finishPrompt && (
        <Modal title="Finish here?" onClose={() => setFinishPrompt(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            You&rsquo;ve done {performed.length} of {exercises.length} exercises. Save the
            remaining {untouched.length} as <strong>Part {part + 1}</strong> to finish
            later — it still counts as one workout for the week.
          </p>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              setFinishPrompt(false)
              splitSession()
            }}
          >
            Split — save {untouched.length} for later
          </button>
          <button
            className="btn btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setFinishPrompt(false)
              finishSession()
            }}
          >
            Just finish for today
          </button>
          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={() => setFinishPrompt(false)}
          >
            Keep going
          </button>
        </Modal>
      )}
    </div>
  )
}
