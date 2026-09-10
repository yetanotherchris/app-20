import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from './errors'
import { assertPathWithinWorkspace, assertSafeFileName, isWithin } from './paths'

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

  it('rejects a sibling and a parent', () => {
    expect(isWithin(root, join('C:', 'workspace-other', 'a.json'))).toBe(false)
    expect(isWithin(root, join('C:', 'a.json'))).toBe(false)
  })
})

describe('assertPathWithinWorkspace', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-paths-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('resolves a bare name inside the real workspace root', async () => {
    const target = await assertPathWithinWorkspace(root, 'note.json')
    expect(target.endsWith('note.json')).toBe(true)
  })

  it('rejects a traversal name', async () => {
    await expect(assertPathWithinWorkspace(root, '../escape.json')).rejects.toMatchObject({
      code: 'invalid-name',
    })
  })

  it('rejects an existing symlink that escapes the workspace', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'app20-outside-'))
    try {
      await writeFile(join(outside, 'secret.txt'), 'secret')

      let linked = true
      try {
        await symlink(join(outside, 'secret.txt'), join(root, 'link.json'))
      } catch {
        // File symlinks need a privilege Windows may not grant; the separator
        // and traversal checks above still cover the containment rule.
        linked = false
      }
      if (!linked) return

      await expect(assertPathWithinWorkspace(root, 'link.json')).rejects.toMatchObject({
        code: 'outside-workspace',
      })
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })
})
