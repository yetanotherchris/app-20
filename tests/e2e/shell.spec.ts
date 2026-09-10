import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import {
  closeShell,
  electronExecutable,
  forceExitShell,
  launchShell,
  listWorkspaceFiles,
  readExternalOpens,
  readSettings,
  readWorkspaceJson,
  recordExternalOpens,
  seedSettings,
  spawnSecondInstance,
  stubOpenDialog,
  stubSaveDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'

interface StoredConversationFile {
  id: string
  title: string
  draft: string
  messages: { id: string; role: string; content: string; status: string }[]
}

const BRIDGE_METHODS = [
  'chooseWorkspace',
  'createWorkspace',
  'getAppVersion',
  'getSecretsStatus',
  'getWorkspace',
  'importProviderKey',
  'importS3Credentials',
  'listWorkspaceFiles',
  'onCloseRequested',
  'onMenuCommand',
  'openExternal',
  'readWorkspaceFile',
  'reportCloseDecision',
  'writeWorkspaceFile',
]

async function openWorkspace(shell: LaunchedShell): Promise<void> {
  await stubOpenDialog(shell.app, [shell.workspaceDir])
  await expect(shell.page.getByTestId('shell.onboarding')).toBeVisible()
  await shell.page.getByTestId('shell.choose-workspace').click()
  await expect(shell.page.getByTestId('shell.workspace-name')).toContainText(
    basename(shell.workspaceDir),
  )
}

async function makeDirty(page: Page, text = 'unsaved draft'): Promise<void> {
  await page.getByTestId('chat.composer.input').fill(text)
  await page.getByTestId('chat.composer.send').click()
  await expect(page.getByText(`Local echo: ${text}`)).toBeVisible()
  await expect(page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')
}

async function triggerClose(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.close()
  })
}

async function clickMenuItem(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ Menu }, target) => {
    type Item = { label?: string; submenu?: { items: Item[] } | null; click?: () => void }
    const flatten = (items: Item[]): Item[] =>
      items.flatMap((item) => [item, ...(item.submenu ? flatten(item.submenu.items) : [])])
    const items = flatten((Menu.getApplicationMenu()?.items ?? []) as unknown as Item[])
    items.find((item) => item.label === target)?.click?.()
  }, label)
}

test.describe('US1 - launch, isolation, links, single instance', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('opens to a chat screen with a composer', async () => {
    await expect(shell.page.getByTestId('shell.workspace-name')).toBeVisible()
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
    const exitCode = await spawnSecondInstance(electronExecutable(shell.app), shell.userDataDir)
    expect(exitCode).toBe(0)
    await expect.poll(() => shell.app.windows().length).toBe(1)
  })

  test('closes cleanly with no prompt when nothing is unsaved', async () => {
    await triggerClose(shell.app)
    await expect.poll(() => shell.app.windows().length).toBe(0)
  })
})

test.describe('US3 - workspace folder and persistence', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('shows only the workspace display name, never the absolute path', async () => {
    const name = await shell.page.getByTestId('shell.workspace-name').textContent()
    expect(name).not.toContain(shell.workspaceDir)

    const workspace = await shell.page.evaluate(() => window.appBridge.getWorkspace())
    expect(workspace.ok).toBe(true)
    if (workspace.ok && workspace.value) {
      expect(workspace.value.displayName).toBe(basename(shell.workspaceDir))
      expect(workspace.value.id).toMatch(/^[0-9a-f]{16}$/)
    }
  })

  test('writes a JSON conversation file and restores it after a reload', async () => {
    await makeDirty(shell.page, 'save me')
    await shell.page.getByTestId('shell.save').click()
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Saved')

    const names = (await listWorkspaceFiles(shell.workspaceDir)).filter((name) =>
      name.endsWith('.json'),
    )
    expect(names.length).toBe(1)
    const stored = await readWorkspaceJson<StoredConversationFile>(
      shell.workspaceDir,
      names[0] as string,
    )
    expect(stored.messages.some((message) => message.content === 'save me')).toBe(true)

    await shell.page.reload()
    await expect(shell.page.getByText('Local echo: save me')).toBeVisible()
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

test.describe('US3 - the choice and content survive a real restart', () => {
  let first: LaunchedShell
  let second: LaunchedShell

  test.afterAll(async () => {
    await closeShell(second)
    await rm(first.userDataDir, { recursive: true, force: true }).catch(() => undefined)
  })

  test('restores the workspace and last conversation after relaunch', async () => {
    first = await launchShell()
    await openWorkspace(first)
    await makeDirty(first.page, 'survives restart')
    await first.page.getByTestId('shell.save').click()
    await expect(first.page.getByTestId('shell.dirty')).toHaveText('Saved')

    await forceExitShell(first.app)

    second = await launchShell({ userDataDir: first.userDataDir, workspaceDir: first.workspaceDir })
    await expect(second.page.getByTestId('shell.onboarding')).toHaveCount(0)
    await expect(second.page.getByTestId('shell.workspace-name')).toContainText(
      basename(first.workspaceDir),
    )
    await expect(second.page.getByText('Local echo: survives restart')).toBeVisible()
  })
})

test.describe('US3 - create a workspace folder', () => {
  let shell: LaunchedShell
  let created: string

  test.beforeAll(async () => {
    shell = await launchShell()
  })

  test.afterAll(async () => {
    await closeShell(shell)
    if (created) await rm(created, { recursive: true, force: true }).catch(() => undefined)
  })

  test('creates and remembers the chosen folder', async () => {
    created = join(await mkdtemp(join(tmpdir(), 'app20-create-')), 'new-workspace')
    await stubSaveDialog(shell.app, created)
    await expect(shell.page.getByTestId('shell.onboarding')).toBeVisible()
    await shell.page.getByTestId('shell.create-workspace').click()
    await expect(shell.page.getByTestId('shell.workspace-name')).toContainText('new-workspace')

    const settings = await readSettings(shell.userDataDir)
    expect(settings.workspacePath).toBeTruthy()
  })
})

test.describe('US3 - an unreadable workspace is reported', () => {
  let shell: LaunchedShell
  let userDataDir: string

  test.beforeAll(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'app20-bad-user-'))
    await seedSettings(userDataDir, { workspacePath: join(userDataDir, 'does-not-exist') })
    shell = await launchShell({ userDataDir })
  })

  test.afterAll(async () => {
    await closeShell(shell)
    await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
  })

  test('reports the failure without leaking an absolute path and clears the setting', async () => {
    await expect(shell.page.getByTestId('shell.onboarding')).toBeVisible()
    const message = await shell.page.getByTestId('shell.onboarding-error').textContent()
    expect(message).toBe('The file could not be read.')
    expect(message).not.toContain(userDataDir)
    expect(message).not.toMatch(/[A-Za-z]:\\/)
    expect(await readSettings(userDataDir)).toEqual({})
  })
})

test.describe('US2 - close and quit confirmation', () => {
  test.describe.configure({ mode: 'serial' })
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
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
    await rm(shell.workspaceDir, { recursive: true, force: true })
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
    shell = await launchShell({ streamDelayMs: 5000 })
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
  })

  test.afterAll(async () => {
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
    // stop() ran on the close request, so the composer is idle again.
    await expect(shell.page.getByTestId('chat.composer.stop')).toHaveCount(0)
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Unsaved changes')
  })
})

test.describe('US2 - Discard closes without saving', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('discards changes and exits when Discard is chosen', async () => {
    await makeDirty(shell.page, 'discard me')
    await triggerClose(shell.app)
    await shell.page.getByTestId('shell.close-discard').click()
    await expect.poll(() => shell.app.windows().length).toBe(0)
    expect(await listWorkspaceFiles(shell.workspaceDir)).toEqual([])
  })
})

test.describe('US2 - Save before close', () => {
  let shell: LaunchedShell

  test.beforeAll(async () => {
    shell = await launchShell()
    await expect(shell.page.getByTestId('shell.topbar')).toBeVisible()
    await openWorkspace(shell)
  })

  test.afterAll(async () => {
    await closeShell(shell)
  })

  test('saves the document then exits', async () => {
    await makeDirty(shell.page, 'save on close')
    await triggerClose(shell.app)
    await shell.page.getByTestId('shell.close-save').click()
    await expect.poll(() => shell.app.windows().length).toBe(0)

    const names = (await listWorkspaceFiles(shell.workspaceDir)).filter((name) =>
      name.endsWith('.json'),
    )
    expect(names.length).toBe(1)
    const stored = await readWorkspaceJson<StoredConversationFile>(
      shell.workspaceDir,
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

  test('provides workspace, import, and quit entries with accelerators', async () => {
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
    const workspaceEntries = new Map(
      (menu.find((entry) => entry.label === 'Workspace')?.children ?? []).map((entry) => [
        entry.label,
        entry.accelerator,
      ]),
    )

    expect(fileEntries.has('Import Provider API Key...')).toBe(true)
    expect(fileEntries.has('Import S3 Credentials...')).toBe(true)
    expect(fileEntries.has('Quit')).toBe(true)
    expect(workspaceEntries.has('Open Workspace Folder...')).toBe(true)
    expect(workspaceEntries.has('Create Workspace Folder...')).toBe(true)

    expect(fileEntries.get('Import Provider API Key...')).toBe('CmdOrCtrl+K')
    expect(workspaceEntries.get('Open Workspace Folder...')).toBe('CmdOrCtrl+O')
    expect(fileEntries.get('Quit')).toBe('CmdOrCtrl+Q')
  })

  test('opens a workspace from the menu', async () => {
    await stubOpenDialog(shell.app, [shell.workspaceDir])
    await clickMenuItem(shell.app, 'Open Workspace Folder...')
    await expect(shell.page.getByTestId('shell.workspace-name')).toContainText(
      basename(shell.workspaceDir),
    )
  })

  test('New Conversation saves the current document before starting fresh', async () => {
    await makeDirty(shell.page, 'menu new')
    await clickMenuItem(shell.app, 'New Conversation')
    await expect(shell.page.getByTestId('chat.composer.input')).toHaveValue('')
    await expect(shell.page.getByText('Local echo: menu new')).toHaveCount(0)

    const names = (await listWorkspaceFiles(shell.workspaceDir)).filter((name) =>
      name.endsWith('.json'),
    )
    const saved = await Promise.all(
      names.map((name) => readWorkspaceJson<StoredConversationFile>(shell.workspaceDir, name)),
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
