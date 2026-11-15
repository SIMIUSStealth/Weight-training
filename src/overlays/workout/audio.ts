// Rest / hold alerts: a short beep and a vibration, both best-effort.

// One shared AudioContext for the app's lifetime — iOS Safari caps live
// contexts (~4), so creating one per beep permanently kills audio mid-workout.
let sharedAudioCtx: AudioContext | null = null

export function beep(freq = 880, dur = 0.45) {
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

export function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* ignore */
  }
}
