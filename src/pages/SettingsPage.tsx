import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getPersons, createPerson, deletePerson, getCategories, deleteCategory } from '../lib/api'
import type { Person } from '../types/settings'
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
    <div className="bg-surface-container-low relative rounded-xl p-4">
      <button
        onClick={() => onDelete(person.id)}
        className="text-outline hover:bg-error-container hover:text-on-error-container absolute top-3 right-3 rounded-lg p-1"
        aria-label={`Delete ${person.name}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          delete
        </span>
      </button>
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}
      >
        {getInitials(person.name)}
      </div>
      <p className="text-on-surface text-sm font-bold">{person.name}</p>
      {joined && <p className="text-on-surface-variant text-[11px]">Joined {joined}</p>}
    </div>
  )
}

export function SettingsPage() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [newPersonName, setNewPersonName] = useState('')
  const [personNameError, setPersonNameError] = useState('')
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState('persons')

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

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

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Mapping deleted')
      setDeleteCategoryId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteCategoryId(null)
    },
  })

  function handleAddPerson() {
    if (!newPersonName.trim()) {
      setPersonNameError('Name is required')
      return
    }
    createPersonMutation.mutate(newPersonName.trim())
  }

  const navItems = [
    { id: 'persons', label: 'Account Settings', icon: 'manage_accounts' },
    { id: 'mappings', label: 'Rules & Mapping', icon: 'rule' },
    { id: 'privacy', label: 'Privacy', icon: 'lock' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications' },
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
                    activeNav === item.id
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
          {/* Persons Management */}
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
                  {personNameError && <p className="text-error mt-1 text-xs">{personNameError}</p>}
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

          {/* Category Mappings */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-on-surface text-base font-bold">Category Mappings</h2>
              <button className="text-primary text-sm font-medium hover:underline">
                Re-sync Rules
              </button>
            </div>
            <p className="text-on-surface-variant mb-5 text-sm">
              Configure how incoming bank statements are automatically categorised.
            </p>

            {categoriesQuery.isLoading ? (
              <SkeletonTable />
            ) : !categoriesQuery.data?.length ? (
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
                    {categoriesQuery.data.map((mapping) => {
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
                              onClick={() => setDeleteCategoryId(mapping.id)}
                              className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label={`Delete mapping for ${mapping.description_pattern}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                delete
                              </span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-outline px-5 py-3 text-xs">
                  Mappings are created in the Review page when you check &quot;Save Rule&quot;.
                </p>
              </div>
            )}
          </section>

          {/* Danger Zone */}
          <section className="bg-error-container/30 rounded-xl p-6">
            <p className="text-on-error-container mb-1 text-sm font-bold">Danger Zone</p>
            <p className="text-on-surface-variant mb-4 text-sm">
              Irreversible actions that affect your entire workspace and historical data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="danger" size="sm" onClick={() => toast.info('Coming soon')}>
                Clear Mapping History
              </Button>
              <Button variant="danger" size="sm" onClick={() => toast.info('Coming soon')}>
                Delete All Data
              </Button>
            </div>
          </section>
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
        isOpen={deleteCategoryId !== null}
        title="Delete Mapping"
        message="Are you sure you want to delete this category mapping? Future statements won't auto-match this pattern."
        confirmLabel="Delete"
        danger
        loading={deleteCategoryMutation.isPending}
        onConfirm={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
        onCancel={() => setDeleteCategoryId(null)}
      />
    </div>
  )
}
