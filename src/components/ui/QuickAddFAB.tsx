import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import { AddTransactionDialog } from './AddTransactionDialog'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fab"
        aria-label="Quick add transaction"
        title="Quick add transaction (Alt+N)"
      >
        <Icon name="add" size={20} />
      </button>

      {open && <AddTransactionDialog onClose={() => setOpen(false)} />}
    </>
  )
}
