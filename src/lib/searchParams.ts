/**
 * Reads a multi-value URL param, accepting both repeated params
 * (`?category=a&category=b`) and a comma-separated single value
 * (`?category=a,b`) — the latter so an older single-value link (e.g.
 * Category's "Open in Transactions") still pre-filters correctly.
 * Deduplicates and drops empty entries.
 */
export function getMultiParam(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams.getAll(key)
  if (values.length === 0) return []
  return [...new Set(values.flatMap((v) => v.split(',')).filter(Boolean))]
}
