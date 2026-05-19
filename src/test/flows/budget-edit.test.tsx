import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { BudgetPage } from '@/pages/BudgetPage'

import { makeBudgetEntry } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('Budget inline edit flow', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('shows empty-state prompt and opens Add Budget modal', async () => {
    server.use(http.get('http://localhost:8000/budget/:year', () => HttpResponse.json([])))

    const user = userEvent.setup()
    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget'] })

    expect(await screen.findByText(/no budget set for/i)).toBeInTheDocument()

    // Click the empty-state CTA — covers the onAdd callback
    await user.click(screen.getByRole('button', { name: /add first budget entry/i }))

    // AddBudgetModal opens
    expect(await screen.findByText(/add budget entries/i)).toBeInTheDocument()
  })

  it('navigates to previous month and shows delete confirm dialog', async () => {
    const entry = makeBudgetEntry({
      id: 'entry-del',
      category_id: 'cat-1',
      category: 'Groceries',
      allocated_amount: '1200.00',
    })
    server.use(http.get('http://localhost:8000/budget/:year', () => HttpResponse.json([entry])))

    const user = userEvent.setup()
    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget'] })

    // Wait for table
    await screen.findByTitle('Click to edit monthly budget')

    // Navigate to previous month (covers navigateMonth)
    await user.click(await screen.findByRole('button', { name: /previous month/i }))

    // Navigate next month
    await user.click(await screen.findByRole('button', { name: /next month/i }))

    // Click the header "+ Add budget" button (covers onAddClick arrow fn)
    await user.click(screen.getByRole('button', { name: /add budget$/i }))

    // AddBudgetModal opens — dismiss via its close (×) button
    await screen.findByText(/add budget entries/i)
    await user.click(screen.getByRole('button', { name: 'Close' }))

    // Click delete button (covers onDelete arrow fn)
    await user.click(await screen.findByRole('button', { name: /delete budget for groceries/i }))

    // ConfirmDialog appears (covers lines 149-160)
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument()

    // Cancel the dialog (covers onCancel arrow fn)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
  })

  it('edits monthly budget and PUT /budget/:id fires with the new amount', async () => {
    const entry = makeBudgetEntry({
      id: 'budget-entry-1',
      category_id: 'cat-1',
      category: 'Groceries',
      allocated_amount: '1200.00',
    })

    server.use(
      http.get('http://localhost:8000/budget/:year', () => HttpResponse.json([entry])),
      // Return 404 so the code falls back to PUT /budget/:id (updateBudgetEntry)
      http.put(
        'http://localhost:8000/budget/:year/:month/categories/:categoryId',
        () => new HttpResponse(null, { status: 404 })
      )
    )

    let capturedBody: unknown = null
    server.use(
      http.put('http://localhost:8000/budget/:id', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...entry, allocated_amount: '1800.00' })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget'] })

    // Wait for the edit button — it only appears once the budget table data is loaded
    const editBtn = await screen.findByTitle('Click to edit monthly budget')
    await user.click(editBtn)

    // The number input appears — clear and type a new monthly amount
    const input = await screen.findByLabelText(/monthly budget for groceries/i)
    await user.clear(input)
    await user.type(input, '150')
    await user.keyboard('{Enter}')

    // PUT /budget/:id should fire with allocated_amount = 150 * 12 = 1800
    await waitFor(() => {
      expect(capturedBody).toMatchObject({ allocated_amount: 1800 })
    })
  })
})
