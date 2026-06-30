import { useEffect, type ReactNode } from 'react'
import type { Muscle } from '../program/exercises'
import { Alert, ArrowUp, Info, Minus, Plus, X } from './icons'

const MUSCLE_COLOR: Record<Muscle, string> = {
  Chest: 'var(--chest)',
  Shoulders: 'var(--shoulders)',
  Arms: 'var(--arms)',
  Forearms: 'var(--forearms)',
  Abs: 'var(--abs)',
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
        background: 'rgba(16,24,40,0.4)',
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
