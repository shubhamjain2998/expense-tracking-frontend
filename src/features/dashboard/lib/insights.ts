/**
 * Verdict + needs-attention insight engine (pure functions).
 *
 * Consumes the shared contracts in ./contracts and produces a Verdict plus a
 * severity-sorted list of Insights. No I/O, no throwing — every branch is
 * defensive against empty/zero input.
 *
 * See docs/superpowers/specs/2026-06-14-dashboard-redesign-design.md §3.1
 */
import type {
  Insight,
  InsightsInput,
  InsightsResult,
  Severity,
  TextPart,
  Verdict,
  VerdictStatus,
} from './contracts'

// ── Local formatting helpers ────────────────────────────────────────────────

/** Compact ₹ formatting: ₹7.6k, ₹1.2L, ₹540. Handles negatives + zero. */
function formatRupeeCompact(value: number): string {
  if (!Number.isFinite(value)) return '₹0'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`
  return `${sign}₹${Math.round(abs)}`
}

/** One decimal, but drop a trailing .0 (7.0 → "7", 7.6 → "7.6"). */
function trim(n: number): string {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** Whole-number percent string from a fraction (0.293 → "29"). */
function pctFromFraction(fraction: number): string {
  return String(Math.round(fraction * 100))
}

/** Whole-number percent string from a ratio (1.23 → "123"). */
function pctFromRatio(ratio: number): string {
  return String(Math.round(ratio * 100))
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
  good: 3,
}

// ── Verdict ─────────────────────────────────────────────────────────────────

interface Driver {
  category: string
  overage: number
}

/** The single category most over its pace-adjusted allocation (positive only). */
function findDriver(input: InsightsInput): Driver | null {
  let best: Driver | null = null
  for (const row of input.summaryRows) {
    const allocated = row.allocated_monthly || 0
    if (allocated <= 0) continue
    const overage = row.actual - allocated * input.pace
    if (overage > 0 && (best === null || overage > best.overage)) {
      best = { category: row.category, overage }
    }
  }
  return best
}

function buildVerdict(input: InsightsInput): Verdict {
  const { totalDebit, totalBudget, totalIncome, pace, daysLeftInMonth } = input

  const overPaceAmount = totalDebit - totalBudget * pace
  const allowancePerDay =
    daysLeftInMonth > 0 ? Math.max(0, (totalBudget - totalDebit) / daysLeftInMonth) : 0

  // Build the "sub" line — readable summary from the numbers we have.
  const subParts: string[] = []
  subParts.push(`${pctFromFraction(pace)}% through the month`)
  subParts.push(
    `${formatRupeeCompact(totalDebit)} spent of ${formatRupeeCompact(totalBudget)} budget`
  )
  if (totalIncome > 0) {
    const savingsRate = (totalIncome - totalDebit) / totalIncome
    subParts.push(`${pctFromFraction(savingsRate)}% of income saved`)
  }
  const sub = subParts.join(' · ')

  if (totalBudget <= 0) {
    return {
      status: 'on-track',
      headline: [
        { t: 'No budget set yet — ' },
        { t: 'add allocations', em: true },
        { t: ' to track pace.' },
      ],
      sub,
      allowancePerDay,
      overPaceAmount,
    }
  }

  let status: VerdictStatus
  if (overPaceAmount > 0.05 * totalBudget) status = 'over'
  else if (overPaceAmount > 0) status = 'watch'
  else status = 'on-track'

  const driver = findDriver(input)
  let headline: TextPart[]

  if (overPaceAmount > 0) {
    if (driver) {
      headline = [
        { t: "You're " },
        { t: `${formatRupeeCompact(overPaceAmount)} over pace`, em: true },
        { t: ', driven by ' },
        { t: driver.category, em: true },
        { t: '. Spend ' },
        { t: `${formatRupeeCompact(allowancePerDay)}/day`, em: true },
        { t: ' to land on budget.' },
      ]
    } else {
      headline = [
        { t: "You're " },
        { t: `${formatRupeeCompact(overPaceAmount)} over pace`, em: true },
        { t: '. Spend ' },
        { t: `${formatRupeeCompact(allowancePerDay)}/day`, em: true },
        { t: ' to land on budget.' },
      ]
    }
  } else {
    headline = [
      { t: "You're " },
      { t: `${formatRupeeCompact(Math.abs(overPaceAmount))} under pace`, em: true },
      { t: '. You can spend ' },
      { t: `${formatRupeeCompact(allowancePerDay)}/day`, em: true },
      { t: ' and still land on budget.' },
    ]
  }

  return { status, headline, sub, allowancePerDay, overPaceAmount }
}

// ── Insights ────────────────────────────────────────────────────────────────

function buildInsights(input: InsightsInput): Insight[] {
  const insights: Insight[] = []
  const { pace, totalDebit, totalIncome, pendingHref } = input

  // budget-blowout: rank over-allocation categories, emit top 2 worst by ratio.
  const blowouts = input.summaryRows
    .filter((r) => (r.allocated_monthly || 0) > 0)
    .map((r) => {
      const ratio = r.actual / r.allocated_monthly
      const overPace = r.actual > r.allocated_monthly * pace
      return { row: r, ratio, overPace }
    })
    .filter((b) => b.ratio > 1 || b.overPace)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2)

  for (const b of blowouts) {
    const severity: Severity = b.ratio > 1 ? 'critical' : 'warn'
    insights.push({
      id: `budget-blowout-${b.row.category}`,
      severity,
      text: [
        { t: b.row.category, em: true },
        { t: ' is at ' },
        { t: `${pctFromRatio(b.ratio)}% of budget`, em: true },
        { t: '.' },
      ],
      action: { label: 'Review', href: pendingHref },
    })
  }

  // big-share: any single category >= 30% of total debit.
  if (totalDebit > 0) {
    let biggest: { category: string; share: number } | null = null
    for (const row of input.summaryRows) {
      const share = row.actual / totalDebit
      if (share >= 0.3 && (biggest === null || share > biggest.share)) {
        biggest = { category: row.category, share }
      }
    }
    if (biggest) {
      insights.push({
        id: `big-share-${biggest.category}`,
        severity: 'info',
        text: [
          { t: biggest.category, em: true },
          { t: ' is ' },
          { t: `${pctFromFraction(biggest.share)}% of spend`, em: true },
          { t: ' this month.' },
        ],
      })
    }
  }

  // recurring-due / recurring-missing.
  const commitments = input.recurring?.commitments ?? []
  for (const c of commitments) {
    if (c.flags?.includes('due')) {
      insights.push({
        id: `recurring-due-${c.key}`,
        severity: 'warn',
        text: [{ t: c.name, em: true }, { t: ' auto-debits soon.' }],
        action: { label: 'View', href: pendingHref },
      })
    }
    if (c.flags?.includes('missing')) {
      insights.push({
        id: `recurring-missing-${c.key}`,
        severity: 'info',
        text: [{ t: c.name, em: true }, { t: " hasn't been charged this month." }],
      })
    }
  }

  // seasonality.
  const seasonality = input.seasonality
  if (seasonality) {
    const vsLast = seasonality.currentVsLastMonthPct
    if (vsLast != null && vsLast < -0.1) {
      insights.push({
        id: 'seasonality-down',
        severity: 'good',
        text: [
          { t: 'Spend is ' },
          { t: `down ${pctFromFraction(Math.abs(vsLast))}%`, em: true },
          { t: ' vs last month.' },
        ],
      })
    }
    if (seasonality.peak) {
      insights.push({
        id: 'seasonality-peak',
        severity: 'info',
        text: [
          { t: seasonality.peak.label, em: true },
          { t: ' is historically your biggest month.' },
        ],
      })
    }
  }

  // savings: rate above trailing average.
  if (totalIncome > 0 && input.avgSavingsRate != null) {
    const rate = (totalIncome - totalDebit) / totalIncome
    if (rate > input.avgSavingsRate) {
      insights.push({
        id: 'savings-above-avg',
        severity: 'good',
        text: [
          { t: 'Savings rate ' },
          { t: `${pctFromFraction(rate)}%`, em: true },
          { t: ' — above your average.' },
        ],
      })
    }
  }

  // split-owed: sum of unsettled ledger rows.
  const ledger = input.ledger ?? []
  let owedTotal = 0
  const owers: string[] = []
  for (const row of ledger) {
    const amt = Number(row.total_split_amount)
    if (Number.isFinite(amt) && amt > 0) {
      owedTotal += amt
      owers.push(row.person_name)
    }
  }
  if (owedTotal > 0) {
    const who =
      owers.length === 1
        ? [{ t: owers[0], em: true } as TextPart]
        : [{ t: `${owers.length} people`, em: true } as TextPart]
    insights.push({
      id: 'split-owed',
      severity: 'info',
      text: [
        ...who,
        { t: ' owe you ' },
        { t: formatRupeeCompact(owedTotal), em: true },
        { t: '.' },
      ],
    })
  }

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  return insights
}

// ── Public API ──────────────────────────────────────────────────────────────

export function computeInsights(input: InsightsInput): InsightsResult {
  return {
    verdict: buildVerdict(input),
    insights: buildInsights(input),
  }
}
