import { getExercise } from '../program/exercises'
import { formatKg, prevRung } from '../program/ladder'
import { formatSeconds } from '../program/analytics'
import { useStore, type SessionSummary } from '../store/useStore'
import { Coach } from '../ui/components'
import { ArrowUp, Check, Info, Trophy } from '../ui/icons'
import type { PRRecord } from '../storage/types'

function prLabel(pr: PRRecord): string {
  if (pr.kind === 'hold') return `${formatSeconds(pr.value)} — longest hold yet`
  if (pr.kind === 'reps')
    return `${pr.value} reps @ ${formatKg(pr.weightKg ?? 0)} — most ever at this weight`
  return `est. 1RM ${formatKg(pr.value)} — all-time strength best`
}

export function Summary({ summary }: { summary: SessionSummary }) {
  const progress = useStore((s) => s.progress)
  const setExerciseWeight = useStore((s) => s.setExerciseWeight)
  const setTab = useStore((s) => s.setTab)
  const closeOverlay = useStore((s) => s.closeOverlay)
  const resumeSession = useStore((s) => s.resumeSession)

  const done = () => {
    closeOverlay()
    setTab('today')
  }

  return (
    <div className="overlay">
      <div className="overlay-body" style={{ paddingTop: 'calc(var(--safe-top) + 28px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--success-dim)',
              color: 'var(--success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={34} />
          </div>
          <h1 style={{ margin: '14px 0 2px' }}>
            {summary.split ? `Part ${summary.split.part - 1} logged` : 'Session logged'}
          </h1>
          <div className="muted small">
            {summary.setsLogged} sets · {summary.durationMin} min
          </div>
        </div>

        {summary.split && (
          <div className="coach coach-info" style={{ marginBottom: 4 }}>
            <span className="ico">
              <Info size={17} />
            </span>
            <span>
              {summary.split.remaining} exercise
              {summary.split.remaining === 1 ? '' : 's'} saved as{' '}
              <strong>Part {summary.split.part}</strong> — finish them whenever. It
              still counts as one workout this week.
            </span>
          </div>
        )}

        {summary.prs.length > 0 && (
          <>
            <div className="eyebrow">
              <span className="row" style={{ gap: 6 }}>
                <Trophy size={14} /> Personal records ({summary.prs.length})
              </span>
            </div>
            <div className="card">
              {[...new Set(summary.prs.map((p) => p.exerciseId))].map((exId) => (
                <div className="set-row" key={exId} style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent-ink)', marginTop: 2 }}>
                    <Trophy size={20} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{getExercise(exId).name}</div>
                    {summary.prs
                      .filter((p) => p.exerciseId === exId)
                      .map((p) => (
                        <div className="tiny muted" key={p.kind} style={{ marginTop: 2 }}>
                          {prLabel(p)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {summary.levelUps.length > 0 ? (
          <>
            <div className="eyebrow">
              <span className="row" style={{ gap: 6 }}>
                <ArrowUp size={14} /> Leveled up ({summary.levelUps.length})
              </span>
            </div>
            <div className="card">
              {summary.levelUps.map((lu) => (
                <div className="set-row" key={lu.exerciseId}>
                  <span style={{ color: 'var(--success)' }}>
                    <ArrowUp size={20} />
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{getExercise(lu.exerciseId).name}</div>
                    <div className="tiny faint">
                      {lu.kind === 'time' ? 'hold target' : 'dumbbell'} raised
                    </div>
                  </div>
                  <div style={{ fontWeight: 800 }}>
                    <span className="muted" style={{ fontWeight: 600 }}>
                      {lu.from}
                    </span>{' '}
                    → {lu.to}
                  </div>
                </div>
              ))}
            </div>
            <Coach tone="up">
              After a jump your reps will drop — that&rsquo;s expected. Work them back
              to the top of the range, then climb again.
            </Coach>
          </>
        ) : summary.prs.length > 0 ? null : (
          <Coach tone="info">
            No level-ups this time — that&rsquo;s normal. Beat at least one set next
            session and you&rsquo;re trending the right way.
          </Coach>
        )}

        {summary.failureSets >= 6 && (
          <Coach tone="stall">
            You took {summary.failureSets} sets to failure. Strong — but leaving
            1–2 reps in reserve on most sets keeps fatigue down, so you can train
            each muscle more often.
          </Coach>
        )}

        {summary.startNudges.length > 0 && (
          <>
            <div className="eyebrow">Starting weight check</div>
            {summary.startNudges.map((n) => {
              const def = getExercise(n.exerciseId)
              const cur = progress[n.exerciseId]?.currentWeightKg ?? def.startWeightKg
              if (n.kind === 'too_heavy') {
                const drop = prevRung(cur)
                return (
                  <div className="card" key={n.exerciseId}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{def.name}</div>
                    <div className="small muted" style={{ marginBottom: 10 }}>
                      You couldn&rsquo;t hold the bottom of the range — the start weight
                      looks a touch heavy.
                    </div>
                    {drop !== cur ? (
                      <button
                        className="btn btn-sm btn-block"
                        onClick={() => setExerciseWeight(n.exerciseId, drop)}
                      >
                        Drop to {formatKg(drop)}
                      </button>
                    ) : (
                      <div className="tiny faint">Already at the lightest setting.</div>
                    )}
                  </div>
                )
              }
              return (
                <div className="card" key={n.exerciseId}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{def.name}</div>
                  <div className="small muted">
                    That looked easy — the start weight is light. You&rsquo;ll keep
                    leveling up over the next session or two until it bites.
                  </div>
                </div>
              )
            })}
          </>
        )}

        {summary.split ? (
          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => {
                closeOverlay()
                resumeSession()
              }}
            >
              Continue Part {summary.split.part} now
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={done}>
              Later
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 24 }} onClick={done}>
            Done
          </button>
        )}
      </div>
    </div>
  )
}
