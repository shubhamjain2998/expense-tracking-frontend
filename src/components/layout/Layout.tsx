import { Outlet } from 'react-router-dom'

import { TopNav } from './TopNav'

export function Layout() {
  return (
    <div className="bg-background min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-screen-2xl px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
