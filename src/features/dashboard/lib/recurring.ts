/**
 * Recurring & subscriptions detection (pure).
 *
 * Groups trailing-window expense transactions into recurring commitments,
 * computes cadence/flags, and the "locked in per month" header stat.
 *
 * See docs/superpowers/specs/2026-06-14-dashboard-redesign-design.md §3.2.
 * The description normalization here is LOAD-BEARING: the same commitment
 * appears under varied descriptions in the real data ("Rent" vs "Rent
 * payment" vs "RENT - APR") and MUST collapse to a single commitment.
 */
import type {
  Cadence,
  ProcessedTransactionItem,
  RecurringCommitment,
  RecurringFlag,
  RecurringResult,
} from './contracts'

// ── Tunable constants ────────────────────────────────────────────────────────

const MIN_MONTHS = 6
const STABILITY_PCT = 0.15 // ±15% of median
const STABILITY_FRACTION = 0.6 // ≥60% of charges within ±15%
const NEW_WINDOW_DAYS = 60
const DUE_WINDOW_DAYS = 3
const CHANGED_PCT = 0.25 // last month's total must move >25% to flag "changed"

/**
 * Recurring tag names → canonical grouping key. When a transaction carries one
 * of these tags we group by the tag rather than the (often-varied) description,
 * which is what makes drift-prone commitments like rent/SIP merge cleanly.
 */
const RECURRING_TAG_KEYS: Record<string, string> = {
  rent: 'rent',
  sip: 'sip',
  insurance: 'insurance premium',
  'insurance premium': 'insurance premium',
  premium: 'insurance premium',
  'mobile recharge': 'mobile recharge',
  recharge: 'mobile recharge',
  ott: 'ott',
  subscription: 'subscription',
  emi: 'emi',
  loan: 'emi',
}

// Common noise suffixes/words stripped from descriptions before grouping.
const STRIP_SUFFIX_WORDS = [
  'payment',
  'pmt',
  'autopay',
  'auto',
  'debit',
  'transfer',
  'txn',
  'transaction',
  'online',
  'upi',
  'neft',
  'imps',
  'ach',
  'bill',
  'billpay',
  'monthly',
]

// ── Small local helpers ──────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Year-month key, e.g. "2026-03", from an ISO/parseable date string. */
export function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

/**
 * Normalize a free-text description into a stable grouping key.
 * - lowercase + trim
 * - remove reference codes / long digit runs (4+ digits, with optional #/no.)
 * - drop standalone short month tokens (apr, may, …) and 4-digit years
 * - strip common noise suffix words (payment, autopay, upi, …)
 * - collapse whitespace
 */
export function normalizeDescription(raw: string): string {
  let s = (raw || '').toLowerCase().trim()

  // Strip reference markers like "ref:", "txn id", "no.", "#".
  s = s.replace(/\b(ref(erence)?|txn(\s*id)?|no|number|acct?|account)\b[:#.\s-]*/g, ' ')

  // Remove long digit runs (reference codes / account-ish numbers) and any
  // hex-like alphanumeric ref blobs of length >= 5.
  s = s.replace(/\b\d{4,}\b/g, ' ')
  s = s.replace(/\b[a-z0-9]*\d[a-z0-9]*\b/g, (tok) => (tok.length >= 5 ? ' ' : tok))

  // Drop month abbreviations and 4-digit-ish year noise tokens.
  const MONTHS = new Set([
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'sept',
    'oct',
    'nov',
    'dec',
  ])
  // Tokenize on non-alphanumerics, drop noise tokens, rejoin.
  const tokens = s
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((tok) => !MONTHS.has(tok))
    .filter((tok) => !STRIP_SUFFIX_WORDS.includes(tok))
    .filter((tok) => !/^\d+$/.test(tok))

  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

/** Title-case a grouping key for display. */
function titleCase(key: string): string {
  return key
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Pick the most frequent value (ties → first seen). */
function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  let best = values[0] ?? ''
  let bestCount = 0
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1
    counts.set(v, c)
    if (c > bestCount) {
      bestCount = c
      best = v
    }
  }
  return best
}

/**
 * Resolve the grouping key for a transaction: prefer a recognised recurring tag
 * (so drift-prone descriptions still merge), else the normalized description.
 */
function groupingKey(t: ProcessedTransactionItem): string {
  for (const tag of t.tags ?? []) {
    const tagKey = RECURRING_TAG_KEYS[(tag?.name ?? '').toLowerCase().trim()]
    if (tagKey) return `tag:${tagKey}`
  }
  const norm = normalizeDescription(t.description)
  return norm ? `desc:${norm}` : ''
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000
}

interface Charge {
  amount: number
  date: Date
  description: string
  category: string
}

// ── Main entry ───────────────────────────────────────────────────────────────

export function detectRecurring(txns: ProcessedTransactionItem[], now: Date): RecurringResult {
  const empty: RecurringResult = {
    commitments: [],
    lockedInPerMonth: 0,
    pctOfAvgMonth: 0,
  }
  if (!txns || txns.length === 0) return empty

  // ── Aggregate spend baseline (all expenses) for pctOfAvgMonth ──
  const allMonths = new Set<string>()
  let totalExpense = 0

  // ── Group expenses by key ──
  const groups = new Map<string, Charge[]>()

  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    const amount = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amount)) continue

    totalExpense += amount
    allMonths.add(monthKey(t.txn_date))

    const key = groupingKey(t)
    if (!key) continue

    const charge: Charge = {
      amount,
      date: new Date(t.txn_date),
      description: t.description,
      category: t.category,
    }
    const list = groups.get(key)
    if (list) list.push(charge)
    else groups.set(key, [charge])
  }

  const distinctMonthCount = allMonths.size
  const avgMonthlySpend = distinctMonthCount > 0 ? totalExpense / distinctMonthCount : 0

  const commitments: RecurringCommitment[] = []

  for (const [key, charges] of groups) {
    // Distinct calendar months this group appears in.
    const monthsSet = new Set(charges.map((c) => monthKey(toISODate(c.date))))
    if (monthsSet.size < MIN_MONTHS) continue

    const amounts = charges.map((c) => c.amount)
    const med = median(amounts)
    if (med <= 0) continue

    // Tag-keyed groups are KNOWN recurring (rent/sip/insurance/…), so they
    // bypass the amount-stability gate — these real-world commitments legitimately
    // drift (rent hikes) or bundle (several SIPs/month), which would otherwise
    // wrongly exclude exactly the fixed costs this section exists to surface.
    // Description-keyed groups still require stability to avoid grouping
    // coincidentally-repeated merchants.
    const isTagKeyed = key.startsWith('tag:')
    if (!isTagKeyed) {
      // Amount stability: ≥60% of charges within ±15% of the median.
      const withinBand = amounts.filter((a) => Math.abs(a - med) <= med * STABILITY_PCT).length
      if (withinBand / amounts.length < STABILITY_FRACTION) continue
    }

    // Average committed outflow per active month (handles bundled/drifting charges).
    const groupTotal = amounts.reduce((s, a) => s + a, 0)
    const monthlyAmount = groupTotal / monthsSet.size

    // Order charges chronologically.
    const ordered = [...charges].sort((a, b) => a.date.getTime() - b.date.getTime())
    const dates = ordered.map((c) => c.date)

    // Median gap (days) between consecutive charges.
    const gaps: number[] = []
    for (let i = 1; i < dates.length; i++) {
      gaps.push(daysBetween(dates[i - 1], dates[i]))
    }
    const medGap = gaps.length > 0 ? median(gaps) : 30

    const cadence: Cadence = medGap <= 10 ? 'weekly' : medGap <= 45 ? 'monthly' : 'irregular'

    const lastDate = dates[dates.length - 1]
    const firstDate = dates[0]
    const nextDate = new Date(lastDate.getTime() + medGap * 86_400_000)

    // Display name: most common original description, else title-cased key.
    const cleanKey = key.replace(/^(tag|desc):/, '')
    const name = mostCommon(ordered.map((c) => c.description)) || titleCase(cleanKey)
    const category = mostCommon(ordered.map((c) => c.category))

    // ── Flags ──
    const flags: RecurringFlag[] = []

    // new: earliest charge within last ~60 days of now.
    if (daysBetween(firstDate, now) <= NEW_WINDOW_DAYS && firstDate <= now) {
      flags.push('new')
    }

    // due: nextExpected within 3 days after now.
    const daysToNext = (nextDate.getTime() - now.getTime()) / 86_400_000
    if (daysToNext >= 0 && daysToNext <= DUE_WINDOW_DAYS) {
      flags.push('due')
    }

    // missing: monthly cadence and nextExpected already overdue (before now).
    if (cadence === 'monthly' && nextDate.getTime() < now.getTime()) {
      flags.push('missing')
    }

    // changed: the most recent active month's total deviates meaningfully (>25%)
    // from the typical monthly total. Comparing month-totals (not single charges)
    // avoids false positives from commitments that naturally vary charge-to-charge
    // or bundle several charges per month.
    const monthTotals = new Map<string, number>()
    for (const c of ordered) {
      const mk = monthKey(toISODate(c.date))
      monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + c.amount)
    }
    // Exclude the in-progress current month — it's incomplete, so its lower
    // partial total would otherwise look like a (false) drop.
    monthTotals.delete(monthKey(toISODate(now)))
    if (monthTotals.size >= 2) {
      const sortedMonthKeys = [...monthTotals.keys()].sort()
      const lastMonthTotal = monthTotals.get(sortedMonthKeys[sortedMonthKeys.length - 1]) ?? 0
      const medMonthTotal = median([...monthTotals.values()])
      if (
        medMonthTotal > 0 &&
        Math.abs(lastMonthTotal - medMonthTotal) > medMonthTotal * CHANGED_PCT
      ) {
        flags.push('changed')
      }
    }

    commitments.push({
      key,
      name,
      category,
      medianAmount: med,
      monthlyAmount,
      monthsSeen: monthsSet.size,
      cadence,
      lastCharged: toISODate(lastDate),
      nextExpected: toISODate(nextDate),
      flags,
    })
  }

  commitments.sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  // The committed monthly outflow = sum of each commitment's average monthly
  // amount. Using the per-commitment monthly average (not a single charge ×
  // cadence guess) keeps bundled commitments like SIP correct.
  const lockedInPerMonth = commitments.reduce((sum, c) => sum + c.monthlyAmount, 0)

  const pctOfAvgMonth = avgMonthlySpend > 0 ? lockedInPerMonth / avgMonthlySpend : 0

  return { commitments, lockedInPerMonth, pctOfAvgMonth }
}
