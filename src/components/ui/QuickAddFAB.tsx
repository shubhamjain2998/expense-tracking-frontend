import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import { AddTransactionDialog } from './AddTransactionDialog'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 flex items-center justify-center md:right-6 md:bottom-6"
        aria-label="Quick add transaction"
        title="Quick add transaction (Alt+N)"
        style={{
          height: 48,
          width: 48,
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: '1px solid var(--ink)',
          boxShadow: 'var(--shadow-pop)',
          transition: 'transform .12s ease',
        }}
      >
        <Icon name="add" size={20} />
      </button>

      {open && <AddTransactionDialog onClose={() => setOpen(false)} />}
    </>
  )
}
