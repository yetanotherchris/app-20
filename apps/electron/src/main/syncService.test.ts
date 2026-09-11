import { describe, expect, it } from 'vitest'
import {
  serializeConversation,
  type Conversation,
  type ConversationFilePort,
} from '@app-20/conversation-storage'
import { RemoteMissingError, type SyncRemote } from '@app-20/sync'
import type { SyncStatus } from '../shared/ipc-contract'
import { classifySyncError, createSyncService } from './syncService'

interface LocalPort extends ConversationFilePort {
  readonly files: Map<string, string>
}

interface InMemoryRemote extends SyncRemote {
  readonly objects: Map<string, string>
}

function createInMemoryRemote(seed: Record<string, string> = {}): InMemoryRemote {
  const objects = new Map<string, string>(Object.entries(seed))
  return {
    objects,
    async listNames() {
      return [...objects.keys()]
    },
    async readText(name) {
      const content = objects.get(name)
      if (content === undefined) throw new RemoteMissingError(name)
      return content
    },
    async writeText(name, content) {
      objects.set(name, content)
    },
  }
}

function createLocalPort(seed: Record<string, string> = {}): LocalPort {
  const files = new Map<string, string>(Object.entries(seed))
  return {
    files,
    async listFileNames() {
      return [...files.keys()]
    },
    async readText(fileName) {
      const content = files.get(fileName)
      if (content === undefined) throw new Error(`missing file: ${fileName}`)
      return content
    },
    async writeText(fileName, content) {
      files.set(fileName, content)
    },
  }
}

function conversation(id: string, updatedAt: string): Conversation {
  return {
    id,
    title: id,
    model: 'openrouter/auto',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    messages: [],
  }
}

async function flushUntil(predicate: () => boolean, attempts = 200): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('condition not reached')
}

describe('createSyncService', () => {
  it('reports disabled when no remote is configured', async () => {
    const statuses: SyncStatus[] = []
    const service = createSyncService({
      resolveRemote: async () => null,
      resolveLocal: () => createLocalPort(),
      push: (status) => statuses.push(status),
    })

    await service.runStartup()

    expect(service.getStatus()).toEqual({ state: 'disabled' })
    expect(statuses).toContainEqual({ state: 'disabled' })
  })

  it('moves from syncing to idle on success', async () => {
    const statuses: SyncStatus[] = []
    const local = createLocalPort({
      'a.json': serializeConversation(conversation('a', '2026-01-02T00:00:00.000Z')),
    })
    const remote = createInMemoryRemote()
    const service = createSyncService({
      resolveRemote: async () => remote,
      resolveLocal: () => local,
      push: (status) => statuses.push(status),
    })

    await service.runStartup()

    expect(service.getStatus()).toEqual({ state: 'idle' })
    expect(statuses.map((entry) => entry.state)).toEqual(['syncing', 'idle'])
    expect(remote.objects.get('a.json')).toBe(local.files.get('a.json'))
  })

  it('marks pending before a save-triggered run', async () => {
    const statuses: SyncStatus[] = []
    const remote = createInMemoryRemote()
    const service = createSyncService({
      resolveRemote: async () => remote,
      resolveLocal: () => createLocalPort(),
      push: (status) => statuses.push(status),
    })

    service.schedule()
    await flushUntil(() => service.getStatus().state === 'idle')

    expect(statuses.map((entry) => entry.state)).toEqual(['pending', 'syncing', 'idle'])
  })

  it('retries a failure with the cap and then reports error', async () => {
    const statuses: SyncStatus[] = []
    let attempts = 0
    const failing: SyncRemote = {
      async listNames() {
        attempts += 1
        throw new Error('boom')
      },
      async readText() {
        throw new Error('unused')
      },
      async writeText() {
        throw new Error('unused')
      },
    }
    const service = createSyncService({
      resolveRemote: async () => failing,
      resolveLocal: () => createLocalPort(),
      push: (status) => statuses.push(status),
      wait: () => Promise.resolve(),
    })

    service.schedule()
    await flushUntil(() => service.getStatus().state === 'error')

    expect(attempts).toBe(4)
    expect(service.getStatus()).toEqual({ state: 'error', error: 'sync-failed' })
    expect(statuses.filter((entry) => entry.state === 'pending').length).toBe(4)
  })

  it('classifies a connectivity failure as network-error', async () => {
    const failing: SyncRemote = {
      async listNames() {
        throw { name: 'NetworkingError' }
      },
      async readText() {
        throw new Error('unused')
      },
      async writeText() {
        throw new Error('unused')
      },
    }
    const service = createSyncService({
      resolveRemote: async () => failing,
      resolveLocal: () => createLocalPort(),
      push: () => undefined,
      wait: () => Promise.resolve(),
    })

    service.schedule()
    await flushUntil(() => service.getStatus().state === 'error')

    expect(service.getStatus()).toEqual({ state: 'error', error: 'network-error' })
  })

  it('serializes overlapping triggers', async () => {
    let active = 0
    let maxActive = 0
    const remote: SyncRemote = {
      async listNames() {
        active += 1
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        active -= 1
        return []
      },
      async readText() {
        return ''
      },
      async writeText() {
        // no-op
      },
    }
    const service = createSyncService({
      resolveRemote: async () => remote,
      resolveLocal: () => createLocalPort(),
      push: () => undefined,
    })

    service.schedule()
    service.schedule()
    await flushUntil(() => service.getStatus().state === 'idle')

    expect(maxActive).toBe(1)
  })
})

describe('classifySyncError', () => {
  it('maps network shaped errors to network-error', () => {
    expect(classifySyncError({ name: 'NetworkingError' })).toBe('network-error')
    expect(classifySyncError({ code: 'ECONNREFUSED' })).toBe('network-error')
  })

  it('maps everything else to sync-failed', () => {
    expect(classifySyncError(new Error('nope'))).toBe('sync-failed')
    expect(classifySyncError({ name: 'AccessDenied' })).toBe('sync-failed')
    expect(classifySyncError(null)).toBe('sync-failed')
  })
})
