import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

  async function readFileObject(): Promise<Record<string, string>> {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, string>
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-secrets-'))
    filePath = join(root, 'secrets.json')
  })

  afterEach(async () => {
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

  it('removes one kind and leaves the other', async () => {
    const store = makeStore()
    await store.write('provider-key', 'sk-or-key')
    await store.write('s3', 's3-value')
    await store.remove('provider-key')
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: true })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('treats removing an absent kind as a no-op', async () => {
    const store = makeStore()
    await store.write('s3', 's3-value')
    await expect(store.remove('provider-key')).resolves.toBeUndefined()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: true })
  })

  it('preserves unknown entries written by a newer build', async () => {
    await writeFile(filePath, JSON.stringify({ token: 'enc:future' }))
    await makeStore().write('provider-key', 'sk-or-key')
    expect(await readFileObject()).toEqual({ token: 'enc:future', providerKey: 'enc:sk-or-key' })
  })

  it('treats a corrupt file as empty', async () => {
    await writeFile(filePath, 'not json')
    const store = makeStore()
    await expect(store.status()).resolves.toEqual({ providerKey: false, s3: false })
    expect(await store.read('provider-key')).toBeNull()
  })

  it('returns null when a stored value cannot be decrypted', async () => {
    await writeFile(filePath, JSON.stringify({ providerKey: 'garbage' }))
    expect(await makeStore().read('provider-key')).toBeNull()
  })

  it('rejects an unknown kind', async () => {
    const store = makeStore()
    await expect(store.write('token' as never, 'x')).rejects.toBeInstanceOf(AppError)
    await expect(store.remove('token' as never)).rejects.toBeInstanceOf(AppError)
    await expect(store.read('token' as never)).rejects.toBeInstanceOf(AppError)
  })
})
