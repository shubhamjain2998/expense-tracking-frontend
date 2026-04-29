interface BulkActionsBarProps {
  count: number
  onDelete: () => void
  onClear: () => void
}

export function BulkActionsBar({ count, onDelete, onClear }: BulkActionsBarProps) {
  return (
    <div
      className="animate-fade-down"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        marginTop: 12,
        background: 'var(--accent-soft)',
        border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
        borderRadius: 'var(--radius)',
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', flex: 1 }}>
        {count} selected
      </span>
      <button
        onClick={onDelete}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: 'var(--radius)',
          background: 'var(--neg)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Delete {count}
      </button>
      <button
        onClick={onClear}
        style={{
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 'var(--radius)',
          background: 'none',
          color: 'var(--ink-3)',
          border: '1px solid var(--line)',
          cursor: 'pointer',
        }}
      >
        Clear
      </button>
    </div>
  )
}
