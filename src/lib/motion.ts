import type { Transition, Variants } from 'motion/react'

/* ─── Shared motion vocabulary ──────────────────────────────────────────────
   Mirrors the CSS vars in tokens.css (--dur-*, --ease-*). Use these instead
   of ad-hoc transition objects so every surface moves with the same accent. */

export const DUR = {
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
} as const

/** Soft decelerating ease — the default for entrances. */
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const

/** Snappy spring for small UI (menus, FAB, toasts, chips). */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.8,
}

/** Gentle spring for larger surfaces (dialogs, panels, cards). */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
}

/* ─── Variants ─────────────────────────────────────────────────────────── */

/** Single element: fade in while rising 8px. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT_SOFT },
  },
}

/** Parent wrapper that staggers `fadeUp` children. */
export const staggerContainer = (stagger = 0.055, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

/** Dialog / popover entrance. Pair with `springGentle`. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DUR.fast } },
}

/** Opacity-only entrance — for route wrappers and anything containing
    fixed-positioned descendants (transform would re-parent them). */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } },
}

/** Directional slide for period steppers (month label, hero amount).
    `custom` is +1 (next) or -1 (prev). */
export const slideByDirection: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 14 }),
  center: { opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE_OUT_SOFT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -14, transition: { duration: DUR.fast } }),
}

/** whileInView defaults — reveal once, slightly before fully visible. */
export const viewportOnce = { once: true, margin: '0px 0px -64px 0px' } as const
