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
  "verdict": "Your spending didn't rise — your fixed commitments did, and they now claim 47 paise of every rupee that lands.",
  "metrics": [
    {
      "id": "savings-rate",
      "label": "Savings rate, last 3 months",
      "value": 14,
      "unit": "%",
      "direction": "down",
      "tone": "negative",
      "detail": "Income was flat, so the entire drop from 23% came from the outflow side."
    },
    {
      "id": "committed-share",
      "label": "Income already committed",
      "value": 47,
      "unit": "%",
      "direction": "up",
      "tone": "negative",
      "detail": "Past 50%, one bad month has nowhere left to give."
    }
  ],
  "findings": [
    {
      "id": "dining-price-not-frequency",
      "title": "Dining rose on price, not on habit",
      "severity": "warning",
      "detail": "Orders fell from 19 to 16 a month while the average order climbed from 432 to 619.",
      "so_what": "Eating out less has not made it cheaper, so cutting frequency again will not work.",
      "action": "Check whether the jump is a venue change or delivery fees.",
      "annual_impact": 20400,
      "confidence": "high",
      "figure": { "label": "Average order", "value": 619, "unit": "INR" },
      "comparison": { "label": "Average order", "from": 432, "to": 619, "unit": "INR" }
    },
    {
      "id": "sip-on-track",
      "title": "SIPs never missed",
      "severity": "good",
      "detail": "Every SIP commitment fired on time for all 15 months in this window.",
      "so_what": "This part of the plan needs no attention at all.",
      "confidence": "high",
      "figure": { "label": "Months on time", "value": 15 }
    }
  ],
  "patterns": [
    {
      "id": "post-credit-burst",
      "title": "The three days after money lands are the costliest",
      "detail": "Discretionary spending runs about 2.4x the daily average, then falls back.",
      "evidence": "Days 1-3: 3,180/day. Days 4-30: 1,320/day."
    }
  ],
  "projection": {
    "label": "Projected spend, next month",
    "value": 84500,
    "unit": "INR",
    "basis": "Six-month median plus the two commitments that repriced, assuming June's travel does not repeat."
  },
  "charts": [
    {
      "id": "dining-price-vs-count",
      "title": "Dining: average order vs order count",
      "type": "line",
      "unit": "INR",
      "takeaway": "The lines cross in April — that is when the habit stopped getting cheaper.",
      "series": [
        {
          "name": "Average order",
          "data": [
            { "label": "Apr", "value": 432 },
            { "label": "May", "value": 505 },
            { "label": "Jun", "value": 619 }
          ]
        },
        {
          "name": "Orders",
          "data": [
            { "label": "Apr", "value": 19 },
            { "label": "May", "value": 18 },
            { "label": "Jun", "value": 16 }
          ]
        }
      ]
    }
  ],
  "questions": [
    "Was June's 41,000 travel charge a one-off? It moves the projection by 30,000."
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

Length discipline — this matters as much as the analysis. The page shows headlines first and \
opens the reasoning only when asked, so every string has a job and a budget:

- "verdict": one sentence, at most 30 words.
- "detail": ONE sentence, at most 30 words. State the change with its two numbers. No second \
sentence, no lists of dates, no restating the category totals.
- "so_what": ONE sentence, at most 25 words. The consequence only — never repeat a number that is \
already in "detail", "figure", "comparison" or "annual_impact".
- "action": ONE sentence, at most 20 words, imperative.
- "evidence": numbers only, at most 15 words. "Fri 3,38,420 over 180 txns, avg 1,880" — not prose.
- metric "detail" and pattern "detail": ONE sentence, at most 25 words each.
- "basis": ONE sentence, at most 30 words.

Put figures in the numeric fields, not in sentences. A number that belongs in "comparison", \
"figure" or "annual_impact" must not also be spelled out in the prose — the app draws those.

Field rules:
1. "schema_version" must be exactly ${INSIGHTS_SCHEMA_VERSION}.
2. "verdict" — the single most important true thing in this data. Not a summary of the sections \
below; the one line worth reading if they read nothing else.
3. "metrics" — 2 to 5 derived ratios, each a number the app does not itself compute. "unit" is \
"%" or "INR" or a short word. "direction" is up/down/flat and "tone" is \
positive/negative/neutral — tone says whether that direction is good news, which the app cannot \
know on its own. "detail" is the one sentence that makes the number mean something, comparing \
them against their own earlier months, never against strangers.
4. "findings" — 3 to 8, ranked most important first. "severity" is one of critical, warning, \
info, good. "so_what" is required and must add what "detail" does not: the consequence. "action" \
is one concrete next step where there is one — omit it rather than padding with "monitor this". \
"annual_impact" is what this is worth over a year, when derivable; it is what the app ranks by, \
so give it wherever it is honest to. "confidence" is high/medium/low — use low honestly when the \
window is short or the pattern thin.
5. "comparison" — include it on every finding that is about something changing: \
{"label": "Monthly housing", "from": 19400, "to": 29200, "unit": "INR"}. The app draws the two \
bars and computes the percentage itself, so the sentence does not have to carry them. Omit it \
only when the finding is not a before/after at all.
6. "patterns" — 0 to 5 behavioural regularities: timing, sequence, trigger. These need no \
decision, which is what separates them from findings. Supporting numbers go in "evidence", not \
into "detail".
7. "projection" — optional, one forward-looking number with "basis" stating what it assumes. Omit \
it if the window is too thin to support one.
8. "charts" — 1 to 4 specs the app can draw: "type" is bar, line, pie or area; each series point \
needs a short "label" and numeric "value". "takeaway" is one line naming what to actually see in \
it. Two series with different magnitudes are fine — the app gives the second one its own axis — \
so a price-vs-count or spend-vs-income chart renders correctly. Every chart must answer a \
different question; if two would carry the same message, drop one. Prefer a chart that shows a \
relationship (price vs count, spend vs income) over one that shows a single total by month.
9. "questions" — 0 to 4 things the numbers genuinely cannot settle and only they can answer, each \
stating why it matters, one sentence each. Not a survey; only where the answer would change the \
analysis.
10. Every string is plain text — no markdown, no HTML, no emoji-as-bullets, no currency symbols \
inside numeric fields.
11. Do not repeat yourself across sections. A metric, a finding and a chart covering the same \
ground is one insight printed three times.`
}
