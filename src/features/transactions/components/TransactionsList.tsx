import type { UseMutationResult } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'
import type { Category } from '@/types/settings'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { txnTotals } from '../lib/txnFormat'
import type { SortCol, SortDir, UnifiedTxn } from '../types'

import { EditPanel } from './EditPanel'
import { ProcessPanel } from './ProcessPanel'
import { TransactionRow } from './TransactionRow'
import { TransactionRowMobile } from './TransactionRowMobile'
import { TransactionsTableHead } from './TransactionsTableHead'
import { TxnSidePanel } from './TxnSidePanel'

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
  draggingUids: Set<string>
  onDragStart: (uid: string, e: React.DragEvent) => void
  onDragEnd: () => void
  categories: Category[]
  deleteRawMutation: UseMutationResult<void, Error, string>
  restoreRawMutation: UseMutationResult<void, Error, string>
  deleteProcMutation: UseMutationResult<void, Error, string>
  showProcessPanel: boolean
  showEditPanel: boolean
  selectedTxn: UnifiedTxn | null | undefined
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
  draggingUids,
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

  // Totals row reflects exactly what the user is looking at: when checkboxes
  // are used we honor that explicit selection (and ignore the rest), otherwise
  // we sum the post-filter / post-search rows. Sign convention is sourced
  // from `txn_type` — not the raw amount sign — because this codebase stores
  // income with mixed signs in `effective_amount` and only `txn_type` is
  // authoritative (see txnFormat.ts: isIncome).
  const checkedVisible = visibleFiltered.filter((t) => checkedUids.has(t.uid))
  const totalsSource = checkedVisible.length > 0 ? checkedVisible : visibleFiltered
  const { incomeTotal, expenseTotal, netTotal, hasMixed } = txnTotals(totalsSource)
  const totalsLabel =
    checkedVisible.length > 0
      ? `${checkedVisible.length} selected`
      : `${visibleFiltered.length} transaction${visibleFiltered.length === 1 ? '' : 's'}`

  return (
    <div className="card card-flush mt-4" style={{ overflow: 'clip' }}>
      {isLoading ? (
        <SkeletonTable />
      ) : allNonDeleted.length === 0 ? (
        <div className="py-6">
          <EmptyState
            icon="receipt_long"
            title="No transactions for this period"
            description="Upload a bank-statement PDF to populate this view, or add a transaction by hand."
          />
          <div className="mt-1 flex justify-center">
            <Link to="/upload" className="btn primary sm" style={{ gap: 4 }}>
              <Icon name="upload" size={14} />
              Upload a statement
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0">
          <div className="min-w-0 flex-1 overflow-x-auto">
            {/* Mobile card list — replaces the table below 767px */}
            <div className="txn-list-mobile list mt-2 md:hidden">
              {sorted.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-[var(--ink-3)]">
                  No transactions match your filters.
                </div>
              ) : (
                sorted.map((txn) => {
                  const isSelected = selectedUid === txn.uid
                  const isDeleted = txn.kind === 'deleted'
                  return (
                    <TransactionRowMobile
                      key={`m-${txn.uid}`}
                      txn={txn}
                      isSelected={isSelected}
                      onTap={() => {
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
                    />
                  )
                })
              )}
              {sorted.length > 0 && (
                <div
                  className="md:hidden"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    marginTop: 4,
                    background: 'var(--surface-2)',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
                    {totalsLabel}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: netTotal < 0 ? 'var(--pos)' : 'var(--ink)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {netTotal < 0 ? '+' : ''}
                    {formatCurrency(Math.abs(netTotal), { fractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
            <table className="tbl txn-table hidden md:table" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col className="txn-col-check" style={{ width: 36 }} />
                <col className="txn-col-drag" style={{ width: 32 }} />
                <col style={{ width: 78 }} />
                <col />
                <col style={{ width: 160 }} />
                <col className="txn-col-tags" style={{ width: 100 }} />
                <col className="txn-col-split" style={{ width: 54 }} />
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
                        isDragging={draggingUids.has(txn.uid)}
                        hasMenu={openMenuUid === txn.uid}
                        isChecked={checkedUids.has(txn.uid)}
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
                          onDragStart(txn.uid, e)
                        }}
                        onDragEnd={onDragEnd}
                        setSelectedUid={setSelectedUid}
                        setEditingTxn={setEditingTxn}
                      />
                    )
                  })
                )}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr
                    style={{
                      background: 'var(--surface-2)',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <td colSpan={3} />
                    <td
                      colSpan={4}
                      style={{
                        padding: '12px 12px',
                        fontSize: 12.5,
                        color: 'var(--ink-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{totalsLabel}</span>
                      {hasMixed && (
                        <>
                          <span
                            style={{ marginLeft: 12, fontSize: 11.5, color: 'var(--pos)' }}
                            title="Income in view"
                          >
                            +{formatCurrency(incomeTotal, { fractionDigits: 0 })}
                          </span>
                          <span
                            style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--ink-3)' }}
                            title="Expenses in view"
                          >
                            −{formatCurrency(expenseTotal, { fractionDigits: 0 })}
                          </span>
                        </>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px 12px',
                        textAlign: 'right',
                        fontSize: 14,
                        fontWeight: 700,
                        color: netTotal < 0 ? 'var(--pos)' : 'var(--ink)',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                      title={netTotal < 0 ? 'Net income' : 'Net spend'}
                    >
                      {netTotal < 0 ? '+' : ''}
                      {formatCurrency(Math.abs(netTotal), { fractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
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
            <TxnSidePanel onDismiss={() => setSelectedUid(null)}>
              <ProcessPanel
                key={selectedTxn.rawId}
                txn={selectedTxn.rawOriginal}
                categories={categories}
                onClose={() => setSelectedUid(null)}
                onProcessed={() => setSelectedUid(null)}
              />
            </TxnSidePanel>
          )}

          {showEditPanel && editingTxn && (
            <TxnSidePanel onDismiss={() => setEditingTxn(null)}>
              <EditPanel
                key={editingTxn.id}
                txn={editingTxn}
                categories={categories}
                onClose={() => setEditingTxn(null)}
                onSaved={() => setEditingTxn(null)}
              />
            </TxnSidePanel>
          )}
        </div>
      )}
    </div>
  )
}
