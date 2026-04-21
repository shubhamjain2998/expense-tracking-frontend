import { Outlet, useLocation } from 'react-router-dom'

import { TopNav } from './TopNav'
import { Footer } from './Footer'

export function Layout() {
  const location = useLocation()
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-8 py-8">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
