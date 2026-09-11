import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import {
  clickMenuItem,
  closeShell,
  launchShell,
  listConversationJsonFiles,
  readConversationJson,
  stubOpenDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'
import { startFakeOpenRouter, type FakeOpenRouter } from './fake-openrouter'

interface StoredConversation {
  model: string
  messages: { role: string; content: string; status: string }[]
}

async function sendPrompt(page: Page, text: string): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
  await page.getByTestId('chat.composer.send').click()
}

async function launchWithKey(): Promise<{ shell: LaunchedShell; fake: FakeOpenRouter }> {
  const fake = await startFakeOpenRouter()
  const userDataDir = await mkdtemp(join(tmpdir(), 'app20-user-'))
  const shell = await launchShell({ openRouterEndpoint: fake.endpoint, userDataDir })
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()

  const keyFile = await writeKeyFile(userDataDir, 'provider-key.txt', 'sk-or-test-key')
  await stubOpenDialog(shell.app, [keyFile])
  await clickMenuItem(shell.app, 'Import Provider API Key...')
  await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
    'Provider API key imported',
  )
  return { shell, fake }
}

async function storedConversation(shell: LaunchedShell): Promise<StoredConversation> {
  await expect
    .poll(() => listConversationJsonFiles(shell.conversationDir).then((names) => names.length))
    .toBeGreaterThan(0)
  const names = await listConversationJsonFiles(shell.conversationDir)
  return readConversationJson<StoredConversation>(shell.conversationDir, names[0] as string)
}

test.beforeAll(() => {
  // This suite imports keys explicitly; never inherit another file's test key.
  delete process.env['APP20_TEST_PROVIDER_KEY']
})

test.describe('US1 - send a message and get a response', () => {
  test('streams a reply with the stored key and records the requested model', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ chunks: ['Hello', ' from OpenRouter'] })
      await sendPrompt(shell.page, 'What is 2+2?')
      await expect(shell.page.getByTestId('chat.action.regenerate')).toBeVisible()
      await expect(shell.page.getByText('Hello from OpenRouter')).toBeVisible()

      const request = fake.requests.at(-1)
      expect(request?.authorization).toBe('Bearer sk-or-test-key')
      expect(request?.body).toMatchObject({ model: 'openrouter/auto', stream: true })
      expect(JSON.stringify(request?.body)).toContain('What is 2+2?')

      const stored = await storedConversation(shell)
      expect(stored.model).toBe('openrouter/auto')
      expect(stored.messages.at(-1)?.content).toBe('Hello from OpenRouter')
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })

  test('reports a rejected key and keeps the prompt', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ status: 401 })
      await sendPrompt(shell.page, 'keep my prompt')

      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'The provider API key was rejected.',
      )
      await expect(shell.page.getByText('keep my prompt')).toBeVisible()
      await expect(shell.page.getByTestId('chat.action.retry')).toBeVisible()
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })
})

test.describe('US2 - see the response stream', () => {
  test('renders deltas as they arrive', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ chunks: ['First half', ' second half'], chunkDelayMs: 900 })
      await sendPrompt(shell.page, 'stream please')

      await expect(shell.page.getByText('First half', { exact: true })).toBeVisible()
      await expect(shell.page.getByText('First half second half', { exact: true })).toBeVisible()
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })

  test('keeps partial content when the user stops', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ chunks: ['Partial answer'], hold: true })
      await sendPrompt(shell.page, 'stop me')

      await expect(shell.page.getByText('Partial answer')).toBeVisible()
      await shell.page.getByTestId('chat.composer.stop').click()
      await expect(shell.page.getByTestId('chat.composer.stop')).toHaveCount(0)
      await expect(shell.page.getByText('Partial answer')).toBeVisible()

      const stored = await storedConversation(shell)
      expect(stored.messages.at(-1)?.content).toBe('Partial answer')
      expect(stored.messages.at(-1)?.status).toBe('stopped')
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })
})

test.describe('Edge cases', () => {
  test('keeps partial content and marks an error when the connection drops', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ chunks: ['Half an answer'], dropAfterChunks: 1 })
      await sendPrompt(shell.page, 'drop it')

      await expect(shell.page.getByText('Half an answer')).toBeVisible()
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'The provider could not be reached.',
      )
      await expect(shell.page.getByTestId('chat.action.retry')).toBeVisible()
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })

  test('stores an empty assistant message with complete status for an empty completion', async () => {
    const { shell, fake } = await launchWithKey()
    try {
      fake.setReply({ chunks: [] })
      await sendPrompt(shell.page, 'empty please')
      await expect(shell.page.getByTestId('chat.action.regenerate')).toBeVisible()

      const stored = await storedConversation(shell)
      const assistant = stored.messages.at(-1)
      expect(assistant?.role).toBe('assistant')
      expect(assistant?.content).toBe('')
      expect(assistant?.status).toBe('complete')
    } finally {
      await closeShell(shell)
      await fake.close()
    }
  })
})
