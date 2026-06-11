import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { Category } from '@/types/settings'

interface BulkActionsBarProps {
  count: number
  pendingCount: number
  categories: Category[]
  onAutoCategorise: () => void
  autoCategoriseLoading: boolean
  onCategorise: (categoryId: string) => Promise<void>
  onDelete: () => void
  onClear: () => void
}

export function BulkActionsBar({
  count,
  pendingCount,
  categories,
  onAutoCategorise,
  autoCategoriseLoading,
  onCategorise,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [catId, setCatId] = useState('')
  const [categorising, setCategorising] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Esc clears selection OR closes picker first
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showCatPicker) {
        setShowCatPicker(false)
        setCatId('')
      } else {
        onClear()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showCatPicker, onClear])

  // Close picker on outside click
  useEffect(() => {
    if (!showCatPicker) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCatPicker(false)
        setCatId('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCatPicker])

  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  async function handleApplyCat() {
    if (!catId || categorising) return
    setCategorising(true)
    try {
      await onCategorise(catId)
      setShowCatPicker(false)
      setCatId('')
    } finally {
      setCategorising(false)
    }
  }

  return (
    <div
      className="animate-fade-down"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        marginTop: 12,
        background: 'var(--accent-soft)',
        border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
        borderRadius: 'var(--radius)',
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', flex: 1 }}>
        {count} selected
      </span>

      {/* Categorise picker */}
      <div ref={pickerRef} style={{ position: 'relative' }}>
        {showCatPicker ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 6,
              padding: '10px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-pop)',
              minWidth: 240,
              zIndex: 20,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchableSelect
                options={catOptions}
                value={catId}
                onChange={setCatId}
                placeholder="Pick a category…"
              />
            </div>
            <button
              onClick={() => void handleApplyCat()}
              disabled={!catId || categorising}
              style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                background: catId ? 'var(--accent)' : 'var(--surface-2)',
                color: catId ? 'white' : 'var(--ink-3)',
                border: 'none',
                cursor: !catId || categorising ? 'default' : 'pointer',
                opacity: categorising ? 0.7 : 1,
              }}
            >
              {categorising ? 'Applying…' : 'Apply'}
            </button>
          </div>
        ) : null}
        <button
          onClick={() => {
            setShowCatPicker((v) => !v)
            setCatId('')
          }}
          aria-label="Bulk categorise"
          title="Assign a category to all selected transactions"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            background: showCatPicker ? 'var(--accent)' : 'var(--surface)',
            color: showCatPicker ? 'white' : 'var(--ink-2)',
            border: `1px solid ${showCatPicker ? 'var(--accent)' : 'var(--line)'}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Icon name="tag" size={12} />
          Categorise
        </button>
      </div>

      {pendingCount > 0 && (
        <button
          onClick={onAutoCategorise}
          disabled={autoCategoriseLoading}
          title="Run auto-categorise on the pending rows in your selection"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            cursor: autoCategoriseLoading ? 'wait' : 'pointer',
            opacity: autoCategoriseLoading ? 0.7 : 1,
          }}
        >
          {autoCategoriseLoading ? 'Categorising…' : `Auto-categorise ${pendingCount}`}
        </button>
      )}
      <button
        onClick={onDelete}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: 'var(--radius)',
          background: 'var(--neg)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Delete {count}
      </button>
      <button
        onClick={onClear}
        title="Clear selection (Esc)"
        style={{
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 'var(--radius)',
          background: 'none',
          color: 'var(--ink-3)',
          border: '1px solid var(--line)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Icon name="close" size={11} />
        Clear
      </button>
    </div>
  )
}
