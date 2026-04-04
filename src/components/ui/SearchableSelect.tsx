import { useState, useRef, useEffect, useId } from 'react'

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search categories…',
  label,
  error,
}: SearchableSelectProps) {
  const id = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(value)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  function select(option: string) {
    onChange(option)
    setQuery(option)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    else if (e.key === 'ArrowUp') setHighlightIndex((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && filtered[highlightIndex]) select(filtered[highlightIndex])
    else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(value)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#3f484c]">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#70787c]">
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
          className="input-field w-full pl-9"
          autoComplete="off"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {error && <p className="mt-1 text-xs text-[#ba1a1a]">{error}</p>}
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl bg-white shadow-[0_8px_40px_rgba(24,28,32,0.08)]"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onMouseDown={() => select(opt)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === highlightIndex ? 'bg-[#f1f4fa] font-medium text-[#004251]' : 'text-[#181c20] hover:bg-[#f1f4fa]'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
