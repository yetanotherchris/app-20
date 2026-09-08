import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StopButton } from './StopButton'

function renderStop(overrides: Partial<React.ComponentProps<typeof StopButton>> = {}) {
  const props = { label: 'Stop', onPress: vi.fn(), ...overrides }
  return { ...render(<StopButton {...props} />), props }
}

describe('StopButton', () => {
  it('renders a circular control in the same area as Send with the accessible name', () => {
    renderStop()
    const stop = screen.getByTestId('chat.composer.stop')
    expect(stop).toHaveAttribute('aria-label', 'Stop')
    const style = getComputedStyle(stop)
    expect(style.borderTopLeftRadius).toBe(`${Math.round(parseFloat(style.width) / 2)}px`)
    expect(style.borderTopRightRadius).toBe(style.borderTopLeftRadius)
  })

  it('uses the sendBackground surface so the Send/Stop swap does not shift layout', () => {
    renderStop()
    expect(getComputedStyle(screen.getByTestId('chat.composer.stop')).backgroundColor).toBe(
      'rgb(15, 23, 42)',
    )
  })

  it('fires onPress', () => {
    const { props } = renderStop()
    fireEvent.click(screen.getByTestId('chat.composer.stop'))
    expect(props.onPress).toHaveBeenCalledTimes(1)
  })
})
