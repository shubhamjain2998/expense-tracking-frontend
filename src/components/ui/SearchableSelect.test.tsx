/**
 * Finding 6.1: verify that clicking an option via mousedown reliably persists
 * the selection even when focus immediately moves to another element.
 *
 * Before the fix, `handleClickOutside` held a stale `value=""` closure and
 * reset query to "" when the next mousedown outside the container fired
 * (which happened programmatically before React's effects re-ran).
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { SearchableSelect } from './SearchableSelect'

const OPTIONS = [
  { value: 'food-1', label: 'Food' },
  { value: 'transport-2', label: 'Transport' },
  { value: 'health-3', label: 'Health' },
]

function Harness() {
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <div>
      <SearchableSelect
        options={OPTIONS}
        value={category}
        onChange={setCategory}
        placeholder="Search categories…"
      />
      <input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <div data-testid="selected-value">{category}</div>
    </div>
  )
}

describe('SearchableSelect – type → click option → focus elsewhere', () => {
  it('persists the selected category_id after clicking an option and tabbing away', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByPlaceholderText('Search categories…')

    // 1. Type to open + filter the listbox
    await user.click(input)
    await user.type(input, 'foo')

    // Listbox should show "Food"
    expect(screen.getByRole('option', { name: 'Food' })).toBeInTheDocument()

    // 2. Click the option via mousedown (mirrors real browser behaviour and
    //    the programmatic sequence that previously triggered the race).
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Food' }))

    // 3. Simulate focus moving to the amount input (mousedown outside the
    //    SearchableSelect container) — this is the event that used to fire
    //    handleClickOutside with a stale value="" closure.
    const amountInput = screen.getByLabelText('Amount')
    fireEvent.mouseDown(amountInput)
    await user.click(amountInput)

    // 4. The hidden value span must hold the selected category_id, not "".
    expect(screen.getByTestId('selected-value')).toHaveTextContent('food-1')
  })

  it('clears the query back to the current value when clicking outside without selecting', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByPlaceholderText('Search categories…')

    await user.click(input)
    await user.type(input, 'xyz') // no match, nothing selected

    // Click outside without selecting anything
    fireEvent.mouseDown(document.body)

    // Input should reset to the current value (empty → shows empty)
    expect(input).toHaveValue('')
  })
})
