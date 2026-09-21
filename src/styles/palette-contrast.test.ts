/**
 * Locks in the contrast floors for the "cool slate" palette (2026-09-21
 * softening pass — see MASTER.md §2). Reads the actual hex values straight
 * out of tokens.css, so a future edit to the ramp is checked against the
 * same floors the palette was tuned to, not against a copy of the numbers
 * that could silently drift out of sync with the CSS.
 *
 * Floors (per the user's brief): primary text targets ~11:1 (floor 10:1,
 * leaving room to tune without regressing to "harsh" 17:1 OR slipping
 * under a firmly-legible primary), secondary text >=6:1, muted text
 * >=4.5:1 (the WCAG AA body-text minimum — non-negotiable), and non-text
 * tokens (--ink-4, used for icons/hairlines only, never text — see
 * src/test/ink4-text-guard.test.ts) >=3:1, the WCAG AA non-text minimum.
 * Checked against both page backgrounds text actually sits on: --bg and
 * --surface.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tokensCss = readFileSync(join(here, 'tokens.css'), 'utf-8')

function tokenHex(name: string, scope: 'light' | 'dark'): string {
  const blockSelector = scope === 'light' ? ':root' : 'html\\.dark'
  const block = tokensCss.match(new RegExp(`${blockSelector}\\s*{([^}]*)}`, 's'))
  if (!block) throw new Error(`expected a "${scope}" token block`)
  const match = block[1].match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`expected token "${name}" in ${scope} block`)
  return match[1]
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
function contrast(hexA: string, hexB: string): number {
  const [lA, lB] = [relativeLuminance(hexToRgb(hexA)), relativeLuminance(hexToRgb(hexB))]
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA]
  return (lighter + 0.05) / (darker + 0.05)
}

const THEMES: Array<'light' | 'dark'> = ['light', 'dark']
const BACKGROUNDS = ['--bg', '--surface'] as const

describe('cool-slate palette: core text/background token pairs meet their contrast floors', () => {
  describe.each(THEMES)('%s theme', (theme) => {
    it.each(BACKGROUNDS)('--ink against %s is >= 10:1 (primary text, targets ~11:1)', (bgVar) => {
      const ink = tokenHex('--ink', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(ink, bg)).toBeGreaterThanOrEqual(10)
    })

    it.each(BACKGROUNDS)('--ink-2 against %s is >= 6:1 (secondary text)', (bgVar) => {
      const ink2 = tokenHex('--ink-2', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(ink2, bg)).toBeGreaterThanOrEqual(6)
    })

    it.each(BACKGROUNDS)('--ink-3 against %s is >= 4.5:1 (muted text/table headers)', (bgVar) => {
      const ink3 = tokenHex('--ink-3', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(ink3, bg)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(BACKGROUNDS)(
      '--ink-4 against %s is >= 3:1 (non-text floor; never used as text)',
      (bgVar) => {
        const ink4 = tokenHex('--ink-4', theme)
        const bg = tokenHex(bgVar, theme)
        expect(contrast(ink4, bg)).toBeGreaterThanOrEqual(3)
      }
    )

    it.each(BACKGROUNDS)(
      '--accent against %s is >= 4.5:1 (links, focus state, selected series)',
      (bgVar) => {
        const accent = tokenHex('--accent', theme)
        const bg = tokenHex(bgVar, theme)
        expect(contrast(accent, bg)).toBeGreaterThanOrEqual(4.5)
      }
    )

    it.each(BACKGROUNDS)('--pos against %s is >= 4.5:1 (positive money color)', (bgVar) => {
      const pos = tokenHex('--pos', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(pos, bg)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(BACKGROUNDS)('--neg against %s is >= 4.5:1 (negative money color)', (bgVar) => {
      const neg = tokenHex('--neg', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(neg, bg)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(BACKGROUNDS)('--warn against %s is >= 4.5:1', (bgVar) => {
      const warn = tokenHex('--warn', theme)
      const bg = tokenHex(bgVar, theme)
      expect(contrast(warn, bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('neither theme uses pure black or pure white for --ink', () => {
    expect(tokenHex('--ink', 'light').toLowerCase()).not.toBe('#000000')
    expect(tokenHex('--ink', 'dark').toLowerCase()).not.toBe('#ffffff')
  })
})
