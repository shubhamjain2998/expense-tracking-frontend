import { INSIGHTS_SCHEMA_VERSION, parseInsightsResponse } from './insightsResponseSchema'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: INSIGHTS_SCHEMA_VERSION,
    verdict: 'Dining grew faster than income this quarter.',
    findings: [
      {
        id: 'dining-up',
        title: 'Dining is trending up',
        severity: 'warning',
        detail: 'Dining rose from ₹8,200 to ₹9,900/mo.',
        figure: { label: 'Median dining/mo', value: 9900, unit: 'INR' },
      },
    ],
    charts: [
      {
        id: 'dining-trend',
        title: 'Dining by month',
        type: 'bar',
        unit: 'INR',
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
