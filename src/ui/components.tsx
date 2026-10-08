import { useEffect, useState, type ReactNode } from 'react'
import type { Muscle } from '../program/exercises'
import { getGuide } from '../program/guides'
import { padEntry, padPress, padValue, type PadKey } from '../program/keypad'
import { formatLoad, type Equipment } from '../program/ladder'
import { Alert, ArrowUp, ExternalLink, Info, Minus, Plus, X } from './icons'

const MUSCLE_COLOR: Record<Muscle, string> = {
  Chest: 'var(--chest)',
  Back: 'var(--back)',
  Shoulders: 'var(--shoulders)',
  Arms: 'var(--arms)',
  Legs: 'var(--legs)',
  Core: 'var(--core)',
  Forearms: 'var(--forearms)',
}

export function MuscleChip({ muscle }: { muscle: Muscle }) {
  return (
    <span className="chip">
      <span className="dot" style={{ background: MUSCLE_COLOR[muscle] }} />
      {muscle}
    </span>
  )
}

export function muscleColor(muscle: Muscle): string {
  return MUSCLE_COLOR[muscle]
}

export type CoachTone = 'up' | 'stall' | 'info' | 'plain'

export function Coach({ tone = 'plain', children }: { tone?: CoachTone; children: ReactNode }) {
  const cls =
    tone === 'up'
      ? 'coach coach-up'
      : tone === 'stall'
        ? 'coach coach-stall'
        : tone === 'info'
          ? 'coach coach-info'
          : 'coach'
  const Icon = tone === 'up' ? ArrowUp : tone === 'stall' ? Alert : Info
  return (
    <div className={cls}>
      <span className="ico">
        <Icon size={17} />
      </span>
      <span>{children}</span>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const round = (v: number) => Math.round(v * 100) / 100
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" onClick={() => onChange(round(clamp(value - step)))}>
        <Minus size={20} />
      </button>
      <div className="val">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <button type="button" aria-label="increase" onClick={() => onChange(round(clamp(value + step)))}>
        <Plus size={20} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  sub,
}: {
  icon?: ReactNode
  title: string
  sub?: string
}) {
  return (
    <div className="center-empty">
      {icon}
      <div className="big">{title}</div>
      {sub ? <div className="small muted">{sub}</div> : null}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface)',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          border: '1px solid var(--border)',
          padding: '16px 16px calc(env(safe-area-inset-bottom, 0px) + 18px)',
        }}
      >
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="card-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** "See the form" link to the exercise's guide on a reputable library. */
export function GuideLink({ exerciseId }: { exerciseId: string }) {
  const guide = getGuide(exerciseId)
  if (!guide?.url) return null
  return (
    <a
      className="btn btn-sm btn-block guide-link"
      href={guide.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span>
        See the form <span className="faint">· {guide.source}</span>
      </span>
      <ExternalLink size={16} />
    </a>
  )
}

const PAD_KEYS: PadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'del']

/** Calculator-style keypad for typing an exact load (instead of ± a rung). */
export function WeightPad({
  equipment,
  weightKg,
  onSet,
  onClose,
}: {
  equipment: Equipment
  weightKg: number
  onSet: (weightKg: number) => void
  onClose: () => void
}) {
  const [entry, setEntry] = useState(() => padEntry(weightKg))
  const [fresh, setFresh] = useState(true)
  const press = (key: PadKey) => {
    setEntry((e) => padPress(e, key, fresh))
    setFresh(false)
  }
  const value = padValue(entry, equipment)
  const assisted = equipment === 'assisted'
  return (
    <Modal title="Type a weight" onClose={onClose}>
      <div className={`pad-display${fresh ? ' fresh' : ''}`}>
        {entry || '0'}
        <span className="unit">kg</span>
      </div>
      <div className="tiny faint" style={{ textAlign: 'center', minHeight: 16, marginBottom: 10 }}>
        {[
          value !== null ? formatLoad(equipment, value) : '',
          assisted ? 'minus = assist, plus = added' : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div className="pad-grid">
        {PAD_KEYS.map((k) => (
          <button
            key={k}
            className="pad-key"
            onClick={() => press(k)}
            aria-label={k === 'del' ? 'delete' : k === ',' ? 'decimal comma' : k}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        {assisted && (
          <button className="btn btn-lg" onClick={() => press('sign')} aria-label="plus or minus">
            ±
          </button>
        )}
        <button
          className="btn btn-primary btn-lg grow"
          disabled={value === null}
          onClick={() => value !== null && onSet(value)}
        >
          Set weight
        </button>
      </div>
    </Modal>
  )
}
