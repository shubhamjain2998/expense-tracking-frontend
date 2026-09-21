/**
 * Builds the copy-paste prompt for Insights — the one place that turns the
 * user's own numbers (`InsightsAggregates`) into an LLM prompt asking for
 * `InsightsPayload` JSON back. Mirrors
 * `src/features/upload/lib/bulkPasteSchema.ts`'s `BULK_PASTE_PROMPT`: state
 * the schema, give a worked example, demand JSON-only output in a fenced
 * block, and carry a `schema_version` so a stale paste can be caught.
 *
 * v2 asks for interpretation, not observation. The app can already total a
 * category by month; what it cannot do is say what the ratio between two of
 * them means, what a habit costs over a year, or which of two explanations
 * for a rise the data supports. That is what the "Analyse, don't report"
 * section below is for, and why the data blocks now carry transaction
 * counts, monthly income and weekday weight — each one exists to make a
 * specific decomposition possible.
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
  "verdict": "Your spending didn't rise — your fixed commitments did, and they now eat 3 months of the buffer you used to rebuild each quarter.",
  "metrics": [
    {
      "id": "savings-rate",
      "label": "Savings rate, last 3 months",
      "value": 14,
      "unit": "%",
      "direction": "down",
      "tone": "negative",
      "detail": "You kept 14% of income over the last 3 months against 23% for the 12 before that. The drop is entirely on the outflow side — income was flat."
    },
    {
      "id": "committed-share",
      "label": "Income already committed",
      "value": 47,
      "unit": "%",
      "direction": "up",
      "tone": "negative",
      "detail": "Rent, SIPs and insurance now claim 47 paise of every rupee you earn, up from 41% a year ago. Below 50% is usually workable; past it, one bad month has nowhere to give."
    }
  ],
  "findings": [
    {
      "id": "dining-price-not-frequency",
      "title": "Dining rose on price, not on habit",
      "severity": "warning",
      "detail": "Dining went from ₹8,200 to ₹9,900 a month, but order count fell from 19 to 16 — your average order climbed from ₹432 to ₹619.",
      "so_what": "Eating out less has not made it cheaper. At the current average, going back to 19 orders would cost ₹11,760 a month, not the ₹8,200 you'd expect.",
      "action": "Check whether the jump is a venue change or delivery fees — the fix is different for each.",
      "annual_impact": 20400,
      "confidence": "high",
      "figure": { "label": "Average order", "value": 619, "unit": "INR" }
    },
    {
      "id": "sip-on-track",
      "title": "SIPs never missed",
      "severity": "good",
      "detail": "Every SIP commitment fired on time for all 15 months in this window.",
      "so_what": "₹2.4L went in without a single manual top-up — this is the part of your plan that needs no attention at all.",
      "confidence": "high",
      "figure": { "label": "Months on time", "value": 15 }
    }
  ],
  "patterns": [
    {
      "id": "post-credit-burst",
      "title": "The three days after money lands are your costliest",
      "detail": "Discretionary spending in the 3 days after each salary credit runs about 2.4x your daily average for the rest of the month, then falls back.",
      "evidence": "Days 1-3 after credit: ₹3,180/day average across 15 months, vs ₹1,320/day on days 4-30."
    }
  ],
  "projection": {
    "label": "Projected spend, next month",
    "value": 84500,
    "unit": "INR",
    "basis": "Median of the last 6 months (₹79,400) plus the two commitments that repriced in the last quarter, assuming no repeat of June's one-off travel."
  },
  "charts": [
    {
      "id": "dining-price-vs-count",
      "title": "Dining: average order vs order count",
      "type": "line",
      "unit": "INR",
      "takeaway": "The two lines cross in April — that's the month the habit stopped getting cheaper.",
      "series": [
        {
          "name": "Average order",
          "data": [
            { "label": "Apr", "value": 432 },
            { "label": "May", "value": 505 },
            { "label": "Jun", "value": 619 }
          ]
        }
      ]
    }
  ],
  "questions": [
    "Was June's ₹41,000 travel charge a one-off, or the first of a series? It changes the projection by ₹30,000."
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
    .map(
      (r) => `${r.month}  ${fmt(r.category, anonymize, map)}  ${money(r.total)}  ${r.count} txns`
    )
    .join('\n')

  const incomeLines =
    data.incomeBySource.length > 0
      ? data.incomeBySource
          .map((r) => `${fmt(r.category, anonymize, map)}  ${money(r.total)}`)
          .join('\n')
      : '(none recorded in this window)'

  const incomeMonthLines =
    data.incomeByMonth.length > 0
      ? data.incomeByMonth.map((r) => `${r.month}  ${money(r.total)}`).join('\n')
      : '(none recorded in this window)'

  const weekdayLines = data.weekdayTotals
    .map((w) => `${w.weekday}  ${money(w.total)}  ${w.count} txns`)
    .join('\n')

  const commitmentLines =
    data.commitments.length > 0
      ? data.commitments
          .map(
            (c) =>
              `${fmt(c.name, anonymize, map)} · ${fmt(c.category, anonymize, map)} · ${c.cadence} · ` +
              `median charge ${money(c.medianCharge)} · typical/mo ${money(c.monthlyAmount)} · ` +
              `seen ${c.monthsSeen} months · last charged ${c.lastCharged}` +
              (c.flags.length > 0 ? ` · flags: ${c.flags.join(', ')}` : '')
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

  return `You are a personal-finance analyst reading one real person's own ledger. Every number \
below is theirs, already aggregated by their app — none of it is estimated. They can already see \
these totals in the app. What they cannot see is what the numbers mean together. That is your \
entire job: the reading, not the recap.

Period covered: ${data.periodStart} to ${data.periodEnd} (${data.monthsCovered} months).
${anonymize ? 'Merchant/description names below have been replaced with labels like MERCHANT_07 for privacy — treat them as opaque identifiers, a given MERCHANT_NN always refers to the same real merchant.' : ''}

── Category totals by month (expenses, with transaction count) ──
${categoryLines || '(no expense data in this window)'}

── Income by source (whole window) ──
${incomeLines}

── Income by month ──
${incomeMonthLines}

── Expenses by day of week (whole window) ──
${weekdayLines}

── Detected recurring commitments ──
${commitmentLines}

── Shared/split ledger (money owed to the user) ──
${ledgerLines}

── Top ${data.topTransactions.length} transactions by absolute amount ──
${topTxnLines || '(no transactions in this window)'}

── Outliers (expenses far above their own category's median) ──
${outlierLines}

═══ Analyse, don't report ═══

The app already draws every total above. Restating one back is worthless. Earn your place by \
doing the work the person cannot do by looking:

1. **Decompose every change.** A category that rose did so because the price per transaction \
rose, because the count rose, or because one outlier landed in it. The counts are given — say \
which, because the remedy differs.
2. **Work in ratios, not totals.** Savings rate by month, committed (recurring) spend as a share \
of income, share of spend sitting in the top 3 categories, discretionary vs fixed. A ratio that \
moves while both its parts move is invisible in any single chart.
3. **Separate level from trend.** A category that is large but flat needs no attention. A small \
one doubling every month does. Rank by trajectory, not size.
4. **Price the habit.** Convert a per-week or per-transaction pattern into what it costs over a \
year. "₹430 twice a week" reads very differently as "₹44,700 a year".
5. **Check the commitments for drift.** Compare median charge against recent charges and the \
flags given. A subscription whose charge crept up, one that stopped firing, and two that overlap \
in purpose are all findings the totals hide.
6. **Read the timing.** Use the weekday table and the dates on individual transactions: bursts \
after income lands, weekend concentration, month-end catch-up, a category that only appears in \
some months.
7. **Say what would have to be true.** If one explanation fits but you cannot confirm it, put it \
in "questions" rather than asserting it.
8. **Give the good news its own line.** Something in here is working. Say which, so they don't \
change it by accident.
9. **Stay inside the data.** Never invent a number that isn't derivable from what's above. No \
national averages, no benchmarks against "people like you" — you don't have that data. Comparing \
this person against their own past is the only comparison available, and it is the useful one.

Output shape — return JSON ONLY, in a single \`\`\`json fenced code block, no other prose before \
or after:

${EXAMPLE_RESPONSE}

Field rules:
1. "schema_version" must be exactly ${INSIGHTS_SCHEMA_VERSION}.
2. "verdict" — one sentence, the single most important true thing in this data. Not a summary of \
the sections below; the one line worth reading if they read nothing else.
3. "metrics" — 2 to 5 derived ratios, each a number the app does not itself compute. "detail" is \
one or two sentences interpreting it, including the comparison that makes it mean something \
(against their own earlier months, not against strangers). "unit" is "%" or "INR" or a short \
word. "direction" is up/down/flat and "tone" is positive/negative/neutral — tone says whether \
that direction is good news, which the app cannot know on its own.
4. "findings" — 3 to 8, ranked most important first. "detail" says what happened with the \
numbers behind it. "so_what" is required and must add something "detail" does not: the \
consequence, in money or in months. "action" is one concrete next step where there is one — omit \
it rather than padding with "monitor this". "annual_impact" is what acting on it is worth over a \
year, when that is derivable. "confidence" is high/medium/low — use low honestly when the window \
is short or the pattern thin. "severity" is one of critical, warning, info, good.
5. "patterns" — 0 to 5 behavioural regularities: timing, sequence, trigger. These are things that \
need no decision, which is what separates them from findings. Put the supporting numbers in \
"evidence".
6. "projection" — optional, one forward-looking number with "basis" stating exactly what it \
assumes. Omit it if the window is too thin to support one.
7. "charts" — 1 to 4 specs the app can draw: "type" is bar, line, pie or area; each series point \
needs a short "label" and numeric "value". "takeaway" is one line naming what to actually see in \
it. Two series with different magnitudes are fine — the app gives the second one its own axis — so a price-vs-count or spend-vs-income chart renders correctly. Every chart must answer a different question — if two charts would carry the same message, \
drop one. Prefer a chart that shows a relationship (price vs count, spend vs income) over one \
that shows a single total by month.
8. "questions" — 0 to 4 things the numbers genuinely cannot settle and only they can answer, each \
stating why it matters. Not a survey; only where the answer would change the analysis.
9. Every string is plain text — no markdown, no HTML, no emoji-as-bullets, no currency symbols \
inside numeric fields.
10. Do not repeat yourself across sections. A metric, a finding and a chart covering the same \
ground is one insight printed three times.`
}
