import { useEffect, useRef } from 'react'

/**
 * Attach to a bottom-sheet element to enable drag-to-dismiss on touch devices.
 *
 * - The sheet follows the finger while pulled down (translateY).
 * - Released past `threshold` px → fires `onDismiss()`.
 * - Released short of `threshold` → rubberband back to position.
 * - Pointer events that start above 24px from the top of the sheet (the
 *   handle area) are the swipe affordance; touches further inside scroll
 *   the sheet's content normally.
 */
export function useSwipeDown<T extends HTMLElement>(
  enabled: boolean,
  onDismiss: () => void,
  options: { threshold?: number; handleZone?: number } = {}
) {
  const ref = useRef<T | null>(null)
  const { threshold = 80, handleZone = 36 } = options

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return

    let startY = 0
    let currentY = 0
    let dragging = false

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      if (!touch) return
      const rect = el!.getBoundingClientRect()
      // Only initiate swipe-dismiss when starting in the handle zone (top
      // ~handleZone px). Touches inside content scroll normally.
      if (touch.clientY - rect.top > handleZone) return
      startY = touch.clientY
      currentY = startY
      dragging = true
      el!.style.transition = 'none'
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragging) return
      const touch = e.touches[0]
      if (!touch) return
      currentY = touch.clientY
      const delta = Math.max(0, currentY - startY)
      el!.style.transform = `translateY(${delta}px)`
    }
    function onTouchEnd() {
      if (!dragging) return
      dragging = false
      const delta = currentY - startY
      el!.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
      if (delta > threshold) {
        el!.style.transform = `translateY(100%)`
        // Wait for the transition before calling onDismiss so the close
        // looks like one motion rather than a snap.
        window.setTimeout(() => {
          el!.style.transform = ''
          onDismiss()
        }, 200)
      } else {
        el!.style.transform = ''
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, onDismiss, threshold, handleZone])

  return ref
}
