import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecretKind } from '../shared/ipc-contract'
import { AppError } from './errors'
import { createSecretStore, type SecretCipher } from './secretStore'

const cipher: SecretCipher = {
  encrypt: (plaintext) => `enc:${plaintext}`,
  decrypt: (stored) => (stored.startsWith('enc:') ? stored.slice(4) : null),
}

describe('secret store', () => {
  let root: string
  let filePath: string

  function makeStore() {
    return createSecretStore({ filePath, cipher })
  }

  async function readFileObject(): Promise<Record<string, unknown>> {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-secrets-'))
    filePath = join(root, 'secrets.json')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('reports an empty status before anything is stored', async () => {
    await expect(makeStore().status()).resolves.toEqual({ providerKey: false, s3: false })
  })

  it('round-trips a written secret', async () => {
    const store = makeStore()
    await store.write('provider-key', 'sk-or-key')
    expect(await store.read('provider-key')).toBe('sk-or-key')
    await expect(store.status()).resolves.toEqual({ providerKey: true, s3: false })
  })

  it('encrypts the stored value', async () => {
    await makeStore().write('provider-key', 'sk-or-key')
    expect(await readFile(filePath, 'utf8')).toBe('{"providerKey":"enc:sk-or-key"}')
  })

  it('narrows the directory and file permissions on POSIX', async () => {
    if (process.platform === 'win32') return
    // A permissive fixture and umask 0 prove the store applies its own modes
    // rather than inheriting a restrictive environment.
    await chmod(root, 0o755)
    const previousUmask = process.umask(0)
    try {
      await makeStore().write('provider-key', 'sk-or-key')
    } finally {
      process.umask(previousUmask)
    }
    expect((await stat(filePath)).mode & 0o777).toBe(0o600)
    expect((await stat(root)).mode & 0o777).toBe(0o700)
  })

  it('reports a directory preparation failure as write-failed', async () => {
    vi.spyOn(fs, 'mkdir').mockRejectedValueOnce(
      Object.assign(new Error('denied'), { code: 'EACCES' }),
    )
    await expect(makeStore().write('provider-key', 'sk-or-key')).rejects.toMatchObject({
      code: 'write-failed',
    })
  })

  it('writes one kind without disturbing another', async () => {
    const store = makeStore()
    await store.write('provider-key', 'sk-or-key')
    await store.write('s3', '{"accessKeyId":"a","secretAccessKey":"b"}')
    await expect(store.status()).resolves.toEqual({ providerKey: true, s3: true })
    expect(await store.read('provider-key')).toBe('sk-or-key')
  })

  it('overwrites the same kind on re-write', async () => {
    const store = makeStore()
    await store.write('provider-key', 'first')
    await store.write('provider-key', 'second')
    expect(await store.read('provider-key')).toBe('second')
    expect(Object.keys(await readFileObject())).toEqual(['providerKey'])
  })

  it('serializes overlapping writes so neither is lost', async () => {
    const store = makeStore()
    await Promise.all([store.write('provider-key', 'sk-or-key'), store.write('s3', 's3-value')])
    await expect(store.status()).resolves.toEqual({ providerKey: true, s3: true })
  })

  it('removes one kind and leaves the other', async () => {
    const store = makeStore()
    await store.write('provider-key', 'sk-or-key')
    await store.write('s3', 's3-value')
    await store.remove('provider-key')
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: true })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('does not write when removing an absent kind', async () => {
    const store = makeStore()
    await store.write('s3', 's3-value')
    const before = await readFile(filePath, 'utf8')
    await expect(store.remove('provider-key')).resolves.toBeUndefined()
    expect(await readFile(filePath, 'utf8')).toBe(before)
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: true })
  })

  it('keeps the previous secret when a later write fails', async () => {
    let calls = 0
    const flaky: SecretCipher = {
      encrypt: (plaintext) => {
        calls += 1
        if (calls > 1) throw new Error('cipher down')
        return `enc:${plaintext}`
      },
      decrypt: cipher.decrypt,
    }
    const store = createSecretStore({ filePath, cipher: flaky })
    await store.write('provider-key', 'first')
    await expect(store.write('s3', 'second')).rejects.toThrow('cipher down')
    expect(await store.read('provider-key')).toBe('first')
    await expect(store.status()).resolves.toEqual({ providerKey: true, s3: false })
  })

  it('preserves unknown entries written by a newer build', async () => {
    await writeFile(filePath, JSON.stringify({ token: 'enc:future' }))
    await makeStore().write('provider-key', 'sk-or-key')
    expect(await readFileObject()).toEqual({ token: 'enc:future', providerKey: 'enc:sk-or-key' })
  })

  it('preserves unknown non-string entries on write', async () => {
    await writeFile(filePath, JSON.stringify({ future: 42 }))
    await makeStore().write('provider-key', 'sk-or-key')
    expect(await readFileObject()).toEqual({ future: 42, providerKey: 'enc:sk-or-key' })
  })

  it('treats a corrupt file as empty', async () => {
    await writeFile(filePath, 'not json')
    const store = makeStore()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: false })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('surfaces a non-missing read error instead of treating it as empty', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValueOnce(
      Object.assign(new Error('busy'), { code: 'EBUSY' }),
    )
    await expect(makeStore().status()).rejects.toMatchObject({ code: 'read-failed' })
  })

  it('ignores a non-string stored entry', async () => {
    await writeFile(filePath, JSON.stringify({ providerKey: 5 }))
    const store = makeStore()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: false })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('treats an empty stored value as absent in both status and read', async () => {
    await writeFile(filePath, JSON.stringify({ providerKey: '' }))
    const store = makeStore()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: false })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('reports an undecryptable entry as absent in both status and read', async () => {
    await writeFile(filePath, JSON.stringify({ providerKey: 'garbage' }))
    const store = makeStore()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: false })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('rejects an unknown kind with invalid-secret', async () => {
    const unknown = 'token' as unknown as SecretKind
    const store = makeStore()
    const expectation = { code: 'invalid-secret' }
    await expect(store.write(unknown, 'x')).rejects.toMatchObject(expectation)
    await expect(store.remove(unknown)).rejects.toMatchObject(expectation)
    await expect(store.read(unknown)).rejects.toMatchObject(expectation)
    await expect(store.write(unknown, 'x')).rejects.toBeInstanceOf(AppError)
  })
})
