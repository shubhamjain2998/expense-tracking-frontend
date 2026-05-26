import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'

import { useCategoryMappings } from '../hooks/useCategoryMappings'

export function MappingsSection() {
  const { query, deleteMappingId, setDeleteMappingId, deleteMutation } = useCategoryMappings()

  return (
    <>
      <section className="card card-flush">
        <div style={{ padding: 20, paddingBottom: 12 }}>
          <p className="card-title">Category mappings</p>
          <p className="card-sub mt-0.5">Auto-categorisation rules created from the Review page.</p>
        </div>

        {query.isLoading ? (
          <div style={{ padding: '0 20px 20px' }}>
            <SkeletonTable />
          </div>
        ) : !query.data?.length ? (
          <p
            className="text-center text-[13px]"
            style={{ color: 'var(--ink-3)', padding: '0 20px 24px' }}
          >
            No mappings yet. Mappings are created in the Review page when you check &ldquo;Save
            rule&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--line)' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Category</th>
                  <th className="num">Matches</th>
                  <th>Last used</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {query.data.map((mapping) => (
                  <tr key={mapping.id} className="group">
                    <td className="mono" style={{ color: 'var(--ink)' }}>
                      {mapping.description_pattern}
                    </td>
                    <td>
                      <span className="chip">{mapping.category}</span>
                    </td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>
                      {mapping.match_count}
                    </td>
                    <td style={{ color: 'var(--ink-3)' }}>
                      {mapping.last_used
                        ? new Date(mapping.last_used).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => setDeleteMappingId(mapping.id)}
                        className="btn ghost icon sm opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={`Delete mapping for ${mapping.description_pattern}`}
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={deleteMappingId !== null}
        title="Delete mapping"
        message="Future statements won't auto-match this pattern. Continue?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMappingId && deleteMutation.mutate(deleteMappingId)}
        onCancel={() => setDeleteMappingId(null)}
      />
    </>
  )
}
