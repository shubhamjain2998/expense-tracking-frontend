import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { IS_DEV } from '@/lib/config'

import { AddTransactionDialog } from './AddTransactionDialog'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fab"
        // In dev the React Query devtools button sits at the bottom-right corner,
        // so we add extra clearance. In prod the devtools are stripped, so 16px
        // (the default from .fab) is fine.
        style={IS_DEV ? { bottom: 80 } : undefined}
        aria-label="Quick add transaction"
        title="Quick add transaction (Alt+N)"
      >
        <Icon name="add" size={20} />
      </button>

      {open && <AddTransactionDialog onClose={() => setOpen(false)} />}
    </>
  )
}
