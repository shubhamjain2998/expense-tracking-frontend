import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Icon, type IconName } from '@/components/ui/Icon'

import { ImportDialog, type ImportTab } from './ImportDialog'

const ITEMS: { id: ImportTab; icon: IconName; label: string; description: string }[] = [
  {
    id: 'pdf',
    icon: 'description',
    label: 'Bank statement PDF',
    description: 'Parsed automatically · password supported',
  },
  {
    id: 'bulk-paste',
    icon: 'content_paste',
    label: 'Paste rows',
    description: 'From a spreadsheet or email',
  },
  {
    id: 'manual',
    icon: 'edit',
    label: 'Add one manually',
    description: 'Single transaction',
  },
]

/**
 * Toolbar "Import" button — replaces the old standalone /upload page. Opens
 * a small menu of the three import methods; picking one opens `ImportDialog`
 * on that tab. Also honours `?import=pdf` (etc.) in the URL so the
 * `/upload` -> `/transactions?import=pdf` redirect (see App.tsx) lands
 * straight on the dialog instead of a dead route.
 */
export function ImportMenu() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  // Honour the `import` URL param on first render (lazy initializer, not an
  // effect, so it can't reopen the dialog if it lingers in the URL after the
  // user closes it) — this is how `/upload` -> `/transactions?import=pdf`
  // lands on the dialog instead of a dead route.
  const [dialogTab, setDialogTab] = useState<ImportTab | null>(() => {
    const requested = searchParams.get('import')
    if (requested === 'pdf' || requested === 'bulk-paste' || requested === 'manual') {
      return requested
    }
    return null
  })
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function closeDialog() {
    setDialogTab(null)
    if (searchParams.has('import')) {
      setSearchParams(
        (p) => {
          p.delete('import')
          return p
        },
        { replace: true }
      )
    }
  }

  return (
    <>
      <span className="menu-wrap" ref={wrapRef}>
        <button
          type="button"
          className="btn"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="upload" size={14} />
          Import
          <Icon name="expand_more" size={14} />
        </button>
        {open && (
          <div className="menu" role="menu">
            {ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setOpen(false)
                  setDialogTab(item.id)
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>
                  <span className="strong" style={{ display: 'block' }}>
                    {item.label}
                  </span>
                  <span className="small">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </span>
      {dialogTab && <ImportDialog initialTab={dialogTab} onClose={closeDialog} />}
    </>
  )
}
