/**
 * The versioned JSON contract for an LLM's insights reply, plus a defensive
 * parser. Mirrors the idiom of `src/features/upload/lib/bulkPasteSchema.ts`
 * (the user explicitly asked for "just like how import works today") and the
 * backend's `InsightsPayload` in `backend/app/schemas.py` — the two must be
 * bumped in lockstep.
 *
 * Every string here is untrusted, hand-pasted content: the parser only ever
 * hands back plain strings/numbers, never anything the page could render as
 * markup. The page is responsible for rendering it as text (see page.tsx).
 */

export const INSIGHTS_SCHEMA_VERSION = 1

export type InsightsSeverity = 'critical' | 'warning' | 'info' | 'good'
export type InsightsChartType = 'bar' | 'line' | 'pie' | 'area'

const SEVERITIES: InsightsSeverity[] = ['critical', 'warning', 'info', 'good']
const CHART_TYPES: InsightsChartType[] = ['bar', 'line', 'pie', 'area']

export interface InsightsFigure {
  label: string
  value: number
  unit?: string
}

export interface InsightsFinding {
  id: string
  title: string
  severity: InsightsSeverity
  detail: string
  figure?: InsightsFigure
}

export interface InsightsChartPoint {
  label: string
  value: number
}

export interface InsightsChartSeries {
  name: string
  data: InsightsChartPoint[]
}

export interface InsightsChart {
  id: string
  title: string
  type: InsightsChartType
  unit?: string
  series: InsightsChartSeries[]
}

export interface InsightsPayload {
  schema_version: number
  verdict: string
  findings: InsightsFinding[]
  charts: InsightsChart[]
}

export type InsightsParseResult =
  { ok: true; payload: InsightsPayload } | { ok: false; error: string }

// ── Defensive text handling ──────────────────────────────────────────────────

function stripFences(s: string): string {
  const trimmed = s.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) return fenced[1].trim()
  return trimmed
}

/** Tolerate leading/trailing prose ("Sure, here's your JSON:\n{...}\nHope
 *  that helps!") by extracting the outermost {...} span. */
function extractJsonObject(s: string): string {
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return s
  return s.slice(start, end + 1)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

// ── Field-level parsers (each returns a precise "which field, what was
//    expected" error so a malformed paste never surfaces a stack trace) ────

function parseFigure(v: unknown, where: string): InsightsFigure | undefined | { error: string } {
  if (v === undefined) return undefined
  if (!isRecord(v)) return { error: `${where}.figure must be an object` }
  if (!nonEmptyString(v.label)) return { error: `${where}.figure.label must be a non-empty string` }
  if (!isFiniteNumber(v.value)) return { error: `${where}.figure.value must be a number` }
  if (v.unit !== undefined && typeof v.unit !== 'string') {
    return { error: `${where}.figure.unit must be a string` }
  }
  return { label: v.label.trim(), value: v.value, unit: v.unit as string | undefined }
}

function parseFinding(v: unknown, index: number): InsightsFinding | { error: string } {
  const where = `findings[${index}]`
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.id)) return { error: `${where}.id must be a non-empty string` }
  if (!nonEmptyString(v.title)) return { error: `${where}.title must be a non-empty string` }
  if (!nonEmptyString(v.detail)) return { error: `${where}.detail must be a non-empty string` }
  if (typeof v.severity !== 'string' || !SEVERITIES.includes(v.severity as InsightsSeverity)) {
    return {
      error: `${where}.severity must be one of ${SEVERITIES.join(', ')} (got ${JSON.stringify(v.severity)})`,
    }
  }
  const figure = parseFigure(v.figure, where)
  if (figure && 'error' in figure) return figure
  return {
    id: v.id.trim(),
    title: v.title.trim(),
    detail: v.detail.trim(),
    severity: v.severity as InsightsSeverity,
    figure,
  }
}

function parseChartPoint(v: unknown, where: string): InsightsChartPoint | { error: string } {
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.label)) return { error: `${where}.label must be a non-empty string` }
  if (!isFiniteNumber(v.value)) return { error: `${where}.value must be a number` }
  return { label: v.label.trim(), value: v.value }
}

function parseChartSeries(v: unknown, where: string): InsightsChartSeries | { error: string } {
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.name)) return { error: `${where}.name must be a non-empty string` }
  if (!Array.isArray(v.data) || v.data.length === 0) {
    return { error: `${where}.data must be a non-empty array` }
  }
  const data: InsightsChartPoint[] = []
  for (let i = 0; i < v.data.length; i++) {
    const p = parseChartPoint(v.data[i], `${where}.data[${i}]`)
    if ('error' in p) return p
    data.push(p)
  }
  return { name: v.name.trim(), data }
}

function parseChart(v: unknown, index: number): InsightsChart | { error: string } {
  const where = `charts[${index}]`
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.id)) return { error: `${where}.id must be a non-empty string` }
  if (!nonEmptyString(v.title)) return { error: `${where}.title must be a non-empty string` }
  if (typeof v.type !== 'string' || !CHART_TYPES.includes(v.type as InsightsChartType)) {
    return {
      error: `${where}.type must be one of ${CHART_TYPES.join(', ')} (got ${JSON.stringify(v.type)})`,
    }
  }
  if (v.unit !== undefined && typeof v.unit !== 'string') {
    return { error: `${where}.unit must be a string` }
  }
  if (!Array.isArray(v.series) || v.series.length === 0) {
    return { error: `${where}.series must be a non-empty array` }
  }
  const series: InsightsChartSeries[] = []
  for (let i = 0; i < v.series.length; i++) {
    const s = parseChartSeries(v.series[i], `${where}.series[${i}]`)
    if ('error' in s) return s
    series.push(s)
  }
  return {
    id: v.id.trim(),
    title: v.title.trim(),
    type: v.type as InsightsChartType,
    unit: v.unit as string | undefined,
    series,
  }
}

/**
 * Parse and validate raw LLM output text against the insights schema.
 * Accepts JSON with or without a ```fence```, tolerates leading/trailing
 * prose around the object, and never throws — every failure path returns a
 * precise "which field, what was expected" message instead of a stack trace.
 */
export function parseInsightsResponse(text: string): InsightsParseResult {
  const fenceStripped = stripFences(text)
  if (!fenceStripped) return { ok: false, error: 'Paste the JSON your LLM produced.' }

  const candidate = extractJsonObject(fenceStripped)

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid JSON'
    return { ok: false, error: `Not valid JSON — ${msg}` }
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: 'Expected a JSON object with "schema_version", "verdict", "findings" and "charts".',
    }
  }

  if (parsed.schema_version !== INSIGHTS_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schema_version mismatch — expected ${INSIGHTS_SCHEMA_VERSION}, got ${JSON.stringify(parsed.schema_version)}. Regenerate the prompt and re-run the LLM.`,
    }
  }

  if (!nonEmptyString(parsed.verdict)) {
    return { ok: false, error: '"verdict" must be a non-empty string.' }
  }

  if (!Array.isArray(parsed.findings) || parsed.findings.length === 0) {
    return { ok: false, error: '"findings" must be a non-empty array.' }
  }
  const findings: InsightsFinding[] = []
  for (let i = 0; i < parsed.findings.length; i++) {
    const f = parseFinding(parsed.findings[i], i)
    if ('error' in f) return { ok: false, error: f.error }
    findings.push(f)
  }

  const chartsRaw = parsed.charts ?? []
  if (!Array.isArray(chartsRaw)) {
    return { ok: false, error: '"charts" must be an array (it may be empty).' }
  }
  const charts: InsightsChart[] = []
  for (let i = 0; i < chartsRaw.length; i++) {
    const c = parseChart(chartsRaw[i], i)
    if ('error' in c) return { ok: false, error: c.error }
    charts.push(c)
  }

  return {
    ok: true,
    payload: {
      schema_version: INSIGHTS_SCHEMA_VERSION,
      verdict: parsed.verdict.trim(),
      findings,
      charts,
    },
  }
}
