import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Composer } from './Composer'

function renderComposer(overrides: Partial<React.ComponentProps<typeof Composer>> = {}) {
  const props = {
    value: '',
    canSend: false,
    isBusy: false,
    onChangeText: vi.fn(),
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    ...overrides,
  }
  const result = render(<Composer {...props} />)
  return { ...result, props }
}

describe('Composer', () => {
  it('renders the input with a stable test id', () => {
    renderComposer()
    expect(screen.getByTestId('chat.composer.input')).toBeInTheDocument()
    expect(screen.getByTestId('chat.composer.send')).toBeInTheDocument()
  })

  it('disables Send for an empty draft', () => {
    renderComposer({ value: '', canSend: false })
    expect(screen.getByTestId('chat.composer.send')).toBeDisabled()
  })

  it('enables Send for a non-empty draft', () => {
    renderComposer({ value: 'hello', canSend: true })
    expect(screen.getByTestId('chat.composer.send')).toBeEnabled()
  })

  it('fires onChangeText once per change', () => {
    const { props } = renderComposer({ value: 'hi', canSend: true })
    const input = screen.getByTestId('chat.composer.input')
    fireEvent.change(input, { target: { value: 'hi there' } })
    expect(props.onChangeText).toHaveBeenCalledTimes(1)
    expect(props.onChangeText).toHaveBeenCalledWith('hi there')
  })

  it('submits via the Send button', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true })
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not submit via the Send button while busy', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true, isBusy: true })
    // Busy shows Stop, not Send.
    expect(screen.queryByTestId('chat.composer.send')).not.toBeInTheDocument()
    expect(screen.getByTestId('chat.composer.stop')).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit when canSend is false even if the button is pressed', () => {
    const { props } = renderComposer({ value: 'hello', canSend: false })
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('does not fire duplicate submits for the same draft value', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true })
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    // A repeated press of the same value is a duplicate send (FR-012).
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not discard the draft on re-render (controlled value preserved)', () => {
    const { rerender, props } = renderComposer({ value: 'keep me', canSend: true })
    rerender(<Composer {...props} value="keep me" canSend={true} />)
    expect((screen.getByTestId('chat.composer.input') as HTMLTextAreaElement).value).toBe('keep me')
  })

  it('fires onStop when the Stop control is pressed', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true, isBusy: true })
    fireEvent.click(screen.getByTestId('chat.composer.stop'))
    expect(props.onStop).toHaveBeenCalledTimes(1)
  })
})

describe('Composer keyboard behaviour', () => {
  it('submits on desktop Enter without Shift (web)', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true })
    const input = screen.getByTestId('chat.composer.input')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, isComposing: false })
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('inserts a newline on Shift+Enter without submitting (web)', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true })
    const input = screen.getByTestId('chat.composer.input')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true, isComposing: false })
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit during IME composition (web)', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true })
    const input = screen.getByTestId('chat.composer.input')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, isComposing: true })
    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})

describe('Composer blur behaviour', () => {
  it('sends on blur when blurBehavior is send', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true, blurBehavior: 'send' })
    fireEvent.blur(screen.getByTestId('chat.composer.input'))
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('keeps the draft on blur when blurBehavior is keep', () => {
    const { props } = renderComposer({ value: 'hello', canSend: true, blurBehavior: 'keep' })
    fireEvent.blur(screen.getByTestId('chat.composer.input'))
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('does not send on blur when the draft is empty', () => {
    const { props } = renderComposer({ value: '', canSend: false, blurBehavior: 'send' })
    fireEvent.blur(screen.getByTestId('chat.composer.input'))
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('does not double-submit when clicking Send under blur-to-send', () => {
    // Real click order: the input blurs (firing blur-to-send), then the
    // button press fires. Both act on the same draft value, so only one
    // submit must fire.
    const { props } = renderComposer({ value: 'hello', canSend: true, blurBehavior: 'send' })
    fireEvent.blur(screen.getByTestId('chat.composer.input'))
    fireEvent.click(screen.getByTestId('chat.composer.send'))
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not submit on blur while busy', () => {
    const { props } = renderComposer({
      value: 'hello',
      canSend: true,
      isBusy: true,
      blurBehavior: 'send',
    })
    fireEvent.blur(screen.getByTestId('chat.composer.input'))
    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})
