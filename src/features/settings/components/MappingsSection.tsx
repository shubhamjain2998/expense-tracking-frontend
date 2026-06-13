import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { getCategories } from '@/lib/api/categories'
import { qk } from '@/lib/queryKeys'

import { useCategoryMappings } from '../hooks/useCategoryMappings'

export function MappingsSection() {
  const {
    query,
    deleteMappingId,
    setDeleteMappingId,
    deleteMutation,
    newPattern,
    setNewPattern,
    newCategoryId,
    setNewCategoryId,
    createMutation,
    editingMappingId,
    editPattern,
    setEditPattern,
    editCategoryId,
    setEditCategoryId,
    updateMutation,
    startEdit,
    cancelEdit,
  } = useCategoryMappings()

  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<'pattern' | 'category' | 'matches' | 'last_used'>(
    'matches'
  )
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const categoriesQuery = useQuery({ queryKey: qk.categories.all, queryFn: getCategories })
  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  function handleCreate() {
    const p = newPattern.trim()
    if (!p || !newCategoryId) return
    createMutation.mutate({ pattern: p, categoryId: newCategoryId })
  }

  function handleSaveEdit(id: string) {
    const p = editPattern.trim()
    if (!p || !editCategoryId) return
    updateMutation.mutate({ id, pattern: p, categoryId: editCategoryId })
  }

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'matches' ? 'desc' : 'asc')
    }
  }

  const rawData = query.data ?? []

  const filtered = search.trim()
    ? rawData.filter((m) => {
        const q = search.trim().toLowerCase()
        return (
          m.description_pattern.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
        )
      })
    : rawData

  const displayData = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'pattern') cmp = a.description_pattern.localeCompare(b.description_pattern)
    else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
    else if (sortCol === 'matches') cmp = a.match_count - b.match_count
    else if (sortCol === 'last_used') {
      const da = a.last_used ?? ''
      const db = b.last_used ?? ''
      if (!da && db) return 1 // nulls last
      if (da && !db) return -1
      cmp = da.localeCompare(db)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

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
          <>
            <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid var(--line)' }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pattern or category…"
                className="input"
                style={{ fontSize: 12 }}
              />
            </div>

            {displayData.length === 0 && search.trim() && rawData.length > 0 ? (
              <p
                className="text-center text-[13px]"
                style={{ color: 'var(--ink-3)', padding: '16px 20px' }}
              >
                No mappings match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--line)' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th
                        onClick={() => toggleSort('pattern')}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        Pattern
                        {sortCol === 'pattern' && (
                          <Icon
                            name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            size={11}
                            style={{ marginLeft: 3, verticalAlign: 'middle' }}
                          />
                        )}
                      </th>
                      <th
                        onClick={() => toggleSort('category')}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        Category
                        {sortCol === 'category' && (
                          <Icon
                            name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            size={11}
                            style={{ marginLeft: 3, verticalAlign: 'middle' }}
                          />
                        )}
                      </th>
                      <th
                        className="num"
                        onClick={() => toggleSort('matches')}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        Matches
                        {sortCol === 'matches' && (
                          <Icon
                            name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            size={11}
                            style={{ marginLeft: 3, verticalAlign: 'middle' }}
                          />
                        )}
                      </th>
                      <th
                        onClick={() => toggleSort('last_used')}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        Last used
                        {sortCol === 'last_used' && (
                          <Icon
                            name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            size={11}
                            style={{ marginLeft: 3, verticalAlign: 'middle' }}
                          />
                        )}
                      </th>
                      <th style={{ width: 72 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((mapping) =>
                      editingMappingId === mapping.id ? (
                        <tr key={mapping.id}>
                          <td>
                            <input
                              value={editPattern}
                              onChange={(e) => setEditPattern(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(mapping.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="input mono"
                              maxLength={500}
                              autoFocus
                              aria-label="Edit pattern"
                            />
                          </td>
                          <td style={{ minWidth: 180 }}>
                            <SearchableSelect
                              options={categoryOptions}
                              value={editCategoryId}
                              onChange={setEditCategoryId}
                              placeholder="Category…"
                            />
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
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleSaveEdit(mapping.id)}
                                disabled={updateMutation.isPending}
                                className="btn ghost icon sm"
                                aria-label="Save mapping"
                              >
                                <Icon name="check" size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn ghost icon sm"
                                aria-label="Cancel edit"
                              >
                                <Icon name="close" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
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
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => startEdit(mapping)}
                                className="btn ghost icon sm"
                                aria-label={`Edit mapping for ${mapping.description_pattern}`}
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteMappingId(mapping.id)}
                                className="btn ghost icon sm"
                                aria-label={`Delete mapping for ${mapping.description_pattern}`}
                              >
                                <Icon name="delete" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Create form */}
        <div
          className="flex items-end gap-2"
          style={{ borderTop: '1px solid var(--line)', padding: '16px 20px' }}
        >
          <div className="flex-1">
            <label className="eyebrow mb-1 block">Pattern</label>
            <input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. SWIGGY"
              className="input mono"
              maxLength={500}
              aria-label="New mapping pattern"
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="eyebrow mb-1 block">Category</label>
            <SearchableSelect
              options={categoryOptions}
              value={newCategoryId}
              onChange={setNewCategoryId}
              placeholder="Category…"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            loading={createMutation.isPending}
            disabled={!newPattern.trim() || !newCategoryId}
          >
            Add
          </Button>
        </div>
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
