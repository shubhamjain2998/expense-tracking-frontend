import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { UploadPage } from '@/pages/UploadPage'

import { renderWithProviders } from '../renderWithProviders'

// Stub out the upload API module so FormData/File serialization in jsdom does
// not hang the XHR request (a known jsdom + axios limitation). MSW handlers
// already cover the network contract in other integration tests; these flow
// tests focus on component behaviour.
vi.mock('@/lib/api/uploads', () => ({
  PDF_PASSWORD_REQUIRED: 'pdf_password_required',
  PDF_PASSWORD_INCORRECT: 'pdf_password_incorrect',
  previewStatement: vi.fn().mockResolvedValue({
    rows: [{ txn_date: '2026-05-01', description: 'Coffee Shop', amount: '-50.00' }],
    would_insert: 1,
    skipped: 0,
    skipped_rows: [],
  }),
  importStatement: vi.fn().mockResolvedValue({
    inserted: 1,
    skipped: 0,
    skipped_rows: [],
    rows: [
      {
        id: 'test-1',
        txn_date: '2026-05-01',
        description: 'Coffee Shop',
        amount: '-50.00',
        status: 'pending',
      },
    ],
    warnings: [],
  }),
  importJsonRows: vi.fn().mockResolvedValue({
    inserted: 1,
    skipped: 0,
    skipped_rows: [],
    rows: [
      {
        id: 'test-1',
        txn_date: '2026-05-01',
        description: 'Coffee Shop',
        amount: '-50.00',
        status: 'pending',
      },
    ],
    warnings: [],
  }),
}))

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
    vi.clearAllMocks()
  })

  it('switches to bulk-paste tab, validates JSON, and imports', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UploadRoutes />, { initialEntries: ['/upload'] })

    await screen.findByRole('heading', { name: /import transactions/i })

    // Switch to the "Bulk paste" tab
    await user.click(screen.getByRole('button', { name: /bulk paste/i }))

    // Paste an LLM-shaped JSON payload into the textarea — pasting (not
    // typing key-by-key) keeps the parse memo from running for every keystroke.
    const textarea = screen.getByLabelText(/llm json output/i)
    const payload = JSON.stringify({
      schema_version: 1,
      rows: [{ txn_date: '2026-05-01', description: 'Coffee Shop', amount: -50 }],
    })
    await user.click(textarea)
    await user.paste(payload)

    // Preview row renders once validation + dedupe pipeline settles
    expect(await screen.findByText('Coffee Shop')).toBeInTheDocument()

    // Import
    await user.click(await screen.findByRole('button', { name: /import 1 transactions/i }))

    // Success toast — matches the PDF flow's wording, "N transactions imported, 0 skipped"
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
