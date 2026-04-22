import { useState, useRef, useEffect, useId } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: string[] | SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  allowCreate?: boolean
  onCreateOption?: (label: string) => Promise<string>
}

function normalise(options: string[] | SelectOption[]): SelectOption[] {
  if (options.length === 0) return []
  if (typeof options[0] === 'string') {
    return (options as string[]).map((o) => ({ value: o, label: o }))
  }
  return options as SelectOption[]
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search categories…',
  label,
  error,
  allowCreate = false,
  onCreateOption,
}: SearchableSelectProps) {
  const id = useId()
  const normalised = normalise(options)

  // Display label for the current value
  const currentLabel = normalised.find((o) => o.value === value)?.label ?? value

  const [query, setQuery] = useState(currentLabel)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [createChecked, setCreateChecked] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const skipSyncRef = useRef(false)

  const filtered = normalised.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  const trimmed = query.trim()
  const isNewValue =
    allowCreate &&
    trimmed !== '' &&
    !normalised.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())

  useEffect(() => {
    if (isNewValue && !onCreateOption) {
      setCreateChecked(true)
      onChange(trimmed)
    } else if (!isNewValue) {
      setCreateChecked(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, isNewValue])

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    const lbl = normalised.find((o) => o.value === value)?.label ?? value
    setQuery(lbl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!createChecked) {
          const lbl = normalised.find((o) => o.value === value)?.label ?? value
          setQuery(lbl)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, createChecked])

  function select(option: SelectOption) {
    onChange(option.value)
    setQuery(option.label)
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
      const lbl = normalised.find((o) => o.value === value)?.label ?? value
      setQuery(lbl)
    }
  }

  async function handleCreateToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (creating) return

    if (onCreateOption) {
      setCreating(true)
      try {
        const newValue = await onCreateOption(trimmed)
        skipSyncRef.current = true
        onChange(newValue)
        setQuery(trimmed)
        setCreateChecked(true)
        setOpen(false)
      } finally {
        setCreating(false)
      }
    } else {
      const next = !createChecked
      setCreateChecked(next)
      onChange(next ? trimmed : '')
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

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="bg-surface-container-lowest absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={() => select(opt)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-surface-container-low text-primary font-medium'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {isNewValue && (
        <div
          onMouseDown={handleCreateToggle}
          className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors select-none ${
            creating
              ? 'border-primary/40 bg-primary/8 opacity-60'
              : createChecked
                ? 'border-primary/40 bg-primary/8 text-primary'
                : 'border-outline-variant/40 bg-surface-container text-on-surface-variant hover:border-primary/30'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-colors ${
              creating ? 'animate-spin' : createChecked ? 'text-primary' : 'text-outline'
            }`}
          >
            {creating
              ? 'progress_activity'
              : createChecked
                ? 'check_box'
                : 'check_box_outline_blank'}
          </span>
          <div className="min-w-0">
            <span className="text-xs font-semibold tracking-wider uppercase">
              {creating ? 'Creating…' : 'Create new category'}
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
