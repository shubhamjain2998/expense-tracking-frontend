import { useEffect, useState } from 'react'

import { hasWebGL } from '@/components/world/support'

/** Narrower than this the form stands alone; the hero would only push it down. */
const MIN_WIDTH_QUERY = '(min-width: 900px)'

/**
 * True when the signed-out pages can show their 3D hero: WebGL exists and
 * the viewport is wide enough to sit it beside the form. Tracks the viewport
 * live. Below the width the hero isn't mounted at all, so three.js is never
 * fetched on phones.
 */
export function useHeroSupported(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(MIN_WIDTH_QUERY).matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.(MIN_WIDTH_QUERY)
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide && hasWebGL()
}
