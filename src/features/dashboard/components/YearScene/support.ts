import { useEffect, useState } from 'react'

/** Narrower than this, the grid's labels crowd out the boxes; stay on the line chart. */
const MIN_WIDTH_QUERY = '(min-width: 640px)'

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
 * True when the 3D year view can be offered: WebGL exists and the viewport
 * is wide enough. Tracks the viewport live, so rotating a tablet or resizing
 * the window adds or removes the option.
 */
export function useCanShow3D(): boolean {
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
