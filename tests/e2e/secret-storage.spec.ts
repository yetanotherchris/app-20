import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import {
  clickMenuItem,
  closeShell,
  launchShell,
  stubOpenDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'
import { startFakeOpenRouter, type FakeOpenRouter } from './fake-openrouter'

let fake: FakeOpenRouter

test.beforeAll(async () => {
  // This suite imports secrets explicitly; never inherit another file's test key.
  delete process.env['APP20_TEST_PROVIDER_KEY']
  fake = await startFakeOpenRouter()
})

test.afterAll(async () => {
  await fake.close()
})

async function launch(): Promise<LaunchedShell> {
  const shell = await launchShell({ openRouterEndpoint: fake.endpoint })
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  return shell
}

async function importFile(
  shell: LaunchedShell,
  label: string,
  name: string,
  content: string,
): Promise<void> {
  const file = await writeKeyFile(shell.userDataDir, name, content)
  await stubOpenDialog(shell.app, [file])
  await clickMenuItem(shell.app, label)
}

async function secretStatus(shell: LaunchedShell): Promise<{ providerKey: boolean; s3: boolean }> {
  const result = await shell.page.evaluate(() => window.appBridge.getSecretsStatus())
  if (!result.ok) throw new Error('secrets status failed')
  return result.value
}

async function sendPrompt(page: Page, text: string): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
  await page.getByTestId('chat.composer.send').click()
}

test.describe('US1 - import the AI provider key', () => {
  test('stores a key and uses it for the next request', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import Provider API Key...', 'provider-key.txt', 'sk-or-key-one')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'Provider API key imported',
      )
      expect((await secretStatus(shell)).providerKey).toBe(true)

      // The secret file lives outside the conversation workspace and is not
      // plaintext, and the key never reaches the rendered document (FR-002, FR-005).
      const rawSecrets = await readFile(join(shell.userDataDir, 'secrets.json'), 'utf8')
      expect(rawSecrets).not.toContain('sk-or-key-one')
      expect(existsSync(join(shell.conversationDir, 'secrets.json'))).toBe(false)
      expect(await shell.page.content()).not.toContain('sk-or-key-one')

      fake.reset()
      await sendPrompt(shell.page, 'use the imported key')
      await expect(shell.page.getByText('Echo: use the imported key')).toBeVisible()
      expect(fake.requests.at(-1)?.authorization).toBe('Bearer sk-or-key-one')
    } finally {
      await closeShell(shell)
    }
  })

  test('re-import replaces the stored key', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import Provider API Key...', 'provider-key.txt', 'sk-or-key-one')
      await expect(shell.page.getByTestId('shell.notification.info')).toHaveCount(1)
      await importFile(shell, 'Import Provider API Key...', 'provider-key.txt', 'sk-or-key-two')
      await expect(shell.page.getByTestId('shell.notification.info')).toHaveCount(2)

      fake.reset()
      await sendPrompt(shell.page, 'use the new key')
      await expect(shell.page.getByText('Echo: use the new key')).toBeVisible()
      expect(fake.requests.at(-1)?.authorization).toBe('Bearer sk-or-key-two')
    } finally {
      await closeShell(shell)
    }
  })

  test('rejects a malformed key file without storing it', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import Provider API Key...', 'bad-key.txt', 'line one\nline two')
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'not a valid credential file',
      )
      expect((await secretStatus(shell)).providerKey).toBe(false)
    } finally {
      await closeShell(shell)
    }
  })

  test('rejects a file that carries more than one secret', async () => {
    const shell = await launch()
    try {
      await importFile(
        shell,
        'Import Provider API Key...',
        'many.json',
        JSON.stringify({ providerKey: 'sk-or', accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
      )
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'more than one kind of secret',
      )
      expect((await secretStatus(shell)).providerKey).toBe(false)
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('US2 - import S3 credentials', () => {
  test('stores a valid credential pair', async () => {
    const shell = await launch()
    try {
      await importFile(
        shell,
        'Import S3 Credentials...',
        's3.json',
        JSON.stringify({ accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
      )
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'S3 credentials imported',
      )
      expect((await secretStatus(shell)).s3).toBe(true)
    } finally {
      await closeShell(shell)
    }
  })

  test('rejects a malformed credentials file without storing it', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import S3 Credentials...', 'bad-s3.json', '{"accessKeyId": 5}')
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'not a valid credential file',
      )
      expect((await secretStatus(shell)).s3).toBe(false)
    } finally {
      await closeShell(shell)
    }
  })

  test('re-import replaces the stored credentials', async () => {
    const shell = await launch()
    try {
      await importFile(
        shell,
        'Import S3 Credentials...',
        's3.json',
        JSON.stringify({ accessKeyId: 'AKIAONE', secretAccessKey: 'secret-one' }),
      )
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'S3 credentials imported',
      )
      const first = await readFile(join(shell.userDataDir, 'secrets.json'), 'utf8')

      await importFile(
        shell,
        'Import S3 Credentials...',
        's3.json',
        JSON.stringify({ accessKeyId: 'AKIATWO', secretAccessKey: 'secret-two' }),
      )
      await expect(shell.page.getByTestId('shell.notification.info')).toHaveCount(2)
      const second = await readFile(join(shell.userDataDir, 'secrets.json'), 'utf8')
      expect(second).not.toBe(first)
      expect((await secretStatus(shell)).s3).toBe(true)
    } finally {
      await closeShell(shell)
    }
  })

  test('rejects a file larger than the size cap', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import Provider API Key...', 'big-key.txt', 'x'.repeat(70 * 1024))
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'not a valid credential file',
      )
      expect((await secretStatus(shell)).providerKey).toBe(false)
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('US3 - remove a stored secret', () => {
  test('removing the provider key makes the next send fail with the missing-key error', async () => {
    const shell = await launch()
    try {
      await importFile(shell, 'Import Provider API Key...', 'provider-key.txt', 'sk-or-key-one')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'Provider API key imported',
      )

      await clickMenuItem(shell.app, 'Remove Provider API Key')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'Provider API key removed',
      )
      expect((await secretStatus(shell)).providerKey).toBe(false)

      fake.reset()
      await sendPrompt(shell.page, 'after removal')
      await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
        'No provider API key is stored',
      )
      expect(fake.requests).toHaveLength(0)
    } finally {
      await closeShell(shell)
    }
  })

  test('removing S3 credentials clears the status', async () => {
    const shell = await launch()
    try {
      await importFile(
        shell,
        'Import S3 Credentials...',
        's3.json',
        JSON.stringify({ accessKeyId: 'AKIA', secretAccessKey: 'secret' }),
      )
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'S3 credentials imported',
      )

      await clickMenuItem(shell.app, 'Remove S3 Credentials')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'S3 credentials removed',
      )
      expect((await secretStatus(shell)).s3).toBe(false)
    } finally {
      await closeShell(shell)
    }
  })

  test('removing an absent secret succeeds', async () => {
    const shell = await launch()
    try {
      await clickMenuItem(shell.app, 'Remove Provider API Key')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'Provider API key removed',
      )
      expect((await secretStatus(shell)).providerKey).toBe(false)

      const result = await shell.page.evaluate(() => window.appBridge.removeSecret('provider-key'))
      expect(result).toEqual({ ok: true, value: { kind: 'provider-key' } })
    } finally {
      await closeShell(shell)
    }
  })

  test('refuses an unknown secret kind over IPC', async () => {
    const shell = await launch()
    try {
      const result = await shell.page.evaluate(() =>
        window.appBridge.removeSecret('token' as never),
      )
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('invalid-secret')
    } finally {
      await closeShell(shell)
    }
  })
})
