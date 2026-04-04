import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getPersons, createPerson, deletePerson, getCategories, deleteCategory } from '../lib/api'
import type { Person } from '../types/settings'
import { Button } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToastContext } from '../hooks/useToastContext'

const avatarColors = [
  'bg-[#004251]',
  'bg-[#005b6f]',
  'bg-[#536167]',
  'bg-[#5b3200]',
  'bg-[#774815]',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function PersonCard({ person, index, onDelete }: { person: Person; index: number; onDelete: (id: string) => void }) {
  const joined = person.created_at
    ? new Date(person.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <div className="relative rounded-xl bg-[#f1f4fa] p-4">
      <button
        onClick={() => onDelete(person.id)}
        className="absolute right-3 top-3 rounded-lg p-1 text-[#70787c] hover:bg-[#ffdad6] hover:text-[#93000a]"
        aria-label={`Delete ${person.name}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
      </button>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColors[index % avatarColors.length]}`}>
        {getInitials(person.name)}
      </div>
      <p className="text-sm font-bold text-[#181c20]">{person.name}</p>
      {joined && <p className="text-[11px] text-[#3f484c]">Joined {joined}</p>}
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
      if (err.status === 409) toast.warning('This person is linked to transactions and cannot be deleted')
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
    if (!newPersonName.trim()) { setPersonNameError('Name is required'); return }
    createPersonMutation.mutate(newPersonName.trim())
  }

  const navItems = [
    { id: 'persons', label: 'Account Settings', icon: 'manage_accounts' },
    { id: 'mappings', label: 'Rules & Mapping', icon: 'rule' },
    { id: 'privacy', label: 'Privacy', icon: 'lock' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications' },
  ]

  const categoryColors: Record<string, string> = {
    Groceries: 'bg-green-100 text-green-800',
    Dining: 'bg-orange-100 text-orange-800',
    Transport: 'bg-blue-100 text-blue-800',
    Shopping: 'bg-purple-100 text-purple-800',
    Subscriptions: 'bg-indigo-100 text-indigo-800',
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[#181c20]">Settings</h1>
        <p className="mt-1 text-sm text-[#3f484c]">
          Configure your financial workspace, manage household members, and define automation rules.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar */}
        <nav className="lg:col-span-3" aria-label="Settings navigation">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#3f484c]">Preferences</p>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeNav === item.id
                      ? 'bg-[#f1f4fa] text-[#004251]'
                      : 'text-[#3f484c] hover:bg-[#f1f4fa]'
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
            <h2 className="mb-1 text-base font-bold text-[#181c20]">Persons Management</h2>
            <p className="mb-5 text-sm text-[#3f484c]">Track expenses across different members of your household.</p>

            {personsQuery.isLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 w-32 animate-pulse rounded-xl bg-[#f1f4fa]" />)}
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

            <div className="mt-6 rounded-xl bg-[#f1f4fa] p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#3f484c]">Add New Member</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    value={newPersonName}
                    onChange={(e) => { setNewPersonName(e.target.value); setPersonNameError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                    placeholder="Full name"
                    className="input-field"
                    aria-label="New person name"
                  />
                  {personNameError && <p className="mt-1 text-xs text-[#ba1a1a]">{personNameError}</p>}
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
              <h2 className="text-base font-bold text-[#181c20]">Category Mappings</h2>
              <button className="text-sm font-medium text-[#004251] hover:underline">
                Re-sync Rules
              </button>
            </div>
            <p className="mb-5 text-sm text-[#3f484c]">
              Configure how incoming bank statements are automatically categorised.
            </p>

            {categoriesQuery.isLoading ? (
              <SkeletonTable />
            ) : !categoriesQuery.data?.length ? (
              <div className="rounded-xl bg-[#f1f4fa] px-6 py-8 text-center">
                <p className="text-sm text-[#3f484c]">No mappings yet.</p>
                <p className="mt-1 text-xs text-[#70787c]">Mappings are created in the Review page when you check &quot;Save Rule&quot;.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-[#f1f4fa]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#bfc8cc]/15">
                      {['Description Pattern', 'Assigned Category', 'Match Count', 'Last Used', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-[#3f484c]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfc8cc]/5">
                    {categoriesQuery.data.map((mapping) => {
                      const colorClass = categoryColors[mapping.category] ?? 'bg-[#d6e5ec] text-[#58676d]'
                      return (
                        <tr key={mapping.id} className="group transition-colors hover:bg-white">
                          <td className="px-5 py-3 font-mono text-sm text-[#181c20]">{mapping.description_pattern}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
                              {mapping.category}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-[#3f484c]">{mapping.match_count}</td>
                          <td className="px-5 py-3 text-sm text-[#3f484c]">
                            {mapping.last_used
                              ? new Date(mapping.last_used).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setDeleteCategoryId(mapping.id)}
                              className="rounded-lg p-1.5 text-[#70787c] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#ffdad6] hover:text-[#93000a]"
                              aria-label={`Delete mapping for ${mapping.description_pattern}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="px-5 py-3 text-xs text-[#70787c]">
                  Mappings are created in the Review page when you check &quot;Save Rule&quot;.
                </p>
              </div>
            )}
          </section>

          {/* Danger Zone */}
          <section className="rounded-xl bg-[#ffdad6]/30 p-6">
            <p className="mb-1 text-sm font-bold text-[#93000a]">Danger Zone</p>
            <p className="mb-4 text-sm text-[#3f484c]">
              Irreversible actions that affect your entire workspace and historical data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => toast.info('Coming soon')}
              >
                Clear Mapping History
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => toast.info('Coming soon')}
              >
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
