import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useIgnoreRules } from '@/hooks/useIgnoreRules'
import { useToastContext } from '@/hooks/useToastContext'
import type { PreviewResponse, PreviewRow } from '@/types/transaction'

import { useBulkPasteImport } from '../hooks/useBulkPasteImport'
import { buildPreviewResult, type PreviewResult } from '../lib/buildPreviewResult'
import { BULK_PASTE_PROMPT, parseBulkPasteJson, type BulkPasteRow } from '../lib/bulkPasteSchema'

import { PreviewTable } from './PreviewTable'

function rowsToPreviewResponse(rows: BulkPasteRow[]): PreviewResponse {
  const previewRows: PreviewRow[] = rows.map((r) => ({
    txn_date: r.txn_date,
    description: r.description,
    amount: r.amount.toFixed(2),
  }))
  return { rows: previewRows, would_insert: previewRows.length, skipped: 0, skipped_rows: [] }
}

export function BulkPastePanel() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const ignoreRules = useIgnoreRules()
  const { importRows } = useBulkPasteImport()

  const [text, setText] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [isImporting, setIsImporting] = useState(false)

  // Stash the dedupe pipeline output alongside the rows it was built from.
  // Comparing the stored ref to the current parsed rows is how we tell whether
  // the preview is stale — avoids a sync setState-in-effect to clear it.
  const [previewState, setPreviewState] = useState<{
    rows: BulkPasteRow[]
    result: PreviewResult
  } | null>(null)

  // User toggles on top of the auto-excluded set returned by buildPreviewResult.
  // Reset by the dedupe .then() whenever a new parsedRows lands.
  const [userOverrides, setUserOverrides] = useState<Set<number>>(new Set())

  const parseResult = useMemo(() => {
    if (text.trim() === '') return null
    return parseBulkPasteJson(text)
  }, [text])

  const parsedRows = parseResult?.ok ? parseResult.rows : null
  const parseError = parseResult && !parseResult.ok ? parseResult.error : ''

  useEffect(() => {
    if (!parsedRows) return
    let cancelled = false
    void buildPreviewResult(rowsToPreviewResponse(parsedRows), ignoreRules).then((result) => {
      if (cancelled) return
      setPreviewState({ rows: parsedRows, result })
      setUserOverrides(new Set())
    })
    return () => {
      cancelled = true
    }
  }, [parsedRows, ignoreRules])

  const previewResult =
    previewState && previewState.rows === parsedRows ? previewState.result : null
  const isBuildingPreview = !!parsedRows && !previewResult

  const excludedIndices = useMemo(() => {
    if (!previewResult) return new Set<number>()
    const set = new Set<number>(previewResult.autoExcluded)
    userOverrides.forEach((i) => {
      if (set.has(i)) set.delete(i)
      else set.add(i)
    })
    return set
  }, [previewResult, userOverrides])

  const includedRows = useMemo(() => {
    if (!parsedRows) return []
    return parsedRows.filter((_, i) => !excludedIndices.has(i))
  }, [parsedRows, excludedIndices])

  const previewRowsForTable = useMemo(() => {
    if (!previewResult) return []
    return previewResult.preview.rows.map((row, globalIndex) => ({ row, globalIndex }))
  }, [previewResult])

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(BULK_PASTE_PROMPT)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access.')
    }
  }

  function toggleExclude(index: number) {
    setUserOverrides((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  async function handleImport() {
    if (!parsedRows || includedRows.length === 0) return
    setIsImporting(true)

    try {
      const data = await importRows(
        includedRows.map((r) => ({
          txn_date: r.txn_date,
          description: r.description,
          amount: r.amount,
        }))
      )
      toast.success(`${data.inserted} transactions imported, ${data.skipped} skipped`)
      if (data.inserted > 0) navigate('/transactions')
    } catch (err) {
      const e = err as { detail?: string; status?: number }
      if (e.status === 409) {
        const msg =
          typeof e.detail === 'string' ? e.detail : 'These rows have already been imported.'
        toast.warning(msg)
      } else {
        toast.error(e.detail ?? 'Import failed')
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <p className="card-title">Bulk paste from any LLM</p>
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          Works for any bank, any source — use this when your PDF isn't supported by the parser,
          when you want to log un-billed transactions, or when you only have a mobile-app screen.
          Screenshot what you want to import, paste the prompt below into ChatGPT / Claude / Gemini
          with the screenshot attached, then paste the JSON response back here.
        </p>

        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleCopyPrompt()}
            aria-label="Copy prompt to clipboard"
          >
            <Icon name={copyState === 'copied' ? 'check' : 'content_copy'} size={13} />
            {copyState === 'copied' ? 'Copied' : 'Copy prompt'}
          </Button>
        </div>

        <label className="eyebrow mt-4 mb-1 block" htmlFor="bulk-paste-json">
          Paste JSON response
        </label>
        <textarea
          id="bulk-paste-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{ "schema_version": 1, "rows": [ … ] }'
          className="textarea num"
          style={{ minHeight: 140, fontSize: 12 }}
          aria-label="LLM JSON output"
          spellCheck={false}
        />
        {parseError && (
          <p className="mt-2 flex items-start gap-1.5 text-[12px]" style={{ color: 'var(--neg)' }}>
            <Icon name="error" size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{parseError}</span>
          </p>
        )}
      </div>

      {parsedRows && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
              <span className="num font-medium" style={{ color: 'var(--ink)' }}>
                {includedRows.length}
              </span>{' '}
              of {parsedRows.length} transactions ready
              {previewResult && previewResult.dupeIndices.size > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span style={{ color: 'var(--warn)' }}>
                    {previewResult.dupeIndices.size} possible duplicate
                    {previewResult.dupeIndices.size > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleImport()}
              loading={isImporting}
              disabled={includedRows.length === 0 || isBuildingPreview}
            >
              Import {includedRows.length > 0 ? includedRows.length : ''} transactions
            </Button>
          </div>

          {previewResult && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <PreviewTable
                rows={previewRowsForTable}
                totalCount={parsedRows.length}
                excludedIndices={excludedIndices}
                dupeIndices={previewResult.dupeIndices}
                onToggleExclude={isImporting ? undefined : toggleExclude}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
