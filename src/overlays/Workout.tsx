import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  BLOCKS,
  GYM_EXERCISES,
  getBlock,
  getExercise,
  getSlot,
  setScheme,
  slotOptions,
} from '../program/exercises'
import { computeRecommendation, defaultProgress, isLoaded } from '../program/progression'
import {
  formatLoad,
  formatLoadShort,
  isTopRung,
  ladderFor,
  nextRung,
  prevRung,
  resolveIncrements,
} from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { alternatingGroup, groupRound, nextExerciseIndex } from '../program/flow'
import { useStore } from '../store/useStore'
import { Coach, Modal, MuscleChip, Stepper } from '../ui/components'
import { Check, ChevronLeft, List, Minus, Plus, Timer, X } from '../ui/icons'

// One shared AudioContext for the app's lifetime — iOS Safari caps live
// contexts (~4), so creating one per beep permanently kills audio mid-workout.
let sharedAudioCtx: AudioContext | null = null

function beep(freq = 880, dur = 0.45) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    sharedAudioCtx ??= new Ctx()
    const ctx = sharedAudioCtx
    void ctx.resume() // iOS auto-suspends idle contexts
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

// Reps-in-reserve options, shown most-in-reserve → to-failure.
const RIR_OPTIONS = [
  { v: 3, label: '3+' },
  { v: 2, label: '2' },
  { v: 1, label: '1' },
  { v: 0, label: 'Fail' },
]

type Hold = { setIndex: number; phase: 'ready' | 'hold'; display: number }

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
  const swapInSession = useStore((s) => s.swapInSession)
  const addToSession = useStore((s) => s.addToSession)
  const removeFromSession = useStore((s) => s.removeFromSession)
  const addSetToSession = useStore((s) => s.addSetToSession)
  const removeSetFromSession = useStore((s) => s.removeSetFromSession)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [index, setIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  // Both timers are driven by wall-clock deadlines (refs), not tick counting —
  // chained per-second timeouts drift and get throttled on iOS, which would
  // stretch rests and mis-measure logged plank holds. State holds only the
  // displayed seconds; the interval bails out of re-renders between changes.
  const [rest, setRest] = useState<number | null>(null)
  const restEndRef = useRef<number | null>(null)
  const [hold, setHold] = useState<Hold | null>(null)
  const holdPhaseStartRef = useRef(0)
  const [finishPrompt, setFinishPrompt] = useState(false)
  // Mid-workout editing sheets: the session overview, adding, swapping.
  const [sheet, setSheet] = useState<null | 'overview' | 'add' | 'swap'>(null)
  const alerted = useRef(false)

  const exercises = activeSession?.exercises ?? []
  const exLog = exercises[index]
  const def = exLog ? getExercise(exLog.exerciseId) : null
  const increments = useMemo(
    () => resolveIncrements(settings.increments),
    [settings.increments],
  )
  const rec = useMemo(
    () =>
      def
        ? computeRecommendation(
            def,
            progress[def.id] ?? defaultProgress(def),
            sessions,
            increments,
          )
        : null,
    [def, progress, sessions, increments],
  )
  const target = rec?.targetSeconds ?? def?.startSeconds ?? 30

  // Rest countdown — derived from the deadline every 250ms.
  const restActive = rest !== null
  useEffect(() => {
    if (!restActive) return
    const iv = setInterval(() => {
      const end = restEndRef.current
      if (end == null) return
      const left = Math.ceil((end - Date.now()) / 1000)
      if (left > 0) {
        setRest((r) => (r === left ? r : left))
        return
      }
      if (!alerted.current) {
        alerted.current = true
        if (settings.restAlert) {
          vibrate(220)
          beep()
        }
      }
      // show "Go!" briefly, then hide
      if (Date.now() - end > 900) {
        restEndRef.current = null
        setRest(null)
      } else {
        setRest((r) => (r === 0 ? r : 0))
      }
    }, 250)
    return () => clearInterval(iv)
  }, [restActive, settings.restAlert])

  // Plank: 3-2-1 get-ready, then count DOWN from the target; both phases
  // measured from the wall clock so the logged seconds are real seconds.
  useEffect(() => {
    if (!hold) return
    const { setIndex, phase } = hold
    const iv = setInterval(() => {
      const elapsed = (Date.now() - holdPhaseStartRef.current) / 1000
      if (phase === 'ready') {
        const left = READY_SECONDS - Math.floor(elapsed)
        if (left <= 0) {
          holdPhaseStartRef.current = Date.now()
          if (settings.restAlert) {
            vibrate(90)
            beep(660, 0.18)
          }
          setHold({ setIndex, phase: 'hold', display: target })
        } else {
          setHold((h) => (h && h.display !== left ? { ...h, display: left } : h))
        }
      } else {
        const remaining = target - Math.floor(elapsed)
        if (remaining <= 0) {
          logHold(setIndex, target, true)
        } else {
          setHold((h) =>
            h && h.display !== remaining ? { ...h, display: remaining } : h,
          )
        }
      }
    }, 200)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold?.phase, hold?.setIndex, target, settings.restAlert])

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
    restEndRef.current = Date.now() + settings.restSeconds * 1000
    setRest(settings.restSeconds)
  }

  const bumpRest = (seconds: number) => {
    if (restEndRef.current == null) return
    alerted.current = false
    restEndRef.current = Math.max(restEndRef.current, Date.now()) + seconds * 1000
    setRest(Math.max(0, Math.ceil((restEndRef.current - Date.now()) / 1000)))
  }

  const stopRest = () => {
    restEndRef.current = null
    setRest(null)
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

  const startHold = (setIndex: number) => {
    holdPhaseStartRef.current = Date.now()
    setHold({ setIndex, phase: 'ready', display: READY_SECONDS })
  }

  const stopHold = () => {
    if (!hold) return
    if (hold.phase === 'ready') {
      setHold(null)
      return
    }
    const elapsed = Math.round((Date.now() - holdPhaseStartRef.current) / 1000)
    const held = Math.max(1, Math.min(target, elapsed))
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

  // The rest timer keeps running across exercises — in a pair you walk to the
  // partner exercise during the rest. A timed set in progress is abandoned.
  const go = (next: number) => {
    setIndex(Math.min(exercises.length - 1, Math.max(0, next)))
    setShowForm(false)
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

  const nextIndex = nextExerciseIndex(exercises, index)
  const group = alternatingGroup(exercises, index)
  const block = getBlock(def.id)
  const slot = getSlot(def.id)
  const weight = exLog.weightKg
  const loaded = isLoaded(def)
  const ladder = ladderFor(def.equipment, increments)
  // An unloaded time exercise is a hold (plank); a loaded one is timed work
  // with a kettlebell.
  const isHold = def.kind === 'time' && !loaded
  const shortKg = (kg?: number) =>
    kg == null ? '' : formatLoadShort(def.equipment, kg)

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row between">
          <button className="icon-btn" onClick={closeOverlay} aria-label="minimize">
            <X size={18} />
          </button>
          <button
            onClick={() => setSheet('overview')}
            aria-label="workout overview"
            style={{ textAlign: 'center', background: 'none', border: 0, color: 'inherit', padding: 0 }}
          >
            <div className="row" style={{ fontWeight: 800, gap: 6, justifyContent: 'center' }}>
              <List size={16} />
              Workout{part > 1 ? ` · Part ${part}` : ''}
            </div>
            <div className="tiny faint">
              {index + 1} / {exercises.length} · {doneSets}/{totalSets} sets
            </div>
          </button>
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
          {block && (
            <span className="tiny faint" style={{ fontWeight: 700 }}>
              {block.name}
              {group ? ` · round ${groupRound(exercises, group)}` : ''}
            </span>
          )}
        </div>
        <div className="row between" style={{ gap: 10 }}>
          <h1 style={{ fontSize: 24, margin: '2px 0 4px' }}>{def.name}</h1>
          {slot && slot.optionIds.length > 1 && !exLog.sets.some((s) => s.done) && (
            <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => setSheet('swap')}>
              Swap
            </button>
          )}
        </div>
        {slot && (
          <div className="tiny faint" style={{ marginBottom: 10 }}>
            {slot.label}
            {slot.optional || block?.optional ? ' · optional' : ''}
            {group ? ' · alternate sets' : ''}
          </div>
        )}

        {/* working load / hold target */}
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
                      : 'WORKING LOAD'}
              </div>
              <div className="display" style={{ fontSize: 28, fontWeight: 800 }}>
                {isHold ? formatSeconds(target) : formatLoad(def.equipment, weight)}
              </div>
              <div className="tiny muted">
                {isHold
                  ? `${def.sets} sets · hold steady`
                  : def.kind === 'time'
                    ? `${def.sets} rounds × ${formatSeconds(target)}`
                    : `${def.sets} × ${def.repMin}–${def.repMax} reps${
                        def.perArm ? ' · each side' : ''
                      }`}
              </div>
            </div>
            {loaded && (
              <div className="stepper">
                <button
                  aria-label="lighter"
                  disabled={prevRung(weight, ladder) === weight}
                  onClick={() => setWorkingWeight(def.id, prevRung(weight, ladder))}
                >
                  <Minus size={20} />
                </button>
                <div className="val" style={{ minWidth: 44, fontSize: 15 }}>
                  kg
                </div>
                <button
                  aria-label="heavier"
                  disabled={isTopRung(weight, ladder)}
                  onClick={() => setWorkingWeight(def.id, nextRung(weight, ladder))}
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

        {/* coaching */}
        <div style={{ marginBottom: 12 }}>
          {rec.justLeveledUp && <Coach tone="up">{rec.coach}</Coach>}
          {rec.stalled && <Coach tone="stall">{rec.coach}</Coach>}
          {!rec.justLeveledUp && !rec.stalled && rec.coach && (
            <Coach tone="info">{rec.coach}</Coach>
          )}
          {rec.effortNote && <Coach tone="info">{rec.effortNote}</Coach>}
        </div>

        {/* timed set live countdown */}
        {def.kind === 'time' && hold && (
          <div className="hold-timer card">
            {hold.phase === 'ready' ? (
              <>
                <div className="tiny faint">GET READY</div>
                <div className="hold-clock">{hold.display}</div>
              </>
            ) : (
              <>
                <div className="tiny faint">{isHold ? 'HOLD' : 'WORK'}</div>
                <div className="hold-clock">{formatSeconds(Math.max(0, hold.display))}</div>
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
            Grey = last session ({def.kind === 'time' ? 'seconds' : 'reps @ load'})
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
                    <div className="tiny faint">
                      {s.done
                        ? isHold
                          ? 'held'
                          : 'done'
                        : `tap ${isHold ? 'hold' : 'go'} for the countdown`}
                    </div>
                  </div>
                  <button className="btn btn-sm" disabled={!!hold} onClick={() => startHold(i)}>
                    {s.done ? 'Redo' : isHold ? 'Hold' : 'Go'}
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
                  <Fragment key={i}>
                    <div className="set-row">
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
                          unit={def.perArm ? '/side' : 'reps'}
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
                    {s.done && (
                      <div className="rir-strip">
                        <span className="rir-label">reps left</span>
                        {RIR_OPTIONS.map((o) => (
                          <button
                            key={o.v}
                            className={
                              'rir-chip' +
                              (o.v === 0 ? ' fail' : '') +
                              (s.rir === o.v ? ' on' : '')
                            }
                            onClick={() =>
                              updateSet(def.id, i, {
                                rir: s.rir === o.v ? undefined : o.v,
                              })
                            }
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </Fragment>
                )
              })}
        </div>

        {/* set count for today */}
        <div className="row" style={{ gap: 8, margin: '-4px 0 12px' }}>
          <button
            className="btn btn-sm btn-ghost grow"
            disabled={exLog.sets.length <= 1 || exLog.sets.every((s) => s.done)}
            onClick={() => removeSetFromSession(def.id)}
          >
            <Minus size={16} /> Remove set
          </button>
          <button
            className="btn btn-sm btn-ghost grow"
            disabled={exLog.sets.length >= 10}
            onClick={() => addSetToSession(def.id)}
          >
            <Plus size={16} /> Add set
          </button>
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
            <button className="btn btn-sm" onClick={() => bumpRest(15)}>
              +15s
            </button>
            <button className="btn btn-sm btn-ghost" onClick={stopRest}>
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
          {nextIndex == null ? (
            <button className="btn btn-success btn-lg grow" onClick={attemptFinish}>
              Finish workout
            </button>
          ) : (
            <button className="btn btn-primary btn-lg grow" onClick={() => go(nextIndex)}>
              Next: {getExercise(exercises[nextIndex].exerciseId).name}
            </button>
          )}
        </div>
      </div>

      {sheet === 'overview' && (
        <Modal title="This workout" onClose={() => setSheet(null)}>
          <div style={{ maxHeight: '58vh', overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
            {exercises.map((e, i) => {
              const d = getExercise(e.exerciseId)
              const b = getBlock(e.exerciseId)
              const done = e.sets.filter((s) => s.done).length
              const prevBlock = i > 0 ? getBlock(exercises[i - 1].exerciseId) : undefined
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
                    <button
                      className="grow"
                      style={{ background: 'none', border: 0, color: 'inherit', textAlign: 'left', padding: 0 }}
                      onClick={() => {
                        go(i)
                        setSheet(null)
                      }}
                    >
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
                          if (i < index || index === exercises.length - 1) {
                            setIndex(Math.max(0, index - 1))
                          }
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
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setSheet('add')}>
            <Plus size={18} /> Add exercise
          </button>
          <div className="tiny faint" style={{ textAlign: 'center', marginTop: 8 }}>
            Changes apply to this workout only — your weekly plan stays as it is.
          </div>
        </Modal>
      )}

      {sheet === 'add' && (
        <Modal title="Add to this workout" onClose={() => setSheet('overview')}>
          <div style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            {BLOCKS.map((b) => {
              const inSession = new Set(exercises.map((e) => e.exerciseId))
              const opts = GYM_EXERCISES.filter(
                (d) => getSlot(d.id)?.block === b.id && !inSession.has(d.id),
              )
              if (!opts.length) return null
              return (
                <div key={b.id}>
                  <div className="eyebrow" style={{ margin: '10px 2px 6px' }}>{b.name}</div>
                  {opts.map((d) => (
                    <button
                      key={d.id}
                      className="list-row"
                      style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
                      onClick={() => {
                        addToSession(d.id)
                        setSheet('overview')
                      }}
                    >
                      <div className="grow">
                        <div style={{ fontWeight: 700 }}>{d.name}</div>
                        <div className="tiny faint">
                          {setScheme(d)} · {getSlot(d.id)?.label}
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
      )}

      {sheet === 'swap' && slot && (
        <Modal title={`Swap ${def.name}`} onClose={() => setSheet(null)}>
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
                style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left' }}
                disabled={current || taken}
                onClick={() => {
                  swapInSession(def.id, opt.id)
                  setSheet(null)
                }}
              >
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>
                    {opt.name}
                    {current && <span className="chip" style={{ marginLeft: 8 }}>current</span>}
                    {taken && <span className="chip" style={{ marginLeft: 8 }}>in workout</span>}
                  </div>
                  <div className="tiny faint">{setScheme(opt)}</div>
                </div>
              </button>
            )
          })}
        </Modal>
      )}

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
