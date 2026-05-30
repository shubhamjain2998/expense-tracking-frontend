import { useState } from 'react'

import { BulkPastePanel } from './components/BulkPastePanel'
import { ManualEntryPanel } from './components/ManualEntryPanel'
import { PdfUploadPanel } from './components/PdfUploadPanel'
import { UploadTabs } from './components/UploadTabs'
import { useFileQueue } from './hooks/useFileQueue'
import type { UploadMode } from './types'

export function UploadPage() {
  const fileQueue = useFileQueue()
  const [mode, setMode] = useState<UploadMode>('pdf')

  function handleTabSwitch(newMode: UploadMode) {
    if (newMode === mode) return
    fileQueue.clearAll()
    setMode(newMode)
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

      <UploadTabs mode={mode} onSwitch={handleTabSwitch} />

      {mode === 'pdf' && (
        <PdfUploadPanel {...fileQueue} onTryBulkPaste={() => handleTabSwitch('bulk-paste')} />
      )}
      {mode === 'bulk-paste' && <BulkPastePanel key={mode} />}
      {mode === 'manual' && <ManualEntryPanel key={mode} />}
    </div>
  )
}
