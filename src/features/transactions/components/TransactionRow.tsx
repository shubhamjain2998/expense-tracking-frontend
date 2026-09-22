import { Icon } from '@/components/ui/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatShortDate } from '@/lib/format'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { categoryColor } from '../lib/categoryColor'
import { formatAmount, isCreditAmount, splitInfo } from '../lib/txnFormat'
import type { UnifiedTxn } from '../types'

import { TxnContextMenu } from './TxnContextMenu'

interface TransactionRowProps {
  txn: UnifiedTxn
  isSelected: boolean
  isDragging: boolean
  hasMenu: boolean
  isChecked: boolean
  onProcess: () => void
  onEdit: () => void
  onUnprocess: () => void
  onDelete: () => void
  onRestore: () => void
  onToggleCheck: () => void
  onToggleMenu: () => void
  onRowClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  setSelectedUid: (uid: string | null) => void
  setEditingTxn: (txn: ProcessedTransactionItem | null) => void
}

export function TransactionRow({
  txn,
  isSelected,
  isDragging,
  hasMenu,
  isChecked,
  onProcess,
  onEdit,
  onUnprocess,
  onDelete,
  onRestore,
  onToggleCheck,
  onToggleMenu,
  onRowClick,
  onDragStart,
  onDragEnd,
  setSelectedUid,
  setEditingTxn,
}: TransactionRowProps) {
  const isDeleted = txn.kind === 'deleted'
  const catColor = txn.categoryId ? categoryColor(txn.categoryId) : 'var(--warn)'
  const { display: amtDisplay } = formatAmount(txn.effectiveAmount, txn.txnType)
  // For pending rows the backend hasn't classified yet, so we can only show a
  // sign-based hint — flagged as a *credit* (money in), never as confirmed
  // income, since classify_txn_type would map this to refund or transfer.
  const isPendingCredit = txn.kind === 'pending' && isCreditAmount(txn.effectiveAmount)
  const split = splitInfo(txn)

  return (
    <tr
      draggable={!isDeleted}
      onDragStart={(e) => {
        const tr = e.currentTarget
        const rect = tr.getBoundingClientRect()
        e.dataTransfer.setDragImage(tr, e.clientX - rect.left, e.clientY - rect.top)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(e)
      }}
      onDragEnd={onDragEnd}
      onClick={onRowClick}
      className={isSelected ? 'row sel' : 'row'}
      style={{
        opacity: isDragging || isDeleted ? 0.4 : 1,
        cursor: isDeleted ? 'default' : 'pointer',
      }}
    >
      {/* Checkbox — always visible so the column is stable and bulk selection
          is a first-class gesture (no hover-discovery needed). */}
      <td
        className="txn-col-check hit44-after txn-check-cell"
        style={{ padding: '0 0 0 10px' }}
        onClick={(e) => {
          e.stopPropagation()
          if (!isDeleted) onToggleCheck()
        }}
      >
        {!isDeleted && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
        )}
      </td>

      {/* Drag handle — gives users a clear grab point; <tr> above is the real
          drag source so the whole row drags. pointerEvents:none on the SVG
          prevents Chrome from treating it as an image drag source. */}
      <td
        className="txn-col-drag"
        style={{ padding: '0 0 0 6px', cursor: isDeleted ? 'default' : 'grab' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon
          name="drag_indicator"
          size={16}
          style={{ color: 'var(--ink-4)', pointerEvents: 'none' }}
        />
      </td>

      {/* Date */}
      <td
        className="num"
        style={{
          padding: '11px 12px',
          fontSize: 12.5,
          color: 'var(--ink-3)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatShortDate(txn.txn_date)}
      </td>

      {/* Merchant. Both lines truncate with an ellipsis at typical column
          widths (measured ~720px of text in ~191px of column) with no other
          way to read the full value — `title` surfaces it on hover/focus. */}
      <td style={{ padding: '11px 12px', minWidth: 0 }}>
        <span
          title={txn.description}
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
            title={txn.notes}
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
      <td className="hide-sm" style={{ padding: '11px 12px' }}>
        {txn.kind === 'pending' ? (
          <span
            className="tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: isPendingCredit ? 'var(--pos-soft)' : 'var(--warn-soft)',
              fontSize: 12,
              fontWeight: 500,
              color: isPendingCredit ? 'var(--pos)' : 'var(--warn)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isPendingCredit ? 'var(--pos)' : 'var(--warn)',
                flexShrink: 0,
              }}
            />
            {isPendingCredit ? (
              <span
                title="Could be a refund, income, or transfer — open to classify"
                style={{ cursor: 'pointer' }}
              >
                Credit — review
              </span>
            ) : (
              'pending'
            )}
          </span>
        ) : isDeleted ? (
          <span
            className="tag"
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
            className="tag"
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
      <td className="txn-col-tags hide-sm" style={{ padding: '11px 12px' }}>
        {txn.tags.length > 0 ? (
          <div className="tagset">
            {txn.tags.map((tag) => (
              <span key={tag.id} className="tag">
                {tag.name}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>—</span>
        )}
      </td>

      {/* Split — overlapping avatars (mock's "With" column) when the
          transaction is split, otherwise a faint add-split affordance. */}
      <td
        className="txn-col-split hide-sm"
        style={{ padding: '11px 12px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip
          label={split ? `Split ${split.peopleCount} ways — ${split.breakdown}` : 'Add split'}
        >
          <button
            onClick={() => {
              if (txn.processedOriginal) setEditingTxn(txn.processedOriginal)
              else if (txn.rawOriginal) setSelectedUid(txn.uid)
            }}
            className="btn ghost icon sm"
            aria-label={
              split ? `Split ${split.peopleCount} ways — ${split.breakdown}` : 'Add split'
            }
            style={{
              margin: '0 auto',
              opacity: split ? 1 : 0.3,
              color: split ? 'var(--accent)' : 'var(--ink-3)',
            }}
            disabled={isDeleted}
          >
            {split ? (
              <span className="people">
                <span className="avatar">Y</span>
                {txn.shares.slice(0, 2).map((s, i) => (
                  <span key={i} className="avatar">
                    {s.person_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                ))}
              </span>
            ) : (
              <Icon name="call_split" size={14} />
            )}
          </button>
        </Tooltip>
      </td>

      {/* Amount — color and sign derive from txn_type (single source of truth).
          For pending rows that haven't been classified yet, fall back to a
          credit indicator based on sign, but never assert "income". */}
      <td
        className="num"
        style={{
          padding: '11px 12px',
          textAlign: 'right',
          fontSize: 13.5,
          fontWeight: 600,
          color:
            txn.txnType === 'income' || txn.txnType === 'refund'
              ? 'var(--pos)'
              : txn.txnType === 'transfer'
                ? 'var(--ink-3)'
                : isPendingCredit
                  ? 'var(--pos)'
                  : 'var(--ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {txn.txnType === 'income' || (isPendingCredit && !txn.txnType)
          ? '+'
          : txn.txnType === 'refund'
            ? '-'
            : ''}
        {amtDisplay}
        {/* Split rows show only the user's share above — the full bill goes
            underneath so it can be quoted to the people they split with. */}
        {split && (
          <Tooltip label={split.breakdown}>
            <div
              tabIndex={0}
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: 'var(--ink-3)',
                marginTop: 1,
              }}
            >
              of {split.totalDisplay}
            </div>
          </Tooltip>
        )}
      </td>

      {/* Context menu (or direct Restore button on deleted rows — the menu
          is overkill for a single action and gets clipped by the narrow
          last-column width). */}
      <td
        data-menu-uid={txn.uid}
        style={{ padding: '0 6px 0 0', textAlign: 'right', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isDeleted ? (
          <button
            onClick={onRestore}
            className="btn ghost icon sm"
            title="Restore"
            aria-label="Restore"
            style={{ color: 'var(--accent)' }}
          >
            <Icon name="undo" size={14} />
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMenu}
              className="btn ghost icon sm"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={hasMenu}
            >
              <Icon name="more_horiz" size={14} />
            </button>
            {hasMenu && (
              <TxnContextMenu
                txn={txn}
                onProcess={onProcess}
                onEdit={onEdit}
                onUnprocess={onUnprocess}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            )}
          </>
        )}
      </td>
    </tr>
  )
}
