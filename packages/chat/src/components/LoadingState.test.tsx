import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingState } from './LoadingState'
import { ThemeProvider } from '../theme/ThemeContext'

describe('LoadingState', () => {
  it('renders the loading view with a spinner by default', () => {
    render(<LoadingState />)
    expect(screen.getByTestId('chat.state.loading')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders a static glyph instead of the spinner under reduced motion', () => {
    render(
      <ThemeProvider reducedMotion>
        <LoadingState />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('chat.state.loading')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
