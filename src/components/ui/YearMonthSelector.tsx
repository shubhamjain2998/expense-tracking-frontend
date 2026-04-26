import { usePeriodMode } from '../../hooks/usePeriodMode'
import { formatYearLabel, monthLongLabel } from '../../lib/period'

interface YearMonthSelectorProps {
  year: number
  month: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
}

const selectStyle: React.CSSProperties = {
  height: 30,
  padding: '0 26px 0 10px',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 12.5,
  fontFamily: 'inherit',
  fontWeight: 500,
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage:
    'linear-gradient(45deg, transparent 50%, var(--ink-3) 50%), linear-gradient(135deg, var(--ink-3) 50%, transparent 50%)',
  backgroundPosition: 'calc(100% - 12px) calc(50% - 1px), calc(100% - 8px) calc(50% - 1px)',
  backgroundSize: '4px 4px, 4px 4px',
  backgroundRepeat: 'no-repeat',
}

export function YearMonthSelector({
  year,
  month,
  onYearChange,
  onMonthChange,
}: YearMonthSelectorProps) {
  const { mode } = usePeriodMode()

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
        aria-label="Select month"
        style={selectStyle}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {monthLongLabel(m, mode)}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        aria-label="Select year"
        style={selectStyle}
        className="num"
      >
        {[year - 2, year - 1, year, year + 1].map((y) => (
          <option key={y} value={y}>
            {formatYearLabel(y, mode)}
          </option>
        ))}
      </select>
    </div>
  )
}
