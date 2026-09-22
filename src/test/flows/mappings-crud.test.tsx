import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { MappingsSection } from '@/features/settings/components/MappingsSection'

import { makeCategoryMapping } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

describe('MappingsSection CRUD', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('creates a rule carrying a category, a tag and a split', async () => {
    let capturedBody: unknown = null

    server.use(
      http.get(`${BASE}/category-mappings`, () => HttpResponse.json([])),
      http.post(`${BASE}/category-mappings`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          makeCategoryMapping({ id: 'new-map-1', description_pattern: 'SWIGGY' }),
          { status: 201 }
        )
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    await user.click(await screen.findByRole('button', { name: 'New rule' }))

    await user.type(screen.getByLabelText('New rule pattern'), 'SWIGGY')

    const categoryInput = screen.getByPlaceholderText('New rule category…')
    await user.click(categoryInput)
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Groceries' }))

    // Tag
    await user.click(screen.getByPlaceholderText('Search tags…'))
    await user.click(await screen.findByText('eating out'))

    await user.click(screen.getByRole('button', { name: 'Create rule' }))

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        description_pattern: 'SWIGGY',
        category_id: 'cat-1',
        tag_ids: ['tag-1'],
        shares: [],
      })
    })

    expect(await screen.findByText(/rule created/i)).toBeInTheDocument()
  })

  it('shows the tags and split a rule carries', async () => {
    server.use(
      http.get(`${BASE}/category-mappings`, () =>
        HttpResponse.json([
          makeCategoryMapping({
            id: 'map-show-1',
            description_pattern: 'SWIGGY',
            tags: [{ id: 'tag-1', name: 'eating out' }],
            shares: [
              {
                person_id: 'per-1',
                person_name: 'flatmate',
                share_type: 'percentage',
                share_value: 50,
              },
            ],
          }),
        ])
      )
    )

    renderWithProviders(<MappingsSection />)

    expect(await screen.findByText('SWIGGY')).toBeInTheDocument()
    expect(screen.getByText('eating out')).toBeInTheDocument()
    expect(screen.getByText('flatmate 50%')).toBeInTheDocument()
    expect(screen.getByText(/1 rules · 1 carry tags · 1 carry a split/)).toBeInTheDocument()
  })

  it('edits a rule inline, sending all three facets', async () => {
    const existing = makeCategoryMapping({
      id: 'map-edit-1',
      description_pattern: 'ZOMATO',
      category_id: 'cat-1',
      category: 'Groceries',
      tags: [{ id: 'tag-1', name: 'eating out' }],
    })

    let capturedPatch: unknown = null

    server.use(
      http.get(`${BASE}/category-mappings`, () => HttpResponse.json([existing])),
      http.patch(`${BASE}/category-mappings/:id`, async ({ request }) => {
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

    expect(await screen.findByText('ZOMATO')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /edit rule for ZOMATO/i }))

    const patternInput = await screen.findByLabelText('Edit rule pattern')
    expect(patternInput).toHaveValue('ZOMATO')

    await user.clear(patternInput)
    await user.type(patternInput, 'ZOMATO ORDER')

    const categoryInput = screen.getByPlaceholderText('Edit rule category…')
    await user.clear(categoryInput)
    await user.click(categoryInput)
    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Transport' }))

    await user.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() => {
      expect(capturedPatch).toMatchObject({
        description_pattern: 'ZOMATO ORDER',
        category_id: 'cat-2',
        // The rule's existing tags ride along, so saving a category change
        // does not silently clear them.
        tag_ids: ['tag-1'],
      })
    })

    expect(await screen.findByText(/rule updated/i)).toBeInTheDocument()
  })

  it('cancels an inline edit without saving', async () => {
    server.use(
      http.get(`${BASE}/category-mappings`, () =>
        HttpResponse.json([
          makeCategoryMapping({
            id: 'map-cancel-1',
            description_pattern: 'NETFLIX',
            category_id: 'cat-1',
            category: 'Groceries',
          }),
        ])
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    await screen.findByText('NETFLIX')
    await user.click(screen.getByRole('button', { name: /edit rule for NETFLIX/i }))

    const patternInput = await screen.findByLabelText('Edit rule pattern')
    await user.type(patternInput, ' MODIFIED')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('NETFLIX')).toBeInTheDocument()
    expect(screen.queryByLabelText('Edit rule pattern')).not.toBeInTheDocument()
  })

  it('groups rules by the person they split with', async () => {
    server.use(
      http.get(`${BASE}/category-mappings`, () =>
        HttpResponse.json([
          makeCategoryMapping({
            id: 'm1',
            description_pattern: 'SWIGGY',
            shares: [
              {
                person_id: 'per-1',
                person_name: 'flatmate',
                share_type: 'percentage',
                share_value: 50,
              },
            ],
          }),
          makeCategoryMapping({ id: 'm2', description_pattern: 'METRO' }),
        ])
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    await screen.findByText('SWIGGY')
    await user.click(screen.getByRole('button', { name: 'By split' }))

    // One bucket per person, and a catch-all for the rules with no split.
    expect(await screen.findByText('flatmate')).toBeInTheDocument()
    expect(screen.getByText('No split')).toBeInTheDocument()
  })

  it('searches across tags and people, not just the pattern', async () => {
    server.use(
      http.get(`${BASE}/category-mappings`, () =>
        HttpResponse.json([
          makeCategoryMapping({
            id: 'm1',
            description_pattern: 'SWIGGY',
            tags: [{ id: 'tag-1', name: 'eating out' }],
          }),
          makeCategoryMapping({ id: 'm2', description_pattern: 'METRO' }),
        ])
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<MappingsSection />)

    await screen.findByText('SWIGGY')
    await user.type(
      screen.getByPlaceholderText('Search pattern, category, tag or person…'),
      'eating'
    )

    expect(screen.getByText('SWIGGY')).toBeInTheDocument()
    expect(screen.queryByText('METRO')).not.toBeInTheDocument()
  })
})
