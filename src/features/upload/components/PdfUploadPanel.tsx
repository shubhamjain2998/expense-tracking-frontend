import { useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordPromptDialog } from '@/components/ui/PasswordPromptDialog'

import type { FileUpload } from '../types'

import { FileCard } from './FileCard'

interface PdfUploadPanelProps {
  uploads: FileUpload[]
  fileError: string
  isImportingAll: boolean
  readyUploads: FileUpload[]
  totalReadyTxns: number
  hasPreviewing: boolean
  addPdfFiles: (files: File[]) => void
  removeUpload: (id: string) => void
  toggleExcludeInUpload: (uploadId: string, rowIndex: number) => void
  importAllPdfs: () => void
  submitPassword: (uploadId: string, password: string) => void
  cancelPasswordPrompt: (uploadId: string) => void
  /** Jump to the Bulk paste tab. Surfaced on per-file errors so users whose
   *  bank isn't supported by the parser have a visible fallback. */
  onTryBulkPaste?: () => void
}

export function PdfUploadPanel({
  uploads,
  fileError,
  isImportingAll,
  readyUploads,
  totalReadyTxns,
  hasPreviewing,
  addPdfFiles,
  removeUpload,
  toggleExcludeInUpload,
  importAllPdfs,
  submitPassword,
  cancelPasswordPrompt,
  onTryBulkPaste,
}: PdfUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // One dialog at a time — surface whichever upload is currently waiting
  // for a password. Re-prompts as the next file in the queue gets parsed.
  const pendingPassword = uploads.find((u) => u.status === 'needs_password')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addPdfFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    addPdfFiles(Array.from(e.dataTransfer.files))
  }

  return (
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
          <Icon name="upload" size={32} className="mx-auto" style={{ color: 'var(--ink-3)' }} />
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
              <Icon name="lock" size={12} />
              Parsed in memory
            </span>
            <span className="flex items-center gap-1">
              <Icon name="close" size={12} style={{ color: 'var(--ink-4)' }} />
              Not stored
            </span>
            <span className="flex items-center gap-1">
              <Icon name="close" size={12} style={{ color: 'var(--ink-4)' }} />
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
              onRemove={() => removeUpload(upload.id)}
              onToggleExclude={(i) => toggleExcludeInUpload(upload.id, i)}
              onTryBulkPaste={onTryBulkPaste}
            />
          ))}
        </>
      )}

      <PasswordPromptDialog
        isOpen={!!pendingPassword}
        fileName={pendingPassword?.file.name ?? ''}
        errorMessage={pendingPassword?.passwordError}
        onSubmit={(pw) => pendingPassword && submitPassword(pendingPassword.id, pw)}
        onCancel={() => pendingPassword && cancelPasswordPrompt(pendingPassword.id)}
      />
    </div>
  )
}
