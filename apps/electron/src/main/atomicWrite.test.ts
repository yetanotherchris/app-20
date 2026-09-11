import { promises as fs } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atomicWriteFile } from './atomicWrite'

describe('atomicWriteFile', () => {
  let directory: string
  let target: string

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'app20-atomic-'))
    target = join(directory, 'note.json')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(directory, { recursive: true, force: true })
  })

  it('writes the content to the target', async () => {
    await atomicWriteFile(target, '{"hello":true}')
    expect(await readFile(target, 'utf8')).toBe('{"hello":true}')
  })

  it('passes the requested mode when opening the temp file', async () => {
    const openSpy = vi.spyOn(fs, 'open')
    await atomicWriteFile(target, 'value', 0o600)
    expect(openSpy).toHaveBeenCalledWith(expect.any(String), 'wx', 0o600)
  })

  it('overwrites an existing file', async () => {
    await writeFile(target, 'old')
    await atomicWriteFile(target, 'new')
    expect(await readFile(target, 'utf8')).toBe('new')
  })

  it('leaves no temp file behind on success', async () => {
    await atomicWriteFile(target, 'value')
    const leftovers = (await readdir(directory)).filter((name) => name.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })

  it('fails with write-failed when the directory is missing', async () => {
    const missing = join(directory, 'missing', 'note.json')
    await expect(atomicWriteFile(missing, 'value')).rejects.toMatchObject({ code: 'write-failed' })
  })

  it('keeps the previous version and removes the temp file when the write cannot start', async () => {
    await writeFile(target, 'previous')
    vi.spyOn(fs, 'open').mockRejectedValueOnce(new Error('open denied'))

    await expect(atomicWriteFile(target, 'next')).rejects.toMatchObject({ code: 'write-failed' })

    expect(await readFile(target, 'utf8')).toBe('previous')
    const leftovers = (await readdir(directory)).filter((name) => name.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })

  it('keeps the previous version and removes the temp file when the rename fails', async () => {
    await writeFile(target, 'previous')
    vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('rename failed'))

    await expect(atomicWriteFile(target, 'next')).rejects.toMatchObject({ code: 'write-failed' })

    expect(await readFile(target, 'utf8')).toBe('previous')
    const leftovers = (await readdir(directory)).filter((name) => name.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })
})
