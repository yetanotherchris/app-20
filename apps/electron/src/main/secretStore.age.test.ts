// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptWithPassphrase, encryptWithPassphrase } from './ageCipher'
import { createSecretStore, type SecretCipher } from './secretStore'

const passphrase = 'Zx8kQ2mN7pR4tV1wY6bC3dF9gH5jL0sAeUiOoPqRsTu'

/**
 * Composes the real age cipher with the store so the on-disk file is exercised
 * end to end: armored output, and value-level overwrite that a randomized
 * ciphertext diff alone cannot prove.
 */
describe('secret store with the age cipher', () => {
  let root: string
  let filePath: string

  const cipher: SecretCipher = {
    encrypt: (plaintext) => encryptWithPassphrase(passphrase, plaintext),
    decrypt: (ciphertext) => decryptWithPassphrase(passphrase, ciphertext),
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'app20-age-store-'))
    filePath = join(root, 'secrets.json.age')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function decryptPayload(): Promise<Record<string, string>> {
    const plaintext = await decryptWithPassphrase(passphrase, await readFile(filePath, 'utf8'))
    if (plaintext === null) throw new Error('payload did not decrypt')
    return JSON.parse(plaintext) as Record<string, string>
  }

  it('writes an armored file that decrypts to the stored values', async () => {
    const store = createSecretStore({ filePath, cipher })
    await store.write('provider-key', 'sk-or-value')

    const armored = await readFile(filePath, 'utf8')
    expect(armored.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')).toBe(true)
    expect(armored).not.toContain('sk-or-value')
    expect(await decryptPayload()).toEqual({ providerKey: 'sk-or-value' })
    await expect(store.read('provider-key')).resolves.toBe('sk-or-value')
  })

  it('replaces the stored value on re-write', async () => {
    const store = createSecretStore({ filePath, cipher })
    const first = JSON.stringify({ accessKeyId: 'AKIAONE', secretAccessKey: 'one' })
    const second = JSON.stringify({ accessKeyId: 'AKIATWO', secretAccessKey: 'two' })

    await store.write('s3', first)
    await store.write('s3', second)

    const payload = await decryptPayload()
    expect(payload['s3']).toBe(second)
    expect(payload['s3']).not.toContain('AKIAONE')
    await expect(store.read('s3')).resolves.toBe(second)
  })
})
