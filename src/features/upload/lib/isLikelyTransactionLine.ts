/** A skipped line counts as a *candidate miss* only if it both looks like a
 *  date and has a decimal-amount token. The parser's ``skipped_rows`` list
 *  includes many lines that are not transactions at all (card headers,
 *  reward-point tables, GST summary rows, totals, page headers) — counting
 *  those as "missed transactions" produces false-alarm banners in the UI.
 *
 *  Heuristic kept deliberately tight: better to under-flag than to alarm on
 *  noise. When the proper backend diagnostics land (see
 *  pdf_parser_tier1_diagnostics_plan), we can switch to the server-side
 *  classification and retire this helper. */
const DATE_PATTERNS = [
  // DD/MM, DD/MM/YYYY, DD-MM-YYYY (and MM/DD variants — symmetric)
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/,
  // YYYY-MM-DD
  /\b\d{4}-\d{2}-\d{2}\b/,
  // 12 May, 12-May, 12-May-2026
  /\b\d{1,2}[-\s](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:[-\s]\d{2,4})?\b/i,
  // May 12
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-\s]\d{1,2}\b/i,
]

// Number with thousands separators and a 2-digit fractional part. Stops the
// heuristic from firing on plain integers (reward counts, point balances,
// page numbers, "30 DAYS 0" cells).
const AMOUNT_PATTERN = /\b\d[\d,]*\.\d{2}\b/

export function isLikelyTransactionLine(line: string): boolean {
  if (!line) return false
  const hasDate = DATE_PATTERNS.some((p) => p.test(line))
  if (!hasDate) return false
  return AMOUNT_PATTERN.test(line)
}
