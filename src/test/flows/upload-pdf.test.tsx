import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'

import { UploadPage } from '@/pages/UploadPage'

import { renderWithProviders } from '../renderWithProviders'

function UploadRoutes() {
  return (
    <Routes>
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/transactions" element={<h1>Transactions</h1>} />
    </Routes>
  )
}

describe('PDF upload flow', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('switches to paste-text tab, parses text, and imports', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UploadRoutes />, { initialEntries: ['/upload'] })

    await screen.findByRole('heading', { name: /import transactions/i })

    // Switch to the "Paste text" tab
    await user.click(screen.getByRole('button', { name: /paste text/i }))

    // Textarea appears
    const textarea = screen.getByLabelText('Paste bank statement text')
    await user.type(textarea, '2026-05-01\tCoffee Shop\t-50.00')

    // Parse & preview
    await user.click(screen.getByRole('button', { name: /parse/i }))

    // Preview row from handler fixture
    expect(await screen.findByText('Coffee Shop')).toBeInTheDocument()

    // Import
    await user.click(screen.getByRole('button', { name: /import/i }))

    // Success toast
    expect(await screen.findByText(/1 transactions imported/i)).toBeInTheDocument()
  })

  it('uploads a PDF, preview rows appear, import shows success toast', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UploadRoutes />, { initialEntries: ['/upload'] })

    expect(await screen.findByRole('heading', { name: /import transactions/i })).toBeInTheDocument()

    const fileInput = screen.getByLabelText('Choose PDF files')
    const file = new File(['%PDF dummy'], 'statement.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, file)

    // Preview row description from makePreviewResponse fixture
    expect(await screen.findByText('Coffee Shop')).toBeInTheDocument()

    // Import button appears once preview is ready
    const importBtn = await screen.findByRole('button', { name: /import/i })
    await user.click(importBtn)

    // Success toast: "1 transactions imported, 0 skipped"
    expect(await screen.findByText(/1 transactions imported/i)).toBeInTheDocument()
  })
})
