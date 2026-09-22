import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { PersonShareBuilder } from '@/components/ui/PersonShareBuilder'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { getCategories } from '@/lib/api/categories'
import { createPerson, getPersons } from '@/lib/api/persons'
import { createTag, getTags } from '@/lib/api/tags'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { CategoryMapping, MappingShare } from '@/types/settings'

import type { RuleDraft } from '../hooks/useCategoryMappings'
import { useCategoryMappings } from '../hooks/useCategoryMappings'

type GroupBy = 'none' | 'category' | 'tag' | 'person'
type SortCol = 'pattern' | 'category' | 'matches' | 'last_used'

const UNGROUPED = '\u0000ungrouped'

function shareLabel(share: MappingShare): string {
  const value = Number(share.share_value)
  const amount = share.share_type === 'percentage' ? `${value}%` : `₹${value}`
  return `${share.person_name} ${amount}`
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * The rules that drive auto-categorisation.
 *
 * A rule is not just a category. Whatever category, tags and split it carries
 * is what every transaction it matches receives, so this page shows all three
 * at once and lets any of them be edited in place. Grouping exists because
 * the questions people actually bring here are "which rules feed this
 * category?" and "which rules split with this person?", not "what does rule
 * number 47 say?".
 */
export function MappingsSection() {
  const {
    query,
    deleteMappingId,
    setDeleteMappingId,
    deleteMutation,
    newDraft,
    setNewDraft,
    createMutation,
    editingMappingId,
    editDraft,
    setEditDraft,
    updateMutation,
    startEdit,
    cancelEdit,
  } = useCategoryMappings()

  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortCol, setSortCol] = useState<SortCol>('matches')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showCreate, setShowCreate] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const categoriesQuery = useQuery({ queryKey: qk.categories.all, queryFn: getCategories })
  const tagsQuery = useQuery({ queryKey: qk.tags.all, queryFn: getTags })
  const personsQuery = useQuery({ queryKey: qk.persons.all, queryFn: getPersons })

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))
  const tags = tagsQuery.data ?? []
  const persons = personsQuery.data ?? []

  async function handleCreateTag(name: string) {
    const t = await createTag(name)
    invalidateDomains(qc, ['tags'])
    return t
  }

  async function handleCreatePerson(name: string) {
    const p = await createPerson(name)
    invalidateDomains(qc, ['persons'])
    return p
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'matches' ? 'desc' : 'asc')
    }
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const rawData = useMemo(() => query.data ?? [], [query.data])

  const stats = useMemo(() => {
    const withTags = rawData.filter((m) => m.tags.length > 0).length
    const withSplit = rawData.filter((m) => m.shares.length > 0).length
    return { total: rawData.length, withTags, withSplit }
  }, [rawData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rawData
    // Search every facet the row shows, so a tag or a person's name finds the
    // rule that carries it.
    return rawData.filter(
      (m) =>
        m.description_pattern.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.tags.some((t) => t.name.toLowerCase().includes(q)) ||
        m.shares.some((s) => s.person_name.toLowerCase().includes(q))
    )
  }, [rawData, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'pattern') cmp = a.description_pattern.localeCompare(b.description_pattern)
      else if (sortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortCol === 'matches') cmp = a.match_count - b.match_count
      else {
        const da = a.last_used ?? ''
        const db = b.last_used ?? ''
        if (!da && db) return 1 // nulls last, regardless of direction
        if (da && !db) return -1
        cmp = da.localeCompare(db)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  /**
   * Grouped view. A rule with two tags appears under each of them — the
   * question "which rules tag things as groceries?" wants every one of them,
   * even the rules that also do something else.
   */
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', rules: sorted }]

    const buckets = new Map<string, { label: string; rules: CategoryMapping[] }>()
    const push = (key: string, label: string, rule: CategoryMapping) => {
      const bucket = buckets.get(key) ?? { label, rules: [] }
      bucket.rules.push(rule)
      buckets.set(key, bucket)
    }

    for (const rule of sorted) {
      if (groupBy === 'category') push(rule.category_id, rule.category, rule)
      else if (groupBy === 'tag') {
        if (rule.tags.length === 0) push(UNGROUPED, 'No tags', rule)
        else for (const tag of rule.tags) push(tag.id, tag.name, rule)
      } else {
        if (rule.shares.length === 0) push(UNGROUPED, 'No split', rule)
        else for (const share of rule.shares) push(share.person_id, share.person_name, rule)
      }
    }

    return Array.from(buckets.entries())
      .map(([key, bucket]) => ({ key, ...bucket }))
      .sort((a, b) => {
        // The catch-all bucket is context, not an answer — keep it last.
        if (a.key === UNGROUPED) return 1
        if (b.key === UNGROUPED) return -1
        return b.rules.length - a.rules.length || a.label.localeCompare(b.label)
      })
  }, [sorted, groupBy])

  function renderEditor(
    draft: RuleDraft,
    setDraft: (d: RuleDraft) => void,
    idPrefix: string,
    // The create form and an open edit row can be on screen together, so the
    // fields need names that tell them apart.
    scope: string
  ) {
    return (
      <div className="space-y-3" style={{ padding: '4px 0' }}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label className="eyebrow mb-1 block" htmlFor={`${idPrefix}-pattern`}>
              Pattern
            </label>
            <input
              id={`${idPrefix}-pattern`}
              aria-label={`${scope} pattern`}
              value={draft.pattern}
              onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
              placeholder="e.g. SWIGGY"
              className="input mono"
              maxLength={500}
            />
          </div>
          <div style={{ minWidth: 190 }}>
            <SearchableSelect
              label="Category"
              options={categoryOptions}
              value={draft.categoryId}
              onChange={(v) => setDraft({ ...draft, categoryId: v })}
              placeholder={`${scope} category…`}
            />
          </div>
        </div>

        <MultiSelect
          label={`${scope} tags`}
          items={tags}
          selectedIds={draft.tagIds}
          onChange={(ids) => setDraft({ ...draft, tagIds: ids })}
          onCreateItem={handleCreateTag}
          icon="tag"
          itemIcon="tag"
          placeholder="Search tags…"
          createLabel="Create tag"
          showInitials={false}
        />

        <PersonShareBuilder
          persons={persons}
          shares={draft.shares}
          onChange={(shares) => setDraft({ ...draft, shares })}
          totalAmount={0}
          hideAmounts
          label={`${scope} split`}
          onCreatePerson={handleCreatePerson}
        />
      </div>
    )
  }

  function renderRow(mapping: CategoryMapping) {
    if (editingMappingId === mapping.id) {
      return (
        <tr key={mapping.id}>
          <td colSpan={6} style={{ background: 'var(--surface-2)' }}>
            {renderEditor(editDraft, setEditDraft, `rule-${mapping.id}`, 'Edit rule')}
            <div className="flex items-center gap-2" style={{ padding: '4px 0 8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  editDraft.pattern.trim() &&
                  editDraft.categoryId &&
                  updateMutation.mutate({
                    id: mapping.id,
                    draft: { ...editDraft, pattern: editDraft.pattern.trim() },
                  })
                }
                loading={updateMutation.isPending}
                disabled={!editDraft.pattern.trim() || !editDraft.categoryId}
              >
                Save rule
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </td>
        </tr>
      )
    }

    return (
      <tr key={mapping.id} className="group">
        <td className="mono" style={{ color: 'var(--ink)' }}>
          {mapping.description_pattern}
        </td>
        <td>
          <span className="chip">{mapping.category}</span>
        </td>
        <td>
          {mapping.tags.length === 0 ? (
            <span style={{ color: 'var(--ink-3)' }}>—</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {mapping.tags.map((t) => (
                <span key={t.id} className="chip">
                  {t.name}
                </span>
              ))}
            </span>
          )}
        </td>
        <td>
          {mapping.shares.length === 0 ? (
            <span style={{ color: 'var(--ink-3)' }}>—</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {mapping.shares.map((s) => (
                <span key={s.person_id} className="chip">
                  {shareLabel(s)}
                </span>
              ))}
            </span>
          )}
        </td>
        <td className="num" style={{ color: 'var(--ink-2)' }} title="Auto-categorised matches">
          {mapping.match_count}
        </td>
        <td>
          <div className="flex items-center justify-end gap-0.5">
            <span className="mr-2 text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
              {formatDate(mapping.last_used)}
            </span>
            <button
              onClick={() => startEdit(mapping)}
              className="btn ghost icon sm"
              aria-label={`Edit rule for ${mapping.description_pattern}`}
            >
              <Icon name="edit" size={14} />
            </button>
            <button
              onClick={() => setDeleteMappingId(mapping.id)}
              className="btn ghost icon sm"
              aria-label={`Delete rule for ${mapping.description_pattern}`}
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const sortIcon = (col: SortCol) =>
    sortCol === col ? (
      <Icon
        name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
        size={11}
        style={{ marginLeft: 3, verticalAlign: 'middle' }}
      />
    ) : null

  const headerStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' } as const

  return (
    <>
      <section className="card card-flush">
        <div
          className="flex flex-wrap items-start justify-between gap-3"
          style={{ padding: 20, paddingBottom: 12 }}
        >
          <div>
            <p className="card-title">Rules</p>
            <p className="card-sub mt-0.5">
              Every transaction a rule matches gets its category, its tags and its split.
            </p>
          </div>
          <Button
            variant={showCreate ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'Cancel' : 'New rule'}
          </Button>
        </div>

        {rawData.length > 0 && (
          <p className="text-[12px]" style={{ color: 'var(--ink-3)', padding: '0 20px 12px' }}>
            {stats.total} rules · {stats.withTags} carry tags · {stats.withSplit} carry a split
          </p>
        )}

        {showCreate && (
          <div style={{ borderTop: '1px solid var(--line)', padding: '12px 20px 16px' }}>
            {renderEditor(newDraft, setNewDraft, 'rule-new', 'New rule')}
            <div className="flex items-center gap-2" style={{ paddingTop: 8 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  createMutation.mutate({ ...newDraft, pattern: newDraft.pattern.trim() })
                }
                loading={createMutation.isPending}
                disabled={!newDraft.pattern.trim() || !newDraft.categoryId}
              >
                Create rule
              </Button>
            </div>
          </div>
        )}

        {query.isLoading ? (
          <div style={{ padding: '0 20px 20px' }}>
            <SkeletonTable />
          </div>
        ) : rawData.length === 0 ? (
          <p
            className="text-center text-[13px]"
            style={{ color: 'var(--ink-3)', padding: '0 20px 24px' }}
          >
            No rules yet. One is saved whenever you categorise a transaction with &ldquo;Save
            rule&rdquo; ticked.
          </p>
        ) : (
          <>
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ padding: '12px 20px 8px', borderBottom: '1px solid var(--line)' }}
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pattern, category, tag or person…"
                className="input"
                style={{ fontSize: 12, flex: 1, minWidth: 200 }}
              />
              <div className="seg" style={{ flexShrink: 0 }}>
                {(
                  [
                    ['none', 'Flat'],
                    ['category', 'By category'],
                    ['tag', 'By tag'],
                    ['person', 'By split'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={groupBy === value ? 'on' : ''}
                    onClick={() => setGroupBy(value)}
                    style={{ fontSize: 11.5, padding: '3px 10px' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {sorted.length === 0 ? (
              <p
                className="text-center text-[13px]"
                style={{ color: 'var(--ink-3)', padding: '16px 20px' }}
              >
                No rules match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('pattern')} style={headerStyle}>
                        Pattern
                        {sortIcon('pattern')}
                      </th>
                      <th onClick={() => toggleSort('category')} style={headerStyle}>
                        Category
                        {sortIcon('category')}
                      </th>
                      <th style={{ whiteSpace: 'nowrap' }}>Tags</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Split</th>
                      <th className="num" onClick={() => toggleSort('matches')} style={headerStyle}>
                        Matches
                        {sortIcon('matches')}
                      </th>
                      <th
                        onClick={() => toggleSort('last_used')}
                        style={{ ...headerStyle, textAlign: 'right' }}
                      >
                        Last used
                        {sortIcon('last_used')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <Fragment key={group.key}>
                        {groupBy !== 'none' && (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                background: 'var(--surface-2)',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              onClick={() => toggleGroup(group.key)}
                            >
                              <span className="flex items-center gap-1.5">
                                <Icon
                                  name={collapsed.has(group.key) ? 'chevron_right' : 'expand_more'}
                                  size={14}
                                />
                                <span className="text-[12px] font-semibold">{group.label}</span>
                                <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                                  {group.rules.length}
                                </span>
                              </span>
                            </td>
                          </tr>
                        )}
                        {!collapsed.has(group.key) && group.rules.map(renderRow)}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={deleteMappingId !== null}
        title="Delete rule"
        message="Future transactions won't be matched, tagged or split by this rule. Transactions it already categorised are not changed."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMappingId && deleteMutation.mutate(deleteMappingId)}
        onCancel={() => setDeleteMappingId(null)}
      />
    </>
  )
}
