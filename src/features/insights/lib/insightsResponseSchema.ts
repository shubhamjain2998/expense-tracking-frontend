/**
 * The versioned JSON contract for an LLM's insights reply, plus a defensive
 * parser. Mirrors the idiom of `src/features/upload/lib/bulkPasteSchema.ts`
 * (the user explicitly asked for "just like how import works today") and the
 * backend's `InsightsPayload` in `backend/app/schemas.py` — the two must be
 * bumped in lockstep.
 *
 * v2 exists because v1 asked the LLM for little more than the app could
 * already draw: a verdict, a list of observations and some chart specs. The
 * LLM understands the data, so v2 asks it for the *interpretation* a normal
 * user would miss — derived ratios (`metrics`), consequence and next step on
 * every finding (`so_what` / `action` / `annual_impact`), behavioural
 * regularities (`patterns`), a forward look (`projection`), a one-line
 * takeaway per chart, and the things the numbers genuinely can't settle
 * (`questions`).
 *
 * Every string here is untrusted, hand-pasted content: the parser only ever
 * hands back plain strings/numbers, never anything the page could render as
 * markup. The page is responsible for rendering it as text (see page.tsx).
 */

export const INSIGHTS_SCHEMA_VERSION = 2

export type InsightsSeverity = 'critical' | 'warning' | 'info' | 'good'
export type InsightsChartType = 'bar' | 'line' | 'pie' | 'area'
export type InsightsConfidence = 'high' | 'medium' | 'low'
export type InsightsDirection = 'up' | 'down' | 'flat'
/** Whether a metric's direction is good or bad news. The app can't know —
 *  "commitments up" is bad, "savings rate up" is good — so the LLM says. */
export type InsightsTone = 'positive' | 'negative' | 'neutral'

const SEVERITIES: InsightsSeverity[] = ['critical', 'warning', 'info', 'good']
const CHART_TYPES: InsightsChartType[] = ['bar', 'line', 'pie', 'area']
const CONFIDENCES: InsightsConfidence[] = ['high', 'medium', 'low']
const DIRECTIONS: InsightsDirection[] = ['up', 'down', 'flat']
const TONES: InsightsTone[] = ['positive', 'negative', 'neutral']

export interface InsightsFigure {
  label: string
  value: number
  unit?: string
}

/** A derived measure the app never computes itself — savings rate, committed
 *  share of income, spend concentration — with the LLM's reading of it. */
export interface InsightsMetric {
  id: string
  label: string
  value: number
  unit?: string
  direction?: InsightsDirection
  tone?: InsightsTone
  detail: string
}

/** The before/after pair a finding is about, as numbers rather than prose, so
 *  the app can draw the change instead of making the reader parse two figures
 *  out of a sentence. */
export interface InsightsComparison {
  label: string
  from: number
  to: number
  unit?: string
}

export interface InsightsFinding {
  id: string
  title: string
  severity: InsightsSeverity
  detail: string
  /** The consequence — why this matters in money or in months. Required:
   *  it is the whole reason v2 exists. */
  so_what: string
  action?: string
  /** What acting on this is worth over a year, in the ledger's currency. */
  annual_impact?: number
  confidence?: InsightsConfidence
  figure?: InsightsFigure
  comparison?: InsightsComparison
}

/** A behavioural regularity — timing, trigger, sequence — that no per-category
 *  total shows. Distinct from a finding: it needs no decision. */
export interface InsightsPattern {
  id: string
  title: string
  detail: string
  evidence?: string
}

/** A forward look: what the next month or the rest of the year implies. */
export interface InsightsProjection {
  label: string
  value: number
  unit?: string
  basis: string
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
  /** One line saying what to actually see in this chart. */
  takeaway?: string
  series: InsightsChartSeries[]
}

export interface InsightsPayload {
  schema_version: number
  verdict: string
  metrics: InsightsMetric[]
  findings: InsightsFinding[]
  patterns: InsightsPattern[]
  projection?: InsightsProjection
  charts: InsightsChart[]
  questions: string[]
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

/** Optional plain string: absent is fine, present-but-not-a-string is not. */
function parseOptionalString(v: unknown, where: string): string | undefined | { error: string } {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') return { error: `${where} must be a string` }
  const trimmed = v.trim()
  return trimmed === '' ? undefined : trimmed
}

function parseOptionalEnum<T extends string>(
  v: unknown,
  allowed: T[],
  where: string
): T | undefined | { error: string } {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    return { error: `${where} must be one of ${allowed.join(', ')} (got ${JSON.stringify(v)})` }
  }
  return v as T
}

function parseOptionalNumber(v: unknown, where: string): number | undefined | { error: string } {
  if (v === undefined || v === null) return undefined
  if (!isFiniteNumber(v)) return { error: `${where} must be a number` }
  return v
}

function isError(v: unknown): v is { error: string } {
  return isRecord(v) && typeof v.error === 'string'
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

function parseComparison(
  v: unknown,
  where: string
): InsightsComparison | undefined | { error: string } {
  if (v === undefined || v === null) return undefined
  if (!isRecord(v)) return { error: `${where}.comparison must be an object` }
  if (!nonEmptyString(v.label)) {
    return { error: `${where}.comparison.label must be a non-empty string` }
  }
  if (!isFiniteNumber(v.from)) return { error: `${where}.comparison.from must be a number` }
  if (!isFiniteNumber(v.to)) return { error: `${where}.comparison.to must be a number` }
  const unit = parseOptionalString(v.unit, `${where}.comparison.unit`)
  if (isError(unit)) return unit
  return { label: v.label.trim(), from: v.from, to: v.to, unit }
}

function parseMetric(v: unknown, index: number): InsightsMetric | { error: string } {
  const where = `metrics[${index}]`
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.id)) return { error: `${where}.id must be a non-empty string` }
  if (!nonEmptyString(v.label)) return { error: `${where}.label must be a non-empty string` }
  if (!isFiniteNumber(v.value)) return { error: `${where}.value must be a number` }
  if (!nonEmptyString(v.detail)) {
    return { error: `${where}.detail must be a non-empty string — say what this number means` }
  }
  const unit = parseOptionalString(v.unit, `${where}.unit`)
  if (isError(unit)) return unit
  const direction = parseOptionalEnum(v.direction, DIRECTIONS, `${where}.direction`)
  if (isError(direction)) return direction
  const tone = parseOptionalEnum(v.tone, TONES, `${where}.tone`)
  if (isError(tone)) return tone
  return {
    id: v.id.trim(),
    label: v.label.trim(),
    value: v.value,
    detail: v.detail.trim(),
    unit,
    direction,
    tone,
  }
}

function parseFinding(v: unknown, index: number): InsightsFinding | { error: string } {
  const where = `findings[${index}]`
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.id)) return { error: `${where}.id must be a non-empty string` }
  if (!nonEmptyString(v.title)) return { error: `${where}.title must be a non-empty string` }
  if (!nonEmptyString(v.detail)) return { error: `${where}.detail must be a non-empty string` }
  if (!nonEmptyString(v.so_what)) {
    return {
      error: `${where}.so_what must be a non-empty string — say what this costs or changes, not just what happened`,
    }
  }
  if (typeof v.severity !== 'string' || !SEVERITIES.includes(v.severity as InsightsSeverity)) {
    return {
      error: `${where}.severity must be one of ${SEVERITIES.join(', ')} (got ${JSON.stringify(v.severity)})`,
    }
  }
  const action = parseOptionalString(v.action, `${where}.action`)
  if (isError(action)) return action
  const annualImpact = parseOptionalNumber(v.annual_impact, `${where}.annual_impact`)
  if (isError(annualImpact)) return annualImpact
  const confidence = parseOptionalEnum(v.confidence, CONFIDENCES, `${where}.confidence`)
  if (isError(confidence)) return confidence
  const figure = parseFigure(v.figure, where)
  if (isError(figure)) return figure
  const comparison = parseComparison(v.comparison, where)
  if (isError(comparison)) return comparison
  return {
    id: v.id.trim(),
    title: v.title.trim(),
    detail: v.detail.trim(),
    so_what: v.so_what.trim(),
    severity: v.severity as InsightsSeverity,
    action,
    annual_impact: annualImpact,
    confidence,
    figure,
    comparison,
  }
}

function parsePattern(v: unknown, index: number): InsightsPattern | { error: string } {
  const where = `patterns[${index}]`
  if (!isRecord(v)) return { error: `${where} must be an object` }
  if (!nonEmptyString(v.id)) return { error: `${where}.id must be a non-empty string` }
  if (!nonEmptyString(v.title)) return { error: `${where}.title must be a non-empty string` }
  if (!nonEmptyString(v.detail)) return { error: `${where}.detail must be a non-empty string` }
  const evidence = parseOptionalString(v.evidence, `${where}.evidence`)
  if (isError(evidence)) return evidence
  return { id: v.id.trim(), title: v.title.trim(), detail: v.detail.trim(), evidence }
}

function parseProjection(v: unknown): InsightsProjection | undefined | { error: string } {
  if (v === undefined || v === null) return undefined
  if (!isRecord(v)) return { error: '"projection" must be an object' }
  if (!nonEmptyString(v.label)) return { error: 'projection.label must be a non-empty string' }
  if (!isFiniteNumber(v.value)) return { error: 'projection.value must be a number' }
  if (!nonEmptyString(v.basis)) {
    return {
      error: 'projection.basis must be a non-empty string — say what the projection rests on',
    }
  }
  const unit = parseOptionalString(v.unit, 'projection.unit')
  if (isError(unit)) return unit
  return { label: v.label.trim(), value: v.value, basis: v.basis.trim(), unit }
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
  const takeaway = parseOptionalString(v.takeaway, `${where}.takeaway`)
  if (isError(takeaway)) return takeaway
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
    takeaway,
    series,
  }
}

/**
 * Parse and validate raw LLM output text against the insights schema.
 * Accepts JSON with or without a ```fence```, tolerates leading/trailing
 * prose around the object, and never throws — every failure path returns a
 * precise "which field, what was expected" message instead of a stack trace.
 *
 * `metrics`, `patterns`, `questions` and `charts` may all be omitted or
 * empty: a reply that skips a whole section still renders. `verdict`,
 * `findings` and each finding's `so_what` are the floor.
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
      error:
        'Expected a JSON object with "schema_version", "verdict", "metrics", "findings", "patterns" and "charts".',
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

  const metricsRaw = parsed.metrics ?? []
  if (!Array.isArray(metricsRaw)) {
    return { ok: false, error: '"metrics" must be an array (it may be empty).' }
  }
  const metrics: InsightsMetric[] = []
  for (let i = 0; i < metricsRaw.length; i++) {
    const m = parseMetric(metricsRaw[i], i)
    if ('error' in m) return { ok: false, error: m.error }
    metrics.push(m)
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

  const patternsRaw = parsed.patterns ?? []
  if (!Array.isArray(patternsRaw)) {
    return { ok: false, error: '"patterns" must be an array (it may be empty).' }
  }
  const patterns: InsightsPattern[] = []
  for (let i = 0; i < patternsRaw.length; i++) {
    const p = parsePattern(patternsRaw[i], i)
    if ('error' in p) return { ok: false, error: p.error }
    patterns.push(p)
  }

  const projection = parseProjection(parsed.projection)
  if (isError(projection)) return { ok: false, error: projection.error }

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

  const questionsRaw = parsed.questions ?? []
  if (!Array.isArray(questionsRaw)) {
    return { ok: false, error: '"questions" must be an array of strings (it may be empty).' }
  }
  const questions: string[] = []
  for (let i = 0; i < questionsRaw.length; i++) {
    const q = questionsRaw[i]
    if (!nonEmptyString(q)) {
      return { ok: false, error: `questions[${i}] must be a non-empty string` }
    }
    questions.push(q.trim())
  }

  return {
    ok: true,
    payload: {
      schema_version: INSIGHTS_SCHEMA_VERSION,
      verdict: parsed.verdict.trim(),
      metrics,
      findings,
      patterns,
      projection,
      charts,
      questions,
    },
  }
}
