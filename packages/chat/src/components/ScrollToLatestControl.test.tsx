import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScrollToLatestControl } from './ScrollToLatestControl'

describe('ScrollToLatestControl', () => {
  it('renders with the accessible label and stable test id', () => {
    render(<ScrollToLatestControl label="Scroll to latest" onPress={() => {}} />)
    expect(screen.getByTestId('chat.scroll-to-latest')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scroll to latest' })).toBeInTheDocument()
  })

  it('fires onPress on activation', () => {
    const onPress = vi.fn()
    render(<ScrollToLatestControl label="Scroll to latest" onPress={onPress} />)
    fireEvent.click(screen.getByTestId('chat.scroll-to-latest'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
