import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import {
  previewStatement,
  importStatement,
  getRawTransactions,
  deleteRawTransaction,
} from '../lib/api'
import type { PreviewResponse } from '../types/transaction'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { useToastContext } from '../hooks/useToastContext'

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

export function UploadPage() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [fileError, setFileError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())
  const [dupeIndices, setDupeIndices] = useState<Set<number>>(new Set())

  const previewMutation = useMutation({
    mutationFn: previewStatement,
    onSuccess: async (data) => {
      setPreview(data)
      setExcludedIndices(new Set())

      const rows = data.rows

      // Intra-batch duplicate detection
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

      // Cross-import duplicate detection (compare against DB)
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
        // Silently ignore — duplicate detection is best-effort
      }

      const dbDupes = new Set<number>()
      rows.forEach((r, i) => {
        if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
      })

      const allDupes = new Set([...intraDupes, ...dbDupes])
      setDupeIndices(allDupes)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const importMutation = useMutation({
    mutationFn: importStatement,
    onSuccess: (data) => {
      // Auto-delete any rows the user excluded from the preview
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleExclude(globalIndex: number) {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(globalIndex)) next.delete(globalIndex)
      else next.add(globalIndex)
      return next
    })
  }

  const allRows = preview?.rows ?? []
  const uniqueDates = [...new Set(allRows.map((r) => r.txn_date.slice(0, 10)))].sort()

  // filteredRows carries the original index into allRows so exclusion/dupe state is accurate
  const filteredRows = allRows
    .map((r, i) => ({ row: r, globalIndex: i }))
    .filter(({ row }) => {
      const matchesDate = !dateFilter || row.txn_date.slice(0, 10) === dateFilter
      const matchesSearch =
        !searchQuery || row.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesDate && matchesSearch
    })

  const readyCount = (preview?.would_insert ?? 0) - excludedIndices.size

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-on-surface text-3xl font-black tracking-tight">Import Statement</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Upload your monthly bank statement in PDF format. Our Quiet Architect engine will
          automatically categorise and verify each entry for your budget.
        </p>
      </header>

      {/* Drop zone */}
      {!preview && (
        <div className="bg-surface-container-low rounded-xl p-8">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/50 bg-surface-container-lowest'
            }`}
          >
            {previewMutation.isPending ? (
              <>
                <span className="material-symbols-outlined text-primary mb-4 animate-spin text-5xl">
                  progress_activity
                </span>
                <p className="text-on-surface-variant text-sm font-medium">
                  Parsing your statement…
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-primary mb-4 text-5xl">
                  picture_as_pdf
                </span>
                <p className="text-on-surface mb-1 text-base font-semibold">
                  Drag and drop your statement
                </p>
                <p className="text-on-surface-variant mb-5 text-sm">
                  Supports .pdf files up to 10MB
                </p>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Select File
                </Button>
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
          {fileError && <p className="text-error mt-2 text-sm">{fileError}</p>}
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-on-surface text-base font-bold">Preview Transactions</h2>
              <Chip variant="success">{readyCount} READY</Chip>
              {preview.skipped > 0 && <Chip variant="warning">{preview.skipped} SKIPPED</Chip>}
              {excludedIndices.size > 0 && (
                <Chip variant="warning">{excludedIndices.size} EXCLUDED</Chip>
              )}
              {dupeIndices.size > 0 && (
                <Chip variant="warning">
                  ⚠ {dupeIndices.size} POSSIBLE DUPLICATE{dupeIndices.size > 1 ? 'S' : ''}
                </Chip>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="tertiary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => file && importMutation.mutate(file)}
                loading={importMutation.isPending}
              >
                Confirm Import
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description…"
                className="input-field w-full"
                style={{ paddingLeft: '2.25rem' }}
                aria-label="Search descriptions"
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
                calendar_today
              </span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-field pr-8"
                style={{ paddingLeft: '2.25rem' }}
                aria-label="Filter by date"
              >
                <option value="">All dates</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {(searchQuery || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDateFilter('')
                }}
                className="text-primary self-center text-sm font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-surface-container-low overflow-x-auto rounded-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-outline-variant/15 border-b">
                  {['Date', 'Description', 'Amount'].map((h, i) => (
                    <th
                      key={h}
                      className={`text-on-surface-variant px-6 py-4 text-[11px] font-bold tracking-widest uppercase ${i === 2 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-10 px-2 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-on-surface-variant px-6 py-8 text-center text-sm"
                    >
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(({ row: txn, globalIndex }, i) => {
                    const isExcluded = excludedIndices.has(globalIndex)
                    const isDupe = dupeIndices.has(globalIndex)
                    return (
                      <tr
                        key={globalIndex}
                        className={`text-sm transition-colors ${
                          isExcluded
                            ? 'opacity-40'
                            : isDupe
                              ? 'bg-[color-mix(in_srgb,#f59e0b_8%,transparent)]'
                              : i % 2 === 0
                                ? 'bg-surface-container-lowest'
                                : 'bg-surface-container-low'
                        }`}
                      >
                        <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                          <span className={isExcluded ? 'line-through' : ''}>
                            {txn.txn_date.slice(0, 10)}
                          </span>
                        </td>
                        <td className="text-on-surface px-6 py-3 font-medium">
                          <span className={isExcluded ? 'line-through' : ''}>
                            {txn.description}
                          </span>
                          {isDupe && !isExcluded && (
                            <span
                              className="ml-2 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                              title="Possible duplicate — same date, description, and amount already exists"
                            >
                              DUPLICATE
                            </span>
                          )}
                        </td>
                        <td className="text-on-surface px-6 py-3 text-right font-semibold">
                          <span className={isExcluded ? 'line-through' : ''}>
                            {formatCurrency(Number(txn.amount))}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => toggleExclude(globalIndex)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              isExcluded
                                ? 'text-primary hover:bg-primary/10'
                                : 'text-outline hover:bg-error-container hover:text-on-error-container'
                            }`}
                            aria-label={isExcluded ? 'Include transaction' : 'Exclude transaction'}
                            title={
                              isExcluded ? 'Restore — include in import' : 'Exclude from import'
                            }
                          >
                            <span className="material-symbols-outlined text-[16px]">
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
            <div className="text-on-surface-variant border-outline-variant/15 border-t px-6 py-3 text-xs">
              Showing {filteredRows.length} of {allRows.length} transactions
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
