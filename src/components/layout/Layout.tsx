import { Outlet, useLocation } from 'react-router-dom'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export function Layout() {
  const location = useLocation()
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1380px] mx-auto pt-6 px-7 pb-14">
            <div key={location.pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <QuickAddFAB />
    </div>
  )
}
