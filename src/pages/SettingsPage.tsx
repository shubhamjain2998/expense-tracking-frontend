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

const avatarColors = [
  'bg-primary text-on-primary',
  'bg-primary-container text-on-primary-container',
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-tertiary-container text-on-tertiary-container',
]

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
  index,
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
    <div className="bg-surface-container-low group flex items-center gap-3 rounded-xl px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
      >
        {getInitials(person.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-on-surface text-sm font-bold">{person.name}</p>
        {joined && <p className="text-on-surface-variant text-[11px]">Joined {joined}</p>}
      </div>
      <button
        onClick={() => onDelete(person.id)}
        className="text-outline hover:bg-error-container hover:text-on-error-container shrink-0 rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Delete ${person.name}`}
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
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

  // Category rename state
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)
  const [renamingCategoryName, setRenamingCategoryName] = useState('')

  // New category / tag inputs
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTagName, setNewTagName] = useState('')

  // Ignore rules (localStorage)
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

  // ─── Persons ─────────────────────────────────────────────────────────

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

  // ─── Categories ──────────────────────────────────────────────────────

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

  // ─── Mappings ─────────────────────────────────────────────────────────

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

  // ─── Tags ─────────────────────────────────────────────────────────────

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

  // ─── Danger zone ─────────────────────────────────────────────────────

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
      title: 'Raw Transactions',
      description: 'All unprocessed transactions from uploaded statements.',
      confirmMessage:
        'This will permanently delete all raw (unprocessed) transactions. Any pending review items will be lost.',
      confirmLabel: 'Delete Raw Transactions',
      mutationFn: deleteAllRawTransactions,
      invalidateKeys: ['rawTransactions'],
    },
    processed: {
      icon: 'receipt_long',
      title: 'Processed Transactions',
      description: 'All reviewed and categorised transaction history.',
      confirmMessage:
        'This will permanently delete all processed transactions and their category assignments. Your spending history will be wiped.',
      confirmLabel: 'Delete Processed Transactions',
      mutationFn: deleteAllProcessedTransactions,
      invalidateKeys: ['processedTransactions', 'dashboard'],
    },
    mappings: {
      icon: 'rule',
      title: 'Category Mappings',
      description: 'All saved auto-categorisation rules.',
      confirmMessage:
        'This will permanently delete all category mapping rules. Auto-categorisation will stop working until new rules are created.',
      confirmLabel: 'Delete All Mappings',
      mutationFn: clearAllMappings,
      invalidateKeys: ['categoryMappings'],
    },
    budget: {
      icon: 'savings',
      title: 'Budget Plans',
      description: 'All budget allocations across all years.',
      confirmMessage:
        'This will permanently delete all budget plans and allocations across every year.',
      confirmLabel: 'Delete All Budgets',
      mutationFn: deleteAllBudget,
      invalidateKeys: ['budget'],
    },
    persons: {
      icon: 'group',
      title: 'Persons',
      description: 'All household members and their associations.',
      confirmMessage:
        'This will permanently delete all persons. Split transaction assignments will be removed.',
      confirmLabel: 'Delete All Persons',
      mutationFn: deleteAllPersons,
      invalidateKeys: ['persons'],
    },
    all: {
      icon: 'delete_forever',
      title: 'Everything',
      description: 'Wipe the entire database — transactions, budgets, mappings, and persons.',
      confirmMessage:
        'This will permanently erase ALL data in your workspace: every transaction, budget plan, category mapping, and person. Your entire financial history will be gone. This cannot be recovered.',
      confirmLabel: 'Yes, Delete Everything',
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
      toast.success(`${action?.title ?? 'Data'} deleted successfully`)
      setPendingDangerKey(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setPendingDangerKey(null)
    },
  })

  const navItems = [
    { id: 'persons', label: 'Account Settings', icon: 'manage_accounts' },
    { id: 'categories', label: 'Categories', icon: 'category' },
    { id: 'tags', label: 'Tags', icon: 'label' },
    { id: 'ignore-rules', label: 'Ignore Rules', icon: 'block' },
    { id: 'mappings', label: 'Rules & Mapping', icon: 'rule' },
    { id: 'danger', label: 'Danger Zone', icon: 'warning' },
  ]

  const categoryColors: Record<string, string> = {
    Groceries: 'bg-primary-fixed text-on-primary-fixed',
    Dining: 'bg-tertiary-fixed text-on-tertiary-fixed',
    Transport: 'bg-secondary-fixed text-on-secondary-fixed',
    Shopping: 'bg-primary-fixed-dim text-on-primary-fixed',
    Subscriptions: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-on-surface text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Configure your financial workspace, manage household members, and define automation rules.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar */}
        <nav className="lg:col-span-3" aria-label="Settings navigation">
          <p className="text-on-surface-variant mb-3 text-[11px] font-bold tracking-widest uppercase">
            Preferences
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    item.id === 'danger'
                      ? activeNav === 'danger'
                        ? 'bg-error-container text-on-error-container'
                        : 'text-error hover:bg-error-container/30'
                      : activeNav === item.id
                        ? 'bg-surface-container-low text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div className="space-y-8 lg:col-span-9">
          {/* Account Settings — Persons */}
          {activeNav === 'persons' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Persons Management</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Track expenses across different members of your household.
              </p>

              {personsQuery.isLoading ? (
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-surface-container-low h-24 w-32 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
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

              <div className="bg-surface-container-low mt-6 rounded-xl p-5">
                <p className="text-on-surface-variant mb-3 text-[11px] font-bold tracking-wider uppercase">
                  Add New Member
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      value={newPersonName}
                      onChange={(e) => {
                        setNewPersonName(e.target.value)
                        setPersonNameError('')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                      placeholder="Full name"
                      className="input-field"
                      aria-label="New person name"
                    />
                    {personNameError && (
                      <p className="text-error mt-1 text-xs">{personNameError}</p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddPerson}
                    loading={createPersonMutation.isPending}
                  >
                    + Add
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Categories */}
          {activeNav === 'categories' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Categories</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Manage the categories used to classify your transactions and budgets.
              </p>

              {categoriesQuery.isLoading ? (
                <SkeletonTable />
              ) : !categoriesQuery.data?.length ? (
                <div className="bg-surface-container-low rounded-xl px-6 py-8 text-center">
                  <p className="text-on-surface-variant text-sm">No categories yet.</p>
                </div>
              ) : (
                <div className="bg-surface-container-low mb-6 overflow-hidden rounded-xl">
                  {categoriesQuery.data.map((cat: Category) => (
                    <div
                      key={cat.id}
                      className="border-outline-variant/10 group flex items-center gap-3 border-b px-4 py-3 last:border-0"
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
                            className="input-field flex-1"
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
                            className="text-primary hover:bg-primary/10 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                            aria-label="Confirm rename"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button
                            onClick={() => setRenamingCategoryId(null)}
                            className="text-outline hover:bg-surface-container rounded-lg p-1.5 transition-colors"
                            aria-label="Cancel rename"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-on-surface flex-1 text-sm font-medium">
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setRenamingCategoryId(cat.id)
                                setRenamingCategoryName(cat.name)
                              }}
                              className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-1.5 transition-colors"
                              aria-label={`Rename ${cat.name}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteCategoryId(cat.id)}
                              className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 transition-colors"
                              aria-label={`Delete ${cat.name}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-5">
                <p className="text-on-surface-variant mb-3 text-[11px] font-bold tracking-wider uppercase">
                  Create New Category
                </p>
                <div className="flex gap-3">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategoryName.trim())
                        createCategoryMutation.mutate(newCategoryName.trim())
                    }}
                    placeholder="Category name"
                    className="input-field flex-1"
                    aria-label="New category name"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      newCategoryName.trim() &&
                      createCategoryMutation.mutate(newCategoryName.trim())
                    }
                    loading={createCategoryMutation.isPending}
                  >
                    + Create
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Tags */}
          {activeNav === 'tags' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Tags</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Create tags to label and filter transactions across categories.
              </p>

              {tagsQuery.isLoading ? (
                <SkeletonTable rows={3} />
              ) : !tagsQuery.data?.length ? (
                <div className="bg-surface-container-low mb-6 rounded-xl px-6 py-8 text-center">
                  <p className="text-on-surface-variant text-sm">No tags yet.</p>
                </div>
              ) : (
                <div className="mb-6 flex flex-wrap gap-2">
                  {(tagsQuery.data ?? []).map((tag: Tag) => (
                    <div
                      key={tag.id}
                      className="bg-surface-container-low group flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    >
                      <span className="text-on-surface text-sm font-medium">{tag.name}</span>
                      <button
                        onClick={() => setDeleteTagId(tag.id)}
                        className="text-outline hover:text-error ml-0.5 transition-colors"
                        aria-label={`Delete ${tag.name}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-5">
                <p className="text-on-surface-variant mb-3 text-[11px] font-bold tracking-wider uppercase">
                  Create New Tag
                </p>
                <div className="flex gap-3">
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim())
                        createTagMutation.mutate(newTagName.trim())
                    }}
                    placeholder="Tag name"
                    className="input-field flex-1"
                    aria-label="New tag name"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => newTagName.trim() && createTagMutation.mutate(newTagName.trim())}
                    loading={createTagMutation.isPending}
                  >
                    + Create
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Ignore Rules */}
          {activeNav === 'ignore-rules' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Ignore Rules</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Transactions whose description contains any of these keywords will be automatically
                excluded when you preview a new import.
              </p>

              {ignoreRules.length === 0 ? (
                <div className="bg-surface-container-low mb-6 rounded-xl px-6 py-8 text-center">
                  <p className="text-on-surface-variant text-sm">No ignore rules yet.</p>
                  <p className="text-outline mt-1 text-xs">
                    Add keywords like &ldquo;salary&rdquo; or &ldquo;refund&rdquo; to skip matching
                    rows automatically.
                  </p>
                </div>
              ) : (
                <div className="mb-6 flex flex-wrap gap-2">
                  {ignoreRules.map((keyword) => (
                    <div
                      key={keyword}
                      className="bg-surface-container-low group flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    >
                      <span className="material-symbols-outlined text-outline text-[14px]">
                        block
                      </span>
                      <span className="text-on-surface font-mono text-sm">{keyword}</span>
                      <button
                        onClick={() => handleRemoveIgnoreRule(keyword)}
                        className="text-outline hover:text-error ml-0.5 transition-colors"
                        aria-label={`Remove rule ${keyword}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-5">
                <p className="text-on-surface-variant mb-3 text-[11px] font-bold tracking-wider uppercase">
                  Add Keyword
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      value={newIgnoreKeyword}
                      onChange={(e) => {
                        setNewIgnoreKeyword(e.target.value)
                        setIgnoreKeywordError('')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddIgnoreRule()}
                      placeholder="e.g. salary, refund, transfer"
                      className="input-field w-full font-mono"
                      aria-label="New ignore keyword"
                    />
                    {ignoreKeywordError && (
                      <p className="text-error mt-1 text-xs">{ignoreKeywordError}</p>
                    )}
                  </div>
                  <Button variant="primary" size="sm" onClick={handleAddIgnoreRule}>
                    + Add
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Rules & Mapping */}
          {activeNav === 'mappings' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Category Mappings</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Auto-categorisation rules created when you check &quot;Save as Rule&quot; during
                review.
              </p>

              {mappingsQuery.isLoading ? (
                <SkeletonTable />
              ) : !mappingsQuery.data?.length ? (
                <div className="bg-surface-container-low rounded-xl px-6 py-8 text-center">
                  <p className="text-on-surface-variant text-sm">No mappings yet.</p>
                  <p className="text-outline mt-1 text-xs">
                    Mappings are created in the Review page when you check &quot;Save Rule&quot;.
                  </p>
                </div>
              ) : (
                <div className="bg-surface-container-low overflow-x-auto rounded-xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-outline-variant/15 border-b">
                        {[
                          'Description Pattern',
                          'Assigned Category',
                          'Match Count',
                          'Last Used',
                          'Actions',
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-on-surface-variant px-5 py-4 text-[11px] font-bold tracking-widest uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-outline-variant/5 divide-y">
                      {mappingsQuery.data.map((mapping) => {
                        const colorClass =
                          categoryColors[mapping.category] ??
                          'bg-secondary-container text-on-secondary-container'
                        return (
                          <tr
                            key={mapping.id}
                            className="group hover:bg-surface-container-lowest transition-colors"
                          >
                            <td className="text-on-surface px-5 py-3 font-mono text-sm">
                              {mapping.description_pattern}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass}`}
                              >
                                {mapping.category}
                              </span>
                            </td>
                            <td className="text-on-surface-variant px-5 py-3 text-sm">
                              {mapping.match_count}
                            </td>
                            <td className="text-on-surface-variant px-5 py-3 text-sm">
                              {mapping.last_used
                                ? new Date(mapping.last_used).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => setDeleteMappingId(mapping.id)}
                                className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label={`Delete mapping for ${mapping.description_pattern}`}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 16 }}
                                >
                                  delete
                                </span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Danger Zone */}
          {activeNav === 'danger' && (
            <section>
              <h2 className="text-on-surface mb-1 text-base font-bold">Danger Zone</h2>
              <p className="text-on-surface-variant mb-5 text-sm">
                Permanently delete specific data from your workspace. These actions cannot be
                undone.
              </p>
              <div className="space-y-3">
                {Object.entries(dangerActions).map(([key, action]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-4 rounded-xl p-4 ${
                      key === 'all'
                        ? 'bg-error-container/40 border-error/20 border'
                        : 'bg-surface-container-low'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        key === 'all'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold ${key === 'all' ? 'text-on-error-container' : 'text-on-surface'}`}
                      >
                        {action.title}
                      </p>
                      <p className="text-on-surface-variant text-xs">{action.description}</p>
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
        title="Remove Person"
        message="Are you sure you want to remove this person? This action cannot be undone."
        confirmLabel="Remove"
        danger
        loading={deletePersonMutation.isPending}
        onConfirm={() => deletePersonId && deletePersonMutation.mutate(deletePersonId)}
        onCancel={() => setDeletePersonId(null)}
      />

      <ConfirmDialog
        isOpen={deleteMappingId !== null}
        title="Delete Mapping"
        message="Are you sure you want to delete this category mapping? Future statements won't auto-match this pattern."
        confirmLabel="Delete"
        danger
        loading={deleteMappingMutation.isPending}
        onConfirm={() => deleteMappingId && deleteMappingMutation.mutate(deleteMappingId)}
        onCancel={() => setDeleteMappingId(null)}
      />

      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        title="Delete Category"
        message="Deleting this category will also remove it from any budget entries and transactions. Continue?"
        confirmLabel="Delete"
        danger
        loading={deleteCategoryMutation.isPending}
        onConfirm={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
        onCancel={() => setDeleteCategoryId(null)}
      />

      <ConfirmDialog
        isOpen={deleteTagId !== null}
        title="Delete Tag"
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
          title={`Delete ${dangerActions[pendingDangerKey].title}`}
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
