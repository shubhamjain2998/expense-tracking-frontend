import { formatShortDate } from '@/lib/format'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { categoryColor } from '../lib/categoryColor'
import { formatAmount } from '../lib/txnFormat'
import type { UnifiedTxn } from '../types'

import { TxnContextMenu } from './TxnContextMenu'

interface TransactionRowProps {
  txn: UnifiedTxn
  isSelected: boolean
  isDragging: boolean
  hasMenu: boolean
  isChecked: boolean
  isHovered: boolean
  onProcess: () => void
  onEdit: () => void
  onDelete: () => void
  onRestore: () => void
  onToggleCheck: () => void
  onToggleMenu: () => void
  onRowClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  setSelectedUid: (uid: string | null) => void
  setEditingTxn: (txn: ProcessedTransactionItem | null) => void
}

export function TransactionRow({
  txn,
  isSelected,
  isDragging,
  hasMenu,
  isChecked,
  isHovered,
  onProcess,
  onEdit,
  onDelete,
  onRestore,
  onToggleCheck,
  onToggleMenu,
  onRowClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  setSelectedUid,
  setEditingTxn,
}: TransactionRowProps) {
  const isDeleted = txn.kind === 'deleted'
  const catColor = txn.categoryId ? categoryColor(txn.categoryId) : 'var(--warn)'
  const { display: amtDisplay, income: txnIncome } = formatAmount(txn.effectiveAmount)

  return (
    <tr
      draggable={!isDeleted}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(e)
      }}
      onDragEnd={onDragEnd}
      onClick={onRowClick}
      style={{
        borderBottom: '1px solid var(--line)',
        background: isSelected ? 'var(--accent-soft)' : 'transparent',
        opacity: isDragging || isDeleted ? 0.4 : 1,
        cursor: isDeleted ? 'default' : 'pointer',
        transition: 'background 0.08s',
      }}
      onMouseEnter={(e) => {
        onMouseEnter()
        if (!isSelected && !isDeleted)
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => {
        onMouseLeave()
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = isSelected
            ? 'var(--accent-soft)'
            : 'transparent'
      }}
    >
      {/* Checkbox */}
      <td
        className="txn-col-check"
        style={{ padding: '0 0 0 10px' }}
        onClick={(e) => {
          e.stopPropagation()
          if (!isDeleted) onToggleCheck()
        }}
      >
        {(isChecked || isHovered) && !isDeleted && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
        )}
      </td>

      {/* Drag handle */}
      <td
        className="txn-col-drag"
        style={{ padding: '0 0 0 6px', cursor: isDeleted ? 'default' : 'grab' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 16,
            color: 'var(--ink-4)',
            display: 'block',
            opacity: isDeleted ? 0.3 : 1,
          }}
        >
          drag_indicator
        </span>
      </td>

      {/* Date */}
      <td
        style={{
          padding: '11px 12px',
          fontSize: 12.5,
          color: 'var(--ink-3)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {formatShortDate(txn.txn_date)}
      </td>

      {/* Merchant */}
      <td style={{ padding: '11px 12px', minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
            textDecoration: isDeleted ? 'line-through' : 'none',
          }}
        >
          {txn.description}
        </span>
        {txn.notes && (
          <span
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 11,
              color: 'var(--ink-3)',
              marginTop: 1,
            }}
          >
            {txn.notes}
          </span>
        )}
      </td>

      {/* Category */}
      <td style={{ padding: '11px 12px' }}>
        {txn.kind === 'pending' ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: txnIncome ? 'var(--pos-soft)' : 'var(--warn-soft)',
              fontSize: 12,
              fontWeight: 500,
              color: txnIncome ? 'var(--pos)' : 'var(--warn)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: txnIncome ? 'var(--pos)' : 'var(--warn)',
                flexShrink: 0,
              }}
            />
            {txnIncome ? 'refund?' : 'pending'}
          </span>
        ) : isDeleted ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--neg-soft)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--neg)',
            }}
          >
            deleted
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background:
                txn.txnType === 'refund'
                  ? 'var(--pos-soft)'
                  : txn.txnType === 'transfer'
                    ? 'var(--surface-2)'
                    : `color-mix(in oklch, ${catColor} 13%, var(--surface))`,
              fontSize: 12,
              fontWeight: 500,
              color:
                txn.txnType === 'refund'
                  ? 'var(--pos)'
                  : txn.txnType === 'transfer'
                    ? 'var(--ink-3)'
                    : catColor,
              border: txn.txnType === 'transfer' ? '1px solid var(--line)' : undefined,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  txn.txnType === 'refund'
                    ? 'var(--pos)'
                    : txn.txnType === 'transfer'
                      ? 'var(--ink-4)'
                      : catColor,
                flexShrink: 0,
              }}
            />
            {txn.txnType === 'refund'
              ? `refund · ${txn.category}`
              : txn.txnType === 'transfer'
                ? 'transfer'
                : txn.category}
          </span>
        )}
      </td>

      {/* Tags */}
      <td className="txn-col-tags" style={{ padding: '11px 12px' }}>
        {txn.tags.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {txn.tags.map((tag) => (
              <span
                key={tag.id}
                className="chip"
                style={{ height: 18, padding: '0 6px', fontSize: 9.5 }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--ink-4)', fontSize: 14 }}>—</span>
        )}
      </td>

      {/* Split */}
      <td
        className="txn-col-split"
        style={{ padding: '11px 12px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (txn.processedOriginal) setEditingTxn(txn.processedOriginal)
            else if (txn.rawOriginal) setSelectedUid(txn.uid)
          }}
          className="btn ghost icon sm"
          title={txn.shares.length > 0 ? 'View split' : 'Add split'}
          style={{
            margin: '0 auto',
            opacity: txn.shares.length > 0 ? 1 : 0.3,
            color: txn.shares.length > 0 ? 'var(--accent)' : 'var(--ink-3)',
          }}
          disabled={isDeleted}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            call_split
          </span>
        </button>
      </td>

      {/* Amount */}
      <td
        style={{
          padding: '11px 12px',
          textAlign: 'right',
          fontSize: 13.5,
          fontWeight: 600,
          color:
            txn.txnType === 'income'
              ? 'var(--pos)'
              : txn.txnType === 'refund'
                ? 'var(--pos)'
                : txn.txnType === 'transfer'
                  ? 'var(--ink-3)'
                  : txnIncome
                    ? 'var(--pos)'
                    : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {txn.txnType === 'refund'
          ? '-'
          : txn.txnType === 'income' || (txnIncome && !txn.txnType)
            ? '+'
            : ''}
        {amtDisplay}
      </td>

      {/* Context menu */}
      <td
        data-menu-uid={txn.uid}
        style={{ padding: '0 6px 0 0', textAlign: 'right', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onToggleMenu} className="btn ghost icon sm">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            more_horiz
          </span>
        </button>
        {hasMenu && (
          <TxnContextMenu
            txn={txn}
            onProcess={onProcess}
            onEdit={onEdit}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        )}
      </td>
    </tr>
  )
}
