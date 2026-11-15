// The workout's clocks — rest countdown, timed-set countdown, elapsed time and
// the screen wake lock. All are driven by wall-clock deadlines (refs), not
// tick counting: chained per-second timeouts drift and get throttled on iOS,
// which would stretch rests and mis-measure logged holds. State holds only the
// displayed seconds; the intervals bail out of re-renders between changes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { beep, vibrate } from './audio'

export interface RestTimer {
  /** Seconds left (0 = "Go!"), or null when no rest is running. */
  rest: number | null
  start: (seconds: number) => void
  bump: (seconds: number) => void
  stop: () => void
}

export function useRestTimer(alert: boolean): RestTimer {
  const [rest, setRest] = useState<number | null>(null)
  const endRef = useRef<number | null>(null)
  const alerted = useRef(false)

  const active = rest !== null
  useEffect(() => {
    if (!active) return
    const iv = setInterval(() => {
      const end = endRef.current
      if (end == null) return
      const left = Math.ceil((end - Date.now()) / 1000)
      if (left > 0) {
        setRest((r) => (r === left ? r : left))
        return
      }
      if (!alerted.current) {
        alerted.current = true
        if (alert) {
          vibrate(220)
          beep()
        }
      }
      // show "Go!" briefly, then hide
      if (Date.now() - end > 900) {
        endRef.current = null
        setRest(null)
      } else {
        setRest((r) => (r === 0 ? r : 0))
      }
    }, 250)
    return () => clearInterval(iv)
  }, [active, alert])

  const start = useCallback((seconds: number) => {
    alerted.current = false
    endRef.current = Date.now() + seconds * 1000
    setRest(seconds)
  }, [])

  const bump = useCallback((seconds: number) => {
    if (endRef.current == null) return
    alerted.current = false
    endRef.current = Math.max(endRef.current, Date.now()) + seconds * 1000
    setRest(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000)))
  }, [])

  const stop = useCallback(() => {
    endRef.current = null
    setRest(null)
  }, [])

  return { rest, start, bump, stop }
}

const READY_SECONDS = 3

export interface Hold {
  setIndex: number
  phase: 'ready' | 'hold'
  display: number
}

export interface HoldTimer {
  hold: Hold | null
  start: (setIndex: number) => void
  /** Stop early: cancels the get-ready, or logs what was held so far. */
  stop: () => void
  /** Drop a set in progress without logging it (moving to another exercise). */
  abandon: () => void
}

/**
 * A timed set: 3-2-1 get-ready, then count DOWN from the target. Both phases
 * are measured from the wall clock so the logged seconds are real seconds.
 * `onLogged` gets the set, the seconds held, and whether it ran to the end.
 */
export function useHoldTimer(
  target: number,
  alert: boolean,
  onLogged: (setIndex: number, seconds: number, full: boolean) => void,
): HoldTimer {
  const [hold, setHold] = useState<Hold | null>(null)
  const phaseStartRef = useRef(0)
  const onLoggedRef = useRef(onLogged)
  onLoggedRef.current = onLogged

  const phase = hold?.phase
  const setIndex = hold?.setIndex
  useEffect(() => {
    if (phase == null || setIndex == null) return
    const iv = setInterval(() => {
      const elapsed = (Date.now() - phaseStartRef.current) / 1000
      if (phase === 'ready') {
        const left = READY_SECONDS - Math.floor(elapsed)
        if (left <= 0) {
          phaseStartRef.current = Date.now()
          if (alert) {
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
          setHold(null)
          if (alert) {
            vibrate(220)
            beep()
          }
          onLoggedRef.current(setIndex, target, true)
        } else {
          setHold((h) => (h && h.display !== remaining ? { ...h, display: remaining } : h))
        }
      }
    }, 200)
    return () => clearInterval(iv)
  }, [phase, setIndex, target, alert])

  const start = useCallback((i: number) => {
    phaseStartRef.current = Date.now()
    setHold({ setIndex: i, phase: 'ready', display: READY_SECONDS })
  }, [])

  const stop = () => {
    if (!hold) return
    setHold(null)
    if (hold.phase === 'ready') return
    const elapsed = Math.round((Date.now() - phaseStartRef.current) / 1000)
    onLoggedRef.current(hold.setIndex, Math.max(1, Math.min(target, elapsed)), false)
  }

  const abandon = useCallback(() => setHold(null), [])

  return { hold, start, stop, abandon }
}

/** "42:07", or "1:02:07" past the hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const two = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`
}

/** Seconds since an ISO time, ticking once a second (null = no clock). */
export function useElapsed(since: string | null): number | null {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!since) return
    const iv = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(iv)
  }, [since])
  return since ? Math.max(0, (Date.now() - Date.parse(since)) / 1000) : null
}

type WakeLockSentinelLike = { release: () => Promise<void> }

/**
 * Keep the screen on while `enabled` — a phone that locks between sets hides
 * the rest timer and takes a Face ID to get back to. The lock is dropped by
 * the browser whenever the page is hidden, so it is re-taken on return.
 * Best-effort: unsupported browsers (and Low Power Mode) just do nothing.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const wl = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }).wakeLock
    if (!wl) return
    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false
    const take = () => {
      if (document.visibilityState !== 'visible') return
      wl.request('screen').then(
        (s) => {
          if (cancelled) void s.release().catch(() => {})
          else sentinel = s
        },
        () => {
          /* denied (low power, not allowed) — carry on without it */
        },
      )
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', take)
      void sentinel?.release().catch(() => {})
    }
  }, [enabled])
}
