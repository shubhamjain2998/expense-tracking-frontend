import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { MappingsSection } from '@/features/settings/components/MappingsSection'

import { makeCategoryMapping } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('MappingsSection CRUD', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('creates a new mapping via the create form', async () => {
    let capturedBody: unknown = null

    server.use(
      http.get('http://localhost:8000/category-mappings', () => HttpResponse.json([])),
      http.post('http://localhost:8000/category-mappings', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          makeCategoryMapping({ id: 'new-map-1', description_pattern: 'SWIGGY' }),
          { status: 201 }
        )
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    // Fill in pattern
    const patternInput = await screen.findByLabelText('New mapping pattern')
    await user.type(patternInput, 'SWIGGY')

    // Pick a category via SearchableSelect
    const categoryInput = screen.getByPlaceholderText('Category…')
    await user.click(categoryInput)
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Groceries' }))

    // Submit
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        description_pattern: 'SWIGGY',
        category_id: 'cat-1',
      })
    })

    // Success toast
    expect(await screen.findByText(/mapping created/i)).toBeInTheDocument()
  })

  it('edits an existing mapping inline', async () => {
    const existing = makeCategoryMapping({
      id: 'map-edit-1',
      description_pattern: 'ZOMATO',
      category_id: 'cat-1',
      category: 'Groceries',
    })

    let capturedPatch: unknown = null

    server.use(
      http.get('http://localhost:8000/category-mappings', () => HttpResponse.json([existing])),
      http.patch('http://localhost:8000/category-mappings/:id', async ({ request }) => {
        capturedPatch = await request.json()
        return HttpResponse.json({
          ...existing,
          description_pattern: 'ZOMATO ORDER',
          category_id: 'cat-2',
          category: 'Transport',
        })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    // Wait for the row
    expect(await screen.findByText('ZOMATO')).toBeInTheDocument()

    // Hover doesn't work in JSDOM, so click the edit button directly (it's in the DOM but opacity-0)
    await user.click(screen.getByRole('button', { name: /edit mapping for ZOMATO/i }))

    // Pattern input should now be visible with existing value
    const patternInput = await screen.findByLabelText('Edit pattern')
    expect(patternInput).toHaveValue('ZOMATO')

    // Change pattern
    await user.clear(patternInput)
    await user.type(patternInput, 'ZOMATO ORDER')

    // Change category — clear current value first so SearchableSelect shows all options
    const categoryInput = screen.getAllByPlaceholderText('Category…')[0]
    await user.clear(categoryInput)
    await user.click(categoryInput)
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Transport' }))

    // Save
    await user.click(screen.getByRole('button', { name: 'Save mapping' }))

    await waitFor(() => {
      expect(capturedPatch).toMatchObject({
        description_pattern: 'ZOMATO ORDER',
        category_id: 'cat-2',
      })
    })

    expect(await screen.findByText(/mapping updated/i)).toBeInTheDocument()
  })

  it('cancels inline edit without saving', async () => {
    const existing = makeCategoryMapping({
      id: 'map-cancel-1',
      description_pattern: 'NETFLIX',
      category_id: 'cat-1',
      category: 'Groceries',
    })

    server.use(
      http.get('http://localhost:8000/category-mappings', () => HttpResponse.json([existing]))
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    await screen.findByText('NETFLIX')

    await user.click(screen.getByRole('button', { name: /edit mapping for NETFLIX/i }))

    const patternInput = await screen.findByLabelText('Edit pattern')
    await user.type(patternInput, ' MODIFIED')

    // Cancel
    await user.click(screen.getByRole('button', { name: 'Cancel edit' }))

    // Row back to read view
    expect(await screen.findByText('NETFLIX')).toBeInTheDocument()
    expect(screen.queryByLabelText('Edit pattern')).not.toBeInTheDocument()
  })
})
