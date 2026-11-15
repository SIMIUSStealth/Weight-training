// The coaching for an exercise, folded to one line so the set rows stay on
// screen: the most important note, clipped, with a count of the rest. Tap to
// read them all; tap again to fold.

import { useState, type ReactNode } from 'react'
import { Coach, type CoachTone } from '../../ui/components'
import { Alert, ArrowUp, ChevronDown, Info } from '../../ui/icons'

export interface CoachNote {
  tone: Exclude<CoachTone, 'plain'>
  text: ReactNode
}

export function CoachStrip({ notes }: { notes: CoachNote[] }) {
  const [open, setOpen] = useState(false)
  if (!notes.length) return null
  if (open) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="hide coaching"
        onClick={() => setOpen(false)}
        style={{ marginBottom: 12, cursor: 'pointer' }}
      >
        {notes.map((n, i) => (
          <Coach key={i} tone={n.tone}>
            {n.text}
          </Coach>
        ))}
      </div>
    )
  }
  const first = notes[0]
  const Icon = first.tone === 'up' ? ArrowUp : first.tone === 'stall' ? Alert : Info
  return (
    <button
      className={`coach coach-${first.tone} coach-line`}
      onClick={() => setOpen(true)}
      aria-label="show coaching"
    >
      <span className="ico">
        <Icon size={17} />
      </span>
      <span className="clip">{first.text}</span>
      {notes.length > 1 && <span className="more">+{notes.length - 1}</span>}
      <ChevronDown size={16} />
    </button>
  )
}
