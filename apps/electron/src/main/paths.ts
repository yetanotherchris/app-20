import { promises as fs } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { AppError } from './errors'

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/**
 * A renderer supplies a bare file name, never a path. Any separator or parent
 * segment is rejected before containment is even considered (spec 100 FR-006).
 * ':' is rejected because it opens an NTFS alternate data stream, and reserved
 * device names are rejected so a write cannot silently succeed without a file.
 */
export function assertSafeFileName(name: string): void {
  if (name.length === 0 || name === '.' || name === '..') throw new AppError('invalid-name')
  if (isAbsolute(name)) throw new AppError('invalid-name')
  if (name.includes('/') || name.includes('\\')) throw new AppError('invalid-name')
  if (name.includes('\0')) throw new AppError('invalid-name')
  if (name.includes(':') || WINDOWS_RESERVED_NAME.test(name)) throw new AppError('invalid-name')
}

export async function resolveRealRoot(root: string): Promise<string> {
  try {
    return await fs.realpath(root)
  } catch {
    throw new AppError('read-failed')
  }
}

export function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target)
  if (rel === '') return true
  if (rel === '..') return false
  if (rel.startsWith(`..${sep}`)) return false
  return !isAbsolute(rel)
}

/**
 * Resolves a bare file name against the real workspace root and fails closed if
 * the result (including a symlink target that already exists) escapes it.
 */
export async function assertPathWithinWorkspace(root: string, fileName: string): Promise<string> {
  assertSafeFileName(fileName)

  const realRoot = await resolveRealRoot(root)
  const target = resolve(realRoot, fileName)
  if (!isWithin(realRoot, target)) throw new AppError('outside-workspace')

  try {
    const realTarget = await fs.realpath(target)
    if (!isWithin(realRoot, realTarget)) throw new AppError('outside-workspace')
  } catch (error) {
    if (error instanceof AppError) throw error
    // The target does not exist yet (a new save); the parent check above holds.
  }

  return target
}

export async function listWorkspaceFileNames(root: string): Promise<string[]> {
  const realRoot = await resolveRealRoot(root)
  const entries = await fs.readdir(realRoot, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
}
