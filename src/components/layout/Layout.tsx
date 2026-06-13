import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

import { fadeOnly } from '@/lib/motion'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { BottomTabBar } from './BottomTabBar'
import { TopNav } from './TopNav'

function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

export function Layout() {
  const location = useLocation()

  return (
    <div className="has-bottom-tabs flex h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <TopNav />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto max-w-[1380px] px-4 pt-5 pb-14 md:px-7 md:pt-6">
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
  )
}
