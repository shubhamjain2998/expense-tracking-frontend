/**
 * Hit-area regression test for the six controls flagged in the 2026-09-21
 * follow-up sweep (docs/ledger-sweep-findings.md, Phase 9 section) as
 * measuring under 24px, plus the two extra sites found sweeping for more.
 *
 * Like phase9-css.test.ts, jsdom doesn't run a real layout engine, so this
 * can't render the app and read `getBoundingClientRect()` — that
 * measurement (before AND after, at 1440px and 412px, plus real click
 * dispatch proving the padded/overlaid zone still activates the control)
 * was done live in Chrome and is what the numbers below are taken from.
 * What this test locks in is the CSS math: for each control's *documented,
 * live-measured* original box, applying its hit-area class's padding/inset
 * must clear 44px on every axis that was under 44 — and the technique
 * used must be the one that actually works for that element (padding is a
 * no-op on a native `appearance: auto` checkbox and `margin` is a no-op on
 * a `display: table-cell` box; both were verified live before landing on
 * `.hit44-after` for those two cases instead of `.hit44-pad`).
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

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, '\\$&')
  const match = componentsCss.match(new RegExp(`${escaped}\\s*{([^}]*)}`))
  if (!match) throw new Error(`expected to find a "${selector}" rule in components.css`)
  return match[1]
}

/**
 * Pulls a declaration's px number out of a rule body, in whatever form it's
 * written: `property: Npx`, `property: var(--x, Npx)`, or
 * `property: calc(-1 * var(--x, Npx))` (this file's negative-margin idiom).
 */
function pxValue(body: string, property: string): number {
  const escaped = property.replace(/[-.]/g, '\\$&')
  const match = body.match(new RegExp(`(?<![\\w-])${escaped}:\\s*([^;]+);`))
  if (!match) throw new Error(`expected "${property}" in: ${body}`)
  const declaration = match[1]
  const negated = /calc\(\s*-1\s*\*/.test(declaration)
  const numMatch = declaration.match(/(-?[\d.]+)px/)
  if (!numMatch) throw new Error(`expected a px number in "${property}: ${declaration}"`)
  const value = Number(numMatch[1])
  return negated ? -Math.abs(value) : value
}

const MIN_HIT = 44

describe('hit-area classes clear 44px for every control they were written for', () => {
  it('row checkboxes (13x13) — .hit44-pad on the checkbox reaches 44x44', () => {
    const body = ruleBody('.hit44-pad')
    const pad = pxValue(body, 'padding')
    expect(13 + 2 * pad).toBeGreaterThanOrEqual(MIN_HIT)
    // margin must exactly cancel the padding, or the checkbox itself shifts
    expect(pxValue(body, 'margin')).toBeCloseTo(-pad, 5)
  })

  it('the "?" keyboard-shortcuts button (18x18) — default .hit44-after inset reaches 44x44', () => {
    const body = ruleBody('.hit44-after::after')
    const inset = pxValue(body, 'inset')
    expect(18 + 2 * Math.abs(inset)).toBeGreaterThanOrEqual(MIN_HIT)
  })

  it('"Show N deleted" (84x18) — .hit44-pad-v + .deleted-toggle reaches height 44, width already clear', () => {
    const modifier = pxValue(ruleBody('.deleted-toggle'), '--hit44-pad-v')
    expect(18 + 2 * modifier).toBeGreaterThanOrEqual(MIN_HIT)
    expect(84).toBeGreaterThanOrEqual(MIN_HIT) // width needs no growth
  })

  it('in-paragraph "Insights" links (46x15, IncomeSection) — .inline-insights-link reaches height 44', () => {
    const body = ruleBody('.inline-insights-link::after')
    // asymmetric: "-14.5px 0" -> vertical inset -14.5, horizontal 0
    const insetDecl = body.match(/inset:\s*(-?[\d.]+)px\s+(-?[\d.]+)(?:px)?/)
    if (!insetDecl) throw new Error(`expected a two-value inset in: ${body}`)
    const vertical = Number(insetDecl[1])
    const horizontal = Number(insetDecl[2])
    expect(15 + 2 * Math.abs(vertical)).toBeGreaterThanOrEqual(MIN_HIT)
    expect(horizontal).toBe(0) // deliberately no horizontal growth — 46 already clears 44
    expect(46).toBeGreaterThanOrEqual(MIN_HIT)
  })

  it('Budget inline edit buttons (60x20 and 69x20) — .hit44-pad-v + .budget-edit-trigger reaches height 44', () => {
    const modifier = pxValue(ruleBody('.budget-edit-trigger'), '--hit44-pad-v')
    expect(20 + 2 * modifier).toBeGreaterThanOrEqual(MIN_HIT)
    expect(60).toBeGreaterThanOrEqual(MIN_HIT)
    expect(69).toBeGreaterThanOrEqual(MIN_HIT)
  })

  it('row/header checkbox cell (<td>/<th>, 36 wide) — .hit44-after + .txn-check-cell reaches width 44', () => {
    // Padding is a no-op on a native checkbox (appearance: auto ignores
    // author padding — verified live) and margin is a no-op on a
    // table-cell box, so the fix targets the <td>/<th> that owns the
    // click, not the <input> itself. TransactionRow's row height (49) and
    // the header row's height (32.77, topped up by the same inset) were
    // both already >=44 or get there from the same rule.
    const modifier = pxValue(ruleBody('.txn-check-cell'), '--hit44-inset')
    expect(36 + 2 * modifier).toBeGreaterThanOrEqual(MIN_HIT)
    const rowHeight = 49
    const headerRowHeight = 32.77
    expect(rowHeight + 2 * modifier).toBeGreaterThanOrEqual(MIN_HIT)
    expect(headerRowHeight + 2 * modifier).toBeGreaterThanOrEqual(MIN_HIT)
  })

  it('the header select-all checkbox uses a <label> wrap, since it has no ancestor click handler to delegate to', () => {
    // TransactionsTableHead.tsx wraps the checkbox in a <label
    // className="hit44-pad">: a label's own box respects padding (unlike
    // the checkbox itself) and a click anywhere in it natively forwards
    // to the associated control — verified live via a dispatched click
    // outside the visible 13x13 glyph, which toggled the checkbox.
    const body = ruleBody('.hit44-pad')
    const pad = pxValue(body, 'padding')
    expect(13 + 2 * pad).toBeGreaterThanOrEqual(MIN_HIT)
  })
})

describe('every visual box stays exactly its original size (padding is always paired with an equal negative margin)', () => {
  it.each(['.hit44-pad', '.hit44-pad-v'])(
    '%s cancels its own padding with an equal negative margin',
    (sel) => {
      const body = ruleBody(sel)
      if (sel === '.hit44-pad') {
        expect(pxValue(body, 'margin')).toBeCloseTo(-pxValue(body, 'padding'), 5)
      } else {
        expect(pxValue(body, 'margin-top')).toBeCloseTo(-pxValue(body, 'padding-top'), 5)
        expect(pxValue(body, 'margin-bottom')).toBeCloseTo(-pxValue(body, 'padding-bottom'), 5)
      }
    }
  )

  it.each(['.hit44-after', '.inline-insights-link'])(
    '%s only adds an absolutely-positioned ::after overlay (out of flow, touches no visible box)',
    (sel) => {
      const body = ruleBody(sel)
      expect(body).toMatch(/position:\s*relative\s*;/)
      const afterBody = ruleBody(`${sel}::after`)
      expect(afterBody).toMatch(/position:\s*absolute\s*;/)
      expect(afterBody).toMatch(/content:\s*['"]{2}\s*;/)
    }
  )
})

describe('each control is wired to its hit-area class', () => {
  const src = join(here, '..')
  function fileContains(relPath: string, needle: string) {
    const content = readFileSync(join(src, relPath), 'utf-8')
    expect(content).toContain(needle)
  }

  it('TransactionRow / TransactionsTableHead checkboxes', () => {
    fileContains(
      'features/transactions/components/TransactionRow.tsx',
      'hit44-after txn-check-cell'
    )
    fileContains(
      'features/transactions/components/TransactionsTableHead.tsx',
      'className="hit44-pad"'
    )
  })
  it('FilterBar "?" shortcuts button', () => {
    fileContains('features/transactions/components/FilterBar.tsx', 'hit44-after')
  })
  it('TransactionsList "Show N deleted" toggle', () => {
    fileContains(
      'features/transactions/components/TransactionsList.tsx',
      'hit44-pad-v deleted-toggle'
    )
  })
  it('IncomeSection in-paragraph Insights link', () => {
    fileContains('features/budget/components/IncomeSection.tsx', 'inline-insights-link')
  })
  it('BudgetCategoryRow inline edit trigger', () => {
    fileContains(
      'features/budget/components/BudgetCategoryRow.tsx',
      'hit44-pad-v budget-edit-trigger'
    )
  })
  it('sweep extras: Settings chip-delete buttons and Insights "Include settled"', () => {
    fileContains('features/settings/components/TagsSection.tsx', 'hit44-pad')
    fileContains('features/settings/components/IgnoreRulesSection.tsx', 'hit44-pad')
    fileContains('features/insights/components/PeopleSection.tsx', 'hit44-pad-v')
  })
})
