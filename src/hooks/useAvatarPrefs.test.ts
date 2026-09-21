import { describe, expect, it } from 'vitest'

import { AVATAR_COLORS } from './useAvatarPrefs'

/**
 * WCAG relative luminance / contrast ratio, computed directly from the
 * gradient strings in AVATAR_COLORS — no CSS parsing, no browser. See
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [r, g, b]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastWithWhite(rgb: [number, number, number]): number {
  const l = relativeLuminance(rgb)
  return 1.05 / (l + 0.05)
}

function midpointRgb(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

/** Extracts the two `#rrggbb` stops out of a `linear-gradient(135deg,#a,#b)` string. */
function parseGradientStops(value: string): [string, string] {
  const matches = value.match(/#[0-9a-fA-F]{6}/g)
  if (!matches || matches.length !== 2) {
    throw new Error(`expected exactly 2 hex stops in gradient, got: ${value}`)
  }
  return [matches[0], matches[1]]
}

const MIN_CONTRAST = 4.5

describe('AVATAR_COLORS — white-initials contrast (Phase 9 follow-up)', () => {
  it('has exactly 12 gradients (darkening pass, not a re-hue: same count)', () => {
    expect(AVATAR_COLORS).toHaveLength(12)
  })

  it.each(AVATAR_COLORS.map((c) => [c.label, c.value] as const))(
    '%s clears 4.5:1 against white at both stops and the midpoint',
    (_label, value) => {
      const [stop1Hex, stop2Hex] = parseGradientStops(value)
      const stop1 = hexToRgb(stop1Hex)
      const stop2 = hexToRgb(stop2Hex)
      const mid = midpointRgb(stop1, stop2)

      const c1 = contrastWithWhite(stop1)
      const c2 = contrastWithWhite(stop2)
      const cMid = contrastWithWhite(mid)

      expect(c1, `stop 1 (${stop1Hex})`).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(c2, `stop 2 (${stop2Hex})`).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(cMid, 'midpoint').toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  )

  it('every gradient still resolves to a distinct pair of colors (no accidental duplicates)', () => {
    const seen = new Set<string>()
    for (const { value } of AVATAR_COLORS) {
      expect(seen.has(value)).toBe(false)
      seen.add(value)
    }
  })
})
