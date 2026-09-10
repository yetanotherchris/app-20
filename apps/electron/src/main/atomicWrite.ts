import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { AppError } from './errors'

/**
 * Writes a temp file in the target directory, flushes it, then renames it over
 * the target. A failure removes the temp file and rethrows, so the previous
 * target stays intact and the caller keeps the document dirty (constitution III).
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const directory = dirname(filePath)
  const tempPath = join(directory, `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`)

  try {
    const handle = await fs.open(tempPath, 'w')
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
