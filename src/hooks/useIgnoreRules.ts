import { useEffect, useState } from 'react'

import { getIgnoreRules, IGNORE_RULES_EVENT } from '../lib/ignoreRules'

/**
 * Subscribes to the ignore-rules localStorage list and re-renders when it
 * changes — either from the same tab (custom event) or another tab (storage
 * event).
 */
export function useIgnoreRules(): string[] {
  const [rules, setRules] = useState<string[]>(() => getIgnoreRules())

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail
      if (Array.isArray(detail)) setRules(detail)
      else setRules(getIgnoreRules())
    }
    function onStorage(e: StorageEvent) {
      if (e.key === 'ignore_rules') setRules(getIgnoreRules())
    }
    window.addEventListener(IGNORE_RULES_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(IGNORE_RULES_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return rules
}
