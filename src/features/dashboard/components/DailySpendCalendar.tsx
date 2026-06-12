import { formatCompact } from '@/lib/format'

interface DailySpendCalendarProps {
  dailySpend: Map<number, number>
  year: number
  daysInMonth: number
  firstDayOfMonth: number
  totalCells: number
  currentMonthLabel: string
  isCurrentMonth: boolean
  isDark: boolean
}

export function DailySpendCalendar({
  dailySpend,
  year,
  daysInMonth,
  firstDayOfMonth,
  totalCells,
  currentMonthLabel,
  isCurrentMonth,
  isDark,
}: DailySpendCalendarProps) {
  const today = new Date().getDate()
  // Avoid division by zero if the map is empty
  const maxDailySpend = Math.max(...Array.from(dailySpend.values()), 1)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">
            Daily spend · {currentMonthLabel} {year}
          </p>
          <p className="card-sub">Hover to inspect. Intensity shows relative spend.</p>
        </div>
      </div>

      <div>
        {/* Day-of-week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 3,
            marginBottom: 4,
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-4)',
                padding: '2px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — empty cells pad the first row to align with the right weekday */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDayOfMonth + 1
            const isValid = day >= 1 && day <= daysInMonth
            const isToday = isCurrentMonth && day === today
            const spend = isValid ? (dailySpend.get(day) ?? 0) : 0
            // Alpha scales linearly from 0.15 (faint) to 0.85 (saturated) based on relative spend
            const intensity = spend > 0 ? Math.min(spend / maxDailySpend, 1) : 0
            const alpha = 0.15 + intensity * 0.7

            const bgColor = !isValid
              ? 'transparent'
              : spend > 0
                ? isDark
                  ? `oklch(0.72 0.14 255 / ${Math.round(alpha * 100)}%)`
                  : `oklch(0.55 0.14 255 / ${Math.round(alpha * 100)}%)`
                : 'var(--surface-2)'

            // Switch text to light when background is dark enough to ensure contrast
            const textColor = !isValid
              ? 'transparent'
              : intensity > 0.55
                ? 'var(--surface)'
                : 'var(--ink-2)'

            return (
              <div
                key={i}
                className={isValid ? 'cell-pop' : undefined}
                title={
                  isValid && spend > 0
                    ? `${day} ${currentMonthLabel}: ${formatCompact(spend)}`
                    : undefined
                }
                style={
                  {
                    '--d': `${i * 10}ms`,
                    aspectRatio: '1',
                    borderRadius: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    padding: '3px 2px',
                    color: textColor,
                    background: bgColor,
                    outline: isToday ? '1.5px solid var(--ink)' : 'none',
                    outlineOffset: 1,
                  } as React.CSSProperties
                }
              >
                {isValid && (
                  <>
                    <span
                      style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, lineHeight: 1.2 }}
                    >
                      {day}
                    </span>
                    {spend > 0 && (
                      <span
                        className="num"
                        style={{
                          fontSize: 8.5,
                          lineHeight: 1.2,
                          opacity: intensity > 0.55 ? 0.9 : 0.7,
                        }}
                      >
                        {formatCompact(spend)}
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
