import { test, expect } from '@playwright/test'
import {
  closeShell,
  launchShell,
  readOpenDialogCalls,
  stubCancelledOpenDialog,
  stubOpenDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'
import { startFakeOpenRouter, type FakeOpenRouter } from './fake-openrouter'

let fake: FakeOpenRouter

test.beforeAll(async () => {
  delete process.env['APP20_TEST_PROVIDER_KEY']
  fake = await startFakeOpenRouter()
})

test.afterAll(async () => {
  await fake.close()
})

async function launch(openRouterApiKey?: string): Promise<LaunchedShell> {
  const shell = await launchShell({ openRouterEndpoint: fake.endpoint, openRouterApiKey })
  await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  return shell
}

async function sendPrompt(shell: LaunchedShell, prompt: string): Promise<void> {
  await shell.page.getByTestId('chat.composer.input').fill(prompt)
  await shell.page.getByTestId('chat.composer.send').click()
}

async function providerKeyAvailable(shell: LaunchedShell): Promise<boolean> {
  const status = await shell.page.evaluate(() => window.appBridge.getSecretsStatus())
  return status.ok && status.value.providerKey
}

test.describe('US1 - import the key at first send', () => {
  test('imports before sending and continues the initial prompt', async () => {
    const shell = await launch()
    try {
      const keyFile = await writeKeyFile(shell.userDataDir, 'provider-key.txt', 'sk-or-gated')
      await stubOpenDialog(shell.app, [keyFile])

      fake.reset()
      await sendPrompt(shell, 'send after import')
      await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
        'Provider API key imported.',
      )
      await expect.poll(() => providerKeyAvailable(shell)).toBe(true)
      await expect(shell.page.getByText('Echo: send after import')).toBeVisible()
      expect(fake.requests.at(-1)?.authorization).toBe('Bearer sk-or-gated')
    } finally {
      await closeShell(shell)
    }
  })

  test('aborts a cancelled import and retains the draft', async () => {
    const shell = await launch()
    try {
      await stubCancelledOpenDialog(shell.app)

      fake.reset()
      await sendPrompt(shell, 'keep this draft')
      await expect.poll(() => readOpenDialogCalls(shell.app)).toBe(1)
      await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('keep this draft')
      expect(fake.requests).toHaveLength(0)
    } finally {
      await closeShell(shell)
    }
  })
})

test.describe('US2 - available keys skip the gate', () => {
  test('sends with an already stored key without opening the chooser', async () => {
    const shell = await launch()
    try {
      const keyFile = await writeKeyFile(shell.userDataDir, 'provider-key.txt', 'sk-or-stored')
      await stubOpenDialog(shell.app, [keyFile])
      await shell.page.evaluate(async () => window.appBridge.importProviderKey())
      await stubCancelledOpenDialog(shell.app)

      fake.reset()
      await sendPrompt(shell, 'stored key')
      await expect(shell.page.getByText('Echo: stored key')).toBeVisible()
      expect(await readOpenDialogCalls(shell.app)).toBe(0)
      expect(fake.requests.at(-1)?.authorization).toBe('Bearer sk-or-stored')
    } finally {
      await closeShell(shell)
    }
  })

  test('sends with an environment key without opening the chooser', async () => {
    const shell = await launch('sk-or-environment')
    try {
      await stubCancelledOpenDialog(shell.app)

      fake.reset()
      await sendPrompt(shell, 'environment key')
      await expect(shell.page.getByText('Echo: environment key')).toBeVisible()
      expect(await readOpenDialogCalls(shell.app)).toBe(0)
      expect(fake.requests.at(-1)?.authorization).toBe('Bearer sk-or-environment')
    } finally {
      await closeShell(shell)
    }
  })
})
