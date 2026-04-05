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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
              {preview.warnings.length > 0 && (
                <Chip variant="warning">{preview.warnings.length} WARNINGS</Chip>
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

          {preview.warnings.length > 0 && (
            <div className="bg-tertiary-container rounded-xl px-4 py-3">
              <p className="text-on-tertiary-container text-sm font-semibold">Warnings</p>
              <ul className="text-on-tertiary-container/80 mt-1 list-inside list-disc text-sm">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-surface-container-low overflow-x-auto rounded-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-outline-variant/15 border-b">
                  {['Date', 'Description', 'Category', 'Amount', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      className={`text-on-surface-variant px-6 py-4 text-[11px] font-bold tracking-widest uppercase ${i >= 3 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.transactions.map((txn, i) => (
                  <tr
                    key={i}
                    className={`text-sm ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                  >
                    <td className="text-on-surface-variant px-6 py-3">{txn.date}</td>
                    <td className="text-on-surface px-6 py-3 font-medium">{txn.description}</td>
                    <td className="px-6 py-3">
                      {txn.category ? (
                        <span className="bg-secondary-container text-on-secondary-container rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          {txn.category}
                        </span>
                      ) : (
                        <span className="bg-surface-container-high text-outline rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="text-on-surface px-6 py-3 text-right font-semibold">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {txn.status === 'warning' ? (
                        <span className="material-symbols-outlined text-on-tertiary-container">
                          warning
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
