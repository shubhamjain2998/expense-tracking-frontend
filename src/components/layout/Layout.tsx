import { Outlet, useLocation } from 'react-router-dom'

import { TopNav } from './TopNav'

export function Layout() {
  const location = useLocation()
  return (
    <div className="bg-background min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-screen-2xl px-8 py-8">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
