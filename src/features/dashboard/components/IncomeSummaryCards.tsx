import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

interface IncomeSummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  incomeByCategory: { category: string; total: number }[]
  isLoading: boolean
}

export function IncomeSummaryCards({
  totalIncome,
  totalExpenses,
  incomeByCategory,
  isLoading,
}: IncomeSummaryCardsProps) {
  const savings = totalIncome - totalExpenses
  const savingsPositive = savings > 0
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  const expensePct = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0

  return (
    <section className="kpi-strip" style={{ '--kpi-cols': 3 } as React.CSSProperties}>
      {/* Income */}
      <div className="kpi">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="kpi-label flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-[var(--pos)]" />
              Income
            </div>
            <div className="kpi-value num">{formatCurrency(totalIncome)}</div>
            {incomeByCategory.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {incomeByCategory.slice(0, 3).map(({ category, total }) => (
                  <span
                    key={category}
                    className="flex items-center gap-1 text-[11px] text-[var(--ink-3)]"
                  >
                    <span className="inline-block size-1.5 shrink-0 rounded-[1px] bg-[var(--ink-4)]" />
                    {category} {formatCompact(total)}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Expenses */}
      <div className="kpi">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="kpi-label flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-[var(--neg)]" />
              Expenses
            </div>
            <div className="kpi-value num">{formatCurrency(totalExpenses)}</div>
            {totalIncome > 0 && <div className="kpi-delta">{expensePct}% of income spent</div>}
          </>
        )}
      </div>

      {/* Savings — highlighted with a soft tint */}
      <div
        className="kpi"
        style={{
          background: savingsPositive
            ? 'color-mix(in oklab, var(--pos) 12%, transparent)'
            : savings < 0
              ? 'color-mix(in oklab, var(--neg) 10%, transparent)'
              : undefined,
        }}
      >
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="kpi-label flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-[2px]"
                style={{
                  background: savingsPositive
                    ? 'var(--pos)'
                    : savings < 0
                      ? 'var(--neg)'
                      : 'var(--ink-4)',
                }}
              />
              Savings
            </div>
            <div
              className="kpi-value num"
              style={{
                color: savingsPositive ? 'var(--pos)' : savings < 0 ? 'var(--neg)' : 'var(--ink-4)',
              }}
            >
              {savings > 0 ? '+' : ''}
              {formatCurrency(savings)}
            </div>
            {totalIncome > 0 && (
              <div className="kpi-delta">
                Savings rate {Math.abs(Math.round(savingsRate))}%
                {savings < 0 && <span className="ml-1 text-[var(--neg)]">deficit</span>}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
