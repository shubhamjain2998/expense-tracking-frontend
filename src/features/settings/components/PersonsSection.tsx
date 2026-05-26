import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { getInitials } from '@/lib/strings'
import type { Person } from '@/types/settings'

import { usePersons } from '../hooks/usePersons'

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
        <Icon name="delete" size={14} />
      </button>
    </div>
  )
}

export function PersonsSection() {
  const {
    query,
    newPersonName,
    setNewPersonName,
    personNameError,
    deletePersonId,
    setDeletePersonId,
    handleAddPerson,
    createMutation,
    deleteMutation,
  } = usePersons()

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Persons</p>
            <p className="card-sub">Track expenses across household members.</p>
          </div>
        </div>

        {query.isLoading ? (
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
            {(query.data ?? []).map((person: Person, i) => (
              <PersonCard key={person.id} person={person} index={i} onDelete={setDeletePersonId} />
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
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
              placeholder="Full name"
              className="input"
              maxLength={64}
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
            loading={createMutation.isPending}
          >
            Add
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deletePersonId !== null}
        title="Remove person"
        message="Are you sure you want to remove this person? This action cannot be undone."
        confirmLabel="Remove"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deletePersonId && deleteMutation.mutate(deletePersonId)}
        onCancel={() => setDeletePersonId(null)}
      />
    </>
  )
}
