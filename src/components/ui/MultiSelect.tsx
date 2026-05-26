import { useState, useRef, useEffect } from 'react'

import { Icon } from '@/components/ui/Icon'

import { getInitials } from '../../lib/strings'
import type { Person } from '../../types/settings'

interface MultiSelectProps {
  persons: Person[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreatePerson?: (name: string) => Promise<Person>
  onCreateError?: (msg: string) => void
  label?: string
}

export function MultiSelect({
  persons,
  selectedIds,
  onChange,
  onCreatePerson,
  onCreateError,
  label,
}: MultiSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedIdsRef = useRef(selectedIds)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    selectedIdsRef.current = selectedIds
    onChangeRef.current = onChange
  })

  const selected = persons.filter((p) => selectedIds.includes(p.id))
  const trimmed = query.trim()
  const filtered = persons.filter(
    (p) => !selectedIds.includes(p.id) && p.name.toLowerCase().includes(trimmed.toLowerCase())
  )
  const isNew =
    !!onCreatePerson &&
    trimmed !== '' &&
    !persons.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function remove(id: string) {
    onChange(selectedIds.filter((sid) => sid !== id))
  }

  function add(id: string) {
    onChange([...selectedIds, id])
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  async function handleCreate(e: React.MouseEvent) {
    e.preventDefault()
    if (!onCreatePerson || !trimmed || creating) return
    setCreating(true)
    try {
      const newPerson = await onCreatePerson(trimmed)
      onChangeRef.current([...selectedIdsRef.current, newPerson.id])
      setQuery('')
      setOpen(false)
    } catch {
      onCreateError?.('Failed to create person')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef}>
      {label && <p className="eyebrow mb-1.5">{label}</p>}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <div key={p.id} className="chip h-6 pr-1">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[9px] font-semibold text-[var(--ink-2)]">
                {getInitials(p.name)}
              </span>
              <span className="text-[var(--ink)]">{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="ml-0.5 inline-flex items-center text-[var(--ink-4)]"
                aria-label={`Remove ${p.name}`}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Icon
          name="person_search"
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ink-4)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search or add person…"
          className="input pl-7"
          autoComplete="off"
        />
      </div>

      {/* Dropdown for existing persons */}
      {open && filtered.length > 0 && (
        <ul className="relative z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-pop)]">
          {filtered.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => add(p.id)}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            >
              <Icon name="person" size={14} className="text-[var(--ink-4)]" />
              {p.name}
            </li>
          ))}
        </ul>
      )}

      {/* Create new person card */}
      {isNew && (
        <div
          onMouseDown={handleCreate}
          className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--surface)] px-2.5 py-2 text-[var(--ink-2)] select-none [transition:background_.1s_ease,border-color_.1s_ease]"
          style={{ opacity: creating ? 0.6 : 1 }}
        >
          <Icon
            name={creating ? 'progress_activity' : 'person_add'}
            size={16}
            spin={creating}
            className="text-[var(--ink-4)]"
          />
          <div className="min-w-0">
            <span className="eyebrow block">Create new person</span>
            <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">
              &ldquo;{trimmed}&rdquo;
            </p>
          </div>
          {creating && <span className="ml-auto text-[11px] text-[var(--ink-3)]">Creating…</span>}
        </div>
      )}
    </div>
  )
}
