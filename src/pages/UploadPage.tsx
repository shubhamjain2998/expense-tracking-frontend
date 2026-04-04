import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import { previewStatement, importStatement } from '../lib/api'
import type { PreviewResponse } from '../types/transaction'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { useToastContext } from '../hooks/useToastContext'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
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
        <h1 className="text-3xl font-black tracking-tight text-[#181c20]">Import Statement</h1>
        <p className="mt-1 text-sm text-[#3f484c]">
          Upload your monthly bank statement in PDF format. Our Quiet Architect engine will
          automatically categorise and verify each entry for your budget.
        </p>
      </header>

      {/* Drop zone */}
      {!preview && (
        <div className="rounded-xl bg-[#f1f4fa] p-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-[#004251] bg-[#b4ebff]/20' : 'border-[#bfc8cc]/50 bg-white'
            }`}
          >
            {previewMutation.isPending ? (
              <>
                <span className="material-symbols-outlined mb-4 animate-spin text-5xl text-[#004251]">
                  progress_activity
                </span>
                <p className="text-sm font-medium text-[#3f484c]">Parsing your statement…</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined mb-4 text-5xl text-[#004251]">
                  picture_as_pdf
                </span>
                <p className="mb-1 text-base font-semibold text-[#181c20]">
                  Drag and drop your statement
                </p>
                <p className="mb-5 text-sm text-[#3f484c]">Supports .pdf files up to 10MB</p>
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
          {fileError && <p className="mt-2 text-sm text-[#ba1a1a]">{fileError}</p>}
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-[#181c20]">Preview Transactions</h2>
              <Chip variant="success">{preview.would_insert} READY</Chip>
              {preview.warnings.length > 0 && (
                <Chip variant="warning">{preview.warnings.length} WARNINGS</Chip>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="tertiary" onClick={handleCancel}>Cancel</Button>
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
            <div className="rounded-xl bg-[#ffdcc0] px-4 py-3">
              <p className="text-sm font-semibold text-[#5b3200]">Warnings</p>
              <ul className="mt-1 list-inside list-disc text-sm text-[#683c09]">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl bg-[#f1f4fa]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#bfc8cc]/15">
                  {['Date', 'Description', 'Category', 'Amount', 'Status'].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3f484c] ${i >= 3 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.transactions.map((txn, i) => (
                  <tr key={i} className={`text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-[#f1f4fa]'}`}>
                    <td className="px-6 py-3 text-[#3f484c]">{txn.date}</td>
                    <td className="px-6 py-3 font-medium text-[#181c20]">{txn.description}</td>
                    <td className="px-6 py-3">
                      {txn.category ? (
                        <span className="rounded-full bg-[#d6e5ec] px-2.5 py-0.5 text-xs font-semibold text-[#58676d]">
                          {txn.category}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#e5e8ee] px-2.5 py-0.5 text-xs font-semibold text-[#70787c]">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-[#181c20]">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {txn.status === 'warning' ? (
                        <span className="material-symbols-outlined text-[#683c09]">warning</span>
                      ) : (
                        <span className="material-symbols-outlined text-[#004251]">check_circle</span>
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
