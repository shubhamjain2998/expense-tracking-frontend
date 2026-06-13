import { Icon } from '@/components/ui/Icon'
import type { Category } from '@/types/settings'

export function IncomeCategoryRow({
  cat,
  renamingCategoryId,
  renamingCategoryName,
  setRenamingCategoryName,
  setRenamingCategoryId,
  renameMutation,
  incomeFlagMutation,
  onDeleteCategory,
}: {
  cat: Category
  renamingCategoryId: string | null
  renamingCategoryName: string
  setRenamingCategoryName: (v: string) => void
  setRenamingCategoryId: (id: string | null) => void
  renameMutation: { mutate: (args: { id: string; name: string }) => void; isPending: boolean }
  incomeFlagMutation: {
    mutate: (args: { id: string; is_income: boolean }) => void
    isPending: boolean
  }
  onDeleteCategory: () => void
}) {
  const isRenaming = renamingCategoryId === cat.id

  return (
    <tr className="group">
      {/* Category name */}
      <td>
        <div className="flex min-w-0 items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--pos)',
              flexShrink: 0,
            }}
          />
          {isRenaming ? (
            <input
              value={renamingCategoryName}
              onChange={(e) => setRenamingCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  renameMutation.mutate({ id: cat.id, name: renamingCategoryName })
                if (e.key === 'Escape') setRenamingCategoryId(null)
              }}
              className="input flex-1"
              style={{ fontSize: 13, height: 26, minWidth: 0 }}
              maxLength={64}
              autoFocus
              aria-label="Rename category"
            />
          ) : (
            <span
              style={{
                color: 'var(--ink-2)',
                fontWeight: 500,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
              title={cat.name}
            >
              {cat.name}
            </span>
          )}
        </div>
      </td>

      {/* Txn count in "monthly budget" col */}
      <td className="num">
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
          {(cat.txn_count ?? 0) === 0 ? 'unused' : `${cat.txn_count} txns`}
        </span>
      </td>

      {/* This Month — n/a for income */}
      <td className="num" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
        —
      </td>

      {/* Progress — empty */}
      <td style={{ padding: '0 12px' }}>
        <div style={{ height: 4, background: 'var(--line)', borderRadius: 2 }} />
      </td>

      {/* YTD */}
      <td className="num" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
        —
      </td>

      {/* Annual */}
      <td className="num" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
        —
      </td>

      {/* Actions */}
      <td>
        {isRenaming ? (
          <div className="flex items-center justify-end gap-0.5">
            <button
              onClick={() => renameMutation.mutate({ id: cat.id, name: renamingCategoryName })}
              disabled={renameMutation.isPending}
              className="btn ghost icon sm"
              aria-label="Confirm rename"
            >
              <Icon name="check" size={13} />
            </button>
            <button
              onClick={() => setRenamingCategoryId(null)}
              className="btn ghost icon sm"
              aria-label="Cancel rename"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <button
              onClick={() => {
                setRenamingCategoryId(cat.id)
                setRenamingCategoryName(cat.name)
              }}
              className="btn ghost icon sm"
              title="Rename category"
              aria-label={`Rename ${cat.name}`}
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              onClick={() => incomeFlagMutation.mutate({ id: cat.id, is_income: false })}
              disabled={incomeFlagMutation.isPending}
              className="btn ghost icon sm"
              title="Move to expense"
              aria-label={`Move ${cat.name} to expense`}
            >
              <Icon name="trending_down" size={13} style={{ color: 'var(--ink-3)' }} />
            </button>
            <button
              onClick={onDeleteCategory}
              className="btn ghost icon sm"
              title="Delete category"
              aria-label={`Delete ${cat.name}`}
            >
              <Icon name="delete" size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
