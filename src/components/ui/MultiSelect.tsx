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
  'bg-[#004251] text-white',
  'bg-[#005b6f] text-white',
  'bg-[#536167] text-white',
  'bg-[#5b3200] text-white',
  'bg-[#774815] text-white',
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
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#3f484c]">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {selected.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded-full bg-[#f1f4fa] px-3 py-1 text-xs font-medium text-[#181c20]"
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
              className="ml-0.5 text-[#70787c] hover:text-[#181c20]"
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
            className="flex items-center gap-1 rounded-full border border-dashed border-[#bfc8cc] px-3 py-1 text-xs text-[#3f484c] hover:border-[#004251] hover:text-[#004251]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              add
            </span>
            Add Person
          </button>
        )}
      </div>
      {open && unselected.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-xl bg-white shadow-[0_8px_40px_rgba(24,28,32,0.08)]">
          {unselected.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => add(p.id)}
              className="cursor-pointer px-4 py-2.5 text-sm text-[#181c20] hover:bg-[#f1f4fa]"
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
