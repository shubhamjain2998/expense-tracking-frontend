import type { ReactNode } from 'react'

import { useSwipeDown } from '@/hooks/useSwipeDown'

interface TxnSidePanelProps {
  /** Called when the user taps the backdrop OR swipes the sheet down past
   *  the dismiss threshold on mobile. */
  onDismiss: () => void
  children: ReactNode
}

/**
 * Shared wrapper for the Transactions side panel (Process / Edit). Provides:
 * - The .txn-side-panel-backdrop click-to-dismiss
 * - The .txn-side-panel container
 * - Swipe-down-to-dismiss on touch devices (handle-zone-gated)
 */
export function TxnSidePanel({ onDismiss, children }: TxnSidePanelProps) {
  const panelRef = useSwipeDown<HTMLDivElement>(true, onDismiss)

  return (
    <>
      <div className="txn-side-panel-backdrop" onClick={onDismiss} aria-hidden />
      <div className="txn-side-panel" ref={panelRef}>
        {children}
      </div>
    </>
  )
}
