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

  const eyebrow = (color: string, label: string) => (
    <p
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        marginBottom: 10,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </p>
  )

  const dotColor = savingsPositive ? 'var(--pos)' : savings < 0 ? 'var(--neg)' : 'var(--ink-4)'

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {/* Income */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)' }}>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow('var(--pos)', 'Income')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(totalIncome)}
              </p>
              {incomeByCategory.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
                  {incomeByCategory.slice(0, 3).map(({ category, total }) => (
                    <span
                      key={category}
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 1,
                          background: 'var(--ink-4)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {category} {formatCompact(total)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Expenses */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)' }}>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow('var(--neg)', 'Expenses')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(totalExpenses)}
              </p>
              {totalIncome > 0 && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {expensePct}% of income spent
                </p>
              )}
            </>
          )}
        </div>

        {/* Savings — highlighted: green tint when positive, red tint when in deficit */}
        <div
          style={{
            padding: '20px 24px',
            background: savingsPositive
              ? 'color-mix(in oklab, var(--pos) 15%, transparent)'
              : savings < 0
                ? 'color-mix(in oklab, var(--neg) 10%, transparent)'
                : undefined,
          }}
        >
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow(dotColor, 'Savings')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: dotColor,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {savings > 0 ? '+' : ''}
                {formatCurrency(savings)}
              </p>
              {totalIncome > 0 && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  Savings rate {Math.abs(Math.round(savingsRate))}%
                  {savings < 0 && (
                    <span style={{ color: 'var(--neg)', marginLeft: 4 }}>deficit</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
