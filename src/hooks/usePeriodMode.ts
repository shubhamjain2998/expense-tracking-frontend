import { useCallback, useEffect, useState } from 'react'

import {
  DEFAULT_PERIOD_MODE,
  PERIOD_MODE_STORAGE_KEY,
  type PeriodMode,
  loadPeriodMode,
  savePeriodMode,
} from '../lib/period'

const PERIOD_MODE_EVENT = 'period-mode:change'

export function usePeriodMode(): {
  mode: PeriodMode
  setMode: (next: PeriodMode) => void
} {
  const [mode, setModeState] = useState<PeriodMode>(() => loadPeriodMode())

  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent<PeriodMode>).detail
      if (detail === 'calendar' || detail === 'fy') setModeState(detail)
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== PERIOD_MODE_STORAGE_KEY) return
      setModeState(
        e.newValue === 'calendar' || e.newValue === 'fy' ? e.newValue : DEFAULT_PERIOD_MODE
      )
    }
    window.addEventListener(PERIOD_MODE_EVENT, handle)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(PERIOD_MODE_EVENT, handle)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setMode = useCallback((next: PeriodMode) => {
    savePeriodMode(next)
    setModeState(next)
    window.dispatchEvent(new CustomEvent<PeriodMode>(PERIOD_MODE_EVENT, { detail: next }))
  }, [])

  return { mode, setMode }
}
