import { useState, useCallback } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'kosh-theme'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  /** Toggle the theme. When `origin` (viewport coords of the trigger) is
   *  given and the View Transitions API is available, the new theme sweeps
   *  out from that point as an expanding circle; otherwise it swaps as before. */
  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const apply = () => {
      setTheme((prev) => {
        const next: Theme = prev === 'light' ? 'dark' : 'light'
        applyTheme(next)
        localStorage.setItem(STORAGE_KEY, next)
        return next
      })
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduceMotion || !origin) {
      apply()
      return
    }

    // The body's background/color CSS transition would smear inside the
    // snapshot — suspend it for the duration of the reveal.
    document.documentElement.classList.add('theme-switching')
    const transition = document.startViewTransition(() => flushSync(apply))
    transition.ready
      .then(() => {
        const radius = Math.hypot(
          Math.max(origin.x, window.innerWidth - origin.x),
          Math.max(origin.y, window.innerHeight - origin.y)
        )
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 480,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        )
      })
      .catch(() => {})
    transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-switching')
    })
  }, [])

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
