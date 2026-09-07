import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LoadEarlierControl } from './LoadEarlierControl'

describe('LoadEarlierControl', () => {
  it('renders with the accessible label and stable test id', () => {
    render(
      <LoadEarlierControl label="Load earlier messages" isLoading={false} onPress={() => {}} />,
    )
    expect(screen.getByTestId('chat.load-earlier')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load earlier messages' })).toBeInTheDocument()
  })

  it('fires onPress on activation', () => {
    const onPress = vi.fn()
    render(<LoadEarlierControl label="Load earlier messages" isLoading={false} onPress={onPress} />)
    fireEvent.click(screen.getByTestId('chat.load-earlier'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('is disabled while loading', () => {
    const onPress = vi.fn()
    render(<LoadEarlierControl label="Load earlier messages" isLoading={true} onPress={onPress} />)
    expect(screen.getByTestId('chat.load-earlier')).toBeDisabled()
    fireEvent.click(screen.getByTestId('chat.load-earlier'))
    expect(onPress).not.toHaveBeenCalled()
  })
})
