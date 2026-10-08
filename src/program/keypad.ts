// The weight keypad: typing an exact load instead of stepping rung by rung.
// The entry is kept as the string the lifter typed ("22,5"); a weight off the
// ladder is fine — the next level-up snaps to the rung above it. Pure logic.

import type { Equipment } from './ladder'

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'del' | 'sign'

/** Heaviest load the keypad accepts (kg). */
export const PAD_MAX_KG = 500

/** The entry a weight starts as, e.g. 22.5 → "22,5", −10 → "-10". */
export function padEntry(weightKg: number): string {
  return String(Math.round(weightKg * 100) / 100).replace('.', ',')
}

/**
 * Apply one key. `fresh` = the entry still shows the starting weight, so the
 * first digit (or comma) replaces it, like a calculator.
 */
export function padPress(entry: string, key: PadKey, fresh = false): string {
  const neg = entry.startsWith('-')
  const body = neg ? entry.slice(1) : entry
  const signed = (b: string) => (neg && b ? `-${b}` : b)
  if (key === 'sign') return neg ? body : body ? `-${body}` : entry
  if (key === 'del') return fresh ? '' : signed(body.slice(0, -1))
  const base = fresh ? '' : body
  const keepSign = fresh ? (b: string) => b : signed
  if (key === ',') {
    if (base.includes(',')) return entry
    return keepSign(base ? `${base},` : '0,')
  }
  const [int, dec] = base.split(',')
  if (dec !== undefined) return dec.length >= 2 ? entry : keepSign(`${base}${key}`)
  if (int === '0') return keepSign(key) // no leading zeros
  if (int.length >= 3) return entry
  return keepSign(`${base}${key}`)
}

/**
 * The typed weight in kg, or null when it isn't a load this equipment can
 * take: empty, over the max, or negative on anything but the assisted machine.
 */
export function padValue(entry: string, equipment: Equipment): number | null {
  if (!/\d/.test(entry)) return null
  const kg = Number(entry.replace(',', '.'))
  if (!Number.isFinite(kg) || Math.abs(kg) > PAD_MAX_KG) return null
  if (kg < 0 && equipment !== 'assisted') return null
  return Math.round(kg * 100) / 100
}
