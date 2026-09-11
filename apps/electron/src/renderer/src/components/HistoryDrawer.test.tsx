import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ManifestEntry } from '@app-20/conversation-storage'
import { HistoryDrawer } from './HistoryDrawer'

function entry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: 'conversation-1',
    fileName: 'conversation-1.json',
    title: 'First chat',
    model: 'openrouter/auto',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  }
}

function noopProps() {
  return {
    loading: false,
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onClose: vi.fn(),
  }
}

describe('HistoryDrawer', () => {
  it('renders nothing when closed', () => {
    render(<HistoryDrawer open={false} entries={[]} {...noopProps()} />)
    expect(screen.queryByTestId('chat.history.drawer')).toBeNull()
  })

  it('shows the empty state when there are no entries', () => {
    render(<HistoryDrawer open entries={[]} {...noopProps()} />)
    expect(screen.getByTestId('chat.history.empty').textContent).toBe('No conversations yet.')
  })

  it('lists entries with title, model, and date', () => {
    render(<HistoryDrawer open entries={[entry()]} {...noopProps()} />)

    const row = screen.getByTestId('chat.history.entry')
    expect(row.textContent).toContain('First chat')
    expect(row.textContent).toContain('openrouter/auto')
    expect(row.textContent).toContain('2026-09-10')
  })

  it('shows the untitled placeholder for a blank title', () => {
    render(<HistoryDrawer open entries={[entry({ title: '' })]} {...noopProps()} />)
    expect(screen.getByTestId('chat.history.entry').textContent).toContain('Untitled')
  })

  it('selects an entry by id', () => {
    const props = noopProps()
    render(<HistoryDrawer open entries={[entry()]} {...props} />)

    fireEvent.click(screen.getByTestId('chat.history.entry'))

    expect(props.onSelect).toHaveBeenCalledWith('conversation-1')
  })

  it('starts a new conversation', () => {
    const props = noopProps()
    render(<HistoryDrawer open entries={[]} {...props} />)

    fireEvent.click(screen.getByTestId('chat.history.new'))

    expect(props.onNew).toHaveBeenCalledTimes(1)
  })

  it('closes on scrim press', () => {
    const props = noopProps()
    render(<HistoryDrawer open entries={[]} {...props} />)

    fireEvent.click(screen.getByTestId('chat.history.scrim'))

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('shows neither the empty state nor rows while loading', () => {
    render(<HistoryDrawer open entries={[]} {...noopProps()} loading />)

    expect(screen.queryByTestId('chat.history.empty')).toBeNull()
    expect(screen.queryByTestId('chat.history.entry')).toBeNull()
  })
})
