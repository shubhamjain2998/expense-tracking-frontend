import { Outlet, useLocation } from 'react-router-dom'

import { QuickAddFAB } from '../ui/QuickAddFAB'

import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export function Layout() {
  const location = useLocation()
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <TopNav />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: 1380, margin: '0 auto', padding: '24px 28px 56px' }}>
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
