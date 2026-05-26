import { Icon, type IconName } from '@/components/ui/Icon'

import type { UnifiedTxn } from '../types'

interface TxnContextMenuProps {
  txn: UnifiedTxn
  onProcess: () => void
  onEdit: () => void
  onDelete: () => void
  onRestore: () => void
}

const menuItemBase: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  gap: 8,
  padding: '7px 12px',
  fontSize: 12.5,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
}

function MenuItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon: IconName
  label: string
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...menuItemBase, color: color ?? 'var(--ink)' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  )
}

export function TxnContextMenu({
  txn,
  onProcess,
  onEdit,
  onDelete,
  onRestore,
}: TxnContextMenuProps) {
  const isDeleted = txn.kind === 'deleted'

  return (
    <div
      style={{
        position: 'absolute',
        right: 6,
        top: '100%',
        zIndex: 30,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-pop)',
        minWidth: 140,
        padding: '4px 0',
      }}
    >
      {txn.kind === 'pending' && txn.rawOriginal && (
        <MenuItem icon="receipt_long" label="Process" onClick={onProcess} />
      )}
      {txn.kind === 'processed' && txn.processedOriginal && (
        <MenuItem icon="edit" label="Edit" onClick={onEdit} />
      )}
      {isDeleted ? (
        <MenuItem icon="undo" label="Restore" color="var(--accent)" onClick={onRestore} />
      ) : (
        <MenuItem icon="delete" label="Delete" color="var(--neg)" onClick={onDelete} />
      )}
    </div>
  )
}
