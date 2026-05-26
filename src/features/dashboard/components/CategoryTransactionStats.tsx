import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact } from '@/lib/format'

import { PIE_COLORS } from '../lib/chartTheme'
import type { CategoryStat } from '../types'

interface CategoryTransactionStatsProps {
  categoryStats: CategoryStat[]
  isLoading: boolean
}

export function CategoryTransactionStats({
  categoryStats,
  isLoading,
}: CategoryTransactionStatsProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="section-head">
        <div>
          <div className="title">Transactions by category</div>
          <div className="sub">Count and avg ticket, this month</div>
        </div>
      </div>

      <section className="card flex-1">
        {isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : categoryStats.length === 0 ? (
          <EmptyState icon="receipt" title="No transactions" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(() => {
              const maxTotal = Math.max(...categoryStats.map((s) => s.total), 1)
              return categoryStats.map((stat, i) => {
                const barPct = (stat.total / maxTotal) * 100
                return (
                  <div
                    key={stat.category}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: 100,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {stat.category}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        background: 'var(--surface-3)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barPct}%`,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span
                      className="num"
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink-3)',
                        minWidth: 24,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {stat.count}×
                    </span>
                    <span
                      className="num"
                      style={{
                        fontSize: 11.5,
                        color: 'var(--ink-3)',
                        minWidth: 72,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      avg {formatCompact(stat.avg)}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </section>
    </div>
  )
}
