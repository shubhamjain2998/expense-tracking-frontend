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
