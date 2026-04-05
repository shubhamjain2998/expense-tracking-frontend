const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface YearMonthSelectorProps {
  year: number
  month: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
}

export function YearMonthSelector({
  year,
  month,
  onYearChange,
  onMonthChange,
}: YearMonthSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-surface-container-high flex items-center gap-1 rounded-xl px-3 py-2">
        <span className="material-symbols-outlined text-primary text-sm">event</span>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-on-surface border-none bg-transparent p-0 text-sm font-medium focus:ring-0"
          aria-label="Select year"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-surface-container-high flex items-center rounded-xl px-3 py-2">
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="text-on-surface border-none bg-transparent p-0 text-sm font-medium focus:ring-0"
          aria-label="Select month"
        >
          {MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
