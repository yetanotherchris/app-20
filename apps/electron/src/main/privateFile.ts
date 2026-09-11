import { promises as fs } from 'node:fs'
import { AppError } from './errors'

export const SECRET_FILE_MODE = 0o600
const SECRET_DIR_MODE = 0o700

/**
 * Creates the directory if needed and narrows it to the owner. The chmod also
 * fixes a directory an earlier build created at the default umask. The chmod is
 * POSIX-only; Windows does not apply these bits. A failure to prepare the
 * directory is reported as a write failure so the caller does not believe the
 * secret was stored.
 */
export async function ensurePrivateDirectory(directory: string): Promise<void> {
  try {
    await fs.mkdir(directory, { recursive: true, mode: SECRET_DIR_MODE })
    if (process.platform !== 'win32') await fs.chmod(directory, SECRET_DIR_MODE)
  } catch {
    throw new AppError('write-failed')
  }
}
