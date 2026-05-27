interface BulkActionsBarProps {
  count: number
  pendingCount: number
  onAutoCategorise: () => void
  autoCategoriseLoading: boolean
  onDelete: () => void
  onClear: () => void
}

export function BulkActionsBar({
  count,
  pendingCount,
  onAutoCategorise,
  autoCategoriseLoading,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
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
      {pendingCount > 0 && (
        <button
          onClick={onAutoCategorise}
          disabled={autoCategoriseLoading}
          title="Run auto-categorise on the pending rows in your selection"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            cursor: autoCategoriseLoading ? 'wait' : 'pointer',
            opacity: autoCategoriseLoading ? 0.7 : 1,
          }}
        >
          {autoCategoriseLoading ? 'Categorising…' : `Auto-categorise ${pendingCount}`}
        </button>
      )}
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
