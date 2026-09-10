import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { serializeConversation, type Conversation } from '@app-20/conversation-storage'
import { loadConversationFolder } from './conversationFolder'
import { getConversationStore, reconcileConversations } from './conversationStore'

function sampleConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Title',
    model: 'openrouter/auto',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:05:00.000Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'hello',
        createdAt: '2026-09-10T12:00:00.000Z',
        status: 'complete',
      },
    ],
    ...overrides,
  }
}

describe('conversation store over the filesystem port', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-store-'))
    process.env['APP20_CONVERSATION_DIR'] = root
    await loadConversationFolder()
  })

  afterEach(async () => {
    delete process.env['APP20_CONVERSATION_DIR']
    await rm(root, { recursive: true, force: true })
  })

  it('writes a schema-valid conversation file and a manifest', async () => {
    await getConversationStore().save(sampleConversation())

    const stored = JSON.parse(await readFile(join(root, 'c1.json'), 'utf8')) as Conversation
    expect(stored.messages[0]?.content).toBe('hello')
    expect(stored.model).toBe('openrouter/auto')

    const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')) as {
      conversations: { id: string; fileName: string }[]
    }
    expect(manifest.conversations).toHaveLength(1)
    expect(manifest.conversations[0]?.fileName).toBe('c1.json')
  })

  it('reports a missing manifest as an empty history', async () => {
    const result = await getConversationStore().list()
    expect(result.entries).toEqual([])
    expect(result.report).toEqual({ dropped: 0, repaired: 0, corrupt: 0 })
  })

  it('rejects a conversation id that would escape the folder', async () => {
    await expect(
      getConversationStore().save(sampleConversation({ id: '../../escape' })),
    ).rejects.toMatchObject({ code: 'invalid-name' })
  })

  it('repairs a valid orphan and keeps a corrupt file', async () => {
    await writeFile(
      join(root, 'conversation-orphan.json'),
      serializeConversation(sampleConversation({ id: 'conversation-orphan' })),
    )
    await writeFile(join(root, 'conversation-broken.json'), '{ not json')

    const report = await reconcileConversations()

    expect(report).toEqual({ dropped: 0, repaired: 1, corrupt: 1 })
    const result = await getConversationStore().list()
    expect(result.entries.map((entry) => entry.id)).toEqual(['conversation-orphan'])
  })
})
