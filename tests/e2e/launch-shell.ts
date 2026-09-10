import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron, type ElectronApplication, type Page } from '@playwright/test'

export interface LaunchedShell {
  app: ElectronApplication
  page: Page
  userDataDir: string
  workspaceDir: string
}

export interface LaunchShellOptions {
  userDataDir?: string
  workspaceDir?: string
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
  const workspaceDir = options.workspaceDir ?? (await mkdtemp(join(tmpdir(), 'app20-ws-')))
  const extra: Record<string, string> = {}
  if (options.streamDelayMs && options.streamDelayMs > 0) {
    extra['APP20_STREAM_DELAY_MS'] = String(options.streamDelayMs)
  }

  const app = await _electron.launch({
    args: [electronMainPath(), `--user-data-dir=${userDataDir}`],
    env: cleanEnv(extra),
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir, workspaceDir }
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
  await rm(launched.workspaceDir, { recursive: true, force: true }).catch(() => undefined)
}

export async function stubOpenDialog(app: ElectronApplication, filePaths: string[]): Promise<void> {
  await app.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: paths,
    })) as typeof dialog.showOpenDialog
  }, filePaths)
}

export async function stubSaveDialog(app: ElectronApplication, filePath: string): Promise<void> {
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath: path,
    })) as typeof dialog.showSaveDialog
  }, filePath)
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

export async function listWorkspaceFiles(workspaceDir: string): Promise<string[]> {
  return readdir(workspaceDir)
}

export async function readWorkspaceJson<T>(workspaceDir: string, name: string): Promise<T> {
  return JSON.parse(await readFile(join(workspaceDir, name), 'utf8')) as T
}

export async function seedSettings(
  userDataDir: string,
  settings: { workspacePath?: string },
): Promise<void> {
  await writeFile(join(userDataDir, 'settings.json'), JSON.stringify(settings))
}

export async function readSettings(userDataDir: string): Promise<{ workspacePath?: string }> {
  try {
    return JSON.parse(await readFile(join(userDataDir, 'settings.json'), 'utf8')) as {
      workspacePath?: string
    }
  } catch {
    return {}
  }
}

export function electronExecutable(app: ElectronApplication): string {
  const spawnfile = (app.process() as unknown as { spawnfile?: string }).spawnfile
  if (!spawnfile) throw new Error('Electron executable path is unavailable')
  return spawnfile
}

export async function spawnSecondInstance(
  executable: string,
  userDataDir: string,
): Promise<number | null> {
  const child = spawn(executable, [electronMainPath(), `--user-data-dir=${userDataDir}`], {
    env: cleanEnv(),
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
