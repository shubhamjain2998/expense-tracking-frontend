/**
 * Phase 9 regression test for the "two competing scroll contexts" fix.
 *
 * Root cause: `.sidenav` was `position: sticky` inside a CSS grid `.app`.
 * As a grid item with `overflow: visible`, its automatic minimum size
 * resolved to its content's height (per the CSS Sizing spec, the
 * "overflow other than visible -> automatic minimum size is 0" carve-out
 * only applies when the item itself sets `overflow`), which could stretch
 * `.app` — and therefore the *window* — past 100vh on top of `main`'s own
 * `overflow-y: auto`. `.sidenav` is now `position: fixed` with its own
 * `overflow-y: auto`, and `main` is meant to be the only scroll owner.
 *
 * Belt-and-suspenders (Layout.tsx's `useLockWindowScroll`): the app shell
 * hard-disables window-level scroll via an `app-shell-active` class on
 * `<html>`, scoped to while `Layout` is mounted so login/register/404
 * (which render outside `Layout`) are unaffected. This test locks in the
 * mount/unmount lifecycle of that class — a plain CSS assertion can't
 * cover this since it depends on the class actually being toggled.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeContext } from '@/hooks/useThemeContext'

import { Layout } from './Layout'

function renderLayout() {
  localStorage.setItem('access_token', 'test-token')
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<div>page content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Layout window-scroll lock (Phase 9)', () => {
  afterEach(() => {
    localStorage.removeItem('access_token')
    document.documentElement.classList.remove('app-shell-active')
  })

  it('adds app-shell-active to <html> while mounted, and removes it on unmount', async () => {
    const { unmount } = renderLayout()

    await waitFor(() =>
      expect(document.documentElement.classList.contains('app-shell-active')).toBe(true)
    )

    unmount()

    expect(document.documentElement.classList.contains('app-shell-active')).toBe(false)
  })
})
