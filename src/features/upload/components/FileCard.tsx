import { useMemo, useState } from 'react'

import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'

import { isLikelyTransactionLine } from '../lib/isLikelyTransactionLine'
import type { FileUpload } from '../types'

import { PreviewTable } from './PreviewTable'

export interface FileCardProps {
  upload: FileUpload
  onRemove: () => void
  onToggleExclude: (index: number) => void
  /** Jump to the Bulk paste tab — surfaced when this file failed to parse,
   *  giving users an unblocked path for unsupported-bank PDFs. */
  onTryBulkPaste?: () => void
}

export function FileCard({ upload, onRemove, onToggleExclude, onTryBulkPaste }: FileCardProps) {
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
    .sort((a, b) => b.row.txn_date.localeCompare(a.row.txn_date))

  // Count rows that will actually be imported: total parsed minus excluded.
  const readyCount = (upload.preview?.rows.length ?? 0) - upload.excludedIndices.size
  // Duplicates that are currently excluded (excluded ∩ dupeIndices).
  const dupeSkippedCount = [...upload.excludedIndices].filter((i) =>
    upload.dupeIndices.has(i)
  ).length
  // Non-dupe manually excluded rows.
  const manuallyExcludedCount = upload.excludedIndices.size - dupeSkippedCount
  const isActive = upload.status === 'ready' || upload.status === 'done'

  // The parser's skipped_rows list catches every line it couldn't classify,
  // including legitimate non-transaction noise (card headers, reward tables,
  // GST blocks, totals). Surface only the lines that *look* like they could
  // have been transactions — counting noise causes false-alarm banners.
  const candidateMisses = useMemo(
    () => upload.preview?.skipped_rows.filter(isLikelyTransactionLine) ?? [],
    [upload.preview?.skipped_rows]
  )

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
          <Icon
            name="picture_as_pdf"
            size={15}
            style={{ color: 'var(--ink-3)' }}
            className="shrink-0"
          />
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
              <Icon name="progress_activity" size={11} className="animate-spin" />
              Parsing…
            </span>
          )}
          {upload.status === 'ready' && (
            <Chip variant="success">{readyCount} to import</Chip>
          )}
          {upload.status === 'importing' && <span className="chip">Importing…</span>}
          {upload.status === 'done' && <Chip variant="success">Imported</Chip>}
          {upload.status === 'needs_password' && (
            <span className="chip warn" title="Password-protected PDF">
              <Icon name="lock" size={11} />
              Password required
            </span>
          )}
          {upload.status === 'error' && (
            <span className="chip neg" title={upload.error}>
              {upload.error ?? 'Error'}
            </span>
          )}
          {upload.status !== 'importing' && upload.status !== 'done' && (
            <button onClick={onRemove} className="btn ghost icon sm" aria-label="Remove file">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Fallback CTA when parsing fails — users whose bank isn't supported
          can still get unblocked by screenshotting the PDF and bulk-pasting. */}
      {upload.status === 'error' && onTryBulkPaste && (
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--line)',
            background: 'var(--warn-soft)',
          }}
        >
          <p className="text-[12px]" style={{ color: 'var(--ink-2)' }}>
            Bank not supported yet? Open the PDF, screenshot the transaction pages, and paste them
            into Bulk paste — works with any layout.
          </p>
          <button
            onClick={onTryBulkPaste}
            className="btn sm shrink-0"
            type="button"
            aria-label="Switch to Bulk paste tab"
          >
            <Icon name="content_paste" size={12} />
            Try Bulk paste
          </button>
        </div>
      )}

      {/* Preview table */}
      {isActive && upload.preview && (
        <>
          {/* Info chips */}
          {(candidateMisses.length > 0 ||
            manuallyExcludedCount > 0 ||
            dupeSkippedCount > 0) && (
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}
            >
              {candidateMisses.length > 0 && (
                <Chip variant="warning">{candidateMisses.length} possibly missed</Chip>
              )}
              {manuallyExcludedCount > 0 && (
                <Chip variant="warning">{manuallyExcludedCount} excluded</Chip>
              )}
              {dupeSkippedCount > 0 && (
                <span
                  className="chip warn"
                  title="Duplicates are skipped by default — click the restore button on a row to include it anyway"
                >
                  {dupeSkippedCount} duplicate{dupeSkippedCount > 1 ? 's' : ''} will be skipped
                </span>
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

          <PreviewTable
            rows={filteredRows}
            totalCount={allRows.length}
            excludedIndices={upload.excludedIndices}
            dupeIndices={upload.dupeIndices}
            onToggleExclude={upload.status === 'ready' ? onToggleExclude : undefined}
          />

          {candidateMisses.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', background: 'var(--warn-soft)' }}>
              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                  <Icon
                    name="warning"
                    size={14}
                    style={{ color: 'var(--warn)', marginTop: 2, flexShrink: 0 }}
                  />
                  <div className="text-[12px]" style={{ color: 'var(--ink-2)' }}>
                    <span className="font-medium">
                      {candidateMisses.length} line{candidateMisses.length > 1 ? 's' : ''} look like
                      transactions but couldn't be parsed.
                    </span>{' '}
                    Import will continue without them — to capture the missed transactions,
                    screenshot the affected pages and use Bulk paste.
                  </div>
                </div>
                {onTryBulkPaste && (
                  <button
                    onClick={onTryBulkPaste}
                    className="btn sm shrink-0"
                    type="button"
                    aria-label="Switch to Bulk paste tab"
                  >
                    <Icon name="content_paste" size={12} />
                    Add via Bulk paste
                  </button>
                )}
              </div>
              <button
                onClick={() => setSkippedExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2 text-left"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                  {skippedExpanded ? 'Hide' : 'Show'} the {candidateMisses.length} unparsed line
                  {candidateMisses.length > 1 ? 's' : ''}
                </span>
                <Icon
                  name={skippedExpanded ? 'expand_less' : 'expand_more'}
                  size={14}
                  style={{ color: 'var(--ink-4)' }}
                />
              </button>
              {skippedExpanded && (
                <ul
                  className="space-y-1 px-4 pt-2 pb-3"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  {candidateMisses.map((row, i) => (
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
