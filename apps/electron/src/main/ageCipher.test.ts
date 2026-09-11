// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decryptWithPassphrase, encryptWithPassphrase } from './ageCipher'

const passphrase = 'Mf3u0nWz8q1pVb7Rk2sT5yLx9cQd4hJg6aNeZrXwBvU'

describe('age passphrase cipher', () => {
  it('round-trips text and produces an armored file', async () => {
    const armored = await encryptWithPassphrase(passphrase, '{"providerKey":"sk-or-key"}')
    expect(armored).toContain('-----BEGIN AGE ENCRYPTED FILE-----')
    expect(armored).not.toContain('sk-or-key')
    await expect(decryptWithPassphrase(passphrase, armored)).resolves.toBe(
      '{"providerKey":"sk-or-key"}',
    )
  })

  it('produces different ciphertext for the same plaintext', async () => {
    const first = await encryptWithPassphrase(passphrase, 'same')
    const second = await encryptWithPassphrase(passphrase, 'same')
    expect(first).not.toBe(second)
  })

  it('returns null for the wrong passphrase', async () => {
    const armored = await encryptWithPassphrase(passphrase, 'secret')
    await expect(decryptWithPassphrase('wrong-passphrase', armored)).resolves.toBeNull()
  })

  it('returns null for a malformed file', async () => {
    await expect(decryptWithPassphrase(passphrase, 'not an age file')).resolves.toBeNull()
  })
})
