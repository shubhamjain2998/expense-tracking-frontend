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

const avatarColors = [
  'bg-primary text-on-primary',
  'bg-primary-container text-on-primary-container',
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-tertiary-container text-on-tertiary-container',
]

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
      {label && (
        <p className="text-on-surface-variant mb-1.5 text-xs font-semibold tracking-wider uppercase">
          {label}
        </p>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((p, i) => (
            <div
              key={p.id}
              className="bg-surface-container-high text-on-surface flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${avatarColors[i % avatarColors.length]}`}
              >
                {getInitials(p.name)}
              </span>
              {p.name}
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-outline hover:text-on-surface ml-0.5"
                aria-label={`Remove ${p.name}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
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
          className="input-field w-full"
          style={{ paddingLeft: '2.25rem' }}
          autoComplete="off"
        />
      </div>

      {/* Dropdown for existing persons */}
      {open && filtered.length > 0 && (
        <ul className="bg-surface-container-lowest relative z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          {filtered.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => add(p.id)}
              className="text-on-surface hover:bg-surface-container-low flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm"
            >
              <span className="material-symbols-outlined text-outline text-[16px]">person</span>
              {p.name}
            </li>
          ))}
        </ul>
      )}

      {/* Create new person card */}
      {isNew && (
        <div
          onMouseDown={handleCreate}
          className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors select-none ${
            creating
              ? 'border-primary/40 bg-primary/8 opacity-60'
              : 'border-outline-variant/40 bg-surface-container text-on-surface-variant hover:border-primary/30'
          }`}
        >
          <span className="material-symbols-outlined text-outline text-[20px]">
            {creating ? 'progress_activity' : 'person_add'}
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wider uppercase">
              Create new person
            </span>
            <p className="text-on-surface truncate text-sm font-medium">&ldquo;{trimmed}&rdquo;</p>
          </div>
          {creating && <span className="text-outline ml-auto text-xs">Creating…</span>}
        </div>
      )}
    </div>
  )
}
