import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from './errors'
import {
  assertPathWithinFolder,
  assertSafeFileName,
  isWithin,
  listFolderFileNames,
  resolveRealRoot,
} from './paths'

describe('assertSafeFileName', () => {
  it('accepts a bare file name', () => {
    expect(() => assertSafeFileName('conversation-1.json')).not.toThrow()
  })

  const rejected = [
    '',
    '.',
    '..',
    '../escape.json',
    '..\\escape.json',
    'nested/file.json',
    'nested\\file.json',
    '/etc/passwd',
    'C:\\Windows\\system.ini',
    'file.txt:stream',
    'NUL',
    'con.json',
    'bad\0name',
  ]

  for (const name of rejected) {
    it(`rejects ${JSON.stringify(name)}`, () => {
      expect(() => assertSafeFileName(name)).toThrowError(AppError)
    })
  }
})

describe('isWithin', () => {
  const root = join('C:', 'workspace')

  it('accepts the root and its children', () => {
    expect(isWithin(root, root)).toBe(true)
    expect(isWithin(root, join(root, 'a.json'))).toBe(true)
  })

  it('accepts a child whose name starts with two dots', () => {
    expect(isWithin(root, join(root, '..config.json'))).toBe(true)
  })

  it('rejects a sibling and a parent', () => {
    expect(isWithin(root, join('C:', 'workspace-other', 'a.json'))).toBe(false)
    expect(isWithin(root, join('C:', 'a.json'))).toBe(false)
  })
})

describe('assertPathWithinFolder', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-paths-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('resolves a bare name inside the real conversation folder', async () => {
    const target = await assertPathWithinFolder(root, 'note.json')
    expect(target.endsWith('note.json')).toBe(true)
  })

  it('rejects a traversal name', async () => {
    await expect(assertPathWithinFolder(root, '../escape.json')).rejects.toMatchObject({
      code: 'invalid-name',
    })
  })

  it('rejects a linked directory that points outside the workspace', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'app20-outside-'))
    try {
      const linkType = process.platform === 'win32' ? 'junction' : 'dir'
      await symlink(outside, join(root, 'linked'), linkType)

      await expect(assertPathWithinFolder(root, 'linked')).rejects.toMatchObject({
        code: 'outside-folder',
      })
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('fails with read-failed when the root does not exist', async () => {
    await expect(resolveRealRoot(join(root, 'missing'))).rejects.toMatchObject({
      code: 'read-failed',
    })
  })
})

describe('listFolderFileNames', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-list-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('lists files only, not directories', async () => {
    await writeFile(join(root, 'a.json'), '{}')
    await writeFile(join(root, 'b.json'), '{}')
    await symlink(root, join(root, 'sub'), process.platform === 'win32' ? 'junction' : 'dir')

    expect((await listFolderFileNames(root)).sort()).toEqual(['a.json', 'b.json'])
  })
})
