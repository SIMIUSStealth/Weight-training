import { useState } from 'react'
import { getExercise } from '../program/exercises'
import { formatKg } from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { useStore } from '../store/useStore'
import { Modal, muscleColor } from '../ui/components'
import { ArrowUp, ChevronLeft, Trash } from '../ui/icons'

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId))
  const deleteSession = useStore((s) => s.deleteSession)
  const closeOverlay = useStore((s) => s.closeOverlay)
  const [confirm, setConfirm] = useState(false)

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

  const performed = session.exercises.filter((e) => e.sets.some((s) => s.done))

  return (
    <div className="overlay">
      <div className="overlay-head">
        <div className="row" style={{ gap: 10 }}>
          <button className="icon-btn" onClick={closeOverlay} aria-label="back">
            <ChevronLeft size={20} />
          </button>
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {new Date(session.completedAt ?? session.startedAt).toLocaleDateString(
                undefined,
                { weekday: 'long', day: 'numeric', month: 'long' },
              )}
            </div>
            <div className="tiny faint">
              {performed.length} exercises ·{' '}
              {session.exercises.reduce(
                (n, e) => n + e.sets.filter((s) => s.done).length,
                0,
              )}{' '}
              sets
            </div>
          </div>
          <button
            className="icon-btn"
            style={{ color: 'var(--danger)' }}
            onClick={() => setConfirm(true)}
            aria-label="delete session"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>

      <div className="overlay-body">
        {session.bodyweightKg != null && (
          <div className="coach coach-info" style={{ marginBottom: 12 }}>
            Bodyweight that day: {session.bodyweightKg} kg
          </div>
        )}

        {performed.map((e) => {
          const def = getExercise(e.exerciseId)
          const done = e.sets.filter((s) => s.done)
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
                    }}
                  />
                  <span className="card-title">{def.name}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {e.leveledUp && (
                    <span className="chip" style={{ color: 'var(--success)' }}>
                      <ArrowUp size={13} /> up
                    </span>
                  )}
                  {def.kind !== 'time' && !def.bodyweight && (
                    <span style={{ fontWeight: 800 }}>{formatKg(e.weightKg)}</span>
                  )}
                </div>
              </div>
              <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                {done.map((s, i) => (
                  <span key={i} className="chip" style={{ background: 'var(--surface-3)' }}>
                    {def.kind === 'time'
                      ? formatSeconds(s.seconds ?? 0)
                      : `${s.reps}${def.perArm ? '/arm' : ''}`}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

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
