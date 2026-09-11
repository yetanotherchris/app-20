import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ManifestEntry } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../../../shared/error-codes'
import type { AppBridge } from '../../../shared/ipc-contract'
import { useConversationHistory } from './useConversationHistory'

function entry(id: string): ManifestEntry {
  return {
    id,
    fileName: `${id}.json`,
    title: id,
    model: 'openrouter/auto',
    updatedAt: '2026-09-10T12:00:00.000Z',
  }
}

function Probe({ onError }: { onError: (code: AppErrorCode) => void }) {
  const history = useConversationHistory(onError)
  return (
    <div>
      <span data-testid="count">{history.entries.length}</span>
      <button data-testid="refresh" onClick={() => void history.refresh()}>
        refresh
      </button>
    </div>
  )
}

function installBridge(result: Awaited<ReturnType<AppBridge['listConversations']>>): void {
  window.appBridge = {
    listConversations: vi.fn(async () => result),
  } as unknown as AppBridge
}

describe('useConversationHistory', () => {
  it('loads entries on refresh', async () => {
    installBridge({
      ok: true,
      value: { entries: [entry('a'), entry('b')], report: { dropped: 0, repaired: 0, corrupt: 0 } },
    })
    render(<Probe onError={() => undefined} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
  })

  it('reports a corrupt manifest without dropping the entries', async () => {
    const onError = vi.fn()
    installBridge({
      ok: true,
      value: { entries: [entry('a')], report: { dropped: 0, repaired: 0, corrupt: 1 } },
    })
    render(<Probe onError={onError} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(onError).toHaveBeenCalledWith('conversation-corrupt')
  })

  it('reports a list failure and leaves the prior entries', async () => {
    const onError = vi.fn()
    installBridge({ ok: false, code: 'read-failed', message: 'nope' })
    render(<Probe onError={onError} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('read-failed'))
    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})
