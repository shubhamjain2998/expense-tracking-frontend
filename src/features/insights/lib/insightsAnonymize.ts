/**
 * Optional merchant-name anonymisation for the insights prompt.
 *
 * The user is warned once about exactly what leaves the app (see
 * `PRIVACY_NOTICE` in `insightsPrompt.ts`) and can toggle this on before
 * copying the prompt. When on, every merchant/description string is swapped
 * for a stable `MERCHANT_07`-style label before the prompt is built. The
 * mapping never leaves the browser (kept in localStorage, applied only on
 * this device) and is used in reverse to re-substitute real names back into
 * the LLM's reply so the rendered page still reads naturally.
 *
 * Categories, tags, dates and amounts are never anonymised — only free-text
 * descriptions (transaction descriptions, commitment names).
 */
import type { InsightsPayload } from './insightsResponseSchema'

const STORAGE_KEY = 'kosh.insights.anonymizeMap.v1'

export interface AnonymizeMap {
  /** real description (as it appears verbatim in the data) → stable label */
  forward: Record<string, string>
  /** stable label → real description, for reversing the LLM's reply */
  reverse: Record<string, string>
}

export function buildAnonymizeMap(descriptions: string[]): AnonymizeMap {
  const forward: Record<string, string> = {}
  const reverse: Record<string, string> = {}
  const seen = new Set<string>()
  let n = 0
  for (const raw of descriptions) {
    const desc = raw.trim()
    if (!desc || seen.has(desc)) continue
    seen.add(desc)
    n += 1
    const label = `MERCHANT_${String(n).padStart(2, '0')}`
    forward[desc] = label
    reverse[label] = desc
  }
  return { forward, reverse }
}

export function anonymizeText(text: string, map: AnonymizeMap): string {
  return map.forward[text.trim()] ?? text
}

/** Reverse every `MERCHANT_NN` label found in free text back to the real
 *  description. Safe to call on text with no labels — it's a no-op. */
export function deanonymizeText(text: string, map: AnonymizeMap): string {
  return text.replace(/MERCHANT_\d{2,}/g, (label) => map.reverse[label] ?? label)
}

/**
 * Extend an existing map with any new descriptions, keeping every previously
 * assigned label stable (so a run saved under an older mapping can still be
 * de-anonymised later) and numbering new entries after the existing ones.
 */
export function mergeAnonymizeMap(
  existing: AnonymizeMap | null,
  descriptions: string[]
): AnonymizeMap {
  const forward: Record<string, string> = { ...(existing?.forward ?? {}) }
  const reverse: Record<string, string> = { ...(existing?.reverse ?? {}) }
  let n = Object.keys(reverse).length
  for (const raw of descriptions) {
    const desc = raw.trim()
    if (!desc || forward[desc]) continue
    n += 1
    const label = `MERCHANT_${String(n).padStart(2, '0')}`
    forward[desc] = label
    reverse[label] = desc
  }
  return { forward, reverse }
}

/**
 * Reverse every `MERCHANT_NN` label the LLM echoed back in its reply — the
 * verdict, each finding's title/detail/figure label, and every chart's
 * title/series name/point label — so the page renders real merchant names
 * even though the LLM only ever saw the anonymised ones. A no-op when `map`
 * is null (anonymisation was off for this run).
 */
export function deanonymizeInsightsPayload(
  payload: InsightsPayload,
  map: AnonymizeMap | null
): InsightsPayload {
  if (!map) return payload
  const t = (s: string) => deanonymizeText(s, map)
  return {
    ...payload,
    verdict: t(payload.verdict),
    findings: payload.findings.map((f) => ({
      ...f,
      title: t(f.title),
      detail: t(f.detail),
      figure: f.figure ? { ...f.figure, label: t(f.figure.label) } : undefined,
    })),
    charts: payload.charts.map((c) => ({
      ...c,
      title: t(c.title),
      series: c.series.map((s) => ({
        ...s,
        name: t(s.name),
        data: s.data.map((p) => ({ ...p, label: t(p.label) })),
      })),
    })),
  }
}

export function saveAnonymizeMap(map: AnonymizeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage can throw (private mode, quota) — anonymisation just
    // won't survive a reload, which is a soft failure, not a crash.
  }
}

export function loadAnonymizeMap(): AnonymizeMap | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || !('forward' in parsed) || !('reverse' in parsed)) {
      return null
    }
    return parsed as AnonymizeMap
  } catch {
    return null
  }
}
