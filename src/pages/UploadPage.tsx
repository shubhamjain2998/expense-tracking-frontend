import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import { previewStatement, importStatement } from '../lib/api'
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

  const previewMutation = useMutation({
    mutationFn: previewStatement,
    onSuccess: (data) => setPreview(data),
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const importMutation = useMutation({
    mutationFn: importStatement,
    onSuccess: (data) => {
      toast.success(`${data.imported} transactions imported, ${data.skipped} skipped`)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const allRows = preview?.rows ?? []
  const uniqueDates = [...new Set(allRows.map((r) => r.txn_date.slice(0, 10)))].sort()
  const filteredRows = allRows.filter((r) => {
    const matchesDate = !dateFilter || r.txn_date.slice(0, 10) === dateFilter
    const matchesSearch =
      !searchQuery || r.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDate && matchesSearch
  })

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
            <div className="flex items-center gap-3">
              <h2 className="text-on-surface text-base font-bold">Preview Transactions</h2>
              <Chip variant="success">{preview.would_insert} READY</Chip>
              {preview.skipped > 0 && <Chip variant="warning">{preview.skipped} SKIPPED</Chip>}
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
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-on-surface-variant px-6 py-8 text-center text-sm"
                    >
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((txn, i) => (
                    <tr
                      key={i}
                      className={`text-sm ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                    >
                      <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                        {txn.txn_date.slice(0, 10)}
                      </td>
                      <td className="text-on-surface px-6 py-3 font-medium">{txn.description}</td>
                      <td className="text-on-surface px-6 py-3 text-right font-semibold">
                        {formatCurrency(Number(txn.amount))}
                      </td>
                    </tr>
                  ))
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
