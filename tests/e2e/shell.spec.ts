import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import {
  clickMenuItem,
  closeShell,
  electronExecutable,
  forceExitShell,
  launchShell,
  listConversationFiles,
  listConversationJsonFiles,
  readConversationJson,
  readExternalOpens,
  readFolderReveals,
  recordExternalOpens,
  recordFolderReveals,
  spawnSecondInstance,
  stubOpenDialog,
  writeKeyFile,
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

interface StoredConversationFile {
  id: string
  title: string
  draft: string
  messages: { id: string; role: string; content: string; status: string }[]
}

const BRIDGE_METHODS = [
  'getAppVersion',
  'getConversationFolder',
  'getSecretsStatus',
  'getSyncStatus',
  'importProviderKey',
  'importS3Credentials',
  'removeSecret',
  'listConversations',
  'onChatChunk',
  'onChatComplete',
  'onCloseRequested',
  'onMenuCommand',
  'onSyncStatus',
  'openExternal',
  'readConversation',
  'reportCloseDecision',
  'revealConversationFolder',
  'saveConversation',
  'startChat',
  'stopChat',
]

async function makeDirty(page: Page, text = 'unsaved draft'): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
  await page.getByTestId('chat.composer.send').click()
  await expect(page.getByText(`Echo: ${text}`)).toBeVisible()
  await expect(page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')
}

async function triggerClose(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.close()
  })
}

test.describe('US1 - launch, isolation, links, single instance', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('opens to a chat screen with a composer', async () => {
    await expect(shell.page.getByTestId('shell.workspace-name')).toContainText(
      basename(shell.conversationDir),
    )
    await expect(shell.page.getByTestId('chat.composer.input')).toBeVisible()
    await expect(shell.page.getByTestId('chat.composer.send')).toBeVisible()
  })

  test('keeps the renderer isolated, applies the CSP, and exposes only named methods', async () => {
    const isolation = await shell.page.evaluate(() => {
      const scope = window as unknown as {
        require?: unknown
        process?: unknown
        appBridge: Record<string, unknown>
      }
      const csp = document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute('content')
      return {
        requireType: typeof scope.require,
        processType: typeof scope.process,
        invokeType: typeof scope.appBridge.invoke,
        methods: Object.keys(scope.appBridge).sort(),
        csp,
      }
    })

    expect(isolation.requireType).toBe('undefined')
    expect(isolation.processType).toBe('undefined')
    expect(isolation.invokeType).toBe('undefined')
    expect(isolation.methods).toEqual([...BRIDGE_METHODS].sort())
    expect(isolation.csp).toContain("default-src 'self'")
    expect(isolation.csp).toContain("object-src 'none'")
  })

  test('opens http links externally and refuses other schemes', async () => {
    await recordExternalOpens(shell.app)

    const allowed = await shell.page.evaluate(() =>
      window.appBridge.openExternal('https://example.com'),
    )
    const refused = await shell.page.evaluate(() =>
      window.appBridge.openExternal('javascript:alert(1)'),
    )

    expect(allowed.ok).toBe(true)
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.code).toBe('not-permitted')
    expect(await readExternalOpens(shell.app)).toEqual(['https://example.com/'])
  })

  test('a second launch focuses the existing window instead of opening another', async () => {
    const exitCode = await spawnSecondInstance(
      electronExecutable(shell.app),
      shell.userDataDir,
      shell.conversationDir,
    )
    expect(exitCode).toBe(0)
    await expect.poll(() => shell.app.windows().length).toBe(1)
  })

  test('closes cleanly with no prompt when nothing is unsaved', async () => {
    await triggerClose(shell.app)
    await expect.poll(() => shell.app.windows().length).toBe(0)
  })
})

test.describe('US3 - app-managed conversation folder', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('creates and uses the folder without asking, and never leaks its path', async () => {
    const name = await shell.page.getByTestId('shell.workspace-name').textContent()
    expect(name).toContain(basename(shell.conversationDir))
    expect(name).not.toContain(shell.conversationDir)

    const folder = await shell.page.evaluate(() => window.appBridge.getConversationFolder())
    expect(folder.ok).toBe(true)
    if (folder.ok) {
      expect(folder.value.displayName).toBe(basename(shell.conversationDir))
      expect(folder.value.id).toMatch(/^[0-9a-f]{16}$/)
    }
    expect(await shell.page.getByTestId('shell.folder-error').count()).toBe(0)
  })

  test('writes a JSON conversation file and restores it after a reload', async () => {
    await makeDirty(shell.page, 'save me')
    await shell.page.getByTestId('shell.save').click()
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Saved')

    const names = await listConversationJsonFiles(shell.conversationDir)
    expect(names.length).toBe(1)
    const stored = await readConversationJson<StoredConversationFile>(
      shell.conversationDir,
      names[0] as string,
    )
    expect(stored.messages.some((message) => message.content === 'save me')).toBe(true)

    await shell.page.reload()
    await expect(shell.page.getByText('Echo: save me')).toBeVisible()
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Saved')
  })

  test('restores an unsent draft after a reload', async () => {
    await shell.page.getByTestId('chat.composer.input').fill('draft survives')
    await shell.page.getByTestId('shell.save').click()
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Saved')

    await shell.page.reload()
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('draft survives')
  })
})

test.describe('US3 - content survives a real restart', () => {
  let first: LaunchedShell
  let second: LaunchedShell

  test('restores the last conversation after relaunch', async () => {
    first = await launchShell()
    try {
      await makeDirty(first.page, 'survives restart')
      await first.page.getByTestId('shell.save').click()
      await expect(first.page.getByTestId('shell.dirty')).toHaveText('Saved')

      await forceExitShell(first.app)

      second = await launchShell({
        userDataDir: first.userDataDir,
        conversationDir: first.conversationDir,
      })
      await expect(second.page.getByTestId('shell.folder-error')).toHaveCount(0)
      await expect(second.page.getByTestId('shell.workspace-name')).toContainText(
        basename(first.conversationDir),
      )
      await expect(second.page.getByText('Echo: survives restart')).toBeVisible()
    } finally {
      await closeShell(second)
      await closeShell(first)
    }
  })
})

test.describe('US3 - reveal the folder', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('opens the conversation folder from the menu', async () => {
    await recordFolderReveals(shell.app)
    await clickMenuItem(shell.app, 'Show Conversations Folder')

    await expect.poll(() => readFolderReveals(shell.app).then((paths) => paths.length)).toBe(1)
    const [revealed] = await readFolderReveals(shell.app)
    expect(revealed ? basename(revealed) : '').toBe(basename(shell.conversationDir))
  })
})

test.describe('US3 - an unreadable folder is reported', () => {
  let shell: LaunchedShell
  let blocker: string

  test.beforeAll(async () => {
    blocker = await mkdtemp(join(tmpdir(), 'app20-blocker-'))
    const file = join(blocker, 'not-a-folder')
    await writeFile(file, 'x')
    shell = await launchShell({ conversationDir: join(file, 'nested') })
  })

  test.afterAll(async () => {
    await closeShell(shell)
    await rm(blocker, { recursive: true, force: true }).catch(() => undefined)
  })

  test('reports the failure without leaking an absolute path', async () => {
    await expect(shell.page.getByTestId('shell.folder-error')).toBeVisible()
    const message = await shell.page.getByTestId('shell.folder-error').textContent()
    expect(message).toBe('The file could not be read.')
    expect(message).not.toContain(blocker)
    expect(message).not.toMatch(/[A-Za-z]:\\/)
  })
})

test.describe('US2 - close and quit confirmation', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('prompts on close and Cancel keeps the window open', async () => {
    await makeDirty(shell.page, 'close me')
    await triggerClose(shell.app)

    await expect(shell.page.getByTestId('shell.close-dialog')).toBeVisible()
    await shell.page.getByTestId('shell.close-cancel').click()
    await expect(shell.page.getByTestId('shell.close-dialog')).toHaveCount(0)
    expect(shell.app.windows().length).toBe(1)
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')
  })

  test('a failed save keeps the window open and the document dirty', async () => {
    await makeDirty(shell.page, 'fail save')
    await rm(shell.conversationDir, { recursive: true, force: true })
    await triggerClose(shell.app)

    await shell.page.getByTestId('shell.close-save').click()
    await expect(shell.page.getByTestId('shell.close-error')).toHaveText(
      'The file could not be read.',
    )
    await expect(shell.page.getByTestId('shell.close-dialog')).toBeVisible()
    expect(shell.app.windows().length).toBe(1)
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')

    await shell.page.getByTestId('shell.close-cancel').click()
    await expect(shell.page.getByTestId('shell.close-dialog')).toHaveCount(0)
  })

  test('prompts on quit and Cancel keeps the app running', async () => {
    await makeDirty(shell.page, 'quit me')
    await shell.app.evaluate(({ app }) => {
      app.quit()
    })

    await expect(shell.page.getByTestId('shell.close-dialog')).toBeVisible()
    await expect(shell.page.getByTestId('shell.close-dialog')).toContainText('Quit')
    await shell.page.getByTestId('shell.close-cancel').click()
    await expect(shell.page.getByTestId('shell.close-dialog')).toHaveCount(0)
    expect(shell.app.windows().length).toBe(1)
  })
})

test.describe('US2 - quit while streaming stops the response', () => {
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

  test('stops the in-flight response and keeps the unsaved document', async () => {
    await shell.page.getByTestId('chat.composer.input').fill('streaming quit')
    await shell.page.getByTestId('chat.composer.send').click()
    await expect(shell.page.getByTestId('chat.composer.stop')).toBeVisible()

    await shell.app.evaluate(({ app }) => {
      app.quit()
    })

    await expect(shell.page.getByTestId('shell.close-dialog')).toBeVisible()
    await shell.page.getByTestId('shell.close-cancel').click()
    await expect(shell.page.getByTestId('shell.close-dialog')).toHaveCount(0)
    await expect(shell.page.getByTestId('chat.composer.stop')).toHaveCount(0)
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')
  })
})

test.describe('US2 - Discard closes without saving', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('discards changes and exits when Discard is chosen', async () => {
    await makeDirty(shell.page, 'discard me')
    await triggerClose(shell.app)
    await shell.page.getByTestId('shell.close-discard').click()
    await expect.poll(() => shell.app.windows().length).toBe(0)
    expect(await listConversationFiles(shell.conversationDir)).toEqual([])
  })
})

test.describe('US2 - Save before close', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('saves the document then exits', async () => {
    await makeDirty(shell.page, 'save on close')
    await triggerClose(shell.app)
    await shell.page.getByTestId('shell.close-save').click()
    await expect.poll(() => shell.app.windows().length).toBe(0)

    const names = await listConversationJsonFiles(shell.conversationDir)
    expect(names.length).toBe(1)
    const stored = await readConversationJson<StoredConversationFile>(
      shell.conversationDir,
      names[0] as string,
    )
    expect(stored.messages.some((message) => message.content === 'save on close')).toBe(true)
  })
})

test.describe('US4 - menu bar and imports', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('provides reveal, import, and quit entries with accelerators', async () => {
    const menu = await shell.app.evaluate(({ Menu }) => {
      const applicationMenu = Menu.getApplicationMenu()
      return (applicationMenu?.items ?? []).map((item) => ({
        label: item.label,
        children: (item.submenu?.items ?? []).map((sub) => ({
          label: sub.label,
          accelerator: sub.accelerator,
        })),
      }))
    })

    const fileEntries = new Map(
      (menu.find((entry) => entry.label === 'File')?.children ?? []).map((entry) => [
        entry.label,
        entry.accelerator,
      ]),
    )
    const folderEntries = new Map(
      (menu.find((entry) => entry.label === 'Conversations')?.children ?? []).map((entry) => [
        entry.label,
        entry.accelerator,
      ]),
    )

    expect(fileEntries.has('Import Provider API Key...')).toBe(true)
    expect(fileEntries.has('Import S3 Credentials...')).toBe(true)
    expect(fileEntries.has('Remove Provider API Key')).toBe(true)
    expect(fileEntries.has('Remove S3 Credentials')).toBe(true)
    expect(fileEntries.has('Quit')).toBe(true)
    expect(folderEntries.has('Show Conversations Folder')).toBe(true)
    expect(folderEntries.has('New Conversation')).toBe(true)

    expect(fileEntries.get('Import Provider API Key...')).toBe('CmdOrCtrl+K')
    expect(folderEntries.get('Show Conversations Folder')).toBe('CmdOrCtrl+Shift+F')
    expect(fileEntries.get('Quit')).toBe('CmdOrCtrl+Q')
  })

  test('New Conversation saves the current document before starting fresh', async () => {
    await makeDirty(shell.page, 'menu new')
    await clickMenuItem(shell.app, 'New Conversation')
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('')
    await expect(shell.page.getByText('Echo: menu new')).toHaveCount(0)

    const names = await listConversationJsonFiles(shell.conversationDir)
    const saved = await Promise.all(
      names.map((name) =>
        readConversationJson<StoredConversationFile>(shell.conversationDir, name),
      ),
    )
    expect(saved.some((file) => file.messages.some((m) => m.content === 'menu new'))).toBe(true)
  })

  test('imports a provider key through the menu', async () => {
    const keyFile = await writeKeyFile(shell.userDataDir, 'provider-key.txt', 'sk-or-test-key')
    await stubOpenDialog(shell.app, [keyFile])

    await clickMenuItem(shell.app, 'Import Provider API Key...')
    await expect(shell.page.getByTestId('shell.notification.info').last()).toContainText(
      'Provider API key imported',
    )

    const status = await shell.page.evaluate(() => window.appBridge.getSecretsStatus())
    expect(status.ok).toBe(true)
    if (status.ok) expect(status.value.providerKey).toBe(true)
  })

  test('rejects a malformed credentials file without storing it', async () => {
    const badFile = await writeKeyFile(shell.userDataDir, 'bad-s3.json', '{"accessKeyId": 5}')
    await stubOpenDialog(shell.app, [badFile])

    await clickMenuItem(shell.app, 'Import S3 Credentials...')
    await expect(shell.page.getByTestId('shell.notification.error').last()).toContainText(
      'not a valid credential file',
    )

    const status = await shell.page.evaluate(() => window.appBridge.getSecretsStatus())
    expect(status.ok).toBe(true)
    if (status.ok) expect(status.value.s3).toBe(false)
  })
})
