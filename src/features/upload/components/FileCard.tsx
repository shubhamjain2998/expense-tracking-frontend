import { useState } from 'react'

import { Chip } from '@/components/ui/Chip'

import type { FileUpload } from '../types'

import { PreviewTable } from './PreviewTable'

export interface FileCardProps {
  upload: FileUpload
  onRemove: () => void
  onToggleExclude: (index: number) => void
}

export function FileCard({ upload, onRemove, onToggleExclude }: FileCardProps) {
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

          <PreviewTable
            rows={filteredRows}
            totalCount={allRows.length}
            excludedIndices={upload.excludedIndices}
            dupeIndices={upload.dupeIndices}
            onToggleExclude={upload.status === 'ready' ? onToggleExclude : undefined}
          />

          {upload.preview.skipped > 0 && (
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
                    {upload.preview.skipped} row{upload.preview.skipped > 1 ? 's' : ''} skipped
                    during parsing — import continues without them
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
