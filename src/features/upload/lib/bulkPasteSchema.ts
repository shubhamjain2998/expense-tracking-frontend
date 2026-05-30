export const BULK_PASTE_SCHEMA_VERSION = 1
export const BULK_PASTE_MAX_ROWS = 500

export interface BulkPasteRow {
  txn_date: string
  description: string
  amount: number
}

export type BulkPasteParseResult = { ok: true; rows: BulkPasteRow[] } | { ok: false; error: string }

/** Prompt the user copies into any LLM (ChatGPT, Claude, Gemini, …) alongside
 *  a screenshot of their bank/card transaction list. The LLM's job is to
 *  produce JSON in the shape we then validate on paste. The schema_version
 *  field lets us tighten the contract later without silently importing
 *  garbage from prompts pinned to an older version.
 *
 *  Mirrors the PDF preview-row contract — only date, description, signed
 *  amount. Direction is derived downstream by ``classify_txn_type`` exactly
 *  as for PDF rows, so the LLM doesn't need to guess a transaction type. */
export const BULK_PASTE_PROMPT = `You will be given one or more screenshots of a bank or credit-card transaction list. Sources can be anything: a mobile-app screen, a net-banking page, a mini-statement, or pages of a PDF statement that another tool couldn't parse. Multiple screenshots may be attached together — treat them as one continuous list.

Extract every transaction visible across all screenshots into a single JSON object. Output JSON ONLY. No markdown code fences, no commentary, no preamble.

Output shape:
{
  "schema_version": ${BULK_PASTE_SCHEMA_VERSION},
  "rows": [
    {
      "txn_date": "YYYY-MM-DD",
      "description": "string — merchant or description as shown, trimmed",
      "amount": 0.00
    }
  ]
}

Rules:
1. Sign convention for "amount": POSITIVE for money out (debit, spend, purchase). NEGATIVE for money in (credit, refund, salary, cashback, interest credit, transfer received). This is critical — get it right or the transaction direction flips.
2. "amount" is a number, not a string. Strip currency symbols (₹, Rs, INR, $), thousands separators, and any "Dr"/"Cr" suffix — encode direction via sign only.
3. "txn_date" must be ISO YYYY-MM-DD. If the screenshot shows "12 May" without a year, infer the year from any month/year header visible in the screenshot. If still ambiguous, use the most recent plausible year (do not guess wildly).
4. Skip header rows, totals, opening/closing balance lines, "Money In/Out" summaries, page headers/footers, page numbers, and any non-transaction text. Only individual transactions.
5. One screenshot row → one JSON entry. Do not merge, split, summarize, or invent rows. If the same transaction appears on two stitched screenshots (overlap), include it exactly once.
6. "description" should be the merchant/payee string as shown, trimmed. Do not add notes or rephrase.

Now extract from the attached screenshot.`

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function stripFences(s: string): string {
  // Tolerate LLMs that wrap output in ```json … ``` even when told not to.
  const trimmed = s.trim()
  if (!trimmed.startsWith('```')) return trimmed
  const inner = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return inner.trim()
}

export function parseBulkPasteJson(text: string): BulkPasteParseResult {
  const cleaned = stripFences(text)
  if (!cleaned) return { ok: false, error: 'Paste the JSON your LLM produced.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid JSON'
    return { ok: false, error: `Not valid JSON — ${msg}` }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Expected an object with "schema_version" and "rows".' }
  }
  const obj = parsed as Record<string, unknown>

  if (obj.schema_version !== BULK_PASTE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schema_version mismatch — expected ${BULK_PASTE_SCHEMA_VERSION}, got ${JSON.stringify(obj.schema_version)}. Re-copy the prompt and try again.`,
    }
  }

  if (!Array.isArray(obj.rows)) {
    return { ok: false, error: '"rows" must be an array.' }
  }
  if (obj.rows.length === 0) {
    return { ok: false, error: 'No transactions in the JSON.' }
  }
  if (obj.rows.length > BULK_PASTE_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many rows (${obj.rows.length}). Max is ${BULK_PASTE_MAX_ROWS} — split the screenshot.`,
    }
  }

  const rows: BulkPasteRow[] = []
  for (let i = 0; i < obj.rows.length; i++) {
    const r = obj.rows[i]
    if (!r || typeof r !== 'object') {
      return { ok: false, error: `Row ${i + 1}: expected an object.` }
    }
    const rec = r as Record<string, unknown>

    const date = rec.txn_date
    if (typeof date !== 'string' || !DATE_RE.test(date) || isNaN(Date.parse(date))) {
      return {
        ok: false,
        error: `Row ${i + 1}: "txn_date" must be YYYY-MM-DD (got ${JSON.stringify(date)}).`,
      }
    }

    const desc = rec.description
    if (typeof desc !== 'string' || desc.trim() === '') {
      return { ok: false, error: `Row ${i + 1}: "description" must be a non-empty string.` }
    }

    const amt = rec.amount
    if (typeof amt !== 'number' || !Number.isFinite(amt) || amt === 0) {
      return {
        ok: false,
        error: `Row ${i + 1}: "amount" must be a non-zero number (got ${JSON.stringify(amt)}).`,
      }
    }

    rows.push({
      txn_date: date,
      description: desc.trim(),
      amount: amt,
    })
  }

  return { ok: true, rows }
}
