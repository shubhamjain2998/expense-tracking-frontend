import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToastContext } from '@/hooks/useToastContext'
import {
  clearAllMappings,
  deleteAccount,
  deleteAllBudget,
  deleteAllData,
  deleteAllPersons,
  deleteAllProcessedTransactions,
  deleteAllRawTransactions,
} from '@/lib/api/admin'
import { clearAllQueries, invalidateDomains } from '@/lib/queryKeys'

interface DangerAction {
  icon: string
  title: string
  description: string
  confirmMessage: string
  confirmLabel: string
  mutationFn: () => Promise<void>
  onInvalidate: (qc: ReturnType<typeof useQueryClient>) => void
  // Renders the row with red border + tinted background (same treatment as
  // 'Everything'). Used for irreversible cross-cutting actions.
  emphasis?: 'strong'
}

const dangerActions: Record<string, DangerAction> = {
  raw: {
    icon: 'upload_file',
    title: 'Raw transactions',
    description: 'All unprocessed transactions from uploaded statements.',
    confirmMessage:
      'This will permanently delete all raw (unprocessed) transactions. Any pending review items will be lost.',
    confirmLabel: 'Delete raw transactions',
    mutationFn: deleteAllRawTransactions,
    onInvalidate: (qc) => invalidateDomains(qc, ['transactions']),
  },
  processed: {
    icon: 'receipt_long',
    title: 'Processed transactions',
    description: 'All reviewed and categorised transaction history.',
    confirmMessage:
      'This will permanently delete all processed transactions and their category assignments. Your spending history will be wiped.',
    confirmLabel: 'Delete processed transactions',
    mutationFn: deleteAllProcessedTransactions,
    onInvalidate: (qc) => invalidateDomains(qc, ['transactions', 'dashboard']),
  },
  mappings: {
    icon: 'rule',
    title: 'Category mappings',
    description: 'All saved auto-categorisation rules.',
    confirmMessage:
      'This will permanently delete all category mapping rules. Auto-categorisation will stop working until new rules are created.',
    confirmLabel: 'Delete all mappings',
    mutationFn: clearAllMappings,
    onInvalidate: (qc) => invalidateDomains(qc, ['categoryMappings']),
  },
  budget: {
    icon: 'savings',
    title: 'Budget plans',
    description: 'All budget allocations across all years.',
    confirmMessage:
      'This will permanently delete all budget plans and allocations across every year.',
    confirmLabel: 'Delete all budgets',
    mutationFn: deleteAllBudget,
    // Budget page derives "spent" totals from dashboard summaries, so dashboard
    // must be refreshed alongside the budget cache.
    onInvalidate: (qc) => invalidateDomains(qc, ['budget', 'dashboard']),
  },
  persons: {
    icon: 'group',
    title: 'Persons',
    description: 'All household members and their associations.',
    confirmMessage:
      'This will permanently delete all persons. Split transaction assignments will be removed.',
    confirmLabel: 'Delete all persons',
    mutationFn: deleteAllPersons,
    // Persons appear in transaction shares and the dashboard split ledger;
    // both caches need a refresh when the person list is wiped.
    onInvalidate: (qc) => invalidateDomains(qc, ['persons', 'transactions', 'dashboard']),
  },
  all: {
    icon: 'delete_forever',
    title: 'Everything',
    description: 'Wipe the entire database — transactions, budgets, mappings, and persons.',
    confirmMessage:
      'This will permanently erase ALL data in your workspace: every transaction, budget plan, category mapping, and person. Your entire financial history will be gone. This cannot be recovered.',
    confirmLabel: 'Yes, delete everything',
    mutationFn: deleteAllData,
    // Hard wipe of cache prevents the next page mount from flashing stale
    // rows before the refetch resolves.
    onInvalidate: clearAllQueries,
    emphasis: 'strong',
  },
  account: {
    icon: 'no_accounts',
    title: 'Account',
    description:
      'Delete your account and everything tied to it — categories, transactions, budgets, persons, tags.',
    confirmMessage:
      'This will permanently delete your account AND every piece of data associated with it. You will be signed out immediately and this email can be reused for a fresh registration. This cannot be undone.',
    confirmLabel: 'Yes, delete my account',
    mutationFn: deleteAccount,
    // Cache wipe is handled implicitly by the post-success logout below, but
    // declaring it here keeps the type happy and is a safe no-op on top.
    onInvalidate: clearAllQueries,
    emphasis: 'strong',
  },
}

export function DangerZoneSection() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [pendingDangerKey, setPendingDangerKey] = useState<string | null>(null)

  const dangerMutation = useMutation({
    mutationFn: () => {
      const action = pendingDangerKey ? dangerActions[pendingDangerKey] : null
      if (!action) return Promise.resolve()
      return action.mutationFn()
    },
    onSuccess: () => {
      const key = pendingDangerKey
      const action = key ? dangerActions[key] : null
      // Account deletion: the JWT is now orphaned (user row gone), so any
      // background query would 401. Tear down auth state and bounce to login
      // before that happens.
      if (key === 'account') {
        toast.success('Account deleted')
        setPendingDangerKey(null)
        logout()
        navigate('/login', { replace: true })
        return
      }
      action?.onInvalidate(qc)
      toast.success(`${action?.title ?? 'Data'} deleted`)
      setPendingDangerKey(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setPendingDangerKey(null)
    },
  })

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title" style={{ color: 'var(--neg)' }}>
              Danger zone
            </p>
            <p className="card-sub">Permanently delete data. These actions cannot be undone.</p>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(dangerActions).map(([key, action]) => {
            const strong = action.emphasis === 'strong'
            return (
              <div
                key={key}
                className="flex items-center gap-3"
                style={{
                  border: strong ? '1px solid var(--neg)' : '1px solid var(--line)',
                  background: strong ? 'var(--neg-soft)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                }}
              >
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{
                    fontSize: 16,
                    color: strong ? 'var(--neg)' : 'var(--ink-3)',
                  }}
                >
                  {action.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: strong ? 'var(--neg)' : 'var(--ink)' }}
                  >
                    {action.title}
                  </p>
                  <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                    {action.description}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setPendingDangerKey(key)}>
                  Delete
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {pendingDangerKey && (
        <ConfirmDialog
          isOpen
          title={`Delete ${dangerActions[pendingDangerKey].title.toLowerCase()}`}
          message={dangerActions[pendingDangerKey].confirmMessage}
          confirmLabel={dangerActions[pendingDangerKey].confirmLabel}
          danger
          loading={dangerMutation.isPending}
          onConfirm={() => dangerMutation.mutate()}
          onCancel={() => setPendingDangerKey(null)}
        />
      )}
    </>
  )
}
