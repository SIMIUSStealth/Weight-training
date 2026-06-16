import { useEffect, useMemo, useRef, useState } from 'react'
import { EXERCISES, getExercise } from '../program/exercises'
import { computeRecommendation } from '../program/progression'
import { formatKg, isTopRung, nextRung, prevRung } from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Coach, MuscleChip, Stepper } from '../ui/components'
import { Check, ChevronLeft, Minus, Plus, Timer, X } from '../ui/icons'

function beep() {
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
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    o.start()
    o.stop(ctx.currentTime + 0.46)
  } catch {
    /* ignore */
  }
}

export function Workout() {
  const activeSession = useStore((s) => s.activeSession)
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const updateSet = useStore((s) => s.updateSet)
  const setWorkingWeight = useStore((s) => s.setWorkingWeight)
  const finishSession = useStore((s) => s.finishSession)
  const cancelSession = useStore((s) => s.cancelSession)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [index, setIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [rest, setRest] = useState<number | null>(null)
  const [hold, setHold] = useState<{ setIndex: number; elapsed: number } | null>(null)
  const alerted = useRef(false)

  // Rest countdown.
  useEffect(() => {
    if (rest === null) return
    if (rest <= 0) {
      if (!alerted.current) {
        alerted.current = true
        if (settings.restAlert) {
          try {
            navigator.vibrate?.(220)
          } catch {
            /* ignore */
          }
          beep()
        }
      }
      const clear = setTimeout(() => setRest(null), 900)
      return () => clearTimeout(clear)
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000)
    return () => clearTimeout(t)
  }, [rest, settings.restAlert])

  // Plank hold count-up.
  useEffect(() => {
    if (!hold) return
    const t = setTimeout(
      () => setHold((h) => (h ? { ...h, elapsed: h.elapsed + 1 } : null)),
      1000,
    )
    return () => clearTimeout(t)
  }, [hold])

  const def = EXERCISES[index]
  const exLog = activeSession?.exercises.find((e) => e.exerciseId === def.id)
  const rec = useMemo(
    () => computeRecommendation(def, progress[def.id]!, sessions),
    [def, progress, sessions],
  )

  if (!activeSession || !exLog) return null

  const totalSets = activeSession.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = activeSession.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  )
  const loggedSets = doneSets

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

  const startHold = (setIndex: number) => setHold({ setIndex, elapsed: 0 })
  const stopHold = () => {
    if (!hold) return
    updateSet(def.id, hold.setIndex, { seconds: hold.elapsed, done: true })
    setHold(null)
    startRest()
  }
  const togglePlankDone = (setIndex: number) => {
    const cur = exLog.sets[setIndex]
    if (cur.done) {
      updateSet(def.id, setIndex, { done: false })
    } else {
      updateSet(def.id, setIndex, {
        seconds: cur.seconds ?? rec.targetSeconds ?? def.startSeconds ?? 30,
        done: true,
      })
      startRest()
    }
  }

  const onFinish = () => {
    if (loggedSets === 0) cancelSession()
    else finishSession()
  }

  const isLast = index === EXERCISES.length - 1
  const weight = exLog.weightKg

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row between">
          <button className="icon-btn" onClick={closeOverlay} aria-label="minimize">
            <X size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800 }}>Workout</div>
            <div className="tiny faint">
              {index + 1} / {EXERCISES.length} · {doneSets}/{totalSets} sets
            </div>
          </div>
          <button className="btn btn-success btn-sm" onClick={onFinish}>
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
                  ? formatSeconds(rec.targetSeconds ?? 0)
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
          {!rec.coach && rec.hasHistory && (
            <Coach tone="plain">
              Beat last time: aim past {rec.lastSets.join(' · ')}
              {def.kind === 'time' ? 's' : ' reps'}.
            </Coach>
          )}
        </div>

        {/* plank live clock */}
        {def.kind === 'time' && hold && (
          <div className="hold-timer card">
            <div className="hold-clock">{formatSeconds(hold.elapsed)}</div>
            <button className="btn btn-danger btn-block" onClick={stopHold} style={{ marginTop: 8 }}>
              Stop &amp; log set {hold.setIndex + 1}
            </button>
          </div>
        )}

        {/* sets */}
        <div className="card">
          {def.kind === 'time'
            ? exLog.sets.map((s, i) => (
                <div className="set-row" key={i}>
                  <div className="set-no">{i + 1}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 800 }}>
                      {s.done
                        ? formatSeconds(s.seconds ?? 0)
                        : `Target ${formatSeconds(rec.targetSeconds ?? 0)}`}
                    </div>
                    <div className="tiny faint">{s.done ? 'held' : 'tap hold, then stop'}</div>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={!!hold}
                    onClick={() => startHold(i)}
                  >
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
                    <div className="set-no">{i + 1}</div>
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
            onClick={() => {
              setIndex((i) => Math.max(0, i - 1))
              setShowForm(false)
            }}
            aria-label="previous exercise"
          >
            <ChevronLeft size={22} />
          </button>
          {isLast ? (
            <button className="btn btn-success btn-lg grow" onClick={onFinish}>
              Finish workout
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg grow"
              onClick={() => {
                setIndex((i) => Math.min(EXERCISES.length - 1, i + 1))
                setShowForm(false)
                setRest(null)
              }}
            >
              Next: {getExercise(EXERCISES[index + 1].id).name}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
