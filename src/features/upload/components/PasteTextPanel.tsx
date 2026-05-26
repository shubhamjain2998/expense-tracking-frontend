import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import type { PreviewResponse } from '@/types/transaction'

import { PreviewTable } from './PreviewTable'

interface PasteTextPanelProps {
  preview: PreviewResponse | null
  excludedIndices: Set<number>
  dupeIndices: Set<number>
  isParsing: boolean
  isImporting: boolean
  onPreview: (text: string) => void
  onImport: (text: string) => void
  onToggleExclude: (index: number) => void
  onCancel: () => void
}

export function PasteTextPanel({
  preview,
  excludedIndices,
  dupeIndices,
  isParsing,
  isImporting,
  onPreview,
  onImport,
  onToggleExclude,
  onCancel,
}: PasteTextPanelProps) {
  const [pasteText, setPasteText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [skippedExpanded, setSkippedExpanded] = useState(false)

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
  const pasteReadyCount = (preview?.would_insert ?? 0) - excludedIndices.size

  if (!preview) {
    return (
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
            onClick={() => onPreview(pasteText)}
            loading={isParsing}
            disabled={!pasteText.trim()}
          >
            Parse &amp; preview
          </Button>
        </div>
      </div>
    )
  }

  return (
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
              setSearchQuery('')
              setDateFilter('')
              onCancel()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onImport(pasteText)}
            loading={isImporting}
          >
            Import {pasteReadyCount}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={14}
            style={{ color: 'var(--ink-4)' }}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          />
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
        <PreviewTable
          rows={filteredRows}
          totalCount={allRows.length}
          excludedIndices={excludedIndices}
          dupeIndices={dupeIndices}
          onToggleExclude={onToggleExclude}
        />
      </div>

      {(preview.skipped_rows?.length ?? 0) > 0 && (
        <div className="card card-flush overflow-hidden">
          <button
            onClick={() => setSkippedExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Icon name="warning" size={14} style={{ color: 'var(--warn)' }} />
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink-2)' }}>
                {preview.skipped_rows.length} row
                {preview.skipped_rows.length > 1 ? 's' : ''} skipped during parsing
              </span>
            </div>
            <Icon
              name={skippedExpanded ? 'expand_less' : 'expand_more'}
              size={14}
              style={{ color: 'var(--ink-4)' }}
            />
          </button>
          {skippedExpanded && (
            <ul className="space-y-1 px-4 pt-2 pb-3" style={{ borderTop: '1px solid var(--line)' }}>
              {preview.skipped_rows.map((row, i) => (
                <li key={i} className="mono truncate text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  {row}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
