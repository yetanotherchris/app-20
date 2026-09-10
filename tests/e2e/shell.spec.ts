import { basename } from 'node:path'
import { rm } from 'node:fs/promises'
import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import {
  closeShell,
  electronExecutable,
  launchShell,
  listWorkspaceFiles,
  readExternalOpens,
  readWorkspaceJson,
  recordExternalOpens,
  spawnSecondInstance,
  stubOpenDialog,
  writeKeyFile,
  type LaunchedShell,
} from './launch-shell'

interface StoredConversationFile {
  id: string
  title: string
  messages: { id: string; role: string; content: string; status: string }[]
}

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

  test('keeps the renderer isolated and applies the CSP', async () => {
    const isolation = await shell.page.evaluate(() => {
      const scope = window as unknown as {
        require?: unknown
        process?: unknown
        appBridge: { invoke?: unknown }
      }
      const csp = document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute('content')
      return {
        requireType: typeof scope.require,
        processType: typeof scope.process,
        invokeType: typeof scope.appBridge.invoke,
        csp,
      }
    })

    expect(isolation.requireType).toBe('undefined')
    expect(isolation.processType).toBe('undefined')
    expect(isolation.invokeType).toBe('undefined')
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
    expect(Object.keys(stored.messages[0] as object).sort()).toEqual([
      'content',
      'createdAt',
      'id',
      'role',
      'status',
    ])

    await shell.page.reload()
    await expect(shell.page.getByTestId('shell.workspace-name')).toContainText(
      basename(shell.workspaceDir),
    )
    await expect(shell.page.getByText('Local echo: save me')).toBeVisible()
    await expect(shell.page.getByTestId('shell.dirty')).toHaveText('Saved')
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
    await expect(shell.page.getByTestId('shell.close-error')).toBeVisible()
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
