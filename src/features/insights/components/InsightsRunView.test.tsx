/**
 * Two things are under test, and they pull against each other.
 *
 * Every interpretation field the LLM sends must be *reachable* — a field
 * added to the schema but never rendered is a silent loss. But an LLM writes
 * paragraphs, and eight stacked is a page nobody finishes, so only headlines
 * and numbers are visible until asked for. These tests assert both: the
 * headline is on screen, and the prose is one interaction away rather than
 * gone.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
          comparison: { label: 'Average order', from: 432, to: 619, unit: 'INR' },
        },
        {
          id: 'housing',
          title: 'Housing stepped up and stayed there',
          severity: 'warning',
          detail: 'Rent moved from 19,400 to 29,200 a month in February.',
          so_what: 'That is new permanent outflow, not a spike.',
          annual_impact: 117600,
          confidence: 'high',
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
  it('renders the consequence and next step inside the open finding', () => {
    renderRun()
    const open = screen.getByRole('region', { name: 'Dining rose on price, not on habit' })
    expect(within(open).getByText('Eating out less has not made it cheaper.')).toBeInTheDocument()
    expect(
      within(open).getByText('Check whether delivery fees explain the jump.')
    ).toBeInTheDocument()
    expect(within(open).getByText('High confidence')).toBeInTheDocument()
  })

  it('leads with numbers and headlines, not paragraphs', () => {
    renderRun()
    expect(screen.getByText('Savings rate')).toBeInTheDocument()
    expect(screen.getByText('14%')).toBeInTheDocument()
    expect(screen.getByText('Projected spend, next month')).toBeInTheDocument()
    expect(screen.getByText('The days after salary lands cost the most')).toBeInTheDocument()
    expect(screen.getByText('Was June’s travel charge a one-off?')).toBeInTheDocument()

    // The prose behind each of those is not on screen yet.
    expect(screen.queryByText('Discretionary spend runs 2.4x the daily average.')).toBeNull()
    expect(screen.queryByText('Median of the last 6 months.')).toBeNull()
  })

  it('opens a pattern’s detail and evidence on demand', async () => {
    const user = userEvent.setup()
    renderRun()

    await user.click(screen.getByRole('button', { name: /days after salary lands/i }))
    expect(screen.getByText('Discretionary spend runs 2.4x the daily average.')).toBeInTheDocument()
    expect(screen.getByText('₹3,180/day vs ₹1,320/day.')).toBeInTheDocument()
  })

  it('opens the projection’s assumptions on demand', async () => {
    const user = userEvent.setup()
    renderRun()

    await user.click(screen.getByRole('button', { name: 'What this assumes' }))
    expect(screen.getByText('Median of the last 6 months.')).toBeInTheDocument()
  })

  it('shows the first finding open and the rest collapsed', () => {
    renderRun()
    // Ranked first by the LLM, so it is the one already open.
    expect(screen.getByText('Eating out less has not made it cheaper.')).toBeInTheDocument()
    expect(screen.queryByText('That is new permanent outflow, not a spike.')).toBeNull()
  })

  it('ranks findings by what each is worth per year and opens the one picked', async () => {
    const user = userEvent.setup()
    renderRun()

    // Housing is worth more per year, so it leads the stake bars even though
    // the LLM ranked dining first.
    const bars = screen.getAllByRole('button', { name: /a year$/ })
    expect(bars[0]).toHaveAccessibleName(/Housing stepped up/)

    await user.click(bars[0])
    expect(screen.getByText('That is new permanent outflow, not a spike.')).toBeInTheDocument()
  })

  it('draws the before/after pair instead of leaving it in the sentence', () => {
    renderRun()
    // 432 → 619 is +43%, computed by the app, not quoted from the prose.
    expect(screen.getByText('+43%')).toBeInTheDocument()
    const pair = screen.getByLabelText('Average order')
    expect(within(pair).getByText('₹432')).toBeInTheDocument()
    expect(within(pair).getByText('₹619')).toBeInTheDocument()
  })

  it('drops whole sections the LLM omitted instead of rendering empty cards', () => {
    renderRun({ metrics: [], patterns: [], projection: undefined, questions: [] })
    expect(screen.queryByText('Patterns behind the numbers')).not.toBeInTheDocument()
    expect(screen.queryByText('Only you can answer these')).not.toBeInTheDocument()
    expect(screen.queryByText('Projected spend, next month')).not.toBeInTheDocument()
    // The findings list is the floor and must survive.
    expect(
      screen.getAllByRole('button', { name: /Dining rose on price, not on habit/ }).length
    ).toBeGreaterThan(0)
  })

  it('omits the stake bars when only one finding carries a yearly figure', () => {
    const base = run().payload.findings[0]
    renderRun({ findings: [base] })
    expect(screen.queryByText("What's at stake, per year")).not.toBeInTheDocument()
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
