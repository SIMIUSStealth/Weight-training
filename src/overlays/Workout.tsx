import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AB_BLOCKS,
  blockFor,
  effectiveDef,
  getExercise,
  repTarget,
  slotFor,
} from '../program/exercises'
import { abProgramWeek } from '../program/plan'
import {
  MAX_SETS,
  computeRecommendation,
  defaultProgress,
  isLoaded,
} from '../program/progression'
import {
  formatKg,
  formatLoad,
  isTopRung,
  ladderFor,
  nextRung,
  platesPerSide,
  prevRung,
  resolveIncrements,
  warmupSets,
} from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { alternatingGroup, groupRound, nextExerciseIndex } from '../program/flow'
import { getGuide } from '../program/guides'
import { lastNote, setKg } from '../program/sets'
import { useStore } from '../store/useStore'
import { GuideLink, MuscleChip, WeightPad } from '../ui/components'
import { Calculator, Check, ChevronDown, ChevronLeft, List, Minus, Plus, Timer } from '../ui/icons'
import { CoachStrip, type CoachNote } from './workout/CoachStrip'
import { RepRows, TimeRows } from './workout/SetRows'
import { AddSheet, FinishSheet, OverviewSheet, SwapSheet } from './workout/Sheets'
import {
  formatClock,
  useElapsed,
  useHoldTimer,
  useRestTimer,
  useWakeLock,
} from './workout/timers'

/** A workout opened this long before its first set has no running clock yet. */
const IDLE_MS = 30 * 60_000
/** Past this, the clock is a workout left open, not time spent training. */
const CLOCK_MAX_S = 6 * 3600

/** Time since the workout began — its own component so only it re-renders each second. */
function Clock({ since }: { since: string | null }) {
  const elapsed = useElapsed(since)
  if (elapsed == null || elapsed > CLOCK_MAX_S) return null
  return <> · {formatClock(elapsed)}</>
}

type Sheet =
  | null
  | { name: 'overview' | 'add' | 'swap' | 'finish' }
  | { name: 'weight'; setIndex: number | null }

export function Workout() {
  const activeSession = useStore((s) => s.activeSession)
  const sessions = useStore((s) => s.sessions)
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const updateSet = useStore((s) => s.updateSet)
  const setWorkingWeight = useStore((s) => s.setWorkingWeight)
  const setSetWeight = useStore((s) => s.setSetWeight)
  const setExerciseNote = useStore((s) => s.setExerciseNote)
  const finishSession = useStore((s) => s.finishSession)
  const cancelSession = useStore((s) => s.cancelSession)
  const addSetToSession = useStore((s) => s.addSetToSession)
  const removeSetFromSession = useStore((s) => s.removeSetFromSession)
  const closeOverlay = useStore((s) => s.closeOverlay)

  const [index, setIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showWarmup, setShowWarmup] = useState(false)
  // Warm-up sets ticked off — a checklist for now, never part of the log.
  const [warmDone, setWarmDone] = useState<ReadonlySet<string>>(new Set())
  const [sheet, setSheet] = useState<Sheet>(null)
  // The exercise strip in the header — keeps the current pill in view.
  const stripRef = useRef<HTMLDivElement>(null)

  const exercises = activeSession?.exercises ?? []
  const exLog = exercises[index]
  // As its slot runs it — Session A's chest press is 3 × 8, rest 90 s.
  const def = exLog ? effectiveDef(getExercise(exLog.exerciseId), exLog.slot) : null
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
  const abWeek = useMemo(() => abProgramWeek(sessions), [sessions])
  const noteBefore = useMemo(
    () => (def ? lastNote(def.id, sessions) : undefined),
    [def, sessions],
  )

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  const restSeconds = def?.restSeconds ?? settings.restSeconds
  const timer = useRestTimer(settings.restAlert)
  const startRest = () => timer.start(restSeconds)
  const holdTimer = useHoldTimer(target, settings.restAlert, (setIndex, seconds) => {
    if (!def) return
    updateSet(def.id, setIndex, { seconds, done: true })
    startRest()
  })
  const hold = holdTimer.hold
  useWakeLock(settings.keepAwake !== false)

  useEffect(() => {
    const pill = stripRef.current?.querySelector<HTMLElement>('.ex-pill.on')
    pill?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index, exercises.length])

  // The last set of the workout just got ticked (or the workout was reopened
  // with nothing left to do): offer to finish, rather than leave it open.
  const allDone = totalSets > 0 && doneSets === totalSets
  const wasAllDone = useRef(false)
  useEffect(() => {
    if (allDone && !wasAllDone.current) setSheet({ name: 'finish' })
    wasAllDone.current = allDone
  }, [allDone])

  if (!activeSession || !exLog || !def || !rec) return null

  const performed = exercises.filter((e) => e.sets.some((s) => s.done))
  const untouched = exercises.filter((e) => !e.sets.some((s) => s.done))
  const part = activeSession.part ?? 1
  // The clock runs from the start — once training has begun, or while the
  // workout is freshly opened (the start moves to the first set otherwise).
  const clockSince =
    doneSets > 0 || Date.now() - Date.parse(activeSession.startedAt) < IDLE_MS
      ? activeSession.startedAt
      : null

  const toggleRepDone = (setIndex: number, reps: number) => {
    if (exLog.sets[setIndex].done) {
      updateSet(def.id, setIndex, { done: false })
    } else {
      updateSet(def.id, setIndex, { reps, done: true })
      startRest()
    }
  }

  // An effort chip on the set you're on logs it in the same tap.
  const logEffort = (setIndex: number, reps: number, rir: number | undefined) => {
    if (exLog.sets[setIndex].done) {
      updateSet(def.id, setIndex, { rir })
    } else {
      updateSet(def.id, setIndex, { reps, rir, done: true })
      startRest()
    }
  }

  const toggleTimeDone = (setIndex: number) => {
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
    setShowWarmup(false)
    holdTimer.abandon()
  }

  const attemptFinish = () => {
    if (performed.length === 0) cancelSession()
    else if (untouched.length === 0) finishSession()
    else setSheet({ name: 'finish' })
  }

  const nextIndex = nextExerciseIndex(exercises, index)
  const group = alternatingGroup(exercises, index)
  const block = blockFor(def.id, exLog.slot)
  const slot = slotFor(def.id, exLog.slot)
  // The A/B program's run-in: an easy start on leg work, a lighter week 6.
  const inAB = !!block && AB_BLOCKS.includes(block.id)
  const legsEasy = inAB && abWeek <= 2 && def.muscle === 'Legs'
  const weight = exLog.weightKg
  const loaded = isLoaded(def)
  const ladder = ladderFor(def.equipment, increments)
  // An unloaded time exercise is a hold (plank); a loaded one is timed work
  // with a kettlebell.
  const isHold = def.kind === 'time' && !loaded
  const guide = getGuide(def.id)
  const plates = def.equipment === 'barbell' ? platesPerSide(weight) : null
  const warmups = def.kind === 'reps' ? warmupSets(def.equipment, weight, increments) : []

  // Coaching, most important first — folded to one line above the sets.
  const notes: CoachNote[] = []
  if (rec.justLeveledUp && rec.coach) notes.push({ tone: 'up', text: rec.coach })
  if (rec.stalled && rec.coach) notes.push({ tone: 'stall', text: rec.coach })
  if (!rec.justLeveledUp && !rec.stalled && rec.coach) notes.push({ tone: 'info', text: rec.coach })
  // "too easy" would contradict the deliberate run-in on legs
  if (rec.effortNote && !legsEasy) notes.push({ tone: 'info', text: rec.effortNote })
  if (legsEasy) {
    notes.push({
      tone: 'info',
      text: `Week ${abWeek} of the program: leave ~3 reps in the tank on leg work.`,
    })
  }
  if (inAB && abWeek === 6) {
    notes.push({
      tone: 'info',
      text: 'Week 6 — an optional lighter week: 2 sets each is plenty (Remove set below).',
    })
  }
  if (inAB && part === 1 && doneSets === 0) {
    notes.push({ tone: 'info', text: 'Warm up for about 5 minutes before your first set.' })
  }

  const padSet = sheet?.name === 'weight' ? sheet.setIndex : null

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row between">
          <button className="icon-btn" onClick={closeOverlay} aria-label="minimize">
            <ChevronDown size={20} />
          </button>
          <button
            onClick={() => setSheet({ name: 'overview' })}
            aria-label="workout overview"
            style={{ textAlign: 'center', background: 'none', border: 0, color: 'inherit', padding: 0 }}
          >
            <div className="row" style={{ fontWeight: 800, gap: 6, justifyContent: 'center' }}>
              <List size={16} />
              Workout{part > 1 ? ` · Part ${part}` : ''}
            </div>
            <div className="tiny faint" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {index + 1} / {exercises.length} · {doneSets}/{totalSets} sets
              <Clock since={clockSince} />
            </div>
          </button>
          <button className="btn btn-success btn-sm" onClick={attemptFinish}>
            Finish
          </button>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <span style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
        {/* jump to any exercise — machine taken? do another one first */}
        <div className="ex-strip" ref={stripRef} role="tablist" aria-label="exercises">
          {exercises.map((e, i) => {
            const done = e.sets.filter((s) => s.done).length
            const finished = done > 0 && done === e.sets.length
            return (
              <button
                key={e.exerciseId}
                role="tab"
                aria-selected={i === index}
                className={'ex-pill' + (i === index ? ' on' : finished ? ' done' : '')}
                onClick={() => go(i)}
              >
                {finished && <Check size={13} />}
                <span className="nm">{getExercise(e.exerciseId).name}</span>
                {!finished && done > 0 && (
                  <span className="ct">
                    {done}/{e.sets.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overlay-body" key={def.id}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <MuscleChip muscle={def.muscle} />
          <span className="tiny faint" style={{ fontWeight: 700, textAlign: 'right' }}>
            {[
              block ? block.name + (group ? ` · round ${groupRound(exercises, group)}` : '') : '',
              slot && (slot.optional || block?.optional) ? 'optional' : '',
              group ? 'alternate sets' : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <div className="row between" style={{ gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, margin: '2px 0' }}>{def.name}</h1>
          {slot && slot.optionIds.length > 1 && !exLog.sets.some((s) => s.done) && (
            <button
              className="btn btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => setSheet({ name: 'swap' })}
            >
              Swap
            </button>
          )}
        </div>

        {/* working load / hold target */}
        <div className="card" style={{ padding: '12px 16px' }}>
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
              <div className="display" style={{ fontSize: 26, fontWeight: 800 }}>
                {isHold ? formatSeconds(target) : formatLoad(def.equipment, weight)}
              </div>
              <div className="tiny muted">
                {isHold
                  ? `${exLog.sets.length} sets · hold steady`
                  : def.kind === 'time'
                    ? `${exLog.sets.length} rounds × ${formatSeconds(target)}`
                    : `${exLog.sets.length} × ${repTarget(def)} reps${
                        def.perArm ? ' · each side' : ''
                      }`}
                {def.restSeconds ? ` · rest ${formatSeconds(def.restSeconds)}` : ''}
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
                <button
                  aria-label="type a weight"
                  onClick={() => setSheet({ name: 'weight', setIndex: null })}
                >
                  <Calculator size={20} />
                </button>
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
          {plates && (
            <div className="tiny muted" style={{ marginTop: 8 }}>
              {plates.length
                ? `Each side: ${plates.map((p) => formatKg(p).replace(' kg', '')).join(' + ')} kg`
                : 'Just the bar'}
            </div>
          )}
          {def.holdNote && (
            <div className="tiny faint" style={{ marginTop: 8 }}>
              {def.holdNote}
            </div>
          )}
        </div>

        <CoachStrip notes={notes} />

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
            <button
              className="btn btn-danger btn-block"
              onClick={holdTimer.stop}
              style={{ marginTop: 8 }}
            >
              {hold.phase === 'ready' ? 'Cancel' : `Stop & log set ${hold.setIndex + 1}`}
            </button>
          </div>
        )}

        {/* sets */}
        <div className="card" style={{ paddingTop: 10, paddingBottom: 6 }}>
          {def.kind === 'time' ? (
            <TimeRows
              exLog={exLog}
              rec={rec}
              target={target}
              isHold={isHold}
              hold={hold}
              onStart={holdTimer.start}
              onToggle={toggleTimeDone}
            />
          ) : (
            <RepRows
              def={def}
              exLog={exLog}
              rec={rec}
              loaded={loaded}
              onReps={(i, v) => updateSet(def.id, i, { reps: v })}
              onToggle={toggleRepDone}
              onEffort={logEffort}
              onWeight={(i) => setSheet({ name: 'weight', setIndex: i })}
            />
          )}
        </div>

        {/* set count for today */}
        <div className="row" style={{ gap: 8, margin: '-4px 0 10px' }}>
          <button
            className="btn btn-sm btn-ghost grow"
            disabled={exLog.sets.length <= 1 || exLog.sets.every((s) => s.done)}
            onClick={() => removeSetFromSession(def.id)}
          >
            <Minus size={16} /> Remove set
          </button>
          <button
            className="btn btn-sm btn-ghost grow"
            disabled={exLog.sets.length >= MAX_SETS}
            onClick={() => addSetToSession(def.id)}
          >
            <Plus size={16} /> Add set
          </button>
        </div>

        {/* a note for next time */}
        {noteBefore && (
          <div className="tiny muted" style={{ margin: '0 2px 6px' }}>
            Last note: <em>{noteBefore}</em>
          </div>
        )}
        <input
          className="input note-input"
          type="text"
          value={exLog.note ?? ''}
          onChange={(e) => setExerciseNote(def.id, e.target.value)}
          placeholder="Note for next time (seat height, a niggle…)"
          aria-label="exercise note"
          maxLength={200}
        />

        {/* warm-up ramp */}
        {warmups.length > 0 && (
          <>
            <button
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => setShowWarmup((v) => !v)}
              style={{ justifyContent: 'space-between', marginTop: 10 }}
            >
              <span>Warm-up sets</span>
              <span className="faint">{showWarmup ? 'hide' : 'show'}</span>
            </button>
            {showWarmup && (
              <div className="coach" style={{ marginTop: 8, display: 'block' }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  {warmups.map((w, i) => {
                    const key = `${def.id}:${w.weightKg}:${i}`
                    const on = warmDone.has(key)
                    return (
                      <button
                        key={key}
                        className={'ex-pill' + (on ? ' done' : '')}
                        onClick={() =>
                          setWarmDone((prev) => {
                            const next = new Set(prev)
                            if (on) next.delete(key)
                            else next.add(key)
                            return next
                          })
                        }
                      >
                        {on && <Check size={13} />}
                        <span className="nm">
                          {formatLoad(def.equipment, w.weightKg)} × {w.reps}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="tiny faint" style={{ marginTop: 8 }}>
                  Easy reps, short rests — not logged, just a ramp to{' '}
                  {formatLoad(def.equipment, weight)}.
                </div>
              </div>
            )}
          </>
        )}

        {/* form cue */}
        <button
          className="btn btn-ghost btn-block btn-sm"
          onClick={() => setShowForm((v) => !v)}
          style={{ justifyContent: 'space-between', marginTop: 10 }}
        >
          <span>How to perform</span>
          <span className="faint">{showForm ? 'hide' : 'show'}</span>
        </button>
        {showForm && (
          <div className="coach" style={{ marginTop: 8, display: 'block' }}>
            {guide && <p style={{ margin: '0 0 8px', color: 'var(--text)' }}>{guide.about}</p>}
            <span>{def.formCue}</span>
          </div>
        )}
        <GuideLink exerciseId={def.id} />

        <button
          className="btn btn-danger btn-block btn-sm"
          style={{ marginTop: 22, opacity: 0.8 }}
          onClick={cancelSession}
        >
          Discard workout
        </button>
      </div>

      <div className="overlay-foot">
        {timer.rest !== null && (
          <div className="rest-sheet" style={{ marginBottom: 10 }}>
            <Timer size={22} />
            <div className="rest-time">{timer.rest <= 0 ? 'Go!' : formatSeconds(timer.rest)}</div>
            <div className="grow" />
            <button className="btn btn-sm" onClick={() => timer.bump(15)}>
              +15s
            </button>
            <button className="btn btn-sm btn-ghost" onClick={timer.stop}>
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

      {sheet?.name === 'overview' && (
        <OverviewSheet
          exercises={exercises}
          index={index}
          onJump={(i) => {
            go(i)
            setSheet(null)
          }}
          onRemoved={(i) => {
            if (i < index || index === exercises.length - 1) setIndex(Math.max(0, index - 1))
          }}
          onAdd={() => setSheet({ name: 'add' })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.name === 'add' && (
        <AddSheet exercises={exercises} onClose={() => setSheet({ name: 'overview' })} />
      )}
      {sheet?.name === 'swap' && slot && (
        <SwapSheet def={def} slot={slot} exercises={exercises} onClose={() => setSheet(null)} />
      )}
      {sheet?.name === 'weight' && (
        <WeightPad
          equipment={def.equipment}
          weightKg={padSet == null ? weight : setKg(exLog, exLog.sets[padSet] ?? { done: false })}
          title={padSet == null ? 'Working load' : `Set ${padSet + 1} load`}
          hint={
            padSet == null
              ? 'for the sets still to do'
              : exLog.sets[padSet]?.done
                ? 'this set only'
                : 'this set and the ones after it'
          }
          onClose={() => setSheet(null)}
          onSet={(kg) => {
            if (padSet == null) setWorkingWeight(def.id, kg)
            else setSetWeight(def.id, padSet, kg)
            setSheet(null)
          }}
        />
      )}
      {sheet?.name === 'finish' && (
        <FinishSheet
          performed={performed.length}
          untouched={untouched.length}
          total={exercises.length}
          part={part}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
