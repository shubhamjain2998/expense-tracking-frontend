/**
 * The v2 prompt asks the LLM for relationship charts — price vs count, spend
 * vs income — which is exactly the case where two series have different
 * magnitudes. On one shared axis the smaller series flattens onto the
 * baseline and reads as zero, so a second axis appears when the peaks differ
 * by 8x or more. It carries plain numbers: the chart's unit belongs to the
 * money series, and an order count printed as "₹18" is wrong.
 */
import { render, screen } from '@testing-library/react'

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
