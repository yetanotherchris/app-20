import { rm } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import {
  clickMenuItem,
  closeShell,
  forceExitShell,
  launchShell,
  listConversationJsonFiles,
  readConversationJson,
  stubOpenDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'
import { FAKE_S3_ACCESS_KEY, FAKE_S3_SECRET_KEY, startFakeS3, type FakeS3 } from './fake-s3'

interface TestConversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  messages: []
}

function sample(id: string, updatedAt: string, title = id): TestConversation {
  return {
    id,
    title,
    model: 'openrouter/auto',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    messages: [],
  }
}

let fake: FakeS3

test.beforeAll(() => {
  // This suite configures sync explicitly; never inherit another file's test key.
  delete process.env['APP20_TEST_PROVIDER_KEY']
})

test.beforeEach(async () => {
  fake = await startFakeS3()
})

test.afterEach(async () => {
  await fake.close()
})

async function openShell(): Promise<LaunchedShell> {
  const shell = await launchShell()
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  return shell
}

async function importCreds(shell: LaunchedShell, endpoint: string): Promise<void> {
  const content = JSON.stringify({
    accessKeyId: FAKE_S3_ACCESS_KEY,
    secretAccessKey: FAKE_S3_SECRET_KEY,
    bucket: fake.bucket,
    region: 'us-east-1',
    endpoint,
  })
  const file = await writeKeyFile(shell.userDataDir, 's3.json', content)
  await stubOpenDialog(shell.app, [file])
  await clickMenuItem(shell.app, 'Import S3 Credentials...')
  await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
    'S3 credentials imported',
  )
}

async function saveConversation(page: Page, conversation: TestConversation): Promise<void> {
  const result = await page.evaluate(
    (value) => window.appBridge.saveConversation(value),
    conversation,
  )
  if (!result.ok) throw new Error(`save failed: ${result.code}`)
}

async function status(page: Page): Promise<string> {
  const result = await page.evaluate(() => window.appBridge.getSyncStatus())
  if (!result.ok) throw new Error('sync status failed')
  return result.value.state
}

test.describe('US1 - sync conversations to the cloud', () => {
  test('uploads a saved conversation and reports synced', async () => {
    const shell = await openShell()
    try {
      await importCreds(shell, fake.endpoint)
      const id = 'conv-upload'
      await saveConversation(shell.page, sample(id, '2026-02-01T00:00:00.000Z', 'uploaded'))

      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .not.toBeNull()
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })
      expect(await status(shell.page)).toBe('idle')
    } finally {
      await closeShell(shell)
    }
  })

  test('stays off when unconfigured and still saves locally', async () => {
    const shell = await openShell()
    try {
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Sync off')
      const id = 'conv-local'
      await saveConversation(shell.page, sample(id, '2026-02-01T00:00:00.000Z'))

      const stored = await readConversationJson<TestConversation>(
        shell.conversationDir,
        `${id}.json`,
      )
      expect(stored.id).toBe(id)
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Sync off')
      expect(await fake.listKeys()).toHaveLength(0)
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('US2 - restore newer remote content on startup', () => {
  test('downloads a newer remote conversation on startup', async () => {
    const first = await openShell()
    let second: LaunchedShell | undefined
    try {
      await importCreds(first, fake.endpoint)
      const id = 'conv-remote-newer'
      await saveConversation(first.page, sample(id, '2026-02-01T00:00:00.000Z', 'local title'))
      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .not.toBeNull()
      await expect(first.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })
      await forceExitShell(first.app)

      await fake.putText(
        `conversations/${id}.json`,
        JSON.stringify(sample(id, '2026-03-01T00:00:00.000Z', 'remote title')),
      )

      second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      await expect(second.page.getByTestId('shell.topbar')).toBeVisible()
      await expect(second.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })

      const stored = await readConversationJson<TestConversation>(
        first.conversationDir,
        `${id}.json`,
      )
      expect(stored.updatedAt).toBe('2026-03-01T00:00:00.000Z')
      expect(stored.title).toBe('remote title')
    } finally {
      await closeShell(second)
      await closeShell(first)
    }
  })

  test('keeps a locally newer conversation and uploads it instead', async () => {
    const first = await openShell()
    let second: LaunchedShell | undefined
    try {
      await importCreds(first, fake.endpoint)
      const id = 'conv-local-newer'
      await saveConversation(first.page, sample(id, '2026-03-01T00:00:00.000Z', 'new local'))
      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .not.toBeNull()
      await forceExitShell(first.app)

      await fake.putText(
        `conversations/${id}.json`,
        JSON.stringify(sample(id, '2026-02-01T00:00:00.000Z', 'old remote')),
      )

      second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      await expect(second.page.getByTestId('shell.topbar')).toBeVisible()

      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .toContain('2026-03-01T00:00:00.000Z')
      const stored = await readConversationJson<TestConversation>(
        first.conversationDir,
        `${id}.json`,
      )
      expect(stored.title).toBe('new local')
    } finally {
      await closeShell(second)
      await closeShell(first)
    }
  })

  test('re-creates a locally deleted conversation from the bucket', async () => {
    const first = await openShell()
    let second: LaunchedShell | undefined
    try {
      await importCreds(first, fake.endpoint)
      const id = 'conv-deleted'
      await saveConversation(first.page, sample(id, '2026-02-01T00:00:00.000Z'))
      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .not.toBeNull()
      await forceExitShell(first.app)

      // Simulate a local deletion; beta does not propagate deletions.
      await expect(listConversationJsonFiles(first.conversationDir)).resolves.toContain(
        `${id}.json`,
      )
      await rm(`${first.conversationDir}/${id}.json`, { force: true })

      second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      await expect(second.page.getByTestId('shell.topbar')).toBeVisible()
      await expect(second.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })

      const restored = await listConversationJsonFiles(first.conversationDir)
      expect(restored).toContain(`${id}.json`)
    } finally {
      await closeShell(second)
      await closeShell(first)
    }
  })

  test('skips a corrupt remote object and still starts', async () => {
    const first = await openShell()
    let second: LaunchedShell | undefined
    try {
      await importCreds(first, fake.endpoint)
      await forceExitShell(first.app)
      await fake.putText('conversations/bad.json', 'not json at all')

      second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      await expect(second.page.getByTestId('shell.topbar')).toBeVisible()
      await expect(second.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })

      const listed = await second.page.evaluate(() => window.appBridge.listConversations())
      expect(listed.ok).toBe(true)
      if (listed.ok) {
        expect(listed.value.entries.some((entry) => entry.fileName === 'bad.json')).toBe(false)
      }
      expect(await listConversationJsonFiles(first.conversationDir)).not.toContain('bad.json')
    } finally {
      await closeShell(second)
      await closeShell(first)
    }
  })

  test('keeps a save made while sync is failing and uploads it once credentials work', async () => {
    const shell = await openShell()
    try {
      await importCreds(shell, 'http://127.0.0.1:1')
      const id = 'conv-recover'
      await saveConversation(shell.page, sample(id, '2026-02-01T00:00:00.000Z'))
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Sync pending', {
        timeout: 20_000,
      })

      // Fix the endpoint and save again; the queued local change propagates.
      await importCreds(shell, fake.endpoint)
      await saveConversation(shell.page, sample(id, '2026-02-02T00:00:00.000Z', 'recovered'))

      await expect
        .poll(() => fake.getText(`conversations/${id}.json`), { timeout: 20_000 })
        .toContain('recovered')
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Synced', {
        timeout: 20_000,
      })
    } finally {
      await closeShell(shell)
    }
  })

  test('reports a rejected credential as sync failed without losing local data', async () => {
    const shell = await openShell()
    try {
      const content = JSON.stringify({
        accessKeyId: 'NOT-A-KEY',
        secretAccessKey: 'nope',
        bucket: fake.bucket,
        region: 'us-east-1',
        endpoint: fake.endpoint,
      })
      const file = await writeKeyFile(shell.userDataDir, 's3-bad.json', content)
      await stubOpenDialog(shell.app, [file])
      await clickMenuItem(shell.app, 'Import S3 Credentials...')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'S3 credentials imported',
      )

      const id = 'conv-rejected'
      await saveConversation(shell.page, sample(id, '2026-02-01T00:00:00.000Z'))
      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Sync failed', {
        timeout: 40_000,
      })
      const stored = await readConversationJson<TestConversation>(
        shell.conversationDir,
        `${id}.json`,
      )
      expect(stored.id).toBe(id)
    } finally {
      await closeShell(shell)
    }
  })

  test('reports a failed sync and leaves local data intact', async () => {
    const shell = await openShell()
    try {
      await importCreds(shell, 'http://127.0.0.1:1')
      const id = 'conv-fail'
      await saveConversation(shell.page, sample(id, '2026-02-01T00:00:00.000Z'))

      await expect(shell.page.getByTestId('shell.sync-status')).toHaveText('Sync failed', {
        timeout: 40_000,
      })
      const stored = await readConversationJson<TestConversation>(
        shell.conversationDir,
        `${id}.json`,
      )
      expect(stored.id).toBe(id)
    } finally {
      await closeShell(shell)
    }
  })
})
