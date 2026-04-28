import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToastContext } from '@/hooks/useToastContext'
import type { PreviewResponse, PreviewRow } from '@/types/transaction'

import { ManualEntryPanel } from './components/ManualEntryPanel'
import { PasteTextPanel } from './components/PasteTextPanel'
import { PdfUploadPanel } from './components/PdfUploadPanel'
import { UploadTabs } from './components/UploadTabs'
import { useFileQueue } from './hooks/useFileQueue'
import { useStatementImport } from './hooks/useStatementImport'
import { useStatementPreview } from './hooks/useStatementPreview'
import type { UploadMode } from './types'

export function UploadPage() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const { previewText } = useStatementPreview()
  const { importText } = useStatementImport()
  const fileQueue = useFileQueue()

  const [mode, setMode] = useState<UploadMode>('pdf')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())
  const [dupeIndices, setDupeIndices] = useState<Set<number>>(new Set())

  const pastePreviewMutation = useMutation({
    mutationFn: (text: string) => previewText(text),
    onSuccess: ({ preview: data, autoExcluded, dupeIndices: dupes }) => {
      setPreview(data)
      setExcludedIndices(autoExcluded)
      setDupeIndices(dupes)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const pasteImportMutation = useMutation({
    mutationFn: ({ text, excludedRows }: { text: string; excludedRows: PreviewRow[] }) =>
      importText(text, excludedRows),
    onSuccess: (data) => {
      toast.success(`${data.inserted} transactions imported, ${data.skipped} skipped`)
      navigate('/transactions')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.error(
          'This statement has already been imported. Delete the existing raw transactions if you want to re-import.'
        )
      else toast.error(err.detail)
    },
  })

  function handleTabSwitch(newMode: UploadMode) {
    if (newMode === mode) return
    fileQueue.clearAll()
    setPreview(null)
    setExcludedIndices(new Set())
    setDupeIndices(new Set())
    setMode(newMode)
  }

  function handlePasteImport(text: string) {
    const excludedRows: PreviewRow[] = preview
      ? preview.rows.filter((_, i) => excludedIndices.has(i))
      : []
    pasteImportMutation.mutate({ text, excludedRows })
  }

  function handlePasteToggleExclude(index: number) {
    setExcludedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handlePasteCancel() {
    setPreview(null)
    setExcludedIndices(new Set())
    setDupeIndices(new Set())
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
          PDFs are parsed in memory and never stored. Only extracted transaction data is saved.
        </p>
      </header>

      {!(mode === 'paste' && preview) && (
        <UploadTabs mode={mode} onSwitch={handleTabSwitch} />
      )}

      {mode === 'pdf' && <PdfUploadPanel {...fileQueue} />}

      {mode === 'paste' && (
        <PasteTextPanel
          preview={preview}
          excludedIndices={excludedIndices}
          dupeIndices={dupeIndices}
          isParsing={pastePreviewMutation.isPending}
          isImporting={pasteImportMutation.isPending}
          onPreview={(text) => pastePreviewMutation.mutate(text)}
          onImport={handlePasteImport}
          onToggleExclude={handlePasteToggleExclude}
          onCancel={handlePasteCancel}
        />
      )}

      {mode === 'manual' && <ManualEntryPanel key={mode} />}
    </div>
  )
}
