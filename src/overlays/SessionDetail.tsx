import { useState } from 'react'
import { getExercise, type ExerciseDef } from '../program/exercises'
import {
  compactNumber,
  localDateKey,
  moveSessionToDay,
  sessionDurationMin,
} from '../program/history'
import { formatLoad, formatLoadShort } from '../program/ladder'
import { sessionTitle } from '../program/plan'
import { MAX_SETS, isLoaded } from '../program/progression'
import { formatSeconds } from '../program/analytics'
import { sessionVolumeKg, setKg } from '../program/sets'
import { useStore } from '../store/useStore'
import { Modal, Stepper, WeightPad, muscleColor } from '../ui/components'
import { ArrowUp, ChevronLeft, Pencil, Plus, Trash, Trophy, X } from '../ui/icons'
import type { ExerciseLog, SessionLog, SetLog } from '../storage/types'

/** A set as a chip: "8", "8/side", "45s" — with its load when it had its own. */
function setLabel(def: ExerciseDef, log: ExerciseLog, s: SetLog): string {
  const value =
    def.kind === 'time' ? formatSeconds(s.seconds ?? 0) : `${s.reps ?? 0}${def.perArm ? '/side' : ''}`
  return s.weightKg != null && isLoaded(def)
    ? `${value} × ${formatLoadShort(def.equipment, setKg(log, s))}`
    : value
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId))
  const deleteSession = useStore((s) => s.deleteSession)
  const updateSession = useStore((s) => s.updateSession)
  const closeOverlay = useStore((s) => s.closeOverlay)
  const [confirm, setConfirm] = useState(false)
  // The copy being edited (null = just viewing).
  const [draft, setDraft] = useState<SessionLog | null>(null)
  // Which load the keypad is typing: an exercise's, or one of its sets'.
  const [pad, setPad] = useState<{ ex: number; set: number | null } | null>(null)

  if (!session) {
    return (
      <div className="overlay">
        <div className="overlay-body">
          <button className="btn" onClick={closeOverlay}>
            Back
          </button>
        </div>
      </div>
    )
  }

  const shown = draft ?? session
  const when = new Date(shown.completedAt ?? shown.startedAt)
  const setsDone = shown.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const duration = sessionDurationMin(shown)
  const volume = sessionVolumeKg(shown)

  // ---- editing helpers: every change builds a new draft ----
  const patchExercise = (ex: number, fn: (log: ExerciseLog) => ExerciseLog) =>
    setDraft((d) => d && { ...d, exercises: d.exercises.map((e, i) => (i === ex ? fn(e) : e)) })
  const patchSet = (ex: number, set: number, patch: Partial<SetLog>) =>
    patchExercise(ex, (log) => ({
      ...log,
      sets: log.sets.map((s, j) => (j === set ? { ...s, ...patch } : s)),
    }))
  const addSet = (ex: number) =>
    patchExercise(ex, (log) => {
      const last = log.sets[log.sets.length - 1]
      // A copy of the last set — the likeliest thing a forgotten set was.
      const copy: SetLog = last ? { ...last, done: true } : { reps: 0, done: true }
      delete copy.rir
      delete copy.at
      return { ...log, sets: [...log.sets, copy] }
    })
  const removeSet = (ex: number, set: number) =>
    patchExercise(ex, (log) => ({ ...log, sets: log.sets.filter((_, j) => j !== set) }))

  const startEdit = () =>
    // Only the logged sets are worth editing; unticked leftovers are dropped.
    setDraft({
      ...session,
      exercises: session.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
        .filter((e) => e.sets.length > 0),
    })
  const save = () => {
    if (!draft) return
    setDraft(null)
    // Every set removed: that's deleting the session — ask, as for a delete.
    if (draft.exercises.some((e) => e.sets.length > 0)) updateSession(draft)
    else setConfirm(true)
  }

  const performed = shown.exercises.filter((e) => e.sets.some((s) => s.done))
  const padLog = pad && draft ? draft.exercises[pad.ex] : null

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row" style={{ gap: 10 }}>
          {draft ? (
            <button className="btn btn-sm" onClick={() => setDraft(null)}>
              Cancel
            </button>
          ) : (
            <button className="icon-btn" onClick={closeOverlay} aria-label="back">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {draft ? 'Edit session' : sessionTitle(session)}
            </div>
            <div className="tiny faint">
              {when.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          {draft ? (
            <button className="btn btn-primary btn-sm" onClick={save}>
              Save
            </button>
          ) : (
            <>
              <button className="icon-btn" onClick={startEdit} aria-label="edit session">
                <Pencil size={18} />
              </button>
              <button
                className="icon-btn"
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirm(true)}
                aria-label="delete session"
              >
                <Trash size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overlay-body">
        {draft ? (
          <div className="card">
            <div className="field">
              <label htmlFor="session-day">Day</label>
              <input
                id="session-day"
                className="input"
                type="date"
                value={localDateKey(when)}
                max={localDateKey(new Date())}
                onChange={(e) => setDraft((d) => d && moveSessionToDay(d, e.target.value))}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="session-note">Session note</label>
              <input
                id="session-note"
                className="input"
                type="text"
                maxLength={300}
                value={draft.notes ?? ''}
                placeholder="How it went"
                onChange={(e) => setDraft((d) => d && { ...d, notes: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="recap" style={{ margin: '0 0 14px', paddingTop: 0, borderTop: 0 }}>
              <div>
                <div className="num">{duration != null ? duration : '—'}</div>
                <div className="label">min</div>
              </div>
              <div>
                <div className="num">{performed.length}</div>
                <div className="label">exercises</div>
              </div>
              <div>
                <div className="num">{setsDone}</div>
                <div className="label">sets</div>
              </div>
              <div>
                <div className="num">{volume > 0 ? compactNumber(volume) : '—'}</div>
                <div className="label">kg lifted</div>
              </div>
            </div>
            {session.notes && (
              <div className="coach" style={{ marginBottom: 12 }}>
                <span style={{ fontStyle: 'italic' }}>{session.notes}</span>
              </div>
            )}
            {session.bodyweightKg != null && (
              <div className="coach coach-info" style={{ marginBottom: 12 }}>
                Bodyweight that day: {session.bodyweightKg} kg
              </div>
            )}
          </>
        )}

        {shown.exercises.map((e, ex) => {
          const def = getExercise(e.exerciseId)
          const loaded = isLoaded(def)
          const prs = (session.prs ?? []).filter((p) => p.exerciseId === e.exerciseId).length
          if (!draft && !e.sets.some((s) => s.done)) return null
          return (
            <div className="card" key={e.exerciseId}>
              <div className="row between">
                <div className="row" style={{ gap: 9 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: muscleColor(def.muscle),
                      flexShrink: 0,
                    }}
                  />
                  <span className="card-title">{def.name}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {!draft && prs > 0 && (
                    <span className="chip" style={{ color: 'var(--accent-ink)' }}>
                      <Trophy size={13} /> {prs}
                    </span>
                  )}
                  {!draft && e.leveledUp && (
                    <span className="chip" style={{ color: 'var(--success)' }}>
                      <ArrowUp size={13} /> up
                    </span>
                  )}
                  {loaded &&
                    (draft ? (
                      <button
                        className="btn btn-sm"
                        aria-label={`${def.name} load`}
                        onClick={() => setPad({ ex, set: null })}
                      >
                        {formatLoad(def.equipment, e.weightKg)}
                      </button>
                    ) : (
                      <span className="figure" style={{ fontSize: 20 }}>{formatLoad(def.equipment, e.weightKg)}</span>
                    ))}
                </div>
              </div>

              {draft ? (
                <>
                  {e.sets.map((s, j) => (
                    <div className="set-row" key={j} style={{ gap: 8 }}>
                      <div className="set-no">{j + 1}</div>
                      {loaded && (
                        <button
                          className={'set-kg' + (s.weightKg != null ? ' own' : '')}
                          aria-label={`set ${j + 1} load`}
                          onClick={() => setPad({ ex, set: j })}
                        >
                          {formatLoadShort(def.equipment, setKg(e, s))}
                        </button>
                      )}
                      <div className="grow row" style={{ justifyContent: 'center' }}>
                        {def.kind === 'time' ? (
                          <Stepper
                            compact
                            value={s.seconds ?? 0}
                            min={0}
                            max={900}
                            step={5}
                            unit="s"
                            onChange={(v) => patchSet(ex, j, { seconds: v })}
                          />
                        ) : (
                          <Stepper
                            compact
                            value={s.reps ?? 0}
                            min={0}
                            max={60}
                            onChange={(v) => patchSet(ex, j, { reps: v })}
                          />
                        )}
                      </div>
                      <button
                        className="icon-btn"
                        style={{ width: 36, height: 36, color: 'var(--danger)' }}
                        aria-label={`remove set ${j + 1}`}
                        onClick={() => removeSet(ex, j)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={e.sets.length >= MAX_SETS}
                      onClick={() => addSet(ex)}
                    >
                      <Plus size={16} /> Set
                    </button>
                    <input
                      className="input note-input grow"
                      type="text"
                      maxLength={200}
                      value={e.note ?? ''}
                      placeholder="Note"
                      aria-label={`${def.name} note`}
                      onChange={(ev) => patchExercise(ex, (log) => ({ ...log, note: ev.target.value }))}
                    />
                  </div>
                  {e.sets.length === 0 && (
                    <div className="tiny faint" style={{ marginTop: 8 }}>
                      No sets left — this exercise is removed when you save.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="figure muted" style={{ fontSize: 17, marginTop: 6, whiteSpace: 'normal' }}>
                    {e.sets
                      .filter((s) => s.done)
                      .map((s) => setLabel(def, e, s))
                      .join('  ·  ')}
                  </div>
                  {e.note && (
                    <div className="tiny muted" style={{ marginTop: 8, fontStyle: 'italic' }}>
                      {e.note}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {draft && (
          <div className="tiny faint" style={{ textAlign: 'center', marginTop: 6 }}>
            Saving re-checks your personal records. Current loads stay as they are.
          </div>
        )}
      </div>

      {pad && padLog && (
        <WeightPad
          equipment={getExercise(padLog.exerciseId).equipment}
          weightKg={pad.set == null ? padLog.weightKg : setKg(padLog, padLog.sets[pad.set])}
          title={pad.set == null ? 'Load for every set' : `Set ${pad.set + 1} load`}
          hint={pad.set == null ? 'sets with their own load keep it' : 'this set only'}
          onClose={() => setPad(null)}
          onSet={(kg) => {
            if (pad.set == null) patchExercise(pad.ex, (log) => ({ ...log, weightKg: kg }))
            else patchSet(pad.ex, pad.set, { weightKg: kg })
            setPad(null)
          }}
        />
      )}

      {confirm && (
        <Modal title="Delete this session?" onClose={() => setConfirm(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>
            This removes the session from your history. It won&rsquo;t change your
            current weights.
          </p>
          <button
            className="btn btn-danger btn-block"
            onClick={() => deleteSession(session.id)}
          >
            Delete session
          </button>
        </Modal>
      )}
    </div>
  )
}
