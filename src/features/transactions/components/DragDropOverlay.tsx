import { useEffect, useRef } from 'react'

import type { Category, Tag } from '@/types/settings'

import { categoryColor } from '../lib/categoryColor'

interface DragDropOverlayProps {
  categories: Category[]
  tags: Tag[]
  isDragging: boolean
  dragOverCatId: string | null
  setDragOverCatId: (id: string | null) => void
  pendingCategoryId: string | null
  pendingTagIds: Set<string>
  onDropOnCategory: (categoryId: string) => void
  onToggleTag: (tagId: string) => void
  onApply: (catId: string, tagIds: string[]) => void
  onCancel: () => void
}

export function DragDropOverlay({
  categories,
  tags,
  isDragging,
  dragOverCatId,
  setDragOverCatId,
  pendingCategoryId,
  pendingTagIds,
  onDropOnCategory,
  onToggleTag,
  onApply,
  onCancel,
}: DragDropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Enter to apply, Escape to cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && pendingCategoryId) {
        e.preventDefault()
        onApply(pendingCategoryId, Array.from(pendingTagIds))
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingCategoryId, pendingTagIds, onApply, onCancel])

  // Click outside to cancel (only when in pending state, not during active drag)
  useEffect(() => {
    if (!pendingCategoryId) return
    function onMouseDown(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [pendingCategoryId, onCancel])

  const pendingCat = categories.find((c) => c.id === pendingCategoryId)
  const selectedTagNames = tags.filter((t) => pendingTagIds.has(t.id)).map((t) => t.name)
  const applyLabel = pendingCat
    ? selectedTagNames.length > 0
      ? `Apply → ${pendingCat.name} + ${selectedTagNames.join(', ')}`
      : `Apply → ${pendingCat.name}`
    : 'Apply'

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: 'var(--surface)',
        border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 16px',
      }}
    >
      {/* Category section */}
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--ink-4)',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        Category
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {categories.map((cat, idx) => {
          const color = categoryColor(cat.id)
          const isOver = dragOverCatId === cat.id
          const isSelected = pendingCategoryId === cat.id
          return (
            <div
              key={cat.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCatId(cat.id)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCatId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                onDropOnCategory(cat.id)
              }}
              onClick={() => {
                if (!isDragging) onDropOnCategory(cat.id)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px 3px 8px',
                borderRadius: 'var(--radius)',
                border: '1.5px solid ' + (isSelected || isOver ? color : 'var(--line)'),
                background: isSelected
                  ? `color-mix(in oklch, ${color} 18%, var(--surface))`
                  : isOver
                    ? `color-mix(in oklch, ${color} 12%, var(--surface))`
                    : 'var(--surface)',
                cursor: isDragging ? 'default' : 'pointer',
                transition: 'border-color 0.1s, background 0.1s',
                fontSize: 12,
                fontWeight: 500,
                color: isSelected || isOver ? color : 'var(--ink-2)',
                userSelect: 'none',
              }}
              title={cat.name}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {cat.name}
              </span>
              {idx < 9 && (
                <span
                  style={{
                    marginLeft: 2,
                    fontSize: 10,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--ink-4)',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Tags section */}
      {tags.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--ink-4)',
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Tags{' '}
            <span
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                opacity: 0.55,
                fontSize: 9,
                fontWeight: 500,
              }}
            >
              (optional)
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => {
              const isSelected = pendingTagIds.has(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 10px',
                    borderRadius: 100,
                    border: '1.5px solid ' + (isSelected ? 'var(--ink-1)' : 'var(--line)'),
                    background: isSelected ? 'var(--ink-1)' : 'var(--surface)',
                    color: isSelected ? 'var(--surface)' : 'var(--ink-2)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.1s, border-color 0.1s, color 0.1s',
                  }}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          disabled={!pendingCategoryId}
          onClick={() => pendingCategoryId && onApply(pendingCategoryId, Array.from(pendingTagIds))}
          className="btn sm"
        >
          {applyLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12,
            color: 'var(--ink-4)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
          }}
        >
          cancel
        </button>
      </div>
    </div>
  )
}
