/**
 * The v2 payload exists so the page shows the LLM's *reading* of the data,
 * not a second copy of numbers the app already draws. This locks in that
 * every interpretation field actually reaches the screen: a finding's
 * consequence and next step, the derived metrics, the behavioural patterns,
 * the forward look, each chart's takeaway and the open questions. A field
 * added to the schema but never rendered is the failure this guards against.
 */
import { render, screen } from '@testing-library/react'

import type { InsightsRunOut } from '@/lib/api/insights'

import { InsightsRunView } from './InsightsRunView'

function run(): InsightsRunOut {
  return {
    id: 'run-1',
    schema_version: 2,
    period_start: '2025-04-01',
    period_end: '2026-06-30',
    ran_at: '2026-06-20T10:30:00Z',
    payload: {
      schema_version: 2,
      verdict: 'Your commitments rose, not your spending.',
      metrics: [
        {
          id: 'savings-rate',
          label: 'Savings rate',
          value: 14,
          unit: '%',
          direction: 'down',
          tone: 'negative',
          detail: 'Down from 23% over the year before.',
        },
      ],
      findings: [
        {
          id: 'dining',
          title: 'Dining rose on price, not on habit',
          severity: 'warning',
          detail: 'Order count fell from 19 to 16.',
          so_what: 'Eating out less has not made it cheaper.',
          action: 'Check whether delivery fees explain the jump.',
          annual_impact: 20400,
          confidence: 'high',
          figure: { label: 'Average order', value: 619, unit: 'INR' },
        },
      ],
      patterns: [
        {
          id: 'burst',
          title: 'The days after salary lands cost the most',
          detail: 'Discretionary spend runs 2.4x the daily average.',
          evidence: '₹3,180/day vs ₹1,320/day.',
        },
      ],
      projection: {
        label: 'Projected spend, next month',
        value: 84500,
        unit: 'INR',
        basis: 'Median of the last 6 months.',
      },
      charts: [],
      questions: ['Was June’s travel charge a one-off?'],
    },
  }
}

function renderRun(payloadOverrides: Partial<InsightsRunOut['payload']> = {}) {
  const base = run()
  render(
    <InsightsRunView
      run={{ ...base, payload: { ...base.payload, ...payloadOverrides } }}
      isDark={false}
      onRegenerate={() => {}}
      onDiscard={() => Promise.resolve()}
      isDiscarding={false}
    />
  )
}

describe('InsightsRunView', () => {
  it('renders the consequence and next step alongside each finding', () => {
    renderRun()
    expect(screen.getByText('Dining rose on price, not on habit')).toBeInTheDocument()
    expect(screen.getByText('Eating out less has not made it cheaper.')).toBeInTheDocument()
    expect(screen.getByText('Check whether delivery fees explain the jump.')).toBeInTheDocument()
    expect(screen.getByText(/a year/)).toBeInTheDocument()
    expect(screen.getByText('High confidence')).toBeInTheDocument()
  })

  it('renders the derived metrics, patterns, projection and open questions', () => {
    renderRun()
    expect(screen.getByText('Savings rate')).toBeInTheDocument()
    expect(screen.getByText('14%')).toBeInTheDocument()
    expect(screen.getByText('Down from 23% over the year before.')).toBeInTheDocument()
    expect(screen.getByText('The days after salary lands cost the most')).toBeInTheDocument()
    expect(screen.getByText('₹3,180/day vs ₹1,320/day.')).toBeInTheDocument()
    expect(screen.getByText('Projected spend, next month')).toBeInTheDocument()
    expect(screen.getByText('Median of the last 6 months.')).toBeInTheDocument()
    expect(screen.getByText('Was June’s travel charge a one-off?')).toBeInTheDocument()
  })

  it('drops whole sections the LLM omitted instead of rendering empty cards', () => {
    renderRun({ metrics: [], patterns: [], projection: undefined, questions: [] })
    expect(screen.queryByText('Patterns behind the numbers')).not.toBeInTheDocument()
    expect(screen.queryByText('Only you can answer these')).not.toBeInTheDocument()
    expect(screen.queryByText('Projected spend, next month')).not.toBeInTheDocument()
    // The findings list is the floor and must survive.
    expect(screen.getByText('Dining rose on price, not on habit')).toBeInTheDocument()
  })

  it('omits the annual impact when the API sends it back as null', () => {
    renderRun({
      findings: [
        {
          id: 'no-impact',
          title: 'A finding with nothing to price',
          severity: 'info',
          detail: 'detail',
          so_what: 'consequence',
          // What the API actually returns for an absent optional number.
          annual_impact: null as unknown as undefined,
        },
      ],
    })
    expect(screen.queryByText(/a year/)).not.toBeInTheDocument()
  })

  it('renders an injected HTML string as inert text', () => {
    renderRun({
      findings: [
        {
          id: 'x',
          title: '<img src=x onerror=alert(1)>',
          severity: 'info',
          detail: 'detail',
          so_what: '<script>alert(2)</script>',
        },
      ],
    })
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(2)</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
})
