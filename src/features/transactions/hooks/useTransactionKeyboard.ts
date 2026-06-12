import { useEffect } from 'react'

import type { Category } from '@/types/settings'
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

interface UseTransactionKeyboardParams {
  selectedUid: string | null
  filtered: UnifiedTxn[]
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
  filtered,
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
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault()
        onShowShortcuts?.()
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = selectedUid ? filtered.findIndex((t) => t.uid === selectedUid) : -1
        if (e.key === 'ArrowDown')
          setSelectedUid(filtered[Math.min(idx + 1, filtered.length - 1)]?.uid ?? null)
        else setSelectedUid(filtered[Math.max(idx - 1, 0)]?.uid ?? null)
      }

      if (e.key >= '1' && e.key <= '9' && selectedUid) {
        const cat = shortcutCats[Number(e.key) - 1]
        if (!cat) return
        const txn = filtered.find((t) => t.uid === selectedUid)
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
    filtered,
    shortcutCats,
    editingTxn,
    setSelectedUid,
    setEditingTxn,
    quickCategorize,
    changeCategory,
    onShowShortcuts,
  ])
}
