import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { atomicWriteFile } from './atomicWrite'

export interface AppSettings {
  workspacePath?: string
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/**
 * A missing or corrupt settings file is an empty configuration, not an error;
 * an unreadable workspace must not block startup (spec 100 edge cases).
 */
export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object') {
      const workspacePath = (parsed as { workspacePath?: unknown }).workspacePath
      if (typeof workspacePath === 'string' && workspacePath.length > 0) {
        return { workspacePath }
      }
    }
    return {}
  } catch {
    return {}
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  await atomicWriteFile(settingsPath(), JSON.stringify(settings, null, 2))
}
