/**
 * The v2 prompt asks the LLM for relationship charts — price vs count, spend
 * vs income — which is exactly the case where two series have different
 * magnitudes. On one shared axis the smaller series flattens onto the
 * baseline and reads as zero, so a second axis appears when the peaks differ
 * by 8x or more. It carries plain numbers: the chart's unit belongs to the
 * money series, and an order count printed as "₹18" is wrong.
 */
import { render, screen, within } from '@testing-library/react'

import type { InsightsChart } from '../lib/insightsResponseSchema'

import { InsightsChartCard } from './InsightsChartCard'

function chart(overrides: Partial<InsightsChart> = {}): InsightsChart {
  return {
    id: 'c1',
    title: 'Dining: average order vs order count',
    type: 'line',
    unit: 'INR',
    series: [
      {
        name: 'Average order',
        data: [
          { label: 'Apr', value: 432 },
          { label: 'May', value: 619 },
        ],
      },
      {
        name: 'Orders',
        data: [
          { label: 'Apr', value: 19 },
          { label: 'May', value: 16 },
        ],
      },
    ],
    ...overrides,
  }
}

describe('InsightsChartCard', () => {
  it('renders the takeaway above the chart', () => {
    render(
      <InsightsChartCard chart={chart({ takeaway: 'The lines cross in April.' })} isDark={false} />
    )
    expect(screen.getByText('The lines cross in April.')).toBeInTheDocument()
  })

  it('keeps every series legible in the fallback table', () => {
    render(<InsightsChartCard chart={chart()} isDark={false} />)
    const table = screen.getByRole('table')
    expect(table).toHaveTextContent('Average order')
    expect(table).toHaveTextContent('Orders')
    // The count series keeps its own magnitude rather than being flattened.
    expect(table).toHaveTextContent('19')
  })

  it('renders a single-series chart without a second axis', () => {
    const single = chart({ series: [chart().series[0]] })
    render(<InsightsChartCard chart={single} isDark={false} />)
    expect(screen.getByRole('table')).toHaveTextContent('Average order')
  })
})

describe('InsightsChartCard with repeated labels', () => {
  it('keeps both months when a window spans a year boundary', () => {
    render(
      <InsightsChartCard
        chart={chart({
          id: 'c2',
          title: 'Spend by month',
          series: [
            {
              name: 'Spend',
              data: [
                { label: 'Aug', value: 44900 },
                { label: 'Sep', value: 35900 },
                { label: 'Aug', value: 75000 },
              ],
            },
          ],
        })}
        isDark={false}
      />
    )

    // Matching on the bare label merged the two Augusts into one row and
    // silently dropped a point.
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4) // header + 3
    expect(table).toHaveTextContent('₹44.9k')
    expect(table).toHaveTextContent('₹75.0k')
  })
})
