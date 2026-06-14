import { render, screen } from '@testing-library/react'

import { AuroraBackground } from './AuroraBackground'

describe('AuroraBackground', () => {
  it('renders an aria-hidden container with three blobs and a grain layer', () => {
    const { container } = render(<AuroraBackground />)

    const root = screen.getByTestId('aurora-bg')
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('.aurora-blob')).toHaveLength(3)
    expect(container.querySelector('.aurora-grain')).toBeInTheDocument()
  })
})
