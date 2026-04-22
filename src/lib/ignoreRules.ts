const STORAGE_KEY = 'ignore_rules'

export function getIgnoreRules(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function addIgnoreRule(keyword: string): string[] {
  const rules = getIgnoreRules()
  const normalized = keyword.toLowerCase().trim()
  if (normalized && !rules.includes(normalized)) rules.push(normalized)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  return [...rules]
}

export function removeIgnoreRule(keyword: string): string[] {
  const rules = getIgnoreRules().filter((r) => r !== keyword)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  return [...rules]
}

export function matchesAnyRule(description: string, rules: string[]): boolean {
  const lower = description.toLowerCase()
  return rules.some((r) => lower.includes(r))
}
