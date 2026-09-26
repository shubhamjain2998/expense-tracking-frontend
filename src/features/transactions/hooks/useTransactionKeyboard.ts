import { useEffect } from 'react'

import type { Category } from '@/types/settings'
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

interface UseTransactionKeyboardParams {
  selectedUid: string | null
  /** The rows in the order the table shows them — arrows walk this list. */
  rows: UnifiedTxn[]
  shortcutCats: Category[]
  editingTxn: ProcessedTransactionItem | null
  setSelectedUid: (uid: string | null) => void
  setEditingTxn: (txn: ProcessedTransactionItem | null) => void
  quickCategorize: (params: { rawId: string; categoryId: string }) => void
  changeCategory: (params: { procId: string; categoryId: string }) => void
  onShowShortcuts?: () => void
}

export function useTransactionKeyboard({
  selectedUid,
  rows,
  shortcutCats,
  editingTxn,
  setSelectedUid,
  setEditingTxn,
  quickCategorize,
  changeCategory,
  onShowShortcuts,
}: UseTransactionKeyboardParams) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return
      // Browser and OS chords (Ctrl/⌘+1 switches tabs) are not ours, and an
      // open dialog owns the keyboard: without this, Esc closed the
      // shortcuts overlay and the edit panel under it in one press, and a
      // digit typed over a dialog categorised the row behind it.
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[aria-modal="true"]')) return

      // `?` is Shift+/ on most layouts, so Shift must not be rejected here —
      // the old `!e.shiftKey` check meant the key never opened the overlay.
      if (e.key === '?') {
        e.preventDefault()
        onShowShortcuts?.()
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const live = rows.filter((t) => t.kind !== 'deleted')
        if (live.length === 0) return
        const idx = selectedUid ? live.findIndex((t) => t.uid === selectedUid) : -1
        const next =
          e.key === 'ArrowDown'
            ? live[Math.min(idx + 1, live.length - 1)]
            : live[Math.max(idx - 1, 0)]
        setSelectedUid(next.uid)
        // An open editor follows the selection, as a click would: onto the
        // next processed row, or out of the way so a pending row's process
        // panel can show.
        if (editingTxn)
          setEditingTxn(next.kind === 'processed' ? (next.processedOriginal ?? null) : null)
        requestAnimationFrame(() =>
          document.querySelector('.txn-table tr.row.sel')?.scrollIntoView({ block: 'nearest' })
        )
        return
      }

      if (e.key >= '1' && e.key <= '9' && selectedUid) {
        const cat = shortcutCats[Number(e.key) - 1]
        if (!cat) return
        const txn = rows.find((t) => t.uid === selectedUid)
        if (!txn) return
        if (txn.kind === 'pending' && txn.rawId)
          quickCategorize({ rawId: txn.rawId, categoryId: cat.id })
        else if (txn.kind === 'processed' && txn.processedId)
          changeCategory({ procId: txn.processedId, categoryId: cat.id })
      }

      if (e.key === 'Escape') {
        if (editingTxn) {
          setEditingTxn(null)
          return
        }
        setSelectedUid(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    selectedUid,
    rows,
    shortcutCats,
    editingTxn,
    setSelectedUid,
    setEditingTxn,
    quickCategorize,
    changeCategory,
    onShowShortcuts,
  ])
}
