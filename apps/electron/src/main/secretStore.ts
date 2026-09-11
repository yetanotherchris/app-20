import { promises as fs } from 'node:fs'
import type { SecretKind, SecretsStatus } from '../shared/ipc-contract'
import { atomicWriteFile } from './atomicWrite'
import { AppError } from './errors'
import { SECRET_KINDS, isSecretKind } from './secretKinds'

export interface SecretCipher {
  encrypt(plaintext: string): string
  decrypt(stored: string): string | null
}

export interface SecretStore {
  status(): Promise<SecretsStatus>
  read(kind: SecretKind): Promise<string | null>
  write(kind: SecretKind, plaintext: string): Promise<void>
  remove(kind: SecretKind): Promise<void>
}

type StoredSecrets = Record<string, string>

/**
 * Reads the on-disk object. A missing, unreadable, or non-object file reads as
 * empty and the next write replaces it. Only string values are kept, so a
 * malformed entry cannot smuggle a non-string into the cipher.
 */
async function readStored(filePath: string): Promise<StoredSecrets> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: StoredSecrets = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

export function createSecretStore(options: {
  filePath: string
  cipher: SecretCipher
}): SecretStore {
  const { filePath, cipher } = options

  function definitionFor(kind: SecretKind) {
    if (!isSecretKind(kind)) throw new AppError('invalid-secret')
    return SECRET_KINDS[kind]
  }

  async function setEntry(kind: SecretKind, stored: string | null): Promise<void> {
    const { storageKey } = definitionFor(kind)
    const secrets = await readStored(filePath)
    if (stored === null) delete secrets[storageKey]
    else secrets[storageKey] = stored
    await atomicWriteFile(filePath, JSON.stringify(secrets))
  }

  return {
    async status() {
      const secrets = await readStored(filePath)
      return {
        providerKey: SECRET_KINDS['provider-key'].storageKey in secrets,
        s3: SECRET_KINDS.s3.storageKey in secrets,
      }
    },

    async read(kind) {
      const { storageKey } = definitionFor(kind)
      const stored = (await readStored(filePath))[storageKey]
      if (!stored) return null
      return cipher.decrypt(stored)
    },

    async write(kind, plaintext) {
      await setEntry(kind, cipher.encrypt(plaintext))
    },

    async remove(kind) {
      await setEntry(kind, null)
    },
  }
}
