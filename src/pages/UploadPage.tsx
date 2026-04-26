import { useMutation } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { useToastContext } from '../hooks/useToastContext'
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
import type { ImportResponse, PreviewResponse, PreviewRow } from '../types/transaction'

type UploadMode = 'pdf' | 'paste' | 'manual'
type FileStatus = 'previewing' | 'ready' | 'error' | 'importing' | 'done'

interface FileUpload {
  id: string
  file: File
  preview: PreviewResponse | null
  excludedIndices: Set<number>
  dupeIndices: Set<number>
  status: FileStatus
  error?: string
}

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

const TABS: { id: UploadMode; label: string; icon: string }[] = [
  { id: 'pdf', label: 'PDF statement', icon: 'picture_as_pdf' },
  { id: 'paste', label: 'Paste text', icon: 'content_paste' },
  { id: 'manual', label: 'Manual entry', icon: 'add' },
]

// ─── FileCard ──────────────────────────────────────────────────────────────────

interface FileCardProps {
  upload: FileUpload
  onRemove: () => void
  onToggleExclude: (index: number) => void
}

function FileCard({ upload, onRemove, onToggleExclude }: FileCardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [skippedExpanded, setSkippedExpanded] = useState(false)

  const allRows = upload.preview?.rows ?? []
  const uniqueDates = [...new Set(allRows.map((r) => r.txn_date.slice(0, 10)))].sort()

  const filteredRows = allRows
    .map((row, i) => ({ row, globalIndex: i }))
    .filter(({ row }) => {
      const matchesDate = !dateFilter || row.txn_date.slice(0, 10) === dateFilter
      const matchesSearch =
        !searchQuery || row.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesDate && matchesSearch
    })

  const readyCount = (upload.preview?.would_insert ?? 0) - upload.excludedIndices.size
  const isActive = upload.status === 'ready' || upload.status === 'done'

  return (
    <div className="card card-flush overflow-hidden">
      {/* File header */}
      <div
        className="flex items-center justify-between gap-2"
        style={{
          padding: '10px 14px',
          borderBottom: upload.preview ? '1px solid var(--line)' : undefined,
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="material-symbols-outlined shrink-0"
            style={{ fontSize: 15, color: 'var(--ink-3)' }}
          >
            picture_as_pdf
          </span>
          <span
            className="truncate text-[12.5px] font-medium"
            style={{ color: 'var(--ink)' }}
            title={upload.file.name}
          >
            {upload.file.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {upload.status === 'previewing' && (
            <span className="chip">
              <span
                className="material-symbols-outlined animate-spin"
                style={{ fontSize: 11, marginRight: 4 }}
              >
                progress_activity
              </span>
              Parsing…
            </span>
          )}
          {upload.status === 'ready' && <Chip variant="success">{readyCount} ready</Chip>}
          {upload.status === 'importing' && <span className="chip">Importing…</span>}
          {upload.status === 'done' && <Chip variant="success">Imported</Chip>}
          {upload.status === 'error' && (
            <span className="chip neg" title={upload.error}>
              {upload.error ?? 'Error'}
            </span>
          )}
          {upload.status !== 'importing' && upload.status !== 'done' && (
            <button onClick={onRemove} className="btn ghost icon sm" aria-label="Remove file">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Preview table */}
      {isActive && upload.preview && (
        <>
          {/* Info chips */}
          {(upload.preview.skipped > 0 ||
            upload.excludedIndices.size > 0 ||
            upload.dupeIndices.size > 0) && (
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}
            >
              {upload.preview.skipped > 0 && (
                <Chip variant="warning">{upload.preview.skipped} skipped</Chip>
              )}
              {upload.excludedIndices.size > 0 && (
                <Chip variant="warning">{upload.excludedIndices.size} excluded</Chip>
              )}
              {upload.dupeIndices.size > 0 && (
                <Chip variant="warning">
                  {upload.dupeIndices.size} duplicate{upload.dupeIndices.size > 1 ? 's' : ''}
                </Chip>
              )}
            </div>
          )}

          {/* Filters — only show if there are enough rows to warrant them */}
          {allRows.length > 8 && (
            <div
              className="flex flex-col gap-2 sm:flex-row"
              style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}
            >
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
          )}

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
                  filteredRows.map(({ row, globalIndex }) => {
                    const isExcluded = upload.excludedIndices.has(globalIndex)
                    const isDupe = upload.dupeIndices.has(globalIndex)
                    return (
                      <tr
                        key={globalIndex}
                        style={{
                          opacity: isExcluded ? 0.4 : 1,
                          background: isDupe && !isExcluded ? 'var(--warn-soft)' : undefined,
                        }}
                      >
                        <td className="num" style={{ color: 'var(--ink-3)' }}>
                          <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                            {row.txn_date.slice(0, 10)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ink)' }}>
                          <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                            {row.description}
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
                          <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                            {formatCurrency(Number(row.amount))}
                          </span>
                        </td>
                        <td className="text-center">
                          {upload.status === 'ready' && (
                            <button
                              onClick={() => onToggleExclude(globalIndex)}
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
                          )}
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

          {(upload.preview.skipped_rows?.length ?? 0) > 0 && (
            <div style={{ borderTop: '1px solid var(--line)' }}>
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
                    {upload.preview.skipped_rows.length} row
                    {upload.preview.skipped_rows.length > 1 ? 's' : ''} skipped during parsing
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
                  {upload.preview.skipped_rows.map((row, i) => (
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
        </>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function UploadPage() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<UploadMode>('pdf')
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState('')

  // PDF mode state
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isImportingAll, setIsImportingAll] = useState(false)

  // Paste mode state
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())
  const [dupeIndices, setDupeIndices] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [skippedExpanded, setSkippedExpanded] = useState(false)

  // Manual mode state
  const [manualDate, setManualDate] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})

  // ─── Shared: delete excluded rows after any import ──────────────────────────
  // Fetches the actual raw transactions for the affected months and deletes any
  // that match an excluded preview row (handles both newly-inserted and pre-existing).
  async function deleteExcluded(excludedRows: PreviewRow[]) {
    if (excludedRows.length === 0) return
    const excludedSigs = new Set(
      excludedRows.map((r) => rowSig(r.txn_date, r.description, r.amount))
    )
    const monthMap = new Map<string, { year: number; month: number }>()
    excludedRows.forEach((r) => {
      const d = new Date(r.txn_date)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      monthMap.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 })
    })
    const allRaw = (
      await Promise.all(
        [...monthMap.values()].map(({ year, month }) => getRawTransactions(year, month))
      )
    ).flat()
    await Promise.allSettled(
      allRaw
        .filter(
          (r) =>
            r.status !== 'deleted' && excludedSigs.has(rowSig(r.txn_date, r.description, r.amount))
        )
        .map((r) => deleteRawTransaction(r.id))
    )
  }

  // ─── PDF multi-file logic ────────────────────────────────────────────────────

  async function previewUpload(upload: FileUpload) {
    try {
      const data = await previewStatement(upload.file)

      const ignoreRules = getIgnoreRules()
      const autoExcluded = new Set<number>()
      data.rows.forEach((r, i) => {
        if (matchesAnyRule(r.description, ignoreRules)) autoExcluded.add(i)
      })

      const sigCount = new Map<string, number[]>()
      data.rows.forEach((r, i) => {
        const sig = rowSig(r.txn_date, r.description, r.amount)
        sigCount.set(sig, [...(sigCount.get(sig) ?? []), i])
      })
      const intraDupes = new Set<number>()
      sigCount.forEach((indices) => {
        if (indices.length > 1) indices.forEach((i) => intraDupes.add(i))
      })

      const monthPairs = [
        ...new Map(
          data.rows.map((r) => {
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
        results.flat().forEach((t) => existingSigs.add(rowSig(t.txn_date, t.description, t.amount)))
      } catch {
        // best-effort
      }

      const dbDupes = new Set<number>()
      data.rows.forEach((r, i) => {
        if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
      })

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                preview: data,
                excludedIndices: autoExcluded,
                dupeIndices: new Set([...intraDupes, ...dbDupes]),
                status: 'ready' as FileStatus,
              }
            : u
        )
      )
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: 'error' as FileStatus,
                error: (err as { detail?: string }).detail ?? 'Failed to parse file',
              }
            : u
        )
      )
    }
  }

  function addPdfFiles(newFiles: File[]) {
    setFileError('')
    const errors: string[] = []
    const valid: File[] = []

    for (const f of newFiles) {
      if (f.type !== 'application/pdf') {
        errors.push(`"${f.name}" is not a PDF`)
      } else if (f.size > 10 * 1024 * 1024) {
        errors.push(`"${f.name}" exceeds 10 MB`)
      } else {
        valid.push(f)
      }
    }

    if (errors.length > 0) setFileError(errors.join(' · '))
    if (valid.length === 0) return

    const existingKeys = new Set(uploads.map((u) => `${u.file.name}:${u.file.size}`))
    const toAdd = valid.filter((f) => !existingKeys.has(`${f.name}:${f.size}`))

    if (toAdd.length === 0) {
      toast.warning('File(s) already added')
      return
    }

    const newUploads: FileUpload[] = toAdd.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      preview: null,
      excludedIndices: new Set(),
      dupeIndices: new Set(),
      status: 'previewing' as FileStatus,
    }))

    setUploads((prev) => [...prev, ...newUploads])
    void Promise.allSettled(newUploads.map((u) => previewUpload(u)))
  }

  function toggleExcludeInUpload(uploadId: string, rowIndex: number) {
    setUploads((prev) =>
      prev.map((u) => {
        if (u.id !== uploadId) return u
        const next = new Set(u.excludedIndices)
        if (next.has(rowIndex)) next.delete(rowIndex)
        else next.add(rowIndex)
        return { ...u, excludedIndices: next }
      })
    )
  }

  async function importAllPdfs() {
    const readyUploads = uploads.filter((u) => u.status === 'ready')
    if (readyUploads.length === 0) return

    setIsImportingAll(true)
    setUploads((prev) =>
      prev.map((u) => (u.status === 'ready' ? { ...u, status: 'importing' as FileStatus } : u))
    )

    let totalInserted = 0
    let totalSkipped = 0
    let errorCount = 0

    await Promise.allSettled(
      readyUploads.map(async (upload) => {
        try {
          const data = await importStatement(upload.file)

          if (upload.excludedIndices.size > 0 && upload.preview) {
            await deleteExcluded(
              upload.preview.rows.filter((_, i) => upload.excludedIndices.has(i))
            )
          }

          totalInserted += data.inserted
          totalSkipped += data.skipped
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, status: 'done' as FileStatus } : u))
          )
        } catch (err) {
          errorCount++
          const e = err as { detail?: string; status?: number }
          const errMsg = e.status === 409 ? 'Already imported' : (e.detail ?? 'Import failed')
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, status: 'error' as FileStatus, error: errMsg } : u
            )
          )
        }
      })
    )

    setIsImportingAll(false)

    if (errorCount > 0)
      toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to import`)
    if (totalInserted > 0 || totalSkipped > 0)
      toast.success(`${totalInserted} transactions imported, ${totalSkipped} skipped`)
    if (totalInserted > 0) navigate('/transactions')
  }

  // ─── Paste mode logic (unchanged) ───────────────────────────────────────────

  async function handlePreviewSuccess(data: PreviewResponse) {
    setPreview(data)

    const ignoreRules = getIgnoreRules()
    const autoExcluded = new Set(
      data.rows.reduce<number[]>((acc, r, i) => {
        if (matchesAnyRule(r.description, ignoreRules)) acc.push(i)
        return acc
      }, [])
    )
    setExcludedIndices(autoExcluded)

    const sigCount = new Map<string, number[]>()
    data.rows.forEach((r, i) => {
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
        data.rows.map((r) => {
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
    data.rows.forEach((r, i) => {
      if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
    })

    setDupeIndices(new Set([...intraDupes, ...dbDupes]))
  }

  async function handlePasteImportSuccess(data: ImportResponse) {
    if (excludedIndices.size > 0 && preview) {
      await deleteExcluded(preview.rows.filter((_, i) => excludedIndices.has(i)))
    }
    toast.success(`${data.inserted} transactions imported, ${data.skipped} skipped`)
    navigate('/transactions')
  }

  function handlePasteImportError(err: { detail: string; status?: number }) {
    if (err.status === 409)
      toast.error(
        'This statement has already been imported. Delete the existing raw transactions if you want to re-import.'
      )
    else toast.error(err.detail)
  }

  const pastePreviewMutation = useMutation({
    mutationFn: () => previewStatementText(pasteText),
    onSuccess: handlePreviewSuccess,
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const pasteImportMutation = useMutation({
    mutationFn: () => importStatementText(pasteText),
    onSuccess: handlePasteImportSuccess,
    onError: handlePasteImportError,
  })

  // ─── Manual mode logic ───────────────────────────────────────────────────────

  const manualMutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: `${manualDate}T00:00:00`,
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
      }),
    onSuccess: () => {
      toast.success('Transaction added')
      navigate('/transactions')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

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

  // ─── Shared handlers ─────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addPdfFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    addPdfFiles(Array.from(e.dataTransfer.files))
  }

  function handleTabSwitch(newMode: UploadMode) {
    if (newMode === mode) return
    setUploads([])
    setFileError('')
    setPreview(null)
    setPasteText('')
    setSearchQuery('')
    setDateFilter('')
    setExcludedIndices(new Set())
    setManualDate('')
    setManualDesc('')
    setManualAmount('')
    setManualErrors({})
    setMode(newMode)
  }

  function togglePasteExclude(globalIndex: number) {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(globalIndex)) next.delete(globalIndex)
      else next.add(globalIndex)
      return next
    })
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const readyUploads = uploads.filter((u) => u.status === 'ready')
  const totalReadyTxns = readyUploads.reduce(
    (sum, u) => sum + (u.preview?.would_insert ?? 0) - u.excludedIndices.size,
    0
  )
  const hasPreviewing = uploads.some((u) => u.status === 'previewing')

  const allPasteRows = preview?.rows ?? []
  const uniquePasteDates = [...new Set(allPasteRows.map((r) => r.txn_date.slice(0, 10)))].sort()
  const filteredPasteRows = allPasteRows
    .map((r, i) => ({ row: r, globalIndex: i }))
    .filter(({ row }) => {
      const matchesDate = !dateFilter || row.txn_date.slice(0, 10) === dateFilter
      const matchesSearch =
        !searchQuery || row.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesDate && matchesSearch
    })
  const pasteReadyCount = (preview?.would_insert ?? 0) - excludedIndices.size

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
          PDFs are parsed in memory and never stored. Only extracted transaction data is saved.
        </p>
      </header>

      {/* Mode tabs — hide when paste preview is active */}
      {!(mode === 'paste' && preview) && (
        <div className="flex gap-1.5">
          {TABS.map((tab) => {
            const isOn = mode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className="flex items-center gap-1.5"
                style={{
                  height: 30,
                  padding: '0 11px',
                  border: isOn ? '1.5px solid var(--accent)' : '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius)',
                  background: isOn ? 'var(--accent-soft)' : 'transparent',
                  color: isOn ? 'var(--accent)' : 'var(--ink-3)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s ease',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 13, color: 'inherit' }}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── PDF mode ─────────────────────────────────────────────────────────── */}
      {mode === 'pdf' && (
        <div className="space-y-3">
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
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 32, color: 'var(--ink-3)', display: 'block', marginBottom: 12 }}
              >
                upload
              </span>
              <p
                className="text-[14.5px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
              >
                {uploads.length > 0 ? 'Drop more PDFs to add them' : 'Drop a PDF statement here'}
              </p>
              <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                {uploads.length > 0
                  ? 'Multiple files supported · up to 10 MB each'
                  : 'HDFC, ICICI, SBI, Axis, Kotak · or any statement with a transaction table'}
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {uploads.length > 0 ? 'Add more files' : 'Choose a file'}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                aria-label="Choose PDF files"
              />
              <div
                className="mt-5 flex flex-wrap items-center justify-center gap-4"
                style={{ color: 'var(--ink-4)', fontSize: 11.5 }}
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    lock
                  </span>
                  Parsed in memory
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 12, color: 'var(--ink-4)' }}
                  >
                    close
                  </span>
                  Not stored
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 12, color: 'var(--ink-4)' }}
                  >
                    close
                  </span>
                  No bank connection
                </span>
              </div>
            </div>
            {fileError && (
              <p className="mt-2 text-[12px]" style={{ color: 'var(--neg)' }}>
                {fileError}
              </p>
            )}
          </div>

          {uploads.length > 0 && (
            <>
              {readyUploads.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                    {readyUploads.length} file{readyUploads.length > 1 ? 's' : ''} ready
                    {totalReadyTxns > 0 && (
                      <>
                        {' '}
                        ·{' '}
                        <span className="num font-medium" style={{ color: 'var(--ink)' }}>
                          {totalReadyTxns}
                        </span>{' '}
                        transactions
                      </>
                    )}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void importAllPdfs()}
                    loading={isImportingAll}
                    disabled={hasPreviewing}
                  >
                    Import {totalReadyTxns > 0 ? totalReadyTxns : ''} transactions
                  </Button>
                </div>
              )}

              {uploads.map((upload) => (
                <FileCard
                  key={upload.id}
                  upload={upload}
                  onRemove={() => setUploads((prev) => prev.filter((u) => u.id !== upload.id))}
                  onToggleExclude={(i) => toggleExcludeInUpload(upload.id, i)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Paste mode ───────────────────────────────────────────────────────── */}
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

      {mode === 'paste' && preview && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-[15px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
              >
                Preview
              </h2>
              <Chip variant="success">{pasteReadyCount} ready</Chip>
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
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setPreview(null)
                  setExcludedIndices(new Set())
                  setDupeIndices(new Set())
                  setSearchQuery('')
                  setDateFilter('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => pasteImportMutation.mutate()}
                loading={pasteImportMutation.isPending}
              >
                Import {pasteReadyCount}
              </Button>
            </div>
          </div>

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
              {uniquePasteDates.map((d) => (
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
                  {filteredPasteRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center" style={{ color: 'var(--ink-3)' }}>
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPasteRows.map(({ row, globalIndex }) => {
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
                              {row.txn_date.slice(0, 10)}
                            </span>
                          </td>
                          <td style={{ color: 'var(--ink)' }}>
                            <span
                              style={{ textDecoration: isExcluded ? 'line-through' : undefined }}
                            >
                              {row.description}
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
                              {formatCurrency(Number(row.amount))}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => togglePasteExclude(globalIndex)}
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
              Showing {filteredPasteRows.length} of {allPasteRows.length} transactions
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

      {/* ── Manual mode ──────────────────────────────────────────────────────── */}
      {mode === 'manual' && (
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
    </div>
  )
}
