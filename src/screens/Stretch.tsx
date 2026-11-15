import { useState } from 'react'
import { ROUTINES, exampleUrl } from '../program/mobility'
import { Coach } from '../ui/components'
import { ExternalLink } from '../ui/icons'

/**
 * Stretch & easy strength — a library to pick from, not a workout: nothing is
 * logged, ticked or progressed.
 */
export function Stretch() {
  const [id, setId] = useState(ROUTINES[0].id)
  const routine = ROUTINES.find((r) => r.id === id) ?? ROUTINES[0]

  return (
    <div className="screen fade-in">
      <div className="topbar">
        <div>
          <h1>Stretch</h1>
          <div className="sub">Easy moves to pick from. Nothing to log.</div>
        </div>
      </div>

      <div className="pick-chips" role="tablist" aria-label="routine" style={{ marginTop: 0 }}>
        {ROUTINES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={r.id === id}
            className={'ex-pill' + (r.id === id ? ' on' : '')}
            onClick={() => setId(r.id)}
          >
            {r.short}
          </button>
        ))}
      </div>

      <div key={routine.id} className="fade-in">
        <h2 className="routine-title">{routine.name}</h2>
        <div className="tiny faint" style={{ fontWeight: 700, margin: '0 2px 8px' }}>
          About {routine.minutes} min · {routine.moves.length} moves
          {routine.kit ? ` · ${routine.kit}` : ' · No kit'}
        </div>
        <p className="small muted" style={{ margin: '0 2px 12px', lineHeight: 1.5 }}>
          {routine.about}
        </p>
        {routine.caution && <Coach tone="stall">{routine.caution}</Coach>}

        {routine.moves.map((m, i) => (
          <div className="card move-card" key={m.id}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div className="set-no">{i + 1}</div>
              <div className="grow">
                <div className="card-title">{m.name}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {m.target}
                </div>
              </div>
            </div>
            <div className="move-dose">{m.dose}</div>
            <p className="small" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
              {m.how}
            </p>
            {m.feel && (
              <p className="small muted" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                <strong>Feel:</strong> {m.feel}
              </p>
            )}
            <a
              className="btn btn-sm btn-block guide-link"
              style={{ marginTop: 0 }}
              href={exampleUrl(m)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                Watch examples <span className="faint">· YouTube</span>
              </span>
              <ExternalLink size={16} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
