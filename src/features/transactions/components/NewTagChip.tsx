import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToastContext'
import { createTag } from '@/lib/api/tags'
import { qk } from '@/lib/queryKeys'

interface NewTagChipProps {
  onCreated: (id: string) => void
}

export function NewTagChip({ onCreated }: NewTagChipProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const toast = useToastContext()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function cancel() {
    setEditing(false)
    setValue('')
  }

  async function handleCreate() {
    const name = value.trim()
    if (!name) {
      cancel()
      return
    }
    setBusy(true)
    try {
      const tag = await createTag(name)
      void qc.invalidateQueries({ queryKey: qk.tags.all })
      onCreated(tag.id)
      cancel()
    } catch {
      toast.error('Failed to create tag')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleCreate()
            }
            if (e.key === 'Escape') cancel()
          }}
          onBlur={() => {
            if (!busy) cancel()
          }}
          disabled={busy}
          placeholder="Tag name…"
          style={{
            height: 24,
            fontSize: 12,
            padding: '0 8px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--accent)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            width: 110,
          }}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            void handleCreate()
          }}
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Icon name="check" size={13} style={{ color: 'var(--surface)' }} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="chip"
      onClick={() => setEditing(true)}
      style={{ cursor: 'pointer', gap: 3, color: 'var(--ink-3)' }}
    >
      <Icon name="add" size={12} />
      New tag
    </button>
  )
}
