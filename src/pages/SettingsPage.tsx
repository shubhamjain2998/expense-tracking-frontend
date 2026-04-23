import { useState } from 'react'
import { getIgnoreRules, addIgnoreRule, removeIgnoreRule } from '../lib/ignoreRules'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getPersons,
  createPerson,
  deletePerson,
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  getCategoryMappings,
  deleteCategoryMapping,
  getTags,
  createTag,
  deleteTag,
  clearAllMappings,
  deleteAllData,
  deleteAllRawTransactions,
  deleteAllProcessedTransactions,
  deleteAllBudget,
  deleteAllPersons,
} from '../lib/api'
import type { Person, Category, Tag } from '../types/settings'
import { Button } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToastContext } from '../hooks/useToastContext'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function PersonCard({
  person,
  onDelete,
}: {
  person: Person
  index: number
  onDelete: (id: string) => void
}) {
  const joined = person.created_at
    ? new Date(person.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <div
      className="group flex items-center gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        minWidth: 220,
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--surface-3)',
          color: 'var(--ink-2)',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {getInitials(person.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
          {person.name}
        </p>
        {joined && (
          <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Joined {joined}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(person.id)}
        className="btn ghost icon sm shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Delete ${person.name}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          delete
        </span>
      </button>
    </div>
  )
}

export function SettingsPage() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [newPersonName, setNewPersonName] = useState('')
  const [personNameError, setPersonNameError] = useState('')
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)
  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [pendingDangerKey, setPendingDangerKey] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState('persons')

  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)
  const [renamingCategoryName, setRenamingCategoryName] = useState('')

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const [ignoreRules, setIgnoreRules] = useState<string[]>(() => getIgnoreRules())
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
    setIgnoreRules(addIgnoreRule(trimmed))
    setNewIgnoreKeyword('')
    setIgnoreKeywordError('')
  }

  function handleRemoveIgnoreRule(keyword: string) {
    setIgnoreRules(removeIgnoreRule(keyword))
  }

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const mappingsQuery = useQuery({ queryKey: ['categoryMappings'], queryFn: getCategoryMappings })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const createPersonMutation = useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['persons'] })
      setNewPersonName('')
      setPersonNameError('')
      toast.success('Person added')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) setPersonNameError('Name already exists')
      else toast.error(err.detail)
    },
  })

  const deletePersonMutation = useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['persons'] })
      toast.success('Person removed')
      setDeletePersonId(null)
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.warning('This person is linked to transactions and cannot be deleted')
      else toast.error(err.detail)
      setDeletePersonId(null)
    },
  })

  function handleAddPerson() {
    if (!newPersonName.trim()) {
      setPersonNameError('Name is required')
      return
    }
    createPersonMutation.mutate(newPersonName.trim())
  }

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      setNewCategoryName('')
      toast.success('Category created')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) toast.error('Category already exists')
      else toast.error(err.detail)
    },
  })

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      void qc.invalidateQueries({ queryKey: ['budget'] })
      toast.success('Category renamed')
      setRenamingCategoryId(null)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      void qc.invalidateQueries({ queryKey: ['budget'] })
      toast.success('Category deleted')
      setDeleteCategoryId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteCategoryId(null)
    },
  })

  const deleteMappingMutation = useMutation({
    mutationFn: deleteCategoryMapping,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categoryMappings'] })
      toast.success('Mapping deleted')
      setDeleteMappingId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteMappingId(null)
    },
  })

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
      setNewTagName('')
      toast.success('Tag created')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) toast.error('Tag already exists')
      else toast.error(err.detail)
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag deleted')
      setDeleteTagId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteTagId(null)
    },
  })

  const dangerActions: Record<
    string,
    {
      icon: string
      title: string
      description: string
      confirmMessage: string
      confirmLabel: string
      mutationFn: () => Promise<void>
      invalidateKeys?: string[]
    }
  > = {
    raw: {
      icon: 'upload_file',
      title: 'Raw transactions',
      description: 'All unprocessed transactions from uploaded statements.',
      confirmMessage:
        'This will permanently delete all raw (unprocessed) transactions. Any pending review items will be lost.',
      confirmLabel: 'Delete raw transactions',
      mutationFn: deleteAllRawTransactions,
      invalidateKeys: ['rawTransactions'],
    },
    processed: {
      icon: 'receipt_long',
      title: 'Processed transactions',
      description: 'All reviewed and categorised transaction history.',
      confirmMessage:
        'This will permanently delete all processed transactions and their category assignments. Your spending history will be wiped.',
      confirmLabel: 'Delete processed transactions',
      mutationFn: deleteAllProcessedTransactions,
      invalidateKeys: ['processedTransactions', 'dashboard'],
    },
    mappings: {
      icon: 'rule',
      title: 'Category mappings',
      description: 'All saved auto-categorisation rules.',
      confirmMessage:
        'This will permanently delete all category mapping rules. Auto-categorisation will stop working until new rules are created.',
      confirmLabel: 'Delete all mappings',
      mutationFn: clearAllMappings,
      invalidateKeys: ['categoryMappings'],
    },
    budget: {
      icon: 'savings',
      title: 'Budget plans',
      description: 'All budget allocations across all years.',
      confirmMessage:
        'This will permanently delete all budget plans and allocations across every year.',
      confirmLabel: 'Delete all budgets',
      mutationFn: deleteAllBudget,
      invalidateKeys: ['budget'],
    },
    persons: {
      icon: 'group',
      title: 'Persons',
      description: 'All household members and their associations.',
      confirmMessage:
        'This will permanently delete all persons. Split transaction assignments will be removed.',
      confirmLabel: 'Delete all persons',
      mutationFn: deleteAllPersons,
      invalidateKeys: ['persons'],
    },
    all: {
      icon: 'delete_forever',
      title: 'Everything',
      description: 'Wipe the entire database — transactions, budgets, mappings, and persons.',
      confirmMessage:
        'This will permanently erase ALL data in your workspace: every transaction, budget plan, category mapping, and person. Your entire financial history will be gone. This cannot be recovered.',
      confirmLabel: 'Yes, delete everything',
      mutationFn: deleteAllData,
    },
  }

  const dangerMutation = useMutation({
    mutationFn: () => {
      const action = pendingDangerKey ? dangerActions[pendingDangerKey] : null
      if (!action) return Promise.resolve()
      return action.mutationFn()
    },
    onSuccess: () => {
      const action = pendingDangerKey ? dangerActions[pendingDangerKey] : null
      if (action?.invalidateKeys) {
        action.invalidateKeys.forEach((key) => void qc.invalidateQueries({ queryKey: [key] }))
      } else {
        void qc.invalidateQueries()
      }
      toast.success(`${action?.title ?? 'Data'} deleted`)
      setPendingDangerKey(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setPendingDangerKey(null)
    },
  })

  const navItems = [
    { id: 'persons', label: 'Persons' },
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    { id: 'ignore-rules', label: 'Ignore rules' },
    { id: 'mappings', label: 'Auto-mappings' },
    { id: 'danger', label: 'Danger zone' },
  ]

  return (
    <div className="space-y-5">
      <header>
        <p className="card-eyebrow">Settings</p>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Workspace settings
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Configure your workspace, household members, and automation rules.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <nav className="lg:col-span-3" aria-label="Settings navigation">
          <p className="card-eyebrow mb-2">Sections</p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = activeNav === item.id
              const isDanger = item.id === 'danger'
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveNav(item.id)}
                    className="flex w-full items-center"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 'var(--radius)',
                      fontSize: 13,
                      fontWeight: 500,
                      background: isActive ? 'var(--surface-2)' : 'transparent',
                      color: isDanger
                        ? isActive
                          ? 'var(--neg)'
                          : 'var(--neg)'
                        : isActive
                          ? 'var(--ink)'
                          : 'var(--ink-3)',
                      transition: 'background .1s ease, color .1s ease',
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="space-y-5 lg:col-span-9">
          {/* Persons */}
          {activeNav === 'persons' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title">Persons</p>
                  <p className="card-sub">Track expenses across household members.</p>
                </div>
              </div>

              {personsQuery.isLoading ? (
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-shimmer"
                      style={{ height: 56, width: 220, borderRadius: 'var(--radius)' }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(personsQuery.data ?? []).map((person: Person, i) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      index={i}
                      onDelete={setDeletePersonId}
                    />
                  ))}
                </div>
              )}

              <div
                className="mt-4 flex items-end gap-2"
                style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
              >
                <div className="flex-1">
                  <label className="eyebrow mb-1 block">Add member</label>
                  <input
                    value={newPersonName}
                    onChange={(e) => {
                      setNewPersonName(e.target.value)
                      setPersonNameError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                    placeholder="Full name"
                    className="input"
                    aria-label="New person name"
                  />
                  {personNameError && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                      {personNameError}
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddPerson}
                  loading={createPersonMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </section>
          )}

          {/* Categories */}
          {activeNav === 'categories' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title">Categories</p>
                  <p className="card-sub">
                    Manage the categories used to classify transactions and budgets.
                  </p>
                </div>
              </div>

              {categoriesQuery.isLoading ? (
                <SkeletonTable />
              ) : !categoriesQuery.data?.length ? (
                <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  No categories yet.
                </p>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  {categoriesQuery.data.map((cat: Category, i) => (
                    <div
                      key={cat.id}
                      className="group flex items-center gap-2"
                      style={{
                        padding: '8px 12px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      {renamingCategoryId === cat.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            value={renamingCategoryName}
                            onChange={(e) => setRenamingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                renameCategoryMutation.mutate({
                                  id: cat.id,
                                  name: renamingCategoryName,
                                })
                              if (e.key === 'Escape') setRenamingCategoryId(null)
                            }}
                            className="input flex-1"
                            autoFocus
                            aria-label="Rename category"
                          />
                          <button
                            onClick={() =>
                              renameCategoryMutation.mutate({
                                id: cat.id,
                                name: renamingCategoryName,
                              })
                            }
                            disabled={renameCategoryMutation.isPending}
                            className="btn ghost icon sm"
                            aria-label="Confirm rename"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              check
                            </span>
                          </button>
                          <button
                            onClick={() => setRenamingCategoryId(null)}
                            className="btn ghost icon sm"
                            aria-label="Cancel rename"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              close
                            </span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className="flex-1 text-[13px] font-medium"
                            style={{ color: 'var(--ink)' }}
                          >
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setRenamingCategoryId(cat.id)
                                setRenamingCategoryName(cat.name)
                              }}
                              className="btn ghost icon sm"
                              aria-label={`Rename ${cat.name}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => setDeleteCategoryId(cat.id)}
                              className="btn ghost icon sm"
                              aria-label={`Delete ${cat.name}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                delete
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div
                className="mt-4 flex items-end gap-2"
                style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
              >
                <div className="flex-1">
                  <label className="eyebrow mb-1 block">Create category</label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategoryName.trim())
                        createCategoryMutation.mutate(newCategoryName.trim())
                    }}
                    placeholder="Category name"
                    className="input"
                    aria-label="New category name"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName.trim())
                  }
                  loading={createCategoryMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </section>
          )}

          {/* Tags */}
          {activeNav === 'tags' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title">Tags</p>
                  <p className="card-sub">Label and filter transactions across categories.</p>
                </div>
              </div>

              {tagsQuery.isLoading ? (
                <SkeletonTable rows={3} />
              ) : !tagsQuery.data?.length ? (
                <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  No tags yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(tagsQuery.data ?? []).map((tag: Tag) => (
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
                      if (e.key === 'Enter' && newTagName.trim())
                        createTagMutation.mutate(newTagName.trim())
                    }}
                    placeholder="Tag name"
                    className="input"
                    aria-label="New tag name"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => newTagName.trim() && createTagMutation.mutate(newTagName.trim())}
                  loading={createTagMutation.isPending}
                >
                  Create
                </Button>
              </div>
            </section>
          )}

          {/* Ignore rules */}
          {activeNav === 'ignore-rules' && (
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
                  No ignore rules yet. Add keywords like &ldquo;salary&rdquo; or
                  &ldquo;refund&rdquo; to skip matching rows automatically.
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
          )}

          {/* Mappings */}
          {activeNav === 'mappings' && (
            <section className="card card-flush">
              <div style={{ padding: 20, paddingBottom: 12 }}>
                <p className="card-title">Category mappings</p>
                <p className="card-sub mt-0.5">
                  Auto-categorisation rules created from the Review page.
                </p>
              </div>

              {mappingsQuery.isLoading ? (
                <div style={{ padding: '0 20px 20px' }}>
                  <SkeletonTable />
                </div>
              ) : !mappingsQuery.data?.length ? (
                <p
                  className="text-center text-[13px]"
                  style={{ color: 'var(--ink-3)', padding: '0 20px 24px' }}
                >
                  No mappings yet. Mappings are created in the Review page when you check
                  &ldquo;Save rule&rdquo;.
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
                      {mappingsQuery.data.map((mapping) => (
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
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                delete
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Danger zone */}
          {activeNav === 'danger' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title" style={{ color: 'var(--neg)' }}>
                    Danger zone
                  </p>
                  <p className="card-sub">
                    Permanently delete data. These actions cannot be undone.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(dangerActions).map(([key, action]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3"
                    style={{
                      border: key === 'all' ? '1px solid var(--neg)' : '1px solid var(--line)',
                      background: key === 'all' ? 'var(--neg-soft)' : 'var(--surface-2)',
                      borderRadius: 'var(--radius)',
                      padding: 12,
                    }}
                  >
                    <span
                      className="material-symbols-outlined shrink-0"
                      style={{
                        fontSize: 16,
                        color: key === 'all' ? 'var(--neg)' : 'var(--ink-3)',
                      }}
                    >
                      {action.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: key === 'all' ? 'var(--neg)' : 'var(--ink)' }}
                      >
                        {action.title}
                      </p>
                      <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                        {action.description}
                      </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => setPendingDangerKey(key)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deletePersonId !== null}
        title="Remove person"
        message="Are you sure you want to remove this person? This action cannot be undone."
        confirmLabel="Remove"
        danger
        loading={deletePersonMutation.isPending}
        onConfirm={() => deletePersonId && deletePersonMutation.mutate(deletePersonId)}
        onCancel={() => setDeletePersonId(null)}
      />

      <ConfirmDialog
        isOpen={deleteMappingId !== null}
        title="Delete mapping"
        message="Future statements won't auto-match this pattern. Continue?"
        confirmLabel="Delete"
        danger
        loading={deleteMappingMutation.isPending}
        onConfirm={() => deleteMappingId && deleteMappingMutation.mutate(deleteMappingId)}
        onCancel={() => setDeleteMappingId(null)}
      />

      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        title="Delete category"
        message="This category will be removed from any budget entries and transactions. Continue?"
        confirmLabel="Delete"
        danger
        loading={deleteCategoryMutation.isPending}
        onConfirm={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
        onCancel={() => setDeleteCategoryId(null)}
      />

      <ConfirmDialog
        isOpen={deleteTagId !== null}
        title="Delete tag"
        message="Are you sure you want to delete this tag?"
        confirmLabel="Delete"
        danger
        loading={deleteTagMutation.isPending}
        onConfirm={() => deleteTagId && deleteTagMutation.mutate(deleteTagId)}
        onCancel={() => setDeleteTagId(null)}
      />

      {pendingDangerKey && (
        <ConfirmDialog
          isOpen
          title={`Delete ${dangerActions[pendingDangerKey].title.toLowerCase()}`}
          message={dangerActions[pendingDangerKey].confirmMessage}
          confirmLabel={dangerActions[pendingDangerKey].confirmLabel}
          danger
          loading={dangerMutation.isPending}
          onConfirm={() => dangerMutation.mutate()}
          onCancel={() => setPendingDangerKey(null)}
        />
      )}
    </div>
  )
}
