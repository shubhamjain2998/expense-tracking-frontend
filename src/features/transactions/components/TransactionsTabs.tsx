type TxnTab = 'transactions' | 'mappings' | 'ignore-rules'

interface TransactionsTabsProps {
  active: TxnTab
  onChange: (tab: TxnTab) => void
}

const TABS: { id: TxnTab; label: string }[] = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'mappings', label: 'Mappings' },
  { id: 'ignore-rules', label: 'Ignore rules' },
]

export function TransactionsTabs({ active, onChange }: TransactionsTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--line)',
        marginBottom: 16,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? 'var(--accent)' : 'var(--ink-3)',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              outline: 'none',
              cursor: 'pointer',
              transition: 'color 0.12s ease',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export type { TxnTab }
