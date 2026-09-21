import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import { RegisterPage } from '@/pages/RegisterPage'

import { renderWithProviders } from '../renderWithProviders'

function RegisterRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
    </Routes>
  )
}

describe('Register flow', () => {
  it('renders register page', async () => {
    renderWithProviders(<RegisterRoutes />, { initialEntries: ['/register'] })
    expect(await screen.findByRole('heading', { name: /create account/i })).toBeInTheDocument()
  })

  // Regression test for the Phase 8c second-pass a11y sweep: Email/Password/
  // Confirm password had no programmatic label association
  // (jsx-a11y/label-has-associated-control).
  it('email, password and confirm inputs are reachable by their accessible label', async () => {
    renderWithProviders(<RegisterRoutes />, { initialEntries: ['/register'] })

    expect(await screen.findByLabelText('Email')).toBe(
      screen.getByPlaceholderText('you@example.com')
    )
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('mismatched passwords show "Passwords do not match"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterRoutes />, { initialEntries: ['/register'] })

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@test.com')
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'different456')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('successful register navigates to /dashboard', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterRoutes />, { initialEntries: ['/register'] })

    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@test.com')
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    await user.type(passwordInputs[0], 'secret123')
    await user.type(passwordInputs[1], 'secret123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})
