import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import {
  clickMenuItem,
  closeShell,
  forceExitShell,
  launchShell,
  listConversationJsonFiles,
  readConversationJson,
  type LaunchedShell,
} from './launch-shell'

interface StoredMessage {
  id: string
  role: string
  content: string
  createdAt: string
  status: string
}

interface StoredConversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  draft?: string
  messages: StoredMessage[]
}

interface StoredManifestEntry {
  id: string
  fileName: string
  title: string
  model: string
  updatedAt: string
}

interface StoredManifest {
  version: number
  conversations: StoredManifestEntry[]
}

const CONVERSATION_KEYS = ['createdAt', 'draft', 'id', 'messages', 'model', 'title', 'updatedAt']
const MESSAGE_KEYS = ['content', 'createdAt', 'id', 'role', 'status']

function conversationJson(id: string, content: string): string {
  return JSON.stringify({
    id,
    title: content,
    model: '',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:05:00.000Z',
    messages: [
      {
        id: `${id}-m1`,
        role: 'user',
        content,
        createdAt: '2026-09-10T12:00:00.000Z',
        status: 'complete',
      },
    ],
  })
}

function manifestJson(entries: StoredManifestEntry[]): string {
  return JSON.stringify({ version: 1, conversations: entries })
}

async function sendPrompt(page: Page, text: string): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
  await page.getByTestId('chat.composer.send').click()
  await expect(page.getByText(`Local echo: ${text}`)).toBeVisible()
}

async function save(page: Page): Promise<void> {
  await page.getByTestId('shell.save').click()
  await expect(page.getByTestId('shell.dirty')).toHaveText('Saved')
}

async function launchSeeded(files: Record<string, string>): Promise<LaunchedShell> {
  const conversationDir = await mkdtemp(join(tmpdir(), 'app20-conv-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(conversationDir, name), content)
  }
  const shell = await launchShell({ conversationDir })
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  return shell
}

test.describe('US1 - a conversation survives a restart', () => {
  test('saves a schema-valid file and manifest, then restores after a relaunch', async () => {
    const first = await launchShell()
    await expect(first.page.getByTestId('shell.topbar')).toBeVisible()
    try {
      await sendPrompt(first.page, 'schema check')
      await first.page.getByTestId('chat.composer.input').fill('draft survives storage')
      await save(first.page)

      const names = await listConversationJsonFiles(first.conversationDir)
      expect(names).toHaveLength(1)
      const fileName = names[0] as string

      const stored = await readConversationJson<StoredConversation>(first.conversationDir, fileName)
      expect(Object.keys(stored).sort()).toEqual(CONVERSATION_KEYS)
      expect(stored.id).toMatch(/^conversation-/)
      expect(stored.title).toBe('schema check')
      expect(stored.messages).toHaveLength(2)
      for (const message of stored.messages) {
        expect(Object.keys(message).sort()).toEqual(MESSAGE_KEYS)
        expect(typeof message.content).toBe('string')
        expect(['complete', 'stopped', 'error']).toContain(message.status)
      }
      expect(stored.messages.map((message) => message.role)).toEqual(['user', 'assistant'])

      const manifest = await readConversationJson<StoredManifest>(
        first.conversationDir,
        'manifest.json',
      )
      expect(manifest.conversations).toHaveLength(1)
      expect(manifest.conversations[0]).toMatchObject({ id: stored.id, fileName })
      expect(typeof manifest.conversations[0]?.model).toBe('string')
      expect(typeof manifest.conversations[0]?.updatedAt).toBe('string')

      await forceExitShell(first.app)

      const second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      try {
        await expect(second.page.getByTestId('shell.topbar')).toBeVisible()
        await expect(second.page.getByText('Local echo: schema check')).toBeVisible()
        await expect(second.page.getByTestId('chat.composer.input')).toHaveValue(
          'draft survives storage',
        )
      } finally {
        await closeShell(second)
      }
    } finally {
      await closeShell(first)
    }
  })
})

test.describe('US2 - conversations are listed from a manifest', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('lists both conversations newest first with their metadata', async () => {
    await sendPrompt(shell.page, 'first conversation')
    await save(shell.page)

    await clickMenuItem(shell.app, 'New Conversation')
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('')

    await sendPrompt(shell.page, 'second conversation')
    await save(shell.page)

    const listed = await shell.page.evaluate(() => window.appBridge.listConversations())
    expect(listed.ok).toBe(true)
    if (listed.ok) {
      expect(listed.value.entries.map((entry) => entry.title)).toEqual([
        'second conversation',
        'first conversation',
      ])
      for (const entry of listed.value.entries) {
        expect(typeof entry.fileName).toBe('string')
        expect(typeof entry.model).toBe('string')
        expect(typeof entry.updatedAt).toBe('string')
      }
    }

    const manifest = await readConversationJson<StoredManifest>(
      shell.conversationDir,
      'manifest.json',
    )
    expect(manifest.conversations).toHaveLength(2)
  })
})

test.describe('Edge cases - recovery', () => {
  test('starts clean when the manifest is missing and no conversations exist', async () => {
    const shell = await launchSeeded({})
    try {
      const listed = await shell.page.evaluate(() => window.appBridge.listConversations())
      expect(listed.ok).toBe(true)
      if (listed.ok) expect(listed.value.entries).toEqual([])
      expect(await shell.page.getByTestId('shell.notification.error').count()).toBe(0)
    } finally {
      await closeShell(shell)
    }
  })

  test('reports a corrupt file and leaves it on disk', async () => {
    const shell = await launchSeeded({ 'conversation-broken.json': '{ not json' })
    try {
      await expect(shell.page.getByTestId('shell.notification.error')).toContainText(
        'could not be read',
      )
      const listed = await shell.page.evaluate(() => window.appBridge.listConversations())
      expect(listed.ok).toBe(true)
      if (listed.ok) {
        expect(listed.value.entries).toEqual([])
        expect(listed.value.report.corrupt).toBe(1)
      }
      expect(await listConversationJsonFiles(shell.conversationDir)).toContain(
        'conversation-broken.json',
      )
    } finally {
      await closeShell(shell)
    }
  })

  test('repairs an orphan and drops a missing manifest entry at startup', async () => {
    const shell = await launchSeeded({
      'conversation-live.json': conversationJson('conversation-live', 'live'),
      'manifest.json': manifestJson([
        {
          id: 'gone',
          fileName: 'gone.json',
          title: 'Gone',
          model: '',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
      ]),
    })
    try {
      const listed = await shell.page.evaluate(() => window.appBridge.listConversations())
      expect(listed.ok).toBe(true)
      if (listed.ok) {
        expect(listed.value.entries.map((entry) => entry.id)).toEqual(['conversation-live'])
      }

      const manifest = await readConversationJson<StoredManifest>(
        shell.conversationDir,
        'manifest.json',
      )
      expect(manifest.conversations.map((entry) => entry.id)).toEqual(['conversation-live'])
    } finally {
      await closeShell(shell)
    }
  })
})
