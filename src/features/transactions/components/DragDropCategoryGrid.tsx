import type { Category } from '@/types/settings'

import { categoryColor } from '../lib/categoryColor'

interface DragDropCategoryGridProps {
  categories: Category[]
  dragOverCatId: string | null
  setDragOverCatId: (id: string | null) => void
  onDropOnCategory: (categoryId: string) => void
}

export function DragDropCategoryGrid({
  categories,
  dragOverCatId,
  setDragOverCatId,
  onDropOnCategory,
}: DragDropCategoryGridProps) {
  return (
    <div
      className="hidden md:flex items-center gap-2 overflow-x-auto"
      style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}
    >
      <span className="shrink-0 text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
        Drop to categorize:
      </span>
      {categories.map((cat, idx) => {
        const color = categoryColor(cat.id)
        const isOver = dragOverCatId === cat.id
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px 3px 8px',
              borderRadius: 'var(--radius)',
              border: '1.5px solid ' + (isOver ? color : 'var(--line)'),
              background: isOver
                ? `color-mix(in oklch, ${color} 14%, var(--surface))`
                : 'var(--surface)',
              cursor: 'default',
              transition: 'border-color 0.1s, background 0.1s',
              fontSize: 12,
              fontWeight: 500,
              color: isOver ? color : 'var(--ink-2)',
              userSelect: 'none',
              flexShrink: 0,
              maxWidth: 160,
            }}
            title={cat.name}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
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
  )
}
