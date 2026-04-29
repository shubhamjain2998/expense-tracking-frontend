import type { UseMutationResult } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'

import { SkeletonTable } from '@/components/ui/Skeleton'
import type { Category } from '@/types/settings'
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { SortCol, SortDir, UnifiedTxn } from '../types'

import { EditPanel } from './EditPanel'
import { ProcessPanel } from './ProcessPanel'
import { TransactionRow } from './TransactionRow'
import { TransactionsTableHead } from './TransactionsTableHead'

interface TransactionsListProps {
  sorted: UnifiedTxn[]
  filtered: UnifiedTxn[]
  allTxns: UnifiedTxn[]
  isLoading: boolean
  checkedUids: Set<string>
  setCheckedUids: Dispatch<SetStateAction<Set<string>>>
  showDeleted: boolean
  setShowDeleted: (v: boolean | ((v: boolean) => boolean)) => void
  deletedCount: number
  sortCol: SortCol
  sortDir: SortDir
  onToggleSort: (col: SortCol) => void
  selectedUid: string | null
  setSelectedUid: (uid: string | null) => void
  editingTxn: ProcessedTransactionItem | null
  setEditingTxn: (txn: ProcessedTransactionItem | null) => void
  openMenuUid: string | null
  setOpenMenuUid: (uid: string | null) => void
  hoveredRowUid: string | null
  setHoveredRowUid: (uid: string | null) => void
  draggingUid: string | null
  onDragStart: (uid: string) => void
  onDragEnd: () => void
  categories: Category[]
  deleteRawMutation: UseMutationResult<void, Error, string>
  restoreRawMutation: UseMutationResult<void, Error, string>
  deleteProcMutation: UseMutationResult<void, Error, string>
  showProcessPanel: boolean
  showEditPanel: boolean
  selectedTxn: UnifiedTxn | null | undefined
}

const sidePanelStyle: React.CSSProperties = {
  width: 360,
  borderLeft: '1px solid var(--line)',
  position: 'sticky',
  top: 24,
  alignSelf: 'flex-start',
  maxHeight: 'calc(100vh - 80px)',
  overflowY: 'auto',
}

export function TransactionsList({
  sorted,
  filtered,
  allTxns,
  isLoading,
  checkedUids,
  setCheckedUids,
  showDeleted,
  setShowDeleted,
  deletedCount,
  sortCol,
  sortDir,
  onToggleSort,
  selectedUid,
  setSelectedUid,
  editingTxn,
  setEditingTxn,
  openMenuUid,
  setOpenMenuUid,
  hoveredRowUid,
  setHoveredRowUid,
  draggingUid,
  onDragStart,
  onDragEnd,
  categories,
  deleteRawMutation,
  restoreRawMutation,
  deleteProcMutation,
  showProcessPanel,
  showEditPanel,
  selectedTxn,
}: TransactionsListProps) {
  const visibleFiltered = filtered.filter((t) => t.kind !== 'deleted')
  const allNonDeleted = allTxns.filter((t) => t.kind !== 'deleted')

  return (
    <div className="card card-flush mt-4" style={{ overflow: 'clip' }}>
      {isLoading ? (
        <SkeletonTable />
      ) : allNonDeleted.length === 0 ? (
        <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          No transactions for this period.
        </p>
      ) : (
        <div className="flex min-h-0">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 32 }} />
                <col style={{ width: 78 }} />
                <col />
                <col style={{ width: 160 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 54 }} />
                <col style={{ width: 114 }} />
                <col style={{ width: 38 }} />
              </colgroup>
              <TransactionsTableHead
                sortCol={sortCol}
                sortDir={sortDir}
                onToggleSort={onToggleSort}
                visibleFiltered={visibleFiltered}
                checkedUids={checkedUids}
                setCheckedUids={setCheckedUids}
              />
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: '40px 0',
                        textAlign: 'center',
                        fontSize: 12.5,
                        color: 'var(--ink-3)',
                      }}
                    >
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((txn) => {
                    const isSelected = selectedUid === txn.uid
                    const isDeleted = txn.kind === 'deleted'
                    return (
                      <TransactionRow
                        key={txn.uid}
                        txn={txn}
                        isSelected={isSelected}
                        isDragging={draggingUid === txn.uid}
                        hasMenu={openMenuUid === txn.uid}
                        isChecked={checkedUids.has(txn.uid)}
                        isHovered={hoveredRowUid === txn.uid}
                        onProcess={() => {
                          setSelectedUid(txn.uid)
                          setEditingTxn(null)
                          setOpenMenuUid(null)
                        }}
                        onEdit={() => {
                          setEditingTxn(txn.processedOriginal!)
                          setOpenMenuUid(null)
                        }}
                        onDelete={() => {
                          if (txn.kind === 'pending' && txn.rawId)
                            deleteRawMutation.mutate(txn.rawId)
                          else if (txn.kind === 'processed' && txn.processedId)
                            deleteProcMutation.mutate(txn.processedId)
                          setOpenMenuUid(null)
                        }}
                        onRestore={() => {
                          if (txn.rawId) restoreRawMutation.mutate(txn.rawId)
                          setOpenMenuUid(null)
                        }}
                        onToggleCheck={() =>
                          setCheckedUids((prev) => {
                            const next = new Set(prev)
                            if (next.has(txn.uid)) next.delete(txn.uid)
                            else next.add(txn.uid)
                            return next
                          })
                        }
                        onToggleMenu={() =>
                          setOpenMenuUid(openMenuUid === txn.uid ? null : txn.uid)
                        }
                        onRowClick={() => {
                          if (isDeleted) return
                          if (txn.kind === 'pending') {
                            setSelectedUid(isSelected ? null : txn.uid)
                            setEditingTxn(null)
                          } else if (txn.processedOriginal) {
                            setEditingTxn(
                              editingTxn?.id === txn.processedId ? null : txn.processedOriginal
                            )
                            setSelectedUid(txn.uid)
                          }
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          onDragStart(txn.uid)
                        }}
                        onDragEnd={onDragEnd}
                        onMouseEnter={() => setHoveredRowUid(txn.uid)}
                        onMouseLeave={() => setHoveredRowUid(null)}
                        setSelectedUid={setSelectedUid}
                        setEditingTxn={setEditingTxn}
                      />
                    )
                  })
                )}
              </tbody>
            </table>
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 11.5,
                color: 'var(--ink-3)',
              }}
            >
              <span>
                {visibleFiltered.length} of {allNonDeleted.length} transactions
              </span>
              {deletedCount > 0 && (
                <button
                  onClick={() => setShowDeleted((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    color: showDeleted ? 'var(--ink-2)' : 'var(--ink-4)',
                    padding: 0,
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                  }}
                >
                  {showDeleted ? 'Hide' : 'Show'} {deletedCount} deleted
                </button>
              )}
            </div>
          </div>

          {showProcessPanel && selectedTxn?.rawOriginal && (
            <div className="shrink-0" style={sidePanelStyle}>
              <ProcessPanel
                key={selectedTxn.rawId}
                txn={selectedTxn.rawOriginal}
                categories={categories}
                onClose={() => setSelectedUid(null)}
                onProcessed={() => setSelectedUid(null)}
              />
            </div>
          )}

          {showEditPanel && editingTxn && (
            <div className="shrink-0" style={sidePanelStyle}>
              <EditPanel
                key={editingTxn.id}
                txn={editingTxn}
                categories={categories}
                onClose={() => setEditingTxn(null)}
                onSaved={() => setEditingTxn(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
