/**
 * `.people .avatar` — the "Y A" split-transaction chips on Transactions
 * rows — against the 2026-09-21 follow-up's standard: >=20px with >=9px
 * text, and if the text can't pass 4.5:1 at that size the chips need to
 * grow or the initials need a solid backing.
 *
 * These were already fixed once, in Phase 9 (see docs/ledger-sweep-
 * findings.md — 22px, `border-radius: 50%`, an explicit solid
 * `background`/`color` pair per theme). This test locks in that they
 * still clear the *current* phase's stricter numeric floor (20px / 9px,
 * not just "some size") and that the solid-backing contrast Phase 9
 * computed still holds, computed directly from the actual token hex
 * values rather than re-typing the ratio as a comment that could drift.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const componentsCss = readFileSync(join(here, 'components.css'), 'utf-8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)
const tokensCss = readFileSync(join(here, 'tokens.css'), 'utf-8')

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*{([^}]*)}`))
  if (!match) throw new Error(`expected to find a "${selector}" rule`)
  return match[1]
}

function tokenHex(name: string, scope: 'light' | 'dark'): string {
  // Light tokens live under `:root {`, dark under `html.dark {`.
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

function pxValue(body: string, property: string): number {
  const match = body.match(new RegExp(`(?:^|\\s)${property}:\\s*(-?[\\d.]+)px`))
  if (!match) throw new Error(`expected "${property}" in: ${body}`)
  return Number(match[1])
}

describe('.people .avatar (split-transaction chips) meets the 20px / 9px / 4.5:1 standard', () => {
  const lightBody = ruleBody(componentsCss, '.people .avatar')
  const darkBody = ruleBody(componentsCss, 'html.dark .people .avatar')

  it('is at least 20px square with at least 9px text', () => {
    expect(pxValue(lightBody, 'width')).toBeGreaterThanOrEqual(20)
    expect(pxValue(lightBody, 'height')).toBeGreaterThanOrEqual(20)
    expect(pxValue(lightBody, 'font-size')).toBeGreaterThanOrEqual(9)
  })

  it('is round and has a solid (non-transparent) background pair per theme', () => {
    expect(lightBody).toMatch(/border-radius:\s*50%\s*;/)
    expect(lightBody).toMatch(/background:\s*var\(--ink-2\)\s*;/)
    expect(lightBody).toMatch(/color:\s*var\(--bg\)\s*;/)
    expect(darkBody).toMatch(/background:\s*var\(--ink-3\)\s*;/)
  })

  it('clears 4.5:1 in light mode (--ink-2 background, --bg text)', () => {
    const bg = tokenHex('--ink-2', 'light')
    const text = tokenHex('--bg', 'light')
    expect(contrast(bg, text)).toBeGreaterThanOrEqual(4.5)
  })

  it('clears 4.5:1 in dark mode (--ink-3 background, --bg text)', () => {
    const bg = tokenHex('--ink-3', 'dark')
    const text = tokenHex('--bg', 'dark')
    expect(contrast(bg, text)).toBeGreaterThanOrEqual(4.5)
  })
})
