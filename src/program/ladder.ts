// The adjustable dumbbell's available settings, in kg. These are the "rungs"
// of the program: progression only ever moves between ADJACENT values and
// never skips a rung (Training Spec §2, §4).
export const DUMBBELL_LADDER_KG: readonly number[] = [
  2.5, 3.5, 4.5, 5.5, 6.5, 8, 9, 10, 11.5, 13.5, 16, 18, 20.5, 22.5, 24,
] as const

/** Index of a weight on the ladder, or -1 if it is not an exact rung. */
export function rungIndex(weightKg: number): number {
  return DUMBBELL_LADDER_KG.findIndex((w) => Math.abs(w - weightKg) < 1e-9)
}

/** Nearest rung to an arbitrary weight (used to snap manual edits). */
export function nearestRung(weightKg: number): number {
  return DUMBBELL_LADDER_KG.reduce((best, w) =>
    Math.abs(w - weightKg) < Math.abs(best - weightKg) ? w : best,
  )
}

/** The next rung up, or the same weight if already at the top. */
export function nextRung(weightKg: number): number {
  const i = rungIndex(weightKg)
  if (i === -1) {
    // Not an exact rung — snap up to the first rung strictly greater.
    const up = DUMBBELL_LADDER_KG.find((w) => w > weightKg)
    return up ?? DUMBBELL_LADDER_KG[DUMBBELL_LADDER_KG.length - 1]
  }
  return DUMBBELL_LADDER_KG[Math.min(i + 1, DUMBBELL_LADDER_KG.length - 1)]
}

/** The next rung down, or the same weight if already at the bottom. */
export function prevRung(weightKg: number): number {
  const i = rungIndex(weightKg)
  if (i === -1) {
    const downs = DUMBBELL_LADDER_KG.filter((w) => w < weightKg)
    return downs.length ? downs[downs.length - 1] : DUMBBELL_LADDER_KG[0]
  }
  return DUMBBELL_LADDER_KG[Math.max(i - 1, 0)]
}

export function isTopRung(weightKg: number): boolean {
  return rungIndex(weightKg) === DUMBBELL_LADDER_KG.length - 1
}

/** Format a weight the way the spec writes it (comma decimals, e.g. "5,5 kg"). */
export function formatKg(weightKg: number): string {
  const s = Number.isInteger(weightKg)
    ? String(weightKg)
    : weightKg.toFixed(1).replace('.', ',')
  return `${s} kg`
}
