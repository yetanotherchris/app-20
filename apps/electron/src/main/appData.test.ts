import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appDataDir, conversationsDir, migrateData, secretsFilePath } from './appData'

describe('app data paths', () => {
  afterEach(() => {
    delete process.env['APP20_DATA_DIR']
    delete process.env['APP20_CONVERSATION_DIR']
  })

  it('roots conversations and secrets under the app data directory', () => {
    process.env['APP20_DATA_DIR'] = join(tmpdir(), 'app20')
    expect(appDataDir()).toBe(join(tmpdir(), 'app20'))
    expect(conversationsDir()).toBe(join(tmpdir(), 'app20', 'conversations'))
    expect(secretsFilePath()).toBe(join(tmpdir(), 'app20', 'secrets.json'))
  })

  it('lets the conversation folder be overridden independently of the data root', () => {
    process.env['APP20_DATA_DIR'] = join(tmpdir(), 'app20')
    process.env['APP20_CONVERSATION_DIR'] = join(tmpdir(), 'conv')
    expect(conversationsDir()).toBe(join(tmpdir(), 'conv'))
  })
})

describe('migrateData', () => {
  let root: string
  let legacy: string
  let target: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-migrate-'))
    legacy = join(root, 'legacy')
    target = join(root, 'target')
    await mkdir(legacy, { recursive: true })
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('moves secrets and conversations when the target is empty', async () => {
    await writeFile(join(legacy, 'secrets.json'), '{"providerKey":"x"}')
    await mkdir(join(legacy, 'conversations'), { recursive: true })
    await writeFile(join(legacy, 'conversations', 'c1.json'), '{}')

    await migrateData(legacy, target)

    expect(await readFile(join(target, 'secrets.json'), 'utf8')).toBe('{"providerKey":"x"}')
    expect(await readFile(join(target, 'conversations', 'c1.json'), 'utf8')).toBe('{}')
  })

  it('does not overwrite anything already at the target', async () => {
    await writeFile(join(legacy, 'secrets.json'), '{"providerKey":"old"}')
    await mkdir(join(legacy, 'conversations'), { recursive: true })
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'secrets.json'), '{"providerKey":"new"}')
    await mkdir(join(target, 'conversations'), { recursive: true })
    await writeFile(join(target, 'conversations', 'keep.json'), '{}')

    await migrateData(legacy, target)

    expect(await readFile(join(target, 'secrets.json'), 'utf8')).toBe('{"providerKey":"new"}')
    expect(await readFile(join(target, 'conversations', 'keep.json'), 'utf8')).toBe('{}')
  })

  it('is a no-op when there is no legacy data', async () => {
    await expect(migrateData(legacy, target)).resolves.toBeUndefined()
  })
})
