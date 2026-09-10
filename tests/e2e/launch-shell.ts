import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron, type ElectronApplication, type Page } from '@playwright/test'

export interface LaunchedShell {
  app: ElectronApplication
  page: Page
  userDataDir: string
  conversationDir: string
}

export interface LaunchShellOptions {
  userDataDir?: string
  conversationDir?: string
  streamDelayMs?: number
}

export function electronMainPath(): string {
  return join(process.cwd(), 'apps/electron/out/main/index.js')
}

function cleanEnv(extra: Record<string, string> = {}): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) result[key] = value
  }
  return { ...result, ...extra }
}

export async function launchShell(options: LaunchShellOptions = {}): Promise<LaunchedShell> {
  const userDataDir = options.userDataDir ?? (await mkdtemp(join(tmpdir(), 'app20-user-')))
  const conversationDir =
    options.conversationDir ?? (await mkdtemp(join(tmpdir(), 'app20-conversations-')))
  const extra: Record<string, string> = { APP20_CONVERSATION_DIR: conversationDir }
  if (options.streamDelayMs && options.streamDelayMs > 0) {
    extra['APP20_STREAM_DELAY_MS'] = String(options.streamDelayMs)
  }

  const app = await _electron.launch({
    args: [electronMainPath(), `--user-data-dir=${userDataDir}`],
    env: cleanEnv(extra),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir, conversationDir }
}

/** Force the main process down without going through the gated quit. */
export async function forceExitShell(app: ElectronApplication): Promise<void> {
  await app
    .evaluate(({ app: electronApp }) => {
      electronApp.exit(0)
    })
    .catch(() => undefined)
  await app.close().catch(() => undefined)
}

export async function closeShell(launched: LaunchedShell): Promise<void> {
  await forceExitShell(launched.app)
  await rm(launched.conversationDir, { recursive: true, force: true }).catch(() => undefined)
}

export async function stubOpenDialog(app: ElectronApplication, filePaths: string[]): Promise<void> {
  await app.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: paths,
    })) as typeof dialog.showOpenDialog
  }, filePaths)
}

export async function recordExternalOpens(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ shell }) => {
    const scope = globalThis as unknown as { __externalOpens: string[] }
    scope.__externalOpens = []
    shell.openExternal = (async (url: string) => {
      scope.__externalOpens.push(url)
    }) as typeof shell.openExternal
  })
}

export async function readExternalOpens(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(
    () => (globalThis as unknown as { __externalOpens: string[] }).__externalOpens,
  )
}

export async function recordFolderReveals(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ shell }) => {
    const scope = globalThis as unknown as { __revealedFolders: string[] }
    scope.__revealedFolders = []
    shell.openPath = (async (path: string) => {
      scope.__revealedFolders.push(path)
      return ''
    }) as typeof shell.openPath
  })
}

export async function readFolderReveals(app: ElectronApplication): Promise<string[]> {
  return app.evaluate(
    () => (globalThis as unknown as { __revealedFolders: string[] }).__revealedFolders,
  )
}

export async function listConversationFiles(conversationDir: string): Promise<string[]> {
  return readdir(conversationDir)
}

export async function readConversationJson<T>(conversationDir: string, name: string): Promise<T> {
  return JSON.parse(await readFile(join(conversationDir, name), 'utf8')) as T
}

export function electronExecutable(app: ElectronApplication): string {
  const spawnfile = (app.process() as unknown as { spawnfile?: string }).spawnfile
  if (!spawnfile) throw new Error('Electron executable path is unavailable')
  return spawnfile
}

export async function spawnSecondInstance(
  executable: string,
  userDataDir: string,
  conversationDir: string,
): Promise<number | null> {
  const child = spawn(executable, [electronMainPath(), `--user-data-dir=${userDataDir}`], {
    env: cleanEnv({ APP20_CONVERSATION_DIR: conversationDir }),
    stdio: 'ignore',
  })
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code))
  })
}

export async function writeKeyFile(
  directory: string,
  name: string,
  content: string,
): Promise<string> {
  const path = join(directory, name)
  await writeFile(path, content)
  return path
}
