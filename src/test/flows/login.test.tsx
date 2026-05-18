import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'

import { LoginPage } from '@/pages/LoginPage'

import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

function LoginRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
    </Routes>
  )
}

describe('Login flow', () => {
  it('renders login page when no token', async () => {
    renderWithProviders(<LoginRoutes />, { initialEntries: ['/login'] })
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })

  it('successful login navigates to /dashboard', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginRoutes />, { initialEntries: ['/login'] })

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('bad credentials show an error message', async () => {
    server.use(
      http.post('http://localhost:8000/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginRoutes />, { initialEntries: ['/login'] })

    await user.type(screen.getByPlaceholderText('you@example.com'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
  })
})
