import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('renders the code and language', () => {
    render(<CodeBlock code="const a = 1" language="js" testID="chat.code.msg1.0" />)
    expect(screen.getByText('js')).toBeInTheDocument()
    expect(screen.getByText('const a = 1')).toBeInTheDocument()
  })

  it('does not show a copy control when onCopyCode is absent', () => {
    render(<CodeBlock code="const a = 1" testID="chat.code.msg1.0" />)
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
  })

  it('fires onCopyCode on activation and shows a copied state', () => {
    const onCopyCode = vi.fn()
    render(
      <CodeBlock
        code="const a = 1"
        language="js"
        onCopyCode={onCopyCode}
        testID="chat.code.msg1.0"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(onCopyCode).toHaveBeenCalledWith('const a = 1', 'js')
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('shows a visible failure state when the copy promise rejects', async () => {
    const onCopyCode = vi.fn().mockRejectedValue(new Error('denied'))
    render(<CodeBlock code="const a = 1" onCopyCode={onCopyCode} testID="chat.code.msg1.0" />)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => {
      expect(screen.getByText('Copy failed')).toBeInTheDocument()
    })
  })

  it('shows a visible failure state when the copy throws', () => {
    const onCopyCode = vi.fn().mockImplementation(() => {
      throw new Error('denied')
    })
    render(<CodeBlock code="const a = 1" onCopyCode={onCopyCode} testID="chat.code.msg1.0" />)
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    expect(screen.getByText('Copy failed')).toBeInTheDocument()
  })
})
