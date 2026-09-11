import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AppBridge, SyncStatus } from '../../../shared/ipc-contract'
import { useSyncStatus } from './useSyncStatus'

function Probe() {
  const status = useSyncStatus()
  return <span data-testid="state">{status.state}</span>
}

function installBridge(initial: SyncStatus): { push: (status: SyncStatus) => void } {
  const listeners: ((status: SyncStatus) => void)[] = []
  const bridge = {
    getSyncStatus: vi.fn(async () => ({ ok: true, value: initial })),
    onSyncStatus: vi.fn((handler: (status: SyncStatus) => void) => {
      listeners.push(handler)
      return () => undefined
    }),
  }
  window.appBridge = bridge as unknown as AppBridge
  return {
    push(status) {
      for (const listener of listeners) listener(status)
    },
  }
}

describe('useSyncStatus', () => {
  it('reads the current status on mount', async () => {
    installBridge({ state: 'idle', error: null })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('idle'))
  })

  it('follows status pushes from main', async () => {
    const bridge = installBridge({ state: 'idle', error: null })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('idle'))

    act(() => bridge.push({ state: 'error', error: 'sync-failed' }))

    expect(screen.getByTestId('state').textContent).toBe('error')
  })
})
