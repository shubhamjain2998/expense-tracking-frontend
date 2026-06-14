import { render } from '@testing-library/react'

import { KoshSeal } from './KoshSeal'
import { KoshSpinner } from './KoshSpinner'

describe('KoshSeal', () => {
  it('renders a decorative seal svg with the कोश wordmark', () => {
    const { container, getByText } = render(<KoshSeal size={200} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '200')
    expect(getByText('कोश')).toBeInTheDocument()
  })
})

describe('KoshSpinner', () => {
  it('exposes a polite status role and a loading label', () => {
    const { getByRole, getByText } = render(<KoshSpinner label="Loading" />)
    expect(getByRole('status')).toBeInTheDocument()
    expect(getByText('Loading')).toBeInTheDocument()
  })

  it('falls back to an accessible label when none is provided', () => {
    const { getByText } = render(<KoshSpinner />)
    expect(getByText('Loading')).toBeInTheDocument()
  })
})
