import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { SendButton } from './SendButton'

function renderSend(overrides: Partial<React.ComponentProps<typeof SendButton>> = {}) {
  const props = { label: 'Send', disabled: false, onPress: vi.fn(), ...overrides }
  return { ...render(<SendButton {...props} />), props }
}

describe('SendButton', () => {
  it('renders a circular icon-only control with the accessible name', () => {
    renderSend()
    const send = screen.getByTestId('chat.composer.send')
    expect(send).toHaveAttribute('aria-label', 'Send')
    const style = getComputedStyle(send)
    expect(style.borderTopLeftRadius).toBe(`${Math.round(parseFloat(style.width) / 2)}px`)
    expect(style.borderTopRightRadius).toBe(style.borderTopLeftRadius)
  })

  it('uses the sendBackground surface when enabled', () => {
    renderSend()
    expect(getComputedStyle(screen.getByTestId('chat.composer.send')).backgroundColor).toBe(
      'rgb(15, 23, 42)',
    )
  })

  it('uses the sendDisabled surface when disabled', () => {
    cleanup()
    renderSend({ disabled: true })
    expect(getComputedStyle(screen.getByTestId('chat.composer.send')).backgroundColor).toBe(
      'rgb(224, 224, 224)',
    )
  })

  it('fires onPress and disables when disabled', () => {
    cleanup()
    const { props } = renderSend()
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    expect(props.onPress).toHaveBeenCalledTimes(1)
    cleanup()
    renderSend({ disabled: true })
    expect(screen.getByTestId('chat.composer.send')).toBeDisabled()
  })
})
