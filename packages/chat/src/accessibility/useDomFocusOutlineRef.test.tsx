import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useDomFocusOutlineRef } from './useDomFocusOutlineRef'

function Row() {
  const ref = useDomFocusOutlineRef('#ff0000')
  return <div data-testid="row" tabIndex={0} ref={ref as React.Ref<HTMLDivElement>} />
}

describe('useDomFocusOutlineRef', () => {
  it('applies the focus outline on focus and clears it on blur', () => {
    render(<Row />)
    const row = screen.getByTestId('row') as HTMLElement
    expect(row.style.outlineWidth).toBe('')
    fireEvent.focus(row)
    expect(row.style.outlineWidth).toBe('2px')
    expect(row.style.outlineStyle).toBe('solid')
    // Browsers normalize colors on style assignment.
    expect(row.style.outlineColor).toBe('rgb(255, 0, 0)')
    expect(row.style.outlineOffset).toBe('2px')
    fireEvent.blur(row)
    expect(row.style.outlineWidth).toBe('')
    expect(row.style.outlineColor).toBe('')
  })
})
