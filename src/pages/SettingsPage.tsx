import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SkeletonTable } from '../components/ui/Skeleton'
import { useIgnoreRules } from '../hooks/useIgnoreRules'
import { usePeriodMode } from '../hooks/usePeriodMode'
import { useToastContext } from '../hooks/useToastContext'
import {
  getPersons,
  createPerson,
  deletePerson,
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  setCategoryIncomeFlag,
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
  getAllProcessedTransactions,
  exportBackup,
  importBackup,
} from '../lib/api'
import { addIgnoreRule, removeIgnoreRule } from '../lib/ignoreRules'
import { getInitials } from '../lib/strings'
import type { BackupImportResponse, ParsedBackupPayload } from '../types/backup'
import type { Person, Category, Tag } from '../types/settings'

type MappingMode = 'derive' | 'explicit' | 'skip'

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

  const ignoreRules = useIgnoreRules()
  const [newIgnoreKeyword, setNewIgnoreKeyword] = useState('')
  const [ignoreKeywordError, setIgnoreKeywordError] = useState('')
  const { mode: periodMode, setMode: setPeriodMode } = usePeriodMode()
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)
  const [importingJSON, setImportingJSON] = useState(false)
  const [importResult, setImportResult] = useState<BackupImportResponse | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const importFileRef = useRef<HTMLInputElement | null>(null)

  // Two-step import: parse → preview/select → submit.
  const [parsedPayload, setParsedPayload] = useState<ParsedBackupPayload | null>(null)
  const [parsedFileName, setParsedFileName] = useState<string | null>(null)
  const [optImportTransactions, setOptImportTransactions] = useState(true)
  const [optImportBudgetPlans, setOptImportBudgetPlans] = useState(true)
  // 3-state mapping option: 'derive' (let backend auto-derive), 'explicit' (use the
  // mappings array from the JSON), 'skip' (send empty list).
  const [optMappingMode, setOptMappingMode] = useState<MappingMode>('derive')

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
    addIgnoreRule(trimmed)
    setNewIgnoreKeyword('')
    setIgnoreKeywordError('')
  }

  function handleRemoveIgnoreRule(keyword: string) {
    removeIgnoreRule(keyword)
  }

  async function handleExportCSV() {
    setExportingCSV(true)
    try {
      const txns = await getAllProcessedTransactions()
      const rows = [
        ['Date', 'Description', 'Amount', 'Category', 'Notes', 'Tags'],
        ...txns.map((t) => [
          t.txn_date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.amount,
          t.category,
          t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
          t.tags.map((tag) => tag.name).join('; '),
        ]),
      ]
      const csv = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingCSV(false)
    }
  }

  async function handleExportJSON() {
    setExportingJSON(true)
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingJSON(false)
    }
  }

  function handleDownloadTemplate() {
    const template = {
      version: '1',
      exported_at: new Date().toISOString(),
      // categories/tags/persons are auto-created from any names referenced in
      // transactions — listing them here is only needed to pre-create empty ones.
      categories: [{ name: 'groceries' }, { name: 'transport' }, { name: 'salary' }],
      tags: [{ name: 'essential' }],
      persons: [{ name: 'alice' }],
      // allocated_amount is the *annual* total for the year. The dashboard divides
      // by 12 to get the monthly spending threshold.
      budget_plans: [
        { year: 2025, category: 'groceries', allocated_amount: '96000.00' },
        { year: 2025, category: 'transport', allocated_amount: '24000.00' },
      ],
      // Optional — omit to let the server auto-derive from (description, category).
      // category_mappings: [{ description_pattern: "swiggy", category: "food" }],
      transactions: [
        // Expense → positive amount.
        {
          txn_date: '2025-04-15',
          description: 'Swiggy Bangalore',
          amount: '412.00',
          category: 'food',
          notes: null,
          tags: ['essential'],
          shares: [],
        },
        // Income → negative amount. Note "salary" is also a category.
        {
          txn_date: '2025-04-30',
          description: 'Monthly salary credit',
          amount: '-100000.00',
          category: 'salary',
          notes: null,
          tags: [],
          shares: [],
        },
        // Expense with a person split — Alice owes 50%.
        {
          txn_date: '2025-05-04',
          description: 'BMTC bus pass',
          amount: '1100.00',
          category: 'transport',
          notes: 'monthly pass',
          tags: [],
          shares: [
            { person: 'alice', share_type: 'percentage', share_value: '50', settled: false },
          ],
        },
      ],
    }
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-template.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleParseImportFile(file: File) {
    setImportError(null)
    setImportResult(null)
    setParsedPayload(null)
    setParsedFileName(null)
    try {
      const text = await file.text()
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(text)
      } catch {
        setImportError(
          'The selected file is not valid JSON. Open it in a text editor and verify the syntax.'
        )
        return
      }
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
        setImportError(
          'JSON is missing the required "transactions" array. Download the template for a working example.'
        )
        return
      }
      const payload = parsed as unknown as ParsedBackupPayload
      setParsedPayload(payload)
      setParsedFileName(file.name)
      // Reset options to defaults each time a new file is loaded.
      setOptImportTransactions(true)
      setOptImportBudgetPlans(true)
      setOptMappingMode(Array.isArray(payload.category_mappings) ? 'explicit' : 'derive')
    } catch {
      setImportError('Could not read the selected file.')
    } finally {
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  function handleCancelImport() {
    setParsedPayload(null)
    setParsedFileName(null)
    setImportError(null)
  }

  async function handleConfirmImport() {
    if (!parsedPayload) return
    setImportingJSON(true)
    setImportError(null)
    try {
      // Build the payload to send based on the user's selections.
      const toSend: Record<string, unknown> = {
        version: parsedPayload.version ?? '1',
        categories: parsedPayload.categories ?? [],
        tags: parsedPayload.tags ?? [],
        persons: parsedPayload.persons ?? [],
        transactions: optImportTransactions ? parsedPayload.transactions : [],
        budget_plans: optImportBudgetPlans ? (parsedPayload.budget_plans ?? []) : [],
      }
      // Mapping mode controls the category_mappings field:
      //   derive   → omit the field; backend auto-derives from transactions
      //   explicit → send the array exactly as in the JSON
      //   skip     → send empty array; nothing created
      if (optMappingMode === 'explicit') {
        toSend.category_mappings = parsedPayload.category_mappings ?? []
      } else if (optMappingMode === 'skip') {
        toSend.category_mappings = []
      }
      const result = await importBackup(toSend)
      setImportResult(result)
      // Clear the preview now that the import has succeeded.
      setParsedPayload(null)
      setParsedFileName(null)
      void qc.invalidateQueries()
      const total =
        result.transactions_imported +
        result.categories_created +
        result.tags_created +
        result.persons_created +
        result.budget_plans_created +
        result.category_mappings_created
      if (total === 0 && result.transactions_skipped_duplicates === 0) {
        toast.warning('Nothing was imported — the file may be empty or malformed.')
      } else if (result.skipped_rows.length > 0) {
        toast.warning(
          `Imported ${result.transactions_imported} transactions, ${result.skipped_rows.length} rows skipped.`
        )
      } else {
        toast.success(
          `Imported ${result.transactions_imported} transactions${
            result.transactions_skipped_duplicates > 0
              ? ` (${result.transactions_skipped_duplicates} duplicates skipped)`
              : ''
          }.`
        )
      }
    } catch (err) {
      const detail = (err as { detail?: string }).detail ?? 'Import failed.'
      setImportError(detail)
      toast.error(detail)
    } finally {
      setImportingJSON(false)
    }
  }

  // Counts derived from the parsed payload, used by the preview panel.
  const parsedSummary = (() => {
    if (!parsedPayload) return null
    const txns = parsedPayload.transactions
    const txnCount = txns.length
    const bpCount = Array.isArray(parsedPayload.budget_plans)
      ? parsedPayload.budget_plans.length
      : 0
    const explicitMappings = Array.isArray(parsedPayload.category_mappings)
      ? parsedPayload.category_mappings.length
      : null

    // Unique referenced names — gives the user a sense of what'll be auto-created.
    const cats = new Set<string>()
    const tags = new Set<string>()
    const persons = new Set<string>()
    let incomeCount = 0
    let expenseCount = 0
    for (const t of txns) {
      if (typeof t.category === 'string') cats.add(t.category.trim().toLowerCase())
      if (Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          if (typeof tag === 'string') tags.add(tag.trim().toLowerCase())
        }
      }
      if (Array.isArray(t.shares)) {
        for (const s of t.shares) {
          const p = (s as { person?: unknown }).person
          if (typeof p === 'string') persons.add(p.trim().toLowerCase())
        }
      }
      const amtStr = typeof t.amount === 'string' ? t.amount : String(t.amount ?? '')
      const amt = Number(amtStr)
      if (!Number.isNaN(amt)) {
        if (amt < 0) incomeCount++
        else if (amt > 0) expenseCount++
      }
    }

    // Auto-derived mapping count: one per unique (description, category) pair.
    const pairs = new Set<string>()
    for (const t of txns) {
      if (typeof t.description === 'string' && typeof t.category === 'string') {
        pairs.add(`${t.description.trim()}::${t.category.trim().toLowerCase()}`)
      }
    }
    return {
      txnCount,
      bpCount,
      explicitMappings,
      derivedMappings: pairs.size,
      catCount: cats.size,
      tagCount: tags.size,
      personCount: persons.size,
      incomeCount,
      expenseCount,
    }
  })()

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

  const incomeFlagMutation = useMutation({
    mutationFn: ({ id, is_income }: { id: string; is_income: boolean }) =>
      setCategoryIncomeFlag(id, is_income),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
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
    { id: 'period', label: 'Financial year' },
    { id: 'privacy', label: 'Privacy & Data' },
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
                          {cat.is_income && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: 'var(--pos)',
                                background: 'var(--pos-soft)',
                                borderRadius: 4,
                                padding: '2px 6px',
                                marginRight: 4,
                              }}
                            >
                              income
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() =>
                                incomeFlagMutation.mutate({
                                  id: cat.id,
                                  is_income: !cat.is_income,
                                })
                              }
                              disabled={incomeFlagMutation.isPending}
                              className="btn ghost icon sm"
                              aria-label={
                                cat.is_income
                                  ? `Mark ${cat.name} as expense`
                                  : `Mark ${cat.name} as income`
                              }
                              title={
                                cat.is_income
                                  ? 'Mark as expense category'
                                  : 'Mark as income category'
                              }
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: 14,
                                  color: cat.is_income ? 'var(--pos)' : undefined,
                                }}
                              >
                                {cat.is_income ? 'trending_up' : 'trending_down'}
                              </span>
                            </button>
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

          {/* Financial year */}
          {activeNav === 'period' && (
            <section className="card">
              <div className="card-head">
                <div>
                  <p className="card-title">Period mode</p>
                  <p className="card-sub">
                    How year and month selectors are framed across the dashboard, budgets, and
                    transactions list.
                  </p>
                </div>
              </div>

              <div
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                }}
              >
                {[
                  {
                    id: 'fy' as const,
                    title: 'Indian financial year (Apr–Mar)',
                    description:
                      'A year is labelled "FY 25-26" and runs from April to the following March. Default for new users.',
                  },
                  {
                    id: 'calendar' as const,
                    title: 'Calendar year (Jan–Dec)',
                    description:
                      'A year is labelled by its number (e.g. 2025) and runs January to December.',
                  },
                ].map((opt, i) => {
                  const selected = periodMode === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriodMode(opt.id)}
                      className="flex w-full items-start gap-3 text-left"
                      style={{
                        padding: '12px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                        background: selected ? 'var(--surface-2)' : 'transparent',
                        transition: 'background .12s ease',
                      }}
                    >
                      <span
                        className="material-symbols-outlined shrink-0"
                        style={{
                          fontSize: 18,
                          color: selected ? 'var(--accent)' : 'var(--ink-4)',
                        }}
                      >
                        {selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                          {opt.title}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--ink-3)', marginTop: 2 }}>
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div
                className="mt-3 text-[12px]"
                style={{
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  color: 'var(--ink-2)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  Effect on your existing data
                </p>
                <p>
                  Transactions are unaffected — your stored dates don&rsquo;t change. But a budget
                  you previously created for &ldquo;year 2025&rdquo; is now treated as the budget
                  for{' '}
                  <strong>
                    {periodMode === 'fy' ? 'FY 25-26 (Apr 2025–Mar 2026)' : 'calendar 2025'}
                  </strong>
                  . The numbers stay the same; the period boundaries shift by 3 months when you
                  switch modes. Spend totals and budget vs actual will reflect the new framing
                  immediately.
                </p>
              </div>
            </section>
          )}

          {/* Privacy & Data */}
          {activeNav === 'privacy' && (
            <div className="space-y-4">
              <section className="card">
                <div className="card-head">
                  <div>
                    <p className="card-title">Privacy posture</p>
                    <p className="card-sub">
                      This app does not connect to banks, read emails, or use AI for categorization.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                  }}
                >
                  {[
                    { label: 'Bank account connections', value: 'Never', highlight: true },
                    { label: 'Email / inbox access', value: 'Never', highlight: true },
                    { label: 'AI / LLM categorization', value: 'Off', highlight: true },
                    {
                      label: 'Uploaded PDFs retained',
                      value: 'In-memory only, never stored',
                      highlight: true,
                    },
                    { label: 'Saved pattern matching', value: 'On (RapidFuzz)', highlight: false },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                      style={{
                        padding: '10px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
                        {item.label}
                      </span>
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: item.highlight ? 'var(--pos)' : 'var(--ink-2)' }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div>
                    <p className="card-title">Data export</p>
                    <p className="card-sub">
                      Download a copy of your data at any time. The JSON backup is the authoritative
                      export — the same format is accepted by the import below, so a backup can be
                      round-tripped.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportCSV}
                    loading={exportingCSV}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportJSON}
                    loading={exportingJSON}
                  >
                    Full backup (JSON)
                  </Button>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div>
                    <p className="card-title">Data import</p>
                    <p className="card-sub">
                      Restore from a backup or bulk-load historical data (e.g. from a spreadsheet
                      you&rsquo;ve converted to JSON).
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 14,
                    background: 'var(--surface-2)',
                  }}
                >
                  <p
                    className="text-[12.5px] font-semibold"
                    style={{ color: 'var(--ink)', marginBottom: 4 }}
                  >
                    JSON import guidelines (v2.0)
                  </p>
                  <p className="text-[11.5px]" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
                    The same shape produced by Full backup (JSON). Hand-author smaller files for
                    spreadsheet imports.
                  </p>

                  {/* 1. Top-level structure */}
                  <p
                    className="text-[11.5px] font-semibold"
                    style={{
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  >
                    1 · Top-level structure
                  </p>
                  <ul
                    className="text-[12px]"
                    style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
                  >
                    <li>
                      <code className="mono">version</code>: always{' '}
                      <code className="mono">&quot;1&quot;</code>.
                    </li>
                    <li>
                      <code className="mono">exported_at</code>: ISO 8601 timestamp (informational).
                    </li>
                    <li>
                      <code className="mono">transactions</code>: <strong>required</strong> — array
                      of all entries.
                    </li>
                    <li>
                      <code className="mono">budget_plans</code>: optional — annual allocations.
                    </li>
                    <li>
                      <code className="mono">category_mappings</code>,{' '}
                      <code className="mono">categories</code>, <code className="mono">tags</code>,{' '}
                      <code className="mono">persons</code>: all optional.
                    </li>
                  </ul>

                  {/* 2. Transaction schema */}
                  <p
                    className="text-[11.5px] font-semibold"
                    style={{
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginTop: 12,
                      marginBottom: 4,
                    }}
                  >
                    2 · Transaction schema
                  </p>
                  <ul
                    className="text-[12px]"
                    style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
                  >
                    <li>
                      <code className="mono">txn_date</code>: real calendar date,{' '}
                      <code className="mono">YYYY-MM-DD</code>.
                    </li>
                    <li>
                      <code className="mono">description</code>: vendor or purpose string.
                    </li>
                    <li>
                      <code className="mono">category</code>: high-level bucket (e.g.{' '}
                      <code className="mono">food</code>, <code className="mono">salary</code>).
                      Created on the fly.
                    </li>
                    <li>
                      <code className="mono">amount</code>: <strong>string</strong> for precision
                      (e.g. <code className="mono">&quot;125.50&quot;</code>).
                    </li>
                    <li>
                      <code className="mono">tags</code>: array of strings — use this for
                      sub-categories you had in your spreadsheet.
                    </li>
                    <li>
                      <code className="mono">notes</code>, <code className="mono">shares</code>:
                      optional — <code className="mono">null</code> /{' '}
                      <code className="mono">[]</code> are fine.
                    </li>
                  </ul>
                  <div
                    className="mt-2 text-[12px]"
                    style={{
                      border: '1px solid var(--accent)',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius)',
                      padding: 10,
                      color: 'var(--ink-2)',
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--ink)', marginBottom: 4 }}>
                      Sign convention (critical)
                    </p>
                    <p>
                      <strong>Expenses</strong> are positive (
                      <code className="mono">&quot;412.00&quot;</code>). <strong>Incomes</strong>{' '}
                      are negative (<code className="mono">&quot;-100000.00&quot;</code>). The
                      dashboard uses the sign to separate income from expense — getting it wrong
                      will show your salary as a spike of expenses.
                    </p>
                  </div>

                  {/* 3. Budget plan schema */}
                  <p
                    className="text-[11.5px] font-semibold"
                    style={{
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginTop: 12,
                      marginBottom: 4,
                    }}
                  >
                    3 · Budget plan schema
                  </p>
                  <ul
                    className="text-[12px]"
                    style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
                  >
                    <li>
                      <code className="mono">year</code>: starting year of the period (e.g.{' '}
                      <code className="mono">2025</code>; in FY mode this means &ldquo;FY
                      25-26&rdquo;).
                    </li>
                    <li>
                      <code className="mono">category</code>: must match a category name used in
                      transactions (or pre-declared).
                    </li>
                    <li>
                      <code className="mono">allocated_amount</code>: the{' '}
                      <strong>annual total</strong> as a string. The dashboard divides by 12 to
                      derive the monthly threshold — multiply your monthly target by 12 before
                      writing it here.
                    </li>
                  </ul>

                  {/* 4. System logic */}
                  <p
                    className="text-[11.5px] font-semibold"
                    style={{
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginTop: 12,
                      marginBottom: 4,
                    }}
                  >
                    4 · System logic &amp; constraints
                  </p>
                  <ul
                    className="text-[12px]"
                    style={{ color: 'var(--ink-2)', paddingLeft: 18, listStyle: 'disc' }}
                  >
                    <li>
                      <strong>Deduplication:</strong> a row is skipped if{' '}
                      <em>(txn_date, description, amount)</em> already exists for your account.
                    </li>
                    <li>
                      <strong>Auto-categorisation:</strong> omit{' '}
                      <code className="mono">category_mappings</code> and the server generates one
                      mapping per unique <em>(description, category)</em> pair — used to
                      auto-categorise future statement uploads. (You can opt out per-import in the
                      next step.)
                    </li>
                    <li>
                      <strong>Fiscal year grouping:</strong> derived from{' '}
                      <code className="mono">txn_date</code>. Any date from{' '}
                      <code className="mono">2025-04-01</code> to{' '}
                      <code className="mono">2026-03-31</code> falls under &ldquo;FY 25-26&rdquo;.
                    </li>
                    <li>
                      <strong>On-the-fly creation:</strong> categories, tags and persons don&rsquo;t
                      need to be pre-declared — they&rsquo;re initialised the moment they&rsquo;re
                      referenced.
                    </li>
                    <li>
                      Money values must be strings (to preserve precision). Import is additive —
                      nothing is deleted. Use the Danger zone first for a clean slate.
                    </li>
                  </ul>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="tertiary" size="sm" onClick={handleDownloadTemplate}>
                    Download template
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => importFileRef.current?.click()}
                    disabled={parsedPayload !== null || importingJSON}
                  >
                    Choose JSON file…
                  </Button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleParseImportFile(file)
                    }}
                  />
                </div>

                {/* Preview + selective import */}
                {parsedPayload && parsedSummary && (
                  <div
                    className="mt-3"
                    style={{
                      border: '1px solid var(--accent)',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius)',
                      padding: 14,
                    }}
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                        Review what to import
                      </p>
                      {parsedFileName && (
                        <p className="mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                          {parsedFileName}
                        </p>
                      )}
                    </div>

                    <p
                      className="text-[11.5px]"
                      style={{ color: 'var(--ink-3)', marginBottom: 10 }}
                    >
                      Tick what you want imported. Categories, tags and persons referenced by your
                      transactions are always created automatically (they&rsquo;re required for the
                      rows to land).
                    </p>

                    {/* Summary counts */}
                    <div
                      className="text-[12px]"
                      style={{
                        color: 'var(--ink-2)',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius)',
                        padding: 10,
                        display: 'grid',
                        gap: 4,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        Transactions:{' '}
                        <strong style={{ color: 'var(--ink)' }}>{parsedSummary.txnCount}</strong> (
                        {parsedSummary.expenseCount} expense
                        {parsedSummary.expenseCount === 1 ? '' : 's'}, {parsedSummary.incomeCount}{' '}
                        income
                        {parsedSummary.incomeCount === 1 ? '' : 's'})
                      </div>
                      <div>
                        References:{' '}
                        <strong style={{ color: 'var(--ink)' }}>{parsedSummary.catCount}</strong>{' '}
                        unique categor{parsedSummary.catCount === 1 ? 'y' : 'ies'},{' '}
                        <strong style={{ color: 'var(--ink)' }}>{parsedSummary.tagCount}</strong>{' '}
                        tag{parsedSummary.tagCount === 1 ? '' : 's'},{' '}
                        <strong style={{ color: 'var(--ink)' }}>{parsedSummary.personCount}</strong>{' '}
                        person{parsedSummary.personCount === 1 ? '' : 's'}
                      </div>
                      {parsedSummary.bpCount > 0 && (
                        <div>
                          Budget plans in file:{' '}
                          <strong style={{ color: 'var(--ink)' }}>{parsedSummary.bpCount}</strong>
                        </div>
                      )}
                      {parsedSummary.explicitMappings !== null && (
                        <div>
                          Explicit mappings in file:{' '}
                          <strong style={{ color: 'var(--ink)' }}>
                            {parsedSummary.explicitMappings}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Toggles */}
                    <div style={{ display: 'grid', gap: 8 }}>
                      <label
                        className="flex items-start gap-2 text-[12.5px]"
                        style={{ color: 'var(--ink)', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={optImportTransactions}
                          onChange={(e) => setOptImportTransactions(e.target.checked)}
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          Import transactions ({parsedSummary.txnCount})
                          <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                            Untick if you only want to load budget plans or pre-create mappings.
                          </span>
                        </span>
                      </label>

                      {parsedSummary.bpCount > 0 && (
                        <label
                          className="flex items-start gap-2 text-[12.5px]"
                          style={{ color: 'var(--ink)', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={optImportBudgetPlans}
                            onChange={(e) => setOptImportBudgetPlans(e.target.checked)}
                            style={{ marginTop: 2 }}
                          />
                          <span>
                            Import budget plans ({parsedSummary.bpCount})
                            <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                              Updates the allocation when (year, category) already exists.
                            </span>
                          </span>
                        </label>
                      )}

                      <fieldset
                        style={{
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius)',
                          padding: '8px 10px',
                          margin: 0,
                        }}
                      >
                        <legend className="card-eyebrow" style={{ padding: '0 6px' }}>
                          Category mappings
                        </legend>
                        <label
                          className="flex items-start gap-2 text-[12.5px]"
                          style={{ color: 'var(--ink)', cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="mapping-mode"
                            checked={optMappingMode === 'derive'}
                            onChange={() => setOptMappingMode('derive')}
                            style={{ marginTop: 3 }}
                          />
                          <span>
                            Auto-derive from transactions
                            <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                              {parsedSummary.derivedMappings} mapping
                              {parsedSummary.derivedMappings === 1 ? '' : 's'} would be created —
                              one per unique (description, category) pair.
                            </span>
                          </span>
                        </label>
                        {parsedSummary.explicitMappings !== null && (
                          <label
                            className="mt-2 flex items-start gap-2 text-[12.5px]"
                            style={{ color: 'var(--ink)', cursor: 'pointer' }}
                          >
                            <input
                              type="radio"
                              name="mapping-mode"
                              checked={optMappingMode === 'explicit'}
                              onChange={() => setOptMappingMode('explicit')}
                              style={{ marginTop: 3 }}
                            />
                            <span>
                              Use the {parsedSummary.explicitMappings} mapping
                              {parsedSummary.explicitMappings === 1 ? '' : 's'} from the file
                              <span
                                className="block text-[11.5px]"
                                style={{ color: 'var(--ink-3)' }}
                              >
                                Patterns and category assignments exactly as written.
                              </span>
                            </span>
                          </label>
                        )}
                        <label
                          className="mt-2 flex items-start gap-2 text-[12.5px]"
                          style={{ color: 'var(--ink)', cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="mapping-mode"
                            checked={optMappingMode === 'skip'}
                            onChange={() => setOptMappingMode('skip')}
                            style={{ marginTop: 3 }}
                          />
                          <span>
                            Don&rsquo;t create any mappings
                            <span className="block text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                              Use this when descriptions are too generic to auto-match future
                              statements.
                            </span>
                          </span>
                        </label>
                      </fieldset>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleConfirmImport}
                        loading={importingJSON}
                        disabled={
                          !optImportTransactions &&
                          !optImportBudgetPlans &&
                          optMappingMode === 'skip'
                        }
                      >
                        Import selected
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancelImport}
                        disabled={importingJSON}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {importError && (
                  <div
                    className="mt-3 text-[12.5px]"
                    style={{
                      border: '1px solid var(--neg)',
                      background: 'var(--neg-soft)',
                      borderRadius: 'var(--radius)',
                      padding: 10,
                      color: 'var(--neg)',
                    }}
                  >
                    {importError}
                  </div>
                )}

                {importResult && (
                  <div
                    className="mt-3"
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius)',
                      padding: 12,
                      background: 'var(--surface)',
                    }}
                  >
                    <p className="card-eyebrow" style={{ marginBottom: 8 }}>
                      Last import
                    </p>
                    <div
                      className="text-[12.5px]"
                      style={{ color: 'var(--ink-2)', display: 'grid', gap: 4 }}
                    >
                      <div>
                        Transactions imported:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.transactions_imported}
                        </strong>
                      </div>
                      <div>
                        Duplicates skipped:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.transactions_skipped_duplicates}
                        </strong>
                      </div>
                      <div>
                        Categories created:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.categories_created}
                        </strong>
                        {' · '}Tags:{' '}
                        <strong style={{ color: 'var(--ink)' }}>{importResult.tags_created}</strong>
                        {' · '}Persons:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.persons_created}
                        </strong>
                      </div>
                      <div>
                        Budget plans:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.budget_plans_created}
                        </strong>
                        {' · '}Mappings:{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {importResult.category_mappings_created}
                        </strong>
                      </div>
                    </div>
                    {importResult.skipped_rows.length > 0 && (
                      <details className="mt-2">
                        <summary
                          className="text-[12px]"
                          style={{ color: 'var(--neg)', cursor: 'pointer' }}
                        >
                          {importResult.skipped_rows.length} row
                          {importResult.skipped_rows.length === 1 ? '' : 's'} skipped due to errors
                        </summary>
                        <ul
                          className="mono text-[11.5px]"
                          style={{
                            color: 'var(--ink-3)',
                            marginTop: 6,
                            paddingLeft: 14,
                            listStyle: 'disc',
                            maxHeight: 160,
                            overflowY: 'auto',
                          }}
                        >
                          {importResult.skipped_rows.map((row, i) => (
                            <li key={i}>{row}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </section>
            </div>
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
