import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { BulkPastePanel } from '@/features/upload/components/BulkPastePanel'
import { ManualEntryPanel } from '@/features/upload/components/ManualEntryPanel'
import { PdfUploadPanel } from '@/features/upload/components/PdfUploadPanel'
import { useFileQueue } from '@/features/upload/hooks/useFileQueue'
import type { UploadMode } from '@/features/upload/types'
import { useFocusReturn } from '@/hooks/useFocusReturn'

export type ImportTab = Extract<UploadMode, 'pdf' | 'bulk-paste' | 'manual'>

const TABS: { id: ImportTab; label: string }[] = [
  { id: 'pdf', label: 'Bank statement PDF' },
  { id: 'bulk-paste', label: 'Paste rows' },
  { id: 'manual', label: 'Add one manually' },
]

interface ImportDialogProps {
  initialTab: ImportTab
  onClose: () => void
}

/**
 * The Import dialog mounted from the Transactions toolbar's Import menu (and
 * from the `/upload` -> `/transactions?import=pdf` redirect via ImportMenu).
 * Mounts the existing upload panels unchanged — BulkPastePanel and
 * ManualEntryPanel take zero props, and PdfUploadPanel is wired exactly as
 * `src/features/upload/page.tsx` used to wire it, just inside a dialog.
 */
export function ImportDialog({ initialTab, onClose }: ImportDialogProps) {
  const [tab, setTab] = useState<ImportTab>(initialTab)
  // Copied verbatim from the old src/features/upload/page.tsx:26 — the file
  // queue lives in the parent so PdfUploadPanel stays a pure props component.
  const fileQueue = useFileQueue()

  useFocusReturn()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{
        padding: 24,
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(8px)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal
      aria-label="Import transactions"
    >
      <div
        className="absolute inset-0"
        role="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <div
        className="relative z-10 flex w-full max-w-xl flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .26s var(--ease-spring)',
          maxHeight: 'calc(100vh - 48px)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <Icon name="upload" size={16} style={{ color: 'var(--ink-3)' }} />
            <h2
              className="text-[13.5px] font-semibold"
              style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
            >
              Import transactions
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost icon sm" aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="seg" style={{ margin: '14px 18px 0', alignSelf: 'flex-start' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'on' : ''}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          {tab === 'pdf' && (
            <PdfUploadPanel key="pdf" {...fileQueue} onTryBulkPaste={() => setTab('bulk-paste')} />
          )}
          {tab === 'bulk-paste' && <BulkPastePanel key="bulk-paste" />}
          {tab === 'manual' && <ManualEntryPanel key="manual" />}
        </div>
      </div>
    </div>
  )
}
