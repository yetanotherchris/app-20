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

type ListResult = Awaited<ReturnType<AppBridge['listConversations']>>

function ok(entries: ManifestEntry[], corrupt = 0): ListResult {
  return { ok: true, value: { entries, report: { dropped: 0, repaired: 0, corrupt } } }
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

function installBridge(initial: ListResult): { setResult: (next: ListResult) => void } {
  let result = initial
  window.appBridge = {
    listConversations: vi.fn(async () => result),
  } as unknown as AppBridge
  return {
    setResult(next) {
      result = next
    },
  }
}

describe('useConversationHistory', () => {
  it('loads entries on refresh', async () => {
    installBridge(ok([entry('a'), entry('b')]))
    render(<Probe onError={() => undefined} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
  })

  it('caps the list at ten entries', async () => {
    installBridge(ok(Array.from({ length: 12 }, (_value, index) => entry(`conversation-${index}`))))
    render(<Probe onError={() => undefined} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('10'))
  })

  it('reports a corrupt manifest without dropping the entries', async () => {
    const onError = vi.fn()
    installBridge(ok([entry('a')], 1))
    render(<Probe onError={onError} />)

    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    expect(onError).toHaveBeenCalledWith('conversation-corrupt')
  })

  it('reports a list failure and retains the prior entries', async () => {
    const onError = vi.fn()
    const bridge = installBridge(ok([entry('a')]))
    render(<Probe onError={onError} />)

    fireEvent.click(screen.getByTestId('refresh'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    bridge.setResult({ ok: false, code: 'read-failed', message: 'nope' })
    fireEvent.click(screen.getByTestId('refresh'))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('read-failed'))
    expect(screen.getByTestId('count').textContent).toBe('1')
  })
})
