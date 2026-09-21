import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToastContext'

import type { InsightsAggregates } from '../lib/insightsAggregates'
import {
  deanonymizeInsightsPayload,
  loadAnonymizeMap,
  mergeAnonymizeMap,
  saveAnonymizeMap,
  type AnonymizeMap,
} from '../lib/insightsAnonymize'
import { buildInsightsPrompt, PRIVACY_NOTICE } from '../lib/insightsPrompt'
import { parseInsightsResponse } from '../lib/insightsResponseSchema'
import type { InsightsPayload } from '../lib/insightsResponseSchema'

const PRIVACY_SEEN_KEY = 'kosh.insights.privacyAcknowledged.v1'

function hasSeenPrivacyNotice(): boolean {
  try {
    return localStorage.getItem(PRIVACY_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markPrivacyNoticeSeen(): void {
  try {
    localStorage.setItem(PRIVACY_SEEN_KEY, '1')
  } catch {
    // Soft failure — the notice just reappears next visit, which is fine.
  }
}

interface PromptWorkflowProps {
  aggregates: InsightsAggregates
  onSave: (payload: InsightsPayload, periodStart: string, periodEnd: string) => Promise<void>
  isSaving: boolean
  /** Present only for "Regenerate" (a run already exists) — lets the user
   *  back out without discarding the current run. */
  onCancel?: () => void
}

/**
 * The generate-prompt / paste-result workflow shared by the empty state and
 * "Regenerate". Mirrors `BulkPastePanel`'s copy-prompt → paste-JSON shape
 * (the user explicitly asked for "just like how import works today").
 */
export function PromptWorkflow({ aggregates, onSave, isSaving, onCancel }: PromptWorkflowProps) {
  const toast = useToastContext()

  const [privacySeen, setPrivacySeen] = useState(hasSeenPrivacyNotice)
  const [anonymize, setAnonymize] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [pasteText, setPasteText] = useState('')
  const [saveError, setSaveError] = useState('')

  const anonymizeMap: AnonymizeMap | null = useMemo(() => {
    if (!anonymize) return null
    const descriptions = [
      ...aggregates.topTransactions.map((t) => t.description),
      ...aggregates.outliers.map((o) => o.description),
      ...aggregates.commitments.map((c) => c.name),
    ]
    const merged = mergeAnonymizeMap(loadAnonymizeMap(), descriptions)
    saveAnonymizeMap(merged)
    return merged
  }, [anonymize, aggregates])

  const promptText = useMemo(
    () => buildInsightsPrompt(aggregates, { anonymize, anonymizeMap }),
    [aggregates, anonymize, anonymizeMap]
  )

  const parseResult = useMemo(
    () => (pasteText.trim() ? parseInsightsResponse(pasteText) : null),
    [pasteText]
  )
  const parseError = parseResult && !parseResult.ok ? parseResult.error : ''

  function acknowledgePrivacy() {
    markPrivacyNoticeSeen()
    setPrivacySeen(true)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access.')
    }
  }

  function handleGenerateClick() {
    if (!privacySeen) acknowledgePrivacy()
    setShowPrompt(true)
  }

  async function handleSave() {
    if (!parseResult?.ok) return
    setSaveError('')
    try {
      const payload = deanonymizeInsightsPayload(parseResult.payload, anonymizeMap)
      await onSave(payload, aggregates.periodStart, aggregates.periodEnd)
      setPasteText('')
      setShowPrompt(false)
      setShowPaste(false)
      toast.success('Insights updated.')
    } catch (err) {
      const e = err as { detail?: string }
      setSaveError(e.detail ?? 'Could not save this run — try again.')
    }
  }

  return (
    <div className="card space-y-4">
      {!privacySeen ? (
        <div
          className="rounded-[var(--radius)] border border-[var(--line)] p-3"
          style={{ background: 'var(--warn-soft)' }}
        >
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
            <Icon
              name="info"
              size={14}
              style={{ marginTop: 2, flexShrink: 0, color: 'var(--warn)' }}
            />
            <span>{PRIVACY_NOTICE}</span>
          </p>
        </div>
      ) : (
        <details className="text-[12.5px] text-[var(--ink-3)]">
          <summary className="cursor-pointer font-medium text-[var(--ink-2)]">
            What leaves the app
          </summary>
          <p className="mt-1.5 leading-relaxed">{PRIVACY_NOTICE}</p>
        </details>
      )}

      <label className="hit44-pad-v flex w-fit cursor-pointer items-center gap-1.5 text-[12.5px] text-[var(--ink-2)]">
        <input
          type="checkbox"
          checked={anonymize}
          onChange={(e) => setAnonymize(e.target.checked)}
        />
        Anonymise merchant names before copying
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleGenerateClick}>
          <Icon name="auto_awesome" size={13} />
          Generate prompt
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowPaste((v) => !v)}
          aria-expanded={showPaste}
        >
          <Icon name="content_paste" size={13} />
          Paste result
        </Button>
        {onCancel && (
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        )}
      </div>

      {showPrompt && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="eyebrow" htmlFor="insights-prompt-text">
              Prompt — copy this into your LLM
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleCopy()}
              aria-label="Copy prompt to clipboard"
            >
              <Icon name={copyState === 'copied' ? 'check' : 'content_copy'} size={13} />
              {copyState === 'copied' ? 'Copied' : 'Copy prompt'}
            </Button>
          </div>
          <textarea
            id="insights-prompt-text"
            value={promptText}
            readOnly
            className="textarea num"
            style={{ minHeight: 160, fontSize: 11.5 }}
            aria-label="Generated insights prompt"
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}

      {showPaste && (
        <div className="space-y-3">
          <div>
            <label className="eyebrow mb-1 block" htmlFor="insights-paste-json">
              Paste the LLM's JSON reply
            </label>
            <textarea
              id="insights-paste-json"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='{ "schema_version": 1, "verdict": "…", "findings": […], "charts": […] }'
              className="textarea num"
              style={{ minHeight: 140, fontSize: 12 }}
              aria-label="LLM insights JSON reply"
              spellCheck={false}
            />
            {parseError && (
              <p
                className="mt-2 flex items-start gap-1.5 text-[12px]"
                style={{ color: 'var(--neg)' }}
              >
                <Icon name="error" size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{parseError}</span>
              </p>
            )}
            {saveError && (
              <p
                className="mt-2 flex items-start gap-1.5 text-[12px]"
                style={{ color: 'var(--neg)' }}
              >
                <Icon name="error" size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{saveError}</span>
              </p>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            loading={isSaving}
            disabled={!parseResult?.ok}
          >
            Save insights
          </Button>
        </div>
      )}
    </div>
  )
}
