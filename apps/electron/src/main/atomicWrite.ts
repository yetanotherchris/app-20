import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { AppError } from './errors'

let tempCounter = 0

/**
 * Writes a temp file in the target directory, flushes it, then renames it over
 * the target. A failure removes the temp file and rethrows, so the previous
 * target stays intact and the caller keeps the document dirty (constitution III).
 * `mode` sets the permission bits of the new file, subject to the process umask
 * on POSIX and ignored on Windows; a secret file passes 0o600.
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
  mode?: number,
): Promise<void> {
  const directory = dirname(filePath)
  // The process id and clock are not unique across writes in the same
  // millisecond, so a monotonic counter is appended to keep concurrent writes
  // to the same target from colliding on the temp name.
  const tempPath = join(
    directory,
    `.${basename(filePath)}.${process.pid}.${Date.now()}.${tempCounter++}.tmp`,
  )

  try {
    // 'wx' fails if the temp path already exists, so a pre-planted symlink or
    // file at the predictable name cannot redirect the write.
    const handle = await fs.open(tempPath, 'wx', mode)
    try {
      await handle.writeFile(content, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.rename(tempPath, filePath)
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined)
    if (error instanceof AppError) throw error
    throw new AppError('write-failed')
  }
}
