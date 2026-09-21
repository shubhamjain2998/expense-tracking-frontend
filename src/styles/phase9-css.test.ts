/**
 * Phase 9 CSS regression tests.
 *
 * jsdom doesn't run a real layout/CSS engine, so `getComputedStyle` can't
 * verify rules from our stylesheets the way a browser would — these tests
 * instead assert against the stylesheet source directly. That's weaker
 * than a real browser check (this phase's structural fixes were verified
 * live against the running app — see docs/ledger-sweep-findings.md), but
 * it locks the specific numbers in place so a future edit can't silently
 * reintroduce the double-counted offset or drop the `.sr-only` rule.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const componentsCss = readFileSync(join(here, 'components.css'), 'utf-8')
const utilitiesCss = readFileSync(join(here, 'utilities.css'), 'utf-8')
const baseCss = readFileSync(join(here, 'base.css'), 'utf-8')

/** Strips comments so a rule search can't accidentally match one. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

const componentsCode = stripComments(componentsCss)
const baseCode = stripComments(baseCss)
const utilitiesCode = stripComments(utilitiesCss)

describe('sticky offsets are relative to their real scroll container (defect 3)', () => {
  it('.tbl.sticky th sticks flush to its container top, not var(--topbar-h) below it', () => {
    const match = componentsCode.match(/\.tbl\.sticky th\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/top:\s*0\s*;/)
    expect(body).not.toContain('--topbar-h')
  })

  it('.panel and .setnav no longer double-count the topbar height', () => {
    for (const selector of ['.panel', '.setnav']) {
      const match = componentsCode.match(new RegExp(`\\${selector} {([^}]*)}`))
      expect(match, `expected to find ${selector} rule`).not.toBeNull()
      const body = match![1]
      expect(body).toMatch(/top:\s*24px\s*;/)
      expect(body).not.toContain('--topbar-h')
    }
  })
})

describe('app shell scroll ownership (defect 1)', () => {
  it('.sidenav is position: fixed with its own internal scroll', () => {
    const match = componentsCode.match(/\.sidenav\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/position:\s*fixed\s*;/)
    expect(body).toMatch(/overflow-y:\s*auto\s*;/)
    expect(body).toMatch(/height:\s*100vh\s*;/)
  })

  it('.app no longer lays the sidenav out via grid (it is fixed/out of flow)', () => {
    const match = componentsCode.match(/\.app\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    expect(match![1]).not.toMatch(/display:\s*grid/)
  })

  it('html.app-shell-active hard-disables window scroll, scoped to the app shell', () => {
    expect(baseCode).toMatch(/html\.app-shell-active[^{]*{[^}]*overflow:\s*hidden/)
  })
})

describe('KPI baseline alignment and currency glyph spacing (defect 2)', () => {
  it('.money-row is a 3-row (sub)grid so labels/values/sub-lines share rows across columns', () => {
    const match = componentsCode.match(/\.money-row\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/display:\s*grid\s*;/)
    expect(body).toMatch(/grid-template-rows:\s*repeat\(3,\s*auto\)\s*;/)
  })

  it('.money is a subgrid item spanning all 3 rows', () => {
    const match = componentsCode.match(/\.money\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/grid-template-rows:\s*subgrid\s*;/)
    expect(body).toMatch(/grid-row:\s*span 3\s*;/)
  })

  it('currency letter-spacing was relaxed so the ₹ glyph no longer collides with the first digit', () => {
    const heroMatch = componentsCode.match(/\.hero-num\s*{([^}]*)}/)
    const moneyMatch = componentsCode.match(/\.money \.v\s*{([^}]*)}/)
    expect(heroMatch![1]).toMatch(/letter-spacing:\s*-0\.015em/)
    expect(moneyMatch![1]).toMatch(/letter-spacing:\s*-0\.01em/)
  })
})

describe('avatar legibility (defect 4)', () => {
  it('.people .avatar is rounded and has an explicit, contrast-safe text color', () => {
    const match = componentsCode.match(/\.people \.avatar\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/border-radius:\s*50%\s*;/)
    expect(body).toMatch(/color:\s*var\(--bg\)\s*;/)
  })

  it('dark theme overrides the avatar background so contrast holds when tokens flip', () => {
    expect(componentsCode).toMatch(
      /html\.dark \.people \.avatar\s*{[^}]*background:\s*var\(--ink-3\)/
    )
  })
})

describe('.sr-only exists and is unlayered (wins the cascade over any @layer rule)', () => {
  it('utilities.css (imported after tailwindcss, no @layer wrapper) defines .sr-only', () => {
    const match = utilitiesCode.match(/\.sr-only\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/position:\s*absolute\s*;/)
    expect(body).toMatch(/width:\s*1px\s*;/)
    expect(body).toMatch(/height:\s*1px\s*;/)
    expect(body).toMatch(/overflow:\s*hidden\s*;/)
    expect(body).toMatch(/white-space:\s*nowrap\s*;/)
  })
})

describe('--ink-4 stays off text (contrast) in the rules Phase 9 touched', () => {
  it.each(['.eyebrow', '.tbl th'])('%s does not use --ink-4 for its text color', (selector) => {
    const escaped = selector.replace('.', '\\.')
    const match = componentsCode.match(new RegExp(`${escaped}\\s*{([^}]*)}`))
    expect(match, `expected to find ${selector} rule`).not.toBeNull()
    expect(match![1]).not.toContain('--ink-4')
  })

  it('.seg button uses a passing-contrast color, not the marginal --ink-3', () => {
    const match = componentsCode.match(/\.seg button\s*{([^}]*)}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/color:\s*var\(--ink-2\)\s*;/)
  })
})
