import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import {
  previewStatement,
  importStatement,
  previewStatementText,
  importStatementText,
  createRawTransaction,
  getRawTransactions,
  deleteRawTransaction,
} from '../lib/api'
import { getIgnoreRules, matchesAnyRule } from '../lib/ignoreRules'
import type { ImportResponse, PreviewResponse } from '../types/transaction'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { useToastContext } from '../hooks/useToastContext'

type UploadMode = 'pdf' | 'paste' | 'manual'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

function rowSig(date: string, description: string, amount: string | number) {
  return `${date.slice(0, 10)}||${description}||${parseFloat(String(amount)).toFixed(2)}`
}

const TABS: { id: UploadMode; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'paste', label: 'Paste' },
  { id: 'manual', label: 'Manual' },
]

export function UploadPage() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<UploadMode>('pdf')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [fileError, setFileError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())
  const [dupeIndices, setDupeIndices] = useState<Set<number>>(new Set())
  const [skippedExpanded, setSkippedExpanded] = useState(false)

  const [pasteText, setPasteText] = useState('')

  const [manualDate, setManualDate] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})

  async function handlePreviewSuccess(data: PreviewResponse) {
    setPreview(data)

    const rows = data.rows
    const ignoreRules = getIgnoreRules()
    const autoExcluded = new Set(
      rows.reduce<number[]>((acc, r, i) => {
        if (matchesAnyRule(r.description, ignoreRules)) acc.push(i)
        return acc
      }, [])
    )
    setExcludedIndices(autoExcluded)

    const sigCount = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const sig = rowSig(r.txn_date, r.description, r.amount)
      const existing = sigCount.get(sig) ?? []
      sigCount.set(sig, [...existing, i])
    })
    const intraDupes = new Set<number>()
    sigCount.forEach((indices) => {
      if (indices.length > 1) indices.forEach((i) => intraDupes.add(i))
    })

    const monthPairs = [
      ...new Map(
        rows.map((r) => {
          const d = new Date(r.txn_date)
          return [
            `${d.getFullYear()}-${d.getMonth() + 1}`,
            { year: d.getFullYear(), month: d.getMonth() + 1 },
          ]
        })
      ).values(),
    ]

    const existingSigs = new Set<string>()
    try {
      const results = await Promise.all(
        monthPairs.map(({ year, month }) => getRawTransactions(year, month))
      )
      results.flat().forEach((t) => {
        existingSigs.add(rowSig(t.txn_date, t.description, t.amount))
      })
    } catch {
      // best-effort
    }

    const dbDupes = new Set<number>()
    rows.forEach((r, i) => {
      if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
    })

    const allDupes = new Set([...intraDupes, ...dbDupes])
    setDupeIndices(allDupes)
  }

  function handleImportSuccess(data: ImportResponse) {
    if (excludedIndices.size > 0 && allRows.length > 0) {
      const excludedRows = allRows.filter((_, i) => excludedIndices.has(i))
      data.rows.forEach((imported) => {
        const match = excludedRows.find(
          (ex) =>
            ex.txn_date.slice(0, 10) === imported.txn_date.slice(0, 10) &&
            ex.description === imported.description &&
            ex.amount === imported.amount
        )
        if (match) void deleteRawTransaction(imported.id)
      })
    }
    toast.success(`${data.inserted} transactions imported, ${data.skipped} skipped`)
    navigate('/review')
  }

  const previewMutation = useMutation({
    mutationFn: previewStatement,
    onSuccess: handlePreviewSuccess,
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function handleImportError(err: { detail: string; status?: number }) {
    if (err.status === 409)
      toast.error(
        'This statement has already been imported. Delete the existing raw transactions if you want to re-import.'
      )
    else toast.error(err.detail)
  }

  const importMutation = useMutation({
    mutationFn: importStatement,
    onSuccess: handleImportSuccess,
    onError: handleImportError,
  })

  const pastePreviewMutation = useMutation({
    mutationFn: () => previewStatementText(pasteText),
    onSuccess: handlePreviewSuccess,
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const pasteImportMutation = useMutation({
    mutationFn: () => importStatementText(pasteText),
    onSuccess: handleImportSuccess,
    onError: handleImportError,
  })

  const manualMutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: `${manualDate}T00:00:00`,
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
      }),
    onSuccess: () => {
      toast.success('Transaction added')
      navigate('/review')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function validateAndPreview(f: File) {
    if (f.type !== 'application/pdf') {
      setFileError('Only PDF files are supported.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError('File size must be under 10MB.')
      return
    }
    setFileError('')
    setFile(f)
    previewMutation.mutate(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndPreview(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndPreview(f)
  }

  function handleCancel() {
    setFile(null)
    setPreview(null)
    setFileError('')
    setSearchQuery('')
    setDateFilter('')
    setExcludedIndices(new Set())
    setDupeIndices(new Set())
    setPasteText('')
    setManualDate('')
    setManualDesc('')
    setManualAmount('')
    setManualErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleTabSwitch(newMode: UploadMode) {
    if (newMode === mode) return
    handleCancel()
    setMode(newMode)
  }

  function toggleExclude(globalIndex: number) {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(globalIndex)) next.delete(globalIndex)
      else next.add(globalIndex)
      return next
    })
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!manualDate) errors.date = 'Date is required'
    if (!manualDesc.trim()) errors.desc = 'Description is required'
    const amt = parseFloat(manualAmount)
    if (!manualAmount || isNaN(amt) || amt <= 0) errors.amount = 'Enter a valid positive amount'
    setManualErrors(errors)
    if (Object.keys(errors).length === 0) manualMutation.mutate()
  }

  const allRows = preview?.rows ?? []
  const uniqueDates = [...new Set(allRows.map((r) => r.txn_date.slice(0, 10)))].sort()

  const filteredRows = allRows
    .map((r, i) => ({ row: r, globalIndex: i }))
    .filter(({ row }) => {
      const matchesDate = !dateFilter || row.txn_date.slice(0, 10) === dateFilter
      const matchesSearch =
        !searchQuery || row.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesDate && matchesSearch
    })

  const readyCount = (preview?.would_insert ?? 0) - excludedIndices.size
  const isImporting = importMutation.isPending || pasteImportMutation.isPending

  function handleConfirmImport() {
    if (mode === 'pdf' && file) importMutation.mutate(file)
    else if (mode === 'paste') pasteImportMutation.mutate()
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="card-eyebrow">Upload</p>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Import transactions
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Upload a PDF, paste copied bank text, or add a transaction manually.
        </p>
      </header>

      {!preview && (
        <div className="seg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={mode === tab.id ? 'on' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* PDF mode */}
      {mode === 'pdf' && !preview && (
        <div className="card">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`dropzone ${dragOver ? 'hot' : ''}`}
          >
            {previewMutation.isPending ? (
              <>
                <span
                  className="material-symbols-outlined animate-spin"
                  style={{ fontSize: 22, color: 'var(--ink-3)' }}
                >
                  progress_activity
                </span>
                <p className="mt-3 text-[13px] font-medium" style={{ color: 'var(--ink-2)' }}>
                  Parsing your statement…
                </p>
              </>
            ) : (
              <>
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
                >
                  Drop your statement here
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                  Parsed in memory · no file stored. PDFs up to 10MB.
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select file
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Choose PDF file"
                />
              </>
            )}
          </div>
          {fileError && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--neg)' }}>
              {fileError}
            </p>
          )}
        </div>
      )}

      {/* Paste mode */}
      {mode === 'paste' && !preview && (
        <div className="card space-y-3">
          <div>
            <p className="card-title">Paste your bank statement text</p>
            <p className="card-sub mt-0.5">
              Copy transactions from your bank&apos;s website and paste them below. Supports HDFC
              credit card format.
            </p>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            className="textarea mono"
            style={{ fontSize: 11.5 }}
            placeholder={`04 Apr 2026\nBlinkit Gurgaon I\n₹449.00\tdebit icon`}
            aria-label="Paste bank statement text"
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => pastePreviewMutation.mutate()}
              loading={pastePreviewMutation.isPending}
              disabled={!pasteText.trim()}
            >
              Parse &amp; preview
            </Button>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && !preview && (
        <div className="card">
          <p className="card-title mb-3">Enter transaction details</p>
          <form onSubmit={handleManualSubmit} className="max-w-md space-y-3">
            <div>
              <label className="eyebrow mb-1 block">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="input"
                aria-label="Transaction date"
              />
              {manualErrors.date && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                  {manualErrors.date}
                </p>
              )}
            </div>
            <div>
              <label className="eyebrow mb-1 block">Description</label>
              <input
                type="text"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="e.g. Blinkit Gurgaon"
                className="input"
                aria-label="Transaction description"
              />
              {manualErrors.desc && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                  {manualErrors.desc}
                </p>
              )}
            </div>
            <div>
              <label className="eyebrow mb-1 block">Amount (₹)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="input num"
                aria-label="Transaction amount"
              />
              {manualErrors.amount && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                  {manualErrors.amount}
                </p>
              )}
            </div>
            <div className="pt-1">
              <Button variant="primary" type="submit" loading={manualMutation.isPending}>
                Add transaction
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-[15px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
              >
                Preview
              </h2>
              <Chip variant="success">{readyCount} ready</Chip>
              {preview.skipped > 0 && <Chip variant="warning">{preview.skipped} skipped</Chip>}
              {excludedIndices.size > 0 && (
                <Chip variant="warning">{excludedIndices.size} excluded</Chip>
              )}
              {dupeIndices.size > 0 && (
                <Chip variant="warning">
                  {dupeIndices.size} duplicate{dupeIndices.size > 1 ? 's' : ''}
                </Chip>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="tertiary" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                loading={isImporting}
              >
                Import {readyCount}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <span
                className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                style={{ fontSize: 14, color: 'var(--ink-4)' }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description…"
                className="input"
                style={{ paddingLeft: 28 }}
                aria-label="Search descriptions"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input"
              style={{ width: 'auto' }}
              aria-label="Filter by date"
            >
              <option value="">All dates</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {(searchQuery || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDateFilter('')
                }}
                className="btn ghost sm"
              >
                Clear
              </button>
            )}
          </div>

          <div className="card card-flush overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="num">Amount</th>
                    <th style={{ width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center" style={{ color: 'var(--ink-3)' }}>
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ row: txn, globalIndex }) => {
                      const isExcluded = excludedIndices.has(globalIndex)
                      const isDupe = dupeIndices.has(globalIndex)
                      return (
                        <tr
                          key={globalIndex}
                          style={{
                            opacity: isExcluded ? 0.4 : 1,
                            background: isDupe && !isExcluded ? 'var(--warn-soft)' : undefined,
                          }}
                        >
                          <td className="num" style={{ color: 'var(--ink-3)' }}>
                            <span
                              style={{ textDecoration: isExcluded ? 'line-through' : undefined }}
                            >
                              {txn.txn_date.slice(0, 10)}
                            </span>
                          </td>
                          <td style={{ color: 'var(--ink)' }}>
                            <span
                              style={{ textDecoration: isExcluded ? 'line-through' : undefined }}
                            >
                              {txn.description}
                            </span>
                            {isDupe && !isExcluded && (
                              <span
                                className="chip warn ml-2"
                                style={{ height: 18, padding: '0 6px', fontSize: 9.5 }}
                                title="Possible duplicate — same date, description, and amount"
                              >
                                duplicate
                              </span>
                            )}
                          </td>
                          <td className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                            <span
                              style={{ textDecoration: isExcluded ? 'line-through' : undefined }}
                            >
                              {formatCurrency(Number(txn.amount))}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => toggleExclude(globalIndex)}
                              className="btn ghost icon sm"
                              aria-label={
                                isExcluded ? 'Include transaction' : 'Exclude transaction'
                              }
                              title={
                                isExcluded ? 'Restore — include in import' : 'Exclude from import'
                              }
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {isExcluded ? 'undo' : 'remove_circle'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div
              className="px-4 py-2.5 text-[11.5px]"
              style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}
            >
              Showing {filteredRows.length} of {allRows.length} transactions
            </div>
          </div>

          {(preview.skipped_rows?.length ?? 0) > 0 && (
            <div className="card card-flush overflow-hidden">
              <button
                onClick={() => setSkippedExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14, color: 'var(--warn)' }}
                  >
                    warning
                  </span>
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>
                    {preview.skipped_rows.length} row
                    {preview.skipped_rows.length > 1 ? 's' : ''} skipped during parsing
                  </span>
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: 'var(--ink-4)' }}
                >
                  {skippedExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {skippedExpanded && (
                <ul
                  className="space-y-1 px-4 pt-2 pb-3"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  {preview.skipped_rows.map((row, i) => (
                    <li
                      key={i}
                      className="mono truncate text-[11px]"
                      style={{ color: 'var(--ink-3)' }}
                    >
                      {row}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
