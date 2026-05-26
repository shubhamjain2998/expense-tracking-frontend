import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useIgnoreRules } from '@/hooks/useIgnoreRules'
import { addIgnoreRule, removeIgnoreRule } from '@/lib/ignoreRules'

export function IgnoreRulesSection() {
  const ignoreRules = useIgnoreRules()
  const [newIgnoreKeyword, setNewIgnoreKeyword] = useState('')
  const [ignoreKeywordError, setIgnoreKeywordError] = useState('')

  function handleAddIgnoreRule() {
    const trimmed = newIgnoreKeyword.trim().toLowerCase()
    if (!trimmed) {
      setIgnoreKeywordError('Keyword is required')
      return
    }
    if (ignoreRules.includes(trimmed)) {
      setIgnoreKeywordError('Already exists')
      return
    }
    addIgnoreRule(trimmed)
    setNewIgnoreKeyword('')
    setIgnoreKeywordError('')
  }

  function handleRemoveIgnoreRule(keyword: string) {
    removeIgnoreRule(keyword)
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Ignore rules</p>
          <p className="card-sub">
            Transactions matching any of these keywords are auto-excluded on import.
          </p>
        </div>
      </div>

      {ignoreRules.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
          No ignore rules yet. Add keywords like &ldquo;salary&rdquo; or &ldquo;refund&rdquo; to
          skip matching rows automatically.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ignoreRules.map((keyword) => (
            <div key={keyword} className="chip" style={{ paddingRight: 4 }}>
              <span className="mono" style={{ color: 'var(--ink)' }}>
                {keyword}
              </span>
              <button
                onClick={() => handleRemoveIgnoreRule(keyword)}
                className="ml-0.5 inline-flex items-center"
                style={{ color: 'var(--ink-4)' }}
                aria-label={`Remove rule ${keyword}`}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-4 flex items-end gap-2"
        style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
      >
        <div className="flex-1">
          <label className="eyebrow mb-1 block">Add keyword</label>
          <input
            value={newIgnoreKeyword}
            onChange={(e) => {
              setNewIgnoreKeyword(e.target.value)
              setIgnoreKeywordError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoreRule()}
            placeholder="e.g. salary, refund, transfer"
            className="input mono"
            aria-label="New ignore keyword"
          />
          {ignoreKeywordError && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
              {ignoreKeywordError}
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={handleAddIgnoreRule}>
          Add
        </Button>
      </div>
    </section>
  )
}
