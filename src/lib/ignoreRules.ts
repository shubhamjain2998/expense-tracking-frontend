/**
 * User-managed list of substring keywords that hide rows during statement
 * preview (e.g. "interest reversal", "atm withdrawal").
 *
 * Stored in localStorage so it survives reloads and avoids round-tripping
 * non-financial preferences through the backend. Mutations dispatch a custom
 * event so subscribed views (Settings, Upload) re-read in lockstep.
 */

const STORAGE_KEY = 'ignore_rules'
export const IGNORE_RULES_EVENT = 'ignore-rules:change'

function emit(rules: string[]): void {
  window.dispatchEvent(new CustomEvent<string[]>(IGNORE_RULES_EVENT, { detail: rules }))
}

export function getIgnoreRules(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === 'string') : []
  } catch {
    return []
  }
}

export function addIgnoreRule(keyword: string): string[] {
  const rules = getIgnoreRules()
  const normalized = keyword.toLowerCase().trim()
  if (normalized && !rules.includes(normalized)) rules.push(normalized)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  emit(rules)
  return [...rules]
}

export function removeIgnoreRule(keyword: string): string[] {
  const rules = getIgnoreRules().filter((r) => r !== keyword)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  emit(rules)
  return [...rules]
}

export function matchesAnyRule(description: string, rules: string[]): boolean {
  const lower = description.toLowerCase()
  return rules.some((r) => lower.includes(r))
}
