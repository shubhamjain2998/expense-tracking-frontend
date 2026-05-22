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
  onCreateError?: (msg: string) => void
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
  onCreateError,
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
      onChange(trimmed)
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
      } catch {
        onCreateError?.('Failed to create category')
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
        <label htmlFor={id} className="eyebrow mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[14px] text-[var(--ink-4)]">
          search
        </span>
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const newQuery = e.target.value
            setQuery(newQuery)
            setOpen(true)
            setHighlightIndex(0)
            if (allowCreate) {
              const newTrimmed = newQuery.trim()
              const newIsNew =
                newTrimmed !== '' &&
                !normalised.some((o) => o.label.toLowerCase() === newTrimmed.toLowerCase())
              if (newIsNew && !onCreateOption) setCreateChecked(true)
              else if (!newIsNew) setCreateChecked(false)
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="input pl-7"
          autoComplete="off"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {error && (
        <p className="mt-1 text-[11px] text-[var(--neg)]">
          {error}
        </p>
      )}

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius-lg)] shadow-[var(--shadow-pop)] p-1"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={() => select(opt)}
              className="cursor-pointer"
              style={{
                padding: '7px 10px',
                fontSize: 12.5,
                borderRadius: 'var(--radius-sm)',
                background: i === highlightIndex ? 'var(--surface-2)' : 'transparent',
                color: i === highlightIndex ? 'var(--ink)' : 'var(--ink-2)',
                fontWeight: opt.value === value ? 500 : 400,
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {isNewValue && (
        <div
          onMouseDown={handleCreateToggle}
          className="mt-2 flex cursor-pointer items-center gap-2.5 select-none"
          style={{
            padding: '8px 10px',
            border: `1px solid ${createChecked ? 'var(--accent)' : 'var(--line-strong)'}`,
            borderRadius: 'var(--radius)',
            background: createChecked ? 'var(--accent-soft)' : 'var(--surface)',
            color: createChecked ? 'var(--accent)' : 'var(--ink-2)',
            opacity: creating ? 0.6 : 1,
            transition: 'background .1s ease, border-color .1s ease',
          }}
        >
          <span
            className={`material-symbols-outlined ${creating ? 'animate-spin' : ''}`}
            style={{
              fontSize: 16,
              color: createChecked ? 'var(--accent)' : 'var(--ink-4)',
            }}
          >
            {creating
              ? 'progress_activity'
              : createChecked
                ? 'check_box'
                : 'check_box_outline_blank'}
          </span>
          <div className="min-w-0">
            <span className="eyebrow block">{creating ? 'Creating…' : 'Create new category'}</span>
            <p
              className="truncate text-[12.5px] font-medium"
              style={{ color: createChecked ? 'var(--accent)' : 'var(--ink)' }}
            >
              &ldquo;{trimmed}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
