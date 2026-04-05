import { useState, useRef, useEffect, useId } from 'react'

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  allowCreate?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search categories…',
  label,
  error,
  allowCreate = false,
}: SearchableSelectProps) {
  const id = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [createChecked, setCreateChecked] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
  const trimmed = query.trim()
  const isNewValue =
    allowCreate && trimmed !== '' && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase())

  // When query changes to a new (non-existing) value, auto-check and set the value
  useEffect(() => {
    if (isNewValue) {
      setCreateChecked(true)
      onChange(trimmed)
    } else {
      setCreateChecked(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, isNewValue])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // only reset query if user didn't create a new value
        if (!createChecked) setQuery(value)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value, createChecked])

  function select(option: string) {
    onChange(option)
    setQuery(option)
    setOpen(false)
    setCreateChecked(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    else if (e.key === 'ArrowUp') setHighlightIndex((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter') {
      if (filtered[highlightIndex]) select(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(value)
    }
  }

  function handleCreateToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !createChecked
    setCreateChecked(next)
    if (next) {
      onChange(trimmed)
    } else {
      onChange('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wider uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          search
        </span>
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlightIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="input-field w-full"
          style={{ paddingLeft: '2.25rem' }}
          autoComplete="off"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {error && <p className="text-error mt-1 text-xs">{error}</p>}

      {/* Existing options dropdown */}
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="bg-surface-container-lowest absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onMouseDown={() => select(opt)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-surface-container-low text-primary font-medium'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {/* Create new category checkbox — shown inline below input when no exact match */}
      {isNewValue && (
        <div
          onMouseDown={handleCreateToggle}
          className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors select-none ${
            createChecked
              ? 'border-primary/40 bg-primary/8 text-primary'
              : 'border-outline-variant/40 bg-surface-container text-on-surface-variant hover:border-primary/30'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-colors ${
              createChecked ? 'text-primary' : 'text-outline'
            }`}
          >
            {createChecked ? 'check_box' : 'check_box_outline_blank'}
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wider uppercase">
              Create new category
            </span>
            <p
              className={`truncate text-sm font-medium ${createChecked ? 'text-primary' : 'text-on-surface'}`}
            >
              &ldquo;{trimmed}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
