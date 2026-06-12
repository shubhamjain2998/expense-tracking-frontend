import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

import { fadeOnly } from '@/lib/motion'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { BottomTabBar } from './BottomTabBar'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

/* Freezes the outlet element at mount so the exiting route keeps rendering
   its own page while AnimatePresence fades it out (otherwise router context
   updates would flash the new page inside the old wrapper). */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

export function Layout() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Close the drawer on every route change so navigating from inside it
  // doesn't leave the overlay sitting on top of the new page. NavLink onClick
  // already handles in-drawer clicks; this catches browser back/forward too.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false)
  }, [location.pathname])

  // Body scroll lock while the drawer is open — prevents the page behind
  // from scrolling under the user's finger on iOS Safari.
  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  return (
    <div className="has-bottom-tabs flex h-screen overflow-hidden bg-[var(--bg)]">
      {mobileNavOpen && (
        <div className="app-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden />
      )}
      <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav onOpenNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-[1380px] px-4 pt-5 pb-14 md:px-7 md:pt-6">
            {/* Opacity-only (no transform): a transform here would become the
                containing block for fixed-position panels inside routes. */}
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
      </div>
      <QuickAddFAB />
      <BottomTabBar onOpenMore={() => setMobileNavOpen(true)} />
    </div>
  )
}
