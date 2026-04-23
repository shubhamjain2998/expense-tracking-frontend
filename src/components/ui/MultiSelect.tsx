import { useState, useRef, useEffect } from 'react'

import type { Person } from '../../types/settings'

interface MultiSelectProps {
  persons: Person[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreatePerson?: (name: string) => Promise<Person>
  label?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function MultiSelect({
  persons,
  selectedIds,
  onChange,
  onCreatePerson,
  label,
}: MultiSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      onChange([...selectedIds, newPerson.id])
      setQuery('')
      setOpen(false)
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
            <div key={p.id} className="chip" style={{ paddingRight: 4, height: 24 }}>
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--surface-3)',
                  color: 'var(--ink-2)',
                  fontSize: 9,
                  fontWeight: 600,
                }}
              >
                {getInitials(p.name)}
              </span>
              <span style={{ color: 'var(--ink)' }}>{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="ml-0.5 inline-flex items-center"
                aria-label={`Remove ${p.name}`}
                style={{ color: 'var(--ink-4)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <span
          className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          style={{ fontSize: 14, color: 'var(--ink-4)' }}
        >
          person_search
        </span>
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
          className="input"
          style={{ paddingLeft: 28 }}
          autoComplete="off"
        />
      </div>

      {/* Dropdown for existing persons */}
      {open && filtered.length > 0 && (
        <ul
          className="relative z-30 mt-1 max-h-40 w-full overflow-y-auto"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-pop)',
            padding: 4,
          }}
        >
          {filtered.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => add(p.id)}
              className="flex cursor-pointer items-center gap-2"
              style={{
                padding: '7px 10px',
                fontSize: 12.5,
                color: 'var(--ink-2)',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: 'var(--ink-4)' }}
              >
                person
              </span>
              {p.name}
            </li>
          ))}
        </ul>
      )}

      {/* Create new person card */}
      {isNew && (
        <div
          onMouseDown={handleCreate}
          className="mt-2 flex cursor-pointer items-center gap-2.5 select-none"
          style={{
            padding: '8px 10px',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: 'var(--ink-2)',
            opacity: creating ? 0.6 : 1,
            transition: 'background .1s ease, border-color .1s ease',
          }}
        >
          <span
            className={`material-symbols-outlined ${creating ? 'animate-spin' : ''}`}
            style={{ fontSize: 16, color: 'var(--ink-4)' }}
          >
            {creating ? 'progress_activity' : 'person_add'}
          </span>
          <div className="min-w-0">
            <span className="eyebrow block">Create new person</span>
            <p className="truncate text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
              &ldquo;{trimmed}&rdquo;
            </p>
          </div>
          {creating && (
            <span className="ml-auto text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Creating…
            </span>
          )}
        </div>
      )}
    </div>
  )
}
