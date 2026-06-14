/**
 * Shared output contracts for the dashboard redesign pure-function modules.
 *
 * The engine modules (`insights`, `recurring`, `habits`, `seasonality`) and the
 * UI components that render them all depend on THIS file only — never on each
 * other's internals. Keep this file types-only (no runtime logic) so it stays a
 * stable coordination anchor.
 *
 * See docs/superpowers/specs/2026-06-14-dashboard-redesign-design.md
 */
import type { SplitLedgerRow, SummaryRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

// ── Shared primitives ────────────────────────────────────────────────────────

export type Severity = 'critical' | 'warn' | 'info' | 'good'
export type VerdictStatus = 'on-track' | 'watch' | 'over'

/** A run of text; `em` fragments are rendered emphasised (bold/accent) by the UI.
 *  Using parts instead of string concatenation keeps drivers bold without
 *  splicing class fragments (see the prettier-className trap in project memory). */
export interface TextPart {
  t: string
  em?: boolean
}

// ── 1. Verdict + insights (lib/insights.ts) ─────────────────────────────────

export interface Verdict {
  status: VerdictStatus
  headline: TextPart[]
  sub: string
  /** ₹/day the user can still spend to land on budget (>=0). */
  allowancePerDay: number
  /** Positive = ahead of (over) pace, negative = under. */
  overPaceAmount: number
}

export interface Insight {
  id: string
  severity: Severity
  text: TextPart[]
  action?: { label: string; href: string }
}

export interface InsightsResult {
  verdict: Verdict
  insights: Insight[] // pre-sorted by severity (critical → good)
}

export interface InsightsInput {
  summaryRows: SummaryRow[]
  /** Fraction of the month elapsed, 0–1 (dayOfMonth / daysInMonth). */
  pace: number
  daysLeftInMonth: number
  totalDebit: number
  totalBudget: number
  totalIncome: number
  ledger: SplitLedgerRow[]
  recurring: RecurringResult
  seasonality: SeasonalityResult
  /** Trailing average savings rate (0–1) for the "savings drift" insight; null if unknown. */
  avgSavingsRate: number | null
  /** Route to the transactions/categories view for action links. */
  pendingHref: string
}

// ── 2. Recurring & subscriptions (lib/recurring.ts) ─────────────────────────

export type RecurringFlag = 'new' | 'due' | 'missing' | 'changed'
export type Cadence = 'monthly' | 'weekly' | 'irregular'

export interface RecurringCommitment {
  key: string
  name: string
  category: string
  /** Typical single charge (median). */
  medianAmount: number
  /** Average committed outflow per active month (total ÷ monthsSeen). This is
   *  the honest "what you commit monthly" figure — handles bundled charges
   *  (e.g. several SIPs in one month) and drifting amounts (rent hikes). */
  monthlyAmount: number
  monthsSeen: number
  cadence: Cadence
  lastCharged: string // ISO yyyy-mm-dd
  nextExpected: string // ISO yyyy-mm-dd
  flags: RecurringFlag[]
}

export interface RecurringResult {
  commitments: RecurringCommitment[] // sorted by medianAmount desc
  lockedInPerMonth: number
  pctOfAvgMonth: number // 0–1
}

// ── 3. Habits (lib/habits.ts) ───────────────────────────────────────────────

export interface Habit {
  key: string
  label: string
  total: number
  txnCount: number
  perMonth: number
  /** Monthly totals oldest→newest for a sparkline. */
  trend: number[]
}

export interface HabitsResult {
  habits: Habit[] // sorted by total desc
  /** The largest cross-category habit, surfaced as the hero callout. */
  topHabit: { label: string; perMonth: number; categories: string[] } | null
  monthsCovered: number
}

// ── 4. Seasonality & forecast (lib/seasonality.ts) ──────────────────────────

export interface SeasonMonth {
  year: number
  month: number // 1–12 calendar
  label: string // e.g. "Apr"
  expense: number
}

export interface SeasonalityResult {
  months: SeasonMonth[] // chronological
  mean: number
  peak: SeasonMonth | null
  calmest: SeasonMonth | null
  /** % change of the in-progress month vs the previous month; null if unknown. */
  currentVsLastMonthPct: number | null
  /** % change vs the same calendar month a year earlier; null if unavailable. */
  currentVsSameMonthLastYearPct: number | null
  dayOfWeek: { label: string; total: number }[] // Mon..Sun
  heaviestDays: string[]
  projectedThisMonth: number
  projectedFY: number
}

// Re-export the transaction type the engines consume, for convenience.
export type { ProcessedTransactionItem }
