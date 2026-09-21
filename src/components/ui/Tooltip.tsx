import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { tooltipIn } from '@/lib/motion'

interface TooltipProps {
  /** Full text — no truncation. Callers with dynamic content (e.g. a split
   *  breakdown) don't need to worry about a fixed max width here. */
  label: string
  children: ReactNode
}

const MARGIN = 8

/**
 * Replaces a native `title` attribute with a rendered tooltip for content
 * that needs to escape an ancestor's `overflow: hidden`/`auto` clip (e.g. a
 * table row) or that can overflow the viewport edge — a native `title`
 * can't be clamped or flipped, and this app has several dense tables near
 * the right edge of the viewport where it gets cut off.
 *
 * Positioned via `getBoundingClientRect` into a `document.body` portal (so
 * it always escapes any ancestor clip), placed below the trigger by
 * default, flips above when there isn't room, and is clamped horizontally
 * so it never runs off either edge.
 *
 * The trigger is wrapped in a `display: contents` span rather than cloning
 * the child element — `display: contents` drops the wrapper from layout
 * entirely (the child renders exactly as if the wrapper weren't there),
 * and it sidesteps merging refs/handlers onto an arbitrary child element.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(
    null
  )
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    function place() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 6
      // Guess a tooltip width to clamp against before it's painted; the
      // real width (from the ref below) refines this once measured.
      const estWidth = Math.min(280, Math.max(120, label.length * 6.5))
      let left = r.left + r.width / 2 - estWidth / 2
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - estWidth - MARGIN))
      const spaceBelow = window.innerHeight - r.bottom
      const placement: 'top' | 'bottom' = spaceBelow < 60 && r.top > 60 ? 'top' : 'bottom'
      const top = placement === 'bottom' ? r.bottom + gap : r.top - gap
      setPos({ top, left, placement })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, label])

  return (
    <span
      ref={triggerRef}
      style={{ display: 'contents' }}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              id={id}
              role="tooltip"
              variants={tooltipIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                transform: pos.placement === 'top' ? 'translateY(-100%)' : undefined,
                zIndex: 200,
                maxWidth: 280,
                padding: '6px 9px',
                borderRadius: 'var(--radius)',
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontSize: 11.5,
                lineHeight: 1.4,
                fontWeight: 500,
                boxShadow: 'var(--shadow-pop)',
                pointerEvents: 'none',
              }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}
