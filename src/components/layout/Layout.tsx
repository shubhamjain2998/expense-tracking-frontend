import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

import { fadeOnly } from '@/lib/motion'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { BottomTabBar } from './BottomTabBar'
import { SideNav } from './SideNav'
import { TopNav } from './TopNav'

function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

export function Layout() {
  const location = useLocation()

  return (
    <div className="app has-bottom-tabs">
      <SideNav />
      <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-transparent">
        <TopNav />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
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
