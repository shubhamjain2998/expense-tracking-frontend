import { INSIGHTS_SCHEMA_VERSION, parseInsightsResponse } from './insightsResponseSchema'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: INSIGHTS_SCHEMA_VERSION,
    verdict: 'Dining grew faster than income this quarter.',
    metrics: [
      {
        id: 'savings-rate',
        label: 'Savings rate, last 3 months',
        value: 14,
        unit: '%',
        direction: 'down',
        tone: 'negative',
        detail: 'Down from 23% across the 12 months before that.',
      },
    ],
    findings: [
      {
        id: 'dining-up',
        title: 'Dining is trending up',
        severity: 'warning',
        detail: 'Dining rose from ₹8,200 to ₹9,900/mo.',
        so_what: 'At this rate dining costs ₹20,400 more over a year.',
        action: 'Check whether delivery fees explain the jump.',
        annual_impact: 20400,
        confidence: 'high',
        figure: { label: 'Median dining/mo', value: 9900, unit: 'INR' },
      },
    ],
    patterns: [
      {
        id: 'post-credit-burst',
        title: 'The days after salary lands cost the most',
        detail: 'Discretionary spend runs 2.4x the daily average for 3 days.',
        evidence: '₹3,180/day vs ₹1,320/day.',
      },
    ],
    projection: {
      label: 'Projected spend, next month',
      value: 84500,
      unit: 'INR',
      basis: 'Median of the last 6 months plus two repriced commitments.',
    },
    questions: ['Was June’s travel charge a one-off?'],
    charts: [
      {
        id: 'dining-trend',
        title: 'Dining by month',
        type: 'bar',
        unit: 'INR',
        takeaway: 'The rise starts in May, not in June.',
        series: [
          {
            name: 'Dining',
            data: [
              { label: 'Apr', value: 8100 },
              { label: 'May', value: 9900 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('parseInsightsResponse', () => {
  it('accepts a well-formed payload', () => {
    const r = parseInsightsResponse(JSON.stringify(validPayload()))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.verdict).toContain('Dining')
    expect(r.payload.findings).toHaveLength(1)
    expect(r.payload.charts[0].type).toBe('bar')
  })

  it('strips a ```json fence', () => {
    const fenced = '```json\n' + JSON.stringify(validPayload()) + '\n```'
    const r = parseInsightsResponse(fenced)
    expect(r.ok).toBe(true)
  })

  it('tolerates leading and trailing prose around the object', () => {
    const wrapped = `Sure, here's the analysis:\n\n${JSON.stringify(validPayload())}\n\nHope that helps!`
    const r = parseInsightsResponse(wrapped)
    expect(r.ok).toBe(true)
  })

  it('accepts an empty charts array', () => {
    const r = parseInsightsResponse(JSON.stringify(validPayload({ charts: [] })))
    expect(r.ok).toBe(true)
  })

  it('rejects empty input with a human message', () => {
    const r = parseInsightsResponse('   ')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('Paste')
  })

  it('rejects invalid JSON with the JSON parser message, not a stack trace', () => {
    const r = parseInsightsResponse('{not json')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('Not valid JSON')
    expect(r.error).not.toContain('at Object')
  })

  it('rejects a schema_version mismatch by name', () => {
    const r = parseInsightsResponse(JSON.stringify(validPayload({ schema_version: 99 })))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('schema_version')
    expect(r.error).toContain('99')
  })

  it('rejects a missing verdict, naming the field', () => {
    const bad = validPayload()
    delete (bad as Record<string, unknown>).verdict
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('verdict')
  })

  it('rejects empty findings', () => {
    const r = parseInsightsResponse(JSON.stringify(validPayload({ findings: [] })))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('findings')
  })

  it('rejects an unknown severity, naming the field and index', () => {
    const bad = validPayload()
    ;(bad.findings as Record<string, unknown>[])[0].severity = 'catastrophic'
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('findings[0].severity')
  })

  it('rejects an unknown chart type the app cannot draw', () => {
    const bad = validPayload()
    ;(bad.charts as Record<string, unknown>[])[0].type = 'donut'
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('charts[0].type')
  })

  it('rejects a chart series with no data points', () => {
    const bad = validPayload()
    ;(bad.charts as Record<string, unknown>[])[0].series = [{ name: 'Dining', data: [] }]
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('series[0].data')
  })

  it('rejects a finding missing a required field with a precise pointer', () => {
    const bad = validPayload()
    delete (bad.findings as Record<string, unknown>[])[0].title
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('findings[0].title')
  })

  it('keeps every interpretation field the LLM supplied', () => {
    const r = parseInsightsResponse(JSON.stringify(validPayload()))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.metrics[0].tone).toBe('negative')
    expect(r.payload.findings[0].so_what).toContain('₹20,400')
    expect(r.payload.findings[0].annual_impact).toBe(20400)
    expect(r.payload.findings[0].confidence).toBe('high')
    expect(r.payload.patterns[0].evidence).toContain('₹3,180')
    expect(r.payload.projection?.value).toBe(84500)
    expect(r.payload.charts[0].takeaway).toContain('starts in May')
    expect(r.payload.questions).toHaveLength(1)
  })

  it('rejects a finding that states what happened but not what it costs', () => {
    const bad = validPayload()
    delete (bad.findings as Record<string, unknown>[])[0].so_what
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('findings[0].so_what')
  })

  it('rejects a metric with no reading of its own number', () => {
    const bad = validPayload()
    delete (bad.metrics as Record<string, unknown>[])[0].detail
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('metrics[0].detail')
  })

  it('rejects an unknown metric tone', () => {
    const bad = validPayload()
    ;(bad.metrics as Record<string, unknown>[])[0].tone = 'catastrophic'
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('metrics[0].tone')
  })

  it('rejects a projection with no stated basis', () => {
    const bad = validPayload()
    delete (bad.projection as Record<string, unknown>).basis
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('projection.basis')
  })

  it('accepts a reply that omits every optional section', () => {
    const bare = validPayload()
    for (const key of ['metrics', 'patterns', 'projection', 'questions', 'charts']) {
      delete (bare as Record<string, unknown>)[key]
    }
    const r = parseInsightsResponse(JSON.stringify(bare))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.metrics).toEqual([])
    expect(r.payload.patterns).toEqual([])
    expect(r.payload.questions).toEqual([])
    expect(r.payload.projection).toBeUndefined()
  })

  it('drops an empty optional string rather than rendering a blank line', () => {
    const bad = validPayload()
    ;(bad.findings as Record<string, unknown>[])[0].action = '   '
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.findings[0].action).toBeUndefined()
  })

  it('never crashes on a hostile / non-object payload', () => {
    const r = parseInsightsResponse('[1,2,3]')
    expect(r.ok).toBe(false)
  })

  it('treats an injected HTML string as inert plain text, not a parse error', () => {
    const bad = validPayload()
    ;(bad.findings as Record<string, unknown>[])[0].detail = '<img src=x onerror=alert(1)>'
    const r = parseInsightsResponse(JSON.stringify(bad))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.findings[0].detail).toBe('<img src=x onerror=alert(1)>')
  })
})
