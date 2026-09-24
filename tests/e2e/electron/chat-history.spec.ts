import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import {
  closeShell,
  forceExitShell,
  launchShell,
  listConversationJsonFiles,
  readConversationJson,
  type LaunchedShell,
} from './launch-shell'
import { startFakeOpenRouter, type FakeOpenRouter } from './fake-openrouter'

let fake: FakeOpenRouter

test.beforeAll(async () => {
  fake = await startFakeOpenRouter()
  process.env['APP20_OPENROUTER_ENDPOINT'] = fake.endpoint
  process.env['APP20_TEST_PROVIDER_KEY'] = 'sk-or-test-key'
})

test.afterAll(async () => {
  await fake.close()
  delete process.env['APP20_OPENROUTER_ENDPOINT']
  delete process.env['APP20_TEST_PROVIDER_KEY']
})

interface StoredConversation {
  id: string
  title: string
  messages: { id: string; role: string; content: string }[]
}

function conversationFile(options: {
  id: string
  title: string
  content: string
  updatedAt: string
  draft?: string
}): string {
  return JSON.stringify({
    id: options.id,
    title: options.title,
    model: 'openrouter/auto',
    createdAt: options.updatedAt,
    updatedAt: options.updatedAt,
    ...(options.draft === undefined ? {} : { draft: options.draft }),
    messages: [
      {
        id: `${options.id}-m1`,
        role: 'user',
        content: options.content,
        createdAt: options.updatedAt,
        status: 'complete',
      },
    ],
  })
}

async function launchSeeded(files: Record<string, string>): Promise<LaunchedShell> {
  const conversationDir = await mkdtemp(join(tmpdir(), 'app20-history-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(conversationDir, name), content)
  }
  const shell = await launchShell({ conversationDir })
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  return shell
}

async function openDrawer(page: Page): Promise<void> {
  await page.getByTestId('shell.history-toggle').click()
  await expect(page.getByTestId('chat.history.drawer')).toBeVisible()
}

test.describe('US1 - browse and resume a recent conversation', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchSeeded({
      // File names sort opposite to the dates, so an alphabetical listing would
      // fail the newest-first assertion.
      'conversation-z-newer.json': conversationFile({
        id: 'conversation-newer',
        title: 'Newer chat',
        content: 'newer message',
        updatedAt: '2026-09-10T12:00:00.000Z',
      }),
      'conversation-a-older.json': conversationFile({
        id: 'conversation-older',
        title: 'Older chat',
        content: 'older message',
        updatedAt: '2026-09-09T12:00:00.000Z',
        draft: 'older draft',
      }),
    })
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('lists newest first with title, model, and date', async () => {
    await expect(shell.page.getByText('newer message')).toBeVisible()
    await openDrawer(shell.page)

    const rows = shell.page.getByTestId('chat.history.entry')
    await expect(rows).toHaveCount(2)
    await expect(rows.first()).toContainText('Newer chat')
    await expect(rows.first()).toContainText('openrouter/auto')
    await expect(rows.first()).toContainText(/\d{4}-\d{2}-\d{2}/)
    await expect(rows.nth(1)).toContainText('Older chat')

    await shell.page.getByTestId('chat.history.scrim').click()
    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
  })

  test('resumes the selected conversation with its messages and draft', async () => {
    await openDrawer(shell.page)
    await shell.page.getByTestId('chat.history.entry').filter({ hasText: 'Older chat' }).click()

    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
    await expect(shell.page.getByText('older message')).toBeVisible()
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('older draft')

    await shell.page.getByTestId('chat.composer.input').fill('follow up')
    await shell.page.getByTestId('chat.composer.send').click()
    await expect(shell.page.getByText('Echo: follow up')).toBeVisible()
  })

  test('closes on the scrim without changing the conversation', async () => {
    await openDrawer(shell.page)
    await shell.page.getByTestId('chat.history.scrim').click()

    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
    await expect(shell.page.getByText('older message')).toBeVisible()
  })

  test('selecting the active conversation closes without reloading it', async () => {
    await openDrawer(shell.page)
    await shell.page.getByTestId('chat.history.entry').first().click()

    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
  })
})

test.describe('Edge - a blocked or unreadable switch keeps the current conversation', () => {
  const seeded = {
    'conversation-a.json': conversationFile({
      id: 'conversation-a',
      title: 'Target chat',
      content: 'target message',
      updatedAt: '2026-09-09T12:00:00.000Z',
    }),
    'conversation-b.json': conversationFile({
      id: 'conversation-b',
      title: 'Active chat',
      content: 'active message',
      updatedAt: '2026-09-10T12:00:00.000Z',
    }),
  }

  test('aborts the switch when the current conversation cannot be saved', async () => {
    const shell = await launchSeeded(seeded)
    try {
      await expect(shell.page.getByText('active message')).toBeVisible()
      await shell.page.getByTestId('chat.composer.input').fill('unsent draft')
      await openDrawer(shell.page)

      await rm(shell.conversationDir, { recursive: true, force: true })
      await shell.page.getByTestId('chat.history.entry').filter({ hasText: 'Target chat' }).click()

      await expect(shell.page.getByTestId('shell.notification.error').first()).toContainText(
        'Something went wrong',
      )
      await expect(shell.page.getByTestId('chat.history.drawer')).toBeVisible()
      await expect(shell.page.getByTestId('chat.message.conversation-b-m1')).toBeVisible()
      await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('unsent draft')
    } finally {
      await closeShell(shell)
    }
  })

  test('reports an unreadable target and keeps the current conversation', async () => {
    const shell = await launchSeeded(seeded)
    try {
      await expect(shell.page.getByText('active message')).toBeVisible()
      await openDrawer(shell.page)

      await rm(join(shell.conversationDir, 'conversation-a.json'), { force: true })
      await shell.page.getByTestId('chat.history.entry').filter({ hasText: 'Target chat' }).click()

      await expect(shell.page.getByTestId('shell.notification.error').first()).toContainText(
        'could not be found',
      )
      await expect(shell.page.getByTestId('chat.history.drawer')).toBeVisible()
      await expect(shell.page.getByTestId('chat.message.conversation-b-m1')).toBeVisible()
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('US2 - start a new conversation from the drawer', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('clears the composer and persists the previous conversation', async () => {
    await shell.page.getByTestId('chat.composer.input').fill('keep me')
    await shell.page.getByTestId('chat.composer.send').click()
    await expect(shell.page.getByText('Echo: keep me')).toBeVisible()

    await openDrawer(shell.page)
    await shell.page.getByTestId('chat.history.new').click()

    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('')
    await expect(shell.page.getByText('Echo: keep me')).toHaveCount(0)

    const names = await listConversationJsonFiles(shell.conversationDir)
    const saved = await Promise.all(
      names.map((name) => readConversationJson<StoredConversation>(shell.conversationDir, name)),
    )
    expect(saved.some((file) => file.messages.some((m) => m.content === 'keep me'))).toBe(true)

    await openDrawer(shell.page)
    await expect(shell.page.getByTestId('chat.history.entry')).toHaveCount(1)
  })
})

test.describe('US3 - empty, untitled, and unreadable entries', () => {
  test('shows an empty state with no error when there are no conversations', async () => {
    const shell = await launchSeeded({})
    try {
      await openDrawer(shell.page)
      await expect(shell.page.getByTestId('chat.history.empty')).toContainText(
        'No conversations yet.',
      )
      await expect(shell.page.getByTestId('shell.notification.error')).toHaveCount(0)
    } finally {
      await closeShell(shell)
    }
  })

  test('renders an untitled placeholder for a blank title', async () => {
    const shell = await launchSeeded({
      'conversation-blank.json': conversationFile({
        id: 'conversation-blank',
        title: '',
        content: 'no title',
        updatedAt: '2026-09-10T12:00:00.000Z',
      }),
    })
    try {
      await openDrawer(shell.page)
      await expect(shell.page.getByTestId('chat.history.entry')).toContainText('Untitled')
    } finally {
      await closeShell(shell)
    }
  })

  test('reports a corrupt file and leaves the other entries selectable', async () => {
    const shell = await launchSeeded({
      'conversation-broken.json': '{ not json',
      'conversation-live.json': conversationFile({
        id: 'conversation-live',
        title: 'Live chat',
        content: 'live message',
        updatedAt: '2026-09-10T12:00:00.000Z',
      }),
    })
    try {
      await openDrawer(shell.page)
      await expect(shell.page.getByTestId('shell.notification.error').first()).toContainText(
        'could not be read',
      )

      const live = shell.page.getByTestId('chat.history.entry').filter({ hasText: 'Live chat' })
      await expect(live).toBeVisible()
      await live.click()
      await expect(shell.page.getByText('live message')).toBeVisible()
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('Edge - the drawer does not interrupt a response', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    fake.setReply({ chunks: ['streaming partial'], hold: true })
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    fake.reset()
    await closeShell(shell)
  })

  test('keeps streaming while the drawer opens and closes', async () => {
    await shell.page.getByTestId('chat.composer.input').fill('streaming history')
    await shell.page.getByTestId('chat.composer.send').click()
    await expect(shell.page.getByTestId('chat.composer.stop')).toBeVisible()

    await openDrawer(shell.page)
    await shell.page.getByTestId('chat.history.scrim').click()

    await expect(shell.page.getByTestId('chat.history.drawer')).toHaveCount(0)
    await expect(shell.page.getByTestId('chat.composer.stop')).toBeVisible()
    await expect(shell.page.getByText('streaming partial')).toBeVisible()

    await forceExitShell(shell.app)
  })
})
