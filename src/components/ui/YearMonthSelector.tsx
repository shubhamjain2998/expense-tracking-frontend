import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { slideByDirection } from '@/lib/motion'

import { usePeriodMode } from '../../hooks/usePeriodMode'
import { formatYearLabel, monthShortLabel } from '../../lib/period'

interface YearMonthSelectorProps {
  year: number
  month: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
}

/**
 * Month is an arrow stepper (`<  May  >`), year/FY is a dropdown next to it.
 *
 * Stepping the month wraps the year at boundaries (Mar→Apr crosses periods).
 * `month` is 1-12 in the active period mode (FY mode → 1=April … 12=March).
 */
export function YearMonthSelector({
  year,
  month,
  onYearChange,
  onMonthChange,
}: YearMonthSelectorProps) {
  const { mode } = usePeriodMode()
  // Last step direction (+1 next / -1 prev) drives the label slide.
  const [direction, setDirection] = useState(0)

  function step(delta: 1 | -1) {
    setDirection(delta)
    const next = month + delta
    if (next < 1) {
      onYearChange(year - 1)
      onMonthChange(12)
    } else if (next > 12) {
      onYearChange(year + 1)
      onMonthChange(1)
    } else {
      onMonthChange(next)
    }
  }

  const yearOptions = [year - 2, year - 1, year, year + 1]

  return (
    <div className="flex items-center gap-2">
      <div className="ym" role="group" aria-label="Select month">
        <button type="button" onClick={() => step(-1)} aria-label="Previous month">
          <Icon name="chevron_left" size={14} />
        </button>
        <div className="label">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.span
              key={`${year}-${month}`}
              custom={direction}
              variants={slideByDirection}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ display: 'inline-block' }}
            >
              {monthShortLabel(month, mode)}
            </motion.span>
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => step(1)} aria-label="Next month">
          <Icon name="chevron_right" size={14} />
        </button>
      </div>
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        aria-label={mode === 'fy' ? 'Select fiscal year' : 'Select year'}
        className="ym-year num"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {formatYearLabel(y, mode)}
          </option>
        ))}
      </select>
    </div>
  )
}
