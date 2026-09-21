/**
 * Phase 9 regression test: the chart's screen-reader fallback table
 * (MASTER.md §6) used to carry `.sr-only` directly, which doesn't
 * visually hide a `<table>` — CSS 2.1's auto table-layout algorithm treats
 * a specified `width` as a minimum, not a cap, so `width: 1px` was a
 * no-op (measured ~172x174px live, overlapping real content). `.sr-only`
 * now sits on a wrapping `<div>` instead, which has none of a table's
 * sizing quirks. This locks in the DOM shape; the visual 1x1 clip itself
 * was verified live (jsdom doesn't run real layout) — see
 * docs/ledger-sweep-findings.md.
 */
import { render, screen } from '@testing-library/react'

import { TrendBlock } from './TrendBlock'

describe('TrendBlock sr-only fallback table', () => {
  it('wraps the table in a .sr-only div rather than classing the table itself', () => {
    render(
      <TrendBlock
        incomeTrendData={[
          { key: '2026-01', month: 'Jan', income: 1000, expense: 500, savings: 500 },
        ]}
        trendWindow={6}
        onTrendWindowChange={() => {}}
        isLoading={false}
        isDark={false}
      />
    )

    const table = screen.getByRole('table', { name: 'Monthly money in and out' })
    expect(table).not.toHaveClass('sr-only')
    expect(table.parentElement).toHaveClass('sr-only')
    expect(table.parentElement?.tagName).toBe('DIV')
  })
})
