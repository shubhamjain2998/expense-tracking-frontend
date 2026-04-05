import { useState, useRef, useEffect } from 'react'

import type { Person } from '../../types/settings'

interface MultiSelectProps {
  persons: Person[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
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

export function MultiSelect({ persons, selectedIds, onChange, label }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = persons.filter((p) => selectedIds.includes(p.id))
  const unselected = persons.filter((p) => !selectedIds.includes(p.id))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
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
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <p className="text-on-surface-variant mb-1.5 text-xs font-semibold tracking-wider uppercase">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
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
        {unselected.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              add
            </span>
            Add Person
          </button>
        )}
      </div>
      {open && unselected.length > 0 && (
        <ul className="bg-surface-container-lowest absolute z-30 mt-1 w-full rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          {unselected.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => add(p.id)}
              className="text-on-surface hover:bg-surface-container-low cursor-pointer px-4 py-2.5 text-sm"
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
