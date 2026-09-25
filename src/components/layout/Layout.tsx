import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

import { fadeOnly } from '@/lib/motion'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { AmbientBackdrop } from './AmbientBackdrop'
import { AppDock } from './AppDock'
import { BottomTabBar } from './BottomTabBar'

function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

/**
 * Phase 9: belt-and-suspenders against a second, phantom window scrollbar.
 * `.app`'s content (the fixed-height sidenav + flex column) measures
 * exactly one viewport (confirmed via `offsetHeight`/`getBoundingClientRect`
 * in every case tested), but `document.documentElement.scrollHeight` was
 * still occasionally observed to exceed `clientHeight` by several hundred
 * px with `main` mounted — a Chrome flex/overflow measurement quirk, not a
 * sizing mistake we could find in this tree. Whatever the cause, the
 * *symptom* is real and user-triggerable: `main` is the only element meant
 * to scroll, but the window itself was still technically scrollable, so a
 * wheel/trackpad gesture over the (then) fixed sidenav, which had nothing of
 * its own to scroll, bubbled to the document and scrolled the *window* —
 * desyncing the fixed sidenav from `.app`'s content and reproducing the
 * exact "dead space below the content" bug this phase set out to fix.
 * Scoped to while the app shell is mounted (not login/register/404, which
 * render outside `Layout` and may legitimately need to scroll the window
 * on a very short/zoomed viewport).
 */
function useLockWindowScroll() {
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('app-shell-active')
    return () => html.classList.remove('app-shell-active')
  }, [])
}

export function Layout() {
  const location = useLocation()
  useLockWindowScroll()

  return (
    <div className="app has-bottom-tabs">
      <AmbientBackdrop />
      {/* overflow-clip, not overflow-hidden: a hidden box can still be scrolled
          by script, and scrollIntoView on anything inside main (the world
          pages' section rail) would shift the dock off the top. */}
      <div className="relative flex h-screen min-w-0 flex-col overflow-clip bg-transparent">
        <AppDock />
        <main className="app-scroll flex-1 overflow-x-hidden overflow-y-auto">
          {/* MASTER.md §4: 1280px max-width, 24px gutter (16px mobile) — see
              .container in components.css. */}
          <div className="container">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                variants={fadeOnly}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <FrozenOutlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <QuickAddFAB />
        <BottomTabBar />
      </div>
    </div>
  )
}
