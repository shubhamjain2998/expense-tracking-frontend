/**
 * Builds the copy-paste prompt for Insights — the one place that turns the
 * user's own numbers (`InsightsAggregates`) into an LLM prompt asking for
 * `InsightsPayload` JSON back. Mirrors
 * `src/features/upload/lib/bulkPasteSchema.ts`'s `BULK_PASTE_PROMPT`: state
 * the schema, give a worked example, demand JSON-only output in a fenced
 * block, and carry a `schema_version` so a stale paste can be caught.
 *
 * Regenerated fresh every time the "Generate prompt" panel is opened — it is
 * a pure function of whatever aggregates are passed in, nothing is cached.
 */
import { formatCurrency } from '@/lib/format'

import type { InsightsAggregates } from './insightsAggregates'
import { anonymizeText, type AnonymizeMap } from './insightsAnonymize'
import { INSIGHTS_SCHEMA_VERSION } from './insightsResponseSchema'

export const PRIVACY_NOTICE =
  'This prompt includes your category totals, income sources, detected recurring commitments, ' +
  'merchant/transaction descriptions, dates and amounts for the last 15 months. It does not ' +
  'include account numbers, card numbers or your name/email. Nothing is sent anywhere by this ' +
  'app — you copy the text yourself and paste it into whichever LLM you choose. Turn on ' +
  '"Anonymise merchant names" below to swap real merchant names for labels like MERCHANT_07 ' +
  'before copying; the mapping stays on this device and is reversed automatically when the ' +
  'reply is rendered.'

function money(n: number): string {
  return formatCurrency(n)
}

function fmt(text: string, anonymize: boolean, map: AnonymizeMap | null): string {
  if (!anonymize || !map) return text
  return anonymizeText(text, map)
}

const EXAMPLE_RESPONSE = `{
  "schema_version": ${INSIGHTS_SCHEMA_VERSION},
  "verdict": "Dining and cabs together grew 22% faster than your income over the last 3 months.",
  "findings": [
    {
      "id": "dining-trend",
      "title": "Dining is drifting up",
      "severity": "warning",
      "detail": "Dining rose from a ~₹8,200/mo median to ₹9,900 last month, driven by weekday orders.",
      "figure": { "label": "Median dining/mo", "value": 9900, "unit": "INR" }
    },
    {
      "id": "sip-on-track",
      "title": "SIPs are on schedule",
      "severity": "good",
      "detail": "Every SIP commitment fired on time for all 15 months in this window.",
      "figure": { "label": "Months on time", "value": 15 }
    }
  ],
  "charts": [
    {
      "id": "dining-by-month",
      "title": "Dining spend by month",
      "type": "bar",
      "unit": "INR",
      "series": [
        {
          "name": "Dining",
          "data": [
            { "label": "Apr", "value": 8100 },
            { "label": "May", "value": 8600 },
            { "label": "Jun", "value": 9900 }
          ]
        }
      ]
    }
  ]
}`

export interface BuildInsightsPromptOptions {
  anonymize: boolean
  anonymizeMap: AnonymizeMap | null
}

/**
 * Pure: takes the user's own aggregated data and returns the full prompt
 * text, ready to copy. Embeds real, current numbers every time it's called —
 * nothing here is memoised or cached upstream on purpose, so re-opening the
 * panel always reflects the latest ledger.
 */
export function buildInsightsPrompt(
  data: InsightsAggregates,
  opts: BuildInsightsPromptOptions
): string {
  const { anonymize, anonymizeMap: map } = opts

  const categoryLines = data.categoryMonthTotals
    .map((r) => `${r.month}  ${fmt(r.category, anonymize, map)}  ${money(r.total)}`)
    .join('\n')

  const incomeLines =
    data.incomeBySource.length > 0
      ? data.incomeBySource
          .map((r) => `${fmt(r.category, anonymize, map)}  ${money(r.total)}`)
          .join('\n')
      : '(none recorded in this window)'

  const commitmentLines =
    data.commitments.length > 0
      ? data.commitments
          .map(
            (c) =>
              `${fmt(c.name, anonymize, map)} · ${fmt(c.category, anonymize, map)} · ${c.cadence} · ` +
              `median charge ${money(c.medianCharge)} · typical/mo ${money(c.monthlyAmount)} · seen ${c.monthsSeen} months`
          )
          .join('\n')
      : '(none detected)'

  const ledgerLines =
    data.splitLedger.length > 0
      ? data.splitLedger
          .map((r) => `${fmt(r.person, anonymize, map)}: owes you ${money(r.theyOweYou)}`)
          .join('\n')
      : '(nothing outstanding)'

  const topTxnLines = data.topTransactions
    .map(
      (t) =>
        `${t.date}  ${fmt(t.description, anonymize, map)}  ${fmt(t.category, anonymize, map)}  ${money(t.amount)}`
    )
    .join('\n')

  const outlierLines =
    data.outliers.length > 0
      ? data.outliers
          .map(
            (o) =>
              `${o.date}  ${fmt(o.description, anonymize, map)}  ${fmt(o.category, anonymize, map)}  ` +
              `${money(o.amount)}  (category median ${money(o.categoryMedian)})`
          )
          .join('\n')
      : '(none — nothing far from its category median)'

  return `You are a personal-finance analyst. Below is a real user's own transaction data, already \
aggregated by their app — every number is theirs, not estimated. Your job is to find the true \
story in it: what actually changed, what's worth their attention, and what's fine. Do not invent \
numbers that aren't derivable from what's given.

Period covered: ${data.periodStart} to ${data.periodEnd} (${data.monthsCovered} months).
${anonymize ? 'Merchant/description names below have been replaced with labels like MERCHANT_07 for privacy — treat them as opaque identifiers, a given MERCHANT_NN always refers to the same real merchant.' : ''}

── Category totals by month (expenses) ──
${categoryLines || '(no expense data in this window)'}

── Income by source (whole window) ──
${incomeLines}

── Detected recurring commitments ──
${commitmentLines}

── Shared/split ledger (money owed to the user) ──
${ledgerLines}

── Top ${data.topTransactions.length} transactions by absolute amount ──
${topTxnLines || '(no transactions in this window)'}

── Outliers (expenses far above their own category's median) ──
${outlierLines}

Output shape — return JSON ONLY, in a single \`\`\`json fenced code block, no other prose before or after:

${EXAMPLE_RESPONSE}

Rules:
1. "schema_version" must be exactly ${INSIGHTS_SCHEMA_VERSION}.
2. "verdict" is one sentence: the single most important true story in this data.
3. "findings" is a ranked list (most important first), 3–8 items. Each "severity" is one of: \
critical, warning, info, good. Each "figure" (optional) is one real number pulled or computed from \
the data above — never invented.
4. "charts" is 1–4 chart specs the app can actually draw: "type" must be one of bar, line, pie, \
area. Each series' data points need a short "label" and a numeric "value". Use the category/month \
totals, income sources, or commitments above as your source data — do not fabricate values.
5. Every string is plain text — no markdown, no HTML, no emoji-as-bullets.
6. Do not restate raw rows back verbatim; synthesize an actual insight.`
}
