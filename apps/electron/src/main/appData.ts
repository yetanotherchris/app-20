import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR = '.config'
const APP_DIR = 'app-20'
const CONVERSATIONS_DIR = 'conversations'
const SECRETS_FILE = 'secrets.json'

/**
 * The app-owned data directory. It is `~/.config/app-20` on every platform so
 * the location is predictable and independent of Electron's userData folder,
 * which resolves to `%APPDATA%\@app-20\electron` on Windows. Tests and advanced
 * runs override it with APP20_DATA_DIR.
 */
export function appDataDir(): string {
  const override = process.env['APP20_DATA_DIR']
  if (override && override.length > 0) return override
  return join(homedir(), CONFIG_DIR, APP_DIR)
}

/** The conversation folder. APP20_CONVERSATION_DIR overrides it for tests. */
export function conversationsDir(): string {
  const override = process.env['APP20_CONVERSATION_DIR']
  if (override && override.length > 0) return override
  return join(appDataDir(), CONVERSATIONS_DIR)
}

export function secretsFilePath(): string {
  return join(appDataDir(), SECRETS_FILE)
}

/**
 * Moves the conversation folder written by older builds out of Electron's
 * userData directory. Best effort: a failure never blocks startup, and a folder
 * already present at the new location is never overwritten. Secrets are not
 * migrated; beta stores a new encoding and the user imports again.
 */
export async function migrateLegacyData(): Promise<void> {
  if (process.env['APP20_DATA_DIR'] || process.env['APP20_CONVERSATION_DIR']) return
  await migrateData(app.getPath('userData'), appDataDir())
}

export async function migrateData(legacyDir: string, targetDir: string): Promise<void> {
  if (legacyDir === targetDir) return

  const legacyConversations = join(legacyDir, CONVERSATIONS_DIR)
  const targetConversations = join(targetDir, CONVERSATIONS_DIR)
  if ((await pathExists(legacyConversations)) && !(await pathExists(targetConversations))) {
    await fs.mkdir(targetDir, { recursive: true })
    await renameOrCopy(legacyConversations, targetConversations)
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path)
    return true
  } catch {
    return false
  }
}

async function renameOrCopy(source: string, target: string): Promise<void> {
  try {
    await fs.rename(source, target)
  } catch {
    // A cross-volume rename fails with EXDEV; copy instead so the move still
    // completes. A copy failure is swallowed by the caller's best-effort guard.
    await fs.cp(source, target, { recursive: true }).catch(() => undefined)
  }
}
