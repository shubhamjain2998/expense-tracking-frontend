/**
 * Up to two initials from a name. Splits on whitespace and common separators
 * for email-derived names (e.g. "first.last@example" → "FL").
 */
export function getInitials(input: string): string {
  if (!input) return '?'
  const local = input.includes('@') ? input.split('@')[0] : input
  const parts = local.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}
