import {
  BULK_PASTE_MAX_ROWS,
  BULK_PASTE_SCHEMA_VERSION,
  parseBulkPasteJson,
} from './bulkPasteSchema'

function payload(rows: unknown[], version: unknown = BULK_PASTE_SCHEMA_VERSION): string {
  return JSON.stringify({ schema_version: version, rows })
}

const validRow = {
  txn_date: '2026-05-10',
  description: 'Blinkit Gurgaon',
  amount: 245.5,
}

describe('parseBulkPasteJson', () => {
  it('accepts a well-formed payload and trims descriptions', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, description: '  Swiggy  ' }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].description).toBe('Swiggy')
    expect(result.rows[0].amount).toBe(245.5)
  })

  it('strips ```json … ``` fences before parsing', () => {
    const fenced = '```json\n' + payload([validRow]) + '\n```'
    const result = parseBulkPasteJson(fenced)
    expect(result.ok).toBe(true)
  })

  it('ignores extra fields like txn_type without failing', () => {
    // LLMs pinned to older versions of the prompt may still emit txn_type;
    // we don't use it on import, but extra fields should not break validation.
    const result = parseBulkPasteJson(payload([{ ...validRow, txn_type: 'transfer' }]))
    expect(result.ok).toBe(true)
  })

  it('accepts negative amount (money in)', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, amount: -1200 }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0].amount).toBe(-1200)
  })

  it('rejects empty string', () => {
    const result = parseBulkPasteJson('   ')
    expect(result.ok).toBe(false)
  })

  it('rejects invalid JSON', () => {
    const result = parseBulkPasteJson('{not json')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/not valid json/i)
  })

  it('rejects schema_version mismatch', () => {
    const result = parseBulkPasteJson(payload([validRow], 999))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/schema_version/i)
  })

  it('rejects non-array rows', () => {
    const result = parseBulkPasteJson(
      JSON.stringify({ schema_version: BULK_PASTE_SCHEMA_VERSION, rows: 'oops' })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects empty rows array', () => {
    const result = parseBulkPasteJson(payload([]))
    expect(result.ok).toBe(false)
  })

  it('rejects payloads above the row cap', () => {
    const rows = Array.from({ length: BULK_PASTE_MAX_ROWS + 1 }, () => validRow)
    const result = parseBulkPasteJson(payload(rows))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/too many rows/i)
  })

  it('rejects non-ISO txn_date', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, txn_date: '10-05-2026' }]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/txn_date/i)
  })

  it('rejects amount of zero', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, amount: 0 }]))
    expect(result.ok).toBe(false)
  })

  it('rejects amount as string', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, amount: '245.50' }]))
    expect(result.ok).toBe(false)
  })

  it('rejects empty description', () => {
    const result = parseBulkPasteJson(payload([{ ...validRow, description: '   ' }]))
    expect(result.ok).toBe(false)
  })

  it('reports the offending row number', () => {
    const result = parseBulkPasteJson(payload([validRow, { ...validRow, amount: 'bad' }, validRow]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/row 2/i)
  })
})
