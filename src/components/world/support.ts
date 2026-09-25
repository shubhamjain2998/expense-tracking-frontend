import { useEffect, useState } from 'react'

/** Narrower than this, the panels and the stage can't sit side by side; Home stays flat. */
const MIN_WIDTH_QUERY = '(min-width: 1200px)'

let webglSupport: boolean | null = null

/** Whether this browser can create a WebGL context at all. Probed once per page load. */
export function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    webglSupport = false
  }
  return webglSupport
}

/**
 * True when Home can render as the 3D world: WebGL exists and the viewport
 * is wide enough. Tracks the viewport live, so resizing the window switches
 * between the world and the flat page.
 */
export function useWorldSupported(): boolean {
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
