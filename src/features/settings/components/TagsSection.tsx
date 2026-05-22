import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonTable } from '@/components/ui/Skeleton'
import type { Tag } from '@/types/settings'

import { useTags } from '../hooks/useTags'

export function TagsSection() {
  const {
    query,
    newTagName,
    setNewTagName,
    deleteTagId,
    setDeleteTagId,
    createMutation,
    deleteMutation,
  } = useTags()

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Tags</p>
            <p className="card-sub">Label and filter transactions across categories.</p>
          </div>
        </div>

        {query.isLoading ? (
          <SkeletonTable rows={3} />
        ) : !query.data?.length ? (
          <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            No tags yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(query.data ?? []).map((tag: Tag) => (
              <div key={tag.id} className="chip" style={{ paddingRight: 4 }}>
                <span style={{ color: 'var(--ink)' }}>{tag.name}</span>
                <button
                  onClick={() => setDeleteTagId(tag.id)}
                  className="ml-0.5 inline-flex items-center"
                  style={{ color: 'var(--ink-4)' }}
                  aria-label={`Delete ${tag.name}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    close
                  </span>
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
            <label className="eyebrow mb-1 block">Create tag</label>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagName.trim()) createMutation.mutate(newTagName.trim())
              }}
              placeholder="Tag name"
              className="input"
              maxLength={64}
              aria-label="New tag name"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => newTagName.trim() && createMutation.mutate(newTagName.trim())}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteTagId !== null}
        title="Delete tag"
        message="Are you sure you want to delete this tag?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTagId && deleteMutation.mutate(deleteTagId)}
        onCancel={() => setDeleteTagId(null)}
      />
    </>
  )
}
